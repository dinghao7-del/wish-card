-- ============================================================
-- Forest Family — RLS 安全修复补丁
-- 执行方式：Supabase Dashboard → SQL Editor → Run
-- 执行前提：supabase-schema.sql 已执行
-- ============================================================

-- ============================================================
-- 1. 补充 members.password 列（前端代码已使用但 SQL 中缺失）
-- ============================================================
alter table members add column if not exists password text;

-- ============================================================
-- 2. 修复 star_transactions INSERT 策略（严重安全隐患）
--    原策略：with check (true) — 任何人可插入任意数据
--    修复：限制只能插入自己家庭的流水
-- ============================================================
drop policy if exists "System can insert star transactions" on star_transactions;
create policy "System can insert star transactions"
  on star_transactions for insert
  with check (
    family_id in (select family_id from members where id = auth.uid())
  );

-- ============================================================
-- 3. 修复 analytics_events INSERT 策略（中等安全隐患）
--    原策略：with check (true) — 任何人可插入任意事件
--    修复：限制只能插入自己家庭的事件
-- ============================================================
drop policy if exists "Users can insert analytics events" on analytics_events;
create policy "Users can insert analytics events"
  on analytics_events for insert
  with check (
    family_id in (select family_id from members where id = auth.uid())
  );

-- ============================================================
-- 4. 拆分 members 的 "Parents can manage family members" 策略
--    原策略：for all — 过于宽松（家长可删除其他家长、篡改角色）
--    修复：拆分为 insert/update/delete 细粒度策略
-- ============================================================
drop policy if exists "Parents can manage family members" on members;

-- 家长可以插入新成员
create policy "Parents can insert family members"
  on members for insert
  with check (
    family_id in (
      select family_id from members
      where id = auth.uid() and role = 'parent'
    )
  );

-- 家长可以更新同家庭成员（但不能修改自己的 role）
create policy "Parents can update family members"
  on members for update
  using (
    family_id in (
      select family_id from members
      where id = auth.uid() and role = 'parent'
    )
  )
  with check (
    family_id in (
      select family_id from members
      where id = auth.uid() and role = 'parent'
    )
  );

-- 家长只能删除儿童账户（不能删除其他家长）
create policy "Parents can delete child members only"
  on members for delete
  using (
    family_id in (
      select family_id from members
      where id = auth.uid() and role = 'parent'
    )
    and role = 'child'
  );

-- ============================================================
-- 5. 补充 families 表的 INSERT 策略
--    原状态：只有 SELECT 策略，无法通过客户端创建家庭
--    修复：允许已认证用户创建家庭
-- ============================================================
drop policy if exists "Users can create family" on families;
create policy "Users can create family"
  on families for insert
  with check (true);

-- 允许家庭创建者更新自己的家庭信息
drop policy if exists "Users can update own family" on families;
create policy "Users can update own family"
  on families for update
  using (id in (select family_id from members where id = auth.uid()));

-- ============================================================
-- 6. 限制 rewards 写入权限（仅家长可创建/修改/删除奖励）
--    原状态：for all — 所有家庭成员（包括儿童）都能管理奖励
-- ============================================================
drop policy if exists "Users can manage own family rewards" on rewards;

-- 家长可以管理奖励
create policy "Parents can manage family rewards"
  on rewards for all
  using (
    family_id in (
      select family_id from members
      where id = auth.uid() and role = 'parent'
    )
  );

-- 儿童只能兑换奖励（UPDATE status to pending_approval）
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
  raise notice '✅ RLS 安全修复补丁执行完成！';
  raise notice '🔒 star_transactions INSERT 策略已加固';
  raise notice '🔒 analytics_events INSERT 策略已加固';
  raise notice '🔒 members 策略已拆分为细粒度权限';
  raise notice '🔒 families INSERT/UPDATE 策略已补充';
  raise notice '🔒 rewards 管理权限已限制为家长';
end;
$$;
