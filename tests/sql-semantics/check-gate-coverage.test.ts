import { expect, it } from 'vitest'
import fg from 'fast-glob'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

it('schedules every maintained CHECK test owner in the central integration gate', async () => {
  const root = fileURLToPath(new URL('../../', import.meta.url))
  const required = await fg('tests/sql-semantics/check-*.test.ts', { cwd: root })
  const script = await readFile(new URL('../../tools/check-rust/check.sh', import.meta.url), 'utf8')
  const patterns = script
    .split('\n')
    .flatMap((line) =>
      /^(?:[A-Z][A-Z0-9_]*=\S+\s+)*pnpm exec vitest run\s/u.test(line)
        ? (line.match(/tests\/sql-semantics\/[^\s"'`]+/gu) ?? [])
        : [],
    )
  const scheduled = new Set(await fg(patterns, { cwd: root }))
  expect(required.length).toBeGreaterThan(0)
  expect(required.filter((owner) => !scheduled.has(owner)).sort()).toEqual([])
})
