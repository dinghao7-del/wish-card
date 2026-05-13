# 离线优先 + 多端同步 数据架构设计方案

> **目标**: 断网时 App 可正常使用，联网后多端数据自动同步

---

## 一、现状问题诊断

### 1.1 当前数据流向（有缺陷）

```
                    当前（有问题）
                    ════════

网页A ──→ localStorage A ──┐
                           ├→ 三份数据互不相通！
网页B ──→ localStorage B ──┤
                           │
安卓  ──→ Capacitor存储  ──┤
                           │
小程序 ──→ Taro Storage  ──┘

Onboarding 数据: 100% 只写本地，永不上云 ❌
AI对话历史:     100% 只存本地 ❌
游客模式数据:   100% 只存本地（合理，无账号）✅
已登录用户操作: 部分上云，失败静默降级本地（无重传机制）⚠️
```

### 1.2 核心问题清单

| # | 问题 | 影响 |
|---|------|------|
| P1 | Onboarding 导入的孩子/任务/奖励只存 Taro Storage | 换设备数据全丢 |
| P2 | 没有离线操作队列 | 断网期间的操作联网后丢失 |
| P3 | 没有冲突解决机制 | 多人同时编辑同一任务会覆盖 |
| P4 | 三端 API 层不统一 | Web 有952行 api.ts，小程序只有216行基础封装 |
| P5 | 本地数据与云端数据格式不一致 | DB类型 vs 前端类型映射分散在各处 |

---

## 二、目标架构设计

### 2.1 总体架构图

```
                        目标架构
                        ════════

  ┌──────────────────────────────────────────────────────┐
  │                  统一数据层 (DataLayer)                │
  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
  │  │ 状态管理  │  │ 离线队列  │  │   同步引擎        │   │
  │  │StateStore│  │OfflineQueue│  │  SyncEngine      │   │
  │  └────┬─────┘  └────┬─────┘  └──────┬───────────┘   │
  │       │              │               │               │
  │  ┌────▼──────────────▼───────────────▼───────────┐   │
  │  │              本地存储适配器                     │   │
  │  │  StorageAdapter (Web/小程序/安卓 自动切换)      │   │
  │  └────────────────────┬──────────────────────────┘   │
  └───────────────────────┼──────────────────────────────┘
                          │
            ┌─────────────┼─────────────┐
            ▼             ▼             ▼
    ┌───────────┐ ┌──────────┐ ┌──────────────┐
    │Web localStorage│ │TaroStorage│ │ Capacitor   │
    │(Chrome/Safari)│ │(小程序)   │ │ (原生API)    │
    └───────────┘ └──────────┘ └──────────────┘
                          │
              ┌───────────▼───────────┐
              │    Supabase Cloud     │
              │  (PostgreSQL + RLS)   │
              └───────────────────────┘
```

### 2.2 核心设计原则

```
┌─────────────────────────────────────────────────────┐
│                   设计原则                           │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1️⃣  离线优先 (Offline First)                       │
│      → 所有写入先存本地 → 再异步上传云端              │
│      → 读操作永远先读本地（即时响应，0延迟）           │
│      → 用户感知不到网络状态差异                       │
│                                                     │
│  2️⃣  最终一致性 (Eventual Consistency)               │
│      → 联网后自动同步，允许短暂的中间状态             │
│      → 不要求强实时（家庭场景不需要银行级一致性）       │
│                                                     │
│  3️⃣  冲突解决 Last-Write-Wins + 人工确认             │
│      → 同一记录以 updated_at 最新者胜出               │
│      → 星星数等敏感字段需要人工确认（防止重复加分）     │
│                                                     │
│  4️⃣  操作幂等性                                     │
│      → 相同操作重复执行不会产生副作用                 │
│      → 每条离线操作有唯一 operationId                │
│                                                     │
│  5️⃣  游客模式隔离                                   │
│      → 未登录用户数据100%本地，不同步（当前行为不变）  │
│      → 登录后可选择合并本地数据到云端                 │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 三、详细技术方案

### 3.1 新增数据库表：`sync_queue`（离线操作队列）

```sql
-- 注意：此表只存在本地（IndexedDB / Taro Storage），不上云！
-- 用于暂存断网期间的待同步操作

