-- ============================================================
-- Forest Family — Supabase 数据库建表脚本（最终版）
-- 执行方式：复制全部内容 → Supabase Dashboard → SQL Editor → Run
-- 本脚本可重复执行（幂等设计）
-- ============================================================

-- 如需从头重建，取消下面几行的注释后执行（会清空所有数据！）：
-- drop table if exists analytics_events cascade;
-- drop table if exists star_transactions cascade;
-- drop table if exists rewards cascade;
-- drop table if exists habits cascade;
-- drop table if exists tasks cascade;
-- drop table if exists members cascade;
-- drop table if exists families cascade;

-- 启用必要扩展
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. families 表（家庭）
-- ============================================================
create table if not exists families (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  invite_code text unique,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

comment on table families is '家庭主表，一个家庭对应多个成员';
comment on column families.invite_code is '家庭邀请码（大写，唯一）';

-- 如果表已存在但缺少新字段，则补充
alter table families add column if not exists invite_code text unique;
alter table families add column if not exists updated_at timestamp with time zone default now();

-- ============================================================
-- 2. members 表（家庭成员）
-- ============================================================
-- 注意：members.id = auth.users.id，RLS 策略通过 auth.uid() 匹配
create table if not exists members (
  id uuid primary key references auth.users(id) on delete cascade,
  family_id uuid references families(id) on delete cascade,
  name text not null,
  avatar text,
  role text check (role in ('parent', 'child')) not null,
  stars integer default 0,
  color text default '#4CAF50',
  pin text,
  password text,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

comment on table members is '家庭成员表：id = auth.users.id，通过外键关联 Supabase Auth';
comment on column members.avatar is '头像路径，如 /avatars/boy/xxx.png';
comment on column members.pin is '子账户 PIN 码（可选，儿童账户用）';

-- 补充已存在表可能缺少的字段
alter table members add column if not exists family_id uuid references families(id) on delete cascade;
alter table members add column if not exists avatar text;
alter table members add column if not exists role text check (role in ('parent', 'child'));
alter table members add column if not exists stars integer default 0;
alter table members add column if not exists color text default '#4CAF50';
alter table members add column if not exists pin text;
alter table members add column if not exists password text;
alter table members add column if not exists is_active boolean default true;
alter table members add column if not exists updated_at timestamp with time zone default now();

-- ============================================================
-- 3. tasks 表（任务/目标）
-- ============================================================
create table if not exists tasks (
  id uuid default uuid_generate_v4() primary key,
  family_id uuid references families(id) on delete cascade,
  title text not null,
  description text,
  star_amount integer not null default 0,
  assignee_ids uuid[] not null default '{}',
  creator_id uuid references members(id),
  status text check (status in ('pending', 'in_progress', 'reviewing', 'completed')) default 'pending',
  is_habit boolean default false,
  target_count integer default 1,
  current_count integer default 0,
  completed boolean default false,
  completed_at timestamp with time zone,
  icon text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

comment on table tasks is '任务表，同时支持一次性任务和习惯打卡';
comment on column tasks.assignee_ids is '被分配成员 ID 数组（uuid[]）';
comment on column tasks.star_amount is '完成奖励星星数';
comment on column tasks.status is 'pending=待完成, in_progress=进行中, reviewing=待家长确认, completed=已完成';
comment on column tasks.is_habit is '是否为习惯打卡任务';

-- 补充已存在表可能缺少的字段
alter table tasks add column if not exists assignee_ids uuid[] not null default '{}';
alter table tasks add column if not exists status text check (status in ('pending', 'in_progress', 'reviewing', 'completed')) default 'pending';
alter table tasks add column if not exists is_habit boolean default false;
alter table tasks add column if not exists target_count integer default 1;
alter table tasks add column if not exists current_count integer default 0;
alter table tasks add column if not exists completed boolean default false;
alter table tasks add column if not exists icon text;

-- ============================================================
-- 4. habits 表（习惯打卡，与 tasks 保持结构一致）
-- ============================================================
create table if not exists habits (
  id uuid default uuid_generate_v4() primary key,
  family_id uuid references families(id) on delete cascade,
  title text not null,
  description text,
  star_amount integer not null default 0,
  assignee_ids uuid[] not null default '{}',
  creator_id uuid references members(id),
  frequency text check (frequency in ('daily', 'weekly', 'custom')),
  current_count integer default 0,
  target_count integer default 1,
  last_completed_date date,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

comment on table habits is '习惯打卡表';
comment on column habits.assignee_ids is '被分配成员 ID 数组（uuid[]）';

-- 补充已存在表可能缺少的字段
alter table habits add column if not exists assignee_ids uuid[] not null default '{}';
alter table habits add column if not exists creator_id uuid references members(id);
alter table habits add column if not exists frequency text check (frequency in ('daily', 'weekly', 'custom'));
alter table habits add column if not exists last_completed_date date;

-- ============================================================
-- 5. rewards 表（心愿/奖励）
-- ============================================================
create table if not exists rewards (
  id uuid default uuid_generate_v4() primary key,
  family_id uuid references families(id) on delete cascade,
  name text not null,
  description text,
  star_cost integer not null,
  icon text,
  image_url text,
  category text,
  stock integer,
  status text check (status in ('available', 'pending_approval', 'redeemed')) default 'available',
  creator_id uuid references members(id),
  redeemed_by uuid references members(id),
  redeemed_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

comment on table rewards is '心愿/奖励表';
comment on column rewards.star_cost is '兑换所需星星数';
comment on column rewards.status is 'available=可兑换, pending_approval=待家长确认, redeemed=已兑换';

-- 补充已存在表可能缺少的字段
alter table rewards add column if not exists star_cost integer;
alter table rewards add column if not exists icon text;
alter table rewards add column if not exists image_url text;
alter table rewards add column if not exists category text;
alter table rewards add column if not exists stock integer;
alter table rewards add column if not exists status text check (status in ('available', 'pending_approval', 'redeemed')) default 'available';
alter table rewards add column if not exists creator_id uuid references members(id);
alter table rewards add column if not exists redeemed_by uuid references members(id);
alter table rewards add column if not exists redeemed_at timestamp with time zone;

-- ============================================================
-- 6. star_transactions 表（星星流水）
-- ============================================================
create table if not exists star_transactions (
  id uuid default uuid_generate_v4() primary key,
  family_id uuid references families(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  amount integer not null,
  type text check (type in ('earn', 'spend')) not null,
  reason text not null,
  related_task_id uuid references tasks(id) on delete set null,
  related_habit_id uuid references habits(id) on delete set null,
  related_reward_id uuid references rewards(id) on delete set null,
  created_at timestamp with time zone default now()
);

comment on table star_transactions is '星星变动流水，记录每次收入/支出';
comment on column star_transactions.amount is '正数为收入，负数为支出';

-- ============================================================
-- 7. analytics_events 表（行为日志）
-- ============================================================
create table if not exists analytics_events (
  id uuid default uuid_generate_v4() primary key,
  family_id uuid references families(id) on delete cascade,
  member_id uuid references members(id) on delete set null,
  event_name text not null,
  event_data jsonb default '{}',
  created_at timestamp with time zone default now()
);

comment on table analytics_events is '用户行为日志，用于后期数据分析';

-- ============================================================
-- 索引（性能优化）
-- ============================================================
create index if not exists idx_members_family_id on members(family_id);
create index if not exists idx_tasks_family_id on tasks(family_id);
create index if not exists idx_tasks_status on tasks(status);
create index if not exists idx_habits_family_id on habits(family_id);
create index if not exists idx_rewards_family_id on rewards(family_id);
create index if not exists idx_rewards_status on rewards(status);
create index if not exists idx_star_transactions_member_id on star_transactions(member_id);
create index if not exists idx_star_transactions_family_id on star_transactions(family_id);
create index if not exists idx_analytics_events_family_id on analytics_events(family_id);
create index if not exists idx_analytics_events_created_at on analytics_events(created_at);

-- ============================================================
-- 自动更新 updated_at 的触发器
-- ============================================================
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger update_families_updated_at before update on families
  for each row execute function update_updated_at_column();

create or replace trigger update_members_updated_at before update on members
  for each row execute function update_updated_at_column();

create or replace trigger update_tasks_updated_at before update on tasks
  for each row execute function update_updated_at_column();

create or replace trigger update_habits_updated_at before update on habits
  for each row execute function update_updated_at_column();

create or replace trigger update_rewards_updated_at before update on rewards
  for each row execute function update_updated_at_column();

-- ============================================================
-- 启用行级安全策略（RLS）
-- ============================================================
alter table families enable row level security;
alter table members enable row level security;
alter table tasks enable row level security;
alter table habits enable row level security;
alter table rewards enable row level security;
alter table star_transactions enable row level security;
alter table analytics_events enable row level security;

-- ============================================================
-- RLS 策略：用户只能访问自己家庭的数据
-- ============================================================
-- families：用户只能查看自己所在的家庭
drop policy if exists "Users can view own family" on families;
create policy "Users can view own family"
  on families for select
  using (id in (select family_id from members where id = auth.uid()));

-- members：用户只能查看/更新自己家庭的成员
drop policy if exists "Users can view own family members" on members;
create policy "Users can view own family members"
  on members for select
  using (family_id in (select family_id from members where id = auth.uid()));

drop policy if exists "Users can update own profile" on members;
create policy "Users can update own profile"
  on members for update
  using (id = auth.uid());

drop policy if exists "Parents can manage family members" on members;
create policy "Parents can manage family members"
  on members for all
  using (
    family_id in (
      select family_id from members
      where id = auth.uid() and role = 'parent'
    )
  );

-- tasks：用户只能查看/管理自己家庭的任务
drop policy if exists "Users can view own family tasks" on tasks;
create policy "Users can view own family tasks"
  on tasks for select
  using (family_id in (select family_id from members where id = auth.uid()));

drop policy if exists "Users can manage own family tasks" on tasks;
create policy "Users can manage own family tasks"
  on tasks for all
  using (family_id in (select family_id from members where id = auth.uid()));

-- habits：同上
drop policy if exists "Users can view own family habits" on habits;
create policy "Users can view own family habits"
  on habits for select
  using (family_id in (select family_id from members where id = auth.uid()));

drop policy if exists "Users can manage own family habits" on habits;
create policy "Users can manage own family habits"
  on habits for all
  using (family_id in (select family_id from members where id = auth.uid()));

-- rewards：同上
drop policy if exists "Users can view own family rewards" on rewards;
create policy "Users can view own family rewards"
  on rewards for select
  using (family_id in (select family_id from members where id = auth.uid()));

drop policy if exists "Users can manage own family rewards" on rewards;
create policy "Users can manage own family rewards"
  on rewards for all
  using (family_id in (select family_id from members where id = auth.uid()));

-- star_transactions：用户只能查看自己家庭的流水
drop policy if exists "Users can view own family star transactions" on star_transactions;
create policy "Users can view own family star transactions"
  on star_transactions for select
  using (family_id in (select family_id from members where id = auth.uid()));

drop policy if exists "System can insert star transactions" on star_transactions;
create policy "System can insert star transactions"
  on star_transactions for insert
  with check (true);

-- analytics_events：仅插入和家庭成员查看
drop policy if exists "Users can insert analytics events" on analytics_events;
create policy "Users can insert analytics events"
  on analytics_events for insert
  with check (true);

drop policy if exists "Users can view own family analytics" on analytics_events;
create policy "Users can view own family analytics"
  on analytics_events for select
  using (family_id in (select family_id from members where id = auth.uid()));

-- ============================================================
-- 完成提示
-- ============================================================
do $$
begin
  raise notice '✅ Forest Family 数据库 schema 创建完成！';
  raise notice '📋 已创建表：families, members, tasks, habits, rewards, star_transactions, analytics_events';
  raise notice '🔒 已启用 RLS 并创建访问策略';
  raise notice '⚡ 已创建索引和 updated_at 触发器';
end;
$$;
