const OpenAI = require("openai").default || require("openai");
const { v4: uuidv4 } = require("uuid");
const ChatSession = require("../models/ChatSession");
const Campaign = require("../models/Campaign");

const token = process.env["OPENAI_API_KEY"];

exports.processConversation = async (req, res) => {
  const { message, sessionId } = req.body;
  let currentSessionId = sessionId;

  try {
    let chatSession;

    // Initialize or retrieve chat session
    if (!currentSessionId) {
      currentSessionId = uuidv4();
      chatSession = new ChatSession({
        sessionId: currentSessionId,
        conversation: [{ sender: "user", message }],
      });
      await chatSession.save();
    } else {
      chatSession = await ChatSession.findOne({ sessionId: currentSessionId });
      if (!chatSession) {
        chatSession = new ChatSession({
          sessionId: currentSessionId,
          conversation: [{ sender: "user", message }],
        });
        await chatSession.save();
      } else {
        chatSession.conversation.push({ sender: "user", message });
        await chatSession.save();
      }
    }

    // Construct messages for the AI model, including previous conversations
    const messagesForAPI = [
      {
        role: "system",
        content:
          "You are an AI marketing assistant. Gather all necessary details to create an optimized Google Ads campaign. If any details are missing, ask the user relevant follow-up questions.",
      },
      ...chatSession.conversation.map((msg) => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.message,
      })),
    ];

    const client = new OpenAI({
      baseURL: "https://models.inference.ai.azure.com",
      apiKey: token,
    });

    // Call OpenAI API
    const response = await client.chat.completions.create({
      messages: messagesForAPI,
      model: "gpt-4o",
      temperature: 1,
      max_tokens: 4096,
      top_p: 1,
    });

    const aiResponse = response.choices[0].message.content;

    // Save AI response in conversation history
    chatSession.conversation.push({ sender: "bot", message: aiResponse });
    await chatSession.save();

    // Return AI response and sessionId
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
