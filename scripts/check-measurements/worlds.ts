import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import type { PGlite } from '@electric-sql/pglite'
import { Deparser } from 'pgsql-deparser'
import { parseSql } from '../../src/ast.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'

const directory = new URL('../../tests/unit/query/worlds/', import.meta.url)

export function worldRejectionCoverage(
  cases: readonly {
    name: string
    database: { accepted: boolean }
    checks: readonly { result: { certain: boolean; value?: boolean | null; error?: string } }[]
  }[],
) {
  const rejects = (row: (typeof cases)[number]) =>
      row.checks.some((c) => c.result.certain && (c.result.value === false || !!c.result.error)),
    rejected = cases.filter((c) => !c.database.accepted)
  return {
    databaseRejectedRows: rejected.length,
    locallyRejectedRows: rejected.filter(rejects).length,
    unresolvedRejectedRows: rejected.filter((c) => !rejects(c)).map((c) => c.name),
    incorrectlyRejectedRows: cases
      .filter((c) => c.database.accepted && rejects(c))
      .map((c) => c.name),
  }
}

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

class WorldDeparser extends Deparser {
  override A_Indirection(
    node: Parameters<Deparser['A_Indirection']>[0],
    context: Parameters<Deparser['A_Indirection']>[1],
  ): string {
    const argument = this.visit(node.arg!, context)
    const expression = super.A_Indirection(node, context)
    if (expression.startsWith(`(${argument})`)) return expression
    if (!expression.startsWith(argument)) throw new Error('Unexpected subscript rendering')
    return `(${argument})${expression.slice(argument.length)}`
  }
}

export const deparseWorldSql = (...args: ConstructorParameters<typeof Deparser>): string =>
  new WorldDeparser(...args).deparseQuery()

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
      await pg.exec(deparseWorldSql(parsed))
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
