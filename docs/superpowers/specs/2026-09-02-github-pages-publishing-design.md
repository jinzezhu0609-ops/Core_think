# README 与 GitHub Pages 发布设计

## 目标

为 `Core_think` 仓库补充清晰的中文 README，并把现有静态网页通过 GitHub Pages 发布为可直接访问的公开链接。发布过程不得改变网页功能或评论数据逻辑。

## 文件调整

- 使用 Git 记录重命名，将 `Core_Thinking.html` 改为标准入口 `index.html`。
- 保留 `Core_Thinking.css` 与 `Core_Thinking.js` 文件名；`index.html` 中现有相对引用保持有效。
- 新建 `README.md`。
- 新建 `.gitignore`，忽略本地浏览器测试产生的 `artifacts/` 文件夹。
- 保留仓库根目录中已经跟踪的桌面端与手机端预览图，供 README 展示。
- 将 `docs/superpowers/specs/` 中的设计说明纳入版本控制。

## README 内容

README 使用中文，包含以下内容：

1. 项目名称与一句话介绍。
2. 醒目的“在线体验”链接，指向 `https://jinzezhu0609-ops.github.io/Core_think/`。
3. 桌面端与手机端预览图。
4. 功能列表：匿名投稿、自动分类、搜索筛选、排序、点赞、响应式布局。
5. 技术栈与文件结构。
6. 本地运行方法：直接打开 `index.html`，或使用本地静态服务器。
7. 数据说明：当前默认使用浏览器 `localStorage`；不同访客之间不会共享评论，后续可通过已经预留的数据适配层接入公开 API。
8. GitHub Pages 发布方式与仓库链接。

## GitHub Pages 方案

使用 GitHub Pages 的分支发布模式：

- 仓库：`jinzezhu0609-ops/Core_think`
- 发布分支：`main`
- 发布目录：仓库根目录 `/`
- 目标链接：`https://jinzezhu0609-ops.github.io/Core_think/`

通过 GitHub REST API 启用 Pages。若 Pages 已经存在，则读取并更新其发布源，避免重复创建。

## 提交与发布流程

1. 提交设计说明。
2. 重命名入口文件并创建 README 与 `.gitignore`。
3. 检查 `index.html` 对 CSS 和 JavaScript 的引用。
4. 使用本地静态服务器和浏览器运行桌面端、平板端和手机端烟雾测试。
5. 提交页面入口、README、忽略规则和设计文档。
6. 推送 `main` 到 `origin/main`。
7. 启用 GitHub Pages。
8. 等待构建完成，并通过 HTTP 状态、页面标题和静态资源加载结果验证公开链接。

## 错误处理

- 若远端在推送前出现新提交，停止推送并先检查差异，不强制覆盖。
- 若 GitHub Pages API 返回已存在，则改为读取现有配置并仅更新发布源。
- 若首次访问返回 404，等待 Pages 构建完成后再次检查，不重复创建站点。
- 若页面 HTML 可访问但 CSS 或 JavaScript 失败，检查相对路径和资源 URL 后再修正提交。
- 不使用强制推送，不覆盖远端历史。

## 验收标准

- 仓库根目录包含 `index.html` 与 `README.md`。
- README 中的在线体验链接和预览图可用。
- `main` 与 `origin/main` 同步，无未提交的项目文件；`artifacts/` 被忽略。
- GitHub Pages 配置为从 `main` 根目录发布。
- 公开链接返回成功状态，页面标题为“点子发射站｜让好想法被看见”。
- CSS、JavaScript 和预览资源能够正常加载。
- 390px、768px 和 1440px 视口下页面仍无横向滚动或脚本错误。
