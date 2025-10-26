import { getDB } from '../config/database.js';
import { ObjectId } from 'mongodb';

export const userModel = {
  create: async (email, hashedPassword, role, maxWorkers, ttlSeconds) => {
    const db = getDB();
    const result = await db.collection('users').insertOne({
      email,
      password: hashedPassword,
      role,
      max_workers: maxWorkers,
      ttl_seconds: ttlSeconds,
      session_started_at: new Date(),
      created_at: new Date()
    });
    return { insertId: result.insertedId };
  },

  findByEmail: async (email) => {
    const db = getDB();
    const user = await db.collection('users').findOne({ email });
    if (user) {
      user.id = user._id.toString();
    }
    return user;
  },

  findById: async (id) => {
    const db = getDB();
    try {
      const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
      if (user) {
        user.id = user._id.toString();
      }
      return user;
    } catch (error) {
      return null;
    }
  },

  updateSessionStart: async (userId) => {
    const db = getDB();
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $set: { session_started_at: new Date() } }
    );
    return { changes: result.modifiedCount };
  }
};

export const jobModel = {
  create: async (id, userId, prompts, ratio, saveTarget, maxWorkers, model = null) => {
    const db = getDB();
    await db.collection('jobs').insertOne({
      _id: id,
      user_id: userId,
      prompts: prompts,
      ratio,
      save_target: saveTarget,
      max_workers: maxWorkers,
      model,
      status: 'queued',
      created_at: new Date(),
      completed_at: null
    });
    return { insertId: id };
  },

  findById: async (id) => {
    const db = getDB();
    const job = await db.collection('jobs').findOne({ _id: id });
    if (job) {
      job.id = job._id;
    }
    return job;
  },

  findByUser: async (userId) => {
    const db = getDB();
    const jobs = await db.collection('jobs')
      .find({ user_id: userId })
      .sort({ created_at: -1 })
      .toArray();
    return jobs.map(job => ({ ...job, id: job._id }));
  },

  updateStatus: async (id, status) => {
    const db = getDB();
    const result = await db.collection('jobs').updateOne(
      { _id: id },
      {
        $set: {
          status,
          completed_at: new Date()
        }
      }
    );
    return { changes: result.modifiedCount };
  },

  countActiveByUser: async (userId) => {
    const db = getDB();
    const count = await db.collection('jobs').countDocuments({
      user_id: userId,
      status: { $in: ['queued', 'running', 'processing'] }
    });
    return count;
  }
};

export const workerModel = {
  create: async (id, userId, serverName) => {
    const db = getDB();
    await db.collection('workers').updateOne(
      { id, user_id: userId },
      {
        $set: {
          server_name: serverName,
          status: 'idle',
          last_heartbeat: new Date(),
          current_job_id: null,
          created_at: new Date()
        }
      },
      { upsert: true }
    );
    return { changes: 1 };
  },

  findByUser: async (userId) => {
    const db = getDB();
    const workers = await db.collection('workers')
      .find({ user_id: userId })
      .sort({ id: 1 })
      .toArray();
    return workers;
  },

  updateStatus: async (id, userId, status, currentJobId = null) => {
    const db = getDB();
    const result = await db.collection('workers').updateOne(
      { id, user_id: userId },
      {
        $set: {
          status,
          current_job_id: currentJobId,
          last_heartbeat: new Date()
        }
      }
    );
    return { changes: result.modifiedCount };
  },

  updateHeartbeat: async (id, userId) => {
    const db = getDB();
    const result = await db.collection('workers').updateOne(
      { id, user_id: userId },
      { $set: { last_heartbeat: new Date() } }
    );
    return { changes: result.modifiedCount };
  },

  deleteByUser: async (userId) => {
    const db = getDB();
    const result = await db.collection('workers').deleteMany({ user_id: userId });
    return { changes: result.deletedCount };
  }
};

export const logModel = {
  create: async (jobId, workerId, phase, message) => {
    const db = getDB();
    const result = await db.collection('logs').insertOne({
      job_id: jobId,
      worker_id: workerId,
      phase,
      message,
      timestamp: new Date()
    });
    return { insertId: result.insertedId };
  },

  findByJob: async (jobId, limit = 100) => {
    const db = getDB();
    const logs = await db.collection('logs')
      .find({ job_id: jobId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
    return logs;
  },

  findRecent: async (limit = 100) => {
    const db = getDB();
    const logs = await db.collection('logs')
      .find({})
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
    return logs;
  }
};
