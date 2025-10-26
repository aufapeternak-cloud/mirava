import jwt from 'jsonwebtoken';
import { authConfig } from '../config/auth.js';
import { userModel } from '../models/db.js';

export const authenticateToken = async (req, res, next) => {
  const token = req.cookies[authConfig.cookieName];

  if (!token) {
    // Clear any invalid cookies and signal redirect required
    res.clearCookie(authConfig.cookieName);
    return res.status(401).json({ 
      error: 'Authentication required',
      redirectToLogin: true,
      message: 'Session tidak ditemukan. Silakan login kembali.' 
    });
  }

  try {
    const decoded = jwt.verify(token, authConfig.jwtSecret);
    const user = await userModel.findById(decoded.userId);

    if (!user) {
      // User not found in database - clear cookie and require login
      res.clearCookie(authConfig.cookieName);
      return res.status(401).json({ 
        error: 'User not found',
        redirectToLogin: true,
        message: 'User tidak ditemukan. Silakan login kembali.' 
      });
    }

    // Check if user session is still valid (TTL check)
    if (user.session_started_at) {
      const sessionAge = (Date.now() - new Date(user.session_started_at).getTime()) / 1000;
      if (sessionAge > user.ttl_seconds) {
        res.clearCookie(authConfig.cookieName);
        return res.status(401).json({ 
          error: 'Session expired',
          redirectToLogin: true,
          message: 'Session telah berakhir. Silakan login kembali.' 
        });
      }
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      maxWorkers: user.max_workers,
      ttlSeconds: user.ttl_seconds,
      sessionStartedAt: user.session_started_at
    };

    next();
  } catch (error) {
    // Invalid or expired token
    res.clearCookie(authConfig.cookieName);
    return res.status(403).json({ 
      error: 'Invalid or expired token',
      redirectToLogin: true,
      message: 'Token tidak valid atau telah berakhir. Silakan login kembali.' 
    });
  }
};

export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};
