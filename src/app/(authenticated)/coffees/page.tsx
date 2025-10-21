'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Brew, Coffee, Recipe, SensoryNote } from '@/lib/types';
import { useSupabaseMutation, useSupabaseQuery, useQueryClient } from '@/hooks/useQuery';
import { useToast } from '@/hooks/useToast';
import { costPerCup } from '@/lib/calc';

const fetchCoffees = async (): Promise<Coffee[]> => {
  const { data, error } = await supabase
    .from('coffees')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
};

type BrewWithNote = Brew & { note?: SensoryNote | null };

const fetchBrewsByCoffee = async (coffeeId: string): Promise<BrewWithNote[]> => {
  const { data: brews, error } = await supabase
    .from('brews')
    .select('*')
    .eq('coffee_id', coffeeId)
    .order('brew_date', { ascending: false })
    .limit(10);

  if (error) throw error;
  if (!brews?.length) return [];

  const { data: notes, error: notesError } = await supabase
    .from('sensory_notes')
    .select('*')
    .in(
      'brew_id',
      brews.map((brew) => brew.id),
    );

  if (notesError) throw notesError;

  const notesMap = new Map<string, SensoryNote>();
  notes?.forEach((note) => {
    notesMap.set(note.brew_id, note);
  });

  return brews.map((brew) => ({
    ...brew,
    note: notesMap.get(brew.id) ?? null,
  }));
};

const fetchRecipes = async (): Promise<Recipe[]> => {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
};

const brewMethods: Array<{ value: Brew['method']; label: string }> = [
  { value: 'espresso', label: 'Espresso' },
  { value: 'v60', label: 'V60' },
  { value: 'origami', label: 'Origami' },
  { value: 'aeropress', label: 'Aeropress' },
  { value: 'frenchpress', label: 'French Press' },
  { value: 'moka', label: 'Moka' },
  { value: 'other', label: 'Otro' },
];

const processLabels: Record<Coffee['process'], string> = {
  washed: 'Lavado',
  natural: 'Natural',
  honey: 'Honey',
  anaerobic: 'Anaeróbico',
  other: 'Otro',
};

const roastLabels: Record<Coffee['roast_level'], string> = {
  light: 'Claro',
  medium: 'Medio',
  dark: 'Oscuro',
};

const humanDate = (value?: string | null, withTime = false) => {
  if (!value) return '—';
  const date = new Date(value);
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date);
};

const emptyCoffeeForm = {
  display_name: '',
  roaster: '',
  process: 'washed' as Coffee['process'],
  roast_level: 'light' as Coffee['roast_level'],
  origin_country: '',
  notes: '',
  purchase_price: '',
  bag_weight_g: '',
};

const emptyBrewForm = {
  brew_date: new Date().toISOString().slice(0, 16),
  method: 'v60' as Brew['method'],
  dose_g: '',
  water_g: '',
  ratio: '',
  temp_c: '',
  notes: '',
  recipe_id: '',
  score_total: '',
  descriptors: [] as string[],
};

