import connectDB from './src/config/database.js';
import { userModel } from './src/models/db.js';

async function test() {
  try {
    await connectDB();
    console.log('Connected to DB');

    const user = await userModel.findByEmail('free@test.com');
    console.log('User from model:', JSON.stringify(user, null, 2));
    console.log('Has password?', !!user.password);
    console.log('Password value:', user.password);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

test();
