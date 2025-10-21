'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import FormField from '@/components/FormField';
import { Slider } from '@/components/Slider';
import { TagInput } from '@/components/TagInput';
import { costPerCup } from '@/lib/calc';
import { supabase } from '@/lib/supabaseClient';
import type { Brew, Coffee, Recipe, SensoryNote } from '@/lib/types';
import { useSupabaseQuery, useQueryClient } from '@/hooks/useQuery';
import { useToast } from '@/hooks/useToast';

interface BrewDetail {
  brew: Brew | null;
  note: SensoryNote | null;
}

type CoffeeOption = Pick<
  Coffee,
  'id' | 'display_name' | 'purchase_price' | 'bag_weight_g' | 'currency'
>;
type RecipeOption = Pick<
  Recipe,
  'id' | 'method' | 'dose_g' | 'water_g' | 'ratio' | 'temp_c' | 'total_time_sec'
>;

const methodOptions = [
  { value: 'espresso', label: 'Espresso' },
  { value: 'v60', label: 'V60' },
  { value: 'origami', label: 'Origami' },
  { value: 'aeropress', label: 'Aeropress' },
  { value: 'frenchpress', label: 'French Press' },
  { value: 'moka', label: 'Moka' },
  { value: 'other', label: 'Otro' },
] as const;

const fetchCoffees = async (): Promise<CoffeeOption[]> => {
  const { data, error } = await supabase
    .from('coffees')
    .select('id, display_name, purchase_price, bag_weight_g, currency')
    .order('display_name');
  if (error) throw error;
  return data ?? [];
};

const fetchRecipes = async (): Promise<RecipeOption[]> => {
  const { data, error } = await supabase
    .from('recipes')
    .select('id, method, dose_g, water_g, ratio, temp_c, total_time_sec')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
};

const fetchBrewDetail = async (id: string): Promise<BrewDetail> => {
  const [{ data: brew, error: brewError }, { data: notes, error: noteError }] = await Promise.all([
    supabase.from('brews').select('*').eq('id', id).maybeSingle(),
    supabase.from('sensory_notes').select('*').eq('brew_id', id).maybeSingle(),
  ]);

  if (brewError) throw brewError;
  if (noteError && noteError.code !== 'PGRST116') {
    // ignoramos "no rows" pero reportamos otros errores
    throw noteError;
  }

  return {
    brew: (brew as Brew) ?? null,
    note: (notes as SensoryNote) ?? null,
  };
};

const defaultBrewForm: Partial<Brew> = {
  brew_date: new Date().toISOString().slice(0, 16),
  method: 'v60',
  dose_g: undefined,
  water_g: undefined,
  ratio: undefined,
  temp_c: undefined,
  total_time_sec: undefined,
  yield_g: undefined,
  water_profile: '',
  tds: undefined,
  extraction_yield: undefined,
  location: '',
  cost_per_cup: undefined,
  notes: '',
};

