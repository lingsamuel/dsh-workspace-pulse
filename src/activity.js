import { deriveGroups, owningParentFolder } from '@deepseek-ai/dsh-client-ui-workspace/src/client/tree.ts'

/** 使用原生侧栏的完整会话投影汇总活动，保留分组与筛选规则。 */
export function runningCounts(workspaces, sessions, statuses, view) {
  const counts = new Map()
  if (view.groupBy === 'flat') return counts

  // 让原生投影提供每组完整列表，侧栏的折叠和「显示更多」不影响计数。
  const groups = deriveGroups(sessions, workspaces.items, {
    archivedSessionIds: workspaces.archivedSessionIds,
    pinnedSessionIds: workspaces.pinnedSessionIds,
    archivedFilter: view.archivedFilter,
  }, statuses, { expandedGroups: workspaces.items.map(workspace => workspace.workspaceId) })

  const nested = view.groupBy === 'workspace-tree'
  const idsByPath = new Map(nested ? workspaces.items.map(({ path, workspaceId }) => [path, workspaceId]) : [])
  const paths = [...idsByPath.keys()]
  for (const group of groups) {
    if (group.workspaceId === undefined) continue
    const count = group.sessions.filter(session => session.running || session.runningSubagentCount > 0).length
    if (!count) continue
    counts.set(group.workspaceId, (counts.get(group.workspaceId) ?? 0) + count)
    if (nested) {
      for (let path = owningParentFolder(group.cwd, paths); path !== undefined; path = owningParentFolder(path, paths)) {
        const id = idsByPath.get(path)
        counts.set(id, (counts.get(id) ?? 0) + count)
      }
    }
  }
  return counts
}
