-- ============================================================
-- invite_codes 表 — 内测邀请码管理
-- 执行方式：Supabase Dashboard → SQL Editor → Run
-- ============================================================

create table if not exists invite_codes (
  id uuid default uuid_generate_v4() primary key,
  code text not null unique,
  description text,
  max_uses integer not null default 1,
  current_uses integer not null default 0,
  is_active boolean not null default true,
  created_by uuid,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

comment on table invite_codes is '内测邀请码表，用于控制注册权限';
comment on column invite_codes.code is '邀请码（大写字母+数字，唯一）';
comment on column invite_codes.max_uses is '最大使用次数，-1 表示无限';
comment on column invite_codes.current_uses is '已使用次数';
comment on column invite_codes.is_active is '是否启用';
comment on column invite_codes.expires_at is '过期时间，null 表示永不过期';

-- 索引
create index if not exists idx_invite_codes_code on invite_codes(code);
create index if not exists idx_invite_codes_active on invite_codes(is_active);

-- 触发器
create or replace trigger update_invite_codes_updated_at before update on invite_codes
  for each row execute function update_updated_at_column();

-- ============================================================
-- RLS 策略
-- ============================================================
alter table invite_codes enable row level security;

-- 任何人都可以验证邀请码（只读，通过 RPC 函数）
drop policy if exists "Anyone can view active invite codes" on invite_codes;
create policy "Anyone can view active invite codes"
  on invite_codes for select
  using (is_active = true);

-- 仅已登录的 parent 角色可以管理邀请码
drop policy if exists "Parents can manage invite codes" on invite_codes;
create policy "Parents can manage invite codes"
  on invite_codes for all
  using (
    created_by in (select id from members where role = 'parent')
  );

-- ============================================================
-- RPC 函数：验证并使用邀请码（原子操作，防止并发超用）
-- ============================================================
create or replace function use_invite_code(p_code text)
returns boolean
language plpgsql
security definer
as $$
declare
  v_id uuid;
  v_current integer;
  v_max integer;
  v_active boolean;
  v_expires timestamp with time zone;
begin
  -- 查找邀请码
  select id, current_uses, max_uses, is_active, expires_at
    into v_id, v_current, v_max, v_active, v_expires
    from invite_codes
    where code = upper(p_code)
    for update;

  if not found then
    raise exception '邀请码不存在';
  end if;

  if not v_active then
    raise exception '邀请码已停用';
  end if;

  if v_expires is not null and v_expires < now() then
    raise exception '邀请码已过期';
  end if;

  if v_max != -1 and v_current >= v_max then
    raise exception '邀请码已用完';
  end if;

  -- 递增使用次数
  update invite_codes set current_uses = current_uses + 1 where id = v_id;

  return true;
end;
$$;

-- ============================================================
-- 插入初始邀请码（可选）
-- ============================================================
-- insert into invite_codes (code, description, max_uses) values
--   ('BILESIALPHA', '内测首轮邀请码', 100),
--   ('FAMILY2026', '2026家庭版邀请码', 50);

do $$
begin
  raise notice '✅ invite_codes 表创建完成！';
  raise notice '🔑 已创建 use_invite_code RPC 函数';
  raise notice '💡 可取消注释 INSERT 语句添加初始邀请码';
end;
$$;
