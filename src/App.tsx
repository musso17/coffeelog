import { Suspense } from 'react';
import { AppRoutes } from './router';

const App = () => (
  <Suspense
    fallback={
      <div className="flex h-screen items-center justify-center text-sm text-slate-500">
        Cargando...
      </div>
    }
  >
    <AppRoutes />
  </Suspense>
);

export default App;
