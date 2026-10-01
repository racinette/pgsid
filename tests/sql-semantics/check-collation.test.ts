import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { renderTypescriptSchemaChecks } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import type { CatalogSnapshot, TableInfo } from '../../src/catalog/types.js'
import { lowerTableCheck, catalogCheckGroups } from '../../src/sql-semantics/catalog-checks.js'
import {
  prepareCheckRust,
  prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { emitCheckRustEvaluator } from '../../src/codegen/shared/check-rust-evaluator.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const supported = {
  equal: "plain = 'a'",
  unequal: "plain <> ''",
  peers: 'plain = peer',
  direct_equal: "pg_catalog.texteq(plain, 'a')",
  direct_unequal: "pg_catalog.textne(plain, 'a')",
  literals: "'a'::text <> 'A'::text",
  membership: "plain IN ('a', 'A', 'café', NULL)",
  nonmembership: "plain NOT IN ('a', 'A', NULL)",
  any: "plain = ANY (ARRAY['a', '😀', NULL]::text[])",
  all: "plain <> ALL (ARRAY['a', '😀']::text[])",
  simple_case:
    "CASE plain WHEN NULL THEN false WHEN 'a' THEN flag WHEN '😀' THEN amount > 0 ELSE NULL END",
  scalar_case: "(CASE WHEN flag THEN plain ELSE 'a' END) = 'a'",
  literal_case: "(CASE WHEN flag THEN 'a' ELSE 'A' END) = 'a'",
  scalar_null: '(CASE WHEN flag THEN plain END) IS NULL',
  lazy_case: "CASE plain WHEN 'a' THEN true ELSE amount + 1 > 0 END",
  custom_equal: "det = 'a'",
  custom_unequal: "det <> 'a'",
  custom_peers: 'det = det_peer',
  custom_cast: "det::text = 'a'",
  cast_c: "note::text = 'a'",
  override_left: 'ci COLLATE pg_catalog."C" = \'A\'',
  override_right: 'ci = (\'A\' COLLATE pg_catalog."C")',
  c_default: 'note = plain',
  override_order: 'plain < (\'z\' COLLATE pg_catalog."C")',
  override_membership: "ci IN ('A' COLLATE pg_catalog.\"C\", 'a')",
}
const unsupported = {
  nondeterministic: "ci = 'a'",
  nondeterministic_peers: 'ci = ci_peer',
  nondeterministic_ne: "ci <> 'a'",
  nondeterministic_in: "plain IN ('a', ci)",
  nondeterministic_case: "CASE ci WHEN 'a' THEN true ELSE false END",
  conflict: 'det = other_det',
  c_conflict: 'note = det',
  scalar_conflict: "(CASE WHEN flag THEN det ELSE other_det END) = 'a'",
  membership_conflict: 'plain IN (det, other_det)',
  explicit_unknown: "plain = ('a' COLLATE public.insensitive)",
  explicit_conflict: 'plain COLLATE pg_catalog."C" = (\'a\' COLLATE public.insensitive)',
  foreign_c: 'plain COLLATE public."C" = \'a\'',
  ordering: "plain < 'z'",
  custom_ordering: "det > 'a'",
  prefix: "starts_with(plain, 'a')",
  literal_prefix: "starts_with('abc', 'a')",
  regex: "plain ~ '^a+$'",
}

