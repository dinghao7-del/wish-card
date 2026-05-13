// @ts-nocheck
import { createClient } from '@supabase/supabase-js';
import Taro from '@tarojs/taro';

const supabaseUrl = 'https://qdiuufuoleharmjfarzr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkaXV1ZnVvbGVoYXJtamZhcnpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMzQyNDMsImV4cCI6MjA5MjgxMDI0M30.THu9_M-69tEDUaK_Zjiz0p4rZmclvFt6HvQWIxtepbk';

/**
 * 微信小程序自定义 fetch
 * 用 Taro.request 替代原生 fetch
 * 注意：不使用 new Response / new Headers（小程序不支持）
 */
function wechatFetch(input: RequestInfo | URL, init?: RequestInit): Promise<any> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
  const options = init || {};
  const method = (options.method || 'GET').toUpperCase();

  // 解析 headers 为普通对象
  let headers: Record<string, string> = {};
  if (options.headers) {
    if (options.headers instanceof Headers) {
      (options.headers as Headers).forEach((v, k) => { headers[k] = v; });
    } else if (typeof options.headers === 'object') {
      headers = { ...options.headers } as Record<string, string>;
    }
  }

  // 解析 body
  let data: any;
  if (options.body) {
    try { data = JSON.parse(options.body as string); } catch { data = options.body; }
  }

  return new Promise((resolve, reject) => {
    Taro.request({
      url: url as string,
      method: method as any,
      header: headers,
      data,
      success: (res) => {
        // 返回兼容 Response 对象的 plain object（避免使用 new Response/Headers）
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          statusText: res.statusCode === 200 ? 'OK' : 'Error',
          json: async () => res.data,
          text: async () => JSON.stringify(res.data),
          headers: new Proxy(headers, {}),
        });
      },
      fail: (err) => {
        reject(new Error(`Network request failed: ${err.errMsg}`));
      },
    });
  });
}

// 懒初始化：避免模块加载时全局对象未定义
let _client: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!_client) {
    _client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: Taro as unknown as Storage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      global: {
        fetch: wechatFetch as any,
      },
    });
  }
  return _client;
}

// 向后兼容的导出（Proxy 模式）
export const supabase = new Proxy({} as any, {
  get(_, prop) {
    // 特殊属性：返回原始 client 对象
    if (prop === 'client') return getSupabase();
    const client = getSupabase();
    const val = (client as any)[prop];
    if (typeof val === 'function') return val.bind(client);
    return val;
  },
});

// 直接获取原始 Supabase client（供需要 .client 的场景）
export { getSupabase };

// 获取当前用户
export const getCurrentUser = async () => {
  const { data: { user } } = await getSupabase().auth.getUser();
  return user;
};

// 获取用户资料
export const getUserProfile = async (userId) => {
  const { data, error } = await getSupabase()
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
  const { data, error } = await getSupabase()
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
  const { data, error } = await getSupabase()
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
  const { data, error } = await getSupabase()
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
  const { data, error } = await getSupabase()
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
