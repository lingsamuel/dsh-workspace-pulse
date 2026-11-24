# DSH Workspace Pulse

`dsh-workspace-pulse` 为 DeepSeek Harness Web 的 Workspace 行显示正在运行的会话数。

- Workspace 折叠且计数大于零时，在名称旁显示数字。会话开始、结束或取消后立即更新，归零时隐藏。
- 展开后沿用 DSH 的会话行状态。计数覆盖工作区的完整会话列表，包括超出侧栏「显示更多」阈值的会话。运行中的子智能体归到所属会话，每条会话最多计一次。
- 在工作区树视图中，折叠父 Workspace 的计数包含其所有子 Workspace。普通工作区分组只统计当前 Workspace。数字提供可读的中英文状态说明。

插件通过 DSH 的客户端会话状态和 Workspace 服务取得实时数据，复用原生侧栏的会话投影与目录层级规则。在原生 Workspace 行上添加计数，并随插件停用清理。以本机 DSH 0.2.3-alpha.2 为首个验收环境。使用隔离 Web profile、真实浏览器和本地测试模型验证并行会话的计数、展开与折叠、嵌套汇总及插件停用。
