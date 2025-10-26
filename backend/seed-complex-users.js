// Complex user seed script for testing role integration
import bcrypt from 'bcryptjs';
import connectDB, { getDB } from './src/config/database.js';

const testUsers = [
  {
    email: 'free@test.com',
    password: 'password123',
    role: 'FREE'
  },
  {
    email: 'premium@test.com', 
    password: 'password123',
    role: 'PREMIUM'
  },
  {
    email: 'enterprise@test.com',
    password: 'password123', 
    role: 'ENTERPRISE'
  },
  {
    email: 'admin@test.com',
    password: 'password123',
    role: 'ADMIN'
  }
];

async function seedComplexUsers() {
  try {
    console.log('🌱 Starting complex user seeding...');
    
    await connectDB();
    const db = getDB();
    
    // Clear existing test users
    console.log('🧹 Clearing existing test users...');
    await db.collection('users').deleteMany({ 
      email: { $in: testUsers.map(u => u.email) } 
    });
    
    // Create test users with complex role configurations
    for (const userData of testUsers) {
      console.log(`👤 Creating ${userData.role} user: ${userData.email}`);
      
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Get role configuration
      const roleConfig = {
        FREE: { maxWorkers: 2, ttlSeconds: 30 * 60 },
        PREMIUM: { maxWorkers: 5, ttlSeconds: 2 * 60 * 60 },
        ENTERPRISE: { maxWorkers: 50, ttlSeconds: 8 * 60 * 60 },
        ADMIN: { maxWorkers: 200, ttlSeconds: 24 * 60 * 60 }
      };
      
      const config = roleConfig[userData.role];
      
      await db.collection('users').insertOne({
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
        max_workers: config.maxWorkers,
        ttl_seconds: config.ttlSeconds,
        session_started_at: new Date(),
        created_at: new Date()
      });
      
      console.log(`✅ Created ${userData.role} user with ${config.maxWorkers} max workers`);
    }
    
    console.log('🎉 Complex user seeding completed successfully!');
    console.log('\n📋 Test Users Created:');
    console.log('======================');
    
    for (const user of testUsers) {
      const config = {
        FREE: { maxWorkers: 2, description: 'Free Plan (2 workers, 5 prompts)' },
        PREMIUM: { maxWorkers: 5, description: 'Premium Plan (5 workers, 100 prompts)' },
        ENTERPRISE: { maxWorkers: 50, description: 'Enterprise Plan (50 workers, 1000 prompts)' },
        ADMIN: { maxWorkers: 200, description: 'Admin Plan (200 workers, unlimited prompts)' }
      }[user.role];
      
      console.log(`👤 ${user.email} | ${user.role} | ${config.description}`);
    }
    
    console.log('\n🧪 Test Commands:');
    console.log('================');
    console.log('1. Login as Premium user:');
    console.log('   POST /api/x7auth/session/login');
    console.log('   { "email": "premium@test.com", "password": "password123" }');
    console.log('');
    console.log('2. Create job with 5 workers (should work for Premium):');
    console.log('   POST /api/vdo/fabric/create');
    console.log('   { "prompts": ["test1", "test2"], "maxWorkers": 5, "ratio": "16:9", "saveTarget": "browser" }');
    console.log('');
    console.log('3. Create job with 50 workers (should fail for Premium, work for Enterprise):');
    console.log('   { "prompts": ["test"], "maxWorkers": 50, "ratio": "16:9", "saveTarget": "browser" }');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run seeding
seedComplexUsers().catch(console.error);