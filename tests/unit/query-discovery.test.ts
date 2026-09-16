import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import { createCodegenTargets } from '../../src/codegen/registry.js'
import { parseConfigString } from '../../src/config/loader.js'
import { discoverQueryFiles, QueryDiscoveryError } from '../../src/query-discovery.js'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

const fixture = async (): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), 'pgsid-query-discovery-'))
  roots.push(root)
  await Promise.all([
    mkdir(join(root, 'sql/accounts/admin'), { recursive: true }),
    mkdir(join(root, 'sql/reporting'), { recursive: true }),
  ])
  await Promise.all([
    writeFile(join(root, 'sql/accounts/get.sql'), 'SELECT 1'),
    writeFile(join(root, 'sql/accounts/get_test.sql'), 'SELECT 1'),
    writeFile(join(root, 'sql/accounts/admin/list.sql'), 'SELECT 1'),
    writeFile(join(root, 'sql/reporting/report.sql'), 'SELECT 1'),
    writeFile(join(root, 'sql/ignored.txt'), 'SELECT 1'),
  ])
  return root
}

describe('discoverQueryFiles', () => {
  it('discovers deterministically, excludes generation, and uses the longest output root', async () => {
    const root = await fixture()
    const config = parseConfigString(`
      schema: migrations/*.sql
      sql:
        paths: [sql/**/*.sql]
        codegen:
          typescript:
            queries:
              exclude: ["**/*_test.sql"]
              out:
                sql: generated/all
                sql/accounts:
                  types: generated/account-types
                  runtime: generated/account-runtime
                sql/accounts/admin: generated/admin
    `)
    const files = await discoverQueryFiles(config, { baseDirectory: root })

    expect(files.map((file) => file.path)).toEqual([
      'sql/accounts/admin/list.sql',
      'sql/accounts/get.sql',
      'sql/accounts/get_test.sql',
      'sql/reporting/report.sql',
    ])
    expect(files[0]!.routes[0]!.outputs).toEqual([
      { kind: 'types', path: join(root, 'generated/admin/list') },
    ])
    expect(files[1]!.routes[0]!.outputs).toEqual([
      { kind: 'types', path: join(root, 'generated/account-types/get') },
      { kind: 'runtime', path: join(root, 'generated/account-runtime/get') },
    ])
    expect(files[2]!.routes).toEqual([])
    expect(files[3]!.routes[0]!.outputs).toEqual([
      { kind: 'types', path: join(root, 'generated/all/reporting/report') },
    ])
  })

  it('honors negative discovery globs and leaves unmapped files available for checking', async () => {
    const root = await fixture()
    const config = parseConfigString(`
      schema: migrations/*.sql
      sql:
        paths: [sql/**/*.sql, "!sql/accounts/**"]
        codegen:
          typescript:
            queries:
              out:
                other: generated
    `)
    const targets = createCodegenTargets(config, {}, { baseDirectory: root })
    const files = await discoverQueryFiles(config, { baseDirectory: root, targets })

    expect(files).toHaveLength(1)
    expect(files[0]!.path).toBe('sql/reporting/report.sql')
    expect(files[0]!.routes).toEqual([])
  })

  it('rejects two source routes that resolve to one output file', async () => {
    const root = await fixture()
    await writeFile(join(root, 'sql/reporting/list.sql'), 'SELECT 1')
    const config = parseConfigString(`
      schema: migrations/*.sql
      sql:
        paths: [sql/**/*.sql]
        codegen:
          typescript:
            queries:
              out:
                sql/accounts/admin: generated
                sql/reporting: generated
    `)

    const targets = createCodegenTargets(config, {}, { baseDirectory: root })
    await expect(
      discoverQueryFiles(config, { baseDirectory: root, targets }),
    ).rejects.toBeInstanceOf(QueryDiscoveryError)
  })

  it('returns no files for an empty path set', async () => {
    const root = await fixture()
    const config = parseConfigString(`schema: migrations/*.sql`)
    await expect(discoverQueryFiles(config, { baseDirectory: root })).resolves.toEqual([])
  })
})
