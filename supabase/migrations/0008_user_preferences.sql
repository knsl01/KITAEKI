-- Preferensi visual dan banner bersifat pribadi per akun login.
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'sage',
  mode text not null default 'system',
  radius text not null default 'soft',
  positive_color text,
  negative_color text,
  banner_image_url text,
  banner_title text not null default 'Selamat datang',
  banner_subtitle text not null default 'Keuangan yang terencana, hidup yang lebih tenang.',
  banner_quote text not null default 'Sedikit demi sedikit, jadi besar.',
  updated_at timestamptz not null default now()
);

alter table public.user_preferences add column if not exists positive_color text;
alter table public.user_preferences add column if not exists negative_color text;

alter table public.user_preferences enable row level security;
drop policy if exists user_preferences_self on public.user_preferences;
create policy user_preferences_self on public.user_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
