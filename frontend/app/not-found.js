// Custom not-found page for Next.js app directory
export default function NotFound() {
  return (
    <html lang="en" data-bs-theme="dark">
      <body style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1117', color: '#c9d1d9' }}>
        <div style={{ textAlign: 'center' }}>
          <h1>404 - Page Not Found</h1>
          <p>The page you are looking for does not exist.</p>
          <a href="/" className="btn btn-primary mt-3">Go Home</a>
        </div>
      </body>
    </html>
  );
}
