// Rate limiting middleware untuk mencegah spam requests
import rateLimit from 'express-rate-limit';

// Rate limiter untuk auth endpoints
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
  // Skip rate limiting untuk successful requests
  skip: (req, res) => res.statusCode < 400,
  handler: (req, res) => {
    console.log(`Rate limit exceeded for auth endpoint from IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many authentication requests',
      message: 'Terlalu banyak permintaan autentikasi. Silakan coba lagi dalam 1 menit.',
      redirectToLogin: false,
      retryAfter: Math.round(60)
    });
  }
});

// Rate limiter untuk API endpoints umum
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
    console.log(`Rate limit exceeded for general endpoint ${req.path} from IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests',
      message: 'Terlalu banyak permintaan. Silakan coba lagi dalam beberapa menit.',
      redirectToLogin: false,
      retryAfter: Math.round(15 * 60)
    });
  }
});

// Rate limiter khusus untuk /api/x7auth/session/me endpoint
export const meEndpointRateLimit = rateLimit({
  windowMs: 30 * 1000, // 30 seconds
  max: 5, // maksimum 5 requests per 30 seconds per IP untuk /me endpoint
  message: {
    error: 'Too many status check requests',
    message: 'Terlalu banyak pengecekan status. Sistem sedang membatasi permintaan untuk mencegah spam.',
    redirectToLogin: false
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.log(`Rate limit exceeded for /me endpoint from IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many status check requests',
      message: 'Terlalu banyak pengecekan status. Sistem sedang membatasi permintaan untuk mencegah spam.',
      redirectToLogin: false,
      retryAfter: Math.round(30)
    });
  }
});

// Rate limiter untuk job creation
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
    console.log(`Rate limit exceeded for job creation from IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many job creation requests',
      message: 'Terlalu banyak permintaan pembuatan job. Silakan tunggu beberapa menit.',
      redirectToLogin: false,
      retryAfter: Math.round(5 * 60)
    });
  }
});

// Middleware untuk logging requests (untuk debugging)
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