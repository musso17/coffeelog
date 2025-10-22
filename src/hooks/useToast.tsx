'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import type { ReactNode } from 'react';

type ToastVariant = 'success' | 'error' | 'info';

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface Toast extends Omit<ToastOptions, 'duration'> {
  id: string;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (options: ToastOptions) => void;
  dismiss: (id: string) => void;
  clear: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const clear = useCallback(() => setToasts([]), []);

  const toast = useCallback(
    ({ variant = 'info', duration = 4000, ...rest }: ToastOptions) => {
      const id = createId();
      setToasts((current) => [...current, { id, variant, ...rest }]);
      if (duration) {
        window.setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      toasts,
      toast,
      dismiss,
      clear,
    }),
    [toasts, toast, dismiss, clear],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed right-4 top-4 z-50 flex max-w-sm flex-col gap-3">
        {toasts.map(({ id, title, description, variant }) => (
          <div
            key={id}
            className={`pointer-events-auto rounded-lg border px-4 py-3 shadow-lg transition ${
              variant === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : variant === 'error'
                  ? 'border-rose-200 bg-rose-50 text-rose-900'
                  : 'border-slate-200 bg-white text-slate-900'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{title}</p>
                {description ? (
                  <p className="mt-1 text-sm text-slate-700">{description}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="text-sm text-slate-500 hover:text-slate-800"
                onClick={() => dismiss(id)}
                aria-label="Cerrar notificación"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
