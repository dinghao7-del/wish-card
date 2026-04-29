-- 愿望卡 - 模板库 + 用户行为分析 数据库迁移
-- 在 Supabase Dashboard → SQL Editor 中执行

-- ==================== 1. 模板库表 ====================
CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('task', 'habit', 'reward')),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT '其他',
  stars integer NOT NULL DEFAULT 0,
  icon text,
  source text NOT NULL DEFAULT 'system' CHECK (source IN ('system', 'community')),
  usage_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  i18n_key text,
  extra_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(type, title, source)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_templates_type_category ON templates(type, category);
CREATE INDEX IF NOT EXISTS idx_templates_source ON templates(source);
CREATE INDEX IF NOT EXISTS idx_templates_usage_count ON templates(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_templates_active ON templates(is_active);

-- RLS
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- 所有人可读
DROP POLICY IF EXISTS "Anyone can read templates" ON templates;
CREATE POLICY "Anyone can read templates" ON templates
  FOR SELECT USING (is_active = true);

-- 管理员可写
DROP POLICY IF EXISTS "Admin can manage templates" ON templates;
CREATE POLICY "Admin can manage templates" ON templates
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'admin')::boolean = true
  );

-- 系统可插入（服务端 key）
DROP POLICY IF EXISTS "Service can insert templates" ON templates;
CREATE POLICY "Service can insert templates" ON templates
  FOR INSERT WITH CHECK (true);

-- 系统可更新（用于 usage_count +1）
DROP POLICY IF EXISTS "Service can update templates" ON templates;
CREATE POLICY "Service can update templates" ON templates
  FOR UPDATE USING (true);

-- ==================== 2. usage_count 自增函数 ====================
CREATE OR REPLACE FUNCTION increment_template_usage(p_template_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE templates SET usage_count = usage_count + 1 WHERE id = p_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================== 3. 通知表 ====================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  member_id uuid,
  type text NOT NULL CHECK (type IN (
    'task_completed', 'task_reviewing', 'task_approved',
    'reward_redeemed', 'reward_approved', 'habit_target',
    'system', 'suggestion'
  )),
  title text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  action_url text,
  action_label text,
  data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_notifications_family_member ON notifications(family_id, member_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 家庭成员可查看自己家庭的通知
DROP POLICY IF EXISTS "Family members can view notifications" ON notifications;
CREATE POLICY "Family members can view notifications" ON notifications
  FOR SELECT USING (
    family_id IN (
      SELECT f.id FROM families f
      INNER JOIN members m ON m.family_id = f.id
      WHERE m.id = auth.uid()
    )
  );

-- 系统可插入
DROP POLICY IF EXISTS "Service can insert notifications" ON notifications;
CREATE POLICY "Service can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- 家庭成员可更新已读状态
DROP POLICY IF EXISTS "Family members can update notifications" ON notifications;
CREATE POLICY "Family members can update notifications" ON notifications
  FOR UPDATE USING (
    family_id IN (
      SELECT f.id FROM families f
      INNER JOIN members m ON m.family_id = f.id
      WHERE m.id = auth.uid()
    )
  );

-- ==================== 4. 实时通知推送 ====================
-- 启用 Realtime
-- 仅当 notifications 未加入 publication 时才添加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END
$$;

-- ==================== 5. 用户行为分析事件表 ====================
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  member_id uuid,
  event_name text NOT NULL,
  event_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_analytics_family_event ON analytics_events(family_id, event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_event_name ON analytics_events(event_name);

-- RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- 家庭成员可查看自己家庭的分析
DROP POLICY IF EXISTS "Family members can view analytics" ON analytics_events;
CREATE POLICY "Family members can view analytics" ON analytics_events
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM members WHERE id = auth.uid() AND is_active = true
    )
  );

-- 系统可插入
DROP POLICY IF EXISTS "Service can insert analytics" ON analytics_events;
CREATE POLICY "Service can insert analytics" ON analytics_events
  FOR INSERT WITH CHECK (true);

-- 管理员可查看全部
DROP POLICY IF EXISTS "Admin can view all analytics" ON analytics_events;
CREATE POLICY "Admin can view all analytics" ON analytics_events
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'admin')::boolean = true
  );

-- ==================== 6. WebCal 订阅 Token 表 ====================
CREATE TABLE IF NOT EXISTS calendar_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  name text,
  last_accessed_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_calendar_sub_token ON calendar_subscriptions(token);
CREATE INDEX IF NOT EXISTS idx_calendar_sub_family ON calendar_subscriptions(family_id);

-- RLS
ALTER TABLE calendar_subscriptions ENABLE ROW LEVEL SECURITY;

