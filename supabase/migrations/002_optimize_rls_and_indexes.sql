create index if not exists classes_level_id_idx on public.classes(level_id);
create index if not exists homework_created_by_idx on public.homework(created_by);
create index if not exists tournaments_branch_id_idx on public.tournaments(branch_id);
create index if not exists tournaments_created_by_idx on public.tournaments(created_by);

-- Replace broad FOR ALL admin policies with action-specific policies to avoid overlapping SELECT policies.
drop policy if exists branches_admin_write on public.branches;
create policy branches_admin_insert on public.branches for insert to authenticated with check ((select private.is_admin()));
create policy branches_admin_update on public.branches for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy branches_admin_delete on public.branches for delete to authenticated using ((select private.is_admin()));

drop policy if exists levels_admin_write on public.levels;
create policy levels_admin_insert on public.levels for insert to authenticated with check ((select private.is_admin()));
create policy levels_admin_update on public.levels for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy levels_admin_delete on public.levels for delete to authenticated using ((select private.is_admin()));

drop policy if exists classes_admin_write on public.classes;
create policy classes_admin_insert on public.classes for insert to authenticated with check ((select private.is_admin()));
create policy classes_admin_update on public.classes for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy classes_admin_delete on public.classes for delete to authenticated using ((select private.is_admin()));

drop policy if exists coach_assignments_admin_write on public.coach_class_assignments;
create policy coach_assignments_admin_insert on public.coach_class_assignments for insert to authenticated with check ((select private.is_admin()));
create policy coach_assignments_admin_update on public.coach_class_assignments for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy coach_assignments_admin_delete on public.coach_class_assignments for delete to authenticated using ((select private.is_admin()));

drop policy if exists student_enrollments_admin_write on public.student_enrollments;
create policy student_enrollments_admin_insert on public.student_enrollments for insert to authenticated with check ((select private.is_admin()));
create policy student_enrollments_admin_update on public.student_enrollments for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy student_enrollments_admin_delete on public.student_enrollments for delete to authenticated using ((select private.is_admin()));

drop policy if exists homework_admin_write on public.homework;
drop policy if exists homework_coach_insert on public.homework;
drop policy if exists homework_coach_update on public.homework;
drop policy if exists homework_coach_delete on public.homework;
create policy homework_insert on public.homework for insert to authenticated
with check (
  (select private.is_admin())
  or ((select private.has_role('coach')) and created_by = (select auth.uid()) and private.coach_has_class(class_id))
);
create policy homework_update on public.homework for update to authenticated
using (
  (select private.is_admin())
  or (created_by = (select auth.uid()) and private.coach_has_class(class_id))
)
with check (
  (select private.is_admin())
  or (created_by = (select auth.uid()) and private.coach_has_class(class_id))
);
create policy homework_delete on public.homework for delete to authenticated
using (
  (select private.is_admin())
  or (created_by = (select auth.uid()) and private.coach_has_class(class_id))
);

drop policy if exists tournaments_admin_write on public.tournaments;
create policy tournaments_admin_insert on public.tournaments for insert to authenticated with check ((select private.is_admin()));
create policy tournaments_admin_update on public.tournaments for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy tournaments_admin_delete on public.tournaments for delete to authenticated using ((select private.is_admin()));

drop policy if exists tournament_registrations_admin_write on public.tournament_registrations;
drop policy if exists tournament_registrations_student_insert on public.tournament_registrations;
create policy tournament_registrations_insert on public.tournament_registrations for insert to authenticated
with check (
  (select private.is_admin())
  or (
    student_id = (select auth.uid())
    and (select private.has_role('student'))
    and exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and t.open_for_registration = true
        and (t.registration_deadline is null or t.registration_deadline >= now())
    )
  )
);
create policy tournament_registrations_admin_update on public.tournament_registrations for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy tournament_registrations_admin_delete on public.tournament_registrations for delete to authenticated
using ((select private.is_admin()));
