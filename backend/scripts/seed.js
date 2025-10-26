import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { MongoClient } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment
dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://naddrzz10_db_user:memekhitamlegam@cluster0-mirava.k2l2kzo.mongodb.net/?appName=Cluster0-mirava';
const DB_NAME = process.env.DB_NAME || 'video-gen-platform';

async function seed() {
  console.log('🌱 Seeding MongoDB database...\n');

  let client;

  try {
    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(DB_NAME);

    // Clear existing data
    await db.collection('logs').deleteMany({});
    await db.collection('workers').deleteMany({});
    await db.collection('jobs').deleteMany({});
    await db.collection('users').deleteMany({});
    console.log('🗑️  Cleared existing data\n');

    // Create indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('jobs').createIndex({ user_id: 1 });
    await db.collection('jobs').createIndex({ created_at: -1 });
    await db.collection('workers').createIndex({ user_id: 1 });
    await db.collection('workers').createIndex({ id: 1, user_id: 1 }, { unique: true });
    await db.collection('logs').createIndex({ job_id: 1 });
    await db.collection('logs').createIndex({ timestamp: -1 });
    console.log('📊 Created indexes\n');

    // Create FREE user
    const freePassword = await bcrypt.hash('password123', 10);
    const freeUserResult = await db.collection('users').insertOne({
      email: 'free@test.com',
      password: freePassword,
      role: 'FREE',
      max_workers: 2,
      ttl_seconds: 1800, // 30 minutes
      session_started_at: new Date(),
      created_at: new Date()
    });
    const freeUserId = freeUserResult.insertedId.toString();

    console.log('✅ FREE user created:');
    console.log('   Email: free@test.com');
    console.log('   Password: password123');
    console.log('   Max Workers: 2');
    console.log('   TTL: 30 minutes (1800 seconds)');
    console.log('   CapCut Access: ❌ No\n');

    // Create PREMIUM user
    const premiumPassword = await bcrypt.hash('password123', 10);
    const premiumUserResult = await db.collection('users').insertOne({
      email: 'premium@test.com',
      password: premiumPassword,
      role: 'PREMIUM',
      max_workers: 5,
      ttl_seconds: 7200, // 2 hours
      session_started_at: new Date(),
      created_at: new Date()
    });
    const premiumUserId = premiumUserResult.insertedId.toString();

    console.log('✅ PREMIUM user created:');
    console.log('   Email: premium@test.com');
    console.log('   Password: password123');
    console.log('   Max Workers: 5');
    console.log('   TTL: 2 hours (7200 seconds)');
    console.log('   CapCut Access: ✅ Yes\n');

    // Create ADMIN user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const adminUserResult = await db.collection('users').insertOne({
      email: 'admin@test.com',
      password: adminPassword,
      role: 'ADMIN',
      max_workers: 200,
      ttl_seconds: 86400, // 24 hours
      session_started_at: new Date(),
      created_at: new Date()
    });
    const adminUserId = adminUserResult.insertedId.toString();

    console.log('✅ ADMIN user created:');
    console.log('   Email: admin@test.com');
    console.log('   Password: admin123');
    console.log('   Max Workers: 200');
    console.log('   TTL: 24 hours (86400 seconds)');
    console.log('   CapCut Access: ✅ Yes\n');

    // Initialize workers for FREE user
    const freeServers = [
      'us-east-1.compute.cloud',
      'us-west-2.compute.cloud'
    ];

    const freeWorkers = [];
    for (let i = 1; i <= 2; i++) {
      freeWorkers.push({
        id: i,
        user_id: freeUserId,
        server_name: freeServers[i - 1],
        status: 'idle',
        current_job_id: null,
        last_heartbeat: new Date(),
        created_at: new Date()
      });
    }
    await db.collection('workers').insertMany(freeWorkers);
    console.log('✅ Initialized 2 workers for FREE user\n');

    // Initialize workers for PREMIUM user
    const premiumServers = [
      'us-east-1.compute.cloud',
      'us-west-2.compute.cloud',
      'eu-west-1.compute.cloud',
      'ap-southeast-1.compute.cloud',
      'us-central-1.compute.cloud'
    ];

    const premiumWorkers = [];
    for (let i = 1; i <= 5; i++) {
      premiumWorkers.push({
        id: i,
        user_id: premiumUserId,
        server_name: premiumServers[i - 1],
        status: 'idle',
        current_job_id: null,
        last_heartbeat: new Date(),
        created_at: new Date()
      });
    }
    await db.collection('workers').insertMany(premiumWorkers);
    console.log('✅ Initialized 5 workers for PREMIUM user\n');

    // Initialize workers for ADMIN user (only 10 for seed, can scale to 200)
    const adminServers = [
      'us-east-1.compute.cloud',
      'us-west-2.compute.cloud',
      'eu-west-1.compute.cloud',
      'ap-southeast-1.compute.cloud',
      'us-central-1.compute.cloud',
      'eu-central-1.compute.cloud',
      'ap-northeast-1.compute.cloud',
      'sa-east-1.compute.cloud',
      'ca-central-1.compute.cloud',
      'ap-south-1.compute.cloud'
    ];

    const adminWorkers = [];
    for (let i = 1; i <= 10; i++) {
      adminWorkers.push({
        id: i,
        user_id: adminUserId,
        server_name: adminServers[i - 1],
        status: 'idle',
        current_job_id: null,
        last_heartbeat: new Date(),
        created_at: new Date()
      });
    }
    await db.collection('workers').insertMany(adminWorkers);
    console.log('✅ Initialized 10 workers for ADMIN user (can scale to 200)\n');

    console.log('🎉 Seed completed successfully!\n');
    console.log('You can now login with:');
    console.log('  - free@test.com / password123 (FREE tier - 2 workers, no CapCut)');
    console.log('  - premium@test.com / password123 (PREMIUM tier - 5 workers, CapCut enabled)');
    console.log('  - admin@test.com / admin123 (ADMIN tier - 200 workers, CapCut enabled)\n');

  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('📡 MongoDB connection closed');
    }
  }
}

seed();
