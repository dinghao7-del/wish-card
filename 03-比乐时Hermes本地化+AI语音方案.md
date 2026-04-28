# 比乐时 Hermes 本地化 + AI 语音方案

> **无云依赖 · 隐私优先 · 语音驱动**
>
> 文档版本：v1.0
> 完成时间：2026-04-20

---

## 一、核心架构变更：从云端到本地

### 1.1 原方案 vs 新方案对比

| 功能模块 | 原方案（云端） | 新方案（Hermes本地） |
|---------|-------------|-------------------|
| **用户认证** | 云端JWT服务 | 本地加密存储 |
| **数据存储** | 云端PostgreSQL | 本地SQLite/Hive |
| **文件存储** | 阿里云OSS | 本地文件系统 + iCloud可选 |
| **实时同步** | WebSocket云端 | Hermes本地 + 点对点 |
| **推送通知** | FCM云端推送 | 本地通知 + AirDrop家庭共享 |
| **LLM能力** | 第三方API | 本地Ollama/LM Studio |
| **语音识别** | 第三方语音识别 | Whisper 本地识别 |

### 1.2 新架构总览

```
用户设备层
├── iPhone (Flutter App)
├── iPad (Flutter App)
└── Mac/PC (Web App)

        ↓

Hermes Agent 本地大脑
├── Ollama (LLM推理)
├── Whisper (语音识别)
├── TTS (语音合成)
└── LangChain (工具调用)

        ↓

本地数据层
├── SQLite (结构化数据)
├── Hive (键值存储)
├── Files (照片/附件)
└── Keys (加密密钥)

        ↓

可选同步层
├── iCloud (家庭成员)
├── AirDrop (快速分享)
└── 局域网 (P2P同步)
```

---

## 二、本地化数据架构设计

### 2.1 数据分层存储

```
~/Library/Application Support/bilesi/
├── data/
│   ├── database.sqlite          # 主数据库
│   ├── knowledge.graph          # 知识图谱
│   └── embeddings/             # 向量索引
├── files/
│   ├── photos/                 # 照片原图
│   ├── recipes/               # 食谱图片
│   └── attachments/           # 其他附件
├── cache/
│   ├── llm_cache/             # LLM响应缓存
│   └── image_cache/           # 图片缓存
└── config/
    ├── settings.json           # 用户设置
    ├── family_config.json      # 家庭配置
    └── voice_profiles.json     # 语音配置
```

### 2.2 数据库 Schema（SQLite）

```sql
-- 用户表
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    nickname TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    encryption_key TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- 家庭表
CREATE TABLE families (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

-- 家庭成员表
CREATE TABLE family_members (
    id TEXT PRIMARY KEY,
    family_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    nickname TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'editor', 'viewer')),
    color TEXT NOT NULL DEFAULT '#4A90D9',
    star_balance INTEGER NOT NULL DEFAULT 0,
    voice_enabled INTEGER DEFAULT 1,
    voice_wake_word TEXT,
    joined_at INTEGER NOT NULL
);

-- 任务表
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    family_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    icon_type TEXT DEFAULT 'emoji',
    icon_value TEXT,
    reward_stars INTEGER DEFAULT 1,
    allow_overdue INTEGER DEFAULT 1,
    is_competition INTEGER DEFAULT 0,
    recurrence_rule TEXT,
    start_date TEXT,
    start_time TEXT,
    end_date TEXT,
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    sync_status TEXT DEFAULT 'local'
);

-- 任务分配
CREATE TABLE task_assignments (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    completed_at INTEGER,
    order_rank INTEGER,
    UNIQUE(task_id, member_id)
);

-- 星星交易记录
CREATE TABLE star_transactions (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('task', 'manual', 'reward', 'penalty', 'cancellation')),
    description TEXT,
    related_task_id TEXT,
    created_by TEXT,
    created_at INTEGER NOT NULL
);

-- 奖励物品
CREATE TABLE reward_items (
    id TEXT PRIMARY KEY,
    family_id TEXT NOT NULL,
    title TEXT NOT NULL,
    icon_type TEXT DEFAULT 'emoji',
    icon_value TEXT,
    cost_stars INTEGER NOT NULL,
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

-- 兑换记录
CREATE TABLE reward_redemptions (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL,
    reward_item_id TEXT NOT NULL,
    stars_spent INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    redeemed_at INTEGER NOT NULL,
    cancelled_at INTEGER,
    cancelled_by TEXT
);

-- 语音命令历史
CREATE TABLE voice_commands (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL,
    transcript TEXT NOT NULL,
    intent TEXT NOT NULL,
    entities TEXT,
    action_taken TEXT,
    confidence REAL,
    created_at INTEGER NOT NULL
);

-- 索引
CREATE INDEX idx_tasks_family ON tasks(family_id);
CREATE INDEX idx_tasks_date ON tasks(start_date);
CREATE INDEX idx_star_transactions_member ON star_transactions(member_id);
CREATE INDEX idx_voice_commands_member ON voice_commands(member_id);
```

