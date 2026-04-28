# Forest Family 代码审核报告

**项目**：Forest Family（愿望卡）
**审核日期**：2026-04-25
**技术栈**：Vite + React 19 + TypeScript + TailwindCSS v4 + motion
**文件总数**：30 个源文件

---

## 🔴 严重问题（必须修复）

### 1. 敏感数据裸奔 — PIN 和密码明文存储
**文件**：`src/context/FamilyContext.tsx`
```typescript
// 第 47-52 行：密码以明文形式写入 localStorage
{ id: 'm1', name: '妈妈', pin: '1234', password: 'admin' }
// ...
```
**风险**：任何能访问浏览器 DevTools 的人都能看到所有用户的 PIN 和密码。
**修复**：密码应哈希存储（如 bcrypt），或者移除前端密码机制，改用后端验证。

---

### 2. 硬编码示例数据暴露真实用户信息
**文件**：`src/context/FamilyContext.tsx`
```typescript
// 第 46-52 行：默认成员包含真实姓名（坦坦、然然）和真实头像 URL
{ id: 'm1', name: '妈妈', avatar: 'https://images.unsplash.com/...' },
{ id: 'm4', name: '坦坦', avatar: '...', stars: 2500 },
{ id: 'm5', name: '然然', avatar: '...', stars: 2500 },
```
**风险**：这些数据会被写入 localStorage，生产环境会携带这些示例数据。
**修复**：替换为完全虚构的名字和默认头像，上线前删除。

---

### 3. `alert()` 阻断用户操作
**文件**：`src/context/FamilyContext.tsx`
```typescript
// 第 289-292 行
alert(`成功兑换: ${reward.name}! 🎉`);
alert('星星余额不足或奖励不可用 🌿');
```
**问题**：在移动端体验极差，会阻塞页面，且无法自定义样式。
**修复**：改用 Toast 组件（如 react-hot-toast）或内联成功/错误提示。

---

### 4. 重复数据导致余额不同步
**文件**：`src/context/FamilyContext.tsx`
```typescript
//redeemReward 中：记录了历史，但没有更新 currentUser 的 stars 余额
//而 context 暴露的 stars 来自 currentUser?.stars（第 312 行）
//所以兑换后界面上的星星余额不会变化！
```
**问题**：`redeemReward` 记录了历史，但没有同步扣减 `currentUser.stars`。
**修复**：
```typescript
// 在 redeemReward 中补充
setMembers(prev => prev.map(m =>
  m.id === currentUser.id ? { ...m, stars: m.stars - reward.cost } : m
));
setCurrentUser(prev => prev ? { ...prev, stars: prev.stars - reward.cost } : null);
```

---

### 5. 任务编辑后跳转逻辑错误
**文件**：`src/pages/PublishTask.tsx`
```typescript
// 第 213-216 行
frequency: isRepeatEnabled
  ? (formData.frequency === 'once' ? 'daily' : formData.frequency)
  : 'once',  // isRepeatEnabled=false 时强制设为 'once'，但后面习惯模式又会覆盖
```
**问题**：`isRepeatEnabled=false` 会把 frequency 设为 `'once'`，但后面第 219 行习惯模式下 `isHabit=true`，导致编辑习惯任务时重复逻辑混乱。

---

## 🟠 中等问题（建议修复）

### 6. 使用 `window.innerWidth` 计算动画位置
**文件**：`src/pages/PublishTask.tsx` 第 470、510 行
```typescript
animate={{ x: isEnabled ? (window.innerWidth < 640 ? 20 : 24) : 0 }}
```
**问题**：在服务端渲染（SSR）或 iframe 中会出错；窗口 resize 后不会更新。
**修复**：用 CSS 类切换代替 JS 动画控制，或用 `useMediaQuery` hook。

---

### 7. 完全不用的依赖服务器
**文件**：`package.json`
```json
"express": "^4.21.2",       // 已安装但未使用
"@types/express": "^4.17.21"
```
**问题**：增加 bundle 大小，影响打包速度。
**修复**：移除 express 依赖（除非计划添加后端）。

---

### 8. 导入整个 lucide-react 图标库
**文件**：`src/pages/PublishTask.tsx` 第 26 行
```typescript
import * as LucideIcons from 'lucide-react';
// 第 277 行使用：(LucideIcons as any)[name]
```
**问题**：无法 tree-shaking，打包时包含全部 1000+ 图标。
**修复**：
```typescript
// 只导入需要的图标
import { ListTodo, Star, Home as HomeIcon, Book } from 'lucide-react';
// 或用动态导入
```

---

### 9. 缺少加载状态和错误边界
**问题**：所有页面没有 loading spinner，网络错误没有任何提示，用户不知道发生了什么。
**修复**：添加 Suspense 边界 + 错误边界组件。

---

### 10. `date-fns` locale 未正确加载
**文件**：`src/pages/PublishTask.tsx` 第 43 行
```typescript
import { zhCN } from 'date-fns/locale';
// 使用处：format(date, 'yyyy年MM月', { locale: zhCN })
// 但 date-fns v3/v4 中 locale 导出方式已变更，可能导致构建警告
```
**修复**：确认 date-fns 版本并使用正确的 locale 导入方式。

---

### 11. 主题绿色色值不一致
**文件**：`src/index.css`
```css
--color-primary: #006e1c;   /* Tailwind CSS */
```
**文件**：设计稿 Stitch
```
主色调：#2E7D32（标准森林绿）
```
**问题**：CSS 中的 `#006e1c` 比设计稿深，整体绿色偏暗，导致 UI 和设计稿有色差。
**修复**：统一为 `#2E7D32`。

---

