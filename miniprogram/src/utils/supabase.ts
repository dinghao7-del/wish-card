import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://your-project.supabase.co';
const supabaseAnonKey = 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Taro,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// 获取当前用户
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// 获取用户资料
export const getUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
  
  return data;
};

// 获取家庭任务
export const getFamilyTasks = async (familyId) => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('family_id', familyId)
    .order('start_time', { ascending: true });
  
  if (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
  
  return data;
};

// 创建任务
export const createTask = async (taskData) => {
  const { data, error } = await supabase
    .from('tasks')
    .insert(taskData)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating task:', error);
    return null;
  }
  
  return data;
};

// 打卡
export const checkIn = async (taskId, userId, type, content) => {
  const { data, error } = await supabase
    .from('check_ins')
    .insert({
      task_id: taskId,
      user_id: userId,
      type,
      content,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error checking in:', error);
    return null;
  }
  
  return data;
};

// 兑换奖励
export const exchangeReward = async (rewardId, userId, starCost) => {
  const { data, error } = await supabase
    .from('exchanges')
    .insert({
      reward_id: rewardId,
      user_id: userId,
      star_cost: starCost,
      status: 'pending',
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error exchanging reward:', error);
    return null;
  }
  
  return data;
};
