-- Commercial recommendation resource inventory
-- 用于承接课程、营地、亲子游、医疗/护理等商业资源。
-- 家庭行为只匹配到标签，不在此表存储家庭隐私原文。

create table if not exists public.commercial_resources (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('education', 'travel', 'healthcare')),
  kind text not null check (kind in (
    'course',
    'camp',
    'learning_tool',
    'parent_child_trip',
    'medical_service',
    'care_service'
  )),
  title text not null,
  provider_name text not null,
  scenario_tags text[] not null default '{}',
  family_stage_tags text[] not null default '{}',
  city_level_tags text[] not null default '{}',
  category_tags text[] not null default '{}',
  holiday_play_scales text[] not null default '{}',
  holiday_play_modes text[] not null default '{}',
  caregiver_load_tags text[] not null default '{}',
  budget_level_tags text[] not null default '{}',
  effort_level_tags text[] not null default '{}',
  priority_boost integer not null default 0,
  action_label text not null,
  destination text not null,
  selling_point text not null,
  active boolean not null default true,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists commercial_resources_active_category_idx
  on public.commercial_resources (active, category, priority_boost desc);

create index if not exists commercial_resources_scenario_tags_idx
  on public.commercial_resources using gin (scenario_tags);

create index if not exists commercial_resources_category_tags_idx
  on public.commercial_resources using gin (category_tags);

create index if not exists commercial_resources_holiday_play_scales_idx
  on public.commercial_resources using gin (holiday_play_scales);

create index if not exists commercial_resources_holiday_play_modes_idx
  on public.commercial_resources using gin (holiday_play_modes);

alter table public.commercial_resources enable row level security;

drop policy if exists "public can read active commercial resources" on public.commercial_resources;
create policy "public can read active commercial resources"
  on public.commercial_resources
  for select
  using (active = true);

-- 管理端写入策略后续接后台角色/service role，不开放普通家庭账号写入。
