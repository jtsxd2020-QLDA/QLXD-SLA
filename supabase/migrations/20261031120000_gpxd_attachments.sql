create table if not exists public.ttxd_attachments (
  id uuid primary key default gen_random_uuid(),
  record_kind text not null check (record_kind in ('permit','inspection')),
  record_id uuid not null,
  storage_path text not null unique,
  file_name text not null check (char_length(file_name) between 1 and 255),
  content_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 15728640),
  status text not null default 'pending' check (status in ('pending','ready')),
  created_by text not null,
  uploaded_at timestamptz not null default now(),
  captured_at timestamptz,
  captured_lat double precision,
  captured_lng double precision,
  check ((captured_lat is null) = (captured_lng is null))
);
create index if not exists ttxd_attachments_record_idx on public.ttxd_attachments(record_kind,record_id,status,uploaded_at desc);
alter table public.ttxd_attachments enable row level security;
revoke all on table public.ttxd_attachments from anon, authenticated;
grant all on table public.ttxd_attachments to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('qlxd-private-attachments','qlxd-private-attachments',false,15728640,array['application/pdf','image/png','image/jpeg','image/webp','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
