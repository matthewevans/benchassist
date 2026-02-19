import { Outlet } from 'react-router-dom';
import { TabBar } from '@/components/layout/TabBar.tsx';
import { Sidebar } from '@/components/layout/Sidebar.tsx';

export function AppShell() {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar: visible on lg+ (≥1024px) */}
      <Sidebar />

      {/* Main content area */}
      <main className="flex-1 max-w-4xl mx-auto w-full pb-[calc(49px+env(safe-area-inset-bottom))] lg:pb-0">
        <Outlet />
      </main>

      {/* Tab bar: visible below lg */}
      <TabBar />
    </div>
  );
}
