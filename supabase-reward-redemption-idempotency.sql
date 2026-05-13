-- ============================================================
-- 心愿兑换幂等保护
-- ============================================================

-- 同一个心愿只能产生一条支出流水，避免离线同步重试或多端确认造成重复扣星。
create unique index if not exists idx_star_transactions_reward_spend_once
  on star_transactions (related_reward_id)
  where type = 'spend' and related_reward_id is not null;

-- 确认兑换后应写入 rewards.redeemed_at，便于审计和幂等判断。
create index if not exists idx_rewards_redeemed_by_status
  on rewards (redeemed_by, status);

select '心愿兑换幂等迁移完成！' as result;
