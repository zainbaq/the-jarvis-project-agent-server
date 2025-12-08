// Common types used across the app

export interface HealthResponse {
  status: string;
  version: string;
  agents_loaded: number;
  uptime: number;
}

export interface ErrorResponse {
  error: string;
  detail?: string;
}

export interface APIError extends Error {
  status?: number;
  detail?: string;
}
