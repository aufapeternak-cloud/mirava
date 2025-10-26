import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://naddrzz10_db_user:memekhitamlegam@cluster0-mirava.k2l2kzo.mongodb.net/?appName=Cluster0-mirava';
const DB_NAME = process.env.DB_NAME || 'video-gen-platform';

let client;
let db;

async function connectDB() {
  try {
    if (!client) {
      client = new MongoClient(MONGODB_URI);
      await client.connect();
      db = client.db(DB_NAME);

      // Create indexes
      await db.collection('users').createIndex({ email: 1 }, { unique: true });
      await db.collection('jobs').createIndex({ user_id: 1 });
      await db.collection('jobs').createIndex({ created_at: -1 });
      await db.collection('workers').createIndex({ user_id: 1 });
      await db.collection('logs').createIndex({ job_id: 1 });
      await db.collection('logs').createIndex({ created_at: -1 });

      console.log('✅ MongoDB connected successfully');
    }
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

export function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB() first.');
  }
  return db;
}

export async function closeDB() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('MongoDB connection closed');
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await closeDB();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await closeDB();
  process.exit(0);
});

export default connectDB;
