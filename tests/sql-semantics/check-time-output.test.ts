import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
const value = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (code: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})

describe('time and timetz text output', () => {
  let pg: PGlite, directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-clock-output-'))
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('preserves exact fractional seconds, numeric offsets, character casts and lazy errors across DateStyle settings', async () => {
    const expressions: Record<string, string> = {}
    for (const family of ['time', 'timetz'])
      Object.assign(expressions, {
        [family]: `${family}_value::text = expected`,
        [family + '_varchar']: `${family}_value::varchar = expected`,
        [family + '_short']: `${family}_value::varchar(8) = short_expected`,
        [family + '_char']: `${family}_value::char(50)::text = expected`,
        [family + '_lazy']: `CASE WHEN skip THEN true ELSE ${family}_value::text = expected END`,
      })
    await pg.exec(`CREATE DOMAIN clock_domain AS time;
      CREATE TABLE clock_output_checks(time_value clock_domain,timetz_value timetz,expected text,short_expected text,skip bool,
      ${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK (${sql})`)
        .join(',')})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((table) => table.name === 'clock_output_checks')!
    const constraints = Object.entries(expressions).flatMap(([name, sql]) => {
      const stored = table.constraints.find((constraint) => constraint.name === name)!
      return [
        { ...stored, name: name + '_raw', definition: `CHECK (${sql})` },
        { ...stored, name: name + '_stored' },
      ]
    })
    const group = prepareCheckRustGroup(
      constraints.map((constraint) => ({
        expression: lowerTableCheck(table, constraint, [], catalog.domains)!.expression,
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
    const samples = [
      '00:00',
      '24:00',
      '12:34:56.000001',
      '12:34:56.000010',
      '12:34:56.000100',
      '12:34:56.001000',
      '12:34:56.010000',
      '12:34:56.100000',
      '12:34:56.123456',
      '23:59:59.999999',
    ]
    let seed = 0xc3649231
    for (let index = 0; index < 32; index++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      samples.push(
        `${seed % 24}:${(seed >>> 8) % 60}:${(seed >>> 16) % 60}.${String(seed % 1000000).padStart(6, '0')}`,
      )
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + suffix, row, expected })
    }
    for (const style of [
      'ISO, MDY',
      'ISO, DMY',
      'SQL, MDY',
      'SQL, DMY',
      'German, DMY',
      'Postgres, MDY',
      'Postgres, DMY',
    ]) {
      await pg.exec(`SET DateStyle='${style}'`)
      for (const family of ['time', 'timetz'])
        for (const text of [...samples, null])
          for (const zone of family === 'time'
            ? ['']
            : ['+00', '-00', '+00:01', '-00:00:01', '+02', '-05:30', '+15:59:59', '-15:59:59']) {
            const sample = text === null ? null : text + zone
            const result = (
              await pg.query<{
                wire: string | null
                expected: string | null
                short_expected: string | null
              }>(
                `SELECT encode(${family}_send($1::${family}),'hex') wire,($1::${family})::text expected,($1::${family})::varchar(8) short_expected`,
                [sample],
              )
            ).rows[0]!
            const bytes = result.wire === null ? null : Buffer.from(result.wire, 'hex')
            const input =
              bytes === null
                ? value(null)
                : value(
                    family === 'time'
                      ? bytes.readBigInt64BE()
                      : { time: bytes.readBigInt64BE(), zone: bytes.readInt32BE(8) },
                  )
            const row: Row = {
              [family + '_value']: input,
              expected: value(result.expected),
              short_expected: value(result.short_expected),
              skip: value(false),
            }
            for (const suffix of ['', '_varchar', '_short', '_char', '_lazy'])
              add(family + suffix, row, { kind: text === null ? 'Null' : 'True' })
            add(family + '_lazy', { ...row, skip: value(true) }, { kind: 'True' })
          }
    }
    for (const family of ['time', 'timetz'])
      for (const state of [{ kind: 'Unknown' }, { kind: 'Null' }, error('22012')] as Input[]) {
        const row: Row = {
          [family + '_value']: state,
          expected: value(''),
          short_expected: value(''),
          skip: value(false),
        }
        for (const suffix of ['', '_varchar', '_short', '_char', '_lazy'])
          add(family + suffix, row, state as Outcome)
        add(family + '_lazy', { ...row, skip: value(true) }, { kind: 'True' })
      }
    await runCheckParity(
      directory,
      'clockoutput',
      group,
      constraints.map((constraint) => constraint.name),
      fixtures,
    )
  }, 300_000)
})
