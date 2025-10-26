/**
 * Authentication Hook
 * 
 * This module provides React hooks for managing authentication state across
 * the application. It includes anti-spam measures and loop prevention to
 * ensure stable and performant authentication checking.
 * 
 * Key Features:
 * - Shared authentication state across all hook instances
 * - Rate limiting for auth checks (minimum 3s between checks)
 * - Safe redirect system to prevent infinite loops
 * - Automatic token refresh and session validation
 * - Graceful handling of rate limiting errors
 * 
 * Usage:
 *   const { user, loading, login, logout } = useAuth();
 * 
 * @module lib/useAuth
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from './api';
import { RedirectLoop } from './redirectLoop';

/**
 * Global state management for authentication
 * These variables are shared across all hook instances to prevent
 * duplicate API calls and ensure consistent state.
 */
let authCheckInProgress = false;     // Prevents concurrent auth checks
let lastAuthCheck = 0;                // Timestamp of last auth check
let redirectInProgress = false;       // Prevents multiple redirects
let currentAuthPromise = null;        // Shared promise for concurrent calls
let initialCheckRequested = false;    // Ensures initial check happens once
let rateLimitRetryTimeout = null;     // Timeout for retry after rate limit

/**
 * Shared authentication state
 * All hook instances subscribe to this shared state to avoid
 * multiple API calls and ensure consistency.
 */
let sharedUser = null;
let sharedLoading = true;
let sharedError = null;
let sharedInitialized = false;
const subscribers = new Set();

/**
 * Minimum time between authentication checks (in milliseconds)
 * This prevents spam to the /me endpoint and reduces server load.
 * 
 * Increased from 2s to 3s to provide better rate limiting buffer
 * and work harmoniously with backend rate limits (10 req/60s).
 */
const MIN_AUTH_CHECK_INTERVAL = 3000; // 3 seconds minimum between checks (increased from 2s)

/**
 * Get current authentication state snapshot
 * @returns {Object} Current auth state
 */
const getSnapshot = () => ({
  user: sharedUser,
  loading: sharedLoading,
  error: sharedError,
  initialized: sharedInitialized,
});

/**
 * Update shared authentication state and notify all subscribers
 * 
 * This function ensures all hook instances stay in sync by notifying
 * them when the authentication state changes.
 * 
 * @param {Object} partial - Partial state update
 */
const updateSharedState = (partial) => {
  let hasChange = false;

  if ('user' in partial && partial.user !== sharedUser) {
    sharedUser = partial.user;
    hasChange = true;
  }

  if ('loading' in partial && partial.loading !== sharedLoading) {
    sharedLoading = partial.loading;
    hasChange = true;
  }

  if ('error' in partial && partial.error !== sharedError) {
    sharedError = partial.error;
    hasChange = true;
  }

  if ('initialized' in partial && partial.initialized !== sharedInitialized) {
    sharedInitialized = partial.initialized;
    hasChange = true;
  }

  if (hasChange) {
    const snapshot = getSnapshot();
    subscribers.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (err) {
        console.error('Failed to notify auth subscriber:', err);
      }
    });
  }
};

/**
 * Main authentication hook
 * 
 * Manages authentication state with anti-spam measures and automatic
 * session validation. All instances of this hook share the same state
 * to prevent duplicate API calls.
 * 
 * @returns {Object} Authentication state and methods
 * @returns {Object|null} user - Current authenticated user or null
 * @returns {boolean} loading - Whether auth check is in progress
 * @returns {string|null} error - Error message if auth check failed
 * @returns {boolean} initialized - Whether initial auth check completed
 * @returns {Function} login - Login function
 * @returns {Function} logout - Logout function
 * @returns {Function} register - Register function
 * @returns {Function} checkAuthStatus - Manual auth status check
 * @returns {boolean} isAuthenticated - Whether user is authenticated
 */