const Coffees = () => {
  const [selectedCoffeeId, setSelectedCoffeeId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showCoffeeModal, setShowCoffeeModal] = useState(false);
  const [showBrewModal, setShowBrewModal] = useState(false);
  const [showRecipeShortcut, setShowRecipeShortcut] = useState(false);
  const [coffeeForm, setCoffeeForm] = useState(emptyCoffeeForm);
  const [brewForm, setBrewForm] = useState(emptyBrewForm);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: coffees = [],
    isLoading: loadingCoffees,
    error: coffeesError,
  } = useSupabaseQuery(['coffees'], fetchCoffees);

  useEffect(() => {
    if (!selectedCoffeeId && coffees.length) {
      setSelectedCoffeeId(coffees[0].id);
    }
  }, [coffees, selectedCoffeeId]);

  const selectedCoffee = useMemo(
    () => coffees.find((coffee) => coffee.id === selectedCoffeeId) ?? null,
    [coffees, selectedCoffeeId],
  );

  const {
    data: brews = [],
    isLoading: loadingBrews,
    error: brewsError,
  } = useSupabaseQuery(
    ['coffee-brews', selectedCoffeeId],
    () => fetchBrewsByCoffee(selectedCoffeeId!),
    {
      enabled: Boolean(selectedCoffeeId),
    },
  );

  const {
    data: recipes = [],
    isLoading: loadingRecipes,
    error: recipesError,
  } = useSupabaseQuery(['recipes', 'catalog'], fetchRecipes, {
    enabled: showBrewModal || showRecipeShortcut,
  });

  const createCoffeeMutation = useSupabaseMutation({
    mutationFn: async () => {
      const payload = {
        display_name: coffeeForm.display_name.trim(),
        roaster: coffeeForm.roaster.trim() || null,
        process: coffeeForm.process,
        roast_level: coffeeForm.roast_level,
        origin_country: coffeeForm.origin_country.trim() || null,
        notes: coffeeForm.notes.trim() || null,
        purchase_price: coffeeForm.purchase_price ? Number(coffeeForm.purchase_price) : null,
        bag_weight_g: coffeeForm.bag_weight_g ? Number(coffeeForm.bag_weight_g) : null,
      };

      const { data, error } = await supabase
        .from('coffees')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return data as Coffee;
    },
    onSuccess: (coffee) => {
      setCoffeeForm(emptyCoffeeForm);
      setShowCoffeeModal(false);
      queryClient.invalidateQueries({ queryKey: ['coffees'] });
      setSelectedCoffeeId(coffee.id);
      toast({
        title: 'Coffee registrado',
        description: 'Ahora puedes registrar una extracción o asociar recetas.',
        variant: 'success',
      });
    },
    onError: (error) => {
      toast({
        title: 'No pudimos registrar el coffee',
        description: error instanceof Error ? error.message : 'Intenta nuevamente.',
        variant: 'error',
      });
    },
  });

  const createBrewMutation = useSupabaseMutation({
    mutationFn: async () => {
      if (!selectedCoffee) {
        throw new Error('Selecciona un coffee para registrar el brew.');
      }

      const payload = {
        coffee_id: selectedCoffee.id,
        recipe_id: brewForm.recipe_id || null,
        brew_date: brewForm.brew_date ? new Date(brewForm.brew_date).toISOString() : null,
        method: brewForm.method,
        dose_g: brewForm.dose_g ? Number(brewForm.dose_g) : null,
        water_g: brewForm.water_g ? Number(brewForm.water_g) : null,
        ratio: brewForm.ratio ? Number(brewForm.ratio) : null,
        temp_c: brewForm.temp_c ? Number(brewForm.temp_c) : null,
        notes: brewForm.notes.trim() || null,
        cost_per_cup:
          selectedCoffee.purchase_price && selectedCoffee.bag_weight_g && brewForm.dose_g
            ? costPerCup(
                Number(selectedCoffee.purchase_price),
                Number(selectedCoffee.bag_weight_g),
                Number(brewForm.dose_g),
              )
            : null,
      };

      const { data, error } = await supabase
        .from('brews')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;

      const brew = data as Brew;
      if (brewForm.score_total || brewForm.descriptors.length) {
        const notePayload = {
          brew_id: brew.id,
          score_total: brewForm.score_total ? Number(brewForm.score_total) : null,
          descriptors: brewForm.descriptors.length ? brewForm.descriptors : null,
          sca_breakdown: null,
        };
        const { error: noteError } = await supabase.from('sensory_notes').insert([notePayload]);
        if (noteError) throw noteError;
      }

      return brew;
    },
    onSuccess: () => {
      setBrewForm(emptyBrewForm);
      setShowBrewModal(false);
      queryClient.invalidateQueries({ queryKey: ['coffee-brews', selectedCoffeeId] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      toast({
        title: 'Brew registrado',
        description: 'Tu tasting queda guardado en el diario.',
        variant: 'success',
      });
    },
    onError: (error) => {
      toast({
        title: 'No pudimos registrar el brew',
        description: error instanceof Error ? error.message : 'Intenta nuevamente.',
        variant: 'error',
      });
    },
  });

  const filteredCoffees = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return coffees;
    return coffees.filter(
      (coffee) =>
        coffee.display_name.toLowerCase().includes(term) ||
        coffee.roaster?.toLowerCase().includes(term) ||
        coffee.origin_country?.toLowerCase().includes(term),
    );
  }, [coffees, search]);

  const stats = useMemo(() => {
    if (!brews.length) {
      return {
        cups: 0,
        averageScore: null as number | null,
      };
    }
    const scores = brews
      .map((brew) => Number(brew.note?.score_total ?? 0))
      .filter((value) => value > 0);
    return {
      cups: brews.length,
      averageScore: scores.length
        ? Number((scores.reduce((sum, value) => sum + value, 0) / scores.length).toFixed(1))
        : null,
    };
  }, [brews]);

  const handleCoffeeFormChange = (field: keyof typeof coffeeForm, value: string) => {
    setCoffeeForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleBrewFormChange = (field: keyof typeof brewForm, value: string | string[]) => {
    setBrewForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-6 rounded-3xl border border-surface-700/70 bg-surface-900/60 p-6 shadow-[0_25px_80px_-40px_rgba(18,200,119,0.4)] md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-primary-300/80">Diario</p>
          <h1 className="text-3xl font-semibold text-white md:text-4xl">
            Tu bitácora de cafés especiales
          </h1>
          <p className="max-w-xl text-sm text-muted-400">
            Registra cada café, vincula recetas y documenta brews sin salir de esta vista. Añade
            notas sensoriales y lleva el control del costo por taza con un par de clics.
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => setShowCoffeeModal(true)}
            className="inline-flex items-center gap-2 rounded-full bg-primary-500/90 px-5 py-2 text-sm font-semibold text-surface-900 shadow-lg shadow-primary-500/30 transition hover:bg-primary-500 hover:text-surface-950"
          >
            + Registrar café
          </button>
          <button
            type="button"
            disabled={!selectedCoffee}
            onClick={() => setShowBrewModal(true)}
            className="inline-flex items-center gap-2 rounded-full border border-primary-500/30 px-5 py-2 text-sm font-semibold text-primary-200 transition hover:border-primary-400 hover:text-white disabled:cursor-not-allowed disabled:border-surface-700 disabled:text-muted-400"
          >
            Registrar brew
          </button>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
        <aside className="space-y-4">
          <div className="rounded-2xl border border-surface-700/70 bg-surface-900/80 p-4">
            <label className="flex items-center gap-3 rounded-xl border border-surface-700/80 bg-surface-800 px-3 py-2 text-sm text-muted-300 focus-within:border-primary-500/60 focus-within:text-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-4.35-4.35m0 0A6.5 6.5 0 1 0 9.5 16.5a6.5 6.5 0 0 0 7.15-4.35Z"
                />
              </svg>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Busca por origen, tostador o nombre"
                className="w-full bg-transparent text-sm text-slate-100 placeholder:text-muted-500 focus:outline-none"
              />
            </label>
          </div>

          <div className="space-y-3">
            {loadingCoffees ? (
              <div className="rounded-2xl border border-surface-700/70 bg-surface-900/80 p-6 text-center text-sm text-muted-400">
                Cargando cafés...
              </div>
            ) : coffeesError ? (
              <div className="rounded-2xl border border-rose-500/40 bg-rose-950/30 p-6 text-center text-sm text-rose-200">
                Hubo un problema al cargar los cafés.
              </div>
            ) : filteredCoffees.length === 0 ? (
              <div className="rounded-2xl border border-surface-700/70 bg-surface-900/80 p-6 text-center text-sm text-muted-400">
                No hay cafés que coincidan con tu búsqueda.
              </div>
            ) : (
              filteredCoffees.map((coffee) => {
                const isActive = coffee.id === selectedCoffeeId;
                return (
                  <button
                    key={coffee.id}
                    type="button"
                    onClick={() => setSelectedCoffeeId(coffee.id)}
                    className={`group flex w-full flex-col gap-1 rounded-2xl border px-4 py-4 text-left transition ${
                      isActive
                        ? 'border-primary-500/50 bg-primary-500/10 shadow-[0_0_0_1px_rgba(18,200,119,0.35)]'
                        : 'border-surface-700/70 bg-surface-900/70 hover:border-primary-500/30 hover:bg-primary-500/5'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-white">{coffee.display_name}</h3>
                        <p className="text-xs uppercase tracking-wide text-muted-500">
                          {coffee.roaster || 'Roaster desconocido'}
                        </p>
                      </div>
                      <span className="rounded-full border border-primary-500/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary-200">
                        {processLabels[coffee.process] || coffee.process}
                      </span>
                    </div>
                    <p className="text-xs text-muted-400">
                      {coffee.origin_country || 'Origen por definir'}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="min-h-[560px] rounded-3xl border border-surface-700/70 bg-surface-900/70 p-6">
          {!selectedCoffee ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-400">
              <p className="text-sm">Selecciona un café para ver su ficha y registrar brews.</p>
            </div>
          ) : (
            <div className="flex h-full flex-col gap-6">
              <header className="flex flex-col gap-4 border-b border-surface-700/60 pb-6 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <h2 className="text-2xl font-semibold text-white">{selectedCoffee.display_name}</h2>
                  <p className="text-sm text-muted-400">
                    {selectedCoffee.roaster || 'Roaster desconocido'}{' '}
                    {selectedCoffee.origin_country ? `• ${selectedCoffee.origin_country}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted-400">
                  <span className="rounded-full border border-surface-700 px-3 py-1 text-muted-300">
                    {processLabels[selectedCoffee.process]}
                  </span>
                  <span className="rounded-full border border-surface-700 px-3 py-1 text-muted-300">
                    Tueste {roastLabels[selectedCoffee.roast_level]}
                  </span>
                  {selectedCoffee.roast_date ? (
                    <span className="rounded-full border border-surface-700 px-3 py-1 text-muted-400">
                      Roast {humanDate(selectedCoffee.roast_date)}
                    </span>
                  ) : null}
                </div>
              </header>

              {selectedCoffee.notes ? (
                <p className="rounded-2xl border border-surface-700/60 bg-surface-800/60 px-4 py-3 text-sm text-muted-300">
                  {selectedCoffee.notes}
                </p>
              ) : null}

              <div className="grid gap-4 md:grid-cols-3">
                <article className="rounded-2xl border border-surface-700/60 bg-surface-900/80 px-4 py-4">
                  <p className="text-xs uppercase tracking-wide text-muted-500">Extracciones</p>
                  <p className="mt-2 text-3xl font-medium text-white">{stats.cups}</p>
                  <p className="text-xs text-muted-500">Últimas 10 registradas</p>
                </article>
                <article className="rounded-2xl border border-surface-700/60 bg-surface-900/80 px-4 py-4">
                  <p className="text-xs uppercase tracking-wide text-muted-500">Score promedio</p>
                  <p className="mt-2 text-3xl font-medium text-white">
                    {stats.averageScore ?? '—'}
                  </p>
                  <p className="text-xs text-muted-500">Basado en notas sensoriales</p>
                </article>
                <article className="rounded-2xl border border-surface-700/60 bg-surface-900/80 px-4 py-4">
                  <p className="text-xs uppercase tracking-wide text-muted-500">Costo estimado</p>
                  <p className="mt-2 text-3xl font-medium text-white">
                    {selectedCoffee.purchase_price && selectedCoffee.bag_weight_g
                      ? `S/ ${costPerCup(
                          Number(selectedCoffee.purchase_price),
                          Number(selectedCoffee.bag_weight_g),
                          Number(selectedCoffee.bag_weight_g) / 12,
                        )}`
                      : '—'}
                  </p>
                  <p className="text-xs text-muted-500">Ajusta desde la ficha del brew</p>
                </article>
              </div>

              <div className="flex flex-1 flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Brews recientes</h3>
                    <p className="text-xs uppercase tracking-wide text-muted-500">
                      Últimos registros con este coffee
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowBrewModal(true)}
                    className="rounded-full border border-primary-500/30 px-4 py-2 text-sm font-medium text-primary-200 transition hover:border-primary-400 hover:text-white"
                  >
                    Añadir brew
                  </button>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                  {loadingBrews ? (
                    <div className="rounded-2xl border border-surface-700/60 bg-surface-900/70 p-6 text-center text-sm text-muted-400">
                      Cargando brews...
                    </div>
                  ) : brewsError ? (
                    <div className="rounded-2xl border border-rose-500/40 bg-rose-950/30 p-6 text-center text-sm text-rose-200">
                      No pudimos cargar los brews.
                    </div>
                  ) : brews.length === 0 ? (
                    <div className="rounded-2xl border border-surface-700/60 bg-surface-900/70 p-6 text-center text-sm text-muted-400">
                      Aún no registras una extracción para este coffee.
                    </div>
                  ) : (
                    brews.map((brew) => (
                      <article
                        key={brew.id}
                        className="flex flex-col gap-3 rounded-2xl border border-surface-700/60 bg-surface-900/70 p-4 transition hover:border-primary-500/20"
                      >
                        <header className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-white capitalize">{brew.method}</p>
                            <p className="text-xs text-muted-500">
                              {humanDate(brew.brew_date, true)}
                            </p>
                          </div>
                          {brew.note?.score_total ? (
                            <span className="rounded-full border border-primary-500/40 px-3 py-1 text-xs font-semibold text-primary-200">
                              Score {brew.note.score_total}
                            </span>
                          ) : null}
                        </header>
                        <dl className="grid grid-cols-3 gap-3 text-xs text-muted-400">
                          <div>
                            <dt className="uppercase tracking-wide text-muted-500">Ratio</dt>
                            <dd className="text-white">
                              {brew.ratio ? `${brew.ratio}` : brew.dose_g && brew.water_g ? `${brew.water_g}/${brew.dose_g}` : '—'}
                            </dd>
                          </div>
                          <div>
                            <dt className="uppercase tracking-wide text-muted-500">Dosis</dt>
                            <dd className="text-white">
                              {brew.dose_g ? `${brew.dose_g} g` : '—'}
                            </dd>
                          </div>
                          <div>
                            <dt className="uppercase tracking-wide text-muted-500">Temperatura</dt>
                            <dd className="text-white">
                              {brew.temp_c ? `${brew.temp_c} °C` : '—'}
                            </dd>
                          </div>
                        </dl>
                        {brew.notes ? (
                          <p className="rounded-xl border border-surface-700/60 bg-surface-800/60 px-3 py-2 text-sm text-muted-300">
                            {brew.notes}
                          </p>
                        ) : null}
                        {brew.note?.descriptors ? (
                          <div className="flex flex-wrap gap-2">
                            {brew.note.descriptors.map((descriptor) => (
                              <span
                                key={descriptor}
                                className="rounded-full border border-primary-500/40 bg-primary-500/10 px-3 py-1 text-xs font-medium text-primary-200"
                              >
                                {descriptor}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </article>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {showCoffeeModal ? (
        <Modal title="Registrar nuevo coffee" onClose={() => setShowCoffeeModal(false)}>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!coffeeForm.display_name.trim()) {
                toast({
                  title: 'El nombre es obligatorio',
                  variant: 'error',
                });
                return;
              }
              createCoffeeMutation.mutate();
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <InputField
                label="Nombre"
                value={coffeeForm.display_name}
                onChange={(value) => handleCoffeeFormChange('display_name', value)}
                required
              />
              <InputField
                label="Roaster"
                value={coffeeForm.roaster}
                onChange={(value) => handleCoffeeFormChange('roaster', value)}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                label="Proceso"
                value={coffeeForm.process}
                onChange={(value) =>
                  handleCoffeeFormChange('process', value as Coffee['process'])
                }
                options={Object.entries(processLabels).map(([value, label]) => ({ value, label }))}
              />
              <SelectField
                label="Tueste"
                value={coffeeForm.roast_level}
                onChange={(value) =>
                  handleCoffeeFormChange('roast_level', value as Coffee['roast_level'])
                }
                options={Object.entries(roastLabels).map(([value, label]) => ({ value, label }))}
              />
            </div>
            <InputField
              label="Origen"
              value={coffeeForm.origin_country}
              onChange={(value) => handleCoffeeFormChange('origin_country', value)}
              placeholder="Ej. Cajamarca, Perú"
            />
            <div className="grid gap-4 md:grid-cols-2">
              <InputField
                label="Precio (S/)"
                type="number"
                value={coffeeForm.purchase_price}
                onChange={(value) => handleCoffeeFormChange('purchase_price', value)}
              />
              <InputField
                label="Peso de bolsa (g)"
                type="number"
                value={coffeeForm.bag_weight_g}
                onChange={(value) => handleCoffeeFormChange('bag_weight_g', value)}
              />
            </div>
            <TextAreaField
              label="Notas"
              value={coffeeForm.notes}
              onChange={(value) => handleCoffeeFormChange('notes', value)}
              placeholder="Anota descriptores, expectativas o datos relevantes del productor."
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCoffeeModal(false)}
                className="rounded-full border border-surface-700 px-4 py-2 text-sm text-muted-300 hover:border-surface-500 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createCoffeeMutation.isPending}
                className="rounded-full bg-primary-500 px-5 py-2 text-sm font-semibold text-surface-900 transition hover:bg-primary-400 disabled:opacity-70"
              >
                {createCoffeeMutation.isPending ? 'Guardando...' : 'Guardar coffee'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {showBrewModal && selectedCoffee ? (
        <Modal title={`Nuevo brew para ${selectedCoffee.display_name}`} onClose={() => setShowBrewModal(false)}>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              createBrewMutation.mutate();
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <InputField
                label="Fecha y hora"
                type="datetime-local"
                value={brewForm.brew_date}
                onChange={(value) => handleBrewFormChange('brew_date', value)}
                required
              />
              <SelectField
                label="Método"
                value={brewForm.method}
                onChange={(value) => handleBrewFormChange('method', value as Brew['method'])}
                options={brewMethods}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <InputField
                label="Dosis (g)"
                type="number"
                value={brewForm.dose_g}
                onChange={(value) => handleBrewFormChange('dose_g', value)}
              />
              <InputField
                label="Agua (g)"
                type="number"
                value={brewForm.water_g}
                onChange={(value) => handleBrewFormChange('water_g', value)}
              />
              <InputField
                label="Ratio"
                type="number"
                step="0.1"
                value={brewForm.ratio}
                onChange={(value) => handleBrewFormChange('ratio', value)}
              />
            </div>

            <InputField
              label="Temperatura (°C)"
              type="number"
              value={brewForm.temp_c}
              onChange={(value) => handleBrewFormChange('temp_c', value)}
            />

            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-400">
                Receta
              </label>
              {recipesError ? (
                <p className="text-xs text-rose-200">No pudimos cargar las recetas.</p>
              ) : loadingRecipes ? (
                <p className="text-xs text-muted-400">Cargando recetas...</p>
              ) : recipes.length === 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowRecipeShortcut(true);
                    setShowBrewModal(false);
                  }}
                  className="w-full rounded-xl border border-dashed border-primary-500/40 px-4 py-3 text-sm text-primary-200 hover:border-primary-400 hover:text-white"
                >
                  Crear receta antes del brew
                </button>
              ) : (
                <select
                  value={brewForm.recipe_id}
                  onChange={(event) => handleBrewFormChange('recipe_id', event.target.value)}
                  className="w-full rounded-xl border border-surface-700 bg-surface-800/70 px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
                >
                  <option value="">Sin receta asociada</option>
                  {recipes.map((recipe) => (
                    <option key={recipe.id} value={recipe.id}>
                      {recipe.method.toUpperCase()} • {recipe.dose_g ? `${recipe.dose_g}g` : 's/d'} x{' '}
                      {recipe.water_g ? `${recipe.water_g}g` : 's/d'}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <TextAreaField
              label="Notas"
              value={brewForm.notes}
              onChange={(value) => handleBrewFormChange('notes', value)}
              placeholder="Describe ajustes de molienda, puntos a repetir o sensaciones clave."
            />

            <div className="grid gap-4 md:grid-cols-2">
              <InputField
                label="Score sensorial (0-100)"
                type="number"
                value={brewForm.score_total}
                onChange={(value) => handleBrewFormChange('score_total', value)}
              />
              <TagsInput
                label="Descriptores"
                values={brewForm.descriptors}
                onChange={(values) => handleBrewFormChange('descriptors', values)}
              />
            </div>

            <div className="flex justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowBrewModal(false);
                }}
                className="rounded-full border border-surface-700 px-4 py-2 text-sm text-muted-300 hover:border-surface-500 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createBrewMutation.isPending}
                className="rounded-full bg-primary-500 px-5 py-2 text-sm font-semibold text-surface-900 transition hover:bg-primary-400 disabled:opacity-70"
              >
                {createBrewMutation.isPending ? 'Guardando...' : 'Guardar brew'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {showRecipeShortcut ? (
        <Modal title="Guardar receta rápida" onClose={() => setShowRecipeShortcut(false)}>
          <RecipeQuickForm
            onCancel={() => setShowRecipeShortcut(false)}
            onSaved={(recipeId) => {
              setShowRecipeShortcut(false);
              setShowBrewModal(true);
              setBrewForm((prev) => ({ ...prev, recipe_id: recipeId }));
              queryClient.invalidateQueries({ queryKey: ['recipes', 'catalog'] });
            }}
          />
        </Modal>
      ) : null}
    </div>
  );
};

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

const Modal = ({ title, onClose, children }: ModalProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-900/80 backdrop-blur">
    <div className="relative w-full max-w-2xl rounded-3xl border border-surface-700/70 bg-surface-900 p-6 shadow-2xl shadow-primary-500/10">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-6 top-6 text-muted-400 hover:text-white"
        aria-label="Cerrar modal"
      >
        ×
      </button>
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  </div>
);

interface InputFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  step?: string;
  placeholder?: string;
}

const InputField = ({
  label,
  value,
  onChange,
  type = 'text',
  required,
  step,
  placeholder,
}: InputFieldProps) => (
  <label className="flex flex-col gap-2 text-sm text-muted-300">
    <span className="text-xs font-semibold uppercase tracking-wide text-muted-400">{label}</span>
    <input
      type={type}
      value={value}
      required={required}
      step={step}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-xl border border-surface-700 bg-surface-800/70 px-3 py-2 text-sm text-white placeholder:text-muted-500 focus:border-primary-500 focus:outline-none"
    />
  </label>
);

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}

const SelectField = ({ label, value, onChange, options }: SelectFieldProps) => (
  <label className="flex flex-col gap-2 text-sm text-muted-300">
    <span className="text-xs font-semibold uppercase tracking-wide text-muted-400">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-xl border border-surface-700 bg-surface-800/70 px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

interface TextAreaFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const TextAreaField = ({ label, value, onChange, placeholder }: TextAreaFieldProps) => (
  <label className="flex flex-col gap-2 text-sm text-muted-300">
    <span className="text-xs font-semibold uppercase tracking-wide text-muted-400">{label}</span>
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={3}
      placeholder={placeholder}
      className="w-full rounded-xl border border-surface-700 bg-surface-800/70 px-3 py-2 text-sm text-white placeholder:text-muted-500 focus:border-primary-500 focus:outline-none"
    />
  </label>
);

interface TagsInputProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
}

const TagsInput = ({ label, values, onChange }: TagsInputProps) => {
  const [inputValue, setInputValue] = useState('');

  return (
    <div className="flex flex-col gap-2 text-sm text-muted-300">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-400">{label}</span>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-surface-700 bg-surface-800/70 px-3 py-2">
        {values.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-2 rounded-full border border-primary-500/40 bg-primary-500/10 px-3 py-1 text-xs font-medium text-primary-200"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(values.filter((value) => value !== tag))}
              className="text-primary-200 hover:text-white"
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault();
              const trimmed = inputValue.trim();
              if (!trimmed || values.includes(trimmed)) return;
              onChange([...values, trimmed]);
              setInputValue('');
            } else if (event.key === 'Backspace' && !inputValue) {
              onChange(values.slice(0, -1));
            }
          }}
          placeholder="Escribe y presiona Enter"
          className="flex-1 bg-transparent text-sm text-white placeholder:text-muted-500 focus:outline-none"
        />
      </div>
    </div>
  );
};

interface RecipeQuickFormProps {
  onCancel: () => void;
  onSaved: (recipeId: string) => void;
}

const RecipeQuickForm = ({ onCancel, onSaved }: RecipeQuickFormProps) => {
  const { toast } = useToast();
  const [form, setForm] = useState({
    method: 'v60' as Recipe['method'],
    dose_g: '',
    water_g: '',
    ratio: '',
    temp_c: '',
    grinder: '',
    grind_setting: '',
    steps: '',
  });

  const queryClient = useQueryClient();

  const createRecipeMutation = useSupabaseMutation({
    mutationFn: async () => {
      const payload = {
        method: form.method,
        dose_g: form.dose_g ? Number(form.dose_g) : null,
        water_g: form.water_g ? Number(form.water_g) : null,
        ratio: form.ratio ? Number(form.ratio) : null,
        temp_c: form.temp_c ? Number(form.temp_c) : null,
        grinder: form.grinder.trim() || null,
        grind_setting: form.grind_setting.trim() || null,
        steps: form.steps
          .split('\n')
          .map((step) => step.trim())
          .filter(Boolean),
      };

      const { data, error } = await supabase
        .from('recipes')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return data as Recipe;
    },
    onSuccess: (recipe) => {
      toast({
        title: 'Receta guardada',
        description: 'Ahora puedes asociarla al brew que estás registrando.',
        variant: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      onSaved(recipe.id);
    },
    onError: (error) => {
      toast({
        title: 'No pudimos guardar la receta',
        description: error instanceof Error ? error.message : 'Intenta nuevamente.',
        variant: 'error',
      });
    },
  });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        createRecipeMutation.mutate();
      }}
    >
      <SelectField
        label="Método"
        value={form.method}
        onChange={(value) => setForm((prev) => ({ ...prev, method: value as Recipe['method'] }))}
        options={brewMethods}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <InputField
          label="Dosis (g)"
          type="number"
          value={form.dose_g}
          onChange={(value) => setForm((prev) => ({ ...prev, dose_g: value }))}
        />
        <InputField
          label="Agua (g)"
          type="number"
          value={form.water_g}
          onChange={(value) => setForm((prev) => ({ ...prev, water_g: value }))}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <InputField
          label="Ratio"
          type="number"
          value={form.ratio}
          onChange={(value) => setForm((prev) => ({ ...prev, ratio: value }))}
        />
        <InputField
          label="Temperatura (°C)"
          type="number"
          value={form.temp_c}
          onChange={(value) => setForm((prev) => ({ ...prev, temp_c: value }))}
        />
      </div>
      <InputField
        label="Molino"
        value={form.grinder}
        onChange={(value) => setForm((prev) => ({ ...prev, grinder: value }))}
      />
      <InputField
        label="Ajuste de molienda"
        value={form.grind_setting}
        onChange={(value) => setForm((prev) => ({ ...prev, grind_setting: value }))}
      />
      <TextAreaField
        label="Pasos"
        value={form.steps}
        onChange={(value) => setForm((prev) => ({ ...prev, steps: value }))}
        placeholder="Escribe cada paso en una línea distinta."
      />
      <div className="flex justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-surface-700 px-4 py-2 text-sm text-muted-300 hover:border-surface-500 hover:text-white"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={createRecipeMutation.isPending}
          className="rounded-full bg-primary-500 px-5 py-2 text-sm font-semibold text-surface-900 transition hover:bg-primary-400 disabled:opacity-70"
        >
          {createRecipeMutation.isPending ? 'Guardando...' : 'Guardar receta'}
        </button>
      </div>
    </form>
  );
};

export default Coffees;
