// Knowledge Management connection types

export interface KMCollection {
  name: string;
  files: string[];
  num_chunks: number;
}

export interface KMCorpus {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  category?: string;
  chunk_count: number;
  file_count: number;
  is_public: boolean;
}

export type KMConnectionStatus = 'active' | 'inactive' | 'error';

export interface KMConnection {
  id: string;
  name: string;
  username: string;
  status: KMConnectionStatus;
  collections: KMCollection[];
  corpuses: KMCorpus[];
  selected_collection_names: string[];
  selected_corpus_ids: number[];
  created_at: string;
  updated_at: string;
  last_sync_at?: string;
  last_error?: string;
}

export interface KMConnectionCreate {
  name: string;
  username: string;
  password: string;
}

export interface KMConnectionUpdate {
  name?: string;
  selected_collection_names?: string[];
  selected_corpus_ids?: number[];
  is_active?: boolean;
}

export interface KMSelectionUpdate {
  selected_collection_names: string[];
  selected_corpus_ids: number[];
}

export interface KMTestResult {
  success: boolean;
  message: string;
  collections_count: number;
  corpuses_count: number;
}

export interface KMStatus {
  km_server_url: string;
  total_connections: number;
  active_connections: number;
  connections_with_selections: number;
  is_configured: boolean;
}

// Settings for KM search in chat
export interface KMSearchSettings {
  enabled: boolean;
  activeConnectionIds: string[];
}