-- 本地数据结构定义：
interface SyncOperation {
  id: string;                  // 唯一操作ID (uuid)
  table: string;               // 目标表名: 'tasks' | 'members' | 'rewards' | 'star_transactions'
  action: 'insert' | 'update' | 'delete';
  payload: Record<string, any>; // 完整的数据载荷
  familyId: string;            // 所属家庭（用于分组同步）
  createdAt: number;           // 创建时间戳（用于排序和冲突解决）
  retryCount: number;          // 重试次数
  status: 'pending' | 'syncing' | 'done' | 'failed';
  error?: string;              // 失败原因
}
```

**本地存储 Key**: `sync_queue_{familyId}` — 存储为 JSON 数组

### 3.2 新增本地表：`sync_metadata`（同步元数据）

```typescript
interface SyncMetadata {
  familyId: string;
  lastSyncAt: number;         // 上次成功同步时间戳 (server time)
  lastSyncHash: {             // 各表的哈希值（用于增量同步检测）
    [table: string]: string;   // table name → MD5 hash of all records
  };
  deviceId: string;           // 设备唯一标识（用于冲突溯源）
  pendingCount: number;        // 待同步操作数量
}
```

**本地存储 Key**: `sync_metadata`

### 3.3 统一 DataLayer 类设计

```typescript
// ====== 文件位置 ======
// Web/安卓: src/lib/DataLayer.ts
// 小程序:  miniprogram/src/lib/DataLayer.ts

class DataLayer {
  // ========== 配置 ==========
  private familyId: string;
  private userId: string;
  private isOnline: boolean;        // 网络状态
  private syncInterval: Timer | null = null;  // 自动同步定时器
  private SYNC_INTERVAL_MS = 30000; // 30秒检查一次同步
  private MAX_RETRY = 3;            // 最大重试次数

  // ========== 核心API（所有页面统一调用这些方法）==========
  
  // --- 任务 CRUD ---
  async addTask(task: Partial<Task>): Promise<Task>;
  async updateTask(id: string, changes: Partial<Task>): Promise<Task>;
  async deleteTask(id: string): Promise<void>;
  async getTasks(): Promise<Task[]>;
  
  // --- 成员 CRUD ---
  async addMember(member: Partial<Member>): Promise<Member>;
  async updateMember(id: string, changes: Partial<Member>): Promise<Member>;
  async deleteMember(id: string): Promise<void>;
  async getMembers(): Promise<Member[]>;
  
  // --- 奖励 CRUD ---
  async addReward(reward: Partial<Reward>): Promise<Reward>;
  async updateReward(id: string, changes: Partial<Reward>): Promise<Reward>;
  async deleteReward(id: string): Promise<void>;
  async getRewards(): Promise<Reward[]>;
  
  // --- 星星操作 ---
  async addStars(memberId: string, amount: number, reason: string): Promise<void>;
  
  // --- 同步控制 ---
  async syncNow(force?: boolean): Promise<SyncResult>;   // 手动触发同步
  getSyncStatus(): SyncStatus;                            // 查询同步状态
  startAutoSync(): void;                                  // 启动自动同步
  stopAutoSync(): void;                                   // 停止自动同步
  
  // --- 初始化 ---
  async initialize(familyId: string): Promise<void>;      // 首次加载：拉取云端数据
  async clearLocalData(): Promise<void>;                  // 清除本地缓存（登出时用）
}
```

### 3.4 关键流程：写入（Write Path）

```
用户点击"创建任务"
       │
       ▼
  ┌──────────────────┐
  │ 1. 生成本地ID     │  ← uuid v4（即使离线也有唯一ID）
  │ 2. 写入本地缓存   │  ← 立即反映到 UI（< 5ms）
  │ 3. 更新 React State│
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ 4. 加入离线队列   │  ← sync_queue 追加一条记录:
  │    {              │     {
  │      id: 'op_xxx',│       id: 'op_uuid',
  │      table:'tasks',│       table: 'tasks',
  │      action:'insert',│     action: 'insert',
  │      payload:{...},│       payload: {完整任务数据},
  │      status:'pending'│     createdAt: Date.now(),
  │    }              │       status: 'pending'
  │                   │     }
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ 5. 触发同步尝试   │  ← 如果在线 → 立即上传
  │                    │  如果离线 → 排队等待
  └──────────────────┘
```

### 3.5 关键流程：读取（Read Path）

```
页面请求"获取任务列表"
       │
       ▼
  ┌──────────────────┐
  │ 1. 读取本地缓存   │  ← 始终从本地读（即时返回）
  │    return cachedTasks;
  └────────┬─────────┘
           │
           ├── 在线？ ──→ 2. 后台静默刷新本地缓存
           │               （用户无感知，下次打开已是最新）
           │
           └── 离线？ ──→ 3. 直接返回本地缓存
                           （可能不是最新，但有数据可用）
