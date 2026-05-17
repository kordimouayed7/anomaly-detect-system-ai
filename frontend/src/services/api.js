import axios from 'axios';

const TOKEN_KEY = 'access_token';

const api = axios.create({
  baseURL: 'http://localhost:8000',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const detail = String(error?.response?.data?.detail || '').toLowerCase();

    if (status === 401 && (detail.includes('invalid') || detail.includes('expired') || detail.includes('not authenticated'))) {
      localStorage.removeItem(TOKEN_KEY);
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }

    return Promise.reject(error);
  },
);

export const login = async (email, password) => {
  const response = await api.post('/api/login', { email, password });
  const token = response?.data?.access_token;

  if (!token) {
    throw new Error('Missing access token in login response.');
  }

  localStorage.setItem(TOKEN_KEY, token);
  return token;
};

export const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
};

export default api;