// Global error boundary for Next.js app directory
'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => {
    // Log error to an error reporting service
    console.error('App Error:', error);
  }, [error]);

  return (
    <html lang="en" data-bs-theme="dark">
      <body style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1117', color: '#c9d1d9' }}>
        <div style={{ textAlign: 'center' }}>
          <h1>Something went wrong</h1>
          <p>{error?.message || 'An unexpected error occurred.'}</p>
          <button className="btn btn-primary mt-3" onClick={() => reset()}>Try Again</button>
        </div>
      </body>
    </html>
  );
}
