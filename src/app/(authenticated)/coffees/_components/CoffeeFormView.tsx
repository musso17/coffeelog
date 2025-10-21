'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Coffee } from '@/lib/types';
import FormField from '@/components/FormField';
import { TagInput } from '@/components/TagInput';
import { useSupabaseQuery, useQueryClient } from '@/hooks/useQuery';
import { useToast } from '@/hooks/useToast';

const processOptions = [
  { value: 'washed', label: 'Lavado' },
  { value: 'natural', label: 'Natural' },
  { value: 'honey', label: 'Honey' },
  { value: 'anaerobic', label: 'Anaeróbico' },
  { value: 'other', label: 'Otro' },
] as const;

const roastOptions = [
  { value: 'light', label: 'Claro' },
  { value: 'medium', label: 'Medio' },
  { value: 'dark', label: 'Oscuro' },
] as const;

const purchaseTypes = [
  { value: 'retail', label: 'Retail' },
  { value: 'online', label: 'Online' },
  { value: 'cafe', label: 'Café' },
] as const;

const emptyForm: Partial<Coffee> = {
  display_name: '',
  roaster: '',
  origin_country: '',
  origin_region: '',
  origin_farm: '',
  varieties: [],
  process: 'washed',
  roast_level: 'light',
  roast_date: '',
  purchase_place: '',
  purchase_type: 'retail',
  purchase_price: undefined,
  currency: 'PEN',
  bag_weight_g: undefined,
  notes: '',
  tags: [],
};

const fetchCoffeeById = async (id: string) => {
  const { data, error } = await supabase.from('coffees').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Coffee | null;
};

