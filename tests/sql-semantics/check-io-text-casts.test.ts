import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import type { CatalogSnapshot, TableInfo } from '../../src/catalog/types.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { builtinMetadata, builtinTypeIO } from '../../src/postgres/builtins/inventory.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const labels = ['', 'pending', 'ready for review', 'é', 'a,b', 'quote\'"\\', '😀', 'trailing ']
const quote = (value: string) => "'" + value.replaceAll("'", "''") + "'"
const expressions: Record<string, string> = {
  small_text: 'small::text IS NOT DISTINCT FROM note',
  amount_text: 'amount::text IS NOT DISTINCT FROM note',
  large_text: 'large::text IS NOT DISTINCT FROM note',
  domain_text: 'domain_amount::text IS NOT DISTINCT FROM note',
  stage_text: 'stage::text IS NOT DISTINCT FROM note',
  domain_stage_text: 'domain_stage::text IS NOT DISTINCT FROM note',
  cast_alias: 'CAST(amount AS text) IS NOT DISTINCT FROM note',
  unbounded_varchar: 'amount::varchar::text IS NOT DISTINCT FROM note',
  bounded_varchar: 'amount::varchar(3)::text IS NOT DISTINCT FROM note',
  enum_varchar: 'stage::varchar(4)::text IS NOT DISTINCT FROM note',
  enum_char: 'stage::char(8)::text IS NOT DISTINCT FROM note',
  integer_char: 'small::char(8)::text IS NOT DISTINCT FROM note',
  literal: '42::text IS NOT DISTINCT FROM note',
  big_literal: '9223372036854775807::text IS NOT DISTINCT FROM note',
  enum_literal: "'ready for review'::io_stage::text IS NOT DISTINCT FROM note",
  selection: '(CASE WHEN flag THEN stage ELSE domain_stage END)::text IS NOT DISTINCT FROM note',
  coalesce: "COALESCE(stage,'pending'::io_stage)::text IS NOT DISTINCT FROM note",
  nullif: "NULLIF(stage,'pending'::io_stage)::text IS NOT DISTINCT FROM note",
  greatest: "GREATEST(stage,'pending'::io_stage)::text IS NOT DISTINCT FROM note",
  text_nullif: 'NULLIF(amount::text,divisor::text) IS NULL',
  reused: 'amount::text = note AND amount::text = note',
  ordering: 'ROW(amount::text,small) < ROW(note,divisor)',
  division: '(amount / divisor)::text IS NOT DISTINCT FROM note',
  lazy: 'CASE WHEN flag THEN true ELSE (amount / divisor)::text = note END',
  null_strict: 'NULL::integer::text = (amount / divisor)::text',
  constant_error: 'CASE WHEN flag THEN true ELSE (1 / 0)::text = note END',
  skipped_constant: 'CASE WHEN false THEN (1 / 0)::text = note ELSE true END',
  skipped_coalesce: "COALESCE('known'::text,(1 / 0)::text) = note",
}
const input = (value: string | number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (code: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})

