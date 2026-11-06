-- EduSmart: skema database. Jalankan di Supabase > SQL Editor.
create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'student' check (role in ('admin','teacher','student')),
  nis text,
  major text,
  created_at timestamptz not null default now()
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null default '',
  description text not null default '',
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  schedule_day text,
  schedule_time text,
  room text,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (class_id, student_id)
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  title text not null,
  type text not null default 'document' check (type in ('document','video','module')),
  url text,
  content text,
  created_at timestamptz not null default now()
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  title text not null,
  description text not null default '',
  due_date timestamptz,
  max_score numeric not null default 100 check (max_score > 0),
  created_at timestamptz not null default now()
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  content text,
  file_url text,
  score numeric,
  feedback text,
  submitted_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  title text not null,
  duration_minutes int not null default 30 check (duration_minutes > 0),
  passing_score int not null default 70,
  created_at timestamptz not null default now()
);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  question text not null,
  options jsonb not null,
  correct_index int not null,
  points int not null default 10,
  position int not null default 0
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  score numeric not null,
  passed boolean not null,
  answers jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (quiz_id, student_id)
);

create table public.activity_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  action text not null,
  created_at timestamptz not null default now()
);

create index on public.classes (teacher_id);
create index on public.enrollments (student_id);
create index on public.materials (class_id);
create index on public.assignments (class_id);
create index on public.submissions (student_id);
create index on public.quizzes (class_id);
create index on public.quiz_attempts (student_id);
create index on public.activity_logs (user_id, created_at);
create index on public.activity_logs (class_id, created_at);

-- Profil dibuat otomatis saat pengguna mendaftar lewat Supabase Auth.
-- Peran 'admin' tidak bisa dipilih saat mendaftar.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role, nis, major)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    case when new.raw_user_meta_data->>'role' in ('teacher','student')
         then new.raw_user_meta_data->>'role' else 'student' end,
    new.raw_user_meta_data->>'nis',
    new.raw_user_meta_data->>'major'
  );
  return new;
end; $$;

create trigger on_auth_user_created
after insert on auth.users for each row execute function public.handle_new_user();

-- Semua akses data lewat backend (service role). RLS diaktifkan tanpa policy
-- sehingga klien yang memakai anon key tidak bisa membaca tabel secara langsung.
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;
