-- ============================================================
-- 计划管理功能 — 数据库迁移脚本
-- ============================================================

-- 1. plans 表（计划）
create table if not exists plans (
  id uuid default uuid_generate_v4() primary key,
  family_id uuid references families(id) on delete cascade,
  name text not null,
  type text not null default 'custom',   -- 计划类型：寒假/暑假/学期/年级/自定义
  metadata jsonb not null default '{}'::jsonb,
  sort_order integer default 0,          -- 排序
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

comment on table plans is '计划表，用于组织目标和心愿';
comment on column plans.type is '计划类型：寒假/暑假/学期/年级/自定义';
comment on column plans.metadata is '计划扩展数据：日程模板、年级、时区、固定活动等';

alter table plans add column if not exists metadata jsonb not null default '{}'::jsonb;

-- 2. 为 tasks 表添加 plan_id 字段
alter table tasks add column if not exists plan_id uuid references plans(id) on delete set null;

-- 3. 为 habits 表添加 plan_id 字段
alter table habits add column if not exists plan_id uuid references plans(id) on delete set null;

-- 4. 为 rewards 表添加 plan_id 字段
alter table rewards add column if not exists plan_id uuid references plans(id) on delete set null;

-- 5. 索引
create index if not exists idx_plans_family_id on plans(family_id);
create index if not exists idx_tasks_plan_id on tasks(plan_id);
create index if not exists idx_habits_plan_id on habits(plan_id);
create index if not exists idx_rewards_plan_id on rewards(plan_id);

-- 完成
select '计划管理迁移完成！' as result;