```

### 3.6 关键流程：同步引擎（Sync Engine）

```
                    同步流程（每30秒或手动触发）
                    ════════════════════════

  ┌──────────────────────────────────────────┐
  │ 0. 检查网络状态                           │
  │    离线？→ 跳过本次，等待下次            │
  └──────────────────┬───────────────────────┘
                     ▼
  ┌──────────────────────────────────────────┐
  │ 1. PUSH: 上传本地待同步操作               │
  │                                         │
  │   遍历 sync_queue 中 status='pending'    │
  │   按 createdAt 升序排列（FIFO）           │
  │                                         │
  │   对每条操作:                            │
  │     a. 调用 Supabase API 执行            │
  │     b. 成功 → status='done', 更新本地ID  │
  │     c. 失败 → retryCount++              │
  │        retryCount >= 3 → status='failed'│
  │        retryCount < 3  → 下次重试       │
  └──────────────────┬───────────────────────┘
                     ▼
  ┌──────────────────────────────────────────┐
  │ 2. PULL: 拉取云端变更                    │
  │                                         │
  │   查询各表的 updated_at > lastSyncAt     │
  │   对比本地版本:                          │
  │     a. 云端有新增 → 合并到本地           │
  │     b. 云端有更新 → 冲突解决 ↓↓↓        │
  │     c. 云端有删除 → 从本地移除           │
  └──────────────────┬───────────────────────┘
                     ▼
  ┌──────────────────────────────────────────┐
  │ 3. 冲突解决 (Conflict Resolution)        │
  │                                         │
  │   场景: 同一任务被设备A和B同时修改        │
  │                                         │
  │   策略分三级:                            │
  │                                         │
  │   🔵 LWW (Last Write Wins) - 默认       │
  │      → updated_at 较新的覆盖旧的          │
  │      → 适用于: 任务标题、描述等           │
  │                                         │
  │   🟡 字段级合并 - 星星数/状态             │
  │      → 取较大值（星星不会减少）           │
  │      → 状态只向前推进（不回退）           │
  │      → 适用于: stars, status             │
  │                                         │
  │   🔴 人工确认 - 极少情况                  │
  │      → 两边都有实质性修改且时间戳相同     │
  │      → 标记为 conflicted，通知用户选择    │
  │      → 适用于: 几乎不会触发              │
  └──────────────────┬───────────────────────┘
                     ▼
  ┌──────────────────────────────────────────┐
  │ 4. 更新同步元数据                         │
  │    lastSyncAt = serverTime()             │
  │    清理已完成操作（保留最近100条做日志）  │
  └──────────────────────────────────────────┘
```

### 3.7 网络状态监听

```typescript
// 统一的网络状态管理
class NetworkMonitor {
  private isOnline: boolean = navigator.onLine;
  private listeners: Set<(online: boolean) => void> = new Set();
  
  constructor() {
    window.addEventListener('online', () => this.update(true));
    window.addEventListener('offline', () => this.update(false));
    // 小程序环境使用 wx.onNetworkStatusChange
    if (typeof wx !== 'undefined') {
      wx.onNetworkStatusChange((res: any) => this.update(res.isConnected));
    }
  }
  
  subscribe(callback: (online: boolean) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);  // unsubscribe
  }
  
  get online(): boolean { return this.isOnline; }
  
  private update(online: boolean) {
    this.isOnline = online;
    this.listeners.forEach(cb => cb(online));
    
    // 上线瞬间立即触发一次同步
    if (online) {
      dataLayer.syncNow();  // 联网立刻同步积压操作
    }
  }
}
```

### 3.8 Onboarding 改造（关键修复）

```
改造前（❌ 问题代码）:
  handleConfirm() {
    Taro.setStorageSync('onboarded_members', members);
    Taro.setStorageSync('onboarded_tasks', tasks);
    Taro.setStorageSync('onboarded_rewards', rewards);
  }

改造后（✅ 走统一数据层）:
  handleConfirm() {
    // 通过 DataLayer 写入 → 自动本地+云端
    for (const m of members) await dataLayer.addMember(m);
    for (const t of tasks)   await dataLayer.addTask(t);
    for (const r of rewards) await dataLayer.addReward(r);
    
    // 离线时排队等待，联网后自动同步
    // 多端登录后自动拉取到所有设备
  }
```

---

## 四、三端适配方案

### 4.1 存储适配器（StorageAdapter）

```typescript
// 统一存储接口 —— 三端共用同一套 API 签名
interface IStorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;  // 用于调试/清理
  clear(): Promise<void>;
}

