'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRedirectIfAuthenticated } from '../../lib/useAuth';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('FREE');
  const [error, setError] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  // Use auth hook with auto-redirect if already authenticated
  const { register, loading: authLoading, isAuthenticated, initialized } = useRedirectIfAuthenticated();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Password tidak cocok');
      return;
    }

    if (password.length < 6) {
      setError('Password minimal 6 karakter');
      return;
    }

    setRegisterLoading(true);

    try {
      await register(email, password, role);
      // The hook will handle redirect automatically
    } catch (err) {
      setError(err.message || 'Registrasi gagal. Silakan coba lagi.');
    } finally {
      setRegisterLoading(false);
    }
  };

  // Show loading screen while checking authentication status
  if (!initialized) {
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
          <h5 className="text-center text-muted mb-4">Create Account</h5>

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
                placeholder="At least 6 characters"
                required
              />
            </div>

            <div className="mb-3">
              <label htmlFor="confirmPassword" className="form-label">
                Confirm Password
              </label>
              <input
                type="password"
                className="form-control"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="role" className="form-label">
                Account Type
              </label>
              <select
                className="form-select"
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="FREE">FREE (2 workers, 30 min)</option>
                <option value="PREMIUM">PREMIUM (5 workers, 2 hours)</option>
                <option value="ENTERPRISE">ENTERPRISE (50 workers, 8 hours)</option>
              </select>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100 mb-3"
              disabled={registerLoading || !email || !password || !confirmPassword}
            >
              {registerLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="text-center">
            <p className="mb-0 text-muted">
              Already have an account?{' '}
              <Link href="/login" className="text-decoration-none">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
