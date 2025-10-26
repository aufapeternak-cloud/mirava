// Auth hook untuk mengelola state authentication dan auto-redirect
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from './api';
import { RedirectLoop } from './redirectLoop';

// Global state untuk mencegah multiple simultaneous auth checks
let authCheckInProgress = false;
let lastAuthCheck = 0;
let redirectInProgress = false;
let currentAuthPromise = null;
let initialCheckRequested = false;
let rateLimitRetryTimeout = null;

// Shared auth state across hook instances
let sharedUser = null;
let sharedLoading = true;
let sharedError = null;
let sharedInitialized = false;
const subscribers = new Set();

const MIN_AUTH_CHECK_INTERVAL = 2000; // 2 seconds minimum between checks

const getSnapshot = () => ({
  user: sharedUser,
  loading: sharedLoading,
  error: sharedError,
  initialized: sharedInitialized,
});

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

  const checkAuthStatus = useCallback(async (force = false) => {
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
        const isRateLimited = err?.status === 429;

        if (isRateLimited) {
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
          user: userData.user,
          initialized: true,
          loading: false,
          error: null,
        });
        return userData.user;
      } catch (err) {
        console.error('Auth check failed:', err.message);
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
    const interval = setInterval(() => {
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/register' && !redirectInProgress) {
          checkAuthStatus();
        }
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [checkAuthStatus]);

  useEffect(() => {
    let visibilityTimeout;

    const handleVisibilityChange = () => {
      if (visibilityTimeout) {
        clearTimeout(visibilityTimeout);
      }

      visibilityTimeout = setTimeout(() => {
        if (!document.hidden && typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          if (currentPath !== '/login' && currentPath !== '/register' && !redirectInProgress) {
            checkAuthStatus();
          }
        }
      }, 1000);
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