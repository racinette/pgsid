import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
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

const known = (value: Extract<Input, { kind: 'Value' }>['value']): Input => ({
  kind: 'Value',
  value,
})

it('keeps NaN semantics and explicit row bits while deferring platform-generated input, literal and geometry NaN binary precision', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-platform-nan-'))
  try {
    const expressions: Record<string, string> = {
      parsed4_semantic: "source::float4='NaN'::float4",
      parsed8_semantic: "source::float8='NaN'::float8",
      literal4_semantic: "'NaN'::float4='NaN'::float4",
      literal8_semantic: "'NaN'::float8='NaN'::float8",
      parsed4_wire: 'float4send(source::float4)=wire4',
      parsed8_wire: 'float8send(source::float8)=wire8',
      literal4_wire: "float4send('NaN'::float4)=wire4",
      literal8_wire: "float8send('NaN'::float8)=wire8",
      hypot_semantic: "point_distance(origin,'(0,0)'::point)='NaN'::float8",
      hypot_wire: "float8send(point_distance(origin,'(0,0)'::point))=wire8",
      arithmetic4_semantic: "stored4+0::float4='NaN'::float4",
      arithmetic8_semantic: "stored8+0::float8='NaN'::float8",
      widened_semantic: "stored4::float8='NaN'::float8",
      narrowed_semantic: "stored8::float4='NaN'::float4",
      sqrt_semantic: "sqrt(stored8)='NaN'::float8",
      arithmetic4_wire: 'float4send(stored4+0::float4)=wire4',
      arithmetic8_wire: 'float8send(stored8+0::float8)=wire8',
      widened_wire: 'float8send(stored4::float8)=wire8',
      narrowed_wire: 'float4send(stored8::float4)=wire4',
      sqrt_wire: 'float8send(sqrt(stored8))=wire8',
      absolute_wire: 'float8send(abs(stored8))=wire8',
      double_negative_wire: 'float8send(-(-stored8))=wire8',
      row4_wire: 'float4send(stored4)=wire4',
      row8_wire: 'float8send(stored8)=wire8',
      binary_present: 'float8send(source::float8) IS NOT NULL',
      infinite_line_semantic:
        "line_eq('{Infinity,-Infinity,0}'::line,'{Infinity,-Infinity,0}'::line) IS FALSE",
      binary_null_compare: '(float8send(source::float8)=NULL::bytea) IS NULL',
      binary_length: 'octet_length(float8send(source::float8))=8',
      binary_bit_length: 'bit_length(float8send(source::float8))=64',
      binary_different_length: "float8send(source::float8)<>decode('00','hex')",
      binary_index_error: 'get_byte(float8send(source::float8),8)=0',
      binary_reverse_length: 'length(reverse(float8send(source::float8)))=8',
      binary_concat_length: "length(float8send(source::float8)||decode('00','hex'))=9",
      binary_empty_concat_present: "(decode('','hex')||float8send(source::float8)) IS NOT NULL",
      selected_row_wire: "float8send(GREATEST(stored8,'NaN'::float8))=wire8",
    }
    await pg.exec(
      `CREATE TABLE platform_nan(source text,stored4 float4,stored8 float8,origin point,wire4 bytea,wire8 bytea,${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'platform_nan')!
    const constraints = Object.entries(expressions).flatMap(([name, sql]) => {
      const constraint = table.constraints.find((c) => c.name === name)!
      return [
        { ...constraint, name: name + '_raw', definition: `CHECK(${sql})` },
        { ...constraint, name: name + '_stored' },
      ]
    })
    const group = prepareCheckRustGroup(
      constraints.map((constraint) => ({
        expression: lowerTableCheck(table, constraint, [], catalog.domains)!.expression,
        identity: {
          schema: 'public',
          kind: 'table',
          owner: table.name,
          constraint: constraint.name,
        },
      })),
    )
    for (const check of group.checks)
      expect(check.kind, check.kind === 'unsupported' ? check.reason : '').toBe('supported')
    const current = (
      await pg.query<{ wire4: string; wire8: string }>(
        "SELECT encode(float4send('NaN'::float4),'hex') wire4,encode(float8send('NaN'::float8),'hex') wire8",
      )
    ).rows[0]!
    expect(current).toEqual({ wire4: '7fc00000', wire8: '7ff8000000000000' })
    await expect(
      pg.query(
        `SELECT ${expressions.binary_null_compare} AS value FROM (VALUES ($1::text)) input(source)`,
        ['bad'],
      ),
    ).rejects.toMatchObject({ code: '22P02' })
    await pg.exec(
      "CREATE TEMP TABLE nan_null_sources(source text); INSERT INTO nan_null_sources VALUES ('NaN'),('bad')",
    )
    for (const source of ['NaN', 'bad'])
      expect(
        (
          await pg.query<{ value: boolean }>(
            `SELECT ${expressions.binary_null_compare} AS value FROM nan_null_sources WHERE source=$1`,
            [source],
          )
        ).rows[0]!.value,
      ).toBe(true)
    await expect(
      pg.query('SELECT get_byte(float8send($1::float8),8)', ['NaN']),
    ).rejects.toMatchObject({ code: '2202E' })
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const [wire4, wire8] of [
      [current.wire4, current.wire8],
      ['7fffffff', '7fffffffffffffff'],
    ] as const) {
      const row: Row = {
        source: known('NaN'),
        stored4: known(Number(BigInt('0x' + wire4))),
        stored8: known(BigInt('0x' + wire8)),
        origin: known({ x: BigInt('0x' + wire8), y: 0n }),
        wire4: known(wire4),
        wire8: known(wire8),
      }
      for (const constraint of constraints) {
        const name = constraint.name.replace(/_(?:raw|stored)$/u, '')
        const expected: Outcome =
          name === 'binary_index_error'
            ? {
                kind: 'Error',
                value: { state: parseInt('2202E', 36) },
              }
            : {
                kind: [
                  'parsed4_wire',
                  'parsed8_wire',
                  'literal4_wire',
                  'literal8_wire',
                  'hypot_wire',
                  'arithmetic4_wire',
                  'arithmetic8_wire',
                  'widened_wire',
                  'narrowed_wire',
                  'sqrt_wire',
                ].includes(name)
                  ? 'Unknown'
                  : 'True',
              }
        fixtures.push({ name: constraint.name, row, expected })
      }
    }
    for (const name of ['binary_present', 'binary_null_compare'])
      for (const suffix of ['raw', 'stored']) {
        fixtures.push({
          name: name + '_' + suffix,
          row: { source: { kind: 'Unknown' } },
          expected: { kind: name === 'binary_null_compare' ? 'True' : 'Unknown' },
        })
        fixtures.push({
          name: name + '_' + suffix,
          row: { source: { kind: 'Error', value: { state: parseInt('22012', 36) } } },
          expected:
            name === 'binary_null_compare'
              ? { kind: 'True' }
              : { kind: 'Error', value: { state: parseInt('22012', 36) } },
        })
      }
    await mkdir(join(root, 'parity'))
    await runCheckParity(
      join(root, 'parity'),
      'platformnan',
      group,
      constraints.map((c) => c.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 360_000)
