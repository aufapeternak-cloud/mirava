import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb+srv://naddrzz10_db_user:memekhitamlegam@cluster0-mirava.k2l2kzo.mongodb.net/?appName=Cluster0-mirava';
const DB_NAME = 'video-gen-platform';

async function test() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(DB_NAME);

    const user = await db.collection('users').findOne({ email: 'free@test.com' });
    console.log('User found:', JSON.stringify(user, null, 2));

    await client.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
