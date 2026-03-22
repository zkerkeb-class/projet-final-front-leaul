import axios from 'axios';
import * as storage from './storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Meme port que le back (src/index.js : process.env.PORT || 4001)
const API_PORT = 4001;

/**
 * IP du PC (Metro) : recalculer a chaque requete pour eviter decalage cache / ancienne IP.
 */
function getDevMachineHost() {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri;
  if (typeof hostUri === 'string' && hostUri.length > 0) {
    const host = hostUri.split(':')[0];
    if (host) return host;
  }
  const dbg =
    Constants.expoGoConfig?.debuggerHost || Constants.manifest?.debuggerHost;
  if (typeof dbg === 'string' && dbg.includes(':')) {
    return dbg.split(':')[0];
  }
  return 'localhost';
}

export function getApiBaseUrl() {
  if (Platform.OS === 'web') {
    return `http://localhost:${API_PORT}`;
  }
  return `http://${getDevMachineHost()}:${API_PORT}`;
}

// Valeur au chargement du module (logs / affichage erreurs)
export const API_BASE_URL = getApiBaseUrl();

if (__DEV__) {
  console.log('[api] API_BASE_URL =', API_BASE_URL);
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000
});

api.interceptors.request.use(
  async (config) => {
    // Toujours aligner sur l IP Expo actuelle (evite 192.168.1.144 vs .110)
    config.baseURL = getApiBaseUrl();
    const token = await storage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
