# 公开评论后端设计

## 目标

为“点子发射站”增加真正跨用户共享的公开评论数据。网页继续由 GitHub Pages 托管；Cloudflare Worker 提供 HTTP API；Cloudflare D1 保存评论、点赞与发布频率记录。

访客无需注册即可读取、发布和点赞。数据库管理凭证、限流盐值和其他秘密不得进入浏览器或 GitHub 仓库。

## 系统结构

```text
访客浏览器
  │
  ├── 静态页面 ──> GitHub Pages
  │
  └── JSON API ──> Cloudflare Worker ──> D1 数据库
```

GitHub Pages 地址保持为 `https://jinzezhu0609-ops.github.io/Core_think/`。Worker 使用独立的 `workers.dev` HTTPS 地址。前端只公开 Worker URL，不公开数据库管理 Token。

## 仓库结构

新增以下目录：

```text
worker/
├── src/index.js        # HTTP 路由、校验、CORS、限流与 D1 查询
├── migrations/0001_initial.sql
├── package.json
└── wrangler.jsonc      # Worker 和 D1 绑定配置，不包含秘密
```

根目录的 `Core_Thinking.js` 继续保留数据适配层，但默认切换到远程 API。`README.md` 增加后端结构、部署与公共数据说明。

## 数据模型

### ideas

- `id TEXT PRIMARY KEY`：Worker 生成的 UUID。
- `content TEXT NOT NULL`：去除首尾空白后的建议正文，长度 1–280。
- `category TEXT NOT NULL`：由 Worker 根据正文自动分类。
- `created_at TEXT NOT NULL`：UTC ISO 时间。
- `base_likes INTEGER NOT NULL DEFAULT 0`：保留九条示例灵感当前已有的初始赞同数。

为 `created_at` 建立降序索引。API 最多返回最新 100 条，避免无限增长的响应。

### idea_likes

- `idea_id TEXT NOT NULL`：关联 `ideas.id`，评论删除时级联删除。
- `visitor_hash TEXT NOT NULL`：匿名浏览器标识的服务端哈希。
- `created_at TEXT NOT NULL`。
- `(idea_id, visitor_hash)` 为联合主键，确保同一匿名标识只能为一条评论点赞一次。

### rate_limits

- `key TEXT PRIMARY KEY`：IP 与服务端秘密盐值的哈希。
- `window_start INTEGER NOT NULL`：十分钟时间窗起点。
- `count INTEGER NOT NULL`：当前时间窗发布次数。

过期记录在写请求中按机会清理。原始 IP 不写入数据库。

## API 契约

所有响应使用 JSON。成功响应包含 `Cache-Control: no-store`；错误响应格式为 `{ "error": "用户可理解的信息" }`。

### GET /health

返回服务状态与数据库连通性，用于部署验证。

### GET /ideas

- 返回 `{ "ideas": Idea[] }`。
- 每条数据包含 `id`、`content`、`category`、`createdAt`、`likes`、`liked`。
- `likes` 等于 `base_likes` 加上 `idea_likes` 中的真实匿名点赞数。
- 若请求带有效 `X-Visitor-Id`，Worker 根据其哈希计算 `liked`。
- 按 `created_at DESC` 返回最多 100 条。

### POST /ideas

- 请求体：`{ "content": string }`。前端传来的分类不作为可信数据。
- 服务端去除首尾空白，验证 1–280 字、异常重复字符与 URL 数量。
- Worker 自动分类并写入 D1。
- 同一 IP 每十分钟最多成功发布三条；超限返回 HTTP 429。
- 成功返回 HTTP 201 与 `{ "idea": Idea }`。

### PATCH /ideas/:id/like

- 请求头必须包含有效 `X-Visitor-Id`。
- 请求体：`{ "liked": boolean }`。
- `liked: true` 使用 `INSERT OR IGNORE`；`liked: false` 删除对应点赞。
- 操作具有幂等性，重复请求不会反复增加计数。
- 返回更新后的 `{ "idea": Idea }`。

### OPTIONS /*

处理浏览器 CORS 预检请求。

## 匿名标识与隐私

前端首次访问时生成随机 UUID，并保存在 `localStorage`。请求通过 `X-Visitor-Id` 发送。Worker 使用 `LIKE_HASH_SALT` Secret 对标识做 SHA-256 哈希后再写入 D1。

