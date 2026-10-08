import { describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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

const functionNames = new Set([
  'char_length',
  'character_length',
  'length',
  'octet_length',
  'textlen',
  'bit_length',
  'btrim',
  'ltrim',
  'rtrim',
  'text_pattern_lt',
  'text_pattern_le',
  'text_pattern_gt',
  'text_pattern_ge',
  'bttext_pattern_cmp',
  'bpchar_pattern_lt',
  'bpchar_pattern_le',
  'bpchar_pattern_gt',
  'bpchar_pattern_ge',
  'btbpchar_pattern_cmp',
])
const callables = builtinCallables().filter(
  (item): item is FunctionMetadata => item.kind === 'function' && functionNames.has(item.name),
)
const functions = callables.filter((item) =>
  supportsTextCallableCollation(callableIdentity(item), 'other'),
)
const identities = new Set(functions.map(callableIdentity))
const operators = builtinCallables().filter(
  (item) => item.kind === 'operator' && identities.has(item.implementation),
)
const textual = (type: string) => ['pg_catalog.text', 'pg_catalog.bpchar'].includes(type)
const shortType = (type: string) => type.slice('pg_catalog.'.length)
const argName = (type: string, index: number) => `arg${index}_${shortType(type)}`
const recordedName = (type: string) => `recorded_${shortType(type)}`
const literal = (value: string, type: string, collation: string) =>
  `'${value.replaceAll("'", "''")}'::${type} COLLATE ${collation}`
const input = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const expressions: Record<string, string> = {}
const columns: Record<string, string> = {}
for (const item of functions) {
  item.args.forEach((type, index) => {
    columns[argName(type, index)] = type
  })
  columns[recordedName(item.result)] = item.result
  const result = `pg_catalog.${item.name}(${item.args.map(argName).join(',')})`
  expressions[item.rustName] =
    `(${result})${textual(item.result) ? ' COLLATE "C"' : ''} = ${recordedName(item.result)}`
}
for (const item of operators) {
  if (item.kind !== 'operator') continue
  const fn = functions.find((fn) => callableIdentity(fn) === item.implementation)!
  expressions[`operator_${fn.rustName}`] =
    `(${argName(item.args[0]!, 0)} OPERATOR(pg_catalog.${item.name}) ${argName(item.args[1]!, 1)}) = recorded_bool`
}
const collations = [
  'pg_catalog."default"',
  'pg_catalog."C"',
  'public.insensitive',
  'public.other_collation',
  'mixed',
]

describe('intrinsic text callable collation', () => {
  it('accepts only represented immutable intrinsic text functions and their operator implementations', () => {
    expect(functions).toHaveLength(26)
    expect(operators).toHaveLength(8)
    for (const fn of functions) {
      expect(fn).toMatchObject({
        kind: 'function',
        schema: 'pg_catalog',
        strict: true,
        volatility: 'i',
        returnsSet: false,
      })
      for (const collation of [undefined, 'C', 'deterministic', 'other'])
        expect(supportsTextCallableCollation(callableIdentity(fn), collation)).toBe(true)
    }
    for (const item of operators)
      expect(supportsTextCallableCollation(callableIdentity(item), 'other')).toBe(true)
    for (const fn of callables.filter((item) => !functions.includes(item)))
      expect(supportsTextCallableCollation(callableIdentity(fn), 'other')).toBe(false)
    for (const fn of builtinCallables().filter(
      (item) =>
        item.kind === 'function' &&
        [
          'bttextcmp',
          'bpcharcmp',
          'text_larger',
          'text_smaller',
          'bpchar_larger',
          'bpchar_smaller',
        ].includes(item.name),
    )) {
      expect(supportsTextCallableCollation(callableIdentity(fn), 'C')).toBe(true)
      expect(supportsTextCallableCollation(callableIdentity(fn), 'deterministic')).toBe(false)
      expect(supportsTextCallableCollation(callableIdentity(fn), 'other')).toBe(false)
    }
  })

  it('matches PGlite under default, C, deterministic, nondeterministic and conflicting implicit collations in native Rust and both targets', async () => {
    const pg = await PGlite.create()
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-text-collation-'))
    try {
      await pg.exec(`CREATE COLLATION public.insensitive (provider=icu,locale='und',deterministic=false);
        CREATE COLLATION public.other_collation (provider=icu,locale='und',deterministic=true);`)
      for (const [index, collation] of collations.entries()) {
        const definition = Object.entries(columns)
          .map(([name, type]) => {
            const selected =
              collation === 'mixed'
                ? name.startsWith('arg1_')
                  ? 'public.other_collation'
                  : 'public.insensitive'
                : collation
            return `${name} ${type}${textual(type) ? ` COLLATE ${name.startsWith('recorded_') ? 'pg_catalog."C"' : selected}` : ''}`
          })
          .join(',')
        await pg.exec(
          `CREATE TABLE text_collation_${index} (${definition}, ${Object.entries(expressions)
            .map(([name, sql]) => `CONSTRAINT ${name} CHECK (${sql})`)
            .join(',')})`,
        )
      }
      const catalog = await snapshotCatalog(pg)
      const checks: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
      const fixtures: { name: string; row: Row; expected: Outcome }[] = []
      for (const [index, collation] of collations.entries()) {
        const table = catalog.tables.find((table) => table.name === `text_collation_${index}`)!
        for (const [name, sql] of Object.entries(expressions)) {
          for (const form of ['raw', 'stored']) {
            const identity = `${name}_${index}_${form}`
            const plan = lowerTableCheck(
              table,
              form === 'stored'
                ? table.constraints.find((item) => item.name === name)!
                : { name, type: 'check', definition: `CHECK (${sql})` },
              [],
              catalog.domains,
            )!
            expect(plan.expression.kind, identity).not.toBe('uncertain')
            checks.push({
              expression: plan.expression,
              identity: {
                schema: 'public',
                kind: 'table',
                owner: table.name,
                constraint: identity,
              },
            })
          }
        }
        for (const fn of functions) {
          const values = fn.args.map((_type, index) => (index === 0 ? '  é😊 a  ' : ' é😊'))
          const selectCollation = (index: number) =>
            collation === 'mixed'
              ? index === 0
                ? 'public.insensitive'
                : 'public.other_collation'
              : collation
          const sql = `pg_catalog.${fn.name}(${fn.args.map((_type, index) => `value${index}`).join(',')})`
          const sample = fn.args
            .map(
              (type, index) =>
                `${literal(values[index]!, type, selectCollation(index))} AS value${index}`,
            )
            .join(',')
          const result = (
            await pg.query<{ value: string | number | boolean | null }>(
              `SELECT (${sql}) AS value FROM (SELECT ${sample}) sample`,
            )
          ).rows[0]!.value
          const row: Row = Object.fromEntries(
            Object.entries(columns).map(([name, type]) => [
              name,
              input(textual(type) ? '' : type === 'pg_catalog.bool' ? false : 0),
            ]),
          )
          fn.args.forEach((type, index) => {
            row[argName(type, index)] = input(values[index]!)
          })
          row[recordedName(fn.result)] = input(result)
          const names = [
            fn.rustName,
            ...(expressions[`operator_${fn.rustName}`] ? [`operator_${fn.rustName}`] : []),
          ]
          const record = (row: Row, expected: Outcome) => {
            for (const name of names)
              for (const form of ['raw', 'stored'])
                fixtures.push({ name: `${name}_${index}_${form}`, row: { ...row }, expected })
          }
          record(row, { kind: 'True' })
          record(
            {
              ...row,
              [recordedName(fn.result)]: input(
                typeof result === 'string'
                  ? result + '!'
                  : typeof result === 'boolean'
                    ? !result
                    : result === 0
                      ? 1
                      : 0,
              ),
            },
            { kind: 'False' },
          )
          record({ ...row, [argName(fn.args[0]!, 0)]: { kind: 'Null' } }, { kind: 'Null' })
          record({ ...row, [argName(fn.args[0]!, 0)]: { kind: 'Unknown' } }, { kind: 'Unknown' })
          record(
            {
              ...row,
              [argName(fn.args[0]!, 0)]: { kind: 'Error', value: { state: parseInt('22003', 36) } },
            },
            { kind: 'Error', value: { state: parseInt('22003', 36) } },
          )
        }
      }
      const table = catalog.tables.find((table) => table.name === 'text_collation_0')!
      for (const fn of functions.filter((fn) => fn.args.length === 2)) {
        const sql = `pg_catalog.${fn.name}(${argName(fn.args[0]!, 0)} COLLATE "C", ${argName(fn.args[1]!, 1)} COLLATE public.other_collation) IS NOT NULL`
        expect(
          lowerTableCheck(table, { name: 'conflict', type: 'check', definition: `CHECK (${sql})` })
            ?.expression,
        ).toEqual({ kind: 'uncertain' })
        await expect(
          pg.query(
            `SELECT pg_catalog.${fn.name}(${literal('a', fn.args[0]!, '"C"')},${literal('b', fn.args[1]!, 'public.other_collation')})`,
          ),
        ).rejects.toMatchObject({ code: '42P21' })
      }
      const group = prepareCheckRustGroup(checks)
      expect(group.checks.every((check) => check.kind === 'supported')).toBe(true)
      await runCheckParity(
        directory,
        'pgsid-check-text-collation',
        group,
        checks.map((check) => check.identity.constraint),
        fixtures,
      )
    } finally {
      await pg.close()
      await rm(directory, { recursive: true, force: true })
    }
  })
})
