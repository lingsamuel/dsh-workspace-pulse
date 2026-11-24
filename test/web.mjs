import assert from 'node:assert/strict'
import { execFile, spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { join, resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { setTimeout } from 'node:timers/promises'
import { promisify } from 'node:util'
import { chromium } from 'playwright-core'
import pkg from '../package.json' with { type: 'json' }

const root = resolve(import.meta.dirname, '..')
const runtime = join(root, '.runtime')
const dsh = process.env.DSH_WORKSPACE_PULSE_DSH_BIN ?? 'dsh'
const artifact = join(root, 'artifacts', `${pkg.name}-${pkg.version}.tgz`)
const prompts = ['Hold fixture one', 'Hold fixture two', 'Hold fixture child']

function deadline(promise, description) {
  return Promise.race([promise, setTimeout(15_000, undefined, { ref: false }).then(() => {
    throw new Error(`等待超时：${description}`)
  })])
}

/** 通过本地 Messages 流控制各会话结束时机，由 DSH 自己产生运行状态。 */
async function startModel() {
  const runs = new Map(prompts.map(text => [text, { started: Promise.withResolvers(), finish: Promise.withResolvers() }]))
  const server = createServer(async (request, response) => {
    const chunks = []
    for await (const chunk of request) chunks.push(chunk)
    const { stream, messages } = JSON.parse(Buffer.concat(chunks).toString() || '{}')
    const message = { id: `msg_${randomUUID()}`, model: 'deepseek-v4-flash', usage: { input_tokens: 3, output_tokens: 1 } }
    if (!stream) {
      response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({
        ...message, type: 'message', role: 'assistant', content: [{ type: 'text', text: 'Pulse fixture' }], stop_reason: 'end_turn',
      }))
      return
    }

    const last = JSON.stringify(messages?.at(-1) ?? {})
    const run = runs.get(prompts.find(text => last.includes(text)))
    const encode = event => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
    response.writeHead(200, { 'content-type': 'text/event-stream' })
    response.write(encode({ type: 'message_start', message: { ...message, type: 'message', role: 'assistant', content: [] } }))
    run?.started.resolve()
    await run?.finish.promise
    response.end([
      { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Fixture complete.' } },
      { type: 'content_block_stop', index: 0 },
      { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 1 } },
      { type: 'message_stop' },
    ].map(encode).join(''))
  }).listen(0, '127.0.0.1')
  await once(server, 'listening')
  return { server, runs }
}

async function seedWorkspaces(home) {
  const parent = join(home, 'Pulse Parent')
  const child = join(parent, 'Pulse Child')
  const sibling = join(home, 'Pulse Other')
  await Promise.all([mkdir(child, { recursive: true }), mkdir(sibling)])
  const time = new Date().toISOString()
  const workspaces = Object.fromEntries([[parent, 'Pulse Parent'], [child, 'Pulse Child'], [sibling, 'Pulse Other']]
    .map(([path, title]) => [randomUUID(), { path, title, sessionIds: [], createdAt: time, updatedAt: time }]))
  const workspaceIds = Object.keys(workspaces)
  await mkdir(join(home, 'storages'))
  await writeFile(join(home, 'storages', 'workspace.json'), JSON.stringify({
    unit: { name: 'workspace', version: 2 },
    global: { initialized: true, workspaceIds, defaultWorkspaceId: workspaceIds[0], pinnedSessionIds: [], archivedSessionIds: [] },
    tables: { workspaces },
  }))
}

await mkdir(runtime, { recursive: true })
const home = await mkdtemp(join(runtime, 'web-'))
const { server, runs } = await startModel()
const env = {
  ...process.env,
  DSH_HOME: home,
  DEEPSEEK_API_KEY: 'workspace-pulse-local-test',
  DEEPSEEK_BASE_URL: `http://127.0.0.1:${server.address().port}`,
}
const plugin = (...args) => promisify(execFile)(dsh, ['plugin', '--profile', 'web', ...args, '--store-dir', join(home, 'pnpm-store')],
  { cwd: home, env, timeout: 45_000 })
let host, hostExit, browser

async function startWeb() {
  host = spawn(dsh, ['--profile', 'web', '--no-open', '--port', '0'], { cwd: home, env, stdio: ['ignore', 'pipe', 'inherit'] })
  hostExit = once(host, 'close')
  const lines = createInterface({ input: host.stdout })
  try {
    return await deadline((async () => {
      for await (const line of lines) if (line.startsWith('dsh web: ')) return line.slice('dsh web: '.length)
      throw new Error('DSH 未发布地址')
    })(), 'DSH Web 启动')
  } finally {
    lines.close()
  }
}

try {
  await writeFile(join(home, 'package.json'), '{"name":"pulse-web-fixture","private":true}')
  await seedWorkspaces(home)
  await plugin('add', artifact)
  const url = await startWeb()
  const origin = new URL(url).origin
  browser = await chromium.launch({ executablePath: process.env.DSH_WORKSPACE_PULSE_CHROMIUM, headless: true })
  const page = await browser.newPage({ viewport: { width: 1400, height: 960 }, locale: 'en-US' })
  page.setDefaultTimeout(10_000)
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) errors.push(message.text())
  })
  await page.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort())
  await page.goto(url)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()

  const row = title => page.locator('[data-row-key^="workspace:"]').filter({ has: page.getByText(title, { exact: true }) })
  const parent = row('Pulse Parent')
  const child = row('Pulse Child')
  const other = row('Pulse Other')
  const badge = '[data-dsh-workspace-pulse]'
  const count = (workspace, n) => workspace.getByRole('img', { name: `${n} session${n === 1 ? '' : 's'} running` })
  const main = page.locator('[data-slot="main"]')
  const current = main.locator('[data-conversation-session]:visible')

  async function send(conversation, prompt) {
    const editor = conversation.locator('[data-composer-input][contenteditable="true"]:visible')
    await editor.pressSequentially(prompt)
    await conversation.getByRole('button', { name: 'Send message', exact: true }).click()
    await deadline(runs.get(prompt).started.promise, prompt)
  }

  async function startSession(workspace, title, prompt, reuseDraft = false) {
    const previous = await current.getAttribute('data-conversation-session')
    await workspace.hover()
    await workspace.getByRole('button', { name: `New session in ${title}`, exact: true }).click()
    const next = reuseDraft ? current : main.locator(`[data-conversation-session]:not([data-conversation-session="${previous}"]):visible`)
    await send(next, prompt)
  }

  async function collapse(workspace) {
    if (await workspace.getAttribute('aria-expanded') === 'true') await workspace.click()
    assert.equal(await workspace.getAttribute('aria-expanded'), 'false')
  }

  await startSession(parent, 'Pulse Parent', prompts[0], true)
  await startSession(parent, 'Pulse Parent', prompts[1])
  await collapse(parent)
  await count(parent, 2).waitFor()
  assert.equal(await count(parent, 2).textContent(), '2')
  assert.equal(await other.locator(badge).count(), 0)
  await parent.click()
  await parent.locator(badge).waitFor({ state: 'detached' })
  await collapse(parent)
  await count(parent, 2).waitFor()
  runs.get(prompts[0]).finish.resolve()
  await count(parent, 1).waitFor()
  runs.get(prompts[1]).finish.resolve()
  await parent.locator(badge).waitFor({ state: 'detached' })

  await startSession(child, 'Pulse Child', prompts[2])
  await collapse(child)
  await count(child, 1).waitFor()
  assert.equal(await parent.locator(badge).count(), 0)
  await page.getByRole('button', { name: 'View options' }).click()
  await page.getByText('Workspace Tree', { exact: true }).click()
  await count(parent, 1).waitFor()
  await child.waitFor({ state: 'detached' })
  await page.getByRole('button', { name: 'Account menu', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Settings', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Plugins', exact: true }).click()
  const card = page.locator(`[data-plugin-package="${pkg.name}"]`)
  await count(parent, 1).waitFor()
  await card.getByRole('switch').click()
  await page.locator(badge).waitFor({ state: 'detached' })
  await parent.waitFor()
  assert.deepEqual(errors, [])
  console.log('通过 DSH Web 验收：2 → 1 → 隐藏、展开与折叠、嵌套汇总和运行中停用插件')
} finally {
  await browser?.close()
  for (const run of runs.values()) run.finish.resolve()
  if (host?.exitCode === null) host.kill()
  await hostExit
  server.closeAllConnections()
  await new Promise(resolve => server.close(resolve))
  await rm(home, { recursive: true, force: true })
}
