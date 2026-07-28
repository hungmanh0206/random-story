create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.categories (name, slug) values
  ('Công nghệ', 'cong-nghe'),
  ('Sách', 'sach'),
  ('Du lịch', 'du-lich'),
  ('Sống chậm', 'song-cham'),
  ('Ghi chép', 'ghi-chep')
on conflict (name) do nothing;

alter table public.categories enable row level security;

create policy "Categories are publicly readable"
  on public.categories for select using (true);

create policy "Admins manage categories"
  on public.categories for all
  using (public.is_admin())
  with check (public.is_admin());

alter table public.posts
  add constraint posts_category_fkey
  foreign key (category) references public.categories(name)
  on update cascade on delete restrict;
