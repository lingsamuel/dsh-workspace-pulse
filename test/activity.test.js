import assert from 'node:assert/strict'
import test from 'node:test'
import { runningCounts } from '../src/activity.js'

const workspace = (workspaceId, path, ...sessionIds) => ({ workspaceId, path, title: workspaceId, sessionIds })
const session = (id, extra = {}) => ({ id, retainedBy: {}, blank: false, running: false, updatedAt: 0, ...extra })
const view = { groupBy: 'workspace', archivedFilter: 'default' }

function sessionList(...sessions) {
  return { ids: sessions.map(row => row.id), byId: Object.fromEntries(sessions.map(row => [row.id, row])), projectionsBySession: {} }
}

test('同组会话并行运行，结束后独立扣除，实时状态优先于列表摘要', () => {
  const list = sessionList(session('one', { running: true }), session('two'), session('archived', { running: true }))
  const workspaces = { items: [workspace('a', '/a', 'one', 'two', 'archived')], archivedSessionIds: ['archived'], pinnedSessionIds: [] }
  const statuses = new Map([['two', { running: true }]])
  assert.equal(runningCounts(workspaces, list, statuses, view).get('a'), 2)
  statuses.set('one', { running: false })
  assert.equal(runningCounts(workspaces, list, statuses, view).get('a'), 1)
  statuses.set('two', { running: false })
  assert.equal(runningCounts(workspaces, list, statuses, view).has('a'), false)
})

test('运行中的子智能体归到主会话，主会话同时运行也只计一次', () => {
  const list = sessionList(session('main', { running: true }), session('child', { origin: 'subagent', running: true }))
  list.projectionsBySession.main = { values: { subagentCatalog: [{ id: 'child' }] } }
  const workspaces = { items: [workspace('a', '/a', 'main', 'child')], archivedSessionIds: [], pinnedSessionIds: [] }
  const statuses = new Map()
  assert.equal(runningCounts(workspaces, list, statuses, view).get('a'), 1)
  statuses.set('main', { running: false })
  assert.equal(runningCounts(workspaces, list, statuses, view).get('a'), 1)
  statuses.set('child', { running: false })
  assert.equal(runningCounts(workspaces, list, statuses, view).has('a'), false)
})

test('工作区树沿真实目录边界汇总，普通分组只统计自身', () => {
  const list = sessionList(session('one', { running: true }), session('two', { running: true }))
  const workspaces = { items: [
    workspace('root', '/project'),
    workspace('similar', '/project-other', 'two'),
    workspace('middle', '/project/src'),
    workspace('leaf', '/project/src/deep', 'one'),
  ], archivedSessionIds: [], pinnedSessionIds: [] }
  assert.deepEqual(runningCounts(workspaces, list, new Map(), view), new Map([['similar', 1], ['leaf', 1]]))
  assert.deepEqual(runningCounts(workspaces, list, new Map(), { ...view, groupBy: 'workspace-tree' }),
    new Map([['root', 1], ['similar', 1], ['middle', 1], ['leaf', 1]]))
})
