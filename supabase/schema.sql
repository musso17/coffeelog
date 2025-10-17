-- habilitar extensiones útiles
create extension if not exists "uuid-ossp";

-- tablas
create table if not exists profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique,
  email text,
  name text,
  country text,
  timezone text,
  created_at timestamptz default now()
);

create table if not exists coffees (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  display_name text not null,
  roaster text,
  origin_country text,
  origin_region text,
  origin_farm text,
  varieties text[],
  process text check (process in ('washed','natural','honey','anaerobic','other')) default 'washed',
  roast_level text check (roast_level in ('light','medium','dark')) default 'light',
  roast_date date,
  purchase_place text,
  purchase_type text check (purchase_type in ('retail','online','cafe')) default 'retail',
  purchase_price numeric(12,2),
  currency text default 'PEN',
  bag_weight_g int,
  notes text,
  tags text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_coffees_owner on coffees(user_id);

create table if not exists recipes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  method text not null,
  dose_g numeric(6,2),
  water_g numeric(6,2),
  ratio numeric(5,2),
  temp_c numeric(5,2),
  grinder text,
  grind_setting text,
  total_time_sec int,
  steps jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_recipes_owner on recipes(user_id);

create table if not exists brews (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  coffee_id uuid not null references coffees(id) on delete cascade,
  recipe_id uuid references recipes(id) on delete set null,
  brew_date timestamptz default now(),
  method text not null,
  dose_g numeric(6,2),
  water_g numeric(6,2),
  ratio numeric(5,2),
  temp_c numeric(5,2),
  total_time_sec int,
  yield_g numeric(6,2),
  water_profile text,
  tds numeric(5,2),
  extraction_yield numeric(5,2),
  location text,
  cost_per_cup numeric(8,2),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_brews_owner on brews(user_id);

create table if not exists sensory_notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  brew_id uuid not null references brews(id) on delete cascade,
  score_total numeric(5,2),
  sca_breakdown jsonb,
  descriptors text[],
  would_repeat boolean,
  created_at timestamptz default now()
);
create index if not exists idx_sensory_owner on sensory_notes(user_id);

-- RLS
alter table profiles enable row level security;
alter table coffees enable row level security;
alter table recipes enable row level security;
alter table brews enable row level security;
alter table sensory_notes enable row level security;

-- helper para current uid
create or replace function public.uid() returns uuid language sql stable as $$
  select auth.uid();
$$;

-- políticas: solo dueño puede ver y modificar
create policy "read own profiles" on profiles for select using (user_id = auth.uid());
create policy "insert own profiles" on profiles for insert with check (user_id = auth.uid());
create policy "update own profiles" on profiles for update using (user_id = auth.uid());

create policy "read own coffees" on coffees for select using (user_id = auth.uid());
create policy "insert own coffees" on coffees for insert with check (user_id = auth.uid());
create policy "update own coffees" on coffees for update using (user_id = auth.uid());
create policy "delete own coffees" on coffees for delete using (user_id = auth.uid());

create policy "read own recipes" on recipes for select using (user_id = auth.uid());
create policy "insert own recipes" on recipes for insert with check (user_id = auth.uid());
create policy "update own recipes" on recipes for update using (user_id = auth.uid());
create policy "delete own recipes" on recipes for delete using (user_id = auth.uid());

create policy "read own brews" on brews for select using (user_id = auth.uid());
create policy "insert own brews" on brews for insert with check (user_id = auth.uid());
create policy "update own brews" on brews for update using (user_id = auth.uid());
create policy "delete own brews" on brews for delete using (user_id = auth.uid());

create policy "read own notes" on sensory_notes for select using (user_id = auth.uid());
create policy "insert own notes" on sensory_notes for insert with check (user_id = auth.uid());
create policy "update own notes" on sensory_notes for update using (user_id = auth.uid());
create policy "delete own notes" on sensory_notes for delete using (user_id = auth.uid());

-- trigger para setear user_id automático en inserts (opcional)
create or replace function set_owner() returns trigger language plpgsql as $$
begin
  if new.user_id is null then new.user_id := auth.uid(); end if;
  return new;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname='coffees_owner_tg') then
    create trigger coffees_owner_tg before insert on coffees for each row execute function set_owner();
  end if;
  if not exists (select 1 from pg_trigger where tgname='recipes_owner_tg') then
    create trigger recipes_owner_tg before insert on recipes for each row execute function set_owner();
  end if;
  if not exists (select 1 from pg_trigger where tgname='brews_owner_tg') then
    create trigger brews_owner_tg before insert on brews for each row execute function set_owner();
  end if;
  if not exists (select 1 from pg_trigger where tgname='notes_owner_tg') then
    create trigger notes_owner_tg before insert on sensory_notes for each row execute function set_owner();
  end if;
end $$;
