create table public.board_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

create table public.board_topics (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.board_categories(id) on delete restrict,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 140),
  pinned boolean not null default false,
  locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.board_posts (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.board_topics(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 2 and 5000),
  hidden_at timestamptz,
  hidden_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index board_categories_sort_idx on public.board_categories(sort_order, name);
create index board_topics_category_updated_idx on public.board_topics(category_id, pinned desc, updated_at desc);
create index board_posts_topic_created_idx on public.board_posts(topic_id, created_at);
create index board_posts_author_topic_idx on public.board_posts(author_id, topic_id);

create trigger board_topics_touch_updated_at
before update on public.board_topics
for each row execute function public.touch_updated_at();

create trigger board_posts_touch_updated_at
before update on public.board_posts
for each row execute function public.touch_updated_at();

create or replace function public.touch_board_topic_from_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.board_topics
  set updated_at = now()
  where id = new.topic_id;
  return new;
end;
$$;

create trigger board_posts_touch_topic
after insert on public.board_posts
for each row execute function public.touch_board_topic_from_post();

insert into public.board_categories (name, slug, sort_order)
values
  ('Signs', 'signs', 10),
  ('Volunteers', 'volunteers', 20),
  ('Calgary', 'calgary', 30),
  ('Edmonton', 'edmonton', 40),
  ('North', 'north', 50),
  ('Central', 'central', 60),
  ('South', 'south', 70),
  ('Rural', 'rural', 80)
on conflict (slug) do update
set name = excluded.name,
    sort_order = excluded.sort_order;

alter table public.board_categories enable row level security;
alter table public.board_topics enable row level security;
alter table public.board_posts enable row level security;

create policy "board_categories_select_authenticated" on public.board_categories
for select using (auth.uid() is not null);

create policy "board_categories_admin_all" on public.board_categories
for all using (public.is_admin()) with check (public.is_admin());

create policy "board_topics_select_authenticated" on public.board_topics
for select using (auth.uid() is not null);

create policy "board_topics_insert_authenticated" on public.board_topics
for insert with check (author_id = auth.uid());

create policy "board_topics_update_admin" on public.board_topics
for update using (public.is_admin()) with check (public.is_admin());

create policy "board_posts_select_authenticated_visible" on public.board_posts
for select using (auth.uid() is not null and (hidden_at is null or public.is_admin()));

create policy "board_posts_insert_authenticated_unlocked" on public.board_posts
for insert with check (
  author_id = auth.uid()
  and exists (
    select 1
    from public.board_topics t
    where t.id = board_posts.topic_id
      and t.locked = false
  )
);

create policy "board_posts_update_admin" on public.board_posts
for update using (public.is_admin()) with check (public.is_admin());
