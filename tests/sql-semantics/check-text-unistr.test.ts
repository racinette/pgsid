import { describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { callableIdentity, type FunctionMetadata } from '../../src/postgres/builtins/catalog.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { supportsTextCallableCollation } from '../../src/sql-semantics/collation.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const sourceNames = new Set(
  [
    ...readFileSync(
      'crates/check-evaluator/src/operations/pg_catalog/text_unistr.rs',
      'utf8',
    ).matchAll(/pub fn (sql__[a-z0-9_]+)\(/gu),
  ].map((match) => match[1]!),
)
const functions = builtinCallables().filter(
  (fn): fn is FunctionMetadata => fn.kind === 'function' && sourceNames.has(fn.rustName),
)
const input = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const collations = ['"default"', '"C"', 'public.escape_order', 'public.escape_insensitive']
const formats = [
  { prefix: '\\', width: 4 },
  { prefix: '\\u', width: 4 },
  { prefix: '\\+', width: 6 },
  { prefix: '\\U', width: 8 },
]
const points = [
  0, 1, 9, 31, 32, 127, 128, 255, 0x7ff, 0x800, 0xd7ff, 0xd800, 0xdbff, 0xdc00, 0xdfff, 0xe000,
  0xfdd0, 0xffff, 0x10000, 0x1f60a, 0x10ffff, 0x110000, 0x80000000, 0xffffffff,
]
const samples: (string | null)[] = [
  null,
  '',
  'plain text',
  'é日😊',
  '\u007f\u0080',
  '\\',
  '\\\\',
  '\\\\u0041',
  '\\\\\\u0041',
  '\\u123',
  '\\G123',
  '\\+00é041',
  '\\UFFFFFFFG',
  '\\u-001',
  '\\x0041',
  '\\u００４１',
  '\\0041extra',
  '\\+00004142',
  '\\D800x',
  '\\D800\\\\',
  '\\D800\\u0000',
  '\\D800\\U00110000',
  '\\D800\\0041',
  '\\D800\\D800',
  '\\DC00\\D800',
  '\\u0041\\u0301',
  '\\U0001F60A\\u0041',
  ...formats.flatMap(({ prefix, width }) =>
    points.flatMap((point) => {
      const digits = point.toString(16).padStart(width, '0')
      return [
        `${prefix}${digits}`,
        `before${prefix}${digits}after`,
        `${prefix}${digits.toUpperCase()}`,
      ]
    }),
  ),
  ...formats.flatMap((first) =>
    formats.flatMap((second) => [
      `${first.prefix}${'d800'.padStart(first.width, '0')}${second.prefix}${'dc00'.padStart(second.width, '0')}`,
      `${first.prefix}${'dbff'.padStart(first.width, '0')}${second.prefix}${'dfff'.padStart(second.width, '0')}`,
      `${first.prefix}${'d83d'.padStart(first.width, '0')}${second.prefix}${'de0a'.padStart(second.width, '0')}`,
    ]),
  ),
  '\\u0041'.repeat(128),
  '日\\u0041😊\\U0001F60A'.repeat(64),
]

describe('Rust CHECK Unicode escape decoding', () => {
  it('resolves the catalog callable and accepts every input collation', () => {
    expect(functions).toHaveLength(1)
    expect(sourceNames.size).toBe(functions.length)
    for (const fn of functions)
      for (const collation of [undefined, 'C', 'deterministic', 'other'])
        expect(supportsTextCallableCollation(callableIdentity(fn), collation)).toBe(true)
  })

  it('matches PostgreSQL fixed-width escapes, mixed surrogate pairs, Unicode boundaries, errors, NULLs, partial inputs and lazy arms in raw and stored CHECKs', async () => {
    const pg = await PGlite.create()
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-check-unistr-'))
    try {
      await pg.exec(`CREATE COLLATION public.escape_order (provider=icu,locale='und',deterministic=true);
        CREATE COLLATION public.escape_insensitive (provider=icu,locale='und',deterministic=false);`)
      const fn = functions[0]!
      const call = `pg_catalog.${fn.name}(label)`
      const expressions = {
        decoded: `CASE WHEN skip THEN true ELSE (${call}) COLLATE "C" = recorded END`,
        octets: `CASE WHEN skip THEN true ELSE pg_catalog.octet_length(${call}) = recorded_octets END`,
        literal_null: `pg_catalog.${fn.name}(NULL::text) IS NULL`,
      }
      for (const [index, collation] of collations.entries())
        await pg.exec(`CREATE TABLE unicode_escapes_${index} (
          label text COLLATE ${collation}, recorded text COLLATE "C", recorded_octets int4, skip boolean,
          ${Object.entries(expressions)
            .map(([name, sql]) => `CONSTRAINT ${name} CHECK (${sql})`)
            .join(',')}
        )`)
      const catalog = await snapshotCatalog(pg)
      const checks: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
      const fixtures: { name: string; row: Row; expected: Outcome }[] = []
      const observed = new Set<string>()
      for (const [index, collation] of collations.entries()) {
        const table = catalog.tables.find((table) => table.name === `unicode_escapes_${index}`)!
        for (const [constraint, sql] of Object.entries(expressions))
          for (const form of ['raw', 'stored']) {
            const name = `${constraint}_${index}_${form}`
            const plan = lowerTableCheck(
              table,
              form === 'raw'
                ? { name: constraint, type: 'check', definition: `CHECK (${sql})` }
                : table.constraints.find((check) => check.name === constraint)!,
            )!
            expect(plan.expression.kind, name).not.toBe('uncertain')
            checks.push({
              expression: plan.expression,
              identity: { schema: 'public', kind: 'table', owner: table.name, constraint: name },
            })
          }
        const add = (row: Row, expected: Outcome): void => {
          for (const constraint of Object.keys(expressions))
            for (const form of ['raw', 'stored'])
              fixtures.push({
                name: `${constraint}_${index}_${form}`,
                row: { ...row },
                expected: constraint === 'literal_null' ? { kind: 'True' } : expected,
              })
        }
        const base = (): Row => ({
          label: input(''),
          recorded: input(''),
          recorded_octets: input(0),
          skip: input(false),
        })
        for (const label of new Set(samples)) {
          const row = { ...base(), label: input(label) }
          const query = `pg_catalog.${fn.name}($1::text COLLATE ${collation})`
          let result: { value: string | null; octets: number | null }
          try {
            result = (
              await pg.query<{ value: string | null; octets: number | null }>(
                `SELECT ${query} value, pg_catalog.octet_length(${query}) octets`,
                [label],
              )
            ).rows[0]!
          } catch (error) {
            const code = (error as { code?: string }).code
            expect(['42601', '22023']).toContain(code)
            observed.add(code!)
            add(row, { kind: 'Error', value: { state: parseInt(code!, 36) } })
            add({ ...row, skip: input(true) }, { kind: 'True' })
            continue
          }
          add(
            { ...row, recorded: input(result.value), recorded_octets: input(result.octets) },
            { kind: result.value === null ? 'Null' : 'True' },
          )
          if (result.value !== null)
            add(
              {
                ...row,
                recorded: input(result.value + '!'),
                recorded_octets: input(result.octets! + 1),
              },
              { kind: 'False' },
            )
        }
        const error: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
        add({ ...base(), label: { kind: 'Unknown' } }, { kind: 'Unknown' })
        add({ ...base(), label: error }, error)
        add({ ...base(), label: error, skip: input(true) }, { kind: 'True' })
        add({ ...base(), skip: error }, error)
        add({ ...base(), skip: { kind: 'Unknown' } }, { kind: 'Unknown' })
      }
      expect([...observed].sort()).toEqual(['22023', '42601'])
      const group = prepareCheckRustGroup(checks)
      for (const [index, check] of group.checks.entries()) {
        expect(check.kind, check.kind === 'unsupported' ? check.reason : '').toBe('supported')
        if (
          checks[index]!.identity.constraint.startsWith('literal_null') &&
          check.kind === 'supported'
        )
          expect(check.inputs).toHaveLength(0)
      }
      await runCheckParity(
        directory,
        'pgsid-check-unistr',
        group,
        checks.map((check) => check.identity.constraint),
        fixtures,
      )
    } finally {
      await pg.close()
      await rm(directory, { recursive: true, force: true })
    }
  }, 600000)
})
