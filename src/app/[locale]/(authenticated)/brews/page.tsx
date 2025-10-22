'use client';

import { useSupabaseMutation, useSupabaseQuery, useQueryClient } from '@/hooks/useQuery';
import { useToast } from '@/hooks/useToast';
import { Link } from '@/i18n/navigation';
import { supabase } from '@/lib/supabaseClient';
import type { Brew } from '@/lib/types';

interface BrewWithMeta extends Brew {
  coffee_name: string;
  recipe_method?: string | null;
  score_total?: number | null;
}

const fetchBrews = async (): Promise<BrewWithMeta[]> => {
  const [brewsRes, coffeesRes, recipesRes, notesRes] = await Promise.all([
    supabase.from('brews').select('*').order('brew_date', { ascending: false }),
    supabase.from('coffees').select('id, display_name'),
    supabase.from('recipes').select('id, method'),
    supabase.from('sensory_notes').select('brew_id, score_total'),
  ]);

  if (brewsRes.error) throw brewsRes.error;
  if (coffeesRes.error) throw coffeesRes.error;
  if (recipesRes.error) throw recipesRes.error;
  if (notesRes.error) throw notesRes.error;

  const coffees = coffeesRes.data ?? [];
  const recipes = recipesRes.data ?? [];
  const notes = notesRes.data ?? [];

  return (
    brewsRes.data?.map((brew) => {
      const coffee = coffees.find((item) => item.id === brew.coffee_id);
      const recipe = recipes.find((item) => item.id === brew.recipe_id);
      const note = notes.find((item) => item.brew_id === brew.id);

      return {
        ...brew,
        coffee_name: coffee?.display_name ?? '—',
        recipe_method: recipe?.method ?? null,
        score_total: note?.score_total ?? null,
      };
    }) ?? []
  );
};

const Brews = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: brews = [], isLoading, error } = useSupabaseQuery(['brews'], fetchBrews);

  const deleteMutation = useSupabaseMutation({
    mutationFn: async (id: string) => {
      const { error: deleteNotesError } = await supabase
        .from('sensory_notes')
        .delete()
        .eq('brew_id', id);
      if (deleteNotesError) throw deleteNotesError;

      const { error: deleteError } = await supabase.from('brews').delete().eq('id', id);
      if (deleteError) throw deleteError;
      return id;
    },
    onSuccess: () => {
      toast({ title: 'Brew eliminado', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['brews'] });
    },
    onError: (mutationError) =>
      toast({
        title: 'No pudimos eliminar el brew',
        description:
          mutationError instanceof Error ? mutationError.message : 'Intenta nuevamente.',
        variant: 'error',
      }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Brews</h2>
          <p className="text-sm text-slate-600">
            Lleva un registro detallado de cada extracción y sus notas sensoriales.
          </p>
        </div>
        <Link
          href="/brews/new"
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700"
        >
          Nuevo Brew
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Fecha
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Coffee
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Método
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Receta
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                Score
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Cargando brews...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-rose-500">
                  Ocurrió un error al cargar tus brews.
                </td>
              </tr>
            ) : brews.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Aún no registras ningún brew.
                </td>
              </tr>
            ) : (
              brews.map((brew) => (
                <tr key={brew.id}>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {brew.brew_date ? new Date(brew.brew_date).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    {brew.coffee_name}
                  </td>
                  <td className="px-4 py-3 text-sm capitalize text-slate-600">{brew.method}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {brew.recipe_method ? brew.recipe_method : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {brew.score_total ? `${brew.score_total}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={{ pathname: '/brews/[id]', params: { id: brew.id } }}
                        className="rounded-md border border-primary-200 px-3 py-1 text-xs font-medium text-primary-700 transition hover:bg-primary-50"
                      >
                        Ver / Editar
                      </Link>
                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate(brew.id)}
                        className="rounded-md border border-rose-200 px-3 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Brews;
