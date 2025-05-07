# Google Ads Campaign Management System

A full-stack web application for managing and launching Google Ads campaigns through an intuitive chat interface.

## Features

- Interactive chat interface for campaign creation
- Real-time campaign generation and management
- Secure user authentication
- Campaign launch functionality
- Success tracking and monitoring
- Modern and responsive UI

## Tech Stack

### Frontend
- React.js
- React Router for navigation
- Axios for API calls
- Modern CSS styling

### Backend
- Node.js
- Express.js
- MongoDB (for data storage)
- Google Ads API integration

## Project Structure

```
google-ads-campaign/
├── client/
│   └── my-app/
│       ├── src/
│       │   ├── components/
│       │   │   ├── HomePage.js
│       │   │   ├── ChatPage.js
│       │   │   ├── CampaignPage.js
│       │   │   └── CampaignSuccess.js
│       │   ├── App.js
│       │   └── index.js
│       └── package.json
├── server/
│   ├── routes/
│   ├── models/
│   ├── controllers/
│   ├── google-ads.yaml.template
│   └── server.js
├── .gitignore
└── README.md
```

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MongoDB
- Google Ads API credentials

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/google-ads-campaign.git
cd google-ads-campaign
```

2. Install frontend dependencies:
```bash
cd client/my-app
npm install
```

3. Install backend dependencies:
```bash
cd ../../server
npm install
```

4. Set up credentials:
   - Copy `server/google-ads.yaml.template` to `server/google-ads.yaml`
   - Fill in your Google Ads API credentials in `google-ads.yaml`
   - Create a `.env` file in the server directory with the following variables:
```
MONGODB_URI=your_mongodb_uri
GOOGLE_ADS_CLIENT_ID=your_client_id
GOOGLE_ADS_CLIENT_SECRET=your_client_secret
JWT_SECRET=your_jwt_secret
```

## Running the Application

1. Start the backend server:
```bash
cd server
npm start
```

2. Start the frontend development server:
```bash
cd client/my-app
npm start
```

The application will be available at `http://localhost:3000`

## API Endpoints

- `POST /api/auth/login` - User login
- `POST /api/campaign/generate` - Generate new campaign
- `POST /api/campaign/launch` - Launch campaign
- `GET /api/campaign/status` - Get campaign status

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

Md Athik - www.mohdathik@gmail.com
Project Link: https://github.com/mdathik07/AI-POWERED-GOOGLE-ADS-CAMPAIGN-AUTOMATION-PLATFORM 