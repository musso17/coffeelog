'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import FormField from '@/components/FormField';
import { supabase } from '@/lib/supabaseClient';
import type { Recipe } from '@/lib/types';
import { useSupabaseQuery, useQueryClient } from '@/hooks/useQuery';
import { useToast } from '@/hooks/useToast';

const methodOptions = [
  { value: 'espresso', label: 'Espresso' },
  { value: 'v60', label: 'V60' },
  { value: 'origami', label: 'Origami' },
  { value: 'aeropress', label: 'Aeropress' },
  { value: 'frenchpress', label: 'French Press' },
  { value: 'moka', label: 'Moka' },
  { value: 'other', label: 'Otro' },
] as const;

const emptyForm: Partial<Recipe> = {
  method: 'v60',
  dose_g: undefined,
  water_g: undefined,
  ratio: undefined,
  temp_c: undefined,
  grinder: '',
  grind_setting: '',
  total_time_sec: undefined,
  steps: null,
};

const fetchRecipeById = async (id: string) => {
  const { data, error } = await supabase.from('recipes').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Recipe | null;
};

const RecipeForm = () => {
  const params = useParams<{ id?: string }>();
  const id = params?.id;
  const isEditing = Boolean(id);
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: recipe, isLoading } = useSupabaseQuery(
    ['recipe', id],
    () => fetchRecipeById(id as string),
    { enabled: isEditing },
  );

  const [form, setForm] = useState<Partial<Recipe>>(emptyForm);
  const [stepsText, setStepsText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (recipe) {
      setForm({
        ...recipe,
      });
      if (Array.isArray(recipe.steps)) {
        setStepsText(recipe.steps.join('\n'));
      } else if (recipe.steps && typeof recipe.steps === 'object') {
        const maybeSteps = (recipe.steps as { steps?: string[] }).steps;
        if (Array.isArray(maybeSteps)) {
          setStepsText(maybeSteps.join('\n'));
        }
      }
    }
  }, [recipe]);

  const title = useMemo(
    () => (isEditing ? 'Editar recipe' : 'Nueva recipe'),
    [isEditing],
  );

  const handleInputChange = (field: keyof Recipe, value: string | number | null | undefined) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    const steps = stepsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const payload = {
      method: form.method ?? 'v60',
      dose_g: form.dose_g !== undefined && form.dose_g !== null ? Number(form.dose_g) : null,
      water_g: form.water_g !== undefined && form.water_g !== null ? Number(form.water_g) : null,
      ratio: form.ratio !== undefined && form.ratio !== null ? Number(form.ratio) : null,
      temp_c: form.temp_c !== undefined && form.temp_c !== null ? Number(form.temp_c) : null,
      grinder: form.grinder?.trim() || null,
      grind_setting: form.grind_setting?.trim() || null,
      total_time_sec:
        form.total_time_sec !== undefined && form.total_time_sec !== null
          ? Number(form.total_time_sec)
          : null,
      steps: steps.length ? steps : null,
    };

    try {
      if (isEditing && id) {
        const { error } = await supabase.from('recipes').update(payload).eq('id', id);
        if (error) throw error;
        toast({ title: 'Receta actualizada', variant: 'success' });
      } else {
        const { error } = await supabase.from('recipes').insert([payload]);
        if (error) throw error;
        toast({ title: 'Receta creada', variant: 'success' });
      }
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      router.push('/recipes');
    } catch (error) {
      console.error(error);
      toast({
        title: 'No pudimos guardar la receta',
        description:
          error instanceof Error ? error.message : 'Intenta nuevamente en unos segundos.',
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  if (isEditing && isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
        Cargando información de la receta...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-600">
            Define parámetros claros para repetir consistentemente este método.
          </p>
        </div>
        <Link
          href="/recipes"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
        >
          Cancelar
        </Link>
      </div>

      <form
        className="grid gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        onSubmit={handleSubmit}
      >
        <FormField label="Método" htmlFor="method">
          <select
            id="method"
            value={form.method || 'v60'}
            onChange={(event) => handleInputChange('method', event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm capitalize shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
          >
            {methodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Dosis (g)" htmlFor="dose_g">
            <input
              id="dose_g"
              type="number"
              inputMode="decimal"
              value={form.dose_g ?? ''}
              onChange={(event) =>
                handleInputChange('dose_g', event.target.value ? Number(event.target.value) : null)
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </FormField>

          <FormField label="Agua (g)" htmlFor="water_g">
            <input
              id="water_g"
              type="number"
              inputMode="decimal"
              value={form.water_g ?? ''}
              onChange={(event) =>
                handleInputChange('water_g', event.target.value ? Number(event.target.value) : null)
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </FormField>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <FormField label="Ratio" htmlFor="ratio">
            <input
              id="ratio"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={form.ratio ?? ''}
              onChange={(event) =>
                handleInputChange('ratio', event.target.value ? Number(event.target.value) : null)
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </FormField>

          <FormField label="Temperatura (°C)" htmlFor="temp_c">
            <input
              id="temp_c"
              type="number"
              inputMode="decimal"
              value={form.temp_c ?? ''}
              onChange={(event) =>
                handleInputChange('temp_c', event.target.value ? Number(event.target.value) : null)
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </FormField>

          <FormField label="Tiempo total (s)" htmlFor="total_time_sec">
            <input
              id="total_time_sec"
              type="number"
              inputMode="numeric"
              value={form.total_time_sec ?? ''}
              onChange={(event) =>
                handleInputChange(
                  'total_time_sec',
                  event.target.value ? Number(event.target.value) : null,
                )
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </FormField>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Molino" htmlFor="grinder">
            <input
              id="grinder"
              value={form.grinder ?? ''}
              onChange={(event) => handleInputChange('grinder', event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </FormField>

          <FormField label="Ajuste de molienda" htmlFor="grind_setting">
            <input
              id="grind_setting"
              value={form.grind_setting ?? ''}
              onChange={(event) => handleInputChange('grind_setting', event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </FormField>
        </div>

        <FormField
          label="Pasos"
          htmlFor="steps"
          description="Escribe cada paso en una nueva línea para mantener orden en la preparación."
        >
          <textarea
            id="steps"
            value={stepsText}
            onChange={(event) => setStepsText(event.target.value)}
            rows={6}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
          />
        </FormField>

        <div className="flex justify-end gap-3">
          <Link
            href="/recipes"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700 disabled:opacity-70"
          >
            {saving ? 'Guardando...' : 'Guardar recipe'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RecipeForm;
