-- ============================================================
-- Forest Family — 服务端角色权限迁移草案
-- ============================================================
--
-- 重要说明：
-- 当前数据库历史设计大量使用 auth.uid() = members.id。
-- 如果产品采用“一个主登录账号 + PIN 切换家庭成员”，Supabase RLS 只能可靠识别主登录账号，
-- 不能天然识别当前 PIN 成员。下面策略适用于“家长主账号作为服务端可信身份”的过渡阶段。
-- 真正按 PIN 子成员做强权限，需要后续引入服务端 RPC / member session token。

-- ============================================================
-- Helper functions
-- ============================================================

create or replace function public.ff_auth_family_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select family_id
  from members
  where id = auth.uid()
    and is_active = true
  limit 1
$$;

create or replace function public.ff_auth_is_parent()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from members
    where id = auth.uid()
      and role = 'parent'
      and is_active = true
  )
$$;

-- ============================================================
-- Drop broad legacy policies
-- ============================================================

drop policy if exists "Users can manage own family tasks" on tasks;
drop policy if exists "Users can manage own family rewards" on rewards;
drop policy if exists "Parents can manage family rewards" on rewards;
drop policy if exists "Children can redeem rewards" on rewards;
drop policy if exists "Parents can manage family members" on members;
drop policy if exists "Parents can insert family members" on members;
drop policy if exists "Parents can update family members" on members;
drop policy if exists "Parents can delete child members only" on members;
drop policy if exists "System can insert star transactions" on star_transactions;

-- ============================================================
-- Family isolation: read policies
-- ============================================================

drop policy if exists "Users can view own family tasks" on tasks;
create policy "Family account can view tasks"
  on tasks for select
  using (family_id = public.ff_auth_family_id());

drop policy if exists "Users can view own family rewards" on rewards;
create policy "Family account can view rewards"
  on rewards for select
  using (family_id = public.ff_auth_family_id());

drop policy if exists "Users can view own family members" on members;
create policy "Family account can view members"
  on members for select
  using (family_id = public.ff_auth_family_id());

drop policy if exists "Users can view own family star transactions" on star_transactions;
create policy "Family account can view star transactions"
  on star_transactions for select
  using (family_id = public.ff_auth_family_id());

-- ============================================================
-- Parent-only management
-- ============================================================

create policy "Parents can insert tasks"
  on tasks for insert
  with check (
    public.ff_auth_is_parent()
    and family_id = public.ff_auth_family_id()
  );

create policy "Parents can update tasks"
  on tasks for update
  using (
    public.ff_auth_is_parent()
    and family_id = public.ff_auth_family_id()
  )
  with check (
    public.ff_auth_is_parent()
    and family_id = public.ff_auth_family_id()
  );

create policy "Parents can delete tasks"
  on tasks for delete
  using (
    public.ff_auth_is_parent()
    and family_id = public.ff_auth_family_id()
  );

create policy "Parents can insert rewards"
  on rewards for insert
  with check (
    public.ff_auth_is_parent()
    and family_id = public.ff_auth_family_id()
  );

create policy "Parents can update rewards"
  on rewards for update
  using (
    public.ff_auth_is_parent()
    and family_id = public.ff_auth_family_id()
  )
  with check (
    public.ff_auth_is_parent()
    and family_id = public.ff_auth_family_id()
  );

create policy "Parents can delete rewards"
  on rewards for delete
  using (
    public.ff_auth_is_parent()
    and family_id = public.ff_auth_family_id()
  );

create policy "Parents can insert members"
  on members for insert
  with check (
    public.ff_auth_is_parent()
    and family_id = public.ff_auth_family_id()
  );

create policy "Parents can update members"
  on members for update
  using (
    public.ff_auth_is_parent()
    and family_id = public.ff_auth_family_id()
  )
  with check (
    public.ff_auth_is_parent()
    and family_id = public.ff_auth_family_id()
  );

create policy "Parents can deactivate child members"
  on members for delete
  using (
    public.ff_auth_is_parent()
    and family_id = public.ff_auth_family_id()
    and role = 'child'
  );

-- 星星流水：过渡阶段只允许家长主账号所在家庭写入。
-- 更严格的生产方案应改为只允许 SECURITY DEFINER RPC 写入。
create policy "Parents can insert star transactions"
  on star_transactions for insert
  with check (
    public.ff_auth_is_parent()
    and family_id = public.ff_auth_family_id()
  );

-- ============================================================
-- Reward redemption server guard
-- ============================================================

create unique index if not exists idx_star_transactions_reward_spend_once
  on star_transactions (related_reward_id)
  where type = 'spend' and related_reward_id is not null;

create index if not exists idx_rewards_redeemed_by_status
  on rewards (redeemed_by, status);

do $$
begin
  raise notice '✅ 服务端角色权限迁移草案执行完成';
  raise notice '⚠️ PIN 子成员强权限仍需 member session/RPC 方案';
end;
$$;
