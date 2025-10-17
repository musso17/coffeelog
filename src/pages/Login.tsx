import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { supabase } from '../lib/supabaseClient';

const Login = () => {
  const navigate = useNavigate();
  const { user, signInWithPassword, signUpWithPassword, signInWithMagicLink, loading } =
    useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingLink, setIsSendingLink] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const { error } = await signInWithPassword({ email, password });
        if (error) {
          if (error.message?.toLowerCase().includes('not confirmed')) {
            await supabase.auth.resend({ type: 'signup', email });
            toast({
              title: 'Confirma tu correo',
              description: 'Te enviamos un nuevo enlace de verificación. Revisa tu bandeja y vuelve a iniciar sesión.',
              variant: 'info',
            });
            return;
          }
          throw error;
        }
        toast({
          title: 'Bienvenido',
          description: 'Sesión iniciada correctamente.',
          variant: 'success',
        });
      } else {
        const { error } = await signUpWithPassword({ email, password });
        if (error) {
          throw error;
        }
        toast({
          title: 'Confirma tu correo',
          description: 'Revisa tu bandeja de entrada para validar la cuenta.',
          variant: 'info',
        });
      }
      navigate('/');
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error de autenticación',
        description: error instanceof Error ? error.message : 'Revisa tus datos e inténtalo nuevamente.',
        variant: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      toast({
        title: 'Ingresa un email',
        description: 'Necesitamos tu correo para enviarte el enlace mágico.',
        variant: 'info',
      });
      return;
    }
    setIsSendingLink(true);
    try {
      const { error } = await signInWithMagicLink({ email });
      if (error) throw error;
      toast({
        title: 'Revisa tu correo',
        description: 'Te enviamos un enlace mágico para acceder.',
        variant: 'success',
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'No pudimos enviar el enlace',
        description:
          error instanceof Error ? error.message : 'Intenta nuevamente en unos segundos.',
        variant: 'error',
      });
    } finally {
      setIsSendingLink(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <h1 className="text-2xl font-semibold text-slate-900">Cafe Log</h1>
        <p className="mt-1 text-sm text-slate-500">
          Administra tus cafés, recetas y brews en un solo lugar.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              required={mode === 'register' || mode === 'login'}
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || loading}
            className="flex w-full items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700 disabled:opacity-70"
          >
            {isSubmitting ? 'Procesando...' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </button>
        </form>

        <div className="mt-6 space-y-3">
          <p className="text-center text-xs uppercase tracking-wide text-slate-400">o</p>
          <button
            type="button"
            onClick={handleMagicLink}
            disabled={isSendingLink}
            className="w-full rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-70"
          >
            {isSendingLink ? 'Enviando...' : 'Recibir enlace mágico'}
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-slate-600">
          {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
          <button
            type="button"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="font-semibold text-primary-600 hover:text-primary-700"
          >
            {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
          </button>
        </p>

        <p className="mt-4 text-center text-xs text-slate-400">
          <Link to="https://supabase.com/auth" target="_blank" rel="noreferrer">
            Seguridad por Supabase Auth
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