const BrewForm = () => {
  const params = useParams<{ id?: string }>();
  const id = params?.id;
  const isEditing = Boolean(id);
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: coffees = [] } = useSupabaseQuery(['brews', 'coffees'], fetchCoffees);
  const { data: recipes = [] } = useSupabaseQuery(['brews', 'recipes'], fetchRecipes);
  const { data: detail, isLoading } = useSupabaseQuery(
    ['brew', id],
    () => fetchBrewDetail(id as string),
    { enabled: isEditing },
  );

  const [brewForm, setBrewForm] = useState<Partial<Brew>>(defaultBrewForm);
  const [coffeeSearch, setCoffeeSearch] = useState('');
  const [recipeSearch, setRecipeSearch] = useState('');
  const [scoreTotal, setScoreTotal] = useState<number | null>(null);
  const [scaAcidity, setScaAcidity] = useState(5);
  const [scaBody, setScaBody] = useState(5);
  const [scaSweetness, setScaSweetness] = useState(5);
  const [descriptors, setDescriptors] = useState<string[]>([]);
  const [wouldRepeat, setWouldRepeat] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (detail?.brew) {
      const brew = detail.brew;
      setBrewForm({
        ...brew,
        brew_date: brew.brew_date
          ? new Date(brew.brew_date).toISOString().slice(0, 16)
          : defaultBrewForm.brew_date,
      });

      const coffee = coffees.find((item) => item.id === brew.coffee_id);
      if (coffee) {
        setCoffeeSearch(coffee.display_name);
      }
      if (brew.recipe_id) {
        const recipe = recipes.find((item) => item.id === brew.recipe_id);
        if (recipe) {
          setRecipeSearch(`${recipe.method?.toUpperCase()} • ${recipe.id.slice(0, 6)}`);
        }
      }
    }
  }, [detail?.brew, coffees, recipes]);

  useEffect(() => {
    if (detail?.note) {
      const note = detail.note;
      setScoreTotal(note.score_total ?? null);

      const breakdown = note.sca_breakdown || {};
      setScaAcidity(Number(breakdown.acidez ?? 5));
      setScaBody(Number(breakdown.cuerpo ?? 5));
      setScaSweetness(Number(breakdown.dulzor ?? 5));
      setDescriptors(note.descriptors ?? []);
      setWouldRepeat(Boolean(note.would_repeat));
    }
  }, [detail?.note]);

  const selectedCoffee = useMemo(
    () => coffees.find((coffee) => coffee.id === brewForm.coffee_id),
    [coffees, brewForm.coffee_id],
  );

  const selectedRecipe = useMemo(
    () => recipes.find((recipe) => recipe.id === brewForm.recipe_id),
    [recipes, brewForm.recipe_id],
  );

  useEffect(() => {
    if (selectedRecipe) {
      setBrewForm((prev) => ({
        ...prev,
        method: selectedRecipe.method ?? prev.method ?? 'v60',
        dose_g: selectedRecipe.dose_g ?? prev.dose_g,
        water_g: selectedRecipe.water_g ?? prev.water_g,
        ratio: selectedRecipe.ratio ?? prev.ratio,
        temp_c: selectedRecipe.temp_c ?? prev.temp_c,
        total_time_sec: selectedRecipe.total_time_sec ?? prev.total_time_sec,
      }));
    }
  }, [selectedRecipe]);

  const computedCost = useMemo(() => {
    if (!selectedCoffee) return null;
    const purchasePrice = selectedCoffee.purchase_price
      ? Number(selectedCoffee.purchase_price)
      : null;
    const bagWeight = selectedCoffee.bag_weight_g ? Number(selectedCoffee.bag_weight_g) : null;
    const dose = brewForm.dose_g
      ? Number(brewForm.dose_g)
      : selectedRecipe?.dose_g
        ? Number(selectedRecipe.dose_g)
        : null;

    if (!purchasePrice || !bagWeight || !dose) return null;
    return costPerCup(purchasePrice, bagWeight, dose);
  }, [selectedCoffee, brewForm.dose_g, selectedRecipe?.dose_g]);

  const handleInputChange = (
    field: keyof Brew,
    value: string | number | boolean | null | undefined,
  ) => {
    setBrewForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCoffeeSelect = (value: string) => {
    setCoffeeSearch(value);
    const match = coffees.find(
      (coffee) => coffee.display_name.toLowerCase() === value.toLowerCase(),
    );
    if (match) {
      setBrewForm((prev) => ({
        ...prev,
        coffee_id: match.id,
      }));
    }
  };

  const handleRecipeSelect = (value: string) => {
    setRecipeSearch(value);
    const match = recipes.find((recipe) => {
      const label = `${recipe.method?.toUpperCase() ?? ''} • ${recipe.id.slice(0, 6)}`;
      return label.toLowerCase() === value.toLowerCase();
    });
    if (match) {
      setBrewForm((prev) => ({
        ...prev,
        recipe_id: match.id,
      }));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!brewForm.coffee_id) {
      toast({
        title: 'Selecciona un coffee',
        description: 'Necesitas elegir el coffee que usaste en el brew.',
        variant: 'error',
      });
      return;
    }

    setSaving(true);

    const costValue =
      brewForm.cost_per_cup !== undefined && brewForm.cost_per_cup !== null
        ? Number(brewForm.cost_per_cup)
        : computedCost;

    const payload = {
      coffee_id: brewForm.coffee_id,
      recipe_id: brewForm.recipe_id ?? null,
      brew_date: brewForm.brew_date ? new Date(brewForm.brew_date).toISOString() : new Date().toISOString(),
      method: brewForm.method ?? 'v60',
      dose_g:
        brewForm.dose_g !== undefined && brewForm.dose_g !== null
          ? Number(brewForm.dose_g)
          : selectedRecipe?.dose_g ?? null,
      water_g:
        brewForm.water_g !== undefined && brewForm.water_g !== null
          ? Number(brewForm.water_g)
          : selectedRecipe?.water_g ?? null,
      ratio:
        brewForm.ratio !== undefined && brewForm.ratio !== null
          ? Number(brewForm.ratio)
          : selectedRecipe?.ratio ?? null,
      temp_c:
        brewForm.temp_c !== undefined && brewForm.temp_c !== null
          ? Number(brewForm.temp_c)
          : selectedRecipe?.temp_c ?? null,
      total_time_sec:
        brewForm.total_time_sec !== undefined && brewForm.total_time_sec !== null
          ? Number(brewForm.total_time_sec)
          : selectedRecipe?.total_time_sec ?? null,
      yield_g:
        brewForm.yield_g !== undefined && brewForm.yield_g !== null
          ? Number(brewForm.yield_g)
          : null,
      water_profile: brewForm.water_profile?.toString().trim() || null,
      tds:
        brewForm.tds !== undefined && brewForm.tds !== null ? Number(brewForm.tds) : null,
      extraction_yield:
        brewForm.extraction_yield !== undefined && brewForm.extraction_yield !== null
          ? Number(brewForm.extraction_yield)
          : null,
      location: brewForm.location?.toString().trim() || null,
      cost_per_cup: costValue ?? null,
      notes: brewForm.notes?.toString().trim() || null,
    };

    const notePayload = scoreTotal
      ? {
          score_total: Number(scoreTotal),
          sca_breakdown: {
            acidez: scaAcidity,
            cuerpo: scaBody,
            dulzor: scaSweetness,
          },
          descriptors: descriptors.length ? descriptors : null,
          would_repeat: wouldRepeat,
        }
      : null;

    try {
      let brewId = id ?? null;
      if (isEditing && id) {
        const { error } = await supabase.from('brews').update(payload).eq('id', id);
        if (error) throw error;
        brewId = id;
      } else {
        const { data, error } = await supabase.from('brews').insert([payload]).select().single();
        if (error) throw error;
        brewId = data.id;
      }

      if (notePayload && brewId) {
        const existingNote = detail?.note;
        if (existingNote) {
          const { error } = await supabase
            .from('sensory_notes')
            .update(notePayload)
            .eq('brew_id', brewId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('sensory_notes')
            .insert([{ brew_id: brewId, ...notePayload }]);
          if (error) throw error;
        }
      }

      toast({
        title: isEditing ? 'Brew actualizado' : 'Brew creado',
        description: computedCost
          ? `Costo por taza: ${computedCost} ${selectedCoffee?.currency ?? 'PEN'}`
          : undefined,
        variant: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['brews'] });
      router.push('/brews');
    } catch (error) {
      console.error(error);
      toast({
        title: 'No pudimos guardar el brew',
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
        Cargando información del brew...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            {isEditing ? 'Editar brew' : 'Nuevo brew'}
          </h2>
          <p className="text-sm text-slate-600">
            Registra los detalles y notas sensoriales para seguir mejorando tus extracciones.
          </p>
        </div>
        <Link
          href="/brews"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
        >
          Cancelar
        </Link>
      </div>

      <form
        className="grid gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField htmlFor="coffee-search" label="Coffee" required>
            <>
              <input
                id="coffee-search"
                list="coffee-options"
                value={coffeeSearch}
                onChange={(event) => handleCoffeeSelect(event.target.value)}
                onBlur={(event) => handleCoffeeSelect(event.target.value)}
                placeholder="Busca tu coffee"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
              <datalist id="coffee-options">
                {coffees.map((coffee) => (
                  <option key={coffee.id} value={coffee.display_name} />
                ))}
              </datalist>
            </>
          </FormField>

          <FormField htmlFor="recipe-search" label="Recipe (opcional)">
            <>
              <input
                id="recipe-search"
                list="recipe-options"
                value={recipeSearch}
                onChange={(event) => handleRecipeSelect(event.target.value)}
                onBlur={(event) => handleRecipeSelect(event.target.value)}
                placeholder="Busca por método"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
              <datalist id="recipe-options">
                {recipes.map((recipe) => (
                  <option
                    key={recipe.id}
                    value={`${recipe.method?.toUpperCase() ?? ''} • ${recipe.id.slice(0, 6)}`}
                  />
                ))}
              </datalist>
            </>
          </FormField>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <FormField label="Fecha del brew" htmlFor="brew_date">
            <input
              id="brew_date"
              type="datetime-local"
              value={brewForm.brew_date || ''}
              onChange={(event) => handleInputChange('brew_date', event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </FormField>

          <FormField label="Método" htmlFor="method">
            <select
              id="method"
              value={brewForm.method || 'v60'}
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

          <FormField label="Ubicación" htmlFor="location">
            <input
              id="location"
              value={brewForm.location ?? ''}
              onChange={(event) => handleInputChange('location', event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </FormField>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Dosis (g)" htmlFor="dose_g">
            <input
              id="dose_g"
              type="number"
              inputMode="decimal"
              value={brewForm.dose_g ?? ''}
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
              value={brewForm.water_g ?? ''}
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
              value={brewForm.ratio ?? ''}
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
              value={brewForm.temp_c ?? ''}
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
              value={brewForm.total_time_sec ?? ''}
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

        <div className="grid gap-4 md:grid-cols-3">
          <FormField label="Yield (g)" htmlFor="yield_g">
            <input
              id="yield_g"
              type="number"
              inputMode="decimal"
              value={brewForm.yield_g ?? ''}
              onChange={(event) =>
                handleInputChange('yield_g', event.target.value ? Number(event.target.value) : null)
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </FormField>
          <FormField label="Perfil de agua" htmlFor="water_profile">
            <input
              id="water_profile"
              value={brewForm.water_profile ?? ''}
              onChange={(event) => handleInputChange('water_profile', event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </FormField>
          <FormField label="TDS" htmlFor="tds">
            <input
              id="tds"
              type="number"
              inputMode="decimal"
              step="0.01"
              value={brewForm.tds ?? ''}
              onChange={(event) =>
                handleInputChange('tds', event.target.value ? Number(event.target.value) : null)
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </FormField>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Extraction Yield (%)" htmlFor="extraction_yield">
            <input
              id="extraction_yield"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={brewForm.extraction_yield ?? ''}
              onChange={(event) =>
                handleInputChange(
                  'extraction_yield',
                  event.target.value ? Number(event.target.value) : null,
                )
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </FormField>

          <FormField label="Costo por taza" htmlFor="cost_per_cup">
            <div className="flex gap-3">
              <input
                id="cost_per_cup"
                type="number"
                inputMode="decimal"
                step="0.01"
                value={brewForm.cost_per_cup ?? ''}
                onChange={(event) =>
                  handleInputChange(
                    'cost_per_cup',
                    event.target.value ? Number(event.target.value) : null,
                  )
                }
                placeholder={
                  computedCost
                    ? `Sugerido: ${computedCost} ${selectedCoffee?.currency ?? 'PEN'}`
                    : 'Ingresa un valor'
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
              {computedCost ? (
                <button
                  type="button"
                  onClick={() => handleInputChange('cost_per_cup', computedCost)}
                  className="shrink-0 rounded-md border border-primary-200 px-3 py-2 text-xs font-medium text-primary-700 transition hover:bg-primary-50"
                >
                  Usar sugerido
                </button>
              ) : null}
            </div>
          </FormField>
        </div>

        <FormField
          label="Notas"
          htmlFor="notes"
          description="Describe hallazgos, ajustes pendientes o comentarios rápidos."
        >
          <textarea
            id="notes"
            value={brewForm.notes ?? ''}
            onChange={(event) => handleInputChange('notes', event.target.value)}
            rows={4}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
          />
        </FormField>

        <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Notas sensoriales</h3>
            <p className="text-xs text-slate-500">
              Ajusta los sliders para registrar rápidamente la percepción de cada taza.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Slider
              label="Acidez"
              value={scaAcidity}
              min={0}
              max={10}
              step={1}
              onChange={(event) => setScaAcidity(Number(event.target.value))}
            />
            <Slider
              label="Cuerpo"
              value={scaBody}
              min={0}
              max={10}
              step={1}
              onChange={(event) => setScaBody(Number(event.target.value))}
            />
            <Slider
              label="Dulzor"
              value={scaSweetness}
              min={0}
              max={10}
              step={1}
              onChange={(event) => setScaSweetness(Number(event.target.value))}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Score total (0-100)" htmlFor="score_total">
              <input
                id="score_total"
                type="number"
                inputMode="decimal"
                value={scoreTotal ?? ''}
                onChange={(event) =>
                  setScoreTotal(event.target.value ? Number(event.target.value) : null)
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
            </FormField>
            <FormField
              label="Descriptores"
              htmlFor="descriptors"
              description="Añade notas de cata o sensaciones clave."
            >
              <TagInput values={descriptors} onChange={setDescriptors} />
            </FormField>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-700">¿Repetirías este brew?</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setWouldRepeat(true)}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                  wouldRepeat === true
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Sí
              </button>
              <button
                type="button"
                onClick={() => setWouldRepeat(false)}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                  wouldRepeat === false
                    ? 'bg-rose-100 text-rose-700'
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                No
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link
            href="/brews"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700 disabled:opacity-70"
          >
            {saving ? 'Guardando...' : 'Guardar brew'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BrewForm;