-- 家庭成员可查看
DROP POLICY IF EXISTS "Family members can view subscriptions" ON calendar_subscriptions;
CREATE POLICY "Family members can view subscriptions" ON calendar_subscriptions
  FOR SELECT USING (
    family_id IN (
      SELECT f.id FROM families f
      INNER JOIN members m ON m.family_id = f.id
      WHERE m.id = auth.uid()
    )
  );

-- 系统可插入/更新
DROP POLICY IF EXISTS "Service can manage subscriptions" ON calendar_subscriptions;
CREATE POLICY "Service can manage subscriptions" ON calendar_subscriptions
  FOR ALL USING (true);

-- ==================== 7. RLS - 基础表（之前缺失的） ====================

-- families: 家庭成员可查看自己的家庭
DROP POLICY IF EXISTS "Family members can view family" ON families;
CREATE POLICY "Family members can view family" ON families
  FOR SELECT USING (
    id IN (
      SELECT family_id FROM members WHERE id = auth.uid() AND is_active = true
    )
  );

-- members: 家庭成员可查看同家庭成员
DROP POLICY IF EXISTS "Family members can view members" ON members;
CREATE POLICY "Family members can view members" ON members
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM members WHERE id = auth.uid() AND is_active = true
    )
  );

-- members: 只能更新自己（非管理员）
DROP POLICY IF EXISTS "Members can update themselves" ON members;
CREATE POLICY "Members can update themselves" ON members
  FOR UPDATE USING (
    id = auth.uid() OR
    (auth.jwt() -> 'app_metadata' ->> 'admin')::boolean = true
  );

-- tasks: 家庭成员可操作自己家庭的任务
DROP POLICY IF EXISTS "Family members can view tasks" ON tasks;
CREATE POLICY "Family members can view tasks" ON tasks
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM members WHERE id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Family members can insert tasks" ON tasks;
CREATE POLICY "Family members can insert tasks" ON tasks
  FOR INSERT WITH CHECK (
    family_id IN (
      SELECT family_id FROM members WHERE id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Family members can update tasks" ON tasks;
CREATE POLICY "Family members can update tasks" ON tasks
  FOR UPDATE USING (
    family_id IN (
      SELECT family_id FROM members WHERE id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Family members can delete tasks" ON tasks;
CREATE POLICY "Family members can delete tasks" ON tasks
  FOR DELETE USING (
    family_id IN (
      SELECT family_id FROM members WHERE id = auth.uid() AND is_active = true
    )
  );

-- rewards: 家庭成员可操作自己家庭的奖励
DROP POLICY IF EXISTS "Family members can view rewards" ON rewards;
CREATE POLICY "Family members can view rewards" ON rewards
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM members WHERE id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Family members can insert rewards" ON rewards;
CREATE POLICY "Family members can insert rewards" ON rewards
  FOR INSERT WITH CHECK (
    family_id IN (
      SELECT family_id FROM members WHERE id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Family members can update rewards" ON rewards;
CREATE POLICY "Family members can update rewards" ON rewards
  FOR UPDATE USING (
    family_id IN (
      SELECT family_id FROM members WHERE id = auth.uid() AND is_active = true
    )
  );

-- habits: 家庭成员可操作自己家庭的习惯
DROP POLICY IF EXISTS "Family members can view habits" ON habits;
CREATE POLICY "Family members can view habits" ON habits
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM members WHERE id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Family members can insert habits" ON habits;
CREATE POLICY "Family members can insert habits" ON habits
  FOR INSERT WITH CHECK (
    family_id IN (
      SELECT family_id FROM members WHERE id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Family members can update habits" ON habits;
CREATE POLICY "Family members can update habits" ON habits
  FOR UPDATE USING (
    family_id IN (
      SELECT family_id FROM members WHERE id = auth.uid() AND is_active = true
    )
  );

-- star_transactions: 家庭成员可查看自己的流水
DROP POLICY IF EXISTS "Members can view own transactions" ON star_transactions;
CREATE POLICY "Members can view own transactions" ON star_transactions
  FOR SELECT USING (
    member_id = auth.uid() OR
    family_id IN (
      SELECT family_id FROM members WHERE id = auth.uid() AND is_active = true AND role = 'parent'
    )
  );

DROP POLICY IF EXISTS "Service can insert transactions" ON star_transactions;
CREATE POLICY "Service can insert transactions" ON star_transactions
  FOR INSERT WITH CHECK (true);

-- ==================== 8. Supabase Edge Function: WebCal 订阅 ====================
-- 此函数需通过 Supabase CLI 部署，这里提供 SQL 占位
-- 实际代码见 supabase/functions/calendar-subscribe/index.ts

COMMENT ON TABLE templates IS '系统模板库 + 社区热门模板';
COMMENT ON TABLE notifications IS '应用内通知';
COMMENT ON TABLE calendar_subscriptions IS '日历订阅 Token 管理';
