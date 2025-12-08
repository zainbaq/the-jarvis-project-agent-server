// API Client - like creating a requests session in Python
// import requests; session = requests.Session()

import axios, { AxiosError } from 'axios';
import { API_BASE_URL } from '../lib/constants';
import type { APIError } from '../types/common';

// Create axios instance (like requests.Session())
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 seconds for long workflows
  maxRedirects: 5, // Follow redirects automatically
});

// Request interceptor - runs before each request
apiClient.interceptors.request.use(
  (config) => {
    // Add request metadata for timing
    config.metadata = { startTime: new Date() };
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - runs after each response
apiClient.interceptors.response.use(
  (response) => {
    // Calculate request duration
    const endTime = new Date();
    const duration = endTime.getTime() - (response.config.metadata?.startTime?.getTime() || 0);
    console.log(`[API] ${response.config.method?.toUpperCase()} ${response.config.url} - ${duration}ms`);
    return response;
  },
  (error: AxiosError<{ error?: string; detail?: string }>) => {
    // Handle errors globally
    const apiError: APIError = new Error(
      error.response?.data?.error || error.message
    ) as APIError;
    apiError.status = error.response?.status;
    apiError.detail = error.response?.data?.detail;

    console.error('[API Error]', {
      url: error.config?.url,
      status: error.response?.status,
      message: apiError.message,
    });

    return Promise.reject(apiError);
  }
);

// TypeScript declaration merging for metadata
declare module 'axios' {
  export interface AxiosRequestConfig {
    metadata?: {
      startTime?: Date;
    };
  }
}
