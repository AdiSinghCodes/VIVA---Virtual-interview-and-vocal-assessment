const mongoose = require('mongoose');
require('dotenv').config();

async function testAtlas() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('Set MONGO_URI in backend/.env before running this test.');
    process.exit(1);
  }

  console.log('Testing the MongoDB URI configured through MONGO_URI…');
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB connection succeeded.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

testAtlas();
