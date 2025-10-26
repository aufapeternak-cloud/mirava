// SessionMonitor component untuk memantau dan memperingatkan tentang session expiry
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../lib/useAuth';

export default function SessionMonitor() {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { user, checkAuthStatus } = useAuth();

  useEffect(() => {
    if (!user) return;

    const checkSessionExpiry = () => {
      if (user.sessionStartedAt && user.ttlSeconds) {
        const sessionStart = new Date(user.sessionStartedAt).getTime();
        const now = Date.now();
        const elapsed = (now - sessionStart) / 1000; // seconds
        const remaining = user.ttlSeconds - elapsed;
        
        setCountdown(Math.max(0, remaining));
        
        // Show warning if less than 5 minutes remaining
        if (remaining <= 300 && remaining > 0) {
          setShowWarning(true);
        } else {
          setShowWarning(false);
        }
        
        // Auto refresh auth status if session expired
        if (remaining <= 0) {
          console.log('Session expired, checking auth status...');
          checkAuthStatus();
        }
      }
    };

    // Check immediately
    checkSessionExpiry();
    
    // Check every second
    const interval = setInterval(checkSessionExpiry, 1000);
    
    return () => clearInterval(interval);
  }, [user, checkAuthStatus]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getWarningClass = () => {
    if (countdown <= 60) return 'alert-danger'; // 1 minute or less
    if (countdown <= 180) return 'alert-warning'; // 3 minutes or less
    return 'alert-info';
  };

  if (!user || !showWarning) return null;

  return (
    <div className={`alert ${getWarningClass()} alert-dismissible fade show position-fixed`} 
         style={{ 
           top: '80px', 
           right: '20px', 
           zIndex: 1050,
           minWidth: '300px',
           maxWidth: '400px'
         }}
         role="alert">
      <div className="d-flex align-items-center">
        <div className="me-3">
          <i className="bi bi-clock-fill"></i>
        </div>
        <div className="flex-grow-1">
          <h6 className="mb-1">
            {countdown <= 60 ? 'Session Akan Berakhir!' : 'Peringatan Session'}
          </h6>
          <small>
            Session Anda akan berakhir dalam <strong>{formatTime(countdown)}</strong>
            <br />
            <span className="text-muted">
              Simpan pekerjaan Anda dan refresh halaman untuk memperpanjang session.
            </span>
          </small>
        </div>
      </div>
      <button 
        type="button" 
        className="btn-close" 
        onClick={() => setShowWarning(false)}
        aria-label="Close"
      ></button>
    </div>
  );
}

// Hook untuk mendapatkan remaining session time
export function useSessionTime() {
  const [remainingTime, setRemainingTime] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const updateRemainingTime = () => {
      if (user.sessionStartedAt && user.ttlSeconds) {
        const sessionStart = new Date(user.sessionStartedAt).getTime();
        const now = Date.now();
        const elapsed = (now - sessionStart) / 1000;
        const remaining = Math.max(0, user.ttlSeconds - elapsed);
        setRemainingTime(remaining);
      }
    };

    updateRemainingTime();
    const interval = setInterval(updateRemainingTime, 1000);

    return () => clearInterval(interval);
  }, [user]);

  return {
    remainingTime,
    isExpiring: remainingTime <= 300, // 5 minutes
    isCritical: remainingTime <= 60,  // 1 minute
    formatTime: (seconds = remainingTime) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
  };
}