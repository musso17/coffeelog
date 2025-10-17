import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const quickLinks = [
  { to: '/coffees', title: 'Tus cafés', description: 'Crea y gestiona tus cafés favoritos.' },
  { to: '/recipes', title: 'Recetas', description: 'Registra métodos y parámetros.' },
  { to: '/brews', title: 'Brews', description: 'Lleva control de tus preparaciones.' },
  { to: '/analytics', title: 'Analytics', description: 'Visualiza métricas y tendencias.' },
];

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">
          Hola {user?.user_metadata?.name || user?.email?.split('@')[0] || 'barista'} ☕️
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Bienvenido a tu registro personal de cafés. Explora tus notas, recetas y brews para
          encontrar la taza perfecta.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {quickLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="rounded-xl border border-slate-200 bg-white/80 px-4 py-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <h3 className="text-lg font-semibold text-slate-800">{link.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{link.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
