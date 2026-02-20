import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

// Attach token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('balance_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Check if the request was for login or register
    const url = err.config?.url || '';
    const isAuthRequest = url.includes('login') || url.includes('register');

    if (err.response?.status === 401 && !isAuthRequest) {
      localStorage.removeItem('balance_token');
      localStorage.removeItem('balance_user');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export default api;
