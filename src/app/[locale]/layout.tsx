import { notFound } from 'next/navigation';
import { getMessages, setRequestLocale } from 'next-intl/server';


import { Providers } from '@/app/providers';
import { Locale, routing } from '@/i18n/routing';

import type { ReactNode } from 'react';

interface LocaleLayoutProps {
  children: ReactNode;
  params: { locale: string };
}

export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const LocaleLayout = async ({ children, params }: LocaleLayoutProps) => {
  const locale = params.locale as Locale;

  if (!routing.locales.includes(locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <Providers locale={locale} messages={messages}>
      {children}
    </Providers>
  );
};

export default LocaleLayout;