发布限流使用 Cloudflare 提供的连接 IP 与 `RATE_LIMIT_SALT` Secret 生成不可逆哈希。D1 不保存原始 IP、姓名、邮箱或账号资料。

匿名标识不是强身份系统。访客清除浏览器数据后会获得新标识；这一限制对无需注册的轻量意见收集站点可以接受。

## CORS 与安全

- 生产环境只允许来源 `https://jinzezhu0609-ops.github.io`。
- 本地开发允许 `http://127.0.0.1:4173` 与 `http://localhost:4173`。
- 响应允许 `Content-Type` 与 `X-Visitor-Id` 请求头，以及 `GET`、`POST`、`PATCH`、`OPTIONS` 方法。
- Worker 对所有请求体设置大小限制，并拒绝无效 JSON。
- SQL 查询全部使用 D1 Prepared Statement 参数绑定。
- 用户内容继续通过前端 `textContent` 渲染，不作为 HTML 执行。
- 当前版本不提供公开删除、编辑或管理接口，避免匿名访客破坏数据。

## 初始数据

迁移文件创建三张表、索引，并写入当前九条示例灵感及其当前初始赞同数。迁移使用固定 ID，重复执行不会重复插入。

浏览器中旧的本地评论不会自动上传，因为它们只存在于各自设备且未经公开发布确认。切换成功后，新评论统一写入 D1。

## 前端调整

- 在 `index.html` 中配置 Worker API 地址。
- 数据适配层为每次远程请求添加 `X-Visitor-Id`。
- `POST /ideas` 只发送正文。
- 远程读取成功后缓存最近一次公开列表。
- API 读取失败时展示缓存；无缓存时展示示例数据，并明确提示当前为离线内容。
- 发布或点赞失败时保留输入与现有界面状态，不把失败操作伪装为成功。
- README 改为说明评论已经跨用户公开，并记录 Cloudflare Worker + D1 架构。

## Cloudflare 配置

1. 使用 Wrangler 打开 Cloudflare 官方登录/注册流程。
2. 创建 Worker `core-think-api`。
3. 创建 D1 数据库 `core-think-comments`。
4. 将 D1 以 `DB` 绑定到 Worker。
5. 创建 `LIKE_HASH_SALT` 与 `RATE_LIMIT_SALT` Worker Secrets。
6. 对远程 D1 执行迁移。
7. 部署 Worker，记录公开 HTTPS URL。
8. 把 URL 写入前端公开配置并重新发布 GitHub Pages。

Cloudflare 官方 D1 文档说明 D1 可通过 Worker binding 查询；免费计划包含每日读取、写入与存储额度，具体限制以官方文档为准：

- https://developers.cloudflare.com/d1/get-started/
- https://developers.cloudflare.com/d1/platform/pricing/

## 测试与验收

### 本地后端

- 对本地 D1 执行迁移。
- 验证健康检查、读取、发布、点赞、取消点赞、重复点赞幂等性、无效输入、CORS 和限流。
- 验证 SQL 输入与 HTML 字符串只作为纯文本保存。

### 线上端到端

1. 公共 API 健康检查返回 200。
2. 第一个隔离浏览器发布一条唯一测试评论。
3. 第二个全新隔离浏览器刷新后能看到同一评论。
4. 第二个浏览器点赞后，第一个浏览器刷新能看到计数增加。
5. 使用 Wrangler 按测试评论的精确 ID 从 D1 删除测试数据，确认示例数据和真实评论不受影响。
6. 在 390px、768px、1440px 视口下确认页面无脚本错误和横向滚动。
7. GitHub Pages 与 Worker URL 均使用 HTTPS，前端控制台无 CORS 错误。

## 错误处理与回滚

- Cloudflare 登录、D1 创建或部署失败时，不修改线上前端 API 地址，现有 GitHub Pages 保持可用。
- Worker 部署成功但端到端测试失败时，先修复 API，不把故障 URL 发布到前端。
- 前端发布后出现严重问题时，可把 API 配置恢复为空，回退到本地数据适配器。
- 不提交 Cloudflare Token、Secret、`.wrangler/` 状态目录或本地数据库文件。
