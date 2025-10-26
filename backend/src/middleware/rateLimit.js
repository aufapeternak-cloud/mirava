/**
 * Rate Limiting Middleware
 * 
 * This module provides multiple rate limiting configurations to prevent spam
 * and abuse of API endpoints. Different endpoints have different limits based
 * on their usage patterns and security requirements.
 * 
 * Key Concepts:
 * - windowMs: Time window for rate limit (in milliseconds)
 * - max: Maximum number of requests allowed in the time window
 * - skip: Function to skip rate limiting under certain conditions
 * - handler: Custom response when rate limit is exceeded
 * 
 * @module middleware/rateLimit
 */
import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for authentication endpoints (login, register, logout)
 * 
 * Configuration:
 * - Window: 1 minute
 * - Max requests: 10 per IP
 * - Rationale: Prevents brute force attacks while allowing normal usage
 * 
 * Skips rate limiting for successful requests (status < 400) to avoid
 * penalizing legitimate users.
 */
export const authRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // maksimum 10 requests per minute per IP untuk auth endpoints
  message: {
    error: 'Too many authentication requests',
    message: 'Terlalu banyak permintaan autentikasi. Silakan coba lagi dalam 1 menit.',
    redirectToLogin: false
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting untuk successful requests to reduce false positives
  skip: (req, res) => res.statusCode < 400,
  handler: (req, res) => {
    console.log(`[RateLimit] Auth endpoint exceeded from IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many authentication requests',
      message: 'Terlalu banyak permintaan autentikasi. Silakan coba lagi dalam 1 menit.',
      redirectToLogin: false,
      retryAfter: Math.round(60)
    });
  }
});

/**
 * General rate limiter for most API endpoints
 * 
 * Configuration:
 * - Window: 15 minutes
 * - Max requests: 100 per IP
 * - Rationale: Allows normal application usage while preventing abuse
 */
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // maksimum 100 requests per 15 minutes per IP
  message: {
    error: 'Too many requests',
    message: 'Terlalu banyak permintaan. Silakan coba lagi dalam beberapa menit.',
    redirectToLogin: false
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.log(`[RateLimit] General endpoint ${req.path} exceeded from IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests',
      message: 'Terlalu banyak permintaan. Silakan coba lagi dalam beberapa menit.',
      redirectToLogin: false,
      retryAfter: Math.round(15 * 60)
    });
  }
});

/**
 * Specialized rate limiter for /api/x7auth/session/me endpoint
 * 
 * This endpoint is frequently called by the frontend to check authentication
 * status, so it needs a more permissive limit than other auth endpoints.
 * 
 * Configuration:
 * - Window: 60 seconds (1 minute)
 * - Max requests: 10 per IP
 * - Rationale: Allows periodic auth checks (every 10 minutes) plus some buffer
 *   for visibility change events and manual refreshes
 * 
 * The limit is designed to prevent spam from infinite loops while allowing
 * normal application behavior including:
 * - Initial page load check
 * - Periodic background checks (10 min intervals)
 * - Visibility change checks (tab focus)
 * - User-initiated refreshes
 */
export const meEndpointRateLimit = rateLimit({
  windowMs: 60 * 1000, // 60 seconds
  max: 10, // maksimum 10 requests per 60 seconds per IP untuk /me endpoint
  message: {
    error: 'Too many status check requests',
    message: 'Terlalu banyak pengecekan status. Sistem sedang membatasi permintaan untuk mencegah spam.',
    redirectToLogin: false
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting untuk successful requests dengan user yang valid
  skip: (req, res) => {
    // Skip if already authenticated successfully (reduces false positives)
    return res.statusCode === 200;
  },
  handler: (req, res) => {
    console.log(`[RateLimit] /me endpoint exceeded from IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many status check requests',
      message: 'Terlalu banyak pengecekan status. Sistem sedang membatasi permintaan untuk mencegah spam.',
      redirectToLogin: false,
      retryAfter: Math.round(60)
    });
  }
});

/**
 * Rate limiter for job creation endpoints
 * 
 * Configuration:
 * - Window: 5 minutes
 * - Max requests: 10 per IP
 * - Rationale: Prevents spam job creation while allowing normal usage
 */
export const jobCreationRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // maksimum 10 job creation requests per 5 minutes per IP
  message: {
    error: 'Too many job creation requests',
    message: 'Terlalu banyak permintaan pembuatan job. Silakan tunggu beberapa menit.',
    redirectToLogin: false
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.log(`[RateLimit] Job creation exceeded from IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many job creation requests',
      message: 'Terlalu banyak permintaan pembuatan job. Silakan tunggu beberapa menit.',
      redirectToLogin: false,
      retryAfter: Math.round(5 * 60)
    });
  }
});

/**
 * Request logging middleware
 * 
 * Logs requests to authentication endpoints for debugging and monitoring.
 * Only logs auth-related endpoints to reduce noise in logs.
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object  
 * @param {Function} next - Express next middleware function
 */
export const requestLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const ip = req.ip || req.connection.remoteAddress;
  
  // Log hanya untuk auth endpoints atau jika terlalu frequent
  if (url.includes('/x7auth/session/me') || url.includes('/x7auth/session/')) {
    console.log(`[${timestamp}] ${method} ${url} from ${ip}`);
  }
  
  next();
};