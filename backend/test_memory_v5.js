const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

async function test() {
  console.log('Testing MongoMemoryServer with v5.0.14...');
  try {
    const mongod = await MongoMemoryServer.create({
      binary: {
        version: '5.0.14'
      }
    });
    const uri = mongod.getUri();
    console.log('✅ SUCCESS! Started MongoMemoryServer v5.0.14 at:', uri);
    await mongoose.connect(uri);
    console.log('✅ Mongoose connected successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed:', err.message);
    process.exit(1);
  }
}

test();
