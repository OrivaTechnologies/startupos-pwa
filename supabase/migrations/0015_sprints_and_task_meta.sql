-- Sprints (create/close, one active at a time, backlog = tasks.sprint_id
-- null) plus task type/priority and a human-readable task key. Sprint
-- create/close is admin-only (app-level, see app/(app)/sprints/actions.ts);
-- everyone with tasks access can read sprints, since the sprint picker on
-- the task form is available on mobile too.

create type public.sprint_status as enum ('upcoming', 'active', 'closed');
create type public.task_type as enum ('bug', 'new_requirement', 'enhancement', 'other');
create type public.task_priority as enum ('low', 'medium', 'high', 'critical');

create table public.sprints (
  id uuid primary key default gen_random_uuid(),
  number integer generated always as identity,
  start_date date not null,
  end_date date not null,
  status public.sprint_status not null default 'upcoming',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint sprints_dates_valid check (end_date >= start_date)
);

-- Only one sprint may be active at a time. App-level logic
-- (app/(app)/sprints/actions.ts) is the primary enforcement path — this
-- index is a safety net against races/bugs, same spirit as the completed_at
-- trigger in 0013_task_status.sql being a consistency backstop.
create unique index sprints_single_active_idx on public.sprints ((true)) where status = 'active';

alter table public.sprints enable row level security;

create policy "sprints_select" on public.sprints
  for select using (public.is_allowed_user() and public.has_tool_access('tasks'));
create policy "sprints_insert" on public.sprints
  for insert with check (
    public.is_allowed_user() and public.has_tool_access('tasks') and public.is_admin()
  );
create policy "sprints_update" on public.sprints
  for update
  using (public.is_allowed_user() and public.has_tool_access('tasks') and public.is_admin())
  with check (public.is_allowed_user() and public.has_tool_access('tasks') and public.is_admin());
create policy "sprints_delete" on public.sprints
  for delete using (public.is_allowed_user() and public.has_tool_access('tasks') and public.is_admin());

alter table public.tasks
  add column sprint_id uuid references public.sprints (id),
  add column task_type public.task_type not null default 'other',
  add column priority public.task_priority not null default 'medium',
  add column number integer generated always as identity;
create index tasks_sprint_id_idx on public.tasks (sprint_id);
