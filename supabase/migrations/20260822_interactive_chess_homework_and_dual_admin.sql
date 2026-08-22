-- Production migration record for the dual Admin/Coach access and interactive chess homework feature.
-- The equivalent changes were applied to the production Supabase project before this file was committed.

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

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
      where id = (select auth.uid())
        and approved = true
        and frozen = false
        and (role = 'admin'::public.user_role or is_admin = true)
    );
$$;

alter table public.homework
  add column if not exists interactive_position_fen text;

create table if not exists public.homework_chess_solutions (
  homework_id uuid primary key references public.homework(id) on delete cascade,
  moves text[] not null check (cardinality(moves) > 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.homework_chess_attempts (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid not null references public.homework(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  progress_ply integer not null default 0 check (progress_ply >= 0),
  mistakes integer not null default 0 check (mistakes >= 0),
  solved boolean not null default false,
  solved_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(homework_id, student_id)
);

alter table public.homework_chess_solutions enable row level security;
alter table public.homework_chess_attempts enable row level security;

drop policy if exists homework_chess_solutions_select on public.homework_chess_solutions;
create policy homework_chess_solutions_select on public.homework_chess_solutions
for select to authenticated
using (
  (select private.is_admin())
  or exists (
    select 1 from public.homework h
    where h.id = homework_id and private.coach_has_class(h.class_id)
  )
);

drop policy if exists homework_chess_solutions_insert on public.homework_chess_solutions;
create policy homework_chess_solutions_insert on public.homework_chess_solutions
for insert to authenticated
with check (
  (select private.is_admin())
  or exists (
    select 1 from public.homework h
    where h.id = homework_id
      and h.created_by = (select auth.uid())
      and private.coach_has_class(h.class_id)
  )
);

drop policy if exists homework_chess_solutions_update on public.homework_chess_solutions;
create policy homework_chess_solutions_update on public.homework_chess_solutions
for update to authenticated
using (
  (select private.is_admin())
  or exists (
    select 1 from public.homework h
    where h.id = homework_id
      and h.created_by = (select auth.uid())
      and private.coach_has_class(h.class_id)
  )
)
with check (
  (select private.is_admin())
  or exists (
    select 1 from public.homework h
    where h.id = homework_id
      and h.created_by = (select auth.uid())
      and private.coach_has_class(h.class_id)
  )
);

drop policy if exists homework_chess_solutions_delete on public.homework_chess_solutions;
create policy homework_chess_solutions_delete on public.homework_chess_solutions
for delete to authenticated
using (
  (select private.is_admin())
  or exists (
    select 1 from public.homework h
    where h.id = homework_id
      and h.created_by = (select auth.uid())
      and private.coach_has_class(h.class_id)
  )
);

drop policy if exists homework_chess_attempts_select on public.homework_chess_attempts;
create policy homework_chess_attempts_select on public.homework_chess_attempts
for select to authenticated
using (
  (select private.is_admin())
  or student_id = (select auth.uid())
  or exists (
    select 1 from public.homework h
    where h.id = homework_id and private.coach_has_class(h.class_id)
  )
);

drop policy if exists homework_chess_attempts_insert on public.homework_chess_attempts;
drop policy if exists homework_chess_attempts_update on public.homework_chess_attempts;

revoke all privileges on public.homework_chess_attempts from authenticated;
grant select on public.homework_chess_attempts to authenticated;
revoke all privileges on public.homework_chess_attempts from anon;

revoke all privileges on public.homework_chess_solutions from authenticated;
grant select, insert, update, delete on public.homework_chess_solutions to authenticated;
revoke all privileges on public.homework_chess_solutions from anon;

create or replace function public.submit_homework_chess_move(
  p_homework_id uuid,
  p_move text,
  p_restart boolean default false
)
returns table(
  correct boolean,
  solved boolean,
  opponent_move text,
  progress_ply integer,
  mistakes integer,
  error text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_homework public.homework%rowtype;
  v_moves text[];
  v_attempt public.homework_chess_attempts%rowtype;
  v_expected text;
  v_progress integer;
  v_len integer;
  v_solved boolean;
  v_opponent text;
begin
  if v_uid is null then
    return query select false, false, null::text, 0, 0, 'Please sign in again.'::text;
    return;
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = v_uid and p.role = 'student'::public.user_role and p.approved = true and p.frozen = false
  ) then
    return query select false, false, null::text, 0, 0, 'Student access is required.'::text;
    return;
  end if;

  select * into v_homework
  from public.homework h
  where h.id = p_homework_id
    and h.published = true
    and h.interactive_position_fen is not null;

  if not found or not exists (
    select 1 from public.student_enrollments se
    where se.student_id = v_uid and se.class_id = v_homework.class_id and se.active = true
  ) then
    return query select false, false, null::text, 0, 0, 'This chess homework is not available for your class.'::text;
    return;
  end if;

  select s.moves into v_moves
  from public.homework_chess_solutions s
  where s.homework_id = p_homework_id;

  if v_moves is null or cardinality(v_moves) = 0 then
    return query select false, false, null::text, 0, 0, 'The solution has not been configured.'::text;
    return;
  end if;

  insert into public.homework_chess_attempts(homework_id, student_id)
  values (p_homework_id, v_uid)
  on conflict (homework_id, student_id) do nothing;

  select * into v_attempt
  from public.homework_chess_attempts a
  where a.homework_id = p_homework_id and a.student_id = v_uid
  for update;

  if v_attempt.solved then
    return query select true, true, null::text, v_attempt.progress_ply, v_attempt.mistakes, null::text;
    return;
  end if;

  if p_restart then
    update public.homework_chess_attempts
    set progress_ply = 0, updated_at = now()
    where id = v_attempt.id;
    v_attempt.progress_ply := 0;
  end if;

  v_len := cardinality(v_moves);
  v_expected := lower(v_moves[v_attempt.progress_ply + 1]);

  if lower(trim(coalesce(p_move, ''))) <> v_expected then
    update public.homework_chess_attempts
    set mistakes = homework_chess_attempts.mistakes + 1,
        progress_ply = 0,
        updated_at = now()
    where id = v_attempt.id
    returning homework_chess_attempts.mistakes into v_attempt.mistakes;

    return query select false, false, null::text, 0, v_attempt.mistakes, null::text;
    return;
  end if;

  v_progress := v_attempt.progress_ply + 1;
  v_opponent := null;

  if v_progress < v_len then
    v_opponent := lower(v_moves[v_progress + 1]);
    v_progress := v_progress + 1;
  end if;

  v_solved := v_progress >= v_len;

  update public.homework_chess_attempts
  set progress_ply = v_progress,
      solved = v_solved,
      solved_at = case when v_solved then now() else null end,
      updated_at = now()
  where id = v_attempt.id
  returning homework_chess_attempts.mistakes into v_attempt.mistakes;

  return query select true, v_solved, v_opponent, v_progress, v_attempt.mistakes, null::text;
end;
$$;

revoke all on function public.submit_homework_chess_move(uuid, text, boolean) from public;
revoke all on function public.submit_homework_chess_move(uuid, text, boolean) from anon;
grant execute on function public.submit_homework_chess_move(uuid, text, boolean) to authenticated;

-- Keep Sayyed Shamieh's primary role as coach and grant secondary admin access.
-- This data update is intentionally keyed by auth email rather than a generated UUID.
update public.profiles p
set is_admin = true
from auth.users u
where p.id = u.id
  and lower(u.email) = 'sayyed.shamieh@gmail.com';
