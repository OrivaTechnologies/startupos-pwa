-- Team-wide task inbox: drop the project/sprint model in favor of shared
-- tasks visible to everyone with Tasks access. Status workflow stays
-- three-state; "todo" becomes "pending", plus explicit archive.
-- Task attachments (photos, PDFs, etc.) stay on task_attachments +
-- the private task-attachments storage bucket (0014), with RLS aligned
-- to the new org-wide tasks model below.
--
-- Schema steps use IF NOT EXISTS / safe DO blocks so a failed partial
-- run can be retried; TRUNCATE still wipes task/sprint rows each time
-- this migration executes (one-time structural rework, not a data migration).

-- 0017 scoped numbering to projects — drop that before removing project_id.
drop trigger if exists tasks_set_number on public.tasks;
drop function if exists public.set_task_number();

-- 0016 policies call is_task_project_member() — drop them before the function.
drop policy if exists "sprints_select" on public.sprints;
drop policy if exists "sprints_insert" on public.sprints;
drop policy if exists "sprints_update" on public.sprints;
drop policy if exists "sprints_delete" on public.sprints;

drop policy if exists "tasks_select" on public.tasks;
drop policy if exists "tasks_insert" on public.tasks;
drop policy if exists "tasks_update" on public.tasks;
drop policy if exists "tasks_delete" on public.tasks;

drop policy if exists "task_attachments_select" on public.task_attachments;
drop policy if exists "task_attachments_insert" on public.task_attachments;
drop policy if exists "task_attachments_delete" on public.task_attachments;

drop policy if exists "task_projects_select" on public.task_projects;
drop policy if exists "task_projects_insert" on public.task_projects;
drop policy if exists "task_projects_update" on public.task_projects;
drop policy if exists "task_projects_delete" on public.task_projects;

drop policy if exists "task_project_members_select" on public.task_project_members;
drop policy if exists "task_project_members_insert" on public.task_project_members;
drop policy if exists "task_project_members_delete" on public.task_project_members;

drop function if exists public.is_task_project_member(uuid);

truncate table public.task_attachments, public.tasks, public.sprints cascade;

drop table if exists public.task_project_members;
drop table if exists public.task_projects cascade;

alter table public.tasks drop column if exists project_id;
alter table public.tasks drop column if exists sprint_id;
alter table public.tasks drop column if exists task_type;
alter table public.tasks drop column if exists priority;

alter table public.tasks
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references public.profiles (id);

create index if not exists tasks_archived_at_idx on public.tasks (archived_at);
create index if not exists tasks_assignee_id_idx on public.tasks (assignee_id);

do $$
begin
  alter type public.task_status rename value 'todo' to 'pending';
exception
  when duplicate_object then null;
  when undefined_object then null;
end
$$;

-- Team-wide TASK-n keys again (0015-style identity; table is empty after truncate).
do $$
begin
  alter table public.tasks alter column number add generated always as identity;
exception
  when duplicate_object then null;
  when sqlstate '42601' then null;
  when sqlstate '55000' then null;
end
$$;

drop table if exists public.sprints;
drop type if exists public.sprint_status;
drop type if exists public.task_type;
drop type if exists public.task_priority;

-- Org-wide visibility for anyone with Tasks tool access.
drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select" on public.tasks
  for select using (public.is_allowed_user() and public.has_tool_access('tasks'));

drop policy if exists "tasks_insert" on public.tasks;
create policy "tasks_insert" on public.tasks
  for insert with check (public.is_allowed_user() and public.has_tool_access('tasks'));

drop policy if exists "tasks_update" on public.tasks;
create policy "tasks_update" on public.tasks
  for update
  using (
    public.is_allowed_user() and public.has_tool_access('tasks')
    and (public.is_admin() or user_id = auth.uid() or assignee_id = auth.uid())
  )
  with check (
    public.is_allowed_user() and public.has_tool_access('tasks')
    and (public.is_admin() or user_id = auth.uid() or assignee_id = auth.uid())
  );

drop policy if exists "tasks_delete" on public.tasks;
create policy "tasks_delete" on public.tasks
  for delete using (
    public.is_allowed_user() and public.has_tool_access('tasks')
    and (public.is_admin() or user_id = auth.uid() or assignee_id = auth.uid())
  );

drop policy if exists "task_attachments_select" on public.task_attachments;
create policy "task_attachments_select" on public.task_attachments
  for select using (public.is_allowed_user() and public.has_tool_access('tasks'));

drop policy if exists "task_attachments_insert" on public.task_attachments;
create policy "task_attachments_insert" on public.task_attachments
  for insert with check (
    public.is_allowed_user() and public.has_tool_access('tasks')
    and exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (public.is_admin() or t.user_id = auth.uid() or t.assignee_id = auth.uid())
    )
  );

drop policy if exists "task_attachments_delete" on public.task_attachments;
create policy "task_attachments_delete" on public.task_attachments
  for delete using (
    public.is_allowed_user() and public.has_tool_access('tasks')
    and exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (public.is_admin() or t.user_id = auth.uid() or t.assignee_id = auth.uid())
    )
  );

-- Attachments storage: private bucket, signed URLs only; Tasks tool access required.
insert into storage.buckets (id, name, public)
values ('task-attachments', 'task-attachments', false)
on conflict (id) do nothing;

drop policy if exists "allowlisted manage task attachments" on storage.objects;
create policy "allowlisted manage task attachments" on storage.objects
  for all
  using (
    bucket_id = 'task-attachments'
    and public.is_allowed_user()
    and public.has_tool_access('tasks')
  )
  with check (
    bucket_id = 'task-attachments'
    and public.is_allowed_user()
    and public.has_tool_access('tasks')
  );
