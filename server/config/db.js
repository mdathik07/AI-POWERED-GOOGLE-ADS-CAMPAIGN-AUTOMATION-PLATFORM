// server/config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
  // Accept both names — the README historically documented MONGODB_URI while
  // the code read MONGO_URI, which silently sent deploys to localhost.
  const uri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    'mongodb://localhost:27017/ad_campaign_db';

  try {
    await mongoose.connect(uri);
    console.log('MongoDB connected.');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
