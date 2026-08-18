const OpenAI = require("openai").default || require("openai");
const ChatSession = require("../models/ChatSession");
const Campaign = require("../models/Campaign");
const { GoogleAdsApi } = require("google-ads-api");

const token = process.env["GROQ_API_KEY"];

// Google Ads responsive search ad limits
const LIMITS = {
  headlineMaxLength: 30,
  headlineMinCount: 3,
  headlineMaxCount: 15,
  descriptionMaxLength: 90,
  descriptionMinCount: 2,
  descriptionMaxCount: 4,
  keywordMaxLength: 80,
};

// Lazily create the Google Ads customer so the server can boot (and the
// chat/generate flow can work) even when Ads credentials are not configured.
let cachedCustomer = null;
function getGoogleAdsCustomer() {
  if (cachedCustomer) return cachedCustomer;

  const {
    GOOGLE_ADS_CUSTOMER_ID,
    GOOGLE_ADS_CLIENT_ID,
    GOOGLE_ADS_CLIENT_SECRET,
    GOOGLE_ADS_REFRESH_TOKEN,
    GOOGLE_ADS_DEVELOPER_TOKEN,
    GOOGLE_ADS_LOGIN_CUSTOMER_ID,
  } = process.env;

  if (
    !GOOGLE_ADS_CUSTOMER_ID ||
    !GOOGLE_ADS_CLIENT_ID ||
    !GOOGLE_ADS_CLIENT_SECRET ||
    !GOOGLE_ADS_REFRESH_TOKEN ||
    !GOOGLE_ADS_DEVELOPER_TOKEN
  ) {
    const err = new Error(
      "Google Ads credentials are not configured on the server."
    );
    err.statusCode = 503;
    throw err;
  }

  const client = new GoogleAdsApi({
    client_id: GOOGLE_ADS_CLIENT_ID,
    client_secret: GOOGLE_ADS_CLIENT_SECRET,
    developer_token: GOOGLE_ADS_DEVELOPER_TOKEN,
  });

  cachedCustomer = client.Customer({
    customer_id: GOOGLE_ADS_CUSTOMER_ID,
    refresh_token: GOOGLE_ADS_REFRESH_TOKEN,
    login_customer_id: GOOGLE_ADS_LOGIN_CUSTOMER_ID,
  });
  return cachedCustomer;
}

// Enforce Google Ads character/count limits on AI-generated copy so a single
// over-limit headline can't fail the whole launch.
function sanitizeAdCopy(campaign) {
  const dedupe = (arr) => [...new Set(arr)];

  const headlines = dedupe(
    (campaign.adCopy?.headlines || [])
      .filter((h) => typeof h === "string" && h.trim())
      .map((h) => h.trim().slice(0, LIMITS.headlineMaxLength))
  ).slice(0, LIMITS.headlineMaxCount);

  const descriptions = dedupe(
    (campaign.adCopy?.descriptions || [])
      .filter((d) => typeof d === "string" && d.trim())
      .map((d) => d.trim().slice(0, LIMITS.descriptionMaxLength))
  ).slice(0, LIMITS.descriptionMaxCount);

  const keywords = dedupe(
    (campaign.keywords || [])
      .filter((k) => typeof k === "string" && k.trim())
      .map((k) => k.trim().slice(0, LIMITS.keywordMaxLength))
  );

  const landingPageURLs = (campaign.landingPageURLs || [])
    .filter((u) => typeof u === "string" && u.trim())
    .map((u) => (u.startsWith("http") ? u.trim() : `https://${u.trim()}`));

  // Fall back to the website URL if the AI didn't produce landing pages
  if (!landingPageURLs.length && campaign.websiteURL) {
    const site = campaign.websiteURL.trim();
    landingPageURLs.push(site.startsWith("http") ? site : `https://${site}`);
  }

  return { headlines, descriptions, keywords, landingPageURLs };
}

function validateForLaunch({ headlines, descriptions, keywords, landingPageURLs }) {
  const errors = [];
  if (headlines.length < LIMITS.headlineMinCount)
    errors.push(`At least ${LIMITS.headlineMinCount} headlines are required (got ${headlines.length}).`);
  if (descriptions.length < LIMITS.descriptionMinCount)
    errors.push(`At least ${LIMITS.descriptionMinCount} descriptions are required (got ${descriptions.length}).`);
  if (!keywords.length) errors.push("At least one keyword is required.");
  if (!landingPageURLs.length) errors.push("A landing page URL is required.");
  return errors;
}

// Generate Campaign from the chat conversation, persist it as a draft
exports.generateCampaign = async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: "sessionId is required" });
  }

  try {
    const chatSession = await ChatSession.findOne({ sessionId });
    if (!chatSession) {
      return res.status(404).json({ error: "Chat session not found" });
    }

    const conversationData = chatSession.conversation;

    const client = new OpenAI({
      baseURL: "https://models.inference.ai.azure.com",
      apiKey: token,
    });

    const messagesForAPI = [
      {
        role: "system",
        content:
          "You are an AI marketing strategist tasked with generating a Google Ads campaign. " +
          "Analyze the conversation history and output ONLY a valid JSON object conforming to this schema.\n\n" +
          "Keep statements short and punchy — Google Ads rejects copy that exceeds the limits. " +
          "If required information was not specified, infer something relevant to the business.\n" +
          `Character limits:
                    Headlines: maximum 30 characters each (provide 5-10).
                    Descriptions: maximum 90 characters each (provide 2-4).
                    Keywords: maximum 80 characters each (provide 5-15).
                    Final URLs: maximum 2,047 characters.
                    ` +
          `{
                        "campaignName": string or null,
                        "businessName": string or null,
                        "websiteURL": string or null,
                        "businessType": string or null,
                        "targetDemographics": { "ageRange": string or null, "gender": string or null, "incomeLevel": string or null },
                        "geographicTargeting": { "locations": [string], "radius": number or null },
                        "interestsAndBehaviors": [string],
                        "campaignObjectives": [string],
                        "budget": { "daily": number or null, "monthly": number or null },
                        "biddingStrategy": string or null,
                        "keywords": [string],
                        "adCopy": { "headlines": [string], "descriptions": [string] },
                        "landingPageURLs": [string],
                        "conversionTracking": { "methods": [string], "setupStatus": string or null },
                        "adExtensions": { "siteLinks": [string], "callExtensions": [string], "locationExtensions": [string], "promotionExtensions": [string] },
                        "status": string
                    }\n\n` +
          "Respond with only the JSON object and nothing else.",
      },
      ...conversationData.map((msg) => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.message,
      })),
    ];

    const response = await client.chat.completions.create({
      messages: messagesForAPI,
      model: "openai/gpt-oss-120b",
      temperature: 1,
      max_completion_tokens: 4096,
      top_p: 1,
      response_format: { type: "json_object" },
    });

    const responseText = response.choices[0].message.content.trim();
    const jsonStart = responseText.indexOf("{");
    const jsonEnd = responseText.lastIndexOf("}");

    if (jsonStart === -1 || jsonEnd === -1) {
      console.error("No valid JSON found in response:", responseText);
      return res.status(500).json({ error: "AI response did not contain valid JSON data." });
    }

    let campaignData;
    try {
      campaignData = JSON.parse(responseText.substring(jsonStart, jsonEnd + 1));
    } catch (parseError) {
      console.error("Error parsing campaign JSON:", parseError.message);
      return res.status(500).json({ error: "Failed to parse campaign data from AI response." });
    }

    // Apply Google Ads limits up front so the user reviews what will actually launch
    const sanitized = sanitizeAdCopy(campaignData);
    campaignData.adCopy = {
      headlines: sanitized.headlines,
      descriptions: sanitized.descriptions,
    };
    campaignData.keywords = sanitized.keywords;
    campaignData.landingPageURLs = sanitized.landingPageURLs;

    // Persist as a draft tied to the logged-in user
    const draft = await Campaign.create({
      user: req.user?.id,
      sessionId,
      businessName: campaignData.businessName,
      campaignName: campaignData.campaignName,
      headlines: sanitized.headlines,
      descriptions: sanitized.descriptions,
      keywords: sanitized.keywords,
      landingPageURLs: sanitized.landingPageURLs,
      dailyBudget: campaignData.budget?.daily || null,
      campaignData: JSON.stringify(campaignData),
      status: "draft",
    });

    return res.json({ campaign: campaignData, campaignId: draft._id });
  } catch (err) {
    console.error("Error generating campaign:", err);
    return res.status(500).json({ error: "Error generating campaign" });
  }
};

// Create the campaign in Google Ads — PAUSED, so no money is spent until the
// user explicitly enables it.
exports.launchCampaign = async (req, res) => {
  const { campaign, campaignId } = req.body;

  if (!campaign) {
    return res.status(400).json({ error: "Campaign data is required" });
  }

  const sanitized = sanitizeAdCopy(campaign);
  const validationErrors = validateForLaunch(sanitized);
  if (validationErrors.length) {
    return res.status(400).json({ error: validationErrors.join(" ") });
  }

  try {
    const customer = getGoogleAdsCustomer();

    const timestamp = Date.now().toString().slice(-6);
    const randomString = Math.random().toString(36).substring(2, 4);
    const uniqueIdentifier = `${timestamp}${randomString}`;

    const baseName = campaign.businessName
      ? campaign.businessName.substring(0, 20)
      : "GenCamp";
    const campaignName = `${baseName}-${uniqueIdentifier}`;

    // 1. Create Budget
    const [{ resource_name: budgetResourceName }] = (
      await customer.campaignBudgets.create([
        {
          name: `BGT-${uniqueIdentifier}`,
          amount_micros: (campaign.budget?.daily || 10) * 1000000,
          delivery_method: "STANDARD",
        },
      ])
    ).results;

    // 2. Create Campaign (PAUSED — enabled later via /api/campaign/enable)
    const [{ resource_name: campaignResourceName }] = (
      await customer.campaigns.create([
        {
          name: campaignName,
          campaign_budget: budgetResourceName,
          advertising_channel_type: "SEARCH",
          status: "PAUSED",
          // Required declaration since Google Ads API v21 (EU political ads transparency)
          contains_eu_political_advertising:
            "DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING",
          // Maximize Clicks bidding — set via the target_spend scheme
          target_spend: {},
          start_date: new Date().toISOString().split("T")[0].replace(/-/g, ""),
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0]
            .replace(/-/g, ""),
          network_settings: {
            target_google_search: true,
            target_search_network: true,
            target_content_network: false,
            target_partner_search_network: false,
          },
        },
      ])
    ).results;

    // 3. Create Ad Group
    const [{ resource_name: adGroupResourceName }] = (
      await customer.adGroups.create([
        {
          name: `AG-${uniqueIdentifier}`,
          campaign: campaignResourceName,
          status: "ENABLED",
          type: "SEARCH_STANDARD",
          cpc_bid_micros: 1000000,
        },
      ])
    ).results;

    // 4. Create Responsive Search Ad
    await customer.adGroupAds.create([
      {
        ad_group: adGroupResourceName,
        status: "ENABLED",
        ad: {
          responsive_search_ad: {
            headlines: sanitized.headlines.map((text) => ({ text })),
            descriptions: sanitized.descriptions.map((text) => ({ text })),
          },
          final_urls: sanitized.landingPageURLs,
        },
      },
    ]);

    // 5. Create Keywords
    await customer.adGroupCriteria.create(
      sanitized.keywords.map((text) => ({
        ad_group: adGroupResourceName,
        status: "ENABLED",
        keyword: { text, match_type: "BROAD" },
      }))
    );

    // Update the stored draft (or create a record if none exists)
    let record = campaignId ? await Campaign.findById(campaignId) : null;
    if (!record) {
      record = new Campaign({
        user: req.user?.id,
        sessionId: campaign.sessionId || "unknown",
        campaignData: JSON.stringify(campaign),
      });
    }
    record.businessName = campaign.businessName;
    record.campaignName = campaignName;
    record.headlines = sanitized.headlines;
    record.descriptions = sanitized.descriptions;
    record.keywords = sanitized.keywords;
    record.landingPageURLs = sanitized.landingPageURLs;
    record.dailyBudget = campaign.budget?.daily || 10;
    record.campaignResourceName = campaignResourceName;
    record.adGroupResourceName = adGroupResourceName;
    record.status = "paused";
    await record.save();

    return res.json({
      message:
        "Campaign created in Google Ads (paused). Review it, then enable it to start running.",
      campaignId: record._id,
      campaignResourceName,
      adGroupId: adGroupResourceName,
      campaignName,
      status: "paused",
    });
  } catch (error) {
    console.error("Error launching campaign:", error);
    return res.status(error.statusCode || 500).json({
      error: "Failed to launch campaign",
      details: error.message,
    });
  }
};

// Flip a paused campaign to ENABLED after the user confirms.
exports.enableCampaign = async (req, res) => {
  const { campaignId } = req.body;

  if (!campaignId) {
    return res.status(400).json({ error: "campaignId is required" });
  }

  try {
    const record = await Campaign.findById(campaignId);
    if (!record || !record.campaignResourceName) {
      return res.status(404).json({ error: "Launched campaign not found" });
    }
    if (record.user && String(record.user) !== req.user.id) {
      return res.status(403).json({ error: "Not your campaign" });
    }

    const customer = getGoogleAdsCustomer();
    await customer.campaigns.update([
      { resource_name: record.campaignResourceName, status: "ENABLED" },
    ]);

    record.status = "enabled";
    await record.save();

    return res.json({ message: "Campaign is now live!", status: "enabled" });
  } catch (error) {
    console.error("Error enabling campaign:", error);
    return res.status(error.statusCode || 500).json({
      error: "Failed to enable campaign",
      details: error.message,
    });
  }
};

// List the logged-in user's campaigns (newest first).
exports.listCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .select("-campaignData")
      .limit(100);
    return res.json({ campaigns });
  } catch (error) {
    console.error("Error listing campaigns:", error);
    return res.status(500).json({ error: "Failed to list campaigns" });
  }
};
