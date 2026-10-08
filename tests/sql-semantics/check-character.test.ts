import { emitCheckRustEvaluator } from '../../src/codegen/shared/check-rust-evaluator.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { builtinCallables, builtinMetadata } from '../../src/postgres/builtins/inventory.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import type { CatalogSnapshot, TableInfo } from '../../src/catalog/types.js'
import { lowerTableCheck, lowerDomainCheck } from '../../src/sql-semantics/catalog-checks.js'
import {
  prepareCheckRust,
  prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const expressions: Record<string, string> = {
  char_regex: 'fixed COLLATE pg_catalog."C" ~ \'^a *$\'',
  char_to_text_regex: '(fixed::text) COLLATE pg_catalog."C" ~ \'^a$\'',

  varchar_equal: 'v = w',
  varchar_unequal: 'v <> w',
  varchar_order: 'v < w',
  varchar_literal: "v = 'a  '",
  varchar_cast: 'v::text = w::varchar',
  text_to_varchar: "('a  '::text)::varchar = v",
  text_to_char: "('a  '::text)::bpchar = fixed",
  varchar_to_char: 'v::bpchar = fixed',
  char_to_text: 'fixed::text = v',
  varchar_membership: "v IN ('a', 'a  ', NULL)",
  varchar_peers: 'v IN (w, NULL::varchar)',
  varchar_bounds: "v BETWEEN 'a' AND 'z'",
  varchar_case: 'CASE v WHEN w THEN true ELSE false END',
  varchar_scalar: '(CASE WHEN flag THEN v ELSE w END) = w',
  varchar_null: '(CASE WHEN flag THEN v END) IS NULL',
  varchar_length: 'length(v) = length(w)',
  varchar_regex: '(v::text) COLLATE pg_catalog."C" ~ \'^a *$\'',
  default_equal: "plain_v = 'a'",
  default_char_equal: "plain_c = 'a'",
  deterministic_char: "det_c = 'a'",
  char_literal: "fixed = 'a  '",
  char_whitespace: "fixed = E'a\\t'",
  char_empty: "fixed = '   '",
  char_membership: "fixed IN ('a  ', other, NULL)",
  char_bounds: "fixed BETWEEN 'a' AND 'z'",
  char_case: 'CASE fixed WHEN other THEN true ELSE false END',
  char_scalar: '(CASE WHEN flag THEN fixed ELSE other END) = other',
  char_null: '(CASE WHEN flag THEN fixed END) IS NULL',
  char_override: 'ci_c COLLATE pg_catalog."C" = \'a\'',
  varchar_override: 'ci_v COLLATE pg_catalog."C" = \'a\'',
  literal_char: "'a  '::bpchar = 'a'::bpchar",
  varchar_precision: "v::varchar(1) = 'a'",
  char_precision: "fixed::char(1) = 'a'",
  char_default_width: "'abc'::char = fixed",
  char_to_varchar: 'fixed::varchar = v',
}
const comparisons = builtinCallables().filter(
  (fn) =>
    fn.kind === 'operator' &&
    ['=', '<>', '<', '<=', '>', '>='].includes(fn.name) &&
    fn.args.every((type) => type === 'pg_catalog.bpchar'),
)
for (const op of comparisons) {
  if (op.kind !== 'operator') throw new Error('Expected operator')
  const fn = builtinMetadata(op.implementation)
  expressions[fn.name] = `pg_catalog.${fn.name}(fixed, other)`
  expressions['op_' + fn.name] = `fixed ${op.name} other`
}
const unsupported = {
  varchar_nondeterministic: "ci_v::text = 'a'",
  char_nondeterministic: "ci_c = 'a'",
  char_conflicting_collation: 'det_c = other_det_c',
  char_default_order: "plain_c < 'z'",
  varchar_default_order: "plain_v < 'z'",
  varchar_case_collation: "(CASE WHEN flag THEN ci_v ELSE plain_v END) = 'a'",
  char_case_collation: "(CASE WHEN flag THEN ci_c ELSE plain_c END) = 'a'",
}
const value = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const outcome = (value: boolean | null): Outcome => ({
  kind: value === null ? 'Null' : value ? 'True' : 'False',
})

describe('Rust CHECK character comparisons', () => {
  let pg: PGlite
  let directory: string
  let catalog: CatalogSnapshot
  let table: TableInfo
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-check-character-'))
    await pg.exec(`CREATE COLLATION char_deterministic (provider = icu, locale = 'und', deterministic = true);
      CREATE COLLATION other_deterministic FROM char_deterministic;
      CREATE COLLATION char_insensitive (provider = icu, locale = 'und', deterministic = false);
      CREATE DOMAIN label_text AS varchar(8) COLLATE "C" CHECK (VALUE <> '');
      CREATE DOMAIN fixed_label AS char(8) COLLATE "C" CHECK (VALUE <> '');
      CREATE TABLE character_checks (
        v varchar(8) COLLATE "C", w varchar(12) COLLATE "C",
        fixed char(8) COLLATE "C", other char(12) COLLATE "C",
        plain_v varchar(8), plain_c char(8),
        ci_v varchar(8) COLLATE char_insensitive, ci_c char(8) COLLATE char_insensitive,
        det_c char(8) COLLATE char_deterministic, other_det_c char(8) COLLATE other_deterministic,
        flag boolean,
        ${Object.entries(expressions)
          .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
          .join(',')});
      CREATE TABLE domain_labels (v label_text, fixed fixed_label,
        CONSTRAINT varchar_domain CHECK (v = 'a'), CONSTRAINT char_domain CHECK (fixed = 'a'));`)
    catalog = await snapshotCatalog(pg)
    table = catalog.tables.find((t) => t.name === 'character_checks')!
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })

  it('matches PGlite padding, trailing spaces, Unicode, control flow and domains in all three languages', async () => {
    expect(comparisons).toHaveLength(6)
    const names = Object.keys(expressions)
    const domainTable = catalog.tables.find((t) => t.name === 'domain_labels')!
    const domainNames = ['varchar_domain', 'char_domain']
    const domains = ['label_text', 'fixed_label'].map((name) =>
      catalog.domains.find((d) => d.name === name)!,
    )
    const group = prepareCheckRustGroup([
      ...names.map((name) => ({
        expression: lowerTableCheck(
          table,
          table.constraints.find((c) => c.name === name)!,
          [],
          catalog.domains,
        )!.expression,
        identity: { schema: 'public', kind: 'table' as const, owner: table.name, constraint: name },
      })),
      ...domainNames.map((name) => ({
        expression: lowerTableCheck(
          domainTable,
          domainTable.constraints.find((c) => c.name === name)!,
          [],
          catalog.domains,
        )!.expression,
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: domainTable.name,
          constraint: name,
        },
      })),
      ...domains.map((domain) => ({
        expression: lowerDomainCheck(domain, domain.checks[0]!)!.expression,
        identity: {
          schema: 'public',
          kind: 'domain' as const,
          owner: domain.name,
          constraint: domain.checks[0]!.name,
        },
      })),
    ])
    const ordered = [...names, ...domainNames, 'varchar_domain_value', 'char_domain_value']
    for (const [index, check] of group.checks.entries())
      expect(check.kind, ordered[index]).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const samples = [null, '', 'a', 'a ', 'a  ', 'a\t', 'a\n', 'é', 'e\u0301', '😀', 'b']
    for (const left of samples)
      for (const right of samples) {
        const projection = table.columns
          .map((column) => {
            const index = ['w', 'other', 'other_det_c'].includes(column.name)
              ? 2
              : column.name === 'flag'
                ? 3
                : 1
            const collation = ['ci_v', 'ci_c'].includes(column.name)
              ? 'char_insensitive'
              : column.name === 'det_c'
                ? 'char_deterministic'
                : column.name === 'other_det_c'
                  ? 'other_deterministic'
                  : column.collationIsC
                    ? 'pg_catalog."C"'
                    : null
            return `$${index}::${column.typeName}${collation ? ' COLLATE ' + collation : ''} AS ${column.name}`
          })
          .join(',')
        const input = (
          await pg.query<Record<string, string | boolean | null>>(`SELECT ${projection}`, [
            left,
            right,
            right !== null,
          ])
        ).rows[0]!
        const row: Row = Object.fromEntries(
          Object.entries(input).map(([name, v]) => [name, value(v)]),
        )
        const result = (
          await pg.query<Record<string, boolean | null>>(
            `SELECT ${names.map((name) => `(${expressions[name]}) AS "${name}"`).join(',')} FROM (SELECT ${projection}) candidate`,
            [left, right, right !== null],
          )
        ).rows[0]!
        for (const name of names) fixtures.push({ name, row, expected: outcome(result[name]!) })
      }
    for (const label of samples) {
      const row = (
        await pg.query<{ v: string | null; fixed: string | null }>(
          'SELECT $1::varchar(8) AS v, $1::char(8) AS fixed',
          [label],
        )
      ).rows[0]!
      for (const [name, expression, column] of [
        ['varchar_domain', "v = 'a'", 'v'],
        ['char_domain', "fixed = 'a'::bpchar", 'fixed'],
        ['varchar_domain_value', "v <> ''", 'v'],
        ['char_domain_value', "fixed <> ''::bpchar", 'fixed'],
      ]) {
        const expected = (
          await pg.query<{ v: boolean | null }>(
            `SELECT (${expression}) AS v FROM (SELECT $1::varchar(8) COLLATE "C" v, $1::char(8) COLLATE "C" fixed) candidate`,
            [label],
          )
        ).rows[0]!.v
        fixtures.push({
          name: name!,
          row: {
            [name!.endsWith('_value') ? 'value' : column!]: value(row[column as keyof typeof row]),
          },
          expected: outcome(expected),
        })
      }
    }
    const unknown: Row = Object.fromEntries(table.columns.map((c) => [c.name, { kind: 'Unknown' }]))
    const error: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
    const otherError: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
    for (const name of ['varchar_equal', 'bpchareq', 'char_case', 'varchar_case'])
      fixtures.push({ name, row: unknown, expected: { kind: 'Unknown' } })
    fixtures.push({
      name: 'bpchareq',
      row: { ...unknown, fixed: error, other: otherError },
      expected: error,
    })
    fixtures.push({
      name: 'bpchareq',
      row: { ...unknown, fixed: { kind: 'Null' }, other: error },
      expected: error,
    })
    fixtures.push({ name: 'varchar_equal', row: { ...unknown, v: error }, expected: error })
    fixtures.push({
      name: 'char_scalar',
      row: { ...unknown, flag: value(false), fixed: error, other: value('a ') },
      expected: { kind: 'True' },
    })
    fixtures.push({
      name: 'varchar_scalar',
      row: { ...unknown, flag: value(false), v: error, w: value('a ') },
      expected: { kind: 'True' },
    })
    await runCheckParity(directory, 'characterchecks', group, ordered, fixtures)
  }, 120_000)

  it.each(Object.entries(unsupported))('defers %s', (_name, sql) => {
    const expression = lowerTableCheck(
      table,
      { name: 'probe', type: 'check', definition: `CHECK (${sql})` },
      [],
      catalog.domains,
    )!.expression
    const prepared = prepareCheckRust(expression)
    if (prepared.kind === 'supported') expect(prepared.evaluator.callables).toEqual([])
    else expect(prepared.kind).toBe('unsupported')
  })
  it('checks collation and rejects value-changing casts in the emitter', () => {
    const expression = lowerTableCheck(table, {
      name: 'probe',
      type: 'check',
      definition: 'CHECK (fixed < other)',
    })!.expression
    if (expression.kind !== 'eval-scalar' || expression.expression.kind !== 'call')
      throw new Error('Expected comparison')
    const call = expression.expression
    const operation = call.call
    if (operation.kind !== 'operator') throw new Error('Expected operator')
    expect(() =>
      emitCheckRustEvaluator({
        ...expression,
        expression: { ...call, call: { ...operation, collation: 'deterministic' } },
      }),
    ).toThrow(/collation/u)
    const cast = {
      kind: 'call' as const,
      call: { kind: 'cast' as const, signature: null, type: 'pg_catalog.text' },
      operands: [{ kind: 'input' as const, type: 'pg_catalog.bpchar' as const, name: 'fixed' }],
    }
    expect(() =>
      emitCheckRustEvaluator({
        kind: 'eval-scalar',
        expression: {
          kind: 'null-test',
          type: 'pg_catalog.bool',
          negated: false,
          operand: cast,
        },
      }),
    ).toThrow(/relabel cast/u)
  })
})
