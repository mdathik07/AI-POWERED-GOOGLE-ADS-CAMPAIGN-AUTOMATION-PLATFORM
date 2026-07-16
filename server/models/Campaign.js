// server/models/Campaign.js
const mongoose = require("mongoose");

const CampaignSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  sessionId: { type: String, required: true }, // Links the campaign to a chat session
  businessName: { type: String },
  campaignName: { type: String },
  headlines: [String],
  descriptions: [String],
  keywords: [String],
  landingPageURLs: [String],
  dailyBudget: { type: Number },
  campaignData: { type: String, required: true }, // Full AI-generated campaign JSON
  // Google Ads resource names, set once the campaign is created in Google Ads
  campaignResourceName: { type: String },
  adGroupResourceName: { type: String },
  // draft -> paused (created in Google Ads, not spending) -> enabled
  status: { type: String, enum: ["draft", "paused", "enabled", "failed"], default: "draft" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

CampaignSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("Campaign", CampaignSchema);
