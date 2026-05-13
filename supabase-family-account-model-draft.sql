-- ============================================================
-- Forest Family — 目标家庭账号模型迁移草案
-- ============================================================
--
-- 目的：
-- 将云端模型从 “auth.uid() = members.id” 逐步迁移到
-- “一个主登录账号 = 一个家庭，家庭内部成员通过 PIN/密码切换”。
--
-- 使用方式：
-- 1. 先在测试库执行。
-- 2. 对照 docs/CLOUD_DATA_MODEL_TARGET.md 审核产品与安全边界。
-- 3. 不要直接替代现有 RLS；本脚本只补结构，不强制切换所有策略。

-- ============================================================
-- 1. families: 主账号归属与隐私版本
-- ============================================================

alter table families
  add column if not exists owner_account_id uuid references auth.users(id) on delete set null,
  add column if not exists plan_tier text not null default 'free',
  add column if not exists data_region text not null default 'default',
  add column if not exists privacy_consent_version text,
  add column if not exists privacy_consent_at timestamptz;

create index if not exists idx_families_owner_account_id
  on families(owner_account_id);

comment on column families.owner_account_id is '家庭主登录账号。目标模型中 auth.uid() 指向这个账号，而不是 members.id。';
comment on column families.plan_tier is '商业套餐：free/plus/pro 等。基本功能应保持 free。';
comment on column families.privacy_consent_version is '家庭隐私与推荐同意协议版本。';

-- 过渡期回填：
-- 如果现有 members.id 仍等于 auth.users.id，可用家长成员回填 owner_account_id。
-- 请在测试库确认后再执行 update。
--
-- update families f
-- set owner_account_id = m.id
-- from members m
-- where m.family_id = f.id
--   and m.role = 'parent'
--   and f.owner_account_id is null;

-- ============================================================
-- 2. members: 成员凭证哈希字段
-- ============================================================

alter table members
  add column if not exists credential_hash text,
  add column if not exists credential_algo text,
  add column if not exists credential_updated_at timestamptz,
  add column if not exists last_verified_at timestamptz;

comment on column members.credential_hash is '家庭成员 PIN/密码哈希。替代明文 pin/password。';
comment on column members.credential_algo is '凭证算法版本，例如 pbkdf2-v1/argon2id-v1。';
comment on column members.last_verified_at is '最近一次家庭内成员验证时间。';

create index if not exists idx_members_family_role_active
  on members(family_id, role, is_active);

-- ============================================================
-- 3. member_sessions: 服务端短时成员会话
-- ============================================================

create table if not exists member_sessions (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references families(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  account_id uuid references auth.users(id) on delete cascade,
  token_hash text not null,
  verification_method text not null check (verification_method in ('pin', 'password', 'account')),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  device_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_member_sessions_family_member
  on member_sessions(family_id, member_id, expires_at);

create unique index if not exists idx_member_sessions_token_hash
  on member_sessions(token_hash);

comment on table member_sessions is '家庭内部成员短时会话。敏感 RPC 应校验 token_hash、family_id、member_id 和过期时间。';

-- ============================================================
-- 4. operation_audit_logs: 操作审计
-- ============================================================

create table if not exists operation_audit_logs (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references families(id) on delete cascade,
  actor_member_id uuid references members(id) on delete set null,
  account_id uuid references auth.users(id) on delete set null,
  operation_type text not null,
  target_table text,
  target_id uuid,
  client_operation_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_operation_audit_logs_family_created
  on operation_audit_logs(family_id, created_at desc);

create index if not exists idx_operation_audit_logs_actor_created
  on operation_audit_logs(actor_member_id, created_at desc);

create unique index if not exists idx_operation_audit_logs_client_operation
  on operation_audit_logs(family_id, client_operation_id)
  where client_operation_id is not null;

comment on table operation_audit_logs is '高价值操作审计表，用于离线同步追踪、冲突排查和家庭安全回溯。';

-- ============================================================
-- 5. shared_schedule_templates: 社区分享模板
-- ============================================================

create table if not exists shared_schedule_templates (
  id uuid primary key default uuid_generate_v4(),
  source_family_id uuid references families(id) on delete set null,
  source_plan_id uuid references plans(id) on delete set null,
  author_member_id uuid references members(id) on delete set null,
  title text not null,
  scenario text not null,
  age_range text,
  grade_band text,
  city_level text,
  content jsonb not null default '{}'::jsonb,
  tips text[] not null default '{}',
  visibility text not null default 'public' check (visibility in ('public', 'unlisted', 'private')),
  moderation_status text not null default 'pending' check (moderation_status in ('pending', 'approved', 'rejected')),
  usage_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_shared_schedule_templates_lookup
  on shared_schedule_templates(scenario, grade_band, moderation_status, created_at desc);

comment on table shared_schedule_templates is '社区日程模板。必须由私有计划脱敏后发布。';

-- ============================================================
-- 6. 推荐同意与推荐事件
-- ============================================================

create table if not exists recommendation_consents (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references families(id) on delete cascade,
  consent_scope text not null,
  enabled boolean not null default false,
  consent_version text not null,
  decided_by_member_id uuid references members(id) on delete set null,
  decided_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(family_id, consent_scope)
);

create table if not exists recommendation_events (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid references families(id) on delete set null,
  member_id uuid references members(id) on delete set null,
  category text not null,
  item_id text,
  event_type text not null check (event_type in ('impression', 'click', 'dismiss', 'conversion')),
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_recommendation_events_family_created
  on recommendation_events(family_id, created_at desc);

comment on table recommendation_consents is '推荐与商业化数据使用同意记录。教育、旅游、医疗等可拆 scope。';
comment on table recommendation_events is '推荐曝光、点击、转化与拒绝事件。';

do $$
begin
  raise notice '✅ 家庭账号目标模型结构草案执行完成';
  raise notice '⚠️ 这不是完整安全迁移。RLS/RPC/凭证哈希回填仍需单独实施。';
end;
$$;