---

## 三、AI 语音操作功能设计

### 3.1 语音交互架构

```
用户语音 → 语音输入层 → 语音识别层 → 意图理解层 → 工具执行层 → 语音输出层
         (唤醒词检测)   (Whisper)    (本地LLM)    (业务操作)    (TTS合成)
```

### 3.2 语音命令完整列表

#### 📋 任务管理

| 用户说 | 意图 | 执行的系统动作 |
|:------|:-----|:--------------|
| "帮我发布一个整理房间的任务" | create_task | 创建任务：整理房间 |
| "查看今天的任务" | list_tasks | 显示今日任务列表 |
| "小明完成了整理房间" | complete_task | 标记任务完成，发放星星 |
| "删除昨天的任务" | delete_task | 删除指定任务 |
| "给任务加个奖励" | update_task_reward | 修改任务奖励 |

#### ⭐ 星星管理

| 用户说 | 意图 | 执行的系统动作 |
|:------|:-----|:--------------|
| "我有多少星星" | query_stars | 播报当前星星余额 |
| "给小红加5颗星星" | adjust_stars | 增加小红5颗星 |
| "查看星星排行榜" | query_leaderboard | 显示家庭排行榜 |

#### 🎁 奖励兑换

| 用户说 | 意图 | 执行的系统动作 |
|:------|:-----|:--------------|
| "我想兑换游戏时间" | redeem_reward | 扣除星星，完成兑换 |
| "有什么奖励可以换" | list_rewards | 显示奖励目录 |
| "撤销刚才的兑换" | cancel_redemption | 撤销24小时内的兑换 |

#### 📅 日历管理

| 用户说 | 意图 | 执行的系统动作 |
|:------|:-----|:--------------|
| "看看明天的安排" | query_calendar | 显示明天日历 |
| "添加一个周五晚上的电影时间" | create_event | 创建日历事件 |
| "这周有什么安排" | list_week_events | 显示本周日历 |

#### 🍽️ 餐食规划

| 用户说 | 意图 | 执行的系统动作 |
|:------|:-----|:--------------|
| "今天晚饭吃什么" | query_meal | 显示晚餐安排 |
| "添加红烧肉到食谱库" | add_recipe | 添加食谱 |
| "这周午餐安排一下" | plan_meal_week | 批量设置周午餐 |

#### 📷 家庭相册

| 用户说 | 意图 | 执行的系统动作 |
|:------|:-----|:--------------|
| "上传今天拍的照片" | upload_photos | 打开相机/相册 |
| "查看旅行相册" | view_album | 打开旅行相册 |
| "把照片标记为珍藏" | cherish_photo | 设置珍藏标记 |

#### 💬 智能对话

| 用户说 | 意图 | 执行的系统动作 |
|:------|:-----|:--------------|
| "今天有什么新鲜事" | daily_summary | 播报今日摘要 |
| "小明这周表现怎么样" | member_report | 播报小明周报 |
| "给我讲个笑话" | fun_response | 讲笑话 |

### 3.3 意图分类 Prompt（本地 LLM）

