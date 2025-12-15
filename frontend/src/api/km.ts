// Knowledge Management API functions

import { apiClient } from './client';
import type {
  KMConnection,
  KMConnectionCreate,
  KMConnectionUpdate,
  KMSelectionUpdate,
  KMTestResult,
  KMStatus
} from '../types/km';

// GET /api/km/connections - List all KM connections
export async function listConnections(): Promise<KMConnection[]> {
  const response = await apiClient.get<KMConnection[]>('/api/km/connections');
  return response.data;
}

// POST /api/km/connections - Create a new KM connection
export async function createConnection(
  data: KMConnectionCreate
): Promise<KMConnection> {
  const response = await apiClient.post<KMConnection>('/api/km/connections', data);
  return response.data;
}

// GET /api/km/connections/{id} - Get a specific connection
export async function getConnection(connectionId: string): Promise<KMConnection> {
  const response = await apiClient.get<KMConnection>(
    `/api/km/connections/${connectionId}`
  );
  return response.data;
}

// PUT /api/km/connections/{id} - Update a connection
export async function updateConnection(
  connectionId: string,
  data: KMConnectionUpdate
): Promise<KMConnection> {
  const response = await apiClient.put<KMConnection>(
    `/api/km/connections/${connectionId}`,
    data
  );
  return response.data;
}

// DELETE /api/km/connections/{id} - Delete a connection
export async function deleteConnection(connectionId: string): Promise<void> {
  await apiClient.delete(`/api/km/connections/${connectionId}`);
}

// POST /api/km/connections/{id}/sync - Sync collections from KM server
export async function syncConnection(connectionId: string): Promise<KMConnection> {
  const response = await apiClient.post<KMConnection>(
    `/api/km/connections/${connectionId}/sync`
  );
  return response.data;
}

// POST /api/km/connections/{id}/test - Test a connection
export async function testConnection(connectionId: string): Promise<KMTestResult> {
  const response = await apiClient.post<KMTestResult>(
    `/api/km/connections/${connectionId}/test`
  );
  return response.data;
}

// PUT /api/km/connections/{id}/selections - Update selected collections/corpuses
export async function updateSelections(
  connectionId: string,
  selections: KMSelectionUpdate
): Promise<KMConnection> {
  const response = await apiClient.put<KMConnection>(
    `/api/km/connections/${connectionId}/selections`,
    selections
  );
  return response.data;
}

// GET /api/km/status - Get KM connector status
export async function getStatus(): Promise<KMStatus> {
  const response = await apiClient.get<KMStatus>('/api/km/status');
  return response.data;
}
