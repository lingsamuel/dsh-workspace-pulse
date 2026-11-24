import css from './badges.css'

const listSelector = '[data-sidebar-list-area]'
const rowSelector = '[role="treeitem"][data-row-key^="workspace:"]'
const badgeSelector = '[data-dsh-workspace-pulse]'

/** 原生 Workspace 行没有标记插槽，使用行身份添加可独立清除的数字。 */
export function observeBadges(document, labelFor) {
  const style = document.createElement('style')
  style.textContent = css
  document.head.append(style)

  let counts = new Map()
  let queued = false
  let disposed = false

  function render() {
    queued = false
    if (disposed) return
    for (const row of document.querySelectorAll(`${listSelector} ${rowSelector}`)) {
      const id = row.getAttribute('data-row-key').slice('workspace:'.length)
      const count = counts.get(id)
      let badge = row.querySelector(`:scope > ${badgeSelector}`)
      if (count === undefined || row.getAttribute('aria-expanded') !== 'false') {
        badge?.remove()
        continue
      }
      if (!badge) {
        badge = document.createElement('span')
        badge.setAttribute('data-dsh-workspace-pulse', '')
        badge.setAttribute('role', 'img')
        row.insertBefore(badge, row.lastElementChild)
      }
      const text = String(count)
      const label = labelFor(count)
      if (badge.textContent !== text) badge.textContent = text
      if (badge.title !== label) {
        badge.title = label
        badge.setAttribute('aria-label', label)
      }
    }
    observer.takeRecords()
  }

  function refresh() {
    if (queued || disposed) return
    queued = true
    queueMicrotask(render)
  }

  const observer = new document.defaultView.MutationObserver(records => {
    const relevant = records.some(({ target, addedNodes }) => target.closest(listSelector)
      || Array.from(addedNodes).some(node => node.nodeType === 1 && (node.matches(listSelector) || node.querySelector(listSelector))))
    if (relevant) refresh()
  })
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-expanded', 'data-row-key'] })

  return {
    refresh,
    update(next) {
      counts = next
      refresh()
    },
    dispose() {
      disposed = true
      observer.disconnect()
      for (const badge of document.querySelectorAll(badgeSelector)) badge.remove()
      style.remove()
    },
  }
}
