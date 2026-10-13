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
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
import {
  intervalInputForms,
  deferredIntervalContextForms,
  unimplementedIntervalGrammarForms,
} from './check-interval-input-forms.js'

const value = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (code: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})
const quote = (text: string) => "'" + text.replaceAll("'", "''") + "'"

describe('interval text input and catalog literals', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-interval-input-'))
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('matches unit, clock and ISO parsing across styles, raw/stored definitions, states and lazy branches', async () => {
    const expressions: Record<string, string> = {
      input: 'interval_send(source::interval) = expected',
      varchar_input: 'interval_send(source::varchar::interval) = expected',
      lazy_input: 'CASE WHEN skip THEN true ELSE interval_send(source::interval) = expected END',
      typed_null: 'NULL::interval IS NULL',
      runtime_dead:
        "CASE WHEN true THEN true ELSE ('1 month 2 months'::text)::interval IS NULL END",
    }
    const literals = [
      '1 month',
      '1 month -30 days',
      '-1 day +2 hours',
      '1 year 2 mons 3 days 04:05:06.123456',
      'P1Y2M3DT4H5M6.1S',
      'P0001-02-03T04:05:06',
      'PT010203.75',
      '-9223372036854.775808 seconds',
      '9223372036854.775807 seconds',
      '-2147483648 months',
      '2147483647 months',
      '-2147483648 days',
      '2147483647 days',
      'infinity',
      '-infinity',
    ]
    for (const [index, text] of literals.entries())
      expressions['literal_' + index] = `interval_send(INTERVAL ${quote(text)}) = expected`
    await pg.exec(
      `CREATE TABLE interval_input_checks (source text, expected bytea, skip bool, ${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK (${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((table) => table.name === 'interval_input_checks')!
    const constraints = Object.entries(expressions).flatMap(([name, sql]) => {
      const stored = table.constraints.find((constraint) => constraint.name === name)!
      return [
        { ...stored, name: name + '_raw', definition: `CHECK (${sql})` },
        { ...stored, name: name + '_stored' },
      ]
    })
    constraints.push({
      ...table.constraints[0]!,
      name: 'invalid_literal',
      type: 'check',
      definition: "CHECK (CASE WHEN skip THEN true ELSE INTERVAL '1 month 2 months' IS NULL END)",
    })
    const invalidConstants = {
      invalid_constant_case:
        "CASE WHEN true THEN true ELSE INTERVAL '1 month 2 months' IS NULL END",
      invalid_coalesce: "COALESCE(INTERVAL '0',INTERVAL '1 month 2 months') IS NULL",
      invalid_alternative: "CASE WHEN true THEN true ELSE INTERVAL 'P1Y2' IS NULL END",
    }
    for (const [name, sql] of Object.entries(invalidConstants))
      constraints.push({
        ...table.constraints[0]!,
        name,
        type: 'check',
        definition: `CHECK (${sql})`,
      })
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
    for (const style of ['postgres', 'postgres_verbose', 'sql_standard', 'iso_8601']) {
      await pg.exec(`SET IntervalStyle='${style}'`)
      for (const text of intervalInputForms) {
        let expected: Outcome
        let hex: string | null = null
        try {
          hex = (
            await pg.query<{ hex: string | null }>(
              "SELECT encode(interval_send($1::interval),'hex') hex",
              [text],
            )
          ).rows[0]!.hex
          expected = { kind: text === null ? 'Null' : 'True' }
        } catch (caught) {
          const code = (caught as { code: string }).code
          expect(['22007', '22008', '22015']).toContain(code)
          expected = error(code)
        }
        const row = { source: value(text), expected: value(hex), skip: value(false) }
        for (const name of ['input', 'varchar_input', 'lazy_input']) add(name, row, expected)
        add('lazy_input', { ...row, skip: value(true) }, { kind: 'True' })
      }
      for (const [index, text] of literals.entries()) {
        const hex = (
          await pg.query<{ hex: string }>("SELECT encode(interval_send($1::interval),'hex') hex", [
            text,
          ])
        ).rows[0]!.hex
        add('literal_' + index, { expected: value(hex) }, { kind: 'True' })
      }
    }
    for (const text of deferredIntervalContextForms) {
      const outputs = new Set<string>()
      for (const style of ['postgres', 'sql_standard']) {
        await pg.exec(`SET IntervalStyle='${style}'`)
        outputs.add(
          (
            await pg.query<{ hex: string }>(
              "SELECT encode(interval_send($1::interval),'hex') hex",
              [text],
            )
          ).rows[0]!.hex,
        )
      }
      expect(outputs.size, text).toBe(2)
    }
    for (const text of [...deferredIntervalContextForms, ...unimplementedIntervalGrammarForms]) {
      add('input', { source: value(text), expected: value('') }, { kind: 'Unknown' })
      add(
        'lazy_input',
        { source: value(text), expected: value(''), skip: value(true) },
        { kind: 'True' },
      )
    }
    for (const input of [{ kind: 'Unknown' }, { kind: 'Null' }, error('22012')] as Input[]) {
      add('input', { source: input, expected: value('') }, input as Outcome)
      add('lazy_input', { source: input, expected: value(''), skip: value(true) }, { kind: 'True' })
    }
    add('typed_null', {}, { kind: 'True' })
    add('runtime_dead', {}, { kind: 'True' })
    for (const skip of [true, false]) {
      await expect(
        pg.query(
          "SELECT CASE WHEN $1::bool THEN true ELSE INTERVAL '1 month 2 months' IS NULL END",
          [skip],
        ),
      ).rejects.toMatchObject({ code: '22007' })
      fixtures.push({
        name: 'invalid_literal',
        row: { skip: value(skip) },
        expected: error('22007'),
      })
    }
    fixtures.push({
      name: 'invalid_literal',
      row: { skip: { kind: 'Unknown' } },
      expected: error('22007'),
    })
    for (const [name, sql] of Object.entries(invalidConstants)) {
      await expect(pg.query(`SELECT ${sql}`)).rejects.toMatchObject({ code: '22007' })
      fixtures.push({ name, row: {}, expected: error('22007') })
    }
    await runCheckParity(
      directory,
      'intervalinput',
      group,
      constraints.map((constraint) => constraint.name),
      fixtures,
    )
  }, 300_000)
})
