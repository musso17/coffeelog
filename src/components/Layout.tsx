import { Outlet } from 'react-router-dom';
import { Topbar } from './Topbar';

export const Layout = () => (
  <div className="min-h-screen bg-surface-900 text-slate-100">
    <Topbar />
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 pb-12 pt-8">
      <Outlet />
    </main>
  </div>
);

export default Layout;
