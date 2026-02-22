-- File Uploads Table
create table file_uploads (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  file_path text not null,
  original_name text not null,
  feature text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table file_uploads enable row level security;

create policy "Users can view their own file uploads"
  on file_uploads for select
  using (auth.uid() = user_id);

create policy "Users can insert their own file uploads"
  on file_uploads for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own file uploads"
  on file_uploads for delete
  using (auth.uid() = user_id);
