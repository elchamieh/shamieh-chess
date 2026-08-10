-- Self-registration approval gate.
-- Existing accounts stay approved; new auth-triggered student profiles default to pending.

alter table public.profiles
  add column approved boolean not null default false,
  add column approved_at timestamptz;

update public.profiles
set approved = true,
    approved_at = coalesce(approved_at, now());

create or replace function private.is_approved()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and approved = true
    );
$$;

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
      where id = (select auth.uid()) and role = 'admin' and approved = true
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
      where id = (select auth.uid()) and role = target_role and approved = true
    );
$$;

create or replace function private.coach_has_class(target_class uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select private.has_role('coach'::public.user_role)
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
  select private.has_role('student'::public.user_role)
    and exists (
      select 1 from public.student_enrollments
      where student_id = (select auth.uid()) and class_id = target_class and active = true
    );
$$;

create or replace function private.coach_can_see_student(target_student uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select private.has_role('coach'::public.user_role)
    and exists (
      select 1
      from public.student_enrollments se
      join public.coach_class_assignments cca on cca.class_id = se.class_id
      join public.profiles p on p.id = se.student_id and p.approved = true
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
  select private.has_role('student'::public.user_role)
    and exists (
      select 1
      from public.student_enrollments se
      join public.coach_class_assignments cca on cca.class_id = se.class_id
      where se.student_id = (select auth.uid())
        and se.active = true
        and cca.coach_id = target_coach
    );
$$;

revoke all on function private.is_approved() from public, anon;
grant execute on function private.is_approved() to authenticated;

alter policy branches_select on public.branches
  using ((select private.is_approved()));

alter policy levels_select on public.levels
  using ((select private.is_approved()));

alter policy tournaments_select on public.tournaments
  using ((select private.is_approved()));
