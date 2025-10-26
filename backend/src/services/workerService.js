import { workerModel } from '../models/db.js';
import { serverSelection } from './serverSelection.js';

class WorkerService {
  constructor() {
    this.clients = new Set();
    this.heartbeatInterval = null;
    this.startHeartbeat();
  }

  // Initialize workers for a user
  async initializeWorkers(userId, maxWorkers) {
    // Clear existing workers
    await workerModel.deleteByUser(userId);

    // Create workers up to max limit
    for (let i = 1; i <= maxWorkers; i++) {
      const server = serverSelection.assignServer();
      await workerModel.create(i, userId, server);
    }

    this.broadcastWorkerUpdate(userId);
  }

  // Get worker status for a user
  async getWorkerStatus(userId) {
    const workers = await workerModel.findByUser(userId);
    return workers.map(w => ({
      id: w.id,
      server: w.server_name,
      status: w.status,
      currentJobId: w.current_job_id,
      lastHeartbeat: w.last_heartbeat
    }));
  }

  // Update worker status
  async updateWorker(workerId, userId, status, currentJobId = null) {
    await workerModel.updateStatus(workerId, userId, status, currentJobId);
    this.broadcastWorkerUpdate();
  }

  // Add SSE client for worker updates
  async addClient(res, userId = null) {
    const client = {
      res,
      userId,
      id: Date.now() + Math.random()
    };

    this.clients.add(client);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    res.write(': connected\n\n');

    // Send initial state if userId provided
    if (userId) {
      const workers = await this.getWorkerStatus(userId);
      try {
        res.write(`data: ${JSON.stringify({ type: 'init', workers })}\n\n`);
      } catch (error) {
        this.clients.delete(client);
      }
    }

    res.on('close', () => {
      this.clients.delete(client);
    });

    return client;
  }

  // Broadcast worker updates to SSE clients
  async broadcastWorkerUpdate(userId = null) {
    for (const client of this.clients) {
      if (!client.userId || client.userId === userId) {
        try {
          const workers = await this.getWorkerStatus(client.userId || userId);
          client.res.write(`data: ${JSON.stringify({ type: 'update', workers })}\n\n`);
        } catch (error) {
          this.clients.delete(client);
        }
      }
    }
  }

  // Simulate heartbeat updates
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      // Update heartbeats for all workers (simulated)
      // In production, workers would send their own heartbeats
      this.broadcastWorkerUpdate();
    }, 5000); // Every 5 seconds
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
  }
}

export const workerService = new WorkerService();
