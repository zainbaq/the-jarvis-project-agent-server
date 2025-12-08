// Main App Component - sets up routing and providers
// Think of this like the main entry point, similar to if __name__ == "__main__" in Python

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MainLayout } from './components/layout/MainLayout';
import { Home } from './pages/Home';
import { AgentsPage } from './pages/AgentsPage';
import { ChatPage } from './pages/ChatPage';

// Create React Query client (handles all API caching)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2, // Retry failed requests 2 times
      staleTime: 5 * 60 * 1000, // Data stays fresh for 5 minutes
      gcTime: 10 * 60 * 1000, // Keep cache for 10 minutes
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
    },
  },
});

function App() {
  return (
    // QueryClientProvider makes React Query available to all components
    <QueryClientProvider client={queryClient}>
      {/* BrowserRouter enables client-side routing */}
      <BrowserRouter>
        <Routes>
          {/* MainLayout wraps all routes - provides Header and structure */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/agents" element={<AgentsPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/chat/:agentId" element={<ChatPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
