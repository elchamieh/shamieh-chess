-- Shamieh Chess Academy Platform v0.1
-- Core roles: admin, coach, student
-- Core branches: Saida, Beirut
-- Core levels: Starters, Beginners, Intermediate, Advanced

create extension if not exists pgcrypto;

-- Internal authorization helpers live outside the exposed public schema.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create type public.user_role as enum ('admin', 'coach', 'student');

grant usage on type public.user_role to authenticated, service_role;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'student',
  phone text,
  created_at timestamptz not null default now()
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.levels (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  sort_order integer not null,
  active boolean not null default true
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id),
  level_id uuid not null references public.levels(id),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(branch_id, name)
);

create table public.coach_class_assignments (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(coach_id, class_id)
);

create table public.student_enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  active boolean not null default true,
  enrolled_at timestamptz not null default now()
);

create unique index one_active_class_per_student
  on public.student_enrollments(student_id)
  where active = true;

create index student_enrollments_class_id_idx
  on public.student_enrollments(class_id);

create index coach_assignments_class_id_idx
  on public.coach_class_assignments(class_id);

create table public.homework (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  title text not null,
  instructions text,
  attachment_url text,
  due_date date,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create index homework_class_id_idx on public.homework(class_id);

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  branch_id uuid references public.branches(id),
  venue text,
  starts_at timestamptz not null,
  registration_deadline timestamptz,
  description text,
  open_for_registration boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.tournament_registrations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'registered' check (status in ('registered', 'cancelled', 'waitlist')),
  registered_at timestamptz not null default now(),
  unique(tournament_id, student_id)
);

create index tournament_registrations_student_id_idx
  on public.tournament_registrations(student_id);

insert into public.branches(name) values ('Saida'), ('Beirut')
  on conflict (name) do nothing;

insert into public.levels(name, sort_order) values
  ('Starters', 1),
  ('Beginners', 2),
  ('Intermediate', 3),
  ('Advanced', 4)
  on conflict (name) do nothing;

-- Authorization helpers. SECURITY DEFINER is intentional here so policy lookups
-- can inspect relationship tables without recursive RLS. These functions live in
-- a non-exposed schema and are executable only by authenticated users.
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role = 'admin'
    );
$$;

create or replace function private.has_role(target_role public.user_role)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role = target_role
    );
$$;

create or replace function private.coach_has_class(target_class uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1 from public.coach_class_assignments
      where coach_id = (select auth.uid()) and class_id = target_class
    );
$$;

create or replace function private.student_has_class(target_class uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1 from public.student_enrollments
      where student_id = (select auth.uid())
        and class_id = target_class
        and active = true
    );
$$;

create or replace function private.coach_can_see_student(target_student uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.student_enrollments se
      join public.coach_class_assignments cca on cca.class_id = se.class_id
      where se.student_id = target_student
        and se.active = true
        and cca.coach_id = (select auth.uid())
    );
$$;

create or replace function private.student_can_see_coach(target_coach uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.student_enrollments se
      join public.coach_class_assignments cca on cca.class_id = se.class_id
      where se.student_id = (select auth.uid())
        and se.active = true
        and cca.coach_id = target_coach
    );
$$;

revoke all on function private.is_admin() from public, anon, authenticated;
revoke all on function private.has_role(public.user_role) from public, anon, authenticated;
revoke all on function private.coach_has_class(uuid) from public, anon, authenticated;
revoke all on function private.student_has_class(uuid) from public, anon, authenticated;
revoke all on function private.coach_can_see_student(uuid) from public, anon, authenticated;
revoke all on function private.student_can_see_coach(uuid) from public, anon, authenticated;

grant execute on function private.is_admin() to authenticated;
grant execute on function private.has_role(public.user_role) to authenticated;
grant execute on function private.coach_has_class(uuid) to authenticated;
grant execute on function private.student_has_class(uuid) to authenticated;
grant execute on function private.coach_can_see_student(uuid) to authenticated;
grant execute on function private.student_can_see_coach(uuid) to authenticated;

-- Automatically create a student profile whenever an Auth user is created.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles(id, full_name, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1)),
    'student'
  );
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure private.handle_new_user();

-- Enable RLS on every exposed table.
alter table public.profiles enable row level security;
alter table public.branches enable row level security;
alter table public.levels enable row level security;
alter table public.classes enable row level security;
alter table public.coach_class_assignments enable row level security;
alter table public.student_enrollments enable row level security;
alter table public.homework enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_registrations enable row level security;

-- Profiles: users see themselves; coaches see only students in assigned classes;
-- students may see coaches assigned to their own class; admins see/manage all.
create policy profiles_select
on public.profiles for select
to authenticated
using (
  id = (select auth.uid())
  or (select private.is_admin())
  or private.coach_can_see_student(id)
  or private.student_can_see_coach(id)
);

