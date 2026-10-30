import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'

// ARRAY over values of a domain on integer[] is a one-dimensional array of domain values, not
// a two-dimensional integer array; subscripts, output and dimensions follow from that.
const checks = {
  dims: "array_dims(ARRAY[a,b]) IS NOT DISTINCT FROM '[1:2]'",
  count: 'cardinality(ARRAY[a,b]) = 2',
  first: '(ARRAY[a,b])[1] IS NOT DISTINCT FROM a',
  deep: '(ARRAY[a,b])[2][1] IS NULL',
  coalesced: "array_dims(ARRAY[COALESCE(a,b),b]) IS NOT DISTINCT FROM '[1:2]'",
  selected: 'array_length(ARRAY[CASE WHEN bypass THEN a ELSE b END,b],1) = 2',
  text: '(ARRAY[a,b])::text IS NOT DISTINCT FROM \'{"{1}","{2}"}\'',
}
const values: (string | null)[] = ['{1}', '{2}', '{1,NULL}', '{}', '{{1},{2}}', '[0:0]={5}', null]

const arrayInput = (text: string | null, payload: unknown): Input =>
  text === null ? { kind: 'Null' } : { kind: 'Value', value: payload as never }

it('evaluates arrays of array-domain values as PostgreSQL does', async () => {
  const pg = await PGlite.create()
  const root = await mkdtemp(join(tmpdir(), 'pgsid-array-domain-constructor-'))
  try {
    await pg.exec(
      `CREATE DOMAIN owned_slots AS integer[];CREATE TABLE d(a owned_slots,b owned_slots,bypass boolean,${Object.entries(
        checks,
      )
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((table) => table.name === 'd')!
    const plans = Object.keys(checks).flatMap((name) => {
      const stored = table.constraints.find((constraint) => constraint.name === name)!
      return (['source', 'stored'] as const).map((origin) => {
        const expression = lowerTableCheck(
          table,
          origin === 'source'
            ? { ...stored, definition: `CHECK (${checks[name as keyof typeof checks]})` }
            : stored,
          catalog.enums,
          catalog.domains,
          origin,
        )!.expression
        expect(hasUncertain(expression), name + origin).toBe(false)
        return {
          expression,
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: 'd',
            constraint: `${name}_${origin}`,
          },
        }
      })
    })
    const group = prepareCheckRustGroup(plans)
    for (const check of group.checks)
      expect(check.kind, 'reason' in check ? check.reason : '').toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const payload = async (text: string | null) => {
      if (text === null) return null
      const row = (
        await pg.query<{ dims: string; items: (number | null)[] }>(
          `SELECT array_dims($1::int[]) dims, ARRAY(SELECT unnest($1::int[])) items`,
          [text],
        )
      ).rows[0]!
      const dimensions = (row.dims ?? '')
        .split(']')
        .filter(Boolean)
        .map((part) => {
          const [lower, upper] = part.slice(1).split(':').map(Number)
          return { lower: lower!, length: upper! - lower! + 1 }
        })
      return {
        elementType: 'pg_catalog.int4',
        elementKind: 2,
        dimensions,
        elements: row.items.map((item) =>
          item === null ? { kind: 'Null' } : { kind: 'Int4', value: item },
        ),
        nullBitmap: { kind: 'Value', value: row.items.includes(null) },
      }
    }
    for (const a of values)
      for (const b of values)
        for (const bypass of [false, true]) {
          const row: Row = {
            a: arrayInput(a, await payload(a)),
            b: arrayInput(b, await payload(b)),
            bypass: { kind: 'Value', value: bypass },
          }
          for (const [name, sql] of Object.entries(checks)) {
            let expected: Outcome
            try {
              const value = (
                await pg.query<{ value: boolean | null }>(
                  `SELECT (${sql}) AS value FROM (SELECT $1::owned_slots a,$2::owned_slots b,$3::boolean bypass) t`,
                  [a, b, bypass],
                )
              ).rows[0]!.value
              expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
            } catch (error) {
              expected = {
                kind: 'Error',
                value: { state: parseInt((error as { code: string }).code, 36) },
              }
            }
            for (const origin of ['source', 'stored'])
              fixtures.push({ name: `${name}_${origin}`, row, expected })
          }
        }
    await runCheckParity(
      root,
      'arraydomainconstructor',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
