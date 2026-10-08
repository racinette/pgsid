import { describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const expressions = {
  same: 'pg_catalog.in_range(value_num,base_num,offset_num,subtract,less) = recorded',
  skipped:
    'CASE WHEN skip THEN true ELSE pg_catalog.in_range(value_num,base_num,offset_num,subtract,less) = recorded END',
}
const input = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (code: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})
const defaults = (): Row => ({
  value_num: input('1'),
  base_num: input('1'),
  offset_num: input('1'),
  subtract: input(false),
  less: input(true),
  recorded: input(true),
  skip: input(false),
})
const values = ['NaN', '-Infinity', 'Infinity', '-10', '-0.0000', '0', '0.01', '1', '5', '10', null]
const offsets = ['NaN', '-Infinity', 'Infinity', '-1', '0', '0.01', '1', '10', null]

describe('numeric range comparisons', () => {
  it('matches PostgreSQL NaN and infinity ordering, offset validation, finite comparisons beyond the storage range, strict inputs and lazy branches in every target', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-numeric-range-'))
    let pg = await PGlite.create()
    try {
      expect(
        builtinCallables().find(
          (fn) => fn.kind === 'function' && fn.rustName === 'sql__pg_catalog__in_range__fhht',
        ),
      ).toMatchObject({
        name: 'in_range',
        args: [
          'pg_catalog."numeric"',
          'pg_catalog."numeric"',
          'pg_catalog."numeric"',
          'pg_catalog.bool',
          'pg_catalog.bool',
        ],
        result: 'pg_catalog.bool',
        strict: true,
        volatility: 'i',
      })
      await pg.exec(`CREATE TABLE numeric_range_checks (value_num numeric,base_num numeric,offset_num numeric,subtract boolean,less boolean,recorded boolean,skip boolean,
        ${Object.entries(expressions)
          .map(([name, sql]) => `CONSTRAINT ${name} CHECK (${sql})`)
          .join(',')})`)
      const catalog = await snapshotCatalog(pg)
      const table = catalog.tables.find((table) => table.name === 'numeric_range_checks')!
      const prepared = Object.entries(expressions).flatMap(([name, sql]) =>
        ['raw', 'stored'].map((form) => {
          const plan = lowerTableCheck(
            table,
            form === 'raw'
              ? { name, type: 'check', definition: `CHECK (${sql})` }
              : table.constraints.find((item) => item.name === name)!,
            [],
            catalog.domains,
          )!
          expect(plan.expression.kind).not.toBe('uncertain')
          return {
            expression: plan.expression,
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: table.name,
              constraint: name + '_' + form,
            },
          }
        }),
      )
      const group = prepareCheckRustGroup(prepared)
      expect(group.checks.every((check) => check.kind === 'supported')).toBe(true)
      const fixtures: { name: string; row: Row; expected: Outcome }[] = []
      const record = (
        row: Row,
        expected: Outcome,
        names: readonly string[] = Object.keys(expressions),
      ) => {
        for (const name of names)
          for (const form of ['raw', 'stored'])
            fixtures.push({ name: name + '_' + form, row: { ...row }, expected })
      }
      let count = 0
      const execute = async (
        value: string | null,
        base: string | null,
        offset: string | null,
        subtract: boolean | null,
        less: boolean | null,
      ) => {
        if (count > 0 && count % 500 === 0) {
          await pg.close()
          pg = await PGlite.create()
        }
        count++
        const row: Row = {
          value_num: input(value),
          base_num: input(base),
          offset_num: input(offset),
          subtract: input(subtract),
          less: input(less),
          recorded: input(true),
          skip: input(false),
        }
        let result: boolean | null
        try {
          result = (
            await pg.query<{ value: boolean | null }>(
              'SELECT pg_catalog.in_range($1::numeric,$2::numeric,$3::numeric,$4::boolean,$5::boolean) value',
              [value, base, offset, subtract, less],
            )
          ).rows[0]!.value
        } catch (failure) {
          expect((failure as { code: string }).code).toBe('22013')
          record(row, error('22013'))
          return
        }
        row.recorded = input(result)
        record(row, { kind: result === null ? 'Null' : 'True' })
        if (result !== null) record({ ...row, recorded: input(!result) }, { kind: 'False' })
      }
      for (const value of values)
        for (const base of values)
          for (const offset of offsets)
            for (const subtract of [false, true])
              for (const less of [false, true]) await execute(value, base, offset, subtract, less)
      for (const value of ['0', 'NaN', '-Infinity', 'Infinity'])
        for (const [base, offset] of [
          ['9e131071', '1e131071'],
          ['-9e131071', '1e131071'],
        ])
          for (const subtract of [false, true])
            for (const less of [false, true]) {
              if ((base!.startsWith('-') && !subtract) || (!base!.startsWith('-') && subtract))
                continue
              await execute(value, base!, offset!, subtract, less)
            }
      await execute('1', '1', '-1', null, true)
      await execute('1', '1', 'NaN', false, null)
      const names = ['value_num', 'base_num', 'offset_num', 'subtract', 'less']
      for (const [index, name] of names.entries()) {
        for (const state of [input(null), { kind: 'Unknown' }, error('22003')] as Input[])
          record({ ...defaults(), [name]: state }, state as Outcome)
        if (index > 0) {
          record(
            { ...defaults(), [names[0]!]: { kind: 'Unknown' }, [name]: error('22012') },
            error('22012'),
          )
          record(
            { ...defaults(), [names[0]!]: error('22003'), [name]: error('22012') },
            error('22003'),
          )
        }
      }
      record(
        { ...defaults(), skip: input(true), offset_num: input('-1'), recorded: error('22012') },
        { kind: 'True' },
        ['skipped'],
      )
      record(
        {
          ...defaults(),
          skip: input(true),
          value_num: error('22003'),
          offset_num: { kind: 'Unknown' },
          recorded: error('22012'),
        },
        { kind: 'True' },
        ['skipped'],
      )
      await runCheckParity(
        directory,
        'pgsid-numeric-range',
        group,
        prepared.map((item) => item.identity.constraint),
        fixtures,
      )
    } finally {
      await pg.close()
      await rm(directory, { recursive: true, force: true })
    }
  }, 900000)
})
