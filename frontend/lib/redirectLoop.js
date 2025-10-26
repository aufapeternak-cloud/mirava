/**
 * Redirect Loop Prevention Utility
 * 
 * This module provides a safe redirect system that prevents infinite redirect
 * loops by tracking redirect attempts and enforcing limits.
 * 
 * Features:
 * - Maximum redirect limit (3 redirects per 30 seconds)
 * - Cooldown period (2 seconds between redirects)
 * - Path tracking (prevents redirecting to same path repeatedly)
 * - Automatic reset after cooldown period
 * 
 * Usage:
 *   if (RedirectLoop.safeRedirect('/login')) {
 *     console.log('Redirect executed');
 *   } else {
 *     console.log('Redirect blocked');
 *   }
 * 
 * @module lib/redirectLoop
 */
'use client';

import { useState, useEffect } from 'react';

/**
 * Global redirect tracking state
 * Shared across all redirect attempts to enforce global limits
 */
let redirectCount = 0;
let lastRedirectTime = 0;
let currentRedirectPath = null;

/**
 * Configuration constants
 */
const MAX_REDIRECTS_PER_SESSION = 3;   // Maximum redirects before blocking
const REDIRECT_RESET_TIME = 30000;     // Reset counter after 30 seconds
const REDIRECT_COOLDOWN = 2000;        // 2 seconds between redirects

/**
 * RedirectLoop - Safe redirect management class
 * 
 * Provides static methods for safe redirects with loop prevention.
 */
export class RedirectLoop {
  /**
   * Check if a redirect to the target path is allowed
   * 
   * Checks:
   * 1. Time since last redirect (reset counter if > 30s)
   * 2. Same path prevention
   * 3. Maximum redirect count
   * 4. Cooldown period
   * 
   * @param {string} targetPath - The path to redirect to
   * @returns {boolean} Whether redirect is allowed
   */
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
  
  /**
   * Record a redirect attempt
   * Updates internal tracking state
   * 
   * @param {string} targetPath - The path being redirected to
   */
  static recordRedirect(targetPath) {
    const now = Date.now();
    redirectCount++;
    lastRedirectTime = now;
    currentRedirectPath = targetPath;
    
    console.log(`Redirect recorded: ${targetPath} (count: ${redirectCount}/${MAX_REDIRECTS_PER_SESSION})`);
  }
  
  /**
   * Perform a safe redirect with loop prevention
   * 
   * Checks if redirect is allowed before executing. If allowed, schedules
   * the redirect with a small delay to prevent rapid succession.
   * 
   * @param {string} targetPath - The path to redirect to
   * @param {Function} fallback - Optional fallback action if redirect blocked
   * @returns {boolean} Whether redirect was executed
   */
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
  
  /**
   * Reset redirect tracking
   * Useful for testing or after user action
   */
  static reset() {
    redirectCount = 0;
    lastRedirectTime = 0;
    currentRedirectPath = null;
    console.log('Redirect tracking reset');
  }
  
  /**
   * Get current redirect tracking status
   * Useful for debugging and monitoring
   * 
   * @returns {Object} Current status including counts and limits
   */
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

/**
 * React hook for monitoring redirect status
 * 
 * Provides real-time status updates for redirect tracking.
 * Useful for debugging UI or showing user feedback.
 * 
 * @returns {Object} Current redirect status and control methods
 */
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