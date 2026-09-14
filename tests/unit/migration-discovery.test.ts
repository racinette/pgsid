import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { parseConfigString } from '../../src/config/loader.js'
import { discoverMigrationFiles, MigrationDiscoveryError } from '../../src/migration-discovery.js'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

const fixture = async (): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), 'pgsid-migrations-'))
  roots.push(root)
  await Promise.all([
    mkdir(join(root, 'baseline'), { recursive: true }),
    mkdir(join(root, 'changes'), { recursive: true }),
  ])
  await Promise.all([
    writeFile(join(root, 'baseline/schema.sql'), 'SELECT 1;'),
    writeFile(join(root, 'changes/002.sql'), 'SELECT 2;'),
    writeFile(join(root, 'changes/001.sql'), 'SELECT 1;'),
    writeFile(join(root, 'changes/003.test.sql'), 'SELECT 3;'),
  ])
  return root
}

describe('discoverMigrationFiles', () => {
  it('preserves source order and sorts within each source', async () => {
    const root = await fixture()
    const config = parseConfigString(`
      schema:
        - baseline/schema.sql
        - changes/*.sql
        - "!changes/*.test.sql"
    `)

    const migrations = await discoverMigrationFiles(config, { baseDirectory: root })

    expect(migrations.map((migration) => migration.path)).toEqual([
      'baseline/schema.sql',
      'changes/001.sql',
      'changes/002.sql',
    ])
    expect(migrations.map((migration) => migration.index)).toEqual([0, 1, 2])
  })

  it('rejects duplicates and sources that match nothing', async () => {
    const root = await fixture()
    const duplicate = parseConfigString(`
      schema: [changes/001.sql, changes/*.sql]
    `)
    await expect(discoverMigrationFiles(duplicate, { baseDirectory: root })).rejects.toBeInstanceOf(
      MigrationDiscoveryError,
    )

    const missing = parseConfigString('schema: missing/*.sql')
    await expect(discoverMigrationFiles(missing, { baseDirectory: root })).rejects.toThrow(
      'matched no files',
    )
  })
})
