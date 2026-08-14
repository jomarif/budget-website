-- Bloom Budget — normalized schema (one row per entity, not one JSON blob).
-- Safe to shared-login: every table is scoped by user_id and guarded by an
-- identical RLS policy, so two people sharing one account edit the same rows
-- and concurrent edits to *different* rows never clobber each other.
--
-- Run this in the Supabase SQL Editor. If you previously created the old
-- `app_data` blob table you can drop it (see the very bottom).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists budgets (
  id         uuid primary key,
  user_id    uuid references auth.users not null,
  name       text not null,
  emoji      text,
  created_at timestamptz default now()
);

create table if not exists categories (
  id             uuid primary key,
  user_id        uuid references auth.users not null,
  budget_id      uuid references budgets(id) on delete cascade not null,
  name           text not null,
  emoji          text,
  color          text,
  monthly_budget numeric,
  is_savings     boolean default false
);

-- category_id / goal_id / recurring_id are intentionally NOT foreign keys:
-- deleting a category leaves its entries (they render as "Uncategorized"),
-- and deleting a goal leaves its linked spending entries. Matches app behavior.
create table if not exists entries (
  id           uuid primary key,
  user_id      uuid references auth.users not null,
  budget_id    uuid references budgets(id) on delete cascade not null,
  category_id  uuid,
  name         text not null,
  amount       numeric not null,
  type         text not null,          -- 'expense' | 'income'
  date         text not null,          -- ISO string, stored verbatim (no tz coercion)
  goal_id      uuid,
  recurring_id uuid
);

create table if not exists goals (
  id            uuid primary key,
  user_id       uuid references auth.users not null,
  budget_id     uuid references budgets(id) on delete cascade not null,
  name          text not null,
  emoji         text,
  target_amount numeric
);

create table if not exists recurring (
  id                  uuid primary key,
  user_id             uuid references auth.users not null,
  budget_id           uuid references budgets(id) on delete cascade not null,
  name                text not null,
  category_id         uuid,
  amount              numeric not null,
  type                text not null,
  frequency           text not null,   -- 'monthly' | 'weekly'
  day_of_month        int,
  start_date          text,            -- ISO string, stored verbatim
  last_generated_date text
);

-- ---------------------------------------------------------------------------
-- Row Level Security: a user can only touch their own rows.
-- (Shared login = same user_id = same rows, which is exactly the sharing model.)
-- ---------------------------------------------------------------------------

alter table budgets    enable row level security;
alter table categories enable row level security;
alter table entries    enable row level security;
alter table goals      enable row level security;
alter table recurring  enable row level security;

create policy "own budgets"    on budgets    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own categories" on categories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own entries"    on entries    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own goals"      on goals      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own recurring"  on recurring  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Realtime: broadcast row changes so other devices update live.
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table budgets;
alter publication supabase_realtime add table categories;
alter publication supabase_realtime add table entries;
alter publication supabase_realtime add table goals;
alter publication supabase_realtime add table recurring;

-- ---------------------------------------------------------------------------
-- Optional cleanup: remove the old blob table from the first iteration.
-- ---------------------------------------------------------------------------
-- drop table if exists app_data;
