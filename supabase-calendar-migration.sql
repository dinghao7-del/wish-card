-- ============================================================
-- 日历同步功能 - 数据库迁移脚本
-- 执行方式：复制全部内容 → Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ============================================================
-- 1. calendar_subscriptions 表（日历订阅）
-- ============================================================
create table if not exists calendar_subscriptions (
  id uuid default uuid_generate_v4() primary key,
  family_id uuid references families(id) on delete cascade not null,
  token text unique not null default encode(gen_random_bytes(32), 'hex'),
  name text not null default '默认订阅',
  is_active boolean default true,
  last_accessed_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

comment on table calendar_subscriptions is '日历订阅表：存储 WebCal 订阅链接';
comment on column calendar_subscriptions.token is '订阅令牌（用于生成订阅URL）';
comment on column calendar_subscriptions.is_active is '订阅是否激活';

-- 索引
create index if not exists idx_calendar_subscriptions_family_id on calendar_subscriptions(family_id);
create index if not exists idx_calendar_subscriptions_token on calendar_subscriptions(token);

-- ============================================================
-- 2. calendar_sync_logs 表（同步日志）
-- ============================================================
create table if not exists calendar_sync_logs (
  id uuid default uuid_generate_v4() primary key,
  family_id uuid references families(id) on delete cascade not null,
  subscription_id uuid references calendar_subscriptions(id) on delete cascade,
  sync_type text check (sync_type in ('export', 'import', 'subscribe')) not null,
  status text check (status in ('success', 'failed')) not null,
  message text,
  created_at timestamp with time zone default now()
);

comment on table calendar_sync_logs is '日历同步日志表：记录每次同步操作';

-- 索引
create index if not exists idx_calendar_sync_logs_family_id on calendar_sync_logs(family_id);
create index if not exists idx_calendar_sync_logs_created_at on calendar_sync_logs(created_at desc);

-- ============================================================
-- 3. RLS 策略
-- ============================================================

-- 启用 RLS
alter table calendar_subscriptions enable row level security;
alter table calendar_sync_logs enable row level security;

-- calendar_subscriptions 策略
create policy if not exists "Family members can view own subscriptions"
  on calendar_subscriptions for select
  using (family_id in (
    select family_id from members where id = auth.uid()
  ));

create policy if not exists "Family members can insert own subscriptions"
  on calendar_subscriptions for insert
  with check (family_id in (
    select family_id from members where id = auth.uid()
  ));

create policy if not exists "Family members can update own subscriptions"
  on calendar_subscriptions for update
  using (family_id in (
    select family_id from members where id = auth.uid()
  ));

create policy if not exists "Family members can delete own subscriptions"
  on calendar_subscriptions for delete
  using (family_id in (
    select family_id from members where id = auth.uid()
  ));

-- calendar_sync_logs 策略
create policy if not exists "Family members can view own logs"
  on calendar_sync_logs for select
  using (family_id in (
    select family_id from members where id = auth.uid()
  ));

-- ============================================================
-- 4. 更新时间戳触发器
-- ============================================================
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger if not exists update_calendar_subscriptions_updated_at
  before update on calendar_subscriptions
  for each row
  execute function update_updated_at_column();

-- ============================================================
-- 5. 初始数据
-- ============================================================
-- 无需初始数据，订阅记录由应用动态创建

-- ============================================================
-- 完成提示
-- ============================================================
do $$
begin
  raise notice '✅ 日历同步表创建完成！';
  raise notice '   - calendar_subscriptions: 日历订阅管理';
  raise notice '   - calendar_sync_logs: 同步日志记录';
end $$;
