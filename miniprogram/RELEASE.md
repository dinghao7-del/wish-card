# 微信小程序发布自动化

这套脚本把小程序发布拆成四步：

1. 构建 Taro 小程序产物。
2. 调用微信开发者工具 CLI 上传开发版本。
3. 调用微信官方接口提交审核。
4. 查询审核状态，审核通过后发布。

注意：微信返回 `should be called only from third party` 时，说明当前普通小程序账号不能直接用 AppSecret 调用提审接口，需要在微信公众平台后台手动提交审核，或后续接入第三方平台代开发体系。

## 一次性配置

复制配置模板：

```bash
cp miniprogram/.env.example miniprogram/.env
```

然后在 `miniprogram/.env` 填入：

- `WX_APP_SECRET`：微信小程序后台的 AppSecret。
- `WX_AUDIT_FIRST_CLASS` / `WX_AUDIT_SECOND_CLASS` / `WX_AUDIT_FIRST_ID` / `WX_AUDIT_SECOND_ID`：小程序后台可提交审核的类目信息。

密钥只放本机 `.env`，不要提交到仓库。

## 常用命令

预检配置：

```bash
npm --prefix miniprogram run wx:release:preflight
```

只构建并上传开发版本：

```bash
npm --prefix miniprogram run wx:deploy:upload
```

上传后提交审核：

```bash
npm --prefix miniprogram run wx:deploy
```

上传、提交审核、等待审核通过后自动发布：

```bash
npm --prefix miniprogram run wx:deploy:auto
```

单独查询审核状态：

```bash
npm --prefix miniprogram run wx:release:status
```
