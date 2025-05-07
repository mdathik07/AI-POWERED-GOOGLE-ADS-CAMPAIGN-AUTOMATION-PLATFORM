// server/models/Campaign.js
const mongoose = require("mongoose");

const CampaignSchema = new mongoose.Schema({
  sessionId: { type: String, required: true }, // Links the campaign to a chat session
  businessName: { type: String, required: false }, // Optional, as AI may generate this
  niche: { type: String, required: false }, // Optional, AI may infer this
  targetAudience: { type: String, required: false }, // AI-generated target audience
  campaignGoals: { type: String, required: false }, // AI-generated goals
  headlines: [String], // AI-generated ad headlines
  descriptions: [String], // AI-generated ad descriptions
  keywords: [String], // AI-generated keywords
  budgetSuggestion: { type: String, required: false }, // AI-suggested budget
  campaignData: { type: String, required: true }, // Full AI response for debugging
  status: { type: String, default: "draft" }, // Can be 'draft', 'launched', etc.
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Campaign", CampaignSchema);
