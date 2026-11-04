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
      'crates/check-evaluator/src/operations/pg_catalog/text_to_ascii.rs',
      'utf8',
    ).matchAll(/pub fn (sql__[a-z0-9_]+)\(/gu),
  ].map((match) => match[1]!),
)
const functions = builtinCallables().filter(
  (fn): fn is FunctionMetadata => fn.kind === 'function' && sourceNames.has(fn.rustName),
)
const input = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const collations = ['"default"', '"C"', 'public.ascii_order', 'public.ascii_insensitive']
const named = (fn: FunctionMetadata): boolean => fn.args[1] === 'pg_catalog.name'
const queryFor = (fn: FunctionMetadata): string =>
  `pg_catalog.${fn.name}(${fn.args.length === 1 ? 'label' : named(fn) ? 'label,encname' : 'label,encoding'})`
const expressionsFor = (fn: FunctionMetadata): Record<string, string> => ({
  [fn.rustName]: `CASE WHEN skip THEN true ELSE (${queryFor(fn)}) COLLATE "C" = recorded END`,
  [`octets_${fn.rustName}`]: `CASE WHEN skip THEN true ELSE pg_catalog.octet_length(${queryFor(fn)}) = recorded_octets END`,
})

const coverage = [
  ...Array.from({ length: 128 }, (_, index) => index + 128),
  ...Array.from({ length: 30 }, (_, index) => (index + 2) * 64),
  ...Array.from({ length: 16 }, (_, index) => Math.max(2048, index * 4096)),
  0x10000,
  0x40000,
  0x80000,
  0xc0000,
  0x10ffff,
]
  .filter((code) => code < 0xd800 || code > 0xdfff)
  .map((code) => String.fromCodePoint(code))
  .join('')
const values = [
  null,
  '',
  "AZaz09 ' \t\n\r",
  'é😊',
  'é',
  '日ЖéÉ',
  '\u007f\u0080\u07ff\u0800\ud7ff\ue000\uffff\ud800\udc00\udbff\udfff',
  coverage,
]
// Encoding names keep only their alphanumeric characters, so spelling and case vary freely.
const convertibleNames = ['LATIN1', 'latin-1', 'ISO_8859-1', 'iso8859_15', 'Latin9', 'LATIN2']
const encodingNames = [
  ...convertibleNames,
  'Win-1250',
  'windows_1250',
  'UTF8',
  'sql_ascii',
  'SJIS',
  'koi8',
  'nope',
  'latin1x',
  '',
  ' ',
  '-',
  'é',
]
// Whether the server's C library counts a non-ASCII byte as alphanumeric decides these.
const platformNames = ['latin1é', 'ÉUTF8']
const errors = [
  { kind: 'Error', value: { state: parseInt('22003', 36) } },
  { kind: 'Error', value: { state: parseInt('22012', 36) } },
] satisfies Input[]

