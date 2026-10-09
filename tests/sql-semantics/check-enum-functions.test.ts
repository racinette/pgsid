import { describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { builtinCallables, builtinMetadata } from '../../src/postgres/builtins/inventory.js'
import type { FunctionMetadata, OperatorMetadata } from '../../src/postgres/builtins/catalog.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const names = new Set(
  [
    ...readFileSync(
      'crates/check-evaluator/src/operations/pg_catalog/enumeration.rs',
      'utf8',
    ).matchAll(/pub fn (sql__[a-z0-9_]+)\(/gu),
  ].map((match) => match[1]!),
)
const functions = builtinCallables().filter(
  (fn): fn is FunctionMetadata => fn.kind === 'function' && names.has(fn.rustName),
)
const operators = builtinCallables().filter(
  (fn): fn is OperatorMetadata =>
    fn.kind === 'operator' &&
    fn.args.length === 2 &&
    fn.args.every((arg) => arg === 'pg_catalog.anyenum'),
)
const input = (value: string | number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (state: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(state, 36) },
})
const seeds = [
  -9223372036854775808n,
  -4294967296n,
  -1n,
  0n,
  1n,
  4294967296n,
  9007199254740993n,
  9223372036854775807n,
]
const recorded = (type: string) =>
  type === 'pg_catalog.bool'
    ? 'recorded_bool'
    : type === 'pg_catalog.int4'
      ? 'recorded_i4'
      : type === 'pg_catalog.int8'
        ? 'recorded_i8'
        : 'recorded_stage'
const containsUncertain = (value: unknown): boolean =>
  value !== null &&
  typeof value === 'object' &&
  ('kind' in value && value.kind === 'uncertain'
    ? true
    : Object.values(value).some(containsUncertain))