// Web / 安卓 (Capacitor) 实现
class WebStorageAdapter implements IStorageAdapter {
  async getItem(key: string) { return localStorage.getItem(key); }
  async setItem(key: string, value: string) { localStorage.setItem(key, value); }
  async removeItem(key: string) { localStorage.removeItem(key); }
  async getAllKeys() { return Object.keys(localStorage); }
  async clear() { localStorage.clear(); }
}

// 小程序实现
class TaroStorageAdapter implements IStorageAdapter {
  async getItem(key: string) { return Taro.getStorageSync(key) || null; }
  async setItem(key: string, value: string) { Taro.setStorageSync(key, value); }
  async removeItem(key: string) { Taro.removeStorageSync(key); }
  async getAllKeys() { return Taro.getStorageInfoSync().keys; }
  async clear() { Taro.clearStorageSync(); }
}
```

### 4.2 文件结构规划

```
项目根目录/
├── src/lib/
│   ├── DataLayer.ts              # 🆕 Web/安卓统一数据层（核心）
│   ├── StorageAdapter.ts         # 🆕 存储适配器接口 + Web实现
│   ├── NetworkMonitor.ts         # 🆕 网络状态监听
│   ├── SyncEngine.ts             # 🆕 同步引擎（push/pull/conflict）
│   ├── supabase.ts               # ✅ 已有（保持不变）
│   └── api.ts                    # ✅ 已有（DataLayer 内部调用）
│
├── miniprogram/src/lib/
│   ├── DataLayer.ts              # 🆕 小程序版数据层（核心逻辑共享）
│   ├── StorageAdapter.ts         # 🆕 Taro 存储适配器实现
│   ├── NetworkMonitor.ts         # 🆕 小程序网络监听（wx.onNetworkStatusChange）
│   ├── SyncEngine.ts             # 🆕 小程序同步引擎
│   ├── supabase.ts               # ✅ 已有（保持不变）
│   └── aiEngine.ts               # ✅ 已有（保持不变）
│
└── docs/
    └── offline-first-sync-design.md  # 📄 本文档
