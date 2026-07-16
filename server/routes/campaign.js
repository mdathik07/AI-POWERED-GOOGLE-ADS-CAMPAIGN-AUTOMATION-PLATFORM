// server/routes/campaign.js
const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');

router.post('/generate', campaignController.generateCampaign);
router.post('/launch', campaignController.launchCampaign);
router.post('/enable', campaignController.enableCampaign);
router.get('/list', campaignController.listCampaigns);

module.exports = router;
