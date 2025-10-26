export const authConfig = {
  jwtSecret: process.env.JWT_SECRET || 'default-secret-change-me',
  jwtExpiry: '24h',
  cookieName: 'auth_token',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/'
  }
};

export const roleConfig = {
  FREE: {
    maxWorkers: 2,
    ttlSeconds: 30 * 60, // 30 minutes
    features: ['basic_generation'],
    canUseCapCut: false,
    maxPromptsPerJob: 5,
    maxConcurrentJobs: 3,
    queuePriority: 'low'
  },
  PREMIUM: {
    maxWorkers: 5,
    ttlSeconds: 2 * 60 * 60, // 2 hours
    features: ['basic_generation', 'model_selection', 'priority_queue', 'capcut_api'],
    canUseCapCut: true,
    maxPromptsPerJob: 100,
    maxConcurrentJobs: 15,
    queuePriority: 'high'
  },
  ENTERPRISE: {
    maxWorkers: 50,
    ttlSeconds: 8 * 60 * 60, // 8 hours
    features: ['basic_generation', 'model_selection', 'priority_queue', 'capcut_api', 'bulk_processing', 'api_access'],
    canUseCapCut: true,
    maxPromptsPerJob: 1000,
    maxConcurrentJobs: 100,
    queuePriority: 'highest'
  },
  ADMIN: {
    maxWorkers: 200,
    ttlSeconds: 24 * 60 * 60, // 24 hours
    features: ['basic_generation', 'model_selection', 'priority_queue', 'capcut_api', 'admin_panel', 'bulk_processing', 'api_access', 'system_monitoring'],
    canUseCapCut: true,
    maxPromptsPerJob: 9999,
    maxConcurrentJobs: 999,
    queuePriority: 'critical'
  }
};
