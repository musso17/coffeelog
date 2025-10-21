'use client';

import { useMemo } from 'react';
import {
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  PointElement,
  RadialLinearScale,
  Tooltip,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { supabase } from '@/lib/supabaseClient';
import type { Brew, SensoryNote, SCABreakdown } from '@/lib/types';
import { useSupabaseQuery } from '@/hooks/useQuery';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

type BrewSummary = Pick<Brew, 'id' | 'brew_date'>;

interface AnalyticsData {
  brews: BrewSummary[];
  notes: SensoryNote[];
}

const fetchAnalyticsData = async (): Promise<AnalyticsData> => {
  const [brewsRes, notesRes] = await Promise.all([
    supabase.from('brews').select('id, brew_date'),
    supabase.from('sensory_notes').select('*'),
  ]);

  if (brewsRes.error) throw brewsRes.error;
  if (notesRes.error) throw notesRes.error;

  return {
    brews: (brewsRes.data ?? []) as BrewSummary[],
    notes: (notesRes.data ?? []) as SensoryNote[],
  };
};

const monthFormatter = new Intl.DateTimeFormat('es-PE', {
  month: 'short',
  year: 'numeric',
});

const Analytics = () => {
  const { data, isLoading, error } = useSupabaseQuery(['analytics'], fetchAnalyticsData, {
    staleTime: 1000 * 60,
  });

  const cupsByMonth = useMemo(() => {
    if (!data?.brews) return [];
    const counts = new Map<string, number>();
    data.brews.forEach((brew) => {
      if (!brew.brew_date) return;
      const date = new Date(brew.brew_date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .sort(([a], [b]) => (a > b ? -1 : 1))
      .slice(0, 6)
      .map(([key, count]) => {
        const [year, month] = key.split('-').map(Number);
        return {
          label: monthFormatter.format(new Date(year, month - 1)),
          value: count,
        };
      });
  }, [data?.brews]);

  const averageScore = useMemo(() => {
    if (!data?.notes?.length) return null;
    const scores = data.notes
      .map((note) => Number(note.score_total ?? 0))
      .filter((value) => value > 0);
    if (!scores.length) return null;
    const sum = scores.reduce((acc, value) => acc + value, 0);
    return Number((sum / scores.length).toFixed(1));
  }, [data?.notes]);

  const topDescriptors = useMemo(() => {
    if (!data?.notes) return [];
    const counter = new Map<string, number>();
    data.notes.forEach((note) => {
      note.descriptors?.forEach((descriptor) => {
        const key = descriptor.toLowerCase();
        counter.set(key, (counter.get(key) ?? 0) + 1);
      });
    });
    return Array.from(counter.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([label, frequency]) => ({ label, frequency }));
  }, [data?.notes]);

  const radarData = useMemo(() => {
    if (!data?.notes?.length) return null;

    const metrics: (keyof SCABreakdown)[] = [
      'aroma',
      'sabor',
      'aftertaste',
      'acidez',
      'cuerpo',
      'balance',
      'uniformidad',
      'limpieza',
      'dulzor',
    ];

    const totals = metrics.reduce<Record<string, { sum: number; count: number }>>(
      (acc, metric) => {
        acc[metric] = { sum: 0, count: 0 };
        return acc;
      },
      {},
    );

    data.notes.forEach((note) => {
      const breakdown = note.sca_breakdown || {};
      metrics.forEach((metric) => {
        const value = Number((breakdown as Record<string, number | undefined>)[metric]);
        if (!Number.isNaN(value) && value > 0) {
          totals[metric].sum += value;
          totals[metric].count += 1;
        }
      });
    });

    const averages = metrics.map((metric) => {
      const { sum, count } = totals[metric];
      return count ? Number((sum / count).toFixed(2)) : 0;
    });

    if (averages.every((value) => value === 0)) {
      return null;
    }

    return {
      labels: metrics.map((metric) => metric.toUpperCase()),
      datasets: [
        {
          label: 'Promedio SCA',
          data: averages,
          backgroundColor: 'rgba(161, 111, 42, 0.2)',
          borderColor: 'rgba(161, 111, 42, 0.9)',
          borderWidth: 2,
          pointBackgroundColor: '#a16f2a',
        },
      ],
    };
  }, [data?.notes]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Analytics</h2>
        <p className="text-sm text-slate-600">
          Visualiza tus métricas y encuentra patrones en tus brews.
        </p>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
          Cargando métricas...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-600 shadow-sm">
          No pudimos cargar la información. Intenta nuevamente.
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-400">Tazas / Mes</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {cupsByMonth[0]?.value ?? 0}
              </p>
              <p className="text-xs text-slate-500">
                {cupsByMonth[0]?.label ?? 'Sin registros recientes'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-400">Score promedio</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {averageScore ?? '—'}
              </p>
              <p className="text-xs text-slate-500">
                {averageScore ? 'Basado en tus notas sensoriales' : 'Registra scores para ver datos'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-400">Brews totales</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {data?.brews?.length ?? 0}
              </p>
              <p className="text-xs text-slate-500">Histórico completo</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-400">Notas sensoriales</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {data?.notes?.length ?? 0}
              </p>
              <p className="text-xs text-slate-500">Registros con SCA breakdown</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800">Tazas por mes</h3>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                {cupsByMonth.length ? (
                  cupsByMonth.map((item) => (
                    <li
                      key={item.label}
                      className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2"
                    >
                      <span>{item.label}</span>
                      <span className="font-semibold text-slate-900">{item.value}</span>
                    </li>
                  ))
                ) : (
                  <li className="rounded-md bg-slate-50 px-3 py-2 text-center text-slate-500">
                    Aún no registras brews este mes.
                  </li>
                )}
              </ul>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800">Top descriptores</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {topDescriptors.length ? (
                  topDescriptors.map((item) => (
                    <span
                      key={item.label}
                      className="inline-flex items-center gap-2 rounded-full bg-primary-100 px-3 py-1 text-xs font-medium text-primary-800"
                    >
                      {item.label}
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-primary-700">
                        {item.frequency}
                      </span>
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">
                    Registra descriptores para ver tendencias.
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800">Radar SCA promedio</h3>
            <div className="mt-4">
              {radarData ? (
                <Radar
                  data={radarData}
                  options={{
                    responsive: true,
                    scales: {
                      r: {
                        min: 0,
                        max: 10,
                        ticks: { stepSize: 2 },
                        grid: { color: '#CBD5F5' },
                        angleLines: { color: '#E2E8F0' },
                      },
                    },
                    plugins: {
                      legend: { display: false },
                    },
                  }}
                />
              ) : (
                <p className="text-sm text-slate-500">
                  Registra notas sensoriales con breakdown SCA para visualizar el radar.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;
