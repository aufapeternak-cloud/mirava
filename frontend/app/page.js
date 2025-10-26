'use client';

import Navbar from '../components/Navbar';
import GeneratorForm from '../components/GeneratorForm';
import WorkerStatus from '../components/WorkerStatus';
import LogsPanel from '../components/LogsPanel';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useRequireAuth } from '../lib/useAuth';

export default function Home() {
  // Use auth hook with automatic redirect to login if not authenticated
  const { user, loading, error } = useRequireAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="alert alert-danger text-center" role="alert">
          <h4 className="mb-2">Authentication Error</h4>
          <div>{error}</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <ErrorBoundary>
      <Navbar user={user} />
      <main className="container-fluid py-4">
        <div className="row g-4">
          {/* Left Column: Generator Form */}
          <div className="col-lg-6">
            <GeneratorForm user={user} />
          </div>

          {/* Right Column: Worker Status + Logs */}
          <div className="col-lg-6">
            <div className="mb-4">
              <WorkerStatus user={user} />
            </div>
            <LogsPanel />
          </div>
        </div>
      </main>
    </ErrorBoundary>
  );
}
