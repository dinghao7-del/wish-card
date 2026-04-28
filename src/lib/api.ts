import supabase, { type Database } from './supabase';

type Family = Database['public']['Tables']['families']['Row'];
type Member = Database['public']['Tables']['members']['Row'];
type Task = Database['public']['Tables']['tasks']['Row'];
type Habit = Database['public']['Tables']['habits']['Row'];
type Reward = Database['public']['Tables']['rewards']['Row'];
type StarTransaction = Database['public']['Tables']['star_transactions']['Row'];

// ==================== 家庭相关 API ====================

export async function createFamily(name: string): Promise<Family> {
  const { data, error } = await supabase
    .from('families')
    .insert({ name })
    .select()
    .single();

  if (error) throw new Error(`创建家庭失败: ${error.message}`);
  return data;
}

export async function getFamilyByInviteCode(inviteCode: string): Promise<Family | null> {
  const { data, error } = await supabase
    .from('families')
    .select()
    .eq('invite_code', inviteCode.toUpperCase())
    .single();

  if (error && error.code !== 'PGRST116') throw new Error(`查询家庭失败: ${error.message}`);
  return data || null;
}

export async function getFamilyById(familyId: string): Promise<Family | null> {
  const { data, error } = await supabase
    .from('families')
    .select()
    .eq('id', familyId)
    .single();

  if (error && error.code !== 'PGRST116') throw new Error(`查询家庭失败: ${error.message}`);
  return data || null;
}

// ==================== 成员相关 API ====================

export async function addMember(
  familyId: string,
  name: string,
  role: 'parent' | 'child',
  avatar?: string,
  color?: string
): Promise<Member> {
  const { data, error } = await supabase
    .from('members')
    .insert({
      family_id: familyId,
      name,
      role,
      avatar: avatar || '👶',
      color: color || '#4CAF50',
    })
    .select()
    .single();

  if (error) throw new Error(`添加成员失败: ${error.message}`);
  
  // 记录行为日志
  await logEvent(familyId, data.id, 'member_added', { name, role });
  
  return data;
}

export async function getMembersByFamilyId(familyId: string): Promise<Member[]> {
  const { data, error } = await supabase
    .from('members')
    .select()
    .eq('family_id', familyId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`获取成员列表失败: ${error.message}`);
  return data || [];
}

export async function updateMemberStars(memberId: string, stars: number): Promise<void> {
  const { error } = await supabase
    .from('members')
    .update({ stars })
    .eq('id', memberId);

  if (error) throw new Error(`更新星星失败: ${error.message}`);
}

export async function deleteMember(memberId: string): Promise<void> {
  const { error } = await supabase
    .from('members')
    .update({ is_active: false })
    .eq('id', memberId);

  if (error) throw new Error(`删除成员失败: ${error.message}`);
}

export async function updateMember(
  memberId: string,
  updates: Partial<Pick<Member, 'name' | 'avatar' | 'role' | 'stars' | 'color' | 'pin' | 'password'>>
): Promise<Member> {
  const { data, error } = await supabase
    .from('members')
    .update(updates)
    .eq('id', memberId)
    .select()
    .single();

  if (error) throw new Error(`更新成员失败: ${error.message}`);
  return data;
}

// ==================== 任务相关 API ====================

export async function createTask(
  familyId: string,
  title: string,
  description: string | null,
  starAmount: number,
  assigneeIds: string[],
  createdBy: string
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      family_id: familyId,
      title,
      description,
      star_amount: starAmount,
      assignee_ids: assigneeIds,
      creator_id: createdBy,
    })
    .select()
    .single();

  if (error) throw new Error(`创建任务失败: ${error.message}`);

  await logEvent(familyId, createdBy, 'task_created', { title, starAmount });
  
  return data;
}

