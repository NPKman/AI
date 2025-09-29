'use client';

import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';

export function Toaster() {
  const { toasts, dismiss } = useToast();
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    setRendered(true);
  }, []);

  if (!rendered) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={cn(
            'pointer-events-auto flex w-full max-w-md items-start justify-between rounded-md border bg-background p-4 shadow-lg',
            toast.intent === 'success' && 'border-green-500/60 bg-green-50 text-green-900',
            toast.intent === 'error' && 'border-red-500/60 bg-red-50 text-red-900',
            toast.intent === 'info' && 'border-sky-500/60 bg-sky-50 text-sky-900'
          )}
        >
          <div>
            <p className="text-sm font-semibold">{toast.title}</p>
            {toast.description ? <p className="text-sm opacity-80">{toast.description}</p> : null}
          </div>
          <button
            onClick={() => dismiss(toast.id)}
            className="ml-4 text-xs font-medium uppercase text-muted-foreground transition hover:text-foreground"
          >
            ปิด
          </button>
        </div>
      ))}
    </div>
  );
}
