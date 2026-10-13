import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const input = (value: string | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

describe('temporal epoch and fractional input rounding', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-temporal-rounding-'))
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })

  it.each(['timestamp', 'timestamptz'])(
    'matches PostgreSQL binary %s values for long fractions, ties, carries, ranges, literals and states',
    async (type) => {
      const expressions = {
        parse: `raw::${type} IS NOT DISTINCT FROM anchor`,
        lazy: `CASE WHEN skip THEN true ELSE raw::${type} IS NOT DISTINCT FROM anchor END`,
        epoch: `anchor IS NOT DISTINCT FROM 'epoch'::${type}`,
        literal: `anchor IS NOT DISTINCT FROM '2000-01-01 00:00:00.1234567Z'::${type}`,
      }
      const tableName = 'input_rounding_' + type
      await pg.exec(`CREATE TABLE ${tableName} (raw text,anchor ${type},skip boolean,
      ${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK (${sql})`)
        .join(',')})`)
      const catalog = await snapshotCatalog(pg)
      const table = catalog.tables.find((table) => table.name === tableName)!
      const names: string[] = []
      const group = prepareCheckRustGroup(
        Object.entries(expressions).flatMap(([name, sql]) =>
          ['raw', 'stored'].map((form) => {
            const expression = lowerTableCheck(
              table,
              form === 'raw'
                ? { name, type: 'check', definition: `CHECK (${sql})` }
                : table.constraints.find((constraint) => constraint.name === name)!,
            )!.expression
            expect(hasUncertain(expression), `${name}_${form}`).toBe(false)
            names.push(`${name}_${form}`)
            return {
              expression,
              identity: {
                schema: 'public',
                kind: 'table' as const,
                owner: tableName,
                constraint: `${name}_${form}`,
              },
            }
          }),
        ),
      )
      group.checks.forEach((check) => expect(check.kind).toBe('supported'))
      const fixtures: { name: string; row: Row; expected: Outcome }[] = []
      const add = (name: string, row: Row, expected: Outcome) => {
        for (const form of ['raw', 'stored'])
          fixtures.push({ name: `${name}_${form}`, row, expected })
      }
      const error = (code: string): Input & Outcome => ({
        kind: 'Error',
        value: { state: parseInt(code, 36) },
      })
      const fractions = new Set([
        '0000000',
        '0000004',
        '0000005',
        '0000005000000000000001',
        '0000004999999999999999',
        '0000015',
        '0000025',
        '0000025000000000000001',
        '1234567',
        '1234565',
        '9999985',
        '9999994',
        '9999995',
        '9999999',
        '999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999',
      ])
      for (let microsecond = 0; microsecond < 250; microsecond++) {
        const prefix = String(microsecond).padStart(6, '0')
        for (const tail of [
          '4999999999999999',
          '5000000000000000',
          '5000000000000001',
          '9999999999999999',
        ])
          fractions.add(prefix + tail)
      }
      const suffix = type === 'timestamptz' ? '+00' : ''
      const samples = [...fractions].map((fraction) => `2000-01-01 00:00:00.${fraction}${suffix}`)
      for (const clock of ['23:59:59', '23:59:60', '24:00:00', '00:00:60'])
        for (const fraction of ['0000004', '0000005', '0000006', '9999995'])
          samples.push(`2000-01-01 ${clock}.${fraction}${suffix}`)
      for (const date of ['1999-12-31', '2000-02-29', '0001-12-31', '294276-12-31'])
        for (const offset of ['Z', '+01:00', '-01:00'])
          samples.push(`${date} 23:59:59.9999999${offset}`)
      samples.push('epoch', ' EPOCH ', 'epoch BC', 'epoch AD')
      for (const settings of [
        { zone: 'UTC', style: 'ISO, MDY' },
        { zone: 'America/Los_Angeles', style: 'ISO, DMY' },
        { zone: 'Asia/Tokyo', style: 'SQL, DMY' },
      ]) {
        await pg.query("SELECT set_config('TimeZone',$1,false),set_config('DateStyle',$2,false)", [
          settings.zone,
          settings.style,
        ])
        for (const raw of samples) {
          let expected: Outcome = { kind: 'True' }
          let anchor = 0n
          try {
            const send = type === 'timestamp' ? 'timestamp_send' : 'timestamptz_send'
            const binary = (
              await pg.query<{ value: string }>(
                `SELECT encode(${send}($1::${type}),'hex') AS value`,
                [raw],
              )
            ).rows[0]!.value
            anchor = Buffer.from(binary, 'hex').readBigInt64BE()
          } catch (exception) {
            const code = (exception as { code: string }).code
            expect(['22007', '22008', '22009']).toContain(code)
            expected = error(code)
          }
          const row: Row = { raw: input(raw), anchor: input(anchor), skip: input(false) }
          add('parse', row, expected)
          add('lazy', row, expected)
          if (expected.kind === 'True')
            add('parse', { ...row, anchor: input(anchor + 1n) }, { kind: 'False' })
          else add('lazy', { ...row, skip: input(true) }, { kind: 'True' })
        }
      }
      for (const [name, anchor] of [
        ['epoch', -946684800000000n],
        ['literal', 123457n],
      ] as const) {
        add(name, { anchor: input(anchor) }, { kind: 'True' })
        add(name, { anchor: input(anchor + 1n) }, { kind: 'False' })
      }
      for (const raw of [{ kind: 'Unknown' }, error('22012'), { kind: 'Null' }] as const) {
        const row = { raw, anchor: input(null), skip: input(false) }
        add('parse', row, raw.kind === 'Null' ? { kind: 'True' } : raw)
        add('lazy', { ...row, skip: input(true) }, { kind: 'True' })
      }
      for (const raw of [
        'epochbc',
        'epochad',
        '+epoch',
        'epoch Z',
        'now',
        '2000-01-01 00:00:00 America/New_York',
      ])
        add(
          'parse',
          { raw: input(raw), anchor: input(null), skip: input(false) },
          { kind: 'Unknown' },
        )
      for (const fixture of fixtures)
        for (const name of ['raw', 'anchor', 'skip']) fixture.row[name] ??= { kind: 'Unknown' }
      const target = join(directory, type)
      await mkdir(target)
      await runCheckParity(target, 'temporalrounding' + type, group, names, fixtures)
    },
  )
})
