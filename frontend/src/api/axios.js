
//frontend\src\api\axios.js
import axios from 'axios';

const DEFAULT_API_BASE_URL = import.meta.env.PROD
  ? 'https://tenderflow.onrender.com/api'
  : 'http://localhost:5000/api';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for cookies/sessions
  headers: {
    'Content-Type': 'application/json',
  }
});
// Interceptor to attach the JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
