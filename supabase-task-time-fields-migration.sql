-- ============================================================
-- 任务时间字段迁移
-- ============================================================

-- 用于支持离线优先任务、父母兑现心愿提醒、四象限按周期判断。
-- start_time 表示任务建议开始时间；deadline 表示建议完成/兑现时间。

alter table tasks add column if not exists start_time timestamptz;
alter table tasks add column if not exists deadline timestamptz;

-- 兼容旧任务：没有 start_time 的任务先使用 created_at，避免进入本地后没有可判断时间。
update tasks
set start_time = created_at
where start_time is null;

create index if not exists idx_tasks_family_start_time
  on tasks (family_id, start_time);

create index if not exists idx_tasks_family_deadline
  on tasks (family_id, deadline)
  where deadline is not null;

select '任务时间字段迁移完成！' as result;
