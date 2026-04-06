-- ============================================================
-- AI Agent Platform — Schema initial
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- Enums
create type user_role as enum ('master', 'manager');
create type agent_status as enum ('idle', 'running', 'completed', 'failed');

-- ============================================================
-- ORGANIZATIONS (tenant root)
-- ============================================================
create table public.organizations (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  slug        text not null unique,
  logo_url    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- PROFILES (users liés à une org)
-- ============================================================
create table public.profiles (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  org_id      uuid not null references public.organizations(id) on delete cascade,
  role        user_role not null default 'manager',
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(user_id)
);

-- ============================================================
-- AGENTS
-- ============================================================
create table public.agents (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  name        text not null,
  type        text not null,
  description text,
  config      jsonb not null default '{}',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- AGENT RUNS (sessions d'exécution)
-- ============================================================
create table public.agent_runs (
  id               uuid primary key default uuid_generate_v4(),
  agent_id         uuid not null references public.agents(id) on delete cascade,
  org_id           uuid not null references public.organizations(id) on delete cascade,
  status           agent_status not null default 'idle',
  started_at       timestamptz not null default now(),
  ended_at         timestamptz,
  items_processed  integer not null default 0,
  tokens_used      integer not null default 0,
  cost_usd         numeric(10,6) not null default 0,
  error            text,
  created_at       timestamptz not null default now()
);

-- ============================================================
-- AGENT LOGS (détail par action)
-- ============================================================
create table public.agent_logs (
  id           uuid primary key default uuid_generate_v4(),
  run_id       uuid not null references public.agent_runs(id) on delete cascade,
  org_id       uuid not null references public.organizations(id) on delete cascade,
  action       text not null,
  details      jsonb,
  items_count  integer not null default 0,
  tokens_used  integer not null default 0,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.organizations enable row level security;
alter table public.profiles      enable row level security;
alter table public.agents        enable row level security;
alter table public.agent_runs    enable row level security;
alter table public.agent_logs    enable row level security;

-- Helper: récupérer l'org_id du user connecté
create or replace function public.my_org_id()
returns uuid language sql stable security definer as $$
  select org_id from public.profiles where user_id = auth.uid() limit 1;
$$;

-- Helper: récupérer le rôle du user connecté
create or replace function public.my_role()
returns user_role language sql stable security definer as $$
  select role from public.profiles where user_id = auth.uid() limit 1;
$$;

-- Organizations: master voit tout, sinon uniquement sa propre org
create policy "org_select" on public.organizations for select
  using (
    my_role() = 'master' or id = my_org_id()
  );
create policy "org_insert" on public.organizations for insert
  with check (my_role() = 'master');
create policy "org_update" on public.organizations for update
  using (my_role() = 'master');
create policy "org_delete" on public.organizations for delete
  using (my_role() = 'master');

-- Profiles: chacun voit sa propre org
create policy "profiles_select" on public.profiles for select
  using (org_id = my_org_id() or my_role() = 'master');
create policy "profiles_insert" on public.profiles for insert
  with check (org_id = my_org_id() or my_role() = 'master');
create policy "profiles_update" on public.profiles for update
  using (user_id = auth.uid() or my_role() = 'master');

-- Agents, runs, logs: isolés par org
create policy "agents_select" on public.agents for select
  using (org_id = my_org_id());
create policy "agents_all" on public.agents for all
  using (org_id = my_org_id());

create policy "runs_select" on public.agent_runs for select
  using (org_id = my_org_id());
create policy "runs_all" on public.agent_runs for all
  using (org_id = my_org_id());

create policy "logs_select" on public.agent_logs for select
  using (org_id = my_org_id());
create policy "logs_insert" on public.agent_logs for insert
  with check (org_id = my_org_id());

-- ============================================================
-- TRIGGER: auto-create profile après signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  -- Le profil sera créé manuellement lors de l'onboarding
  return new;
end;
$$;

-- Indexes pour les perfs
create index on public.agents(org_id);
create index on public.agent_runs(agent_id);
create index on public.agent_runs(org_id);
create index on public.agent_runs(created_at desc);
create index on public.agent_logs(run_id);
create index on public.agent_logs(org_id);
