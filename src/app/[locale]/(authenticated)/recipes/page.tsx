'use client';

import { useMemo, useState } from 'react';

import { useSupabaseMutation, useSupabaseQuery, useQueryClient } from '@/hooks/useQuery';
import { useToast } from '@/hooks/useToast';
import { Link } from '@/i18n/navigation';
import { supabase } from '@/lib/supabaseClient';
import type { Recipe } from '@/lib/types';

const fetchRecipes = async (): Promise<Recipe[]> => {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
};

const methodLabels: Record<string, string> = {
  espresso: 'Espresso',
  v60: 'V60',
  origami: 'Origami',
  aeropress: 'Aeropress',
  frenchpress: 'French Press',
  moka: 'Moka',
  other: 'Otro',
};

const Recipes = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [methodFilter, setMethodFilter] = useState('');

  const { data: recipes = [], isLoading, error } = useSupabaseQuery(['recipes'], fetchRecipes);

  const deleteMutation = useSupabaseMutation({
    mutationFn: async (id: string) => {
      const { error: deleteError } = await supabase.from('recipes').delete().eq('id', id);
      if (deleteError) throw deleteError;
      return id;
    },
    onSuccess: () => {
      toast({ title: 'Receta eliminada', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
    onError: (mutationError) =>
      toast({
        title: 'No pudimos eliminar la receta',
        description:
          mutationError instanceof Error ? mutationError.message : 'Intenta nuevamente.',
        variant: 'error',
      }),
  });

  const filtered = useMemo(
    () => (methodFilter ? recipes.filter((recipe) => recipe.method === methodFilter) : recipes),
    [recipes, methodFilter],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Recipes</h2>
          <p className="text-sm text-slate-600">Define parámetros claros para tus métodos favoritos.</p>
        </div>
        <Link
          href="/recipes/new"
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700"
        >
          Nueva Recipe
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="text-sm font-medium text-slate-700">
          Filtrar por método
          <select
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 md:max-w-xs"
            value={methodFilter}
            onChange={(event) => setMethodFilter(event.target.value)}
          >
            <option value="">Todos</option>
            {Object.entries(methodLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500 shadow-sm">
            Cargando recetas...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-600 shadow-sm">
            Hubo un problema al cargar las recetas.
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500 shadow-sm">
            Aún no tienes recetas guardadas.
          </div>
        ) : (
          filtered.map((recipe) => (
            <div key={recipe.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {methodLabels[recipe.method] ?? recipe.method}
                  </h3>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    {new Date(recipe.created_at ?? '').toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={{ pathname: '/recipes/[id]', params: { id: recipe.id } }}
                    className="rounded-md border border-primary-200 px-3 py-1 text-xs font-medium text-primary-700 transition hover:bg-primary-50"
                  >
                    Editar
                  </Link>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(recipe.id)}
                    className="rounded-md border border-rose-200 px-3 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-400">Dosis</dt>
                  <dd>{recipe.dose_g ? `${recipe.dose_g} g` : '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-400">Agua</dt>
                  <dd>{recipe.water_g ? `${recipe.water_g} g` : '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-400">Ratio</dt>
                  <dd>{recipe.ratio ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-400">Temperatura</dt>
                  <dd>{recipe.temp_c ? `${recipe.temp_c} °C` : '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-400">Tiempo total</dt>
                  <dd>{recipe.total_time_sec ? `${recipe.total_time_sec} s` : '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-400">Molino</dt>
                  <dd>{recipe.grinder ?? '—'}</dd>
                </div>
              </dl>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Recipes;