describe('catalog I/O text casts in CHECKs', () => {
  let pg: PGlite
  let directory: string
  let catalog: CatalogSnapshot
  let table: TableInfo
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-io-text-'))
    await pg.exec(`CREATE TYPE io_stage AS ENUM (${labels.map(quote).join(',')});
      CREATE DOMAIN io_amount AS integer; CREATE DOMAIN io_stage_domain AS io_stage;
      CREATE TABLE io_text_checks (
        small smallint,amount integer,large bigint,domain_amount io_amount,
        stage io_stage,domain_stage io_stage_domain,note text COLLATE "C",divisor integer,flag boolean,
        ${Object.entries(expressions)
          .map(([name, sql]) => `CONSTRAINT ${name} CHECK (${sql})`)
          .join(',')})`)
    catalog = await snapshotCatalog(pg)
    table = catalog.tables.find((item) => item.name === 'io_text_checks')!
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  const lower = (sql: string, enums = catalog.enums) =>
    lowerTableCheck(
      table,
      { name: 'probe', type: 'check', definition: `CHECK (${sql})` },
      enums,
      catalog.domains,
    )!.expression

  it('retains actual I/O identities and requires concrete enum output metadata', () => {
    for (const [name, type] of [
      ['small', 'pg_catalog.int2'],
      ['amount', 'pg_catalog.int4'],
      ['large', 'pg_catalog.int8'],
    ] as const) {
      const expression = lower(`${name}::text IS NOT DISTINCT FROM note`)
      if (expression.kind !== 'eval-scalar' || expression.expression.kind !== 'distinct')
        throw new Error('Expected I/O text cast')
      let value = expression.expression.operands[0]
      while (
        value.kind === 'call' &&
        value.call.kind === 'cast' &&
        value.call.signature === null &&
        value.operands.length === 1
      )
        value = value.operands[0]!
      if (value.kind !== 'io-to-text') throw new Error('Expected catalog output identity')
      expect(value.output).toBe(builtinTypeIO(type)?.output)
      expect(builtinMetadata(value.output).result).toBe('pg_catalog.cstring')
    }
    expect(catalog.enums.find((item) => item.name === 'io_stage')?.outputFunction).toBe(
      'function:["pg_catalog","enum_out"](pg_catalog.anyenum)',
    )
    expect(
      hasUncertain(
        lower(
          'stage::text IS NOT DISTINCT FROM note',
          catalog.enums.map(({ outputFunction: _output, ...definition }) => definition),
        ),
      ),
    ).toBe(true)
  })

  it('matches PostgreSQL raw/stored formatting, widths, domains, errors, planning and partial inputs in every target', async () => {
    const names = Object.keys(expressions)
    const entries = names.flatMap((name) =>
      ['raw', 'stored'].map((form) => ({
        name: `${form}_${name}`,
        expression:
          form === 'raw'
            ? lower(expressions[name]!)
            : lowerTableCheck(
                table,
                table.constraints.find((constraint) => constraint.name === name)!,
                catalog.enums,
                catalog.domains,
              )!.expression,
      })),
    )
    const group = prepareCheckRustGroup(
      entries.map(({ name, expression }) => {
        expect(hasUncertain(expression), name).toBe(false)
        return {
          expression,
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: name,
          },
        }
      }),
    )
    group.checks.forEach((check, index) =>
      expect(check.kind, entries[index]!.name).toBe('supported'),
    )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const form of ['raw', 'stored'])
        fixtures.push({ name: `${form}_${name}`, row, expected })
    }
    const oracle = async (name: string, row: Row, args: unknown[]) => {
      let expected: Outcome
      try {
        const value = (
          await pg.query<{ value: boolean | null }>(
            `WITH candidate AS MATERIALIZED (
          SELECT $1::smallint small,$2::integer amount,$3::bigint large,$4::io_amount domain_amount,
          $5::io_stage stage,$6::io_stage_domain domain_stage,$7::text COLLATE "C" note,$8::integer divisor,$9::boolean flag)
          SELECT (${expressions[name]}) AS value FROM candidate`,
            args,
          )
        ).rows[0]!.value
        expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
      } catch (exception) {
        const code = (exception as { code: string }).code
        expect(['22003', '22012']).toContain(code)
        expected = error(code)
      }
      add(name, row, expected)
    }
    for (const amount of [null, -32768, -1, 0, 1, 32767])
      for (const label of [null, ...labels])
        for (const note of [null, amount === null ? null : String(amount), label, 'different']) {
          const ordinal = label === null ? null : labels.indexOf(label)
          const row: Row = {
            small: input(amount),
            amount: input(amount),
            large: input(amount === null ? null : BigInt(amount)),
            domain_amount: input(amount),
            stage: input(ordinal),
            domain_stage: input(ordinal),
            note: input(note),
            divisor: input(1),
            flag: input(false),
          }
          const args = [
            amount,
            amount,
            amount === null ? null : String(amount),
            amount,
            label,
            label,
            note,
            1,
            false,
          ]
          for (const name of names) await oracle(name, row, args)
        }
    for (const large of [-9223372036854775808n, 9223372036854775807n])
      await oracle('large_text', { large: input(large), note: input(String(large)) }, [
        0,
        0,
        String(large),
        0,
        null,
        null,
        String(large),
        1,
        false,
      ])
    for (const [amount, divisor, flag] of [
      [1, 0, false],
      [1, 0, true],
      [-2147483648, -1, false],
      [2147483647, 1, false],
    ] as const) {
      const row: Row = {
        amount: input(amount),
        divisor: input(divisor),
        flag: input(flag),
        note: input('known'),
      }
      for (const name of [
        'division',
        'lazy',
        'null_strict',
        'constant_error',
        'skipped_constant',
        'skipped_coalesce',
      ])
        await oracle(name, row, [0, amount, 0, 0, null, null, 'known', divisor, flag])
    }
    for (const name of [
      'small_text',
      'amount_text',
      'large_text',
      'domain_text',
      'stage_text',
      'domain_stage_text',
    ]) {
      const column = {
        small_text: 'small',
        amount_text: 'amount',
        large_text: 'large',
        domain_text: 'domain_amount',
        stage_text: 'stage',
        domain_stage_text: 'domain_stage',
      }[name]!
      add(name, { [column]: { kind: 'Unknown' }, note: input(null) }, { kind: 'Unknown' })
      add(name, { [column]: input(null), note: input(null) }, { kind: 'True' })
      add(name, { [column]: error('22012'), note: input(null) }, error('22012'))
    }
    add('stage_text', { stage: input(100), note: input('pending') }, { kind: 'Unknown' })
    add('lazy', { flag: input(true), amount: error('22012'), divisor: input(0) }, { kind: 'True' })
    await runCheckParity(
      directory,
      'io_text',
      group,
      entries.map((entry) => entry.name),
      fixtures.map((fixture) => ({
        ...fixture,
        row: {
          ...Object.fromEntries(
            table.columns.map((column) => [column.name, { kind: 'Unknown' } as const]),
          ),
          ...fixture.row,
        },
      })),
    )
  }, 240000)
})
