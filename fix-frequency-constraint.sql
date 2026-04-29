-- 恢复 frequency 字段的 CHECK 约束（允许 NULL 值）
ALTER TABLE templates 
ADD CONSTRAINT templates_frequency_check 
CHECK (frequency IN ('daily', 'weekly', 'monthly', 'once') OR frequency IS NULL);
