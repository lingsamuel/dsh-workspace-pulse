import { runningCounts } from './activity.js'
import { observeBadges } from './badges.js'

const namespace = 'dsh-workspace-pulse'
const sidebar = 'sidebar.workspaces'
const strings = {
  zh: { one: '{count} 个会话正在运行', many: '{count} 个会话正在运行' },
  en: { one: '{count} session running', many: '{count} sessions running' },
}

export const inject = ['sessions', 'workspaces', 'uiSession', 'uiSession.sessionStatus', 'slots', 'locale']

/** 启用后只订阅客户端已有的列表投影，停用时释放监听和标记。 */
export function apply(ctx) {
  ctx.effect(() => ctx.locale.register(namespace, strings))
  ctx.effect(() => {
    const t = ctx.locale.bind(namespace)
    const status = ctx.uiSession.sessionStatus
    const sessions = ctx.sessions.list
    const workspaces = ctx.workspaces.list
    const badges = observeBadges(document, count => t(count === 1 ? 'one' : 'many', { count }))
    let view
    let stopView

    function refreshCounts() {
      const settings = view?.getSnapshot()
      badges.update(settings ? runningCounts(workspaces.getSnapshot(), sessions.getSnapshot(), status.getSnapshot(), settings) : new Map())
    }

    function followView() {
      // WorkspaceBrowser 的 handle 返回与原生侧栏共用的浏览状态实例。
      const next = ctx.slots.entries(sidebar).find(entry => entry.locale === 'workspace')?.store?.create()
      if (next === view) return
      stopView?.()
      view = next
      stopView = view?.subscribe(refreshCounts)
      refreshCounts()
    }

    const stop = [
      sessions.subscribe(refreshCounts),
      workspaces.subscribe(refreshCounts),
      status.subscribe(refreshCounts),
      ctx.locale.subscribe(badges.refresh),
      ctx.slots.subscribe(sidebar, followView),
    ]
    followView()
    return () => {
      stopView?.()
      for (const dispose of stop) dispose()
      badges.dispose()
    }
  }, 'workspace-pulse: collapsed workspace badges')
}
