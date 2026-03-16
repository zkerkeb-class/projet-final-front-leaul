import axios from 'axios';
import * as storage from './storage';
import { Platform } from 'react-native';

// Update with your local IP if testing on a physical device with Expo Go
const API_BASE_URL = Platform.OS === 'web'
  ? 'http://localhost:4001'
  : 'http://192.168.1.144:4001';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Request interceptor to add JWT to headers
api.interceptors.request.use(
  async (config) => {
    const token = await storage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('Request config:', config);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
