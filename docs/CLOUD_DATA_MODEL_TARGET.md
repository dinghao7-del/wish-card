# 云端数据模型目标稿

更新时间：2026-05-13

## 目标

星愿卡的目标身份模型是：

```text
Auth Account
  -> Family
    -> Members
      -> Member Session
        -> Operations / Audit / Sync
```

一个互联网登录账号代表一个家庭空间。爸爸、妈妈、孩子是家庭空间内的成员，通过 PIN 或成员密码切换身份。云端负责家庭隔离、同步、审计、社区分享和推荐合规。

## 核心原则

- `auth.uid()` 只代表主账号，不代表家庭成员。
- `family_id` 是所有家庭私有数据的主隔离键。
- `actor_member_id` 表示家庭内部操作者，用于审计、冲突处理和服务端权限判断。
- PIN、成员密码不能长期明文保存，应迁移为哈希字段。
- 推荐和商业化必须有独立同意记录，不能默认使用家庭详细数据。

## 必备结构

### families

保留家庭表，并增加主账号归属：

- `owner_account_id`: 主登录账号。
- `plan_tier`: 免费、Plus、家庭高级等。
- `data_region`: 数据区域。
- `privacy_consent_version`: 家庭隐私协议版本。

### members

家庭成员不是互联网登录账号：

- `family_id`: 所属家庭。
- `role`: `parent` 或 `child`。
- `credential_hash`: PIN 或成员密码哈希。
- `credential_algo`: 哈希算法版本。
- `credential_updated_at`: 凭证更新时间。

现有 `pin` / `password` 字段只能作为过渡字段，后续要清空或停止读取。

### member_sessions

服务端短时成员会话：

- 登录账号通过 Supabase Auth 验证。
- 家庭内成员通过 PIN/密码验证。
- 验证成功后创建短时 `member_session`。
- 敏感写操作通过 RPC 传入 `member_session_token`。

### operation_audit_logs

所有高价值操作都应记录：

- `family_id`
- `actor_member_id`
- `operation_type`
- `target_table`
- `target_id`
- `client_operation_id`
- `payload`
- `created_at`

这能支撑离线同步、冲突追踪、家长追溯和异常风控。

## 社区与分享

社区分享不应直接暴露家庭私有计划。建议新增 `shared_schedule_templates`：

- 从 `plans.metadata` 派生公开模板。
- 去除孩子姓名、学校、住址、具体医疗信息。
- 只保留年龄段、年级、城市级别、场景类型、时间块和心得。
- 发布前必须经过家长确认。
- 当前前端已具备本地脱敏转换函数，可先复制脱敏模板，后续再接社区发布审核流。

## 推荐与商业化

商业推荐应拆成三层：

1. `recommendation_consents`: 用户是否允许用家庭数据做推荐。
2. `family_profile_snapshots`: 脱敏后的家庭画像快照。
3. `recommendation_events`: 推荐曝光、点击、转化、拒绝原因。

医疗、留学、教育产品等高敏类别必须有更明确的同意范围和免责声明。

## 迁移顺序

1. 增加 `families.owner_account_id`，建立主账号与家庭关系。
2. 增加成员凭证哈希字段，停止新增明文 PIN/密码。
3. 增加 `member_sessions` 和 `operation_audit_logs`。
4. 把 `actorMemberId` 从离线队列元数据升级为 RPC 参数或审计字段。
5. 增加社区分享和推荐同意表。
6. 收紧 RLS：客户端只能读写自己家庭，敏感写操作全部走 RPC。

## 代码兼容策略

当前前端已经预留目标模型类型，但保持旧库兼容：

- Supabase 类型已声明 `member_sessions`、`operation_audit_logs`、`shared_schedule_templates`、`recommendation_consents` 和 `recommendation_events`。
- `DataLayer` 可以读取未来返回的 `actor_member_id` 和成员凭证哈希字段。
- 当前任务、计划、成员、心愿写入 payload 不主动携带未来字段，避免未迁移数据库同步失败。
- 离线队列继续使用 `actorMemberId` 作为本地元数据；等服务端 RPC 和审计表就绪后，再升级为云端参数。
- 本地已维护 `operation_audit_logs` 缓存，家长可在“我的”页查看最近操作。它是离线可见的审计雏形，不替代服务端不可篡改审计。

## 当前风险

- 现有历史 RLS 大量假设 `auth.uid() = members.id`，与目标模型不一致。
- 本地二次确认是产品安全层，不是服务端强安全边界。
- 现有 PIN/密码仍可能明文存在，必须列为上线前安全债。
