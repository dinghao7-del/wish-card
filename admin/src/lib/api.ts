import supabase, { supabaseAdmin, type Database } from './supabase';

export type FamilyWithMembers = Database['public']['Tables']['families']['Row'] & { member_count: number };
type InviteCode = Database['public']['Tables']['invite_codes']['Row'];
type Member = Database['public']['Tables']['members']['Row'];
type AppConfig = Database['public']['Tables']['app_config']['Row'];
type StarTransaction = Database['public']['Tables']['star_transactions']['Row'];

// ==================== 认证 ====================

export async function adminLogin(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  // 检查是否是管理员
  const isAdmin = data.user?.app_metadata?.admin === true;
  if (!isAdmin) {
    await supabase.auth.signOut();
    throw new Error('该账号无管理员权限');
  }

  // 获取管理员角色
  const { data: adminUser } = await supabaseAdmin
    .from('admin_users')
    .select('role')
    .eq('user_id', data.user.id)
    .single();

  return {
    user: data.user,
    role: adminUser?.role || 'operator',
  };
}

export async function adminLogout() {
  await supabase.auth.signOut();
}

export async function getAdminUser() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const isAdmin = session.user.app_metadata?.admin === true;
  if (!isAdmin) return null;

  const { data: adminUser } = await supabaseAdmin
    .from('admin_users')
    .select('role')
    .eq('user_id', session.user.id)
    .single();

  return {
    user: session.user,
    role: adminUser?.role || 'operator',
  };
}

// ==================== 仪表盘统计 ====================

export interface DashboardStats {
  totalUsers: number;
  totalFamilies: number;
  totalTasks: number;
  totalCompletedTasks: number;
  totalStarsEarned: number;
  totalStarsSpent: number;
  totalInviteCodes: number;
  usedInviteCodes: number;
  todayNewUsers: number;
  todayNewFamilies: number;
  recentUsers: { date: string; count: number }[];
  recentFamilies: { date: string; count: number }[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const today = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [
    { count: totalUsers },
    { count: totalFamilies },
    { count: totalTasks },
    { count: totalCompletedTasks },
    { data: starData },
    { count: totalInviteCodes },
    { count: usedInviteCodes },
    { count: todayNewUsers },
    { count: todayNewFamilies },
    { data: recentMembers },
    { data: recentFamiliesData },
  ] = await Promise.all([
    supabaseAdmin.from('members').select('*', { count: 'exact', head: true }).eq('role', 'parent'),
    supabaseAdmin.from('families').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('tasks').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('tasks').select('*', { count: 'exact', head: true }).eq('completed', true),
    supabaseAdmin.from('star_transactions').select('type, amount'),
    supabaseAdmin.from('invite_codes').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('invite_codes').select('*', { count: 'exact', head: true }).gt('current_uses', 0),
    supabaseAdmin.from('members').select('*', { count: 'exact', head: true }).eq('role', 'parent').gte('created_at', today),
    supabaseAdmin.from('families').select('*', { count: 'exact', head: true }).gte('created_at', today),
    // 最近7天用户注册趋势
    supabaseAdmin.from('members').select('created_at').eq('role', 'parent').gte('created_at', sevenDaysAgo).order('created_at'),
    // 最近7天家庭创建趋势
    supabaseAdmin.from('families').select('created_at').gte('created_at', sevenDaysAgo).order('created_at'),
  ]);

  let totalStarsEarned = 0;
  let totalStarsSpent = 0;
  if (starData) {
    for (const t of starData) {
      if (t.type === 'earn') totalStarsEarned += t.amount;
      else totalStarsSpent += t.amount;
    }
  }

  // 按天汇总趋势数据
  const recentUsers = groupByDate(recentMembers || [], 7);
  const recentFamilies = groupByDate(recentFamiliesData || [], 7);

  return {
    totalUsers: totalUsers || 0,
    totalFamilies: totalFamilies || 0,
    totalTasks: totalTasks || 0,
    totalCompletedTasks: totalCompletedTasks || 0,
    totalStarsEarned,
    totalStarsSpent,
    totalInviteCodes: totalInviteCodes || 0,
    usedInviteCodes: usedInviteCodes || 0,
    todayNewUsers: todayNewUsers || 0,
    todayNewFamilies: todayNewFamilies || 0,
    recentUsers,
    recentFamilies,
  };
}

function groupByDate(items: { created_at: string }[], days: number): { date: string; count: number }[] {
  const result: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];
    const count = items.filter((item) => item.created_at.startsWith(dateStr)).length;
    result.push({ date: `${d.getMonth() + 1}/${d.getDate()}`, count });
  }
  return result;
}

