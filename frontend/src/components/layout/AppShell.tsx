'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/stores/ui.store';
import Sidebar from './Sidebar';
import CommandPalette from './CommandPalette';
import RouteTransitionOverlay from './RouteTransitionOverlay';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { sidebarExpanded, setSidebarExpanded } = useUIStore();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarExpanded(false);
    }
  }, [setSidebarExpanded]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <CommandPalette />

      <main
        className={cn(
          'relative flex-1 transition-all duration-standard ease-standard',
          sidebarExpanded ? 'lg:ml-[240px]' : 'lg:ml-[60px]'
        )}
      >
        <RouteTransitionOverlay />
        {children}
      </main>
    </div>
  );
}
