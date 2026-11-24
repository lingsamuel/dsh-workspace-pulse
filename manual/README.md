# 安装指南

## 安装

已在 DeepSeek Harness Web 0.2.3-alpha.2 验证。将下方路径替换为 `.tgz` 安装包的实际路径。

```sh
dsh plugin --profile web add /绝对路径/dsh-workspace-pulse-0.1.0.tgz
```

打开 DSH Web，折叠 Workspace 即可查看计数。要停用插件，在「设置 → 插件」中关闭 `dsh-workspace-pulse`。

## 从源码打包

使用 Node.js 22 或更新版本，在仓库根目录运行以下命令。

```sh
npm ci
npm run package:plugin
```

生成的安装包位于 `artifacts/`。
