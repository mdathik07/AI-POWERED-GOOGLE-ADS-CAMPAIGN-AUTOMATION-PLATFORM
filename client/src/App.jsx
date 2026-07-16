import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import ChatPage from './pages/ChatPage.jsx';
import CampaignPage from './pages/CampaignPage.jsx';
import SuccessPage from './pages/SuccessPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import { isLoggedIn } from './auth.js';

function Protected({ children }) {
  const location = useLocation();
  if (!isLoggedIn()) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return children;
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/chat" element={<Protected><ChatPage /></Protected>} />
        <Route path="/campaign" element={<Protected><CampaignPage /></Protected>} />
        <Route path="/success" element={<Protected><SuccessPage /></Protected>} />
        <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
