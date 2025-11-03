import axios, { type InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const DEFAULT_API_BASE = 'http://3.37.114.206:8080';

const resolveApiBase = () => {
  const extra = Constants?.expoConfig?.extra ?? Constants?.manifest?.extra ?? {};

  if (typeof extra?.apiBaseUrl === 'string' && extra.apiBaseUrl.trim().length > 0) {
    return extra.apiBaseUrl;
  }

  if (typeof process !== 'undefined' && process.env?.API_BASE_URL) {
    return process.env.API_BASE_URL;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const Config = require('react-native-config').default || require('react-native-config');
    if (Config && Config.API_BASE_URL) {
      return Config.API_BASE_URL;
    }
  } catch (e) {
    // react-native-config not installed — ignore
  }

  return DEFAULT_API_BASE;
};

const API_BASE = resolveApiBase();

try {
  // eslint-disable-next-line no-console
  console.log('[api] using API_BASE =', API_BASE);
} catch (e) {}

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach access token from AsyncStorage if present
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  try {
    const token = await AsyncStorage.getItem('accessToken');
    if (token && config.headers) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - axios headers typing here is flexible for RN setup
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      // helpful debug: warn when no token is present so we can trace 401s during development
      try {
        // eslint-disable-next-line no-console
        console.warn('[api] no accessToken found in AsyncStorage — requests will be unauthenticated');
      } catch (ee) {}
    }
  } catch (e) {
    // ignore
  }
  return config;
});

export default api;
