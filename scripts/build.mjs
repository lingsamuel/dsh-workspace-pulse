import { copyFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import pkg from '../package.json' with { type: 'json' }

const root = fileURLToPath(new URL('..', import.meta.url))
const require = createRequire(import.meta.url)

await build({
  absWorkingDir: root,
  entryPoints: ['src/client.js'],
  outfile: 'dist/client.js',
  bundle: true,
  platform: 'browser',
  format: 'cjs',
  loader: { '.css': 'text' },
  banner: { js: `window.__ModuleLoader__.load({ id: ${JSON.stringify(pkg.name)}, factory: (require) => { const module = { exports: {} };` },
  footer: { js: 'return module.exports; } });' },
})

// 客户端包包含 DSH 的原生会话和工作区投影，随包保留上游许可。
const upstream = dirname(require.resolve('@deepseek-ai/dsh-client-ui-workspace/package.json'))
await copyFile(join(upstream, 'LICENSE'), join(root, 'dist', 'LICENSE-DSH.txt'))
