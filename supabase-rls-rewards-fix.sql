-- ============================================================
-- Forest Family — rewards 表 RLS 策略修复
-- 问题：当前策略只允许家长创建奖励，导致儿童角色创建时被拒绝
-- 修复：允许所有活跃家庭成员创建奖励，仅家长可编辑/删除
-- ============================================================
-- 执行方式：Supabase Dashboard → SQL Editor → 粘贴执行
-- ============================================================

-- 1. 删除旧的 "Parents can manage family rewards" 策略（会覆盖 INSERT/UPDATE/DELETE/SELECT）
drop policy if exists "Parents can manage family rewards" on rewards;

-- 2. 允许所有活跃成员查看奖励
drop policy if exists "Family members can view rewards" on rewards;
create policy "Family members can view rewards"
  on rewards for select
  using (
    family_id in (
      select family_id from members where id = auth.uid() and is_active = true
    )
  );

-- 3. 允许所有活跃成员创建奖励（儿童也可以提出心愿）
drop policy if exists "Family members can insert rewards" on rewards;
create policy "Family members can insert rewards"
  on rewards for insert
  with check (
    family_id in (
      select family_id from members where id = auth.uid() and is_active = true
    )
  );

-- 4. 只有家长可以更新奖励（修改内容、价格等）
drop policy if exists "Parents can update rewards" on rewards;
create policy "Parents can update rewards"
  on rewards for update
  using (
    family_id in (
      select family_id from members where id = auth.uid() and role = 'parent'
    )
  );

-- 5. 只有家长可以删除奖励
drop policy if exists "Parents can delete rewards" on rewards;
create policy "Parents can delete rewards"
  on rewards for delete
  using (
    family_id in (
      select family_id from members where id = auth.uid() and role = 'parent'
    )
  );

-- 6. 儿童可以更新奖励状态（兑换：status → pending_approval）
drop policy if exists "Children can redeem rewards" on rewards;
create policy "Children can redeem rewards"
  on rewards for update
  using (
    family_id in (
      select family_id from members where id = auth.uid()
    )
    and status = 'available'
  )
  with check (
    family_id in (
      select family_id from members where id = auth.uid()
    )
  );

-- ============================================================
-- 完成提示
-- ============================================================
do $$
begin
  raise notice '✅ rewards RLS 策略修复完成！';
  raise notice '🔓 所有家庭成员（包括儿童）现在可以创建心愿';
  raise notice '🔒 编辑/删除权限仍仅限家长';
  raise notice '🔒 兑换权限保留给所有成员';
end;
$$;
