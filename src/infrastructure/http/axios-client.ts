import axios from 'axios';
import { env } from '../config/env';
import { localTokenStorage } from '../storage/local-token-storage';

export const axiosClient = axios.create({
  baseURL: env.apiUrl,
  headers: { 'Content-Type': 'application/json' },
});

axiosClient.interceptors.request.use((config) => {
  const token = localTokenStorage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const isAuthEndpoint = error.config?.url?.includes('/auth/') ?? false;
      const habiaSesion = localTokenStorage.getToken() !== null;
      if (!isAuthEndpoint && habiaSesion) {
        localTokenStorage.clear();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);