export async function getTasksByFamilyId(familyId: string, includeCompleted = false): Promise<Task[]> {
  let query = supabase
    .from('tasks')
    .select('*')
    .eq('family_id', familyId);

  if (!includeCompleted) {
    query = query.eq('completed', false);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw new Error(`获取任务列表失败: ${error.message}`);
  return data || [];
}

export async function completeTask(taskId: string, memberId: string): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update({
      completed: true,
      completed_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw new Error(`完成任务失败: ${error.message}`);

  // 获取任务详情以发放星星
  const task = data;
  if (task.assignee_ids && task.assignee_ids.length > 0) {
    for (const assigneeId of task.assignee_ids) {
      await addStarTransaction(
        task.family_id!,
        assigneeId,
        task.star_amount,
        'earn',
        `完成任务: ${task.title}`,
        taskId,
        null,
        null
      );
    }
  }

  await logEvent(task.family_id!, memberId, 'task_completed', { 
    taskId: task.id, 
    title: task.title,
    stars: task.star_amount 
  });

  return data;
}

export async function updateTask(
  taskId: string,
  updates: Partial<Pick<Task, 'title' | 'description' | 'star_amount' | 'assignee_ids' | 'status' | 'is_habit' | 'target_count' | 'current_count' | 'icon'>>
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw new Error(`更新任务失败: ${error.message}`);
  return data;
}

export async function approveTask(taskId: string, approverId: string): Promise<Task> {
  // 获取任务详情
  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select()
    .eq('id', taskId)
    .single();

  if (fetchError) throw new Error(`获取任务失败: ${fetchError.message}`);

  // 更新任务状态为已完成
  const { data, error } = await supabase
    .from('tasks')
    .update({
      status: 'completed',
      completed: true,
      completed_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw new Error(`审批任务失败: ${error.message}`);

  // 发放星星给任务执行者
  if (task.assignee_ids && task.assignee_ids.length > 0) {
    for (const assigneeId of task.assignee_ids) {
      await addStarTransaction(
        task.family_id!,
        assigneeId,
        task.star_amount,
        'earn',
        `完成任务(审批): ${task.title}`,
        taskId,
        null,
        null
      );
    }
  }

  await logEvent(task.family_id!, approverId, 'task_approved', {
    taskId: task.id,
    title: task.title,
    stars: task.star_amount,
  });

  return data;
}

export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);

  if (error) throw new Error(`删除任务失败: ${error.message}`);
}

// ==================== 习惯相关 API ====================

export async function createHabit(
  familyId: string,
  title: string,
  description: string | null,
  frequency: 'daily' | 'weekly' | 'custom',
  starAmount: number,
  assigneeIds: string[],
  createdBy: string,
  targetCount = 1
): Promise<Habit> {
  const { data, error } = await supabase
    .from('habits')
    .insert({
      family_id: familyId,
      title,
      description,
      frequency,
      star_amount: starAmount,
      assignee_ids: assigneeIds,
      creator_id: createdBy,
      target_count: targetCount,
    })
    .select()
    .single();

  if (error) throw new Error(`创建习惯失败: ${error.message}`);

  await logEvent(familyId, createdBy, 'habit_created', { title, frequency });

  return data;
}

export async function getHabitsByFamilyId(familyId: string): Promise<Habit[]> {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('family_id', familyId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`获取习惯列表失败: ${error.message}`);
  return data || [];
}

export async function completeHabit(habitId: string, memberId: string): Promise<Habit> {
  // 先获取习惯详情
  const { data: habit, error: fetchError } = await supabase
    .from('habits')
    .select()
    .eq('id', habitId)
    .single();

  if (fetchError) throw new Error(`获取习惯失败: ${fetchError.message}`);

  const newCount = habit.current_count + 1;
  const isTargetReached = newCount >= habit.target_count;
  const updates: Partial<Habit> = {
    current_count: newCount,
    last_completed_date: new Date().toISOString().split('T')[0],
  };

  // 如果达到目标次数，等待家长确认后重置
  if (isTargetReached) {
    // 这里可以发送通知给家长
    await logEvent(habit.family_id!, memberId, 'habit_target_reached', {
      habitId: habit.id,
      title: habit.title,
      requiresParentApproval: true,
    });
  }

  const { data, error } = await supabase
    .from('habits')
    .update(updates)
    .eq('id', habitId)
    .select()
    .single();

  if (error) throw new Error(`完成习惯失败: ${error.message}`);
  return data;
}

export async function resetHabitCount(habitId: string, memberId: string): Promise<void> {
  const { data: habit } = await supabase
    .from('habits')
    .select()
    .eq('id', habitId)
    .single();

  if (habit) {
    // 发放星星
    await addStarTransaction(
      habit.family_id!,
      memberId,
      habit.star_amount,
      'earn',
      `完成习惯: ${habit.title}`,
      null,
      habitId,
      null
    );
  }

  const { error } = await supabase
    .from('habits')
    .update({ current_count: 0 })
    .eq('id', habitId);

  if (error) throw new Error(`重置习惯失败: ${error.message}`);
}

export async function deleteHabit(habitId: string): Promise<void> {
  const { error } = await supabase
    .from('habits')
    .update({ is_active: false })
    .eq('id', habitId);

  if (error) throw new Error(`删除习惯失败: ${error.message}`);
}

// ==================== 奖励相关 API ====================

export async function createReward(
  familyId: string,
  name: string,
  description: string | null,
  starCost: number,
  createdBy: string,
  imageUrl?: string
): Promise<Reward> {
  const { data, error } = await supabase
    .from('rewards')
    .insert({
      family_id: familyId,
      name,
      description,
      star_cost: starCost,
      image_url: imageUrl,
      creator_id: createdBy,
    })
    .select()
    .single();

  if (error) throw new Error(`创建奖励失败: ${error.message}`);
  
  await logEvent(familyId, createdBy, 'reward_created', { title: name, starCost });
  
  return data;
}

export async function getRewardsByFamilyId(familyId: string): Promise<Reward[]> {
  const { data, error } = await supabase
    .from('rewards')
    .select()
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`获取奖励列表失败: ${error.message}`);
  return data || [];
}

export async function redeemReward(rewardId: string, memberId: string): Promise<Reward> {
  // 先获取奖励和成员信息
  const { data: reward, error: rewardError } = await supabase
    .from('rewards')
    .select('*, family_id')
    .eq('id', rewardId)
    .single();

  if (rewardError) throw new Error(`获取奖励失败: ${rewardError.message}`);

  if (reward.status !== 'available') {
    throw new Error('该奖励不可兑换');
  }

  const { data: member } = await supabase
    .from('members')
    .select('stars')
    .eq('id', memberId)
    .single();

  if (!member || member.stars < reward.star_cost) {
    throw new Error('星星不足');
  }

  // 更新奖励状态为待确认
  const { data, error } = await supabase
    .from('rewards')
    .update({
      status: 'pending_approval',
      redeemed_by: memberId,
    })
    .eq('id', rewardId)
    .select()
    .single();

  if (error) throw new Error(`兑换奖励失败: ${error.message}`);

  await logEvent(reward.family_id!, memberId, 'reward_redeemed', {
    rewardId: reward.id,
    title: reward.name,
    starCost: reward.star_cost,
    requiresParentApproval: true,
  });

  return data;
}

export async function approveReward(redeemedRewardId: string): Promise<void> {
  const { data: reward, error: fetchError } = await supabase
    .from('rewards')
    .select()
    .eq('id', redeemedRewardId)
    .single();

  if (fetchError) throw new Error(`获取奖励失败: ${fetchError.message}`);

  // 扣减星星
  if (reward.redeemed_by) {
    await addStarTransaction(
      reward.family_id!,
      reward.redeemed_by,
      reward.star_cost,
      'spend',
      `兑换奖励: ${reward.name}`,
      null,
      null,
      reward.id
    );
  }

  // 更新奖励状态为已兑换
  const { error } = await supabase
    .from('rewards')
    .update({
      status: 'redeemed',
      redeemed_at: new Date().toISOString(),
    })
    .eq('id', redeemedRewardId);

  if (error) throw new Error(`批准奖励失败: ${error.message}`);
}

export async function updateReward(
  rewardId: string,
  updates: Partial<Pick<Reward, 'name' | 'description' | 'star_cost' | 'icon' | 'image_url' | 'category' | 'stock'>>
): Promise<Reward> {
  const { data, error } = await supabase
    .from('rewards')
    .update(updates)
    .eq('id', rewardId)
    .select()
    .single();

  if (error) throw new Error(`更新奖励失败: ${error.message}`);
  return data;
}

export async function deleteReward(rewardId: string): Promise<void> {
  const { error } = await supabase
    .from('rewards')
    .delete()
    .eq('id', rewardId);

  if (error) throw new Error(`删除奖励失败: ${error.message}`);
}

// ==================== 星星流水 API ====================

export async function addStarTransaction(
  familyId: string,
  memberId: string,
  amount: number,
  type: 'earn' | 'spend',
  reason: string,
  relatedTaskId?: string | null,
  relatedHabitId?: string | null,
  relatedRewardId?: string | null
): Promise<StarTransaction> {
  const { data, error } = await supabase
    .from('star_transactions')
    .insert({
      family_id: familyId,
      member_id: memberId,
      amount,
      type,
      reason,
      related_task_id: relatedTaskId,
      related_habit_id: relatedHabitId,
      related_reward_id: relatedRewardId,
    })
    .select()
    .single();

  if (error) throw new Error(`记录星星流水失败: ${error.message}`);
  return data;
}

export async function getStarTransactionsByMemberId(memberId: string): Promise<StarTransaction[]> {
  const { data, error } = await supabase
    .from('star_transactions')
    .select()
    .eq('member_id', memberId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`获取星星流水失败: ${error.message}`);
  return data || [];
}

// ==================== 行为日志 API ====================

export async function logEvent(
  familyId: string,
  memberId: string | null,
  eventName: string,
  eventData: Record<string, any> = {}
): Promise<void> {
  const { error } = await supabase
    .from('analytics_events')
    .insert({
      family_id: familyId,
      member_id: memberId,
      event_name: eventName,
      event_data: eventData,
    });

  if (error) {
    console.error('记录行为日志失败:', error.message);
    // 不抛出错误，避免影响主流程
  }
}

export async function getAnalyticsEvents(
  familyId: string,
  startDate?: string,
  endDate?: string
): Promise<any[]> {
  let query = supabase
    .from('analytics_events')
    .select('*, member:members(name, avatar)')
    .eq('family_id', familyId);

  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw new Error(`获取行为日志失败: ${error.message}`);
  return data || [];
}

// ==================== 实时订阅 ====================

export function subscribeToFamilyChanges(
  familyId: string,
  tableName: 'tasks' | 'habits' | 'rewards' | 'members',
  callback: (payload: any) => void
) {
  return supabase
    .channel(`${tableName}_changes`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: tableName,
        filter: `family_id=eq.${familyId}`,
      },
      callback
    )
    .subscribe();
}

