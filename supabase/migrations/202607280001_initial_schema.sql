create extension if not exists pgcrypto;

create type public.user_role as enum ('reader', 'admin');
create type public.post_status as enum ('draft', 'published', 'archived');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role public.user_role not null default 'reader',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  slug text not null unique,
  excerpt text not null default '',
  content text not null default '',
  category text not null default 'Ghi chép',
  cover_url text,
  status public.post_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  is_approved boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  subscribed_at timestamptz not null default now(),
  is_active boolean not null default true
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'); $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.post_likes enable row level security;
alter table public.newsletter_subscribers enable row level security;

create policy "Profiles are publicly readable" on public.profiles for select using (true);
create policy "Users update their own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "Admins manage profiles" on public.profiles for all using (public.is_admin()) with check (public.is_admin());

create policy "Published posts are publicly readable" on public.posts for select using (status = 'published' or public.is_admin());
create policy "Admins manage posts" on public.posts for all using (public.is_admin()) with check (public.is_admin());

create policy "Approved comments are publicly readable" on public.comments for select using (is_approved or auth.uid() = author_id or public.is_admin());
create policy "Authenticated users create comments" on public.comments for insert to authenticated with check (auth.uid() = author_id);
create policy "Users update their own comments" on public.comments for update to authenticated using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "Users delete their own comments" on public.comments for delete to authenticated using (auth.uid() = author_id or public.is_admin());

create policy "Likes are publicly readable" on public.post_likes for select using (true);
create policy "Users create their own likes" on public.post_likes for insert to authenticated with check (auth.uid() = user_id);
create policy "Users remove their own likes" on public.post_likes for delete to authenticated using (auth.uid() = user_id);

create policy "Anyone can subscribe to the newsletter" on public.newsletter_subscribers for insert with check (true);
create policy "Admins manage newsletter subscribers" on public.newsletter_subscribers for all using (public.is_admin()) with check (public.is_admin());

create index posts_status_published_at_idx on public.posts(status, published_at desc);
create index comments_post_created_at_idx on public.comments(post_id, created_at);
