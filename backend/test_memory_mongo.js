const fs = require('fs');
const path = require('path');
const os = require('os');

async function testMongoMemory() {
  const tempDir = path.join(os.tmpdir(), 'viva_mongo_mem_db');
  console.log('Testing MongoMemoryServer with custom dbPath:', tempDir);
  
  if (fs.existsSync(tempDir)) {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log('Cleared stale temp dir:', tempDir);
    } catch (e) {
      console.warn('Could not clear temp dir:', e.message);
    }
  }
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create({
      instance: {
        dbPath: tempDir,
      }
    });
    const uri = mongod.getUri();
    console.log('🎉 SUCCESS! MongoMemoryServer started at:', uri);
    await mongod.stop();
  } catch (err) {
    console.error('❌ MongoMemoryServer test failed:', err.message);
  }
}

testMongoMemory();
