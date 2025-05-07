// server/models/ChatSession.js
const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
  sender:    { type: String, enum: ['user', 'bot'], required: true },
  message:   { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const ChatSessionSchema = new mongoose.Schema({
  sessionId:   { type: String, required: true, unique: true },
  // Optionally associate a user (if logged in)
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  conversation:[ChatMessageSchema],
  createdAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('ChatSession', ChatSessionSchema);
