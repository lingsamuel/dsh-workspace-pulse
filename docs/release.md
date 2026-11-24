# 自动构建与发布

每次 push 都会运行单元测试，并通过 `npm run package:plugin` 生成 `.tgz`。安装包可在 GitHub Actions 对应运行的 Artifacts 中下载。

推送与 `package.json` 版本匹配的 `v` 开头标签（例如 `v0.1.0`）时，工作流会将同一个安装包发布到 GitHub Release 和 npm。预发行版本会标记为 GitHub prerelease，并发布到 npm 的 `next`。版本号由维护者手动更新，`package-lock.json` 需同步。

npm 首次发布可使用 GitHub Actions 的 `NPM_TOKEN` secret。粒度访问令牌需选择 `All Packages` 和 `Read and write (publish and stage)`，并启用 Bypass 2FA。npm 计划于 2027 年 1 月停止支持此类令牌直接发布，此后可通过交互式 2FA 完成首次发布。[npm 令牌文档](https://docs.npmjs.com/about-access-tokens/#direct-publishing-is-being-deprecated)

包建立后，可在下次发版前配置允许 `npm publish` 的 GitHub Actions Trusted Publisher。仓库填 `lingsamuel/dsh-workspace-pulse`，工作流文件名填 `build.yml`。配置需在两天内完成首次成功发布，验证后可移除 `NPM_TOKEN`。[npm Trusted Publishing 文档](https://docs.npmjs.com/trusted-publishers/)
