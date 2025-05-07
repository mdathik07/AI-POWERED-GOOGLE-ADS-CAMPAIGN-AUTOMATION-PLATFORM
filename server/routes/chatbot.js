// server/routes/chatbot.js
const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');

router.post('/conversation', chatbotController.processConversation);
router.get('/session/:sessionId', chatbotController.getChatSession);

module.exports = router;
