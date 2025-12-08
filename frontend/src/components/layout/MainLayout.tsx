// Main layout wrapper component
// This wraps all pages and provides consistent layout

import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Toaster } from 'react-hot-toast';

export function MainLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Main content area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet /> {/* This renders the child routes */}
      </main>

      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  );
}
