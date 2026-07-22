# 善缘阁

Next.js + Cloudflare Pages Functions + D1 的传统文化服务项目。

## 本地开发

首次准备：

```bash
npm install
copy .env.example .dev.vars
npm run db:init
```

启动完整开发环境：

```bash
npm run dev
```

该命令会同时启动：

- Next.js: http://127.0.0.1:3000
- Cloudflare Pages Functions: http://127.0.0.1:8788

前端统一请求相对路径 `/api`，开发环境由 `next.config.ts` 转发到 `8788`。不要只启动 `next dev`，否则供灯、起名、八字、记录等后端功能会不可用。

## 常用命令

```bash
npm run dev          # 启动前端 + Functions
npm run dev:web      # 只启动 Next.js
npm run dev:functions # 只启动 Pages Functions
npm run db:init      # 初始化本地 D1 schema
npm run build        # 生产构建
npm run test:smoke   # Playwright 冒烟测试
npx tsc --noEmit     # 类型检查
```

## 健康检查

```bash
curl http://127.0.0.1:3000/api/health
```

健康检查会返回 D1、R2、大模型配置、Mock DB 开关状态。生产环境如果 D1 未配置，应返回非健康状态。

AI 单独健康检查：

```bash
curl http://127.0.0.1:3000/api/ai/health
```

## 环境变量

本地使用 `.dev.vars`，生产环境在 Cloudflare Pages 控制台或 `wrangler secret` 中配置。

关键变量：

```env
APP_ENV=development
ALLOW_MOCK_DB=true
MOCK_PAYMENT=true
PAYMENT_PROVIDER=local
MOCK_SMS=true
MOCK_SMS_CODE=123456
AI_ENABLED=true
AI_PROVIDER=agnes
AI_API_KEY=
AI_MODEL=agnes-2.0-flash
AI_BASE_URL=https://apihub.agnes-ai.com/v1
AI_TIMEOUT_MS=30000
LLM_API_KEY=
LLM_MODEL=agnes-2.0-flash
LLM_IMAGE_MODEL=agnes-image-2.1-flash
LLM_BASE_URL=https://apihub.agnes-ai.com/v1
```

生产环境要求：

```env
APP_ENV=production
ALLOW_MOCK_DB=false
MOCK_PAYMENT=false
MOCK_SMS=false
PAYMENT_PROVIDER=正式渠道名称
```

生产环境必须绑定 D1，不允许静默回退到内存 Mock。

## 数据与安全约定

- 本地开发允许在 D1 不可用时使用内存 Mock。
- 生产环境必须配置 D1，未配置时 API 会返回 503。
- 本地支付确认入口只在 `development` 或 `MOCK_PAYMENT=true` 时开放；生产环境需要接入真实支付渠道。
- 本地短信验证码入口只在 `development` 或 `MOCK_SMS=true` 时开放，开发验证码默认为 `123456`。
- 当前用户系统支持匿名 `userId + localStorage`，也支持手机号验证码登录；登录后会把当前匿名记录合并到手机号账号。
- 生产环境必须接入真实短信服务商，并关闭 `MOCK_SMS`。
- 记录详情需要 `userId` 匹配；记录找回只在当前身份匹配时返回完整付费内容。

## 部署前检查

```bash
npm run build
npx tsc --noEmit
curl /api/health
```

还需要确认：

- Cloudflare Pages 已绑定生产 D1。
- R2 已绑定并可写入。
- 大模型密钥和模型名可用。
- 正式环境不开放本地支付确认入口。
- 已运行 `npm run test:smoke` 并检查 `test-artifacts/smoke` 截图。
## 腾讯云部署

已提供 Node API、TencentDB MySQL、COS、Docker Compose 和 Nginx 的迁移版本。部署步骤见 `deploy/tencent/README.md`，生产环境建表脚本见 `db/mysql-schema.sql`。原 Cloudflare Pages 版本仍保留，便于本地开发或回退。