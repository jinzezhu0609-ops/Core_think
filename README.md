# 点子发射站

一个匿名、开放的灵感收集网页。把生活里“要是有个工具就好了”的瞬间写下来，让真实需求被看见，让好想法有机会发生。

[🚀 立即在线体验](https://jinzezhu0609-ops.github.io/Core_think/)

## 页面预览

### 电脑端

![点子发射站电脑端页面](./responsive-1440.png)

### 手机端

<img src="./responsive-390.png" width="360" alt="点子发射站手机端页面">

## 主要功能

- 无需注册即可匿名发布想法
- 根据内容关键词自动识别灵感分类
- 支持正文搜索与分类筛选
- 支持按最新发布或最多赞同排序
- 支持点赞与取消点赞
- 所有访客共享同一个公开评论区
- 匿名点赞状态刷新后仍可保留，并避免重复计数
- 自动适配电脑、平板和手机
- 支持键盘操作、清晰焦点和减少动态效果设置
- 接口异常时自动展示最近一次成功读取的公开数据

## 技术实现

前端使用原生 HTML、CSS 和 JavaScript，部署在 GitHub Pages；公开评论 API 使用 Cloudflare Workers，数据保存到 Cloudflare D1。

```text
Core_think/
├── index.html              # 页面结构与 GitHub Pages 入口
├── Core_Thinking.css       # 视觉系统与响应式布局
├── Core_Thinking.js        # 评论、搜索、筛选、排序和数据适配层
├── responsive-1440.png     # 电脑端预览
├── responsive-768.png      # 平板端预览
├── responsive-390.png      # 手机端预览
├── worker/                 # Cloudflare Worker API、D1 迁移与测试
└── docs/                   # 项目设计说明
```

## 本地运行

由于线上 API 只允许正式站点与本地开发地址访问，请在项目目录启动本地静态服务器：

```bash
python -m http.server 4173
```

然后访问：

```text
http://localhost:4173/
```

## 数据说明

评论与点赞保存在共享的 Cloudflare D1 数据库中，因此不同设备、不同浏览器访问时会看到同一份公开数据。浏览器只保存随机生成的匿名访客标识，用来恢复当前访客的点赞状态；服务端只保存加盐哈希，不保存原始标识。

为了减少滥用，服务端会校验内容并限制同一网络地址在 10 分钟内最多发布 3 条建议。网络暂时不可用时，网页会展示浏览器中最近一次成功加载的公开数据，发布内容不会被静默保存到本地假装成功。

公开 API：[`https://core-think-api.core-think-0609.workers.dev`](https://core-think-api.core-think-0609.workers.dev/health)

## 后端开发与部署

进入 `worker` 目录并安装依赖：

```bash
pnpm install
```

创建本地 D1、启动 Worker 并运行测试：

```bash
pnpm db:migrate:local
pnpm dev
pnpm test
pnpm test:integration
```

部署到自己的 Cloudflare 账户前，需要登录 Wrangler、创建 D1 数据库，并把返回的 `database_id` 写入 `worker/wrangler.jsonc`。随后设置两个随机密钥、应用远程迁移并部署：

```bash
pnpm exec wrangler login
pnpm exec wrangler d1 create core-think-comments
pnpm exec wrangler secret put LIKE_HASH_SALT
pnpm exec wrangler secret put RATE_LIMIT_SALT
pnpm db:migrate:remote
pnpm deploy
```

生产密钥不要写入 Git；本地开发可复制 `worker/.dev.vars.example` 为 `worker/.dev.vars` 后填写，后者已被 `.gitignore` 忽略。

## 在线发布

网站使用 GitHub Pages 从 `main` 分支根目录发布：

- 在线网站：[https://jinzezhu0609-ops.github.io/Core_think/](https://jinzezhu0609-ops.github.io/Core_think/)
- GitHub 仓库：[https://github.com/jinzezhu0609-ops/Core_think](https://github.com/jinzezhu0609-ops/Core_think)

## 隐私提示

投稿不要求姓名或登录信息。请勿在建议内容中填写电话号码、地址等个人敏感信息。