create policy profiles_admin_update
on public.profiles for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

-- Branches and levels are visible to signed-in users; only admin can change them.
create policy branches_select
on public.branches for select
to authenticated
using (true);

create policy branches_admin_write
on public.branches for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy levels_select
on public.levels for select
to authenticated
using (true);

create policy levels_admin_write
on public.levels for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

-- Classes: admin sees all; coach sees assigned classes; student sees own active class.
create policy classes_select
on public.classes for select
to authenticated
using (
  (select private.is_admin())
  or private.coach_has_class(id)
  or private.student_has_class(id)
);

create policy classes_admin_write
on public.classes for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

-- Coach assignments.
create policy coach_assignments_select
on public.coach_class_assignments for select
to authenticated
using (
  (select private.is_admin())
  or coach_id = (select auth.uid())
  or private.student_has_class(class_id)
);

create policy coach_assignments_admin_write
on public.coach_class_assignments for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

-- Student enrollments.
create policy student_enrollments_select
on public.student_enrollments for select
to authenticated
using (
  (select private.is_admin())
  or student_id = (select auth.uid())
  or private.coach_has_class(class_id)
);

create policy student_enrollments_admin_write
on public.student_enrollments for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

-- Homework.
create policy homework_select
on public.homework for select
to authenticated
using (
  (select private.is_admin())
  or private.coach_has_class(class_id)
  or (published = true and private.student_has_class(class_id))
);

create policy homework_admin_write
on public.homework for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy homework_coach_insert
on public.homework for insert
to authenticated
with check (
  (select private.has_role('coach'))
  and created_by = (select auth.uid())
  and private.coach_has_class(class_id)
);

create policy homework_coach_update
on public.homework for update
to authenticated
using (
  created_by = (select auth.uid())
  and private.coach_has_class(class_id)
)
with check (
  created_by = (select auth.uid())
  and private.coach_has_class(class_id)
);

create policy homework_coach_delete
on public.homework for delete
to authenticated
using (
  created_by = (select auth.uid())
  and private.coach_has_class(class_id)
);

-- Tournaments are visible to all signed-in academy users; only admins manage them.
create policy tournaments_select
on public.tournaments for select
to authenticated
using (true);

create policy tournaments_admin_write
on public.tournaments for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

-- Tournament registrations: admin sees/manages all; students see/register themselves.
create policy tournament_registrations_select
on public.tournament_registrations for select
to authenticated
using (
  (select private.is_admin())
  or student_id = (select auth.uid())
);

create policy tournament_registrations_admin_write
on public.tournament_registrations for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy tournament_registrations_student_insert
on public.tournament_registrations for insert
to authenticated
with check (
  student_id = (select auth.uid())
  and (select private.has_role('student'))
  and exists (
    select 1 from public.tournaments t
    where t.id = tournament_id
      and t.open_for_registration = true
      and (t.registration_deadline is null or t.registration_deadline >= now())
  )
);

-- Explicit Data API grants (required for new Supabase projects in 2026).
revoke all on table public.profiles from anon;
revoke all on table public.branches from anon;
revoke all on table public.levels from anon;
revoke all on table public.classes from anon;
revoke all on table public.coach_class_assignments from anon;
revoke all on table public.student_enrollments from anon;
revoke all on table public.homework from anon;
revoke all on table public.tournaments from anon;
revoke all on table public.tournament_registrations from anon;

grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.branches to authenticated;
grant select, insert, update, delete on table public.levels to authenticated;
grant select, insert, update, delete on table public.classes to authenticated;
grant select, insert, update, delete on table public.coach_class_assignments to authenticated;
grant select, insert, update, delete on table public.student_enrollments to authenticated;
grant select, insert, update, delete on table public.homework to authenticated;
grant select, insert, update, delete on table public.tournaments to authenticated;
grant select, insert, update, delete on table public.tournament_registrations to authenticated;

grant select, insert, update, delete on table public.profiles to service_role;
grant select, insert, update, delete on table public.branches to service_role;
grant select, insert, update, delete on table public.levels to service_role;
grant select, insert, update, delete on table public.classes to service_role;
grant select, insert, update, delete on table public.coach_class_assignments to service_role;
grant select, insert, update, delete on table public.student_enrollments to service_role;
grant select, insert, update, delete on table public.homework to service_role;
grant select, insert, update, delete on table public.tournaments to service_role;
grant select, insert, update, delete on table public.tournament_registrations to service_role;

-- Make future public-schema exposure opt-in rather than accidental.
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from public;