```markdown
# 比乐时语音助手 - 意图分类系统

## 系统角色
你是一个家庭任务管理应用的语音助手，名为"小乐"。

## 可识别的意图列表

### 任务相关
- `create_task`: 创建新任务
- `list_tasks`: 查看任务列表
- `complete_task`: 完成任务
- `delete_task`: 删除任务
- `update_task`: 更新任务

### 日历相关
- `query_calendar`: 查询日历
- `create_event`: 创建日历事件
- `list_week_events`: 查看周事件

### 星星相关
- `query_stars`: 查询星星余额
- `adjust_stars`: 调整星星
- `query_leaderboard`: 排行榜

### 奖励相关
- `redeem_reward`: 兑换奖励
- `list_rewards`: 查看奖励列表
- `cancel_redemption`: 撤销兑换

### 餐食相关
- `query_meal`: 查询餐食
- `add_recipe`: 添加食谱
- `plan_meal_week`: 批量规划

### 相册相关
- `upload_photos`: 上传照片
- `view_album`: 查看相册
- `cherish_photo`: 珍藏照片

### 对话相关
- `daily_summary`: 今日摘要
- `member_report`: 成员报告
- `fun_response`: 趣味互动

## 输出格式
```json
{
  "intent": "create_task",
  "entities": {
    "title": "整理房间",
    "reward_stars": 5,
    "assignee": "小明",
    "date": "今天"
  },
  "confidence": 0.95,
  "needs_confirmation": true,
  "confirmation_text": "好的，我帮你创建一个整理房间的任务，完成后可以获得5颗星星，是给小明安排的吗？"
}
```

## 家庭成员识别
当前家庭成员：
- 小明（孩子）- 颜色：橙色
- 爸爸 - 颜色：蓝色
- 妈妈 - 颜色：绿色

## 时间表达识别
- "今天" = 当前日期
- "明天" = 当前日期+1
- "后天" = 当前日期+2
- "这周" = 本周一到周日
- "周五" = 本周或下周的周五

## 响应风格
- 语音回复要简短自然，适合语音播报
- 使用亲切友好的语气
- 对孩子的回复可以更活泼
```

### 3.4 语音命令执行器实现

```dart
// lib/voice/voice_command_executor.dart

class VoiceCommandExecutor {
  final HermesDataService _dataService;
  final WhisperService _whisper;
  final TtsService _tts;
  final IntentClassifier _classifier;

  VoiceCommandExecutor({
    required HermesDataService dataService,
    required WhisperService whisper,
    required TtsService tts,
    required IntentClassifier classifier,
  })  : _dataService = dataService,
        _whisper = whisper,
        _tts = tts,
        _classifier = classifier;

  /// 执行语音命令
  Future<VoiceResult> execute(String transcript) async {
    try {
      // 1. 意图分类
      final intentResult = await _classifier.classify(transcript);

      // 2. 根据意图执行对应操作
      VoiceResult result;

      switch (intentResult.intent) {
        case 'create_task':
          result = await _handleCreateTask(intentResult);
          break;
        case 'complete_task':
          result = await _handleCompleteTask(intentResult);
          break;
        case 'query_stars':
          result = await _handleQueryStars(intentResult);
          break;
        case 'redeem_reward':
          result = await _handleRedeemReward(intentResult);
          break;
        case 'query_calendar':
          result = await _handleQueryCalendar(intentResult);
          break;
        case 'daily_summary':
          result = await _handleDailySummary();
          break;
        default:
          result = VoiceResult(
            success: false,
            message: '抱歉，我还不会这个功能',
          );
      }

      // 3. 语音反馈
      await _tts.speak(result.message);

      // 4. 记录命令历史
      await _saveCommandHistory(intentResult, result);

      return result;

    } catch (e) {
      final errorMessage = '出错了：${e.toString()}';
      await _tts.speak(errorMessage);
      return VoiceResult(success: false, message: errorMessage);
    }
  }

  Future<VoiceResult> _handleCreateTask(IntentResult intent) async {
    final entities = intent.entities;
    final title = entities['title'] as String?;
    final stars = entities['reward_stars'] as int? ?? 5;
    final assignee = entities['assignee'] as String?;

    if (title == null) {
      return VoiceResult(
        success: false,
        message: '请告诉我任务名称',
      );
    }

    // 如果需要确认
    if (intent.needsConfirmation) {
      return VoiceResult(
        success: true,
        needsConfirmation: true,
        confirmationText: intent.confirmationText!,
        pendingAction: PendingAction(
          type: 'create_task',
          params: {'title': title, 'stars': stars, 'assignee': assignee},
        ),
      );
    }

    // 直接执行
    final taskId = await _dataService.createTask(
      TaskCreateParams(
        familyId: _currentFamilyId,
        title: title,
        rewardStars: stars,
      ),
    );

    return VoiceResult(
      success: true,
      message: '好的，已经创建了「$title」任务，完成后可以获得$stars颗星星',
      data: {'task_id': taskId},
    );
  }

  Future<VoiceResult> _handleCompleteTask(IntentResult intent) async {
    final entities = intent.entities;
    final taskTitle = entities['task_title'] as String?;
    final memberName = entities['member'] as String?;

    final memberId = memberName != null
        ? await _findMemberId(memberName)
        : _currentMemberId;

    final tasks = await _dataService.getTodayTasks(_currentFamilyId);
    final task = tasks.firstWhere(
      (t) => t.title.contains(taskTitle ?? ''),
      orElse: () => throw Exception('找不到任务'),
    );

    final result = await _dataService.completeTask(task.id, memberId);

    return VoiceResult(
      success: true,
      message: '太棒了！完成了「${task.title}」，获得${result['stars_earned']}颗星星，'
          '现在共有${result['total_stars']}颗星星啦！',
      data: result,
    );
  }

  Future<VoiceResult> _handleQueryStars(IntentResult intent) async {
    final memberName = intent.entities['member'] as String?;
    final memberId = memberName != null
        ? await _findMemberId(memberName)
        : _currentMemberId;

    final balance = await _dataService.getStarBalance(memberId);
    final name = memberName ?? '你';

    return VoiceResult(
      success: true,
      message: '$name现在有$balance颗星星',
      data: {'balance': balance},
    );
  }

  Future<VoiceResult> _handleDailySummary() async {
    final today = DateTime.now();
    final tasks = await _dataService.getTodayTasks(_currentFamilyId);
    final completed = tasks.where((t) => t.status == 'completed').length;
    final pending = tasks.length - completed;
    final starBalance = await _dataService.getStarBalance(_currentMemberId);

    final parts = <String>[];

    if (pending > 0) {
      parts.add('今天还有$pending个任务待完成');
    } else if (completed > 0) {
      parts.add('太棒了，今天的任务都完成了');
    }

    parts.add('你现在有$starBalance颗星星');

    return VoiceResult(
      success: true,
      message: '早安！${parts.join('，')}。有什么需要帮忙的吗？',
    );
  }

  Future<String> _findMemberId(String name) async {
    final members = await _dataService.getFamilyMembers(_currentFamilyId);
    final member = members.firstWhere(
      (m) => m.nickname.contains(name) || m.nickname == name,
      orElse: () => throw Exception('找不到成员：$name'),
    );
    return member.id;
  }
}

class VoiceResult {
  final bool success;
  final String message;
  final Map<String, dynamic>? data;
  final bool needsConfirmation;
  final String? confirmationText;
  final PendingAction? pendingAction;

  VoiceResult({
    required this.success,
    required this.message,
    this.data,
    this.needsConfirmation = false,
    this.confirmationText,
    this.pendingAction,
  });
}
```