```

### 4.3 共享逻辑策略

由于 Web 和小程序无法直接 `import` 彼此的代码（构建工具不同），采用 **协议对齐 + 核心逻辑各自复制** 的方式：

| 层级 | 策略 | 说明 |
|------|------|------|
| **接口定义 (TypeScript types)** | 各自维护，保持一致 | Task/Member/Reward 类型定义完全一致 |
| **同步算法 (SyncEngine)** | 核心算法复制到两端 | Push/Pull/Conflict 逻辑完全一样 |
| **Supabase API 调用** | 各自用自己的 supabase client | Web 用标准 fetch，小程序用 wx.request 适配 |
| **存储实现** | 各自实现 IStorageAdapter | Web=localStorage，小程序=Taro Storage |

> 未来可选优化：将共享逻辑抽成 npm 包 `@forest-family/data-layer`，但目前阶段直接复制更实际。

---

## 五、数据分类与同步策略矩阵

| 数据类型 | 存储位置 | 离线可用 | 多端同步 | 冲突策略 |
|----------|---------|---------|---------|---------|
| **家庭成员 (members)** | 云端+本地缓存 | ✅ | ✅ 登录后自动 | LWW |
| **任务列表 (tasks)** | 云端+本地缓存 | ✅ | ✅ 实时 | LWW + 状态只进不退 |
| **习惯打卡 (habits)** | 云端+本地缓存 | ✅ | ✅ | 计数取MAX |
| **奖励心愿 (rewards)** | 云端+本地缓存 | ✅ | ✅ | LWW |
| **星星流水 (transactions)** | 仅云端+队列 | ⚠️ 需联网 | ✅ | 追加式，无冲突 |
| **AI对话历史** | 纯本地 | ✅ | ❌ 不同步 | N/A |
| **Onboarding进度** | 纯本地 | ✅ | ❌ 中间态无需同步 | N/A |
| **游客模式数据** | 纯本地 | ✅ | ❌ 无账号无法同步 | N/A |
| **App配置/设置** | 云端 | ⚠️ 缓存可用 | ✅ | LWW |

---

## 六、用户体验设计

### 6.1 同步状态指示器

```
┌─────────────────────────────────────────┐
│  🟢 已同步 · 刚刚                        │  ← 全部同步完成
├─────────────────────────────────────────┤
│  🟡 同步中... 3条待上传                  │  ← 正在上传
├─────────────────────────────────────────┤
│  🔴 离线模式 · 5条变更待同步             │  ← 断网中
├─────────────────────────────────────────┤
│  🔴 同步失败 · 点击重试                  │  ← 网络错误
└─────────────────────────────────────────┘
```

位置：首页顶部导航栏右侧，小字显示。点击可展开详情面板。

### 6.2 离线提示

| 场景 | 提示方式 | 内容 |
|------|---------|------|
| 检测到断网 | Toast（2秒自动消失） | "已切换到离线模式，数据将在恢复网络后同步" |
| 离线时执行写入 | 底部横幅（可关闭） | "📴 离线 · 3 条变更待同步" |
| 恢复联网 | Toast | "网络已恢复，正在同步数据..." |
| 同步完成 | 静默 | 状态指示器变为绿色 |
| 同步失败 | 状态指示器变红 | 点击查看失败原因并重试 |

### 6.3 冲突处理UI（极端情况）

```
┌──────────────────────────────────────────────┐
│  ⚠️ 发现数据冲突                              │
│                                               │
│  任务: "整理房间"                             │
│                                               │
│  ┌─────────────────┐  ┌─────────────────┐    │
│  │ 📱 手机 (14:30)  │  │ 💻 电脑 (14:35)  │    │
│  │ 状态: completed  │  │ 状态: reviewing  │    │
│  │ 星星: +3⭐       │  │ 星星: +5⭐       │    │
│  └─────────────────┘  └─────────────────┘    │
│                                               │
│  [ 保留手机版本 ]    [ 保留电脑版本 ]          │
│  [ 合并两者 ]                                │
└──────────────────────────────────────────────┘
```

> 此界面只在极少数情况下出现（同秒编辑同一字段），大多数情况 LWW 自动解决。

---

## 七、实施计划

### Phase 1: 基础设施（预计工作量：核心模块）

| 步骤 | 内容 | 涉及文件 |
|------|------|---------|
| 1.1 | 创建 `StorageAdapter` 接口 + Web/Taro 双实现 | `src/lib/StorageAdapter.ts`, `miniprogram/src/lib/StorageAdapter.ts` |
| 1.2 | 创建 `NetworkMonitor` 网络状态监听 | `src/lib/NetworkMonitor.ts`, `miniprogram/src/lib/NetworkMonitor.ts` |
| 1.3 | 创建 `SyncEngine` 同步引擎核心 | `src/lib/SyncEngine.ts`, `miniprogram/src/lib/SyncEngine.ts` |
| 1.4 | 创建 `DataLayer` 统一数据层 | `src/lib/DataLayer.ts`, `miniprogram/src/lib/DataLayer.ts` |

### Phase 2: 接入现有功能（预计工作量：改造接入）

| 步骤 | 内容 | 涉及文件 |
|------|------|---------|
| 2.1 | Web端 `FamilyContext` 改用 DataLayer | `src/context/FamilyContext.tsx` |
| 2.2 | Onboarding `handleConfirm()` 改走 DataLayer | `miniprogram/src/pages/onboarding/index.tsx` |
| 2.3 | 小程序各页面改用 DataLayer CRUD | `miniprogram/src/pages/home/index.tsx`, tasks/*, rewards/* |
| 2.4 | 首页添加同步状态指示器 | `src/components/SyncIndicator.tsx` |

### Phase 3: 打磨体验（预计工作量：完善细节）

| 步骤 | 内容 |
|------|------|
| 3.1 | 登录页增加「合并本地数据」选项 |
| 3.2 | 设置页增加「同步状态」「手动同步」「清除缓存」入口 |
| 3.3 | 冲突处理弹窗 UI |
| 3.4 | 离线/恢复联网的动画过渡 |

---

## 八、风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|---------|
| localStorage 存储空间溢出（通常5-10MB） | 旧设备数据丢失 | 定期清理已完成操作；大数据走 IndexedDB |
| 并发冲突导致星星重复计算 | 经济损失 | 星星操作用追加模式（transaction log），不支持 update |
| Supabase RLS 阻塞跨家庭操作 | API 报错 | 确保 familyId 正确传递；错误日志记录 |
| 小程序 Taro Storage 限制（10MB） | 同上 | 压缩存储、定期清理 sync_queue |
| 首次加载大量数据慢 | 白屏等待 | 分页加载 + 骨架屏 + 进度条 |

---

## 九、性能指标目标

| 指标 | 目标值 |
|------|--------|
| 本地读取延迟 | < 10ms |
| 本地写入延迟 | < 5ms |
| 联网同步延迟 | < 3s (正常网络) |
| 离线操作排队 | 无限（受存储空间限制） |
| 冲突发生率 | < 0.1% |
| 数据一致性窗口 | < 30s（自动同步间隔） |
| 首次全量加载 | < 5s (100个任务以内) |
