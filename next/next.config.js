/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  },

  // Allow images from external domains if needed
  images: {
    domains: [],
  },

  // Redirect root to /chat
  async redirects() {
    return [
      {
        source: '/',
        destination: '/chat',
        permanent: false,
      },
    ];
  },

  // Proxy API requests to FastAPI backend
  async rewrites() {
    // Use 127.0.0.1 instead of localhost to avoid DNS resolution issues
    const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },

  // Experimental features
  experimental: {
    // Enable server actions - allowedOrigins are dynamically set based on environment
    serverActions: {
      allowedOrigins: [
        process.env.BACKEND_URL ? new URL(process.env.BACKEND_URL).host : '127.0.0.1:8000',
        'localhost:3000',
        '127.0.0.1:3000',
      ].filter(Boolean),
    },
  },
};

module.exports = nextConfig;
