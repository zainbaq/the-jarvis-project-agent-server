import { TopNav } from '@/components/nav/TopNav';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-grid-pattern relative max-w-full">
      {/* Animated background orbs */}
      <div className="bg-orbs" />

      {/* Top glow - more subtle */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gray-500/5 blur-[120px] pointer-events-none dark:bg-gray-500/5" />

      {/* Fixed TopNav */}
      <div className="flex-shrink-0 sticky top-0 z-50">
        <TopNav />
      </div>

      {/* Main content area - takes remaining height */}
      <main className="flex-1 overflow-hidden relative z-10">{children}</main>
    </div>
  );
}
