'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import { useEffect, useState } from 'react';

import { AuthProvider } from '@/hooks/useAuth';
import { ToastProvider } from '@/hooks/useToast';
import { Locale } from '@/i18n/routing';
import { usePreferenceStore } from '@/state/preferences-store';

import type { AbstractIntlMessages } from 'next-intl';
import type { ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
  locale: Locale;
  messages: AbstractIntlMessages;
}

export const Providers = ({ children, locale, messages }: ProvidersProps) => {
  const [queryClient] = useState(() => new QueryClient());
  const setLocale = usePreferenceStore((state) => state.setLocale);

  useEffect(() => {
    setLocale(locale);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale, setLocale]);

  useEffect(() => {
    if (
      typeof navigator !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((error) => console.error('SW registration failed', error));
    }
  }, []);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </NextIntlClientProvider>
  );
};
