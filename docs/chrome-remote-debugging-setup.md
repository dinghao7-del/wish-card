# Chrome 远程调试设置指南

## 目的
允许 AI 远程控制你已登录的 Chrome 浏览器，直接操作 Supabase 控制台。

---

## 步骤 1: 完全关闭 Chrome

1. 右键点击 Dock 中的 Chrome 图标
2. 选择"退出"
3. 或者按 `Cmd+Q`

**确认完全关闭**:
- 打开"活动监视器"（Activity Monitor）
- 搜索 "Chrome"
- 应该看不到任何 Chrome 进程

---

## 步骤 2: 用远程调试模式启动 Chrome

1. 打开"终端"（Terminal）
2. 复制并粘贴以下命令：

```bash
killall "Google Chrome" 2>/dev/null; sleep 2; /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir="/Users/$(whoami)/Library/Application Support/Google/Chrome" &
```

3. 按回车执行
4. Chrome 会自动启动，并打开一个新窗口

---

## 步骤 3: 验证远程调试已启用

1. 打开 Chrome 后，在地址栏输入：
   ```
   chrome://inspect/#devices
   ```
2. 按回车
3. 应该能看到"Remote Target"部分

**或者，验证端口**:

1. 打开新终端标签
2. 运行：
   ```bash
   curl http://localhost:9222/json
   ```
3. 如果返回 JSON 数据，表示远程调试已成功启用

---

## 步骤 4: 访问 Supabase

1. 在 Chrome 地址栏输入：
   ```
   https://supabase.com/dashboard
   ```
2. 按回车
3. 确认你已经登录（能看到 Supabase Dashboard）

---

## 步骤 5: 通知 AI

回复 AI："**准备好了**"

AI 会立即连接到你的浏览器并开始操作。

---

## ⚠️ 重要注意事项

1. **保持 Chrome 窗口打开** - 不要关闭正在使用的 Chrome 窗口
2. **不要手动操作** - 当 AI 开始操作后，不要手动点击或输入
3. **可以随时中断** - 如果需要中断，关闭 Chrome 窗口即可

---

## 🐛 常见问题

### 问题 1: "Chrome 已经在运行"错误

**解决方案**:
```bash
killall "Google Chrome"
sleep 5
# 然后重新执行步骤 2 的命令
```

---

### 问题 2: 远程调试端口被占用

**解决方案**:
```bash
lsof -i :9222
kill -9 <PID>
# 然后重新执行步骤 2 的命令
```

---

### 问题 3: AI 无法连接

**解决方案**:
1. 确认 Chrome 是用远程调试模式启动的
2. 运行 `curl http://localhost:9222/json` 验证
3. 如果返回错误，重启 Chrome

---

## ✅ 完成标志

当你完成设置后：
1. Chrome 已启动
2. 可以访问 https://supabase.com/dashboard
3. 已登录 Supabase

**回复 AI："准备好了"**
