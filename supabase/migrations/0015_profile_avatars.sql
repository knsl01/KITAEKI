-- Avatars are stored as data URLs in profiles.avatar_url and shared only
-- with members of the same household through the existing profiles RLS policy.
alter table public.profiles
  add column if not exists avatar_url text;
