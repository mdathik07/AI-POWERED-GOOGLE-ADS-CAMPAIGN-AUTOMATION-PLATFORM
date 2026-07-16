# AdPilot — AI-Powered Google Ads Campaign Automation Platform

A full-stack web application that lets small businesses create and launch real
Google Ads campaigns through a simple AI chat — no marketing expertise required.

**Flow:** Chat with the AI assistant about your business → the AI generates a
complete campaign (headlines, descriptions, keywords, budget, targeting) →
review and edit it → the campaign is created in Google Ads **paused** → press
"Go live" when you're ready to spend.

## Features

- 💬 Conversational campaign creation with an AI marketing assistant (GPT-4o)
- ✍️ AI-generated ad copy that respects Google Ads character limits
  (headlines ≤ 30 chars, descriptions ≤ 90 chars), with live character counters
  in the editor
- 🔒 Safe launches — campaigns are created **paused** and only spend money
  after an explicit "Go live" confirmation
- 📊 Campaign dashboard with per-campaign status (draft / paused / live)
- 🔐 JWT authentication with bcrypt-hashed passwords; all campaign and chat
  APIs require login
- 🛡️ Hardened API: helmet, rate limiting, restricted CORS, input validation

## Tech Stack

| Layer    | Tech |
|----------|------|
| Frontend | React 18, Vite, React Router, Axios |
| Backend  | Node.js, Express, Mongoose |
| Database | MongoDB (Atlas in production) |
| AI       | GPT-4o via GitHub Models endpoint |
| Ads      | Google Ads API (`google-ads-api`) |
| Hosting  | Vercel (frontend) + Render (backend) |

## Project Structure

```
├── client/                 # React + Vite frontend (deployed to Vercel)
│   ├── src/
│   │   ├── pages/          # Home, Login, Signup, Chat, Campaign, Success, Dashboard
│   │   ├── components/     # Navbar
│   │   ├── api.js          # Axios instance + endpoint helpers
│   │   └── auth.js         # localStorage session helpers
│   └── vercel.json         # SPA rewrites
├── server/                 # Express API (deployed to Render)
│   ├── config/db.js        # MongoDB connection
│   ├── middleware/auth.js  # JWT verification
│   ├── controllers/        # auth, chatbot, campaign logic
│   ├── models/             # User, ChatSession, Campaign
│   ├── routes/
│   └── server.js
└── render.yaml             # Render blueprint
```

## Local Development

Prerequisites: Node.js ≥ 18, MongoDB running locally (or an Atlas URI).

```bash
# 1. Backend
cd server
cp .env.example .env      # fill in your credentials
npm install
npm run dev               # http://localhost:5000

# 2. Frontend (new terminal)
cd client
cp .env.example .env      # defaults point at http://localhost:5000
npm install
npm run dev               # http://localhost:5173
```

The chat and campaign generation work with just `OPENAI_API_KEY` set (a GitHub
personal access token used against the GitHub Models endpoint). Launching real
campaigns additionally requires the Google Ads credentials.

## Environment Variables (server)

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing auth tokens (required in production) |
| `CLIENT_ORIGIN` | Comma-separated allowed CORS origins |
| `OPENAI_API_KEY` | Token for the GitHub Models (GPT-4o) endpoint |
| `GOOGLE_ADS_CUSTOMER_ID` | Target Google Ads account |
| `GOOGLE_ADS_CLIENT_ID` / `GOOGLE_ADS_CLIENT_SECRET` | OAuth app credentials |
| `GOOGLE_ADS_REFRESH_TOKEN` | OAuth refresh token |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | Google Ads API developer token |
| `GOOGLE_ADS_LOGIN_CUSTOMER_ID` | Manager (MCC) account ID, if applicable |

## Deployment

### 1. Database — MongoDB Atlas (free tier)

Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas),
add a database user, allow access from anywhere (0.0.0.0/0) or Render's IPs,
and copy the connection string.

### 2. Backend — Render

1. Push this repo to GitHub.
2. In Render: **New → Blueprint**, select the repo — it picks up `render.yaml`.
   (Or create a Web Service manually: root directory `server`, build
   `npm install`, start `npm start`, health check path `/health`.)
3. Set the environment variables listed above. Leave `CLIENT_ORIGIN` for after
   the Vercel deploy.
4. Deploy and note your service URL, e.g. `https://ads-platform-api.onrender.com`.

### 3. Frontend — Vercel

1. In Vercel: **New Project**, import the repo.
2. Set **Root Directory** to `client` (framework preset: Vite).
3. Add environment variable `VITE_API_URL` = your Render URL (no trailing slash).
4. Deploy and note your app URL, e.g. `https://your-app.vercel.app`.

### 4. Connect them

Back in Render, set `CLIENT_ORIGIN=https://your-app.vercel.app` and redeploy.
Done — open the Vercel URL and create a campaign.

> **Note:** Render's free tier spins down after inactivity; the first request
> after idle can take ~50 seconds while the service cold-starts.

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup` | — | Create account, returns JWT |
| POST | `/api/auth/login` | — | Log in, returns JWT |
| POST | `/api/chatbot/conversation` | ✅ | Send a chat message, get AI reply |
| GET  | `/api/chatbot/session/:sessionId` | ✅ | Retrieve a conversation |
| POST | `/api/campaign/generate` | ✅ | Generate campaign JSON from the chat |
| POST | `/api/campaign/launch` | ✅ | Create the campaign in Google Ads (paused) |
| POST | `/api/campaign/enable` | ✅ | Enable a paused campaign (go live) |
| GET  | `/api/campaign/list` | ✅ | List the user's campaigns |
| GET  | `/health` | — | Health check |

## Demo Video

https://youtu.be/6GG_6zgQanM

## Contact

Md Athik — mohdathik@gmail.com

Project link: https://github.com/mdathik07/AI-POWERED-GOOGLE-ADS-CAMPAIGN-AUTOMATION-PLATFORM

## License

MIT
