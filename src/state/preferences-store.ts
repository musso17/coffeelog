'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { Locale } from '@/i18n/routing';

export type UnitSystem = 'metric' | 'imperial';

interface PreferencesState {
  locale: Locale;
  unitSystem: UnitSystem;
  defaultPrivacy: 'private' | 'public';
  inventoryThreshold: number;
  enableHaptics: boolean;
  setLocale: (locale: Locale) => void;
  setUnitSystem: (unitSystem: UnitSystem) => void;
  setDefaultPrivacy: (privacy: 'private' | 'public') => void;
  setInventoryThreshold: (grams: number) => void;
  toggleHaptics: (value?: boolean) => void;
}

const STORAGE_KEY = 'cafe-log:preferences';

export const usePreferenceStore = create<PreferencesState>()(
  persist(
    (set) => ({
      locale: 'es',
      unitSystem: 'metric',
      defaultPrivacy: 'private',
      inventoryThreshold: 50,
      enableHaptics: true,
      setLocale: (locale) => set({ locale }),
      setUnitSystem: (unitSystem) => set({ unitSystem }),
      setDefaultPrivacy: (defaultPrivacy) => set({ defaultPrivacy }),
      setInventoryThreshold: (inventoryThreshold) => set({ inventoryThreshold }),
      toggleHaptics: (value) =>
        set((state) => ({ enableHaptics: typeof value === 'boolean' ? value : !state.enableHaptics })),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