describe('CHECK text collation', () => {
  let pg: PGlite
  let directory: string
  let catalog: CatalogSnapshot
  let table: TableInfo

  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-check-collation-'))
    await pg.exec(`
      CREATE COLLATION public.deterministic (provider = icu, locale = 'und', deterministic = true);
      CREATE COLLATION public.other_deterministic FROM public.deterministic;
      CREATE COLLATION public.insensitive (provider = icu, locale = 'und', deterministic = false);
      CREATE COLLATION public."C" FROM public.insensitive;
      CREATE DOMAIN public.text_label AS text CHECK (VALUE <> '');
      CREATE DOMAIN public.nested_text_label AS public.text_label;
      CREATE TABLE public.collation_checks (
        plain text, peer text,
        det text COLLATE public.deterministic, det_peer text COLLATE public.deterministic,
        other_det text COLLATE public.other_deterministic,
        ci text COLLATE public.insensitive, ci_peer text COLLATE public.insensitive,
        note text COLLATE pg_catalog."C", flag bool, amount int4,
        ${Object.entries(supported)
          .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
          .join(',')}
      );
    `)
    catalog = await snapshotCatalog(pg)
    table = catalog.tables.find((table) => table.name === 'collation_checks')!
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })

  const bind = (sql: string) =>
    lowerTableCheck(table, {
      name: 'probe',
      type: 'check',
      definition: `CHECK (${sql})`,
    })!.expression

  it('captures deterministic evidence and distinct collation identities', () => {
    const columns = Object.fromEntries(table.columns.map((column) => [column.name, column]))
    expect(columns['plain']).toMatchObject({
      collationDeterministic: true,
      collationIsDefault: true,
      collationIsC: false,
    })
    expect(columns['det']).toMatchObject({
      collationDeterministic: true,
      collationIsDefault: false,
      collationIsC: false,
    })
    expect(columns['ci']).toMatchObject({ collationDeterministic: false })
    expect(columns['note']).toMatchObject({ collationIsC: true })
    expect(columns['det']!.collationOid).toBe(columns['det_peer']!.collationOid)
    expect(columns['det']!.collationOid).not.toBe(columns['other_det']!.collationOid)
    for (const group of catalogCheckGroups([], catalog.domains))
      for (const { plan } of group.checks)
        expect(prepareCheckRust(plan.expression).kind, group.name).toBe('supported')
  })

  it.each(Object.entries(unsupported))('keeps %s uncertain', (_name, sql) => {
    const expression = bind(sql)
    expect(expression).toEqual({ kind: 'uncertain' })
  })

  it('distinguishes PostgreSQL ICU equality from byte equality', async () => {
    const result = (
      await pg.query(`SELECT
      'e\u0301' COLLATE public.insensitive = 'é' AS normalized,
      'e\u0301' COLLATE public.deterministic = 'é' AS separate
    `)
    ).rows[0]
    expect(result).toEqual({ normalized: true, separate: false })
    await expect(
      pg.query(`SELECT ('a' COLLATE pg_catalog."C") = ('a' COLLATE public.deterministic)`),
    ).rejects.toMatchObject({ code: '42P21' })
    await expect(
      pg.query(
        `SELECT det = other_det FROM (SELECT 'a'::text COLLATE public.deterministic AS det, 'a'::text COLLATE public.other_deterministic AS other_det) candidate`,
      ),
    ).rejects.toMatchObject({ code: '42P22' })
  })

  it('rejects deterministic evidence for ordering in the Rust emitter', () => {
    const expression = bind('plain < (\'z\' COLLATE pg_catalog."C")')
    expect(expression.kind).toBe('eval-scalar')
    if (expression.kind !== 'eval-scalar' || expression.expression.kind !== 'call')
      throw new Error('Expected call')
    const call = expression.expression
    if (call.call.kind === 'cast') throw new Error('Expected operator')
    const operation = call.call
    expect(() =>
      emitCheckRustEvaluator({
        ...expression,
        expression: {
          ...call,
          call: { ...operation, collation: 'deterministic' },
        },
      }),
    ).toThrow(/collation/)
  })

  it('matches PGlite in native Rust and both transpiled targets', async () => {
    const names = Object.keys(supported)
    const group = prepareCheckRustGroup(
      names.map((name) => ({
        expression: lowerTableCheck(
          table,
          table.constraints.find((constraint) => constraint.name === name)!,
        )!.expression,
        identity: { schema: 'public', kind: 'table', owner: table.name, constraint: name },
      })),
    )
    for (const [index, check] of group.checks.entries())
      expect(check.kind, names[index]).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const fallbackPath = join(directory, 'fallback.ts')
    await writeFile(fallbackPath, renderTypescriptSchemaChecks([table]))
    await promisify(execFile)('node_modules/.bin/tsc', [
      '--strict',
      '--noEmit',
      '--skipLibCheck',
      '--target',
      'es2022',
      fallbackPath,
    ])
    const fallback = (await import(pathToFileURL(fallbackPath).href))
      .evaluatePublicCollationChecksChecks as (
      row: object,
    ) => { constraint: string; result: { certain: boolean; value?: boolean | null } }[]
    const value = (value: number | boolean | string | null): Input =>
      value === null ? { kind: 'Null' } : { kind: 'Value', value }
    const projection = table.columns
      .map(
        (column, index) =>
          `$${index + 1}::${column.typeName}${['det', 'det_peer'].includes(column.name) ? ' COLLATE public.deterministic' : ['ci', 'ci_peer'].includes(column.name) ? ' COLLATE public.insensitive' : column.name === 'other_det' ? ' COLLATE public.other_deterministic' : column.name === 'note' ? ' COLLATE pg_catalog."C"' : ''} AS ${column.name}`,
      )
      .join(',')
    for (const left of [null, '', 'a', 'A', 'café', 'e\u0301', 'é', '😀'])
      for (const right of [null, '', 'a', 'A', 'e\u0301', 'é', '😀']) {
        const input = {
          plain: left,
          peer: right,
          det: left,
          det_peer: right,
          other_det: right,
          ci: left,
          ci_peer: right,
          note: left,
          flag: right !== null,
          amount: 1,
        }
        const row = Object.fromEntries(
          Object.entries(input).map(([name, item]) => [name, value(item)]),
        )
        const expected = new Map<string, boolean | null>()
        for (const [name, sql] of Object.entries(supported)) {
          const result = (
            await pg.query<{ value: boolean | null }>(
              `SELECT (${sql}) AS value FROM (SELECT ${projection}) candidate`,
              table.columns.map((column) => input[column.name as keyof typeof input]),
            )
          ).rows[0]!.value
          fixtures.push({
            name,
            row,
            expected: { kind: result === null ? 'Null' : result ? 'True' : 'False' },
          })
          expected.set(name, result)
        }
        for (const item of fallback(input))
          expect(item.result, item.constraint).toEqual({
            certain: true,
            value: expected.get(item.constraint),
          })
      }
    const row: Row = Object.fromEntries(
      table.columns.map((column) => [column.name, { kind: 'Unknown' }]),
    )
    for (const name of [
      'equal',
      'unequal',
      'simple_case',
      'scalar_case',
      'custom_equal',
      'membership',
    ])
      fixtures.push({ name, row, expected: { kind: 'Unknown' } })
    fixtures.push({
      name: 'scalar_case',
      row: { ...row, flag: value(false) },
      expected: { kind: 'True' },
    })
    fixtures.push({
      name: 'lazy_case',
      row: { ...row, plain: value('a') },
      expected: { kind: 'True' },
    })
    const error: Input = { kind: 'Error', value: { state: Number.parseInt('22003', 36) } }
    fixtures.push({ name: 'equal', row: { ...row, plain: error }, expected: error })
    fixtures.push({
      name: 'lazy_case',
      row: { ...row, plain: value('a'), amount: error },
      expected: { kind: 'True' },
    })
    fixtures.push({
      name: 'lazy_case',
      row: { ...row, plain: value('b'), amount: value(2147483647) },
      expected: error,
    })
    await runCheckParity(directory, 'collation-checks', group, names, fixtures)
  }, 120_000)
})
