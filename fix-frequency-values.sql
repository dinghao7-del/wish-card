-- 修复不符合约束的 frequency 值
UPDATE templates 
SET frequency = NULL 
WHERE frequency NOT IN ('daily', 'weekly', 'monthly', 'once');

-- 然后添加约束
ALTER TABLE templates 
ADD CONSTRAINT templates_frequency_check 
CHECK (frequency IN ('daily', 'weekly', 'monthly', 'once') OR frequency IS NULL);
