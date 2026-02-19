import { Outlet } from 'react-router-dom';
import { TabBar } from '@/components/layout/TabBar.tsx';
import { Sidebar } from '@/components/layout/Sidebar.tsx';
import { useTheme } from '@/hooks/useTheme.ts';

export function AppShell() {
  // Initialize theme from localStorage on app load
  useTheme();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar: visible on lg+ (≥1024px) */}
      <Sidebar />

      {/* Main content area */}
      <main className="flex-1 w-full pb-[calc(49px+env(safe-area-inset-bottom))] lg:pb-0">
        <Outlet />
      </main>

      {/* Tab bar: visible below lg */}
      <TabBar />
    </div>
  );
}
