'use client';

import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { ToastProvider } from '@/hooks/use-toast';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    function onVisibilityChange() {
      focusManager.setFocused(!document.hidden);
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
