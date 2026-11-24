# DSH Workspace Pulse 实施计划

**目标** 在 DSH 原生侧栏的折叠 Workspace 行显示实时运行会话数。

**接入** 使用 Cordis Web 插件和 DSH 的 Workspace 列表、会话状态以及侧栏浏览状态。用 esbuild 生成 DSH 可加载的 client factory，使用 npm 打包供本地安装。

1. 在 `test/activity.test.js` 验证两个并行会话逐步归零、子智能体归入所属会话、工作区树与普通分组的计数差异。先运行 `npm test` 确认可捕获尚未实现的计数行为。
2. 在 `src/activity.js` 复用 DSH 的 `deriveGroups` 和 `owningParentFolder`，从原生投影生成以 Workspace ID 为键的计数。由 `src/client.js` 订阅原生状态、浏览模式和语言变化，由 `src/badges.js` 更新并清理折叠行上的标记。
3. 在 `package.json`、`cordis.patch.yml` 和 `scripts/` 中接入客户端构建与本地安装包。在 `manual/README.md` 记录安装命令、显示规则和已验版本。
4. 运行 `npm run package:plugin`、`npm test` 和 `npm run test:web`，验证安装包在隔离的 DSH Web 实例中的实际显示和插件卸载行为。清理临时验证产物，将文档、实现和测试纳入同一次提交。