// ==================== 邀请码管理 ====================

export async function getInviteCodes(): Promise<InviteCode[]> {
  const { data, error } = await supabaseAdmin
    .from('invite_codes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`获取邀请码列表失败: ${error.message}`);
  return data || [];
}

export async function createInviteCode(params: {
  code?: string;
  description?: string;
  max_uses?: number;
  expires_at?: string;
}, createdBy: string): Promise<InviteCode> {
  const code = params.code || generateInviteCode();
  const { data, error } = await supabaseAdmin
    .from('invite_codes')
    .insert({
      code: code.toUpperCase().trim(),
      description: params.description || null,
      max_uses: params.max_uses ?? 1,
      created_by: createdBy,
      expires_at: params.expires_at || null,
    })
    .select()
    .single();
  if (error) throw new Error(`创建邀请码失败: ${error.message}`);
  return data;
}

export async function batchCreateInviteCodes(params: {
  count: number;
  prefix?: string;
  max_uses?: number;
  description?: string;
  expires_at?: string;
}, createdBy: string): Promise<InviteCode[]> {
  const codes: InviteCode[] = [];
  for (let i = 0; i < params.count; i++) {
    const prefix = params.prefix || '';
    const code = prefix + generateInviteCode(Math.max(4, 8 - prefix.length));
    const inviteCode = await createInviteCode({
      code,
      description: params.description,
      max_uses: params.max_uses,
      expires_at: params.expires_at,
    }, createdBy);
    codes.push(inviteCode);
  }
  return codes;
}

export async function updateInviteCode(id: string, updates: Partial<Pick<InviteCode, 'is_active' | 'description' | 'max_uses' | 'expires_at'>>): Promise<InviteCode> {
  const { data, error } = await supabaseAdmin
    .from('invite_codes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(`更新邀请码失败: ${error.message}`);
  return data;
}

export async function deleteInviteCode(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('invite_codes')
    .delete()
    .eq('id', id);
  if (error) throw new Error(`删除邀请码失败: ${error.message}`);
}

export function generateInviteCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ==================== 用户管理 ====================

export interface AdminUserView {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  family_id: string | null;
  family_name: string | null;
  role: string;
  is_active: boolean;
  stars: number;
  created_at: string;
  last_sign_in_at: string | null;
}

type MemberWithFamily = Member & { families: { name: string } | null };

export async function getUsers(page = 1, pageSize = 20, search = ''): Promise<{ users: AdminUserView[]; total: number }> {
  let query = supabaseAdmin
    .from('members')
    .select('*, families(name)', { count: 'exact' })
    .eq('role', 'parent');

  if (search) {
    query = query.or(`name.ilike.%${search}%,id.ilike.%${search}%`);
  }

  const from = (page - 1) * pageSize;
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) throw new Error(`获取用户列表失败: ${error.message}`);

  const users: AdminUserView[] = (data || []).map((m: MemberWithFamily) => ({
    id: m.id,
    email: '-',
    name: m.name,
    avatar: m.avatar,
    family_id: m.family_id,
    family_name: m.families?.name || '-',
    role: m.role,
    is_active: m.is_active,
    stars: m.stars,
    created_at: m.created_at,
    last_sign_in_at: null,
  }));

  return { users, total: count || 0 };
}

export async function getUserDetail(memberId: string) {
  const { data: member, error } = await supabaseAdmin
    .from('members')
    .select('*, families(*)')
    .eq('id', memberId)
    .single();

  if (error) throw new Error(`获取用户详情失败: ${error.message}`);

  // 获取该用户家庭的成员
  let familyMembers: Member[] = [];
  if (member.family_id) {
    const { data: members } = await supabaseAdmin
      .from('members')
      .select('*')
      .eq('family_id', member.family_id);
    familyMembers = members || [];
  }

  // 获取任务统计
  let taskStats = { total: 0, completed: 0, pending: 0 };
  if (member.family_id) {
    const [
      { count: total },
      { count: completed },
      { count: pending },
    ] = await Promise.all([
      supabaseAdmin.from('tasks').select('*', { count: 'exact', head: true }).eq('family_id', member.family_id),
      supabaseAdmin.from('tasks').select('*', { count: 'exact', head: true }).eq('family_id', member.family_id).eq('completed', true),
      supabaseAdmin.from('tasks').select('*', { count: 'exact', head: true }).eq('family_id', member.family_id).eq('completed', false),
    ]);
    taskStats = { total: total || 0, completed: completed || 0, pending: pending || 0 };
  }

  // 获取星星流水最近10条
  let recentTransactions: StarTransaction[] = [];
  const { data: txData } = await supabaseAdmin
    .from('star_transactions')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })
    .limit(10);
  recentTransactions = txData || [];

  return { member, familyMembers, taskStats, recentTransactions };
}

