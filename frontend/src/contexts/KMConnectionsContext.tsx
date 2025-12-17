/**
 * KM Connections Context
 *
 * Provides shared state for Knowledge Base connections across components.
 * This ensures ChatTab and KMDrawer share the same state instance,
 * so updates in KMDrawer are immediately reflected in ChatTab.
 */

import { createContext, useContext, ReactNode } from 'react';
import { useKMConnections } from '../hooks/useKMConnections';

type KMConnectionsContextType = ReturnType<typeof useKMConnections>;

const KMConnectionsContext = createContext<KMConnectionsContextType | null>(null);

export function KMConnectionsProvider({ children }: { children: ReactNode }) {
  const kmConnections = useKMConnections();
  return (
    <KMConnectionsContext.Provider value={kmConnections}>
      {children}
    </KMConnectionsContext.Provider>
  );
}

export function useKMConnectionsContext() {
  const context = useContext(KMConnectionsContext);
  if (!context) {
    throw new Error('useKMConnectionsContext must be used within KMConnectionsProvider');
  }
  return context;
}
