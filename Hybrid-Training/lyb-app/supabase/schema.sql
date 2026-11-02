-- Lift Your Body — contenu de l'espace admin.
-- À exécuter une fois dans Supabase : SQL Editor → New query → coller → Run.

-- Comptes autorisés à modifier le contenu
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- Bibliothèque d'exercices et WODs (le contenu est stocké en JSON, au format de l'application)
create table if not exists public.exercises (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.wods (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.admins enable row level security;
alter table public.exercises enable row level security;
alter table public.wods enable row level security;

-- Chacun peut vérifier s'il est admin ; personne ne peut s'ajouter lui-même
drop policy if exists "admins: lire sa ligne" on public.admins;
create policy "admins: lire sa ligne" on public.admins for select using (user_id = auth.uid());

-- Lecture publique (les séances des abonnés en ont besoin), écriture réservée aux admins
drop policy if exists "exercises: lecture" on public.exercises;
create policy "exercises: lecture" on public.exercises for select using (true);
drop policy if exists "exercises: écriture admin" on public.exercises;
create policy "exercises: écriture admin" on public.exercises for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "wods: lecture" on public.wods;
create policy "wods: lecture" on public.wods for select using (true);
drop policy if exists "wods: écriture admin" on public.wods;
create policy "wods: écriture admin" on public.wods for all using (public.is_admin()) with check (public.is_admin());

-- Photos et vidéos : bucket public en lecture, envoi réservé aux admins (50 Mo max par fichier)
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', true, 52428800)
on conflict (id) do nothing;

drop policy if exists "media: envoi admin" on storage.objects;
create policy "media: envoi admin" on storage.objects for insert
  with check (bucket_id = 'media' and public.is_admin());
drop policy if exists "media: suppression admin" on storage.objects;
create policy "media: suppression admin" on storage.objects for delete
  using (bucket_id = 'media' and public.is_admin());

-- Pour te donner l'accès : crée ton compte dans Authentication → Users → Add user,
-- puis exécute (en remplaçant l'email) :
-- insert into public.admins (user_id) select id from auth.users where email = 'ton@email.com';
