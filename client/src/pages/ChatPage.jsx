import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatbot, campaign } from '../api.js';
import { getSessionId, setSessionId } from '../auth.js';

const WELCOME = {
  sender: 'bot',
  message:
    "Hi! I'm your AI marketing assistant. Tell me about your business — what do you sell, " +
    'and who are your customers? I\'ll help you build a Google Ads campaign step by step.',
};

export default function ChatPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  // Restore an existing conversation if the session has one
  useEffect(() => {
    const sessionId = getSessionId();
    if (!sessionId) return;
    chatbot
      .getSession(sessionId)
      .then(({ data }) => {
        if (data.conversation?.length) {
          setMessages([WELCOME, ...data.conversation]);
        }
      })
      .catch(() => {
        /* no previous conversation — that's fine */
      });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const send = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setError('');
    setInput('');
    setMessages((m) => [...m, { sender: 'user', message: text }]);
    setSending(true);
    try {
      const { data } = await chatbot.send(text, getSessionId());
      if (data.sessionId) setSessionId(data.sessionId);
      setMessages((m) => [...m, { sender: 'bot', message: data.reply }]);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not reach the assistant. Try again.');
    } finally {
      setSending(false);
    }
  };

  const generate = async () => {
    setError('');
    setGenerating(true);
    try {
      const { data } = await campaign.generate(getSessionId());
      navigate('/campaign', {
        state: { campaign: data.campaign, campaignId: data.campaignId },
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Campaign generation failed. Try again.');
    } finally {
      setGenerating(false);
    }
  };

  const userTurns = messages.filter((m) => m.sender === 'user').length;

  return (
    <main className="page chat-layout">
      <div className="chat-header">
        <h2>Build your campaign</h2>
        <button
          className="btn btn-primary"
          onClick={generate}
          disabled={generating || userTurns < 2}
          title={userTurns < 2 ? 'Chat a bit more so the AI knows your business' : ''}
        >
          {generating ? 'Generating…' : '✨ Generate campaign'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="chat-window">
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.sender === 'user' ? 'bubble-user' : 'bubble-bot'}`}>
            {m.message}
          </div>
        ))}
        {sending && <div className="bubble bubble-bot bubble-typing">Thinking…</div>}
        <div ref={bottomRef} />
      </div>

      <form className="chat-input" onSubmit={send}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. I run a bakery in Chennai and want more walk-in customers…"
          maxLength={4000}
          autoFocus
        />
        <button className="btn btn-primary" disabled={sending || !input.trim()}>
          Send
        </button>
      </form>
    </main>
  );
}
