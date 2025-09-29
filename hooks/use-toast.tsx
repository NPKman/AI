'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type ToastIntent = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  title: string;
  description?: string;
  intent?: ToastIntent;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastMessage[];
  dismiss: (id: number) => void;
  push: (toast: Omit<ToastMessage, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let toastCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = ++toastCounter;
    const duration = toast.duration ?? 4000;
    setToasts((current) => [...current, { ...toast, id, duration }]);
    window.setTimeout(() => {
      dismiss(id);
    }, duration);
  }, [dismiss]);

  const value = useMemo(() => ({ toasts, dismiss, push }), [toasts, dismiss, push]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
