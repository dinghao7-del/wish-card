// 浏览器端密码哈希工具（使用 Web Crypto API，不依赖 Node.js crypto）

const ENCODER = new TextEncoder();

async function sha256(message: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', ENCODER.encode(message));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// 生成随机 salt
export function generateSalt(length = 32): string {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// 哈希密码：SHA-256(salt + password)，迭代 10000 次
export async function hashPassword(password: string, salt?: string): Promise<string> {
  const s = salt || generateSalt();
  let hash = s + password;
  for (let i = 0; i < 10000; i++) {
    hash = await sha256(hash);
  }
  return `${s}:${hash}`;
}

// 验证密码
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const colonIdx = storedHash.indexOf(':');
  if (colonIdx === -1) return false;
  const salt = storedHash.substring(0, colonIdx);
  const expected = storedHash.substring(colonIdx + 1);
  let hash = salt + password;
  for (let i = 0; i < 10000; i++) {
    hash = await sha256(hash);
  }
  return hash === expected;
}

// 快速生成初始密码哈希（用于 SQL 迁移脚本）
export async function generateInitialHash(password: string): Promise<string> {
  return hashPassword(password);
}
