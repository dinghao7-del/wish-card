/**
 * Clerk 认证配置
 * 使用 Clerk 提供完整的用户认证和管理功能
 * 免费额度：50,000 MAU
 * 文档：https://clerk.com/docs
 */

// Clerk Publishable Key
// 需要从 https://dashboard.clerk.com 获取
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';

// 初始化 Clerk 实例
type ClerkInstance = { load?: () => Promise<void> };
let clerkInstance: ClerkInstance | null = null;

export async function initClerk() {
  if (!CLERK_PUBLISHABLE_KEY) {
    console.warn('[Clerk] 未配置 CLERK_PUBLISHABLE_KEY');
    return null;
  }
  
  console.warn('[Clerk] 当前项目使用 @clerk/clerk-react 组件接入，旧 clerk.ts 初始化器保留为兼容空实现');
  
  return clerkInstance;
}

export function getClerk() {
  return clerkInstance;
}

export { CLERK_PUBLISHABLE_KEY };
