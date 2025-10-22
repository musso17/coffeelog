import { redirect } from 'next/navigation';

import { routing } from '@/i18n/routing';

const RootPage = () => {
  const defaultLocale = routing.defaultLocale ?? 'es';
  redirect(`/${defaultLocale}`);
};

export default RootPage;
