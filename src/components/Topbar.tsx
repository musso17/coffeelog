'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';

export const Topbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  const navItems = [
    { href: '/', label: 'Diario', exact: true },
    { href: '/recipes', label: 'Recetas' },
    { href: '/analytics', label: 'Analytics' },
  ];

  return (
    <header className="border-b border-surface-700/80 bg-surface-900/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-6">
          <Link href="/" className="group flex items-center gap-2">
            <span className="rounded-full bg-primary-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary-300 group-hover:bg-primary-500/30">
              Cafe
            </span>
            <span className="text-xl font-semibold tracking-wide text-slate-100 group-hover:text-white">
              Log
            </span>
          </Link>
          <nav className="hidden items-center gap-4 text-sm font-medium text-muted-400 md:flex">
            {navItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    'rounded-full px-4 py-2 transition',
                    isActive
                      ? 'bg-primary-500/20 text-primary-200 shadow-[0_0_0_1px_rgba(18,200,119,0.35)]'
                      : 'text-muted-400 hover:text-slate-100',
                  ].join(' ')}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-muted-400 sm:block">
            {user?.user_metadata?.name || user?.email || 'Usuario'}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full border border-primary-500/40 px-4 py-2 text-sm font-medium text-primary-200 transition hover:border-primary-400 hover:text-white"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};