describe('Rust CHECK enum catalog functions', () => {
  it('resolves the complete strict immutable enum surface and its operator aliases', () => {
    expect(functions.map((fn) => fn.name).sort()).toEqual([
      'enum_cmp',
      'enum_eq',
      'enum_ge',
      'enum_gt',
      'enum_larger',
      'enum_le',
      'enum_lt',
      'enum_ne',
      'enum_smaller',
      'hashenum',
      'hashenumextended',
    ])
    expect(functions).toHaveLength(names.size)
    expect(operators.map((fn) => fn.name).sort()).toEqual(['<', '<=', '<>', '=', '>', '>='])
    for (const operation of operators) {
      const fn = builtinMetadata(operation.implementation)
      expect(fn.kind === 'function' && names.has(fn.rustName)).toBe(true)
    }
  })

  it('matches PostgreSQL enum sort order, selection, OID hashes, states and lazy branches in Rust, Go and TypeScript', async () => {
    const pg = await PGlite.create()
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-enum-functions-'))
    try {
      await pg.exec(`CREATE SCHEMA enum_ops; CREATE SCHEMA enum_other;
        CREATE TYPE enum_ops.stage AS ENUM ('queued','done','café','quote''s');
        ALTER TYPE enum_ops.stage ADD VALUE 'ready' BEFORE 'done';
        CREATE TYPE enum_ops.extreme AS ENUM ('queued','ready','done');
        UPDATE pg_enum SET oid=CASE enumlabel WHEN 'queued' THEN 1::oid
          WHEN 'ready' THEN 2147483648::oid ELSE 4294967295::oid END
          WHERE enumtypid='enum_ops.extreme'::regtype;
        CREATE TYPE enum_other.stage AS ENUM ('queued','done');`)
      const expressionsByType = new Map<string, Record<string, string>>()
      for (const type of ['stage', 'extreme']) {
        const expressions: Record<string, string> = Object.fromEntries(
          functions.map((fn) => [
            'fn_' + fn.name,
            `pg_catalog.${fn.name}(stage${fn.args.length === 1 ? '' : fn.args[1] === 'pg_catalog.int8' ? ',seed' : ',peer'}) = ${recorded(fn.result)}`,
          ]),
        )
        for (const operation of operators)
          expressions['op_' + builtinMetadata(operation.implementation).name] =
            `(stage ${operation.name} peer) = recorded_bool`
        Object.assign(expressions, {
          nested_selection: 'enum_smaller(enum_larger(stage,peer),recorded_stage) = recorded_stage',
          selected_hash: 'hashenum(enum_larger(stage,peer)) = recorded_i4',
          selected_seeded_hash: 'hashenumextended(enum_smaller(stage,peer),seed) = recorded_i8',
          case_selection:
            '(CASE WHEN flag THEN enum_larger(stage,peer) ELSE recorded_stage END) = recorded_stage',
          coalesce_selection: 'COALESCE(enum_smaller(stage,peer),recorded_stage) = recorded_stage',
          simple_case: "CASE enum_larger(stage,peer) WHEN 'done' THEN recorded_bool ELSE true END",
          membership: "enum_smaller(stage,peer) IN ('queued','ready')",
          between: "enum_larger(stage,peer) BETWEEN 'ready' AND 'done'",
          domain_order: `enum_cmp(domain_stage::enum_ops.${type},stage) = recorded_i4`,
          domain_coalesce_base: 'enum_cmp(COALESCE(domain_stage,NULL),stage) = recorded_i4',
          domain_case_base:
            'enum_larger(CASE WHEN flag THEN domain_stage END,stage) = recorded_stage',
          promoted_seed: 'hashenumextended(stage,1) = recorded_i8',
          literal_hash: `hashenum('ready'::enum_ops.${type}) = recorded_i4`,
          strict_null: `enum_larger(NULL::enum_ops.${type},peer) IS NULL`,
        })
        expressionsByType.set(type, expressions)
        await pg.exec(`CREATE DOMAIN enum_ops.${type}_domain AS enum_ops.${type};
          CREATE DOMAIN enum_ops.${type}_nested AS enum_ops.${type}_domain;
          CREATE TABLE enum_ops.${type}_samples (
            stage enum_ops.${type}, peer enum_ops.${type}, domain_stage enum_ops.${type}_nested,
            foreign_stage enum_other.stage, seed bigint, recorded_bool boolean,
            recorded_i4 integer, recorded_i8 bigint, recorded_stage enum_ops.${type},
            flag boolean, skip boolean,
            ${Object.entries(expressions)
              .map(
                ([name, sql]) =>
                  `CONSTRAINT ${name} CHECK (CASE WHEN skip THEN true ELSE (${sql}) END)`,
              )
              .join(',')}
          )`)
      }
      const catalog = await snapshotCatalog(pg)
      const checks: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
      const fixtures: { name: string; row: Row; expected: Outcome }[] = []
      for (const type of ['stage', 'extreme']) {
        const table = catalog.tables.find(
          (item) => item.schema === 'enum_ops' && item.name === type + '_samples',
        )!
        const definition = catalog.enums.find(
          (item) => item.schema === 'enum_ops' && item.name === type,
        )!
        const expressions = expressionsByType.get(type)!
        if (type === 'stage')
          expect(definition.valueOids![1]).toBeGreaterThan(definition.valueOids![2]!)
        else expect(definition.valueOids).toEqual([1, 2147483648, 4294967295])
        for (const [constraint, sql] of Object.entries(expressions))
          for (const form of ['raw', 'stored']) {
            const plan = lowerTableCheck(
              table,
              form === 'raw'
                ? {
                    name: constraint,
                    type: 'check',
                    definition: `CHECK (CASE WHEN skip THEN true ELSE (${sql}) END)`,
                  }
                : table.constraints.find((item) => item.name === constraint)!,
              catalog.enums,
              catalog.domains,
            )!
            expect(containsUncertain(plan.expression), `${type} ${constraint} ${form}`).toBe(false)
            checks.push({
              expression: plan.expression,
              identity: {
                schema: 'enum_ops',
                kind: 'table',
                owner: table.name,
                constraint: `${constraint}_${form}`,
              },
            })
          }
        const add = (name: string, row: Row, expected: Outcome) => {
          for (const form of ['raw', 'stored'])
            fixtures.push({ name: `${type}_${name}_${form}`, row: { ...row }, expected })
        }
        const enumInput = (label: string | null): Input =>
          label === null ? input(null) : input(definition.values.indexOf(label))
        const base = (): Row => ({
          stage: enumInput('queued'),
          peer: enumInput('ready'),
          domain_stage: enumInput('ready'),
          foreign_stage: input(0),
          seed: input(0n),
          recorded_bool: input(true),
          recorded_i4: input(0),
          recorded_i8: input(0n),
          recorded_stage: enumInput('ready'),
          flag: input(true),
          skip: input(false),
        })
        const labels = [null, ...definition.values]
        for (const fn of functions) {
          const name = 'fn_' + fn.name
          for (const left of labels)
            for (const right of fn.args.length === 1
              ? [null]
              : fn.args[1] === 'pg_catalog.int8'
                ? seeds
                : labels) {
              const oracle = (
                await pg.query<{ value: string | number | bigint | boolean | null }>(
                  `SELECT pg_catalog.${fn.name}($1::enum_ops.${type}${fn.args.length === 1 ? '' : fn.args[1] === 'pg_catalog.int8' ? ',$2::bigint' : `,$2::enum_ops.${type}`}) AS value`,
                  fn.args.length === 1 ? [left] : [left, right],
                )
              ).rows[0]!.value
              const row = base()
              row.stage = enumInput(left)
              if (fn.args.length === 2)
                row[fn.args[1] === 'pg_catalog.int8' ? 'seed' : 'peer'] =
                  typeof right === 'bigint' ? input(right) : enumInput(right)
              row[recorded(fn.result)] =
                fn.result === 'pg_catalog.anyenum'
                  ? enumInput(oracle as string | null)
                  : input(oracle)
              add(name, row, { kind: oracle === null ? 'Null' : 'True' })
              if (oracle !== null) {
                row[recorded(fn.result)] =
                  typeof oracle === 'boolean'
                    ? input(!oracle)
                    : typeof oracle === 'bigint'
                      ? input(oracle === 9223372036854775807n ? 0n : oracle + 1n)
                      : typeof oracle === 'number'
                        ? input(oracle === 2147483647 ? 0 : oracle + 1)
                        : enumInput(oracle === 'queued' ? 'ready' : 'queued')
                add(name, row, { kind: 'False' })
              }
            }
          const arguments_ =
            fn.args.length === 1
              ? ['stage']
              : ['stage', fn.args[1] === 'pg_catalog.int8' ? 'seed' : 'peer']
          for (const argument of arguments_) {
            for (const state of [input(null), { kind: 'Unknown' } as Input, error('22003')]) {
              const row = base()
              row[argument] = state
              add(
                name,
                row,
                state.kind === 'Error'
                  ? state
                  : { kind: state.kind === 'Null' ? 'Null' : 'Unknown' },
              )
            }
            const row = base()
            row.stage = { kind: 'Unknown' }
            row[argument] = error('22P02')
            add(name, row, error('22P02'))
          }
          if (arguments_.length === 2) {
            const row = base()
            row.stage = error('22003')
            row[arguments_[1]!] = error('22P02')
            add(name, row, error('22003'))
            row.stage = input(null)
            row[arguments_[1]!] = { kind: 'Unknown' }
            add(name, row, { kind: 'Unknown' })
          }
          const skipped = base()
          for (const field of Object.keys(skipped)) skipped[field] = error('22003')
          skipped.skip = input(true)
          add(name, skipped, { kind: 'True' })
        }
        const extraNames = Object.keys(expressions).filter((name) => !name.startsWith('fn_'))
        for (const left of labels)
          for (const right of labels)
            for (const flag of [true, false, null]) {
              const row = base()
              row.stage = enumInput(left)
              row.peer = enumInput(right)
              row.flag = input(flag)
              const projection = table.columns
                .map((column, index) => `$${index + 1}::${column.typeName} AS ${column.name}`)
                .join(',')
              const values = table.columns.map((column) => {
                const value = row[column.name]!
                if (value.kind !== 'Value') return null
                return column.name === 'foreign_stage'
                  ? 'queued'
                  : ['stage', 'peer', 'domain_stage', 'recorded_stage'].includes(column.name)
                    ? definition.values[value.value as number]!
                    : value.value
              })
              for (const name of extraNames) {
                const value = (
                  await pg.query<{ value: boolean | null }>(
                    `SELECT (${expressions[name]}) AS value FROM (SELECT ${projection}) AS sample`,
                    values,
                  )
                ).rows[0]!.value
                add(name, row, { kind: value === null ? 'Null' : value ? 'True' : 'False' })
              }
            }
        const strict = base()
        strict.peer = error('22003')
        add('strict_null', strict, { kind: 'True' })
        for (const sql of [
          'enum_cmp(stage,foreign_stage) = 0',
          'enum_larger(stage,foreign_stage) IS NULL',
          'hashenumextended(stage,foreign_stage) = 0',
          "hashenum('ready') = 0",
          'enum_cmp(domain_stage,stage) = 0',
          'hashenum(domain_stage) = 0',
          'domain_stage < stage',
          'enum_larger(COALESCE(domain_stage,domain_stage),stage) IS NULL',
          'enum_cmp(CASE WHEN flag THEN domain_stage ELSE domain_stage END,stage) = 0',
        ])
          expect(
            lowerTableCheck(
              table,
              { name: 'invalid_identity', type: 'check', definition: `CHECK (${sql})` },
              catalog.enums,
              catalog.domains,
            )!.expression,
          ).toEqual({ kind: 'uncertain' })
        await expect(
          pg.query(`SELECT enum_larger(NULL::enum_ops.${type},NULL::enum_other.stage)`),
        ).rejects.toMatchObject({ code: '42883' })
      }
      const group = prepareCheckRustGroup(checks)
      const fixtureNames = [...expressionsByType].flatMap(([type, expressions]) =>
        Object.keys(expressions).flatMap((name) =>
          ['raw', 'stored'].map((form) => `${type}_${name}_${form}`),
        ),
      )
      for (const [index, check] of group.checks.entries())
        expect(
          check.kind,
          `${fixtureNames[index]}: ${check.kind === 'unsupported' ? check.reason : ''}`,
        ).toBe('supported')
      await runCheckParity(directory, 'pgsidenumfunctions', group, fixtureNames, fixtures)
    } finally {
      await pg.close()
      await rm(directory, { recursive: true, force: true })
    }
  }, 240000)
})
