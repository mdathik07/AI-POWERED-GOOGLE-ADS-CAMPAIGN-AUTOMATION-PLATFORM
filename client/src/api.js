import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

// Attach the JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, clear the stale session and send the user to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config.url.includes('/api/auth/')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('sessionId');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const auth = {
  signup: (data) => api.post('/api/auth/signup', data),
  login: (data) => api.post('/api/auth/login', data),
};

export const chatbot = {
  send: (message, sessionId) => api.post('/api/chatbot/conversation', { message, sessionId }),
  getSession: (sessionId) => api.get(`/api/chatbot/session/${sessionId}`),
};

export const campaign = {
  generate: (sessionId) => api.post('/api/campaign/generate', { sessionId }),
  launch: (campaignData, campaignId) =>
    api.post('/api/campaign/launch', { campaign: campaignData, campaignId }),
  enable: (campaignId) => api.post('/api/campaign/enable', { campaignId }),
  list: () => api.get('/api/campaign/list'),
};

export default api;
