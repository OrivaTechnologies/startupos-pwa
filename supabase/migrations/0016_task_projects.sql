-- Replaces the flat task_lists model with real Projects (Jira-style):
-- Backlog + Sprints scoped to a Project, with per-project Membership
-- controlling both visibility (full isolation — only members/admins may see
-- a project's tasks/sprints at all) and who's assignable within it.
-- Existing task/list/sprint data is wiped per explicit product decision —
-- this is a structural rework, not a data migration.

create table public.task_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
alter table public.task_projects enable row level security;

create table public.task_project_members (
  project_id uuid not null references public.task_projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index task_project_members_user_id_idx on public.task_project_members (user_id);
alter table public.task_project_members enable row level security;

-- Admins bypass, same convention as is_admin()/has_tool_access() elsewhere.
create function public.is_task_project_member(check_project_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select
    public.is_admin()
    or exists (
      select 1 from public.task_project_members m
      where m.project_id = check_project_id and m.user_id = auth.uid()
    );
$$;
grant execute on function public.is_task_project_member to authenticated;

-- task_projects: full isolation — select requires membership, not just tool access.
create policy "task_projects_select" on public.task_projects
  for select using (
    public.is_allowed_user() and public.has_tool_access('tasks')
    and public.is_task_project_member(id)
  );
create policy "task_projects_insert" on public.task_projects
  for insert with check (
    public.is_allowed_user() and public.has_tool_access('tasks') and public.is_admin()
  );
create policy "task_projects_update" on public.task_projects
  for update
  using (public.is_allowed_user() and public.has_tool_access('tasks') and public.is_admin())
  with check (public.is_allowed_user() and public.has_tool_access('tasks') and public.is_admin());
create policy "task_projects_delete" on public.task_projects
  for delete using (public.is_allowed_user() and public.has_tool_access('tasks') and public.is_admin());

-- task_project_members: members can see their own project's roster; admin manages.
create policy "task_project_members_select" on public.task_project_members
  for select using (
    public.is_allowed_user() and public.has_tool_access('tasks')
    and public.is_task_project_member(project_id)
  );
create policy "task_project_members_insert" on public.task_project_members
  for insert with check (
    public.is_allowed_user() and public.has_tool_access('tasks') and public.is_admin()
  );
create policy "task_project_members_delete" on public.task_project_members
  for delete using (
    public.is_allowed_user() and public.has_tool_access('tasks') and public.is_admin()
  );

-- Wipe existing task data — the list-based model is being fully replaced,
-- not migrated (explicit product decision).
truncate table public.task_attachments, public.tasks, public.sprints cascade;

-- sprints: move from a single global active sprint to one active sprint
-- per project.
drop index public.sprints_single_active_idx;
alter table public.sprints add column project_id uuid not null references public.task_projects (id);
create index sprints_project_id_idx on public.sprints (project_id);
create unique index sprints_single_active_idx on public.sprints (project_id) where status = 'active';

drop policy "sprints_select" on public.sprints;
create policy "sprints_select" on public.sprints
  for select using (
    public.is_allowed_user() and public.has_tool_access('tasks')
    and public.is_task_project_member(project_id)
  );
drop policy "sprints_insert" on public.sprints;
create policy "sprints_insert" on public.sprints
  for insert with check (
    public.is_allowed_user() and public.has_tool_access('tasks') and public.is_admin()
  );
drop policy "sprints_update" on public.sprints;
create policy "sprints_update" on public.sprints
  for update
  using (public.is_allowed_user() and public.has_tool_access('tasks') and public.is_admin())
  with check (public.is_allowed_user() and public.has_tool_access('tasks') and public.is_admin());
drop policy "sprints_delete" on public.sprints;
create policy "sprints_delete" on public.sprints
  for delete using (public.is_allowed_user() and public.has_tool_access('tasks') and public.is_admin());

-- tasks: list_id/task_lists is gone, replaced by project_id. Mutate stays
-- admin/creator/assignee-gated (unchanged), plus project membership.
alter table public.tasks drop column list_id;
alter table public.tasks add column project_id uuid not null references public.task_projects (id);
create index tasks_project_id_idx on public.tasks (project_id);

drop policy "tasks_select" on public.tasks;
create policy "tasks_select" on public.tasks
  for select using (
    public.is_allowed_user() and public.has_tool_access('tasks')
    and public.is_task_project_member(project_id)
  );
drop policy "tasks_insert" on public.tasks;
create policy "tasks_insert" on public.tasks
  for insert with check (
    public.is_allowed_user() and public.has_tool_access('tasks')
    and public.is_task_project_member(project_id)
  );
drop policy "tasks_update" on public.tasks;
create policy "tasks_update" on public.tasks
  for update
  using (
    public.is_allowed_user() and public.has_tool_access('tasks')
    and public.is_task_project_member(project_id)
    and (public.is_admin() or user_id = auth.uid() or assignee_id = auth.uid())
  )
  with check (
    public.is_allowed_user() and public.has_tool_access('tasks')
    and public.is_task_project_member(project_id)
    and (public.is_admin() or user_id = auth.uid() or assignee_id = auth.uid())
  );
drop policy "tasks_delete" on public.tasks;
create policy "tasks_delete" on public.tasks
  for delete using (
    public.is_allowed_user() and public.has_tool_access('tasks')
    and public.is_task_project_member(project_id)
    and (public.is_admin() or user_id = auth.uid() or assignee_id = auth.uid())
  );

-- task_attachments: visibility/mutation must follow the task's project
-- isolation too, not just is_allowed_user().
drop policy "task_attachments_select" on public.task_attachments;
create policy "task_attachments_select" on public.task_attachments
  for select using (
    public.is_allowed_user()
    and exists (
      select 1 from public.tasks t
      where t.id = task_id and public.is_task_project_member(t.project_id)
    )
  );
drop policy "task_attachments_insert" on public.task_attachments;
create policy "task_attachments_insert" on public.task_attachments
  for insert with check (
    public.is_allowed_user()
    and exists (
      select 1 from public.tasks t
      where t.id = task_id
        and public.is_task_project_member(t.project_id)
        and (public.is_admin() or t.user_id = auth.uid() or t.assignee_id = auth.uid())
    )
  );
drop policy "task_attachments_delete" on public.task_attachments;
create policy "task_attachments_delete" on public.task_attachments
  for delete using (
    public.is_allowed_user()
    and exists (
      select 1 from public.tasks t
      where t.id = task_id
        and public.is_task_project_member(t.project_id)
        and (public.is_admin() or t.user_id = auth.uid() or t.assignee_id = auth.uid())
    )
  );

-- task_lists is fully replaced by task_projects — drop it and its policies.
drop table public.task_lists cascade;
