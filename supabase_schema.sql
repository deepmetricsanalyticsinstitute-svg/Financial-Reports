-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- User Settings Table
create table user_settings (
  user_id uuid references auth.users not null primary key,
  company_name text,
  period text,
  currency_sign text,
  base_currency text,
  currencies jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table user_settings enable row level security;

create policy "Users can view their own settings"
  on user_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert their own settings"
  on user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own settings"
  on user_settings for update
  using (auth.uid() = user_id);

-- Custom Groups Table
create table custom_groups (
  id text primary key,
  user_id uuid references auth.users not null,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table custom_groups enable row level security;

create policy "Users can view their own custom groups"
  on custom_groups for select
  using (auth.uid() = user_id);

create policy "Users can insert their own custom groups"
  on custom_groups for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own custom groups"
  on custom_groups for update
  using (auth.uid() = user_id);

create policy "Users can delete their own custom groups"
  on custom_groups for delete
  using (auth.uid() = user_id);

-- Accounts Table
create table accounts (
  id text primary key,
  user_id uuid references auth.users not null,
  code text not null,
  name text not null,
  type text not null,
  debit numeric default 0,
  credit numeric default 0,
  category text,
  note text,
  custom_group_id text references custom_groups(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table accounts enable row level security;

create policy "Users can view their own accounts"
  on accounts for select
  using (auth.uid() = user_id);

create policy "Users can insert their own accounts"
  on accounts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own accounts"
  on accounts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own accounts"
  on accounts for delete
  using (auth.uid() = user_id);

-- Transactions Table
create table transactions (
  id text primary key,
  user_id uuid references auth.users not null,
  date text not null,
  account_id text references accounts(id) on delete cascade,
  description text,
  amount numeric default 0,
  reference text,
  original_currency text,
  original_amount numeric,
  exchange_rate numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table transactions enable row level security;

create policy "Users can view their own transactions"
  on transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own transactions"
  on transactions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own transactions"
  on transactions for update
  using (auth.uid() = user_id);

create policy "Users can delete their own transactions"
  on transactions for delete
  using (auth.uid() = user_id);

-- Report Templates Table
create table report_templates (
  id text primary key,
  user_id uuid references auth.users not null,
  name text not null,
  report_type text not null,
  hidden_categories jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table report_templates enable row level security;

create policy "Users can view their own report templates"
  on report_templates for select
  using (auth.uid() = user_id);

create policy "Users can insert their own report templates"
  on report_templates for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own report templates"
  on report_templates for update
  using (auth.uid() = user_id);

create policy "Users can delete their own report templates"
  on report_templates for delete
  using (auth.uid() = user_id);

-- Journal Templates Table
create table journal_templates (
  id text primary key,
  user_id uuid references auth.users not null,
  name text not null,
  memo text,
  lines jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table journal_templates enable row level security;

create policy "Users can view their own journal templates"
  on journal_templates for select
  using (auth.uid() = user_id);

create policy "Users can insert their own journal templates"
  on journal_templates for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own journal templates"
  on journal_templates for update
  using (auth.uid() = user_id);

create policy "Users can delete their own journal templates"
  on journal_templates for delete
  using (auth.uid() = user_id);

-- Journal Line Templates Table
create table journal_line_templates (
  id text primary key,
  user_id uuid references auth.users not null,
  name text not null,
  account_id text references accounts(id) on delete cascade,
  description text,
  debit numeric default 0,
  credit numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table journal_line_templates enable row level security;

create policy "Users can view their own journal line templates"
  on journal_line_templates for select
  using (auth.uid() = user_id);

create policy "Users can insert their own journal line templates"
  on journal_line_templates for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own journal line templates"
  on journal_line_templates for update
  using (auth.uid() = user_id);

create policy "Users can delete their own journal line templates"
  on journal_line_templates for delete
  using (auth.uid() = user_id);
