'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRedirectIfAuthenticated } from '../../lib/useAuth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false); // Separate loading state for login form
  const [initTimeout, setInitTimeout] = useState(false); // Track if initialization takes too long
  
  // Use the auth hook with auto-redirect if already authenticated
  const { login, loading: authLoading, isAuthenticated, initialized, error: authError } = useRedirectIfAuthenticated();

  // Set timeout for initialization check (only if auth check truly fails)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!initialized && !authLoading) {
        setInitTimeout(true);
        console.error('Auth initialization timeout - possible backend connection issue');
      }
    }, 15000); // 15 seconds timeout - give more time for slow connections

    // Clear timeout if initialized
    if (initialized) {
      clearTimeout(timeout);
    }

    return () => clearTimeout(timeout);
  }, [initialized, authLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoginLoading(true); // Set form loading

    try {
      await login(email, password);
      // The hook will handle redirect automatically
    } catch (err) {
      setError(err.message || 'Login gagal. Silakan periksa email dan password Anda.');
    } finally {
      setLoginLoading(false); // Reset form loading
    }
  };

  // Show loading screen while checking authentication status (only if not initialized)
  if (!initialized && !initTimeout) {
    return (
      <div className="auth-container">
        <div className="card auth-card">
          <div className="card-body p-5 text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted">Memeriksa status login...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error if initialization timeout or auth error
  if (!initialized && initTimeout) {
    return (
      <div className="auth-container">
        <div className="card auth-card">
          <div className="card-body p-5 text-center">
            <div className="alert alert-warning" role="alert">
              <i className="bi bi-exclamation-triangle me-2"></i>
              <strong>Koneksi Bermasalah</strong>
              <p className="mb-2 mt-2">
                Tidak dapat terhubung ke server. Pastikan backend sudah berjalan.
              </p>
              {authError && <small className="text-muted">{authError}</small>}
            </div>
            <button 
              className="btn btn-primary mt-3"
              onClick={() => window.location.reload()}
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If already authenticated, show redirecting message
  if (isAuthenticated) {
    return (
      <div className="auth-container">
        <div className="card auth-card">
          <div className="card-body p-5 text-center">
            <div className="spinner-border text-success mb-3" role="status">
              <span className="visually-hidden">Redirecting...</span>
            </div>
            <p className="text-success">Sudah login! Mengarahkan ke halaman utama...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="card auth-card">
        <div className="card-body p-5">
          <h2 className="text-center mb-4">Video Generator Pro</h2>
          <h5 className="text-center text-muted mb-4">Sign In</h5>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="email" className="form-label">
                Email address
              </label>
              <input
                type="email"
                className="form-control"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>

            <div className="mb-3">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                type="password"
                className="form-control"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100 mb-3"
              disabled={loginLoading || !email || !password}
            >
              {loginLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="text-center">
            <p className="mb-0 text-muted">
              Don't have an account?{' '}
              <Link href="/register" className="text-decoration-none">
                Register
              </Link>
            </p>
          </div>

          <hr className="my-4" />

          <div className="small text-muted">
            <strong>Demo Accounts:</strong>
            <div className="mt-2">
              <div className="mb-1">
                <strong>FREE:</strong> free@test.com / password123
              </div>
              <div>
                <strong>PREMIUM:</strong> premium@test.com / password123
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
