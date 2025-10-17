export type CoffeeProcess = 'washed' | 'natural' | 'honey' | 'anaerobic' | 'other';
export type RoastLevel = 'light' | 'medium' | 'dark';
export type PurchaseType = 'retail' | 'online' | 'cafe';

export type BrewMethod =
  | 'espresso'
  | 'v60'
  | 'origami'
  | 'aeropress'
  | 'frenchpress'
  | 'moka'
  | 'other';

export interface Coffee {
  id: string;
  user_id: string;
  display_name: string;
  roaster?: string | null;
  origin_country?: string | null;
  origin_region?: string | null;
  origin_farm?: string | null;
  varieties?: string[] | null;
  process: CoffeeProcess;
  roast_level: RoastLevel;
  roast_date?: string | null;
  purchase_place?: string | null;
  purchase_type: PurchaseType;
  purchase_price?: number | null;
  currency?: string | null;
  bag_weight_g?: number | null;
  notes?: string | null;
  tags?: string[] | null;
  created_at?: string;
  updated_at?: string;
}

export interface Recipe {
  id: string;
  user_id: string;
  method: BrewMethod;
  dose_g?: number | null;
  water_g?: number | null;
  ratio?: number | null;
  temp_c?: number | null;
  grinder?: string | null;
  grind_setting?: string | null;
  total_time_sec?: number | null;
  steps?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

export interface Brew {
  id: string;
  user_id: string;
  coffee_id: string;
  recipe_id?: string | null;
  brew_date?: string | null;
  method: BrewMethod;
  dose_g?: number | null;
  water_g?: number | null;
  ratio?: number | null;
  temp_c?: number | null;
  total_time_sec?: number | null;
  yield_g?: number | null;
  water_profile?: string | null;
  tds?: number | null;
  extraction_yield?: number | null;
  location?: string | null;
  cost_per_cup?: number | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SCABreakdown {
  aroma?: number;
  sabor?: number;
  aftertaste?: number;
  acidez?: number;
  cuerpo?: number;
  balance?: number;
  uniformidad?: number;
  limpieza?: number;
  dulzor?: number;
}

export interface SensoryNote {
  id: string;
  user_id: string;
  brew_id: string;
  score_total?: number | null;
  sca_breakdown?: SCABreakdown | null;
  descriptors?: string[] | null;
  would_repeat?: boolean | null;
  created_at?: string;
}

export interface Option {
  label: string;
  value: string;
}
