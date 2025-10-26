'use client';

import { useEffect, useState, useRef } from 'react';
import { api } from '../lib/api';

export default function LogsPanel() {
  const [logs, setLogs] = useState([]);
  const [jobFilter, setJobFilter] = useState('');
  const [eventSource, setEventSource] = useState(null);
  const logsEndRef = useRef(null);
  const consoleRef = useRef(null);

  useEffect(() => {
    // Setup SSE stream for logs
    const es = api.workers.streamLogs();

    es.onmessage = (event) => {
      try {
        const logEntry = JSON.parse(event.data);
        setLogs((prev) => [...prev, logEntry]);
      } catch (error) {
        console.error('Error parsing log:', error);
      }
    };

    es.onerror = (error) => {
      console.error('SSE error:', error);
      es.close();
      // Retry connection after 5 seconds
      setTimeout(() => {
        const newEs = api.workers.streamLogs();
        setEventSource(newEs);
      }, 5000);
    };

    setEventSource(es);

    return () => {
      if (es) {
        es.close();
      }
    };
  }, []);

  // Auto-scroll to bottom (with debounce to avoid excessive updates)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (logsEndRef.current) {
        logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [logs]);

  const handleClear = () => {
    setLogs([]);
  };

  const filteredLogs = jobFilter
    ? logs.filter((log) => log.jobId === jobFilter)
    : logs;

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour12: false });
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Console Logs</h5>
          <div className="d-flex gap-2 align-items-center">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Filter by Job ID"
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value)}
              style={{ width: '200px' }}
            />
            <button className="btn btn-sm btn-outline-secondary" onClick={handleClear}>
              Clear
            </button>
          </div>
        </div>
      </div>
      <div className="card-body p-0">
        <div className="console-panel" ref={consoleRef}>
          {filteredLogs.length === 0 ? (
            <div className="text-muted text-center py-4">
              No logs yet. Submit a job to see live updates.
            </div>
          ) : (
            filteredLogs.map((log, index) => (
              <div key={index} className="log-entry">
                <span className="log-timestamp">{formatTimestamp(log.timestamp)}</span>
                <span className={`log-phase ${log.phase}`}>[{log.phase.toUpperCase()}]</span>
                <span className="text-muted small">({log.jobId})</span>
                {log.workerId && <span className="text-info small"> W{log.workerId}</span>}
                <span> - {log.message}</span>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
      <div className="card-footer text-muted small">
        <span>{filteredLogs.length} entries</span>
        {jobFilter && <span className="ms-2">(filtered)</span>}
      </div>
    </div>
  );
}
