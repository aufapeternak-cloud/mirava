import connectDB from './src/config/database.js';
import { authService } from './src/services/authService.js';

async function test() {
  try {
    await connectDB();
    console.log('Connected to DB');

    const result = await authService.login('free@test.com', 'password123');
    console.log('Login result:', JSON.stringify(result, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

test();
