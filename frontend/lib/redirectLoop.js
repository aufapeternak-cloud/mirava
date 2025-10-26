// Utility untuk mencegah infinite redirect loops
'use client';

import { useState, useEffect } from 'react';

// Global state untuk tracking redirects
let redirectCount = 0;
let lastRedirectTime = 0;
let currentRedirectPath = null;

const MAX_REDIRECTS_PER_SESSION = 3;
const REDIRECT_RESET_TIME = 30000; // 30 seconds
const REDIRECT_COOLDOWN = 2000; // 2 seconds between redirects

export class RedirectLoop {
  static canRedirect(targetPath) {
    const now = Date.now();
    
    // Reset counter if enough time has passed
    if (now - lastRedirectTime > REDIRECT_RESET_TIME) {
      redirectCount = 0;
      currentRedirectPath = null;
    }
    
    // Check if we're trying to redirect to the same path repeatedly
    if (currentRedirectPath === targetPath) {
      console.warn(`Preventing redirect loop to ${targetPath}`);
      return false;
    }
    
    // Check if we've exceeded max redirects
    if (redirectCount >= MAX_REDIRECTS_PER_SESSION) {
      console.error(`Maximum redirects (${MAX_REDIRECTS_PER_SESSION}) exceeded. Preventing further redirects.`);
      return false;
    }
    
    // Check cooldown period
    if (now - lastRedirectTime < REDIRECT_COOLDOWN) {
      console.warn(`Redirect cooldown active. Please wait ${REDIRECT_COOLDOWN - (now - lastRedirectTime)}ms`);
      return false;
    }
    
    return true;
  }
  
  static recordRedirect(targetPath) {
    const now = Date.now();
    redirectCount++;
    lastRedirectTime = now;
    currentRedirectPath = targetPath;
    
    console.log(`Redirect recorded: ${targetPath} (count: ${redirectCount}/${MAX_REDIRECTS_PER_SESSION})`);
  }
  
  static safeRedirect(targetPath, fallback = null) {
    if (typeof window === 'undefined') {
      console.warn('safeRedirect called on server side');
      return false;
    }
    
    if (!this.canRedirect(targetPath)) {
      if (fallback) {
        console.log(`Using fallback action instead of redirect to ${targetPath}`);
        fallback();
      } else {
        console.error(`Redirect to ${targetPath} blocked to prevent infinite loop`);
      }
      return false;
    }
    
    this.recordRedirect(targetPath);
    
    // Use a small delay to prevent rapid succession
    setTimeout(() => {
      console.log(`Executing safe redirect to: ${targetPath}`);
      window.location.href = targetPath;
    }, 100);
    
    return true;
  }
  
  static reset() {
    redirectCount = 0;
    lastRedirectTime = 0;
    currentRedirectPath = null;
    console.log('Redirect tracking reset');
  }
  
  static getStatus() {
    return {
      redirectCount,
      lastRedirectTime,
      currentRedirectPath,
      canRedirectToLogin: this.canRedirect('/login'),
      canRedirectToHome: this.canRedirect('/'),
      timeUntilReset: Math.max(0, REDIRECT_RESET_TIME - (Date.now() - lastRedirectTime))
    };
  }
}

// Hook untuk monitoring redirect loops
export function useRedirectMonitor() {
  const [status, setStatus] = useState(RedirectLoop.getStatus());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(RedirectLoop.getStatus());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  return {
    ...status,
    safeRedirect: RedirectLoop.safeRedirect.bind(RedirectLoop),
    reset: RedirectLoop.reset.bind(RedirectLoop)
  };
}