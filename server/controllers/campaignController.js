const OpenAI = require("openai").default || require("openai");
const ChatSession = require("../models/ChatSession");
const { GoogleAdsApi } = require("google-ads-api");

const token = process.env["OPENAI_API_KEY"];

// Google Ads API Credentials
const GOOGLE_ADS_CUSTOMER_ID = process.env["GOOGLE_ADS_CUSTOMER_ID"];
const GOOGLE_ADS_CLIENT_ID = process.env["GOOGLE_ADS_CLIENT_ID"];
const GOOGLE_ADS_CLIENT_SECRET = process.env["GOOGLE_ADS_CLIENT_SECRET"];
const GOOGLE_ADS_REFRESH_TOKEN = process.env["GOOGLE_ADS_REFRESH_TOKEN"];
const GOOGLE_ADS_DEVELOPER_TOKEN = process.env["GOOGLE_ADS_DEVELOPER_TOKEN"];
const GOOGLE_ADS_LOGIN_CUSTOMER_ID = process.env["GOOGLE_ADS_LOGIN_CUSTOMER_ID"]
// Initialize Google Ads API Client
const googleAdsClient = new GoogleAdsApi({
    client_id: GOOGLE_ADS_CLIENT_ID,
    client_secret: GOOGLE_ADS_CLIENT_SECRET,
    developer_token: GOOGLE_ADS_DEVELOPER_TOKEN,
});

const customer = googleAdsClient.Customer({
    customer_id: GOOGLE_ADS_CUSTOMER_ID,
    refresh_token: GOOGLE_ADS_REFRESH_TOKEN,
    login_customer_id:GOOGLE_ADS_LOGIN_CUSTOMER_ID
});

// Generate Campaign Function (Existing)
exports.generateCampaign = async (req, res) => {
    const { sessionId } = req.body;

    try {
        // Retrieve chat history based on sessionId
        const chatSession = await ChatSession.findOne({ sessionId });
        if (!chatSession) {
            return res.status(404).json({ error: "Chat session not found" });
        }

        const conversationData = chatSession.conversation;

        // Create OpenAI client
        const client = new OpenAI({
            baseURL: "https://models.inference.ai.azure.com",
            apiKey: token,
        });

        // Build AI model request with conversation history.
        const messagesForAPI = [
            {
                role: "system",
                content:
                    "You are an AI marketing strategist tasked with generating a Google Ads campaign." +
                    "Analyze the conversation history and output ONLY a valid JSON object conforming to this schema:\n\n" +
                    "And Give short and perfect statements for the business as the Google Ads will give Too long error if exits the length required" + 
                    "If a required information not specified and give the word relevent to the business" +
                    `
                    the character limits for various fields are:
                    Headlines: Maximum of 30 characters each.

                    Descriptions: Maximum of 90 characters each.

                    Keywords: Maximum of 80 characters each.

                    Final URLs: Maximum of 2,047 characters
                    `+
                    `{
                        "campaignName":String or null
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
                    "Respond with only the JSON object and nothing else."
            },
        ];

        // Append full conversation history
        conversationData.forEach((msg) => {
            messagesForAPI.push({
                role: msg.sender === "user" ? "user" : "assistant",
                content: msg.message,
            });
        });

        // Call OpenAI API
        const response = await client.chat.completions.create({
            messages: messagesForAPI,
            model: "gpt-4o",
            temperature: 1,
            max_tokens: 4096,
            top_p: 1,
        });

        console.log("Raw AI Response:", response.choices[0].message.content);

        // Extract and clean AI-generated response
        let responseText = response.choices[0].message.content.trim();
        const jsonStart = responseText.indexOf("{");
        const jsonEnd = responseText.lastIndexOf("}");

        if (jsonStart === -1 || jsonEnd === -1) {
            console.error("No valid JSON found in response:", responseText);
            return res.status(500).json({ error: "AI response did not contain valid JSON data." });
        }

        let jsonString = responseText.substring(jsonStart, jsonEnd + 1);
        let campaignData;
        try {
            campaignData = JSON.parse(jsonString);
        } catch (parseError) {
            console.error("Error parsing campaign JSON:", parseError.message);
            console.error("Raw AI response:", responseText);
            return res.status(500).json({ error: "Failed to parse campaign data from AI response." });
        }

        return res.json({ campaign: campaignData });
    } catch (err) {
        console.error("Error generating campaign:", err);
        return res.status(500).json({ error: "Error generating campaign" });
    }
};

// Complete Launch Campaign Function
exports.launchCampaign = async (req, res) => {
  const { campaign } = req.body;
  
  if (!campaign) {
    return res.status(400).json({ error: "Campaign data is required" });
  }

  try {
    // Generate shorter unique identifier
    const timestamp = Date.now().toString().slice(-6);
    const randomString = Math.random().toString(36).substring(2, 4);
    const uniqueIdentifier = `${timestamp}${randomString}`;

    // Create shorter base name
    const baseName = campaign.businessName 
      ? campaign.businessName.substring(0, 20) 
      : 'GenCamp';

    // 1. Create Budget
    const [{ resource_name: budgetResourceName }] = (
      await customer.campaignBudgets.create([{
        name: `BGT-${uniqueIdentifier}`,
        amount_micros: (campaign.budget.daily || 10) * 1000000,
        delivery_method: 'STANDARD',
      }])
    ).results;

    // 2. Create Campaign
    const [{ resource_name: campaignResourceName }] = (
      await customer.campaigns.create([{
        name: `${baseName}-${uniqueIdentifier}`,
        campaign_budget: budgetResourceName,
        advertising_channel_type: 'SEARCH',
        status: 'PAUSED',
        manual_cpc: {},
        start_date: new Date().toISOString().split('T')[0].replace(/-/g, ''),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0].replace(/-/g, ''),
        network_settings: {
          target_google_search: true,
          target_search_network: true,
          target_content_network: false,
          target_partner_search_network: false,
        },
        bidding_strategy_type: 'MAXIMIZE_CLICKS',
      }])
    ).results;

    // 3. Create Ad Group
    const [{ resource_name: adGroupResourceName }] = (
      await customer.adGroups.create([{
        name: `AG-${uniqueIdentifier}`,
        campaign: campaignResourceName,
        status: 'ENABLED',
        type: 'SEARCH_STANDARD',
        cpc_bid_micros: 1000000,
      }])
    ).results;

    // 4. Create Responsive Search Ad
    await customer.adGroupAds.create([{
      ad_group: adGroupResourceName,
      status: 'ENABLED',
      ad: {
        responsive_search_ad: {
          headlines: campaign.adCopy.headlines.map(text => ({ text })),
          descriptions: campaign.adCopy.descriptions.map(text => ({ text })),
        },
        final_urls: campaign.landingPageURLs,
      },
    }]);

    // 5. Create Keywords
    await customer.adGroupCriteria.create(
      campaign.keywords.map(text => ({
        ad_group: adGroupResourceName,
        status: 'ENABLED',
        keyword: { text, match_type: 'BROAD' },
      }))
    );

    // 6. Enable the campaign
    await customer.campaigns.update([{
      resource_name: campaignResourceName,
      status: 'ENABLED',
    }]);

    return res.json({ 
      message: "Campaign launched successfully!", 
      campaignId: campaignResourceName,
      adGroupId: adGroupResourceName,
      campaignName: `${baseName}-${uniqueIdentifier}`
    });
  } catch (error) {
    console.error("Error launching campaign:", error);
    return res.status(500).json({ 
      error: "Failed to launch campaign",
      details: error.message 
    });
  }
};


