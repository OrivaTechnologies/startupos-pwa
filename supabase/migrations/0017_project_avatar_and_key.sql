-- Project avatar + key prefix (Jira-style task keys, e.g. CTZN-12) and
-- per-project sequential task numbering (was a single global identity
-- column — now every project starts its own tasks at #1).

-- Project avatar: private bucket, one replaceable image per project (fixed
-- path, upsert on re-upload) — same private-bucket-plus-signed-URL pattern
-- as task-attachments/receipts, blanket is_allowed_user() storage policy
-- (project isolation lives on the DB tables, not storage, matching how
-- task-attachments already does it).
insert into storage.buckets (id, name, public)
values ('project-avatars', 'project-avatars', false)
on conflict (id) do nothing;

create policy "allowlisted manage project avatars" on storage.objects
  for all
  using (bucket_id = 'project-avatars' and public.is_allowed_user())
  with check (bucket_id = 'project-avatars' and public.is_allowed_user());

alter table public.task_projects add column avatar_path text;

-- Key prefix: short, unique, admin-set at creation, editable after.
alter table public.task_projects add column key_prefix text;
-- Backfill any projects created before this migration with a safe
-- placeholder — admin can fix the real prefix via the Edit dialog.
with numbered as (
  select id, row_number() over (order by created_at) as rn
  from public.task_projects
  where key_prefix is null
)
update public.task_projects tp
set key_prefix = 'PROJ' || numbered.rn
from numbered
where tp.id = numbered.id;
alter table public.task_projects alter column key_prefix set not null;
alter table public.task_projects
  add constraint task_projects_key_prefix_format check (key_prefix ~ '^[A-Z][A-Z0-9]{1,9}$'),
  add constraint task_projects_key_prefix_unique unique (key_prefix);

-- Per-project task numbering: drop the global identity column, replace with
-- a counter on task_projects incremented atomically inside a trigger. The
-- UPDATE...RETURNING takes an implicit row lock on the task_projects row,
-- so concurrent inserts into the same project serialize safely (same
-- guarantee an identity column gave, just scoped per project instead of
-- global).
alter table public.tasks alter column number drop identity;
alter table public.task_projects add column next_task_number integer not null default 1;

-- One-time renumbering of whatever tasks already exist, per project, in
-- creation order — so numbering is consistent from this point on rather
-- than mixing old global numbers with new per-project ones.
with numbered as (
  select id, row_number() over (partition by project_id order by created_at) as rn
  from public.tasks
)
update public.tasks t set number = numbered.rn from numbered where t.id = numbered.id;

update public.task_projects tp
set next_task_number = coalesce((select max(number) + 1 from public.tasks where project_id = tp.id), 1);

create function public.set_task_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_num integer;
begin
  update public.task_projects
  set next_task_number = next_task_number + 1
  where id = new.project_id
  returning next_task_number - 1 into next_num;
  new.number := next_num;
  return new;
end;
$$;

create trigger tasks_set_number
  before insert on public.tasks
  for each row execute function public.set_task_number();