export function useAuth() {
  const [state, setState] = useState(getSnapshot);

  useEffect(() => {
    subscribers.add(setState);
    setState(getSnapshot());
    return () => {
      subscribers.delete(setState);
      if (subscribers.size === 0) {
        redirectInProgress = false;
      }
    };
  }, []);

  /**
   * Check authentication status
   * 
   * This function checks if the user is authenticated by calling the /me
   * endpoint. It includes multiple layers of protection against spam:
   * 
   * 1. Deduplication: Reuses existing promise if check is in progress
   * 2. Rate limiting: Enforces minimum 3s interval between checks
   * 3. Redirect prevention: Skips check if redirect is in progress
   * 4. Graceful rate limit handling: Retries after rate limit error
   * 
   * @param {boolean} force - Force check even if rate limited (for initial check)
   * @returns {Promise<Object|null>} User object or null
   */
  const checkAuthStatus = useCallback(async (force = false) => {
    // Deduplicate concurrent requests
    if (authCheckInProgress && currentAuthPromise) {
      console.log('⏸️ Auth check already in progress, reusing promise...');
      return currentAuthPromise;
    }

    const now = Date.now();
    if (!initialCheckRequested) {
      initialCheckRequested = true;
      checkAuthStatus(true);
    }
    if (!force && (now - lastAuthCheck) < MIN_AUTH_CHECK_INTERVAL) {
      console.log('⏸️ Auth check rate limited, returning cached state...');
      return Promise.resolve(sharedUser);
    }

    if (redirectInProgress) {
      console.log('⏸️ Redirect in progress, skipping auth check...');
      return Promise.resolve(sharedUser);
    }

    authCheckInProgress = true;
    lastAuthCheck = now;
    updateSharedState({ loading: true, error: null });

    currentAuthPromise = (async () => {
      try {
        const userData = await api.auth.me();
        updateSharedState({
          user: userData.user,
          initialized: true,
          loading: false,
          error: null,
        });
        return userData.user;
      } catch (err) {
        console.error('Auth check failed:', err.message);
        
        // Handle rate limiting gracefully
        const isRateLimited = err?.message?.includes('Too many') || err?.status === 429;
        
        if (isRateLimited) {
          console.log('Rate limited on auth check, will retry...');
          if (!rateLimitRetryTimeout) {
            rateLimitRetryTimeout = setTimeout(() => {
              rateLimitRetryTimeout = null;
              checkAuthStatus();
            }, MIN_AUTH_CHECK_INTERVAL + 500);
          }

          updateSharedState({
            error: null,
            loading: false,
          });

          return sharedUser;
        }
        updateSharedState({
          user: null,
          error: err.message,
          initialized: true,
          loading: false,
        });

        if (typeof window !== 'undefined' && !redirectInProgress) {
          const currentPath = window.location.pathname;
          if (currentPath !== '/login' && currentPath !== '/register') {
            redirectInProgress = true;
            document.cookie = 'auth_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
            if (!RedirectLoop.safeRedirect('/login')) {
              redirectInProgress = false;
              console.error('Redirect to login blocked to prevent infinite loop');
            }
          }
        }

        return null;
      } finally {
        authCheckInProgress = false;
        currentAuthPromise = null;
  updateSharedState({ initialized: true, loading: false });
      }
    })();

    return currentAuthPromise;
  }, []);

  useEffect(() => {
    checkAuthStatus(true);
  }, [checkAuthStatus]);

  useEffect(() => {
    // Periodic check every 10 minutes (reduced from 5 minutes to reduce API calls)
    const interval = setInterval(() => {
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        // Only check on protected pages, not on login/register
        if (currentPath !== '/login' && currentPath !== '/register' && !redirectInProgress) {
          checkAuthStatus();
        }
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, [checkAuthStatus]);

  useEffect(() => {
    let visibilityTimeout;

    const handleVisibilityChange = () => {
      if (visibilityTimeout) {
        clearTimeout(visibilityTimeout);
      }

      // Debounce visibility change to 2 seconds
      visibilityTimeout = setTimeout(() => {
        if (!document.hidden && typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          // Only check on protected pages when tab becomes visible
          if (currentPath !== '/login' && currentPath !== '/register' && !redirectInProgress) {
            checkAuthStatus();
          }
        }
      }, 2000); // Increased from 1s to 2s for better throttling
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (visibilityTimeout) {
        clearTimeout(visibilityTimeout);
      }
    };
  }, [checkAuthStatus]);

  const login = useCallback(async (email, password) => {
    updateSharedState({ error: null });

    try {
      const response = await api.auth.login(email, password);
      updateSharedState({
        user: response.user,
        initialized: true,
        loading: false,
        error: null,
      });

      if (typeof window !== 'undefined') {
        if (!RedirectLoop.safeRedirect('/')) {
          setTimeout(() => {
            window.location.href = '/';
          }, 500);
        }
      }

      return response;
    } catch (err) {
      updateSharedState({ error: err.message });
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch (err) {
      console.error('Logout error:', err.message);
    } finally {
      updateSharedState({
        user: null,
        error: null,
        initialized: true,
        loading: false,
      });

      if (typeof window !== 'undefined') {
        document.cookie = 'auth_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        if (!RedirectLoop.safeRedirect('/login')) {
          setTimeout(() => {
            window.location.href = '/login';
          }, 500);
        }
      }
    }
  }, []);

  const register = useCallback(async (email, password, role = 'FREE') => {
    updateSharedState({ error: null });

    try {
      const response = await api.auth.register(email, password, role);
      updateSharedState({
        user: response.user,
        initialized: true,
        loading: false,
        error: null,
      });

      if (typeof window !== 'undefined') {
        if (!RedirectLoop.safeRedirect('/')) {
          setTimeout(() => {
            window.location.href = '/';
          }, 500);
        }
      }

      return response;
    } catch (err) {
      updateSharedState({ error: err.message });
      throw err;
    }
  }, []);

  const { user, loading, error, initialized } = state;

  return {
    user,
    loading,
    error,
    login,
    logout,
    register,
    checkAuthStatus,
    isAuthenticated: !!user,
    initialized,
  };
}

// Hook untuk memastikan user sudah login (dengan debouncing)
export function useRequireAuth() {
  const auth = useAuth();
  const redirectTimeoutRef = useRef(null);
  const [redirectHandled, setRedirectHandled] = useState(false);

  useEffect(() => {
    // Clear any existing redirect timeout
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
    }

    // Only handle redirect once per session and when initialized
    if (!auth.loading && !auth.isAuthenticated && !redirectHandled && typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      
      // Only redirect from protected pages
      if (currentPath !== '/login' && currentPath !== '/register' && !redirectInProgress) {
        setRedirectHandled(true);
        redirectInProgress = true;
        
        console.log('Authentication required, preparing redirect to login...');
        
        // Safe redirect to prevent loops
        redirectTimeoutRef.current = setTimeout(() => {
          if (RedirectLoop.safeRedirect('/login')) {
            console.log('Safe redirect to login executed (useRequireAuth)');
          } else {
            console.error('Redirect to login blocked (useRequireAuth)');
            setRedirectHandled(false); // Allow retry later
            redirectInProgress = false;
          }
        }, 200);
      }
    }

    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, [auth.loading, auth.isAuthenticated, redirectHandled]);

  // Reset redirect handled when auth state changes
  useEffect(() => {
    if (auth.isAuthenticated) {
      setRedirectHandled(false);
      redirectInProgress = false;
    }
  }, [auth.isAuthenticated]);

  return auth;
}

// Hook untuk redirect jika sudah login (dengan debouncing)
export function useRedirectIfAuthenticated() {
  const auth = useAuth();
  const redirectTimeoutRef = useRef(null);
  const [redirectHandled, setRedirectHandled] = useState(false);

  useEffect(() => {
    // Clear any existing redirect timeout
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
    }

    // Only handle redirect once per session and when initialized
    if (!auth.loading && auth.isAuthenticated && !redirectHandled && typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      
      // Only redirect from login/register pages
      if ((currentPath === '/login' || currentPath === '/register') && !redirectInProgress) {
        setRedirectHandled(true);
        redirectInProgress = true;
        
        console.log('Already authenticated, preparing redirect to home...');
        
        // Safe redirect to prevent loops
        redirectTimeoutRef.current = setTimeout(() => {
          if (RedirectLoop.safeRedirect('/')) {
            console.log('Safe redirect to home executed (useRedirectIfAuthenticated)');
          } else {
            console.error('Redirect to home blocked (useRedirectIfAuthenticated)');
            setRedirectHandled(false); // Allow retry later
            redirectInProgress = false;
          }
        }, 200);
      }
    }

    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, [auth.loading, auth.isAuthenticated, redirectHandled]);

  // Reset redirect handled when auth state changes
  useEffect(() => {
    if (!auth.isAuthenticated) {
      setRedirectHandled(false);
      redirectInProgress = false;
    }
  }, [auth.isAuthenticated]);

  return auth;
}