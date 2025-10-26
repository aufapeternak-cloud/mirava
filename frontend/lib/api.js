/**
 * API Client
 * 
 * Centralized API client for communicating with the backend.
 * Includes automatic cookie handling, error management, and
 * safe redirect integration.
 * 
 * Key Features:
 * - Automatic cookie credentials (for JWT auth)
 * - Request timeout (30 seconds)
 * - Rate-limited redirects (5 second cooldown)
 * - Safe redirect integration to prevent loops
 * - Comprehensive error handling
 * 
 * @module lib/api
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Import safe redirect utility
import { RedirectLoop } from './redirectLoop';

/**
 * Rate limiting configuration for API client redirects
 * Prevents rapid successive redirects to login page
 */
let lastRedirectTime = 0;
const REDIRECT_COOLDOWN = 5000; // 5 seconds cooldown between redirects

/**
 * Request timeout configuration
 * Increased from 10s to 30s to handle longer-running requests
 */
const REQUEST_TIMEOUT = 30000; // 30 seconds timeout for requests (increased from 10s)

/**
 * Generic HTTP request helper
 * 
 * Handles all API requests with automatic:
 * - Cookie credentials for authentication
 * - Timeout management
 * - Error handling and parsing
 * - Auth failure detection and redirect
 * 
 * @param {string} endpoint - API endpoint path (e.g., '/api/auth/login')
 * @param {Object} options - Fetch options (method, body, headers, etc.)
 * @returns {Promise<Object>} Response data
 * @throws {Error} On network error, timeout, or API error
 */
async function request(endpoint, options = {}) {
  const config = {
    credentials: 'include', // Important for cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...config,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      // If response is not JSON, create error object
      data = { error: 'Invalid server response' };
    }

    if (!response.ok) {
      // Check for authentication failures that require redirect to login
      if ((response.status === 401 || response.status === 403)) {
        // Clear cookies by setting them to expire
        if (typeof window !== 'undefined') {
          document.cookie = 'auth_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        }
        
        // Check if we need to redirect (only for protected pages)
        if (data.redirectToLogin && typeof window !== 'undefined') {
          const now = Date.now();
          const currentPath = window.location.pathname;
          
          // Only redirect if not already on login/register page and not rate limited
          if (currentPath !== '/login' && currentPath !== '/register') {
            if (now - lastRedirectTime > REDIRECT_COOLDOWN) {
              lastRedirectTime = now;
              
              // Show message to user if available
              if (data.message) {
                console.log('Auth Error:', data.message);
              }
              
              console.log('API Auth failure, preparing safe redirect to login...');
              
              // Safe redirect to prevent infinite loops
              if (RedirectLoop.safeRedirect('/login')) {
                console.log('Safe redirect executed from API client');
              } else {
                console.error('API redirect blocked to prevent infinite loop');
              }
            } else {
              console.log('Redirect rate limited, skipping...');
            }
          }
        }
      }
      
      // Always throw error so caller can handle it
      throw new Error(data.error || data.message || 'Request failed');
    }

    return data;
  } catch (error) {
    // Handle abort/timeout errors
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - server took too long to respond');
    }
    
    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error - please check your connection and ensure backend is running');
    }
    throw error;
  }
}

export const api = {
  // Auth endpoints - /api/x7auth/session/*
  auth: {
    async login(email, password) {
      return request('/api/x7auth/session/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
    },

    async register(email, password, role = 'FREE') {
      return request('/api/x7auth/session/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, role }),
      });
    },

    async logout() {
      return request('/api/x7auth/session/logout', {
        method: 'POST',
      });
    },

    async me() {
      return request('/api/x7auth/session/me');
    },
  },

  // User endpoints - /api/usr/caps/*
  user: {
    async getCaps() {
      return request('/api/usr/caps/limits');
    },

    async getRemainingTTL() {
      return request('/api/usr/caps/ttl-q9a');
    },
  },

  // Prompt endpoints - /api/pmt/ingest/*
  prompts: {
    async parse(text) {
      return request('/api/pmt/ingest/parse', {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
    },

    async upload(file) {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/api/pmt/ingest/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      return data;
    },
  },

  // Job endpoints - /api/vdo/fabric/*
  jobs: {
    async create(jobData) {
      return request('/api/vdo/fabric/create', {
        method: 'POST',
        body: JSON.stringify(jobData),
      });
    },

    async getStatus(jobId) {
      return request(`/api/vdo/fabric/status/${jobId}`);
    },

    async list() {
      return request('/api/vdo/fabric/list');
    },
  },

  // Worker endpoints - /api/wrk/grid29/*
  workers: {
    async getStatus() {
      return request('/api/wrk/grid29/status');
    },

    // SSE stream for worker updates - /api/sts/k7q/*
    streamStatus() {
      return new EventSource(`${API_URL}/api/wrk/grid29/stream`, {
        withCredentials: true,
      });
    },

    // SSE stream for logs - /api/sts/k7q/*
    streamLogs(jobId = null) {
      const url = jobId
        ? `${API_URL}/api/sts/k7q/logs/stream?jobId=${jobId}`
        : `${API_URL}/api/sts/k7q/logs/stream`;

      return new EventSource(url, {
        withCredentials: true,
      });
    },
  },
};
