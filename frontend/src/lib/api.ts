const API_BASE_URL = import.meta.env.PROD ? '/api' : '/api';

export const apiClient = {
  baseURL: API_BASE_URL,
  request: (endpoint: string) => `${API_BASE_URL}${endpoint}`
};