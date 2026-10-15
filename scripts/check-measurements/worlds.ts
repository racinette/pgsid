import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import type { PGlite } from '@electric-sql/pglite'
import { deparseSync } from 'pgsql-deparser'
import { parseSql } from '../../src/ast.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'

const directory = new URL('../../tests/unit/query/worlds/', import.meta.url)

export async function worldSources() {
  const names = (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
  return Promise.all(
    names.map(async (name) => ({
      name,
      files: await Promise.all(
        ['schema.sql', 'data.sql', 'check-seed.sql'].map(async (file) => ({
          file,
          source: await readFile(new URL(`${name}/${file}`, directory), 'utf8'),
        })),
      ),
    })),
  )
}

export async function worldSourceDigest(): Promise<string> {
  return createHash('sha256')
    .update(JSON.stringify(await worldSources()))
    .digest('hex')
}

export async function loadWorldCatalog(pg: PGlite) {
  for (const world of await worldSources()) {
    const schema = 'world_' + world.name
    await pg.exec(`CREATE SCHEMA "${schema}"; SET search_path = "${schema}", public`)
    for (const { file, source } of world.files) {
      if (file === 'check-seed.sql') continue
      const parsed = await parseSql(source)
      const visit = (value: unknown): void => {
        if (!value || typeof value !== 'object') return
        const fields = value as Record<string, unknown>
        if (fields['schemaname'] === 'public') fields['schemaname'] = schema
        const setting = fields['VariableSetStmt'] as { name?: string; args?: unknown[] } | undefined
        if (setting?.name === 'search_path') {
          for (const arg of setting.args ?? []) {
            const constant = (arg as { A_Const?: { sval?: { sval?: string } } }).A_Const
            if (constant?.sval?.sval === 'public') constant.sval.sval = schema
          }
        }
        Object.values(fields).forEach(visit)
      }
      visit(parsed)
      await pg.exec(deparseSync(parsed))
    }
  }
  return snapshotCatalog(pg)
}

export function verifyWorldDigest(
  report: { sourceDigest?: string; scope?: { kind: string } },
  digest: string,
): void {
  assert.ok(
    report.scope === undefined || report.scope.kind === 'full-corpus',
    'Scoped world outcomes cannot establish full-corpus coverage',
  )
  assert.equal(
    report.sourceDigest,
    digest,
    'World outcome report is missing or stale; run pnpm check-rust:measure',
  )
}

export async function writeReport(name: string, report: unknown): Promise<void> {
  const directory = new URL(`../../artifacts/${name}/`, import.meta.url)
  await mkdir(directory, { recursive: true })
  const path = new URL('report.json', directory)
  await writeFile(path, JSON.stringify(report, null, 2) + '\n')
  console.info(fileURLToPath(path))
}