### 12. 习惯模式下的 `frequency` 处理逻辑混乱
**文件**：`src/pages/PublishTask.tsx` 第 213-220 行
```typescript
frequency: isRepeatEnabled
  ? (formData.frequency === 'once' ? 'daily' : formData.frequency)
  : 'once',
// ...
isHabit: viewMode === 'habit',
```
**问题**：习惯任务的 `frequency` 应该始终是 `'daily'`（或 `'custom'`），但逻辑会把它设为 `'once'`，导致习惯任务变成一次性任务。
**修复**：习惯模式下强制 `frequency: 'daily'`，忽略 `isRepeatEnabled` 开关。

---

### 13. 未处理的 `any` 类型泛滥
**文件**：多处
```typescript
// PublishTask.tsx 第 256 行
onSelect={(template: any) => {...}}

// Rewards.tsx 第 12 行
const [selectedReward, setSelectedReward] = useState<any>(null);

// Home.tsx 第 260 行
function PodiumItem({ member, rank, onMemberClick }: { member: any; ... })
```
**问题**：TypeScript 的类型安全几乎被绕过，增加运行时错误风险。
**修复**：定义统一的接口类型（RewardDetail、TaskTemplate 等）替代 `any`。

---

## 🟡 轻微问题（可优化）

### 14. 组件内定义组件（代码组织）
**文件**：`src/pages/PublishTask.tsx` 第 1332 行
```typescript
function SettingItem({ ... }) { ... }
// 在 PublishTask 函数组件内部定义了另一个函数组件
```
**问题**：每次父组件渲染都会重新创建子组件实例，导致子组件的 state 丢失和重渲染。
**修复**：将 `SettingItem` 提取为独立文件或至少移到组件外部。

---

### 15. 习惯模式缺少重复设置入口
**文件**：`src/pages/PublishTask.tsx` 习惯模式表单
```typescript
// 习惯模式有"保存"按钮（右侧），但没有调用 setShowRepeatModal
// 习惯模式的重复设置是缺失的，用户无法为习惯选择每周几等
```
**问题**：习惯模式跳过了重复设置 UI，与设计稿不符。
**修复**：习惯模式也需要显示重复设置入口。

---

### 16. 取消打卡后没有清除成功状态
**文件**：`src/pages/CheckIn.tsx` 第 27-34 行
```typescript
const handleCheckIn = () => {
  setTimeout(() => {
    completeTask(task.id); // 如果 completeTask 内部出错了，setIsSuccess(true) 仍会执行
    setIsSuccess(true);
  }, 300);
};
```
**问题**：`completeTask` 出错时仍会显示成功界面。
**修复**：将 `setIsSuccess(true)` 移到 `completeTask` 成功的回调中。

---

### 17. 历史记录从不持久化
**文件**：`src/context/FamilyContext.tsx` 第 193 行
```typescript
const [history, setHistory] = useState<HistoryRecord[]>([]);
// history 永远从空数组开始，没有读取 localStorage
```
**问题**：刷新页面后所有历史记录消失，但 tasks/members/rewards 都从 localStorage 恢复。
**修复**：像 members/tasks 一样从 localStorage 读取 history。

---

### 18. 页面 title 和 meta 信息缺失
**文件**：`index.html`
```html
<title>Vite + React</title>
<!-- 没有 description, theme-color, OG image 等 -->
```
**问题**：分享到微信等平台时没有正确的预览卡片。
**修复**：添加完整的 `<title>`, `<meta name="description">`, `<meta name="theme-color">`。

---

### 19. 未使用图标导致 Tree-shaking 警告
**文件**：`src/pages/Tasks.tsx` 第 2-19 行
```typescript
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  // ... 共导入了 20 个图标
} from 'lucide-react';
// Settings 在第 19 行导入但实际未使用
```
**修复**：移除未使用的导入。

---

### 20. `isHabit` 任务的日期过滤失效
**文件**：`src/pages/Tasks.tsx` 第 61-63 行
```typescript
const filteredTasks = viewMode === 'calendar'
  ? tasks.filter(t => isSameDay(new Date(t.startTime), selectedDate) && !t.isHabit)
  // 习惯任务被硬编码排除，无法在日历上查看
```
**问题**：习惯任务（如"多邻国英语"）应该也能在日历视图中展示进度，但被排除了。
**修复**：根据 `viewMode` 灵活控制 `isHabit` 的过滤逻辑。

---

## 📊 综合评分

| 维度 | 评分 | 说明 |
|:---|:---:|:---|
| **功能完整性** | ⭐⭐⭐⭐ | 13 个页面功能齐全，表单逻辑完整 |
| **代码质量** | ⭐⭐ | any 类型泛滥、组件嵌套定义、逻辑混乱 |
| **安全性** | ⭐ | 密码明文存储、无输入验证 |
| **性能** | ⭐⭐⭐ | 基本流畅，但 lucide 全量导入影响 bundle |
| **用户体验** | ⭐⭐⭐ | 视觉设计精美，但 alert 打断操作、缺 loading |
| **可维护性** | ⭐⭐ | 缺少测试、无错误边界、类型混乱 |

---

## ✅ 优先修复建议（按重要性排序）

1. **[P0]** 修复 `redeemReward` 的余额扣减逻辑（#4）
2. **[P0]** 用 Toast 替换 `alert()`（#3）
3. **[P0]** 移除硬编码真实姓名数据（#2）
4. **[P1]** 统一主题绿色为 `#2E7D32`（#11）
5. **[P1]** 习惯模式 `frequency` 逻辑修复（#12）
6. **[P1]** 添加 history 的 localStorage 持久化（#17）
7. **[P2]** 优化 lucide-react 导入（#8）
8. **[P2]** 移除未使用的 express 依赖（#7）
9. **[P2]** 添加 404.html 和错误边界
10. **[P3]** 优化 `SettingItem` 组件位置（#14）
