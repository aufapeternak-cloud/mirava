// AuthGuard component untuk melindungi halaman yang memerlukan authentication
'use client';

import { useRequireAuth } from '../lib/useAuth';

export function AuthGuard({ children, fallback = null }) {
  const { user, loading, error } = useRequireAuth();

  // Show loading state
  if (loading) {
    return (
      fallback || (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <div className="text-muted">
              <p>Memverifikasi autentikasi...</p>
            </div>
          </div>
        </div>
      )
    );
  }

  // Show error state (if any)
  if (error && !user) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="alert alert-warning text-center" role="alert">
          <h4 className="alert-heading">Session Error</h4>
          <p>{error}</p>
          <hr />
          <p className="mb-0">
            Redirecting to login page...
          </p>
        </div>
      </div>
    );
  }

  // If user is authenticated, render children
  if (user) {
    return <>{children}</>;
  }

  // Fallback - should not reach here due to useRequireAuth redirect
  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
      <div className="alert alert-info text-center" role="alert">
        <h4 className="alert-heading">Memerlukan Login</h4>
        <p>Anda perlu login untuk mengakses halaman ini.</p>
        <hr />
        <p className="mb-0">
          Redirecting to login page...
        </p>
      </div>
    </div>
  );
}

// Higher-order component untuk wrapping pages dengan auth protection
export function withAuth(Component, options = {}) {
  const { fallback = null } = options;
  
  return function AuthenticatedComponent(props) {
    return (
      <AuthGuard fallback={fallback}>
        <Component {...props} />
      </AuthGuard>
    );
  };
}