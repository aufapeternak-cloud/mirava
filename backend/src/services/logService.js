import { logModel } from '../models/db.js';

class LogService {
  constructor() {
    this.clients = new Set();
  }

  // Add SSE client
  addClient(res, jobIdFilter = null) {
    const client = {
      res,
      jobIdFilter,
      id: Date.now() + Math.random()
    };

    this.clients.add(client);

    // Setup SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    // Send initial comment to establish connection
    res.write(': connected\n\n');

    // Remove client on disconnect
    res.on('close', () => {
      this.clients.delete(client);
    });

    return client;
  }

  // Broadcast log to all connected clients
  async broadcast(jobId, workerId, phase, message) {
    // Persist to database
    await logModel.create(jobId, workerId, phase, message);

    const logEntry = {
      jobId,
      workerId,
      phase,
      message,
      timestamp: new Date().toISOString()
    };

    // Send to SSE clients
    this.clients.forEach(client => {
      if (!client.jobIdFilter || client.jobIdFilter === jobId) {
        try {
          client.res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
        } catch (error) {
          this.clients.delete(client);
        }
      }
    });

    return logEntry;
  }

  // Get historical logs
  async getRecentLogs(jobId = null, limit = 100) {
    if (jobId) {
      return await logModel.findByJob(jobId, limit);
    }
    return await logModel.findRecent(limit);
  }
}

export const logService = new LogService();