const CoffeeForm = () => {
  const params = useParams<{ id?: string }>();
  const id = params?.id;
  const isEditing = Boolean(id);
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: coffee, isLoading } = useSupabaseQuery(
    ['coffee', id],
    () => fetchCoffeeById(id as string),
    { enabled: isEditing },
  );

  const [form, setForm] = useState<Partial<Coffee>>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (coffee) {
      setForm({
        ...coffee,
        roast_date: coffee.roast_date ?? '',
        currency: coffee.currency ?? 'PEN',
        varieties: coffee.varieties ?? [],
        tags: coffee.tags ?? [],
      });
    }
  }, [coffee]);

  const title = useMemo(
    () => (isEditing ? 'Editar coffee' : 'Nuevo coffee'),
    [isEditing],
  );

  const handleInputChange = (
    field: keyof Coffee,
    value: string | number | string[] | null | undefined,
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    const payload = {
      display_name: form.display_name?.trim() ?? '',
      roaster: form.roaster?.trim() || null,
      origin_country: form.origin_country?.trim() || null,
      origin_region: form.origin_region?.trim() || null,
      origin_farm: form.origin_farm?.trim() || null,
      varieties: form.varieties && form.varieties.length > 0 ? form.varieties : null,
      process: form.process ?? 'washed',
      roast_level: form.roast_level ?? 'light',
      roast_date: form.roast_date || null,
      purchase_place: form.purchase_place?.trim() || null,
      purchase_type: form.purchase_type ?? 'retail',
      purchase_price:
        form.purchase_price !== undefined && form.purchase_price !== null
          ? Number(form.purchase_price)
          : null,
      currency: form.currency || 'PEN',
      bag_weight_g:
        form.bag_weight_g !== undefined && form.bag_weight_g !== null
          ? Number(form.bag_weight_g)
          : null,
      notes: form.notes?.trim() || null,
      tags: form.tags && form.tags.length > 0 ? form.tags : null,
    };

    try {
      if (!payload.display_name) {
        throw new Error('El nombre del coffee es obligatorio.');
      }

      if (isEditing && id) {
        const { error } = await supabase.from('coffees').update(payload).eq('id', id);
        if (error) throw error;
        toast({ title: 'Coffee actualizado', variant: 'success' });
      } else {
        const { error } = await supabase.from('coffees').insert([payload]);
        if (error) throw error;
        toast({ title: 'Coffee creado', variant: 'success' });
      }
      queryClient.invalidateQueries({ queryKey: ['coffees'] });
      router.push('/coffees');
    } catch (error) {
      console.error(error);
      toast({
        title: 'No pudimos guardar el coffee',
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
        Cargando información del coffee...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-600">
            Completa la información principal para registrar este coffee.
          </p>
        </div>
        <Link
          href="/coffees"
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
          <FormField label="Nombre del coffee" htmlFor="display_name" required>
            <input
              id="display_name"
              value={form.display_name || ''}
              onChange={(event) => handleInputChange('display_name', event.target.value)}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </FormField>

          <FormField label="Roaster" htmlFor="roaster">
            <input
              id="roaster"
              value={form.roaster || ''}
              onChange={(event) => handleInputChange('roaster', event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </FormField>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <FormField label="País de origen" htmlFor="origin_country">
            <input
              id="origin_country"
              value={form.origin_country || ''}
              onChange={(event) => handleInputChange('origin_country', event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </FormField>
          <FormField label="Región" htmlFor="origin_region">
            <input
              id="origin_region"
              value={form.origin_region || ''}
              onChange={(event) => handleInputChange('origin_region', event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </FormField>
          <FormField label="Finca" htmlFor="origin_farm">
            <input
              id="origin_farm"
              value={form.origin_farm || ''}
              onChange={(event) => handleInputChange('origin_farm', event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </FormField>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <FormField label="Proceso" htmlFor="process">
            <select
              id="process"
              value={form.process || 'washed'}
              onChange={(event) => handleInputChange('process', event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm capitalize shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            >
              {processOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Nivel de tueste" htmlFor="roast_level">
            <select
              id="roast_level"
              value={form.roast_level || 'light'}
              onChange={(event) => handleInputChange('roast_level', event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm capitalize shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            >
              {roastOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Fecha de tueste" htmlFor="roast_date">
            <input
              id="roast_date"
              type="date"
              value={form.roast_date || ''}
              onChange={(event) => handleInputChange('roast_date', event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </FormField>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <FormField label="Lugar de compra" htmlFor="purchase_place">
            <input
              id="purchase_place"
              value={form.purchase_place || ''}
              onChange={(event) => handleInputChange('purchase_place', event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </FormField>
          <FormField label="Tipo de compra" htmlFor="purchase_type">
            <select
              id="purchase_type"
              value={form.purchase_type || 'retail'}
              onChange={(event) => handleInputChange('purchase_type', event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm capitalize shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            >
              {purchaseTypes.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Precio de compra" htmlFor="purchase_price">
            <div className="flex gap-2">
              <select
                value={form.currency || 'PEN'}
                onChange={(event) => handleInputChange('currency', event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
              >
                <option value="PEN">PEN</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
              <input
                id="purchase_price"
                type="number"
                inputMode="decimal"
                step="0.01"
                value={form.purchase_price ?? ''}
                onChange={(event) =>
                  handleInputChange('purchase_price', event.target.value ? Number(event.target.value) : null)
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
            </div>
          </FormField>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Peso de la bolsa (g)" htmlFor="bag_weight_g">
            <input
              id="bag_weight_g"
              type="number"
              inputMode="numeric"
              value={form.bag_weight_g ?? ''}
              onChange={(event) =>
                handleInputChange('bag_weight_g', event.target.value ? Number(event.target.value) : null)
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </FormField>

          <FormField
            label="Variedades"
            htmlFor="varieties"
            description="Presiona Enter para añadir cada variedad."
          >
            <TagInput
              values={(form.varieties as string[]) ?? []}
              onChange={(values) => handleInputChange('varieties', values)}
              placeholder="Ej. Caturra, Bourbon..."
            />
          </FormField>
        </div>

        <FormField
          label="Notas"
          htmlFor="notes"
          description="Registra comentarios generales sobre el café."
        >
          <textarea
            id="notes"
            value={form.notes || ''}
            onChange={(event) => handleInputChange('notes', event.target.value)}
            rows={4}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
          />
        </FormField>

        <FormField
          label="Tags"
          htmlFor="tags"
          description="Añade etiquetas para facilitar la búsqueda."
        >
          <TagInput
            values={(form.tags as string[]) ?? []}
            onChange={(values) => handleInputChange('tags', values)}
            placeholder="frutal, floral, chocolate..."
          />
        </FormField>

        <div className="flex justify-end gap-3">
          <Link
            href="/coffees"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700 disabled:opacity-70"
          >
            {saving ? 'Guardando...' : 'Guardar coffee'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CoffeeForm;
