const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

async function test() {
  console.log('Starting MongoMemoryServer...');
  try {
    const mongod = await MongoMemoryServer.create({
      instance: {
        dbName: 'viva_interview'
      }
    });
    const uri = mongod.getUri();
    console.log('✅ Started MongoMemoryServer at:', uri);
    await mongoose.connect(uri);
    console.log('✅ Mongoose connected successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed:', err.message);
    process.exit(1);
  }
}

test();
