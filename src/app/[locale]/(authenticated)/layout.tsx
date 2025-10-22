'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { Topbar } from '@/components/Topbar';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from '@/i18n/navigation';

import type { ReactNode } from 'react';

export const dynamic = 'force-dynamic';

const AuthenticatedLayout = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const { user, loading } = useAuth();
  const tCommon = useTranslations('common');

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading || (!user && typeof window !== 'undefined')) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-slate-500">
        {tCommon('verifyingSession')}
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-surface-900 text-slate-100">
      <Topbar />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 pb-12 pt-8">
        {children}
      </main>
    </div>
  );
};

export default AuthenticatedLayout;