### 3.5 语音服务配置

```yaml
# config/voice_config.yaml

# Whisper 模型配置
whisper:
  model: tiny          # tiny/base/small/medium/large
  language: zh        # 中文优先
  use_gpu: true
  quantization: int8   # 减少内存占用

# TTS 模型配置
tts:
  model: piper         # piper/xtts/coqui
  voice: zh-CN-女子    # 温柔女声，适合儿童友好
  speed: 1.0
  pitch: 0.95          # 稍高音调，更亲切

# LLM 意图分类配置
llm:
  provider: ollama    # ollama/lm_studio
  model: qwen2.5:7b   # 或 phi3:3.8b（轻量快速）
  temperature: 0.3     # 低温度，更确定的分类

# 唤醒词配置
wake_word:
  enabled: true
  word: "小乐"        # 自定义唤醒词
  sensitivity: 0.5
```

---

## 四、全功能语音命令映射表

### 4.1 确认流程

对于需要确认的操作，AI 会进行二次确认：

```
用户: "发布整理房间任务"
小乐: "好的，要创建「整理房间」任务，完成后获得5颗星星，是给小明安排的吗？"

用户: "是的"
小乐: "任务已创建！小明今天有一个整理房间的任务，别忘了完成哦～"
```

### 4.2 错误处理

```
用户: "我想兑换..."
小乐: "请问您想兑换什么呢？可以告诉我奖励的名称，比如游戏时间、动画时间等。"

用户: "我想查看小红的星星"
小乐: "好的，小红现在有42颗星星，在家庭排行榜上排第二名，加油哦！"

用户: "删除所有任务"
小乐: "这个操作会影响多个任务，请到任务管理页面确认后删除，我帮您打开任务管理。"
```

