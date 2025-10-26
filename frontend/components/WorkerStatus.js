'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function WorkerStatus({ user }) {
  const [workers, setWorkers] = useState([]);
  const [eventSource, setEventSource] = useState(null);

  useEffect(() => {
    // Initial fetch
    async function fetchWorkers() {
      try {
        const response = await api.workers.getStatus();
        setWorkers(response.workers);
      } catch (error) {
        console.error('Failed to fetch workers:', error);
      }
    }

    fetchWorkers();

    // Setup SSE stream
    const es = api.workers.streamStatus();

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'init' || data.type === 'update') {
          setWorkers(data.workers);
        }
      } catch (error) {
        console.error('Error parsing worker update:', error);
      }
    };

    es.onerror = (error) => {
      console.error('SSE error:', error);
      es.close();
      // Retry connection after 5 seconds
      setTimeout(() => {
        fetchWorkers();
      }, 5000);
    };

    setEventSource(es);

    return () => {
      if (es) {
        es.close();
      }
    };
  }, []);

  const formatHeartbeat = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffSeconds = Math.floor((now - date) / 1000);

    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    return `${Math.floor(diffSeconds / 3600)}h ago`;
  };

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'busy':
        return 'worker-status busy';
      case 'idle':
        return 'worker-status idle';
      default:
        return 'worker-status offline';
    }
  };

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Worker Status</h5>
        <span className="badge bg-primary">Max: {user.maxWorkers}</span>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-dark table-hover worker-table mb-0">
            <thead>
              <tr>
                <th>ID</th>
                <th>Server</th>
                <th>Status</th>
                <th>Current Jobs</th>
                <th>Last Heartbeat</th>
              </tr>
            </thead>
            <tbody>
              {workers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center text-muted py-4">
                    Initializing workers...
                  </td>
                </tr>
              ) : (
                workers.map((worker) => (
                  <tr key={worker.id}>
                    <td>
                      <strong>#{worker.id}</strong>
                    </td>
                    <td>
                      <code className="text-info">{worker.server}</code>
                    </td>
                    <td>
                      <span className={getStatusClass(worker.status)}>
                        {worker.status}
                      </span>
                    </td>
                    <td>
                      {worker.currentJobId ? (
                        <code className="text-warning">{worker.currentJobId}</code>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td className="text-muted small">
                      {formatHeartbeat(worker.lastHeartbeat)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
