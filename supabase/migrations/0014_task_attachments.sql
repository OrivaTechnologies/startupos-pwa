-- Task attachments (e.g. photos), mirroring the ledger's receipts table and
-- private storage bucket pattern (0001/0002), but scoped to the tasks
-- module's own sharing/permission model (see 0009_tasks_sharing.sql)
-- instead of the ledger's fully-shared one.
create table public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  storage_path text not null,
  file_name text,
  content_type text,
  size_bytes bigint,
  uploaded_by uuid references public.profiles (id),
  uploaded_at timestamptz not null default now()
);
create index task_attachments_task_id_idx on public.task_attachments (task_id);

alter table public.task_attachments enable row level security;

-- Tasks are visible to every allowlisted user, so attachments are too;
-- managing one is limited the same way editing the task itself is (admin,
-- creator, or assignee).
create policy "task_attachments_select" on public.task_attachments
  for select using (public.is_allowed_user());
create policy "task_attachments_insert" on public.task_attachments
  for insert with check (
    public.is_allowed_user()
    and exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (public.is_admin() or t.user_id = auth.uid() or t.assignee_id = auth.uid())
    )
  );
create policy "task_attachments_delete" on public.task_attachments
  for delete using (
    public.is_allowed_user()
    and exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (public.is_admin() or t.user_id = auth.uid() or t.assignee_id = auth.uid())
    )
  );

-- Private bucket, same pattern as receipts: signed URLs only, never public.
insert into storage.buckets (id, name, public)
values ('task-attachments', 'task-attachments', false)
on conflict (id) do nothing;

create policy "allowlisted manage task attachments" on storage.objects
  for all
  using (bucket_id = 'task-attachments' and public.is_allowed_user())
  with check (bucket_id = 'task-attachments' and public.is_allowed_user());
