# DSH Workspace Pulse

折叠 DeepSeek Harness Web 侧栏中的 Workspace 后，右侧数字显示该 Workspace 正在运行的会话数。最后一个会话结束或取消时，数字自动消失。展开 Workspace 可查看 DSH 自带的会话状态。

在工作区树视图中，折叠父 Workspace 的数字也包含其子 Workspace。运行中的子智能体计入所属会话，每条会话最多计一次。

## 安装

已在 DSH Web 0.2.3-alpha.2 验证。下载 `.tgz` 安装包后，在终端运行以下命令。

```sh
dsh plugin --profile web add /绝对路径/dsh-workspace-pulse-0.1.0.tgz
```

在 DSH 的插件页停用插件后，侧栏数字随之移除。

## 从源码打包

使用 Node.js 22 或更新版本。

```sh
npm ci
npm run package:plugin
```

安装包位于 `artifacts/`。
