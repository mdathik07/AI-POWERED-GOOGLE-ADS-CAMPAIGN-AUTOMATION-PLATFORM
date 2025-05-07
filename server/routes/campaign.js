// server/routes/campaign.js
const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');

router.post('/generate', campaignController.generateCampaign);
router.post('/launch', campaignController.launchCampaign);

module.exports = router;
