import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'
const value = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (code: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})
const quote = (text: string) => "'" + text.replaceAll("'", "''") + "'"
const ranges = [
  'YEAR',
  'MONTH',
  'YEAR TO MONTH',
  'DAY',
  'HOUR',
  'DAY TO HOUR',
  'MINUTE',
  'HOUR TO MINUTE',
  'DAY TO MINUTE',
  '',
  'SECOND',
  'MINUTE TO SECOND',
  'HOUR TO SECOND',
  'DAY TO SECOND',
]
const variants = ranges.flatMap((range) =>
  (range === '' || range.endsWith('SECOND') ? [null, 0, 3, 6, 9] : [null]).map((precision) => ({
    range,
    precision,
    type: range
      ? `interval ${range}${precision === null ? '' : '(' + precision + ')'}`
      : `interval${precision === null ? '' : '(' + precision + ')'}`,
    literal: (text: string) =>
      range
        ? `INTERVAL ${quote(text)} ${range}${precision === null ? '' : '(' + precision + ')'}`
        : `INTERVAL${precision === null ? '' : '(' + precision + ')'} ${quote(text)}`,
  })),
)

describe('interval precision binding and typed literal preparation', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-interval-precision-'))
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('preserves field-dependent literal decoding, runtime text casts, rounding and eager literal errors in raw/stored CHECKs', async () => {
    const expressions: Record<string, string> = {
      typed_null: 'NULL::interval YEAR IS NULL',
      constructor_defaults: "make_interval() = INTERVAL '0'",
    }
    for (const [index, variant] of variants.entries()) {
      expressions['runtime_' + index] = `interval_send(source::${variant.type}) = expected`
      expressions['runtime_lazy_' + index] =
        `CASE WHEN skip THEN true ELSE interval_send(source::${variant.type}) = expected END`
      for (const [literal, text] of ['1', '1.5', '1:02', '1:02:03'].entries())
        expressions[`literal_${index}_${literal}`] =
          `interval_send(${variant.literal(text)}) = expected`
    }
    await pg.exec(
      `CREATE TABLE interval_precision_checks (source text,expected bytea,skip bool,${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK (${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((table) => table.name === 'interval_precision_checks')!
    const constraints = Object.entries(expressions).flatMap(([name, sql]) => {
      const stored = table.constraints.find((constraint) => constraint.name === name)!
      return [
        { ...stored, name: name + '_raw', definition: `CHECK (${sql})` },
        { ...stored, name: name + '_stored' },
      ]
    })
    const invalid = {
      literal_overflow:
        "CASE WHEN skip THEN true ELSE INTERVAL(0) '9223372036854.775807 seconds' IS NULL END",
      literal_overflow_constant:
        "CASE WHEN true THEN true ELSE INTERVAL(3) '-9223372036854.775808 seconds' IS NULL END",
      literal_coalesce: "COALESCE(INTERVAL '0',INTERVAL(0) '9223372036854.775807 seconds') IS NULL",
      literal_invalid: "CASE WHEN skip THEN true ELSE INTERVAL 'now' YEAR IS NULL END",
      runtime_dead: "CASE WHEN true THEN true ELSE ('now'::text)::interval YEAR IS NULL END",
    }
    for (const [name, sql] of Object.entries(invalid))
      constraints.push({ ...table.constraints[0]!, name, definition: `CHECK (${sql})` })
    const group = prepareCheckRustGroup(
      constraints.map((constraint) => ({
        expression: lowerTableCheck(table, constraint)!.expression,
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: constraint.name,
        },
      })),
    )
    for (const [index, check] of group.checks.entries())
      expect(check.kind, constraints[index]!.name).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + suffix, row, expected })
    }
    for (const [index, variant] of variants.entries()) {
      for (const text of [
        '1',
        '1.5',
        '-1.5',
        '1:02',
        '1:02:03',
        '1 year 2 months 3 days 04:05:06.123456',
        'P1Y2M3DT4H5M6.1S',
        '-1 day +2 hours',
        '1-2',
        'now',
        '1 month 2 months',
        '9223372036854.775807 seconds',
        '-9223372036854.775808 seconds',
        'infinity',
        '-infinity',
        null,
      ]) {
        let wire: string | null = null,
          expected: Outcome
        try {
          wire = (
            await pg.query<{ wire: string | null }>(
              `SELECT encode(interval_send($1::text::${variant.type}),'hex') wire`,
              [text],
            )
          ).rows[0]!.wire
          expected = { kind: text === null ? 'Null' : 'True' }
        } catch (caught) {
          const code = (caught as { code: string }).code
          expect(['22007', '22008', '22015']).toContain(code)
          expected = error(code)
        }
        const row = { source: value(text), expected: value(wire), skip: value(false) }
        add('runtime_' + index, row, expected)
        add('runtime_lazy_' + index, row, expected)
        add('runtime_lazy_' + index, { ...row, skip: value(true) }, { kind: 'True' })
      }
      for (const [literal, text] of ['1', '1.5', '1:02', '1:02:03'].entries()) {
        const wire = (
          await pg.query<{ wire: string }>(
            `SELECT encode(interval_send(${variant.literal(text)}),'hex') wire`,
          )
        ).rows[0]!.wire
        add(`literal_${index}_${literal}`, { expected: value(wire) }, { kind: 'True' })
      }
      for (const state of [{ kind: 'Unknown' }, { kind: 'Null' }, error('22012')] as Input[])
        add('runtime_' + index, { source: state, expected: value('') }, state as Outcome)
    }
    for (const name of ['typed_null', 'constructor_defaults']) add(name, {}, { kind: 'True' })
    for (const [name, sql] of Object.entries(invalid))
      for (const skip of [false, true]) {
        let expected: Outcome
        try {
          const result = (
            await pg.query<{ result: boolean }>(
              `SELECT ${sql.replaceAll('skip', '$1::bool')} result`,
              sql.includes('skip') ? [skip] : [],
            )
          ).rows[0]!.result
          expected = { kind: result ? 'True' : 'False' }
        } catch (caught) {
          const code = (caught as { code: string }).code
          expect(['22007', '22008']).toContain(code)
          expected = error(code)
        }
        fixtures.push({ name, row: { skip: value(skip) }, expected })
      }
    await runCheckParity(
      directory,
      'intervalprecision',
      group,
      constraints.map((constraint) => constraint.name),
      fixtures,
    )
  }, 300_000)
})
