'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/useAuth';

export default function Navbar({ user: propUser }) {
  const [remainingTTL, setRemainingTTL] = useState(0);
  const { user: authUser, logout } = useAuth();
  
  // Use propUser if provided, otherwise use authUser from hook
  const user = propUser || authUser;

  useEffect(() => {
    async function fetchTTL() {
      try {
        const response = await api.user.getRemainingTTL();
        setRemainingTTL(response.remainingSeconds);
      } catch (error) {
        console.error('Failed to fetch TTL:', error);
        // If TTL fetch fails due to auth, the API will handle redirect
      }
    }

    if (user) {
      fetchTTL();
      const interval = setInterval(fetchTTL, 5000); // Update every 5 seconds

      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    // Countdown timer (updates every second)
    const timer = setInterval(() => {
      setRemainingTTL((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getTTLClass = () => {
    if (remainingTTL < 300) return 'ttl-countdown danger'; // < 5 minutes
    if (remainingTTL < 900) return 'ttl-countdown warning'; // < 15 minutes
    return 'ttl-countdown';
  };

  const handleLogout = async () => {
    try {
      await logout(); // Use the logout function from auth hook
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if logout fails, clear local state and redirect
      if (typeof window !== 'undefined') {
        document.cookie = 'auth_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        window.location.href = '/login';
      }
    }
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark">
      <div className="container-fluid">
        <a className="navbar-brand" href="/">
          Video Generator Pro
        </a>

        <div className="d-flex align-items-center gap-3">
          {/* Remaining TTL */}
          <div className={getTTLClass()} title="Remaining session time">
            {formatTime(remainingTTL)}
          </div>

          {/* Role Badge */}
          <span className={`badge ${user.role === 'PREMIUM' ? 'role-premium' : 'role-free'}`}>
            {user.role}
          </span>

          {/* User Email */}
          <span className="text-muted small d-none d-md-inline">
            {user.email}
          </span>

          {/* Logout Button */}
          <button className="btn btn-outline-secondary btn-sm" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
