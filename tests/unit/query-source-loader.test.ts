import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { parseConfigString } from '../../src/config/loader.js'
import { loadQuerySources } from '../../src/query-source-loader.js'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('loadQuerySources', () => {
  it('loads generated and check-only discoveries as batch inputs', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pgsid-query-sources-'))
    roots.push(root)
    await mkdir(join(root, 'sql'), { recursive: true })
    await Promise.all([
      writeFile(join(root, 'sql/generated.sql'), '-- name: Generated :one\nSELECT 1;'),
      writeFile(join(root, 'sql/check.sql'), '-- name: Check :one\nSELECT 2;'),
    ])
    const config = parseConfigString(`
      schema: migrations/*.sql
      sql:
        paths: [sql/*.sql]
        codegen:
          typescript:
            queries:
              exclude: [sql/check.sql]
              out:
                sql: generated
    `)

    const sources = await loadQuerySources(config, { baseDirectory: root })

    expect(sources.map((source) => source.path)).toEqual(['sql/check.sql', 'sql/generated.sql'])
    expect(sources[0]!.content.toString()).toContain('SELECT 2')
    expect(sources[0]!.output).toBeUndefined()
    expect(sources[1]!.output).toEqual({ types: join(root, 'generated/generated.ts') })
  })
})
