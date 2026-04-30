# Forest Family 微信小程序测试工作流

## 概述

本文档描述了 Forest Family 微信小程序的完整测试流程，包括开发环境搭建、构建、预览和发布。

## 环境要求

- Node.js 18+
- 微信开发者工具
- Taro CLI 4.0.0

## 项目结构

```
miniprogram/
├── src/
│   ├── components/     # 组件
│   ├── pages/          # 页面
│   ├── utils/          # 工具函数
│   ├── app.tsx         # 应用入口
│   ├── app.scss        # 全局样式
│   └── store.ts        # Redux store
├── config/             # Taro 配置
├── package.json        # 依赖
├── tsconfig.json       # TypeScript 配置
└── project.config.json # 小程序项目配置
```

## 快速开始

### 1. 安装依赖

```bash
cd /Users/zerone/WorkBuddy/20260420104543/miniprogram
npm install
```

### 2. 开发模式（热更新）

```bash
npm run dev:weapp
```

### 3. 构建生产版本

```bash
npm run build:weapp
```

## 测试流程

### 阶段 1: 代码检查

```bash
# 1. 检查 TypeScript 类型
cd /Users/zerone/WorkBuddy/20260420104543/miniprogram
npx tsc --noEmit

# 2. 检查 ESLint
npx eslint src --ext .ts,.tsx
```

### 阶段 2: 构建测试

```bash
# 1. 清理旧构建
rm -rf dist

# 2. 构建微信小程序
npm run build:weapp

# 3. 检查构建产物
ls -la dist/
```

### 阶段 3: 开发者工具测试

```bash
# 1. 打开微信开发者工具
# 2. 导入项目：选择 miniprogram/dist 目录
# 3. 填写 AppID（测试号或正式号）
# 4. 点击"编译"按钮
```

### 阶段 4: 真机调试

```bash
# 在微信开发者工具中：
# 1. 点击"真机调试"
# 2. 扫描二维码在手机上预览
# 3. 检查 Console 日志
```

## 页面功能测试清单

### 首页 (Home)
- [ ] 用户头像和名称显示
- [ ] 星星余额显示
- [ ] 快捷操作按钮（发布任务、查看日历、兑换奖励）
- [ ] 今日任务列表
- [ ] 家庭排行榜

### 任务页 (Tasks)
- [ ] 筛选 Tab（全部、今日、本周、已完成）
- [ ] 任务列表显示
- [ ] 任务状态切换
- [ ] 空状态显示

### 打卡页 (CheckIn)
- [ ] 任务信息卡片
- [ ] 打卡按钮
- [ ] 星星奖励提示
- [ ] 打卡成功/失败提示

### 奖励页 (Rewards)
- [ ] 分类 Tab（全部、娱乐、零食、特权）
- [ ] 奖励网格显示
- [ ] 星星余额显示
- [ ] 兑换功能
- [ ] 兑换确认弹窗

### 我的页 (Profile)
- [ ] 用户信息卡片
- [ ] 家庭成员列表
- [ ] 功能菜单（语音助手、消息通知、深色模式、账号安全）
- [ ] 退出登录功能

## API 测试

### Supabase 连接测试

```bash
# 测试数据库连接
# 在开发者工具 Console 中执行：
```

```javascript
// 测试获取当前用户
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user);

// 测试获取任务列表
const { data: tasks } = await supabase
  .from('tasks')
  .select('*')
  .limit(5);
console.log('Tasks:', tasks);
```

## 性能测试

### 1. 启动性能
- [ ] 冷启动时间 < 3s
- [ ] 热启动时间 < 1s

### 2. 页面加载
- [ ] 首页加载时间 < 2s
- [ ] 任务页加载时间 < 1.5s
- [ ] 图片懒加载正常

### 3. 内存占用
- [ ] 内存占用 < 200MB
- [ ] 无内存泄漏

## 兼容性测试

### 设备兼容性
- [ ] iPhone 各型号
- [ ] Android 主流机型
- [ ] iPad / Android Pad

### 微信版本兼容性
- [ ] 微信最新版
- [ ] 微信稳定版
- [ ] 基础库 3.0.0+

### 系统版本兼容性
- [ ] iOS 14+
- [ ] Android 8.0+

## 发布前检查清单

### 代码检查
- [ ] 所有 TypeScript 错误已修复
- [ ] ESLint 无错误
- [ ] 无 console.log 调试代码
- [ ] 无敏感信息泄露

### 功能检查
- [ ] 所有页面可正常访问
- [ ] 所有 API 调用正常
- [ ] 用户登录/登出正常
- [ ] 数据加载和显示正常

### 性能检查
- [ ] 包体积 < 2MB
- [ ] 启动时间符合要求
- [ ] 图片已压缩

### 安全检查
- [ ] Supabase 密钥未泄露
- [ ] API 调用有错误处理
- [ ] 用户数据有权限控制

## 发布流程

### 1. 上传代码

```bash
# 1. 构建生产版本
npm run build:weapp

# 2. 在微信开发者工具中：
#    - 点击"上传"按钮
#    - 填写版本号和项目备注
#    - 确认上传
```

### 2. 提交审核

```bash
# 1. 登录微信公众平台
# 2. 进入"版本管理"
# 3. 找到开发版本，点击"提交审核"
# 4. 填写审核信息
# 5. 等待审核结果（1-3个工作日）
```

### 3. 发布上线

```bash
# 审核通过后：
# 1. 在"版本管理"中找到审核通过的版本
# 2. 点击"发布"按钮
# 3. 确认发布
```

## 常见问题

### Q: 构建失败，提示缺少依赖
**A:** 运行 `npm install` 重新安装依赖

### Q: 开发者工具提示"未找到 app.json"
**A:** 确保构建成功，检查 `dist/app.json` 是否存在

### Q: API 调用失败
**A:** 
1. 检查 Supabase URL 和 Key 配置
2. 检查网络连接
3. 查看开发者工具 Network 面板

### Q: 样式不生效
**A:**
1. 检查 SCSS 语法是否正确
2. 确认样式文件已导入
3. 检查类名是否正确

## 更新记录

| 日期 | 版本 | 更新内容 |
|------|------|----------|
| 2026-05-01 | 1.0.0 | 初始版本，完成基础功能测试 |

## 相关文档

- [MOBILE_SYNC_WORKFLOW.md](./MOBILE_SYNC_WORKFLOW.md) - iOS/Android 同步工作流
- [DESIGN_TOKENS.md](./DESIGN_TOKENS.md) - 设计规范
