import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useAuth } from './hooks/useAuth';
import Analytics from './pages/Analytics';
import BrewForm from './pages/BrewForm';
import Brews from './pages/Brews';
import CoffeeForm from './pages/CoffeeForm';
import Coffees from './pages/Coffees';
import Login from './pages/Login';
import RecipeForm from './pages/RecipeForm';
import Recipes from './pages/Recipes';

const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-slate-500">
        Verificando sesión...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route element={<ProtectedRoute />}>
      <Route element={<Layout />}>
        <Route index element={<Coffees />} />
        <Route path="coffees" element={<Coffees />} />
        <Route path="coffees/new" element={<CoffeeForm />} />
        <Route path="coffees/:id" element={<CoffeeForm />} />
        <Route path="recipes" element={<Recipes />} />
        <Route path="recipes/new" element={<RecipeForm />} />
        <Route path="recipes/:id" element={<RecipeForm />} />
        <Route path="brews" element={<Brews />} />
        <Route path="brews/new" element={<BrewForm />} />
        <Route path="brews/:id" element={<BrewForm />} />
        <Route path="analytics" element={<Analytics />} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);