export function unsubscribeAll() {
  supabase.removeAllChannels();
}

// ==================== 批量导入 API ====================

export interface ImportData {
  members?: Array<{ name: string; role: 'parent' | 'child'; avatar?: string; stars?: number; pin?: string }>;
  tasks?: Array<{ title: string; description?: string; star_amount?: number; assignee_ids?: string[]; icon?: string; is_habit?: boolean }>;
  rewards?: Array<{ name: string; description?: string; star_cost?: number; icon?: string; image_url?: string; category?: string }>;
  history?: Array<{ member_id: string; amount: number; type: 'earn' | 'spend'; reason: string }>;
}

export async function bulkImport(familyId: string, data: ImportData, creatorId: string): Promise<void> {
  // 1. 导入成员（需要先创建，后续任务/历史才能关联）
  const memberMapping: Record<string, string> = {};
  if (data.members && data.members.length > 0) {
    for (const m of data.members) {
      const dbMember = await addMember(familyId, m.name, m.role, m.avatar);
      memberMapping[m.name] = dbMember.id;
      // 如果有初始星星数，更新
      if (m.stars && m.stars > 0) {
        await updateMemberStars(dbMember.id, m.stars);
      }
    }
  }

  // 2. 导入任务（直接插入，支持额外字段如 icon/is_habit）
  if (data.tasks && data.tasks.length > 0) {
    const taskRows = data.tasks.map(t => ({
      family_id: familyId,
      title: t.title,
      description: t.description || null,
      star_amount: t.star_amount || 5,
      assignee_ids: (t.assignee_ids || []).map(id => memberMapping[id] || id).filter(Boolean),
      creator_id: creatorId,
      icon: t.icon || null,
      is_habit: t.is_habit || false,
      status: 'pending',
    }));

    const { error: taskErr } = await supabase.from('tasks').insert(taskRows);
    if (taskErr) throw new Error(`导入任务失败: ${taskErr.message}`);
  }

  // 3. 导入奖励（直接插入，支持额外字段如 icon/image_url/category）
  if (data.rewards && data.rewards.length > 0) {
    const rewardRows = data.rewards.map(r => ({
      family_id: familyId,
      name: r.name,
      description: r.description || null,
      star_cost: r.star_cost || 10,
      icon: r.icon || null,
      image_url: r.image_url || null,
      category: r.category || null,
      creator_id: creatorId,
      status: 'available',
    }));

    const { error: rewardErr } = await supabase.from('rewards').insert(rewardRows);
    if (rewardErr) throw new Error(`导入奖励失败: ${rewardErr.message}`);
  }

  // 4. 导入历史记录（星星交易）
  if (data.history && data.history.length > 0) {
    for (const h of data.history) {
      const resolvedMemberId = memberMapping[h.member_id] || h.member_id;
      await addStarTransaction(
        familyId,
        resolvedMemberId,
        h.amount,
        h.type,
        h.reason,
        null,
        null,
        null
      );
    }
  }

  await logEvent(familyId, creatorId, 'data_imported', {
    memberCount: data.members?.length || 0,
    taskCount: data.tasks?.length || 0,
    rewardCount: data.rewards?.length || 0,
    historyCount: data.history?.length || 0,
  });
}
