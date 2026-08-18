const OpenAI = require("openai").default || require("openai");
const { v4: uuidv4 } = require("uuid");
const ChatSession = require("../models/ChatSession");

const token = process.env["GROQ_API_KEY"];

exports.processConversation = async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "A non-empty message is required" });
  }
  if (message.length > 4000) {
    return res.status(400).json({ error: "Message is too long (max 4000 characters)" });
  }

  let currentSessionId = sessionId;

  try {
    let chatSession = currentSessionId
      ? await ChatSession.findOne({ sessionId: currentSessionId })
      : null;

    if (!chatSession) {
      currentSessionId = currentSessionId || uuidv4();
      chatSession = new ChatSession({
        sessionId: currentSessionId,
        user: req.user?.id,
        conversation: [{ sender: "user", message }],
      });
    } else {
      chatSession.conversation.push({ sender: "user", message });
    }
    await chatSession.save();

    const messagesForAPI = [
      {
        role: "system",
        content:
          "You are an AI marketing assistant helping small businesses create Google Ads campaigns. " +
          "Gather all necessary details to create an optimized campaign: business name, website, " +
          "what they sell, target audience, locations to target, and daily budget. " +
          "If any details are missing, ask relevant follow-up questions — one or two at a time, " +
          "in plain language a non-marketer understands. Once you have enough information, " +
          "summarize what you've gathered and tell the user they can generate their campaign.",
      },
      ...chatSession.conversation.map((msg) => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.message,
      })),
    ];

    const client = new OpenAI({
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: token,
    });

    const response = await client.chat.completions.create({
      messages: messagesForAPI,
      model: "openai/gpt-oss-120b",
      temperature: 1,
      max_completion_tokens: 4096,
      top_p: 1,
    });

    const aiResponse = response.choices[0].message.content;

    chatSession.conversation.push({ sender: "bot", message: aiResponse });
    await chatSession.save();

    res.json({ reply: aiResponse, sessionId: currentSessionId });
  } catch (error) {
    console.error("Error processing conversation:", error);
    res.status(500).json({ error: "Error processing conversation" });
  }
};

// Retrieve a chat session by sessionId
exports.getChatSession = async (req, res) => {
  const { sessionId } = req.params;
  try {
    const chatSession = await ChatSession.findOne({ sessionId });
    if (!chatSession) {
      return res.status(404).json({ error: "Session not found" });
    }
    res.json(chatSession);
  } catch (error) {
    console.error("Error retrieving chat session:", error);
    res.status(500).json({ error: "Error retrieving chat session" });
  }
};