---

## 五、技术实现指南

### 5.1 本地 LLM 部署配置

```yaml
# Ollama 配置 (docker-compose.yml)

services:
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]

  # Whisper 语音识别
  whisper:
    image: onerahmet/open-whisper-streaming:latest
    ports:
      - "9000:9000"

  # TTS 语音合成
  piper:
    image: ghcr.io/rhasspy/piper-tts:latest
    ports:
      - "5000:5000"
    volumes:
      - ./voices:/app/voices
```

### 5.2 Flutter 语音服务集成

```dart
// lib/voice/voice_service.dart

import 'package:speech_to_text/speech_to_text.dart';
import 'package:flutter_tts/flutter_tts.dart';

class VoiceService {
  final SpeechToText _stt = SpeechToText();
  final FlutterTts _tts = FlutterTts();
  final VoiceCommandExecutor _executor;

  bool _isListening = false;
  bool _isInitialized = false;

  VoiceService({
    required VoiceCommandExecutor executor,
  }) : _executor = executor;

  /// 初始化语音服务
  Future<bool> init() async {
    _isInitialized = await _stt.initialize(
      onStatus: (status) {
        _isListening = status == 'listening';
      },
      onError: (error) {
        print('语音识别错误: $error');
      },
    );

    await _tts.setLanguage('zh-CN');
    await _tts.setSpeechRate(0.5);
    await _tts.setPitch(1.1);

    return _isInitialized;
  }

  /// 开始监听
  Future<void> startListening() async {
    if (!_isInitialized || _isListening) return;

    await _stt.listen(
      onResult: (result) async {
        if (result.finalResult) {
          final text = result.recognizedWords;
          if (text.isNotEmpty) {
            await _processCommand(text);
          }
        }
      },
      listenFor: Duration(seconds: 30),
      pauseFor: Duration(seconds: 3),
      partialResults: true,
      localeId: 'zh_CN',
    );
  }

  /// 处理语音命令
  Future<void> _processCommand(String text) async {
    final result = await _executor.execute(text);
    await _tts.speak(result.message);
  }

  /// 停止监听
  Future<void> stopListening() async {
    await _stt.stop();
  }

  /// 释放资源
  Future<void> dispose() async {
    await _stt.stop();
    await _tts.stop();
  }
}
```

---

## 六、隐私与安全设计

### 6.1 隐私保护措施

| 措施 | 说明 |
|:-----|:-----|
| **数据本地化** | 所有用户数据存储在本地设备，不上传云端 |
| **端侧 AI** | 语音识别、意图分类全部在本地完成 |
| **无账号系统（可选）** | 可以不注册账号直接使用 |
| **加密存储** | 数据库使用设备 Keychain 保护密钥 |
| **权限最小化** | 只申请必要的相机、麦克风权限 |
| **数据导出** | 支持随时导出/删除所有数据 |
| **家庭隔离** | 数据按家庭隔离，跨家庭不共享 |

---

## 七、实施路线图

### Phase 1：基础架构（1-2周）
- [ ] Hermes 环境配置
- [ ] 本地数据库搭建
- [ ] 基础 CRUD API

### Phase 2：语音功能（2-3周）
- [ ] Whisper 语音识别集成
- [ ] 意图分类模型调优
- [ ] TTS 语音合成
- [ ] 核心命令 20 条

### Phase 3：完善功能（2-3周）
- [ ] 全部语音命令支持
- [ ] 多家庭成员支持
- [ ] 同步功能（可选 iCloud）

### Phase 4：体验优化（1-2周）
- [ ] 语音交互优化
- [ ] 性能调优
- [ ] UI/UX 打磨

---

## 八、文档更新说明

相比原版产品方案，本文档进行了以下核心变更：

| 原功能 | 变更内容 |
|:-------|:---------|
| 云端数据库 | → SQLite 本地存储 |
| 第三方 LLM API | → Ollama 本地推理 |
| 云端推送 | → 本地通知 |
| OSS 文件存储 | → 本地文件系统 |
| 第三方语音识别 | → Whisper 本地识别 |
| WebSocket 同步 | → iCloud/AirDrop 可选同步 |
| JWT 认证 | → 设备本地认证 |

---

*文档版本：v1.0 | 2026-04-20*
