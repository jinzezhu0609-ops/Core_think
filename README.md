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
- 评论刷新后仍可保留
- 自动适配电脑、平板和手机
- 支持键盘操作、清晰焦点和减少动态效果设置

## 技术实现

项目使用原生 HTML、CSS 和 JavaScript，不依赖框架、构建工具或第三方运行库。

```text
Core_think/
├── index.html              # 页面结构与 GitHub Pages 入口
├── Core_Thinking.css       # 视觉系统与响应式布局
├── Core_Thinking.js        # 评论、搜索、筛选、排序和数据适配层
├── responsive-1440.png     # 电脑端预览
├── responsive-768.png      # 平板端预览
├── responsive-390.png      # 手机端预览
└── docs/                   # 项目设计说明
```

## 本地运行

最简单的方式是直接双击 `index.html`。

也可以在项目目录启动本地静态服务器：

```bash
python -m http.server 4173
```

然后访问：

```text
http://localhost:4173/
```

## 数据说明

当前默认数据适配器使用浏览器 `localStorage`。这意味着每位访客可以在自己的浏览器中发布、保存和点赞，但不同访客之间暂时不会共享评论。

`Core_Thinking.js` 已将数据访问封装为 `listIdeas`、`createIdea` 和 `toggleLike` 接口。后续接入 Supabase、Firebase 或自有 API 时，可以保留现有界面和交互逻辑。

## 在线发布

网站使用 GitHub Pages 从 `main` 分支根目录发布：

- 在线网站：[https://jinzezhu0609-ops.github.io/Core_think/](https://jinzezhu0609-ops.github.io/Core_think/)
- GitHub 仓库：[https://github.com/jinzezhu0609-ops/Core_think](https://github.com/jinzezhu0609-ops/Core_think)

## 隐私提示

投稿不要求姓名或登录信息。请勿在建议内容中填写电话号码、地址等个人敏感信息。
