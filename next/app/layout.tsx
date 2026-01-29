import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Promethean AI',
  description: 'AI Agent Management Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased bg-white dark:bg-[#0d0618] text-gray-900 dark:text-white transition-colors">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