describe('Rust CHECK legacy byte-to-ASCII conversion', () => {
  it('accepts byte conversion independently of input collation', () => {
    expect(functions).toHaveLength(3)
    expect(sourceNames.size).toBe(functions.length)
    for (const fn of functions)
      for (const collation of [undefined, 'C', 'deterministic', 'other'])
        expect(supportsTextCallableCollation(callableIdentity(fn), collation)).toBe(true)
  })

  it('matches PostgreSQL encoding tables, UTF8 byte expansion, errors, NULLs, partial inputs and lazy arms in raw and stored CHECKs', async () => {
    const pg = await PGlite.create()
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-check-to-ascii-'))
    try {
      expect(
        (await pg.query<{ server_encoding: string }>('SHOW server_encoding')).rows[0]!
          .server_encoding,
      ).toBe('UTF8')
      await pg.exec(`CREATE COLLATION public.ascii_order (provider=icu,locale='und',deterministic=true);
        CREATE COLLATION public.ascii_insensitive (provider=icu,locale='und',deterministic=false);`)
      const expressions = Object.fromEntries(
        functions.flatMap((fn) => Object.entries(expressionsFor(fn))),
      )
      for (const [index, collation] of collations.entries())
        await pg.exec(`CREATE TABLE ascii_checks_${index} (
          label text COLLATE ${collation}, encoding int4, encname name, recorded text COLLATE "C",
          recorded_octets int4, skip boolean,
          ${Object.entries(expressions)
            .map(([name, sql]) => `CONSTRAINT ${name} CHECK (${sql})`)
            .join(',')}
        )`)
      const catalog = await snapshotCatalog(pg)
      const checks: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
      const fixtures: { name: string; row: Row; expected: Outcome }[] = []
      const observed = new Set<string>()
      for (const [index, collation] of collations.entries()) {
        const table = catalog.tables.find((table) => table.name === `ascii_checks_${index}`)!
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
        for (const fn of functions) {
          const add = (row: Row, expected: Outcome): void => {
            for (const constraint of Object.keys(expressionsFor(fn)))
              for (const form of ['raw', 'stored'])
                fixtures.push({ name: `${constraint}_${index}_${form}`, row: { ...row }, expected })
          }
          const base = (): Row => ({
            label: input('é😊'),
            encoding: input(8),
            encname: input('LATIN1'),
            recorded: input(''),
            recorded_octets: input(0),
            skip: input(false),
          })
          const codes = named(fn)
            ? encodingNames
            : fn.args.length === 1
              ? [8]
              : [
                  -2147483648,
                  -1,
                  ...Array.from({ length: 42 }, (_, code) => code),
                  42,
                  2147483647,
                  null,
                ]
          for (const label of values) {
            for (const encoding of codes) {
              if (
                fn.args.length === 2 &&
                label !== null &&
                label !== coverage &&
                label !== '' &&
                ![8, 9, 16, 29, -1, null, ...convertibleNames].includes(encoding)
              )
                continue
              const row = {
                ...base(),
                label: input(label),
                ...(named(fn) ? { encname: input(encoding) } : { encoding: input(encoding) }),
              }
              const call = `pg_catalog.${fn.name}($1::text COLLATE ${collation}${fn.args.length === 2 ? (named(fn) ? ', $2::name' : ', $2::int4') : ''})`
              let result: { value: string | null; octets: number | null }
              try {
                result = (
                  await pg.query<{ value: string | null; octets: number | null }>(
                    `SELECT ${call} value, pg_catalog.octet_length(${call}) octets`,
                    fn.args.length === 1 ? [label] : [label, encoding],
                  )
                ).rows[0]!
              } catch (error) {
                const code = (error as { code?: string }).code
                expect(['42704', '0A000']).toContain(code)
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
          }
          const textStates = [
            input('é'),
            input(null),
            { kind: 'Unknown' },
            ...errors,
          ] satisfies Input[]
          const encodingStates = [
            ...(named(fn)
              ? [input('LATIN1'), input('nope'), input('UTF8')]
              : [input(8), input(-1), input(0)]),
            input(null),
            { kind: 'Unknown' },
            ...errors,
          ] satisfies Input[]
          if (named(fn))
            for (const encname of platformNames) {
              add({ ...base(), encname: input(encname) }, { kind: 'Unknown' })
              add({ ...base(), encname: input(encname), skip: input(true) }, { kind: 'True' })
            }
          for (const label of textStates)
            for (const encoding of fn.args.length === 2 ? encodingStates : [input(8)]) {
              const operands = fn.args.length === 2 ? [label, encoding] : [label]
              if (operands.every((operand) => operand.kind === 'Value')) continue
              const error = operands.find((operand) => operand.kind === 'Error')
              const expected: Outcome =
                error?.kind === 'Error'
                  ? error
                  : // A NULL operand makes the strict call NULL whatever the other is.
                    operands.some((operand) => operand.kind === 'Null')
                    ? { kind: 'Null' }
                    : { kind: 'Unknown' }
              const operand: Row = { [named(fn) ? 'encname' : 'encoding']: encoding }
              add({ ...base(), label, ...operand }, expected)
              add({ ...base(), label, ...operand, skip: input(true) }, { kind: 'True' })
            }
          add(
            {
              ...base(),
              label: errors[0]!,
              ...(named(fn) ? { encname: errors[1]! } : { encoding: errors[1]! }),
              skip: input(true),
            },
            { kind: 'True' },
          )
          add({ ...base(), skip: { kind: 'Unknown' } }, { kind: 'Unknown' })
          add({ ...base(), skip: errors[1]! }, errors[1]!)
        }
      }
      expect([...observed].sort()).toEqual(['0A000', '42704'])
      const group = prepareCheckRustGroup(checks)
      for (const check of group.checks)
        expect(check.kind, check.kind === 'unsupported' ? check.reason : '').toBe('supported')
      await runCheckParity(
        directory,
        'pgsid-check-to-ascii',
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