export async function banUser(memberId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('members')
    .update({ is_active: false })
    .eq('id', memberId);
  if (error) throw new Error(`封禁用户失败: ${error.message}`);
}

export async function unbanUser(memberId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('members')
    .update({ is_active: true })
    .eq('id', memberId);
  if (error) throw new Error(`解封用户失败: ${error.message}`);
}

// ==================== 家庭管理 ====================

export async function getFamilies(page = 1, pageSize = 20, search = ''): Promise<{ families: FamilyWithMembers[]; total: number }> {
  let query = supabaseAdmin
    .from('families')
    .select('*', { count: 'exact' });

  if (search) {
    query = query.or(`name.ilike.%${search}%,id.ilike.%${search}%`);
  }

  const from = (page - 1) * pageSize;
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) throw new Error(`获取家庭列表失败: ${error.message}`);

  // 获取每个家庭的成员数
  const familiesWithMembers = await Promise.all(
    (data || []).map(async (f: Database['public']['Tables']['families']['Row']) => {
      const { count: memberCount } = await supabaseAdmin
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('family_id', f.id);
      return { ...f, member_count: memberCount || 0 };
    })
  );

  return { families: familiesWithMembers, total: count || 0 };
}

import type { FamilyDetail } from './types';

export async function getFamilyDetail(familyId: string): Promise<FamilyDetail> {
  const { data: family, error } = await supabaseAdmin
    .from('families')
    .select('*')
    .eq('id', familyId)
    .single();
  if (error) throw new Error(`获取家庭详情失败: ${error.message}`);

  const { data: members } = await supabaseAdmin
    .from('members')
    .select('*')
    .eq('family_id', familyId)
    .order('role', { ascending: true });

  const { count: taskCount } = await supabaseAdmin
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('family_id', familyId);

  const { count: completedTaskCount } = await supabaseAdmin
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('family_id', familyId)
    .eq('completed', true);

  return {
    family,
    members: members || [],
    taskCount: taskCount || 0,
    completedTaskCount: completedTaskCount || 0,
  };
}

// ==================== 系统配置 ====================

export async function getAppConfigs(): Promise<AppConfig[]> {
  const { data, error } = await supabaseAdmin
    .from('app_config')
    .select('*')
    .order('key');
  if (error) throw new Error(`获取配置失败: ${error.message}`);
  return data || [];
}

export async function updateAppConfig(key: string, value: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('app_config')
    .update({ value, updated_at: new Date().toISOString() })
    .eq('key', key);
  if (error) throw new Error(`更新配置失败: ${error.message}`);
}

// ==================== AI助手配置 ====================

interface AIConfigRow {
  id?: string;
  key: string;
  value: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export async function getAIConfigs(): Promise<AIConfigRow[]> {
  const { data, error } = await supabaseAdmin
    .from('app_config')
    .select('*')
    .like('key', 'ai_%')
    .order('key');
  if (error) throw new Error(`获取AI配置失败: ${error.message}`);
  return data || [];
}

export async function updateAIConfig(key: string, value: string): Promise<void> {
  // 先尝试更新现有配置
  const { data: existing } = await supabaseAdmin
    .from('app_config')
    .select('id')
    .eq('key', key)
    .single();

  if (existing) {
    // 更新现有配置
    const { error } = await supabaseAdmin
      .from('app_config')
      .update({ value, updated_at: new Date().toISOString() })
      .eq('key', key);
    if (error) throw new Error(`更新AI配置失败: ${error.message}`);
  } else {
    // 创建新配置
    const { error } = await supabaseAdmin
      .from('app_config')
      .insert({
        key,
        value,
        description: getAIConfigDescription(key),
        category: 'ai',
      });
    if (error) throw new Error(`创建AI配置失败: ${error.message}`);
  }
}

// AI配置项描述映射
function getAIConfigDescription(key: string): string {
  const descriptions: Record<string, string> = {
    'ai_enabled': '是否启用AI语音助手功能',
    'ai_provider': 'AI服务提供商: gemini/openai/claude/custom',
    'ai_model': '使用的AI模型名称',
    'ai_api_key': 'AI服务的API密钥（敏感信息）',
    'ai_api_endpoint': '自定义API端点（可选，用于代理或自建服务）',
    'ai_temperature': 'AI回复的随机性参数（0-1）',
    'ai_max_tokens': 'AI回复的最大Token数量',
  };
  return descriptions[key] || '';
}
