import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Inicio' },
  { to: '/coffees', label: 'Coffees' },
  { to: '/recipes', label: 'Recipes' },
  { to: '/brews', label: 'Brews' },
  { to: '/analytics', label: 'Analytics' },
];

export const Sidebar = () => (
  <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-white/90 backdrop-blur lg:block">
    <div className="px-6 py-4">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Navegación
      </p>
    </div>
    <nav className="space-y-1 px-2">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            [
              'block rounded-md px-4 py-2 text-sm font-medium transition',
              isActive
                ? 'bg-primary-100 text-primary-800'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
            ].join(' ')
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  </aside>
);
