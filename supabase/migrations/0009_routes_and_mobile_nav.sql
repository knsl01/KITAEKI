-- Route planning stops and per-user floating navigation preferences.
alter table public.calendar_events
  add column if not exists location text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists route_order integer not null default 0,
  add column if not exists is_done boolean not null default false;

create index if not exists calendar_events_route_idx
  on public.calendar_events(household_id, starts_on, starts_at, route_order);

alter table public.user_preferences
  add column if not exists mobile_nav text[] not null default array[
    '/dashboard',
    '/dashboard/ai',
    '/dashboard/transactions',
    '/dashboard/finance'
  ]::text[];
