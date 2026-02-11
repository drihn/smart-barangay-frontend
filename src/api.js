import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://ml-backend-8sz5.onrender.com';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;