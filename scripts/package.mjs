import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pkg from '../package.json' with { type: 'json' }

const root = fileURLToPath(new URL('..', import.meta.url))
const artifacts = join(root, 'artifacts')
mkdirSync(artifacts, { recursive: true })
execFileSync(process.execPath, [process.env.npm_execpath, 'pack', '--pack-destination', artifacts], {
  cwd: root, stdio: 'inherit', env: { ...process.env, npm_config_cache: join(root, '.runtime', 'npm-cache') },
})

const current = `${pkg.name}-${pkg.version}.tgz`
const previous = readdirSync(artifacts, { withFileTypes: true })
  .filter(file => file.isFile() && file.name.startsWith(`${pkg.name}-`) && file.name.endsWith('.tgz') && file.name !== current)
  .map(file => join(artifacts, file.name))
  .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs)
for (const outdated of previous.slice(3)) unlinkSync(outdated)
