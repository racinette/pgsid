import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  assembleCheckRust,
  type prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const known = (value: string | number | bigint | boolean): Input => ({ kind: 'Value', value })
const bitsOf = (value: number, single: boolean): bigint => {
  const buffer = Buffer.alloc(single ? 4 : 8)
  if (single) {
    buffer.writeFloatBE(value)
    return BigInt(buffer.readUInt32BE())
  }
  buffer.writeDoubleBE(value)
  return buffer.readBigUInt64BE()
}
const factory = (single: boolean) =>
  `WITH raw AS(SELECT (r->>'id')::int id,(r->>'kind')::int kind,(r->>'negative')::bool negative,(r->>'coefficient')::float8 c,(r->>'power')::float8 p,r->>'expected' expected FROM jsonb_array_elements($1::jsonb) r), positive AS(SELECT *,CASE WHEN kind=3 THEN 'NaN'::float8 WHEN kind=2 THEN 'Infinity'::float8 WHEN kind=1 THEN 0::float8 ELSE c*power(2::float8,p) END number FROM raw), signed AS(SELECT *,CASE WHEN kind=1 AND negative THEN '-0'::float8 WHEN negative THEN -number ELSE number END value FROM positive) SELECT id,value::${single ? 'real' : 'float8'} n,expected FROM signed`

it('formats exact float carriers with PostgreSQL shortest/precision modes and explicit context in every target', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-float-output-'))
  const packet = 'artifacts/goal-checks/float-output-active',
    quick = process.env['PGSID_FLOAT_OUTPUT_QUICK'] === '1'
  try {
    const names = ['single', 'double', 'semantic_single_nan', 'semantic_double_nan']
    const entries = names.map((constraint) =>
      checkRustEntryName({ schema: 'public', kind: 'table', owner: 'float_output', constraint }),
    )
    const evaluatorSource = entries
      .map((entry, index) =>
        index < 2
          ? `pub fn ${entry}(input: ${index === 0 ? 'Float4Value' : 'Float8Value'}, extra: Int4Value, known: BoolValue, expected: TextValue) -> CheckOutcome {let result=float_output_probe${index === 0 ? '4' : '8'}(input,extra,known,expected);check_from_bool(result)}`
          : `pub fn ${entry}(expected: TextValue) -> CheckOutcome {let result=float_output_semantic_probe(expected,${index === 2});check_from_bool(result)}`,
      )
      .join('\n')
    const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.find((f) => f.path.endsWith('/float_output.rs'))!.source += `
pub fn float_output_probe4(input: Float4Value, extra: Int4Value, known: BoolValue, expected: TextValue) -> BoolValue {
 if let Int4Value::Value(precision)=extra {if let BoolValue::Value(available)=known {let text=float4_output_context(input,precision,available);return sql__pg_catalog__texteq__aet8(text,expected);};};BoolValue::Unknown
}
pub fn float_output_probe8(input: Float8Value, extra: Int4Value, known: BoolValue, expected: TextValue) -> BoolValue {
 if let Int4Value::Value(precision)=extra {if let BoolValue::Value(available)=known {let text=float8_output_context(input,precision,available);return sql__pg_catalog__texteq__aet8(text,expected);};};BoolValue::Unknown
}
pub fn float_output_semantic_probe(expected: TextValue, single: bool) -> BoolValue {
 let mut text=TextValue::Unknown;
 if single {text=float4_output_context(Float4Value::UnspecifiedNan,0,false);}else{text=float8_output_context(Float8Value::UnspecifiedNan,0,false);};
 sql__pg_catalog__texteq__aet8(text,expected)
}
`
    const checks = entries.map((entryName, index) => ({
      kind: 'supported' as const,
      entryName,
      inputs:
        index < 2
          ? [
              {
                name: 'input',
                rustName: 'input',
                type: index === 0 ? 'pg_catalog.float4' : 'pg_catalog.float8',
                rustType: index === 0 ? 'Float4Value' : 'Float8Value',
              },
              { name: 'extra', rustName: 'extra', type: 'pg_catalog.int4', rustType: 'Int4Value' },
              { name: 'known', rustName: 'known', type: 'pg_catalog.bool', rustType: 'BoolValue' },
              {
                name: 'expected',
                rustName: 'expected',
                type: 'pg_catalog.text',
                rustType: 'TextValue',
              },
            ]
          : [
              {
                name: 'expected',
                rustName: 'expected',
                type: 'pg_catalog.text',
                rustType: 'TextValue',
              },
            ],
    }))
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      checks,
      evaluatorSource,
      source,
      requiresRegex: false,
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    let inserts = 0,
      invariant = 0,
      dependent = 0
    for (const single of [true, false]) {
      const width = single ? 32 : 64,
        mantissaBits = single ? 23n : 52n,
        unit = 1n << mantissaBits,
        sign = 1n << BigInt(width - 1),
        maximum = single ? 255n : 2047n
      const words = new Set<bigint>()
      for (const number of [
        0,
        -0,
        1,
        -1,
        0.1,
        -0.1,
        1 / 3,
        1.25,
        1.35,
        2.5,
        3.5,
        9.95,
        9.99,
        99.5,
        999.5,
        Math.PI,
        Math.E,
        1e-5,
        1e-4,
        1e6,
        1e15,
        1e23,
        1e-300,
        1e300,
      ])
        words.add(bitsOf(number, single))
      for (const word of [
        1n,
        2n,
        3n,
        unit - 1n,
        unit,
        unit + 1n,
        (maximum - 1n) * unit + unit - 1n,
        maximum * unit,
        maximum * unit + 1n,
        maximum * unit + unit / 2n,
      ]) {
        words.add(word)
        words.add(word + sign)
      }
      if (!quick) {
        for (const exponent of single
          ? [0, 1, 2, 21, 22, 23, 63, 100, 126, 127, 128, 150, 200, 253, 254]
          : [0, 1, 2, 52, 53, 100, 500, 900, 1022, 1023, 1024, 1500, 1800, 2045, 2046])
          for (const mantissa of [0n, 1n, unit - 2n, unit - 1n]) {
            const word = BigInt(exponent) * unit + mantissa
            words.add(word)
            words.add(word + sign)
          }
        let seed = 0x8b8b8b8b12345678n
        for (let index = 0; index < 48; index++) {
          seed = BigInt.asUintN(64, seed * 6364136223846793005n + 1442695040888963407n)
          words.add(BigInt.asUintN(width, seed))
        }
      }
      const carriers = [...words],
        data = carriers.map((bits, id) => {
          const negative = (bits & sign) !== 0n,
            magnitude = bits & (sign - 1n),
            exponent = magnitude / unit,
            mantissa = magnitude % unit
          return {
            id,
            bits: bits.toString(16).padStart(width / 4, '0'),
            negative,
            kind: exponent === maximum ? (mantissa === 0n ? 2 : 3) : magnitude === 0n ? 1 : 0,
            coefficient: (exponent === 0n ? mantissa : mantissa + unit).toString(),
            power:
              exponent === 0n
                ? single
                  ? -149
                  : -1074
                : Number(exponent) - (single ? 127 : 1023) - (single ? 23 : 52),
          }
        })
      const table = single ? 'float_output4' : 'float_output8',
        type = single ? 'real' : 'float8',
        send = single ? 'float4send' : 'float8send',
        format = single ? 'single' : 'double'
      await pg.exec(`CREATE TEMP TABLE ${table}(v ${type},expected text,CHECK(v::text=expected))`)
      const observed = new Map<number, Set<string>>()
      for (let extra = -15; extra <= 3; extra++) {
        await pg.exec('SET extra_float_digits=' + extra)
        const rows = (
          await pg.query<{ id: number; wire: string; text: string }>(
            `SELECT id,encode(${send}(n),'hex')wire,n::text text FROM (${factory(single)}) f ORDER BY id`,
            [JSON.stringify(data)],
          )
        ).rows
        expect(rows).toHaveLength(data.length)
        const supplied = data.map((row, index) => ({ ...row, expected: rows[index]!.text }))
        await pg.query(`INSERT INTO ${table} SELECT n,expected FROM (${factory(single)})f`, [
          JSON.stringify(supplied),
        ])
        inserts += data.length
        for (const row of rows) {
          const input = data[row.id]!
          if (input.kind !== 3) expect(row.wire, input.bits + ' native carrier').toBe(input.bits)
          const all = observed.get(row.id) ?? new Set<string>()
          all.add(row.text)
          observed.set(row.id, all)
          const carrier = single
            ? Number(BigInt.asIntN(32, carriers[row.id]!))
            : BigInt.asIntN(64, carriers[row.id]!)
          const fixture: Row = {
            input: known(carrier),
            extra: known(extra),
            known: known(true),
            expected: known(row.text),
          }
          fixtures.push({ name: format, row: fixture, expected: { kind: 'True' } })
          if (row.id < 3 || row.id === rows.length - 1) {
            const wrong = supplied[row.id]!
            await expect(
              pg.query(
                `INSERT INTO ${table} SELECT n,expected||'wrong' FROM (${factory(single)})f`,
                [JSON.stringify([wrong])],
              ),
            ).rejects.toMatchObject({ code: '23514' })
            inserts++
            fixtures.push({
              name: format,
              row: { ...fixture, expected: known(row.text + 'wrong') },
              expected: { kind: 'False' },
            })
          }
          reference.push({ single, bits: input.bits, extra, text: row.text })
        }
      }
      for (const [id, all] of observed) {
        const available = all.size === 1
        if (available) invariant++
        else dependent++
        const carrier = single
          ? Number(BigInt.asIntN(32, carriers[id]!))
          : BigInt.asIntN(64, carriers[id]!)
        fixtures.push({
          name: format,
          row: {
            input: known(carrier),
            extra: known(0),
            known: known(false),
            expected: known([...all][0]!),
          },
          expected: { kind: available ? 'True' : 'Unknown' },
        })
      }
      for (const available of [true, false])
        for (const input of [
          { kind: 'Null' },
          { kind: 'Unknown' },
          { kind: 'Error', value: { state: parseInt('22003', 36) } },
        ] as Input[]) {
          fixtures.push({
            name: format,
            row: { input, extra: known(0), known: known(available), expected: known('') },
            expected:
              input.kind === 'Error' ? input : { kind: input.kind === 'Null' ? 'Null' : 'Unknown' },
          })
        }
      const nan = (
        await pg.query<{ value: string }>(
          `SELECT ('Infinity'::${type}-'Infinity'::${type})::text value`,
        )
      ).rows[0]!.value
      fixtures.push({
        name: single ? 'semantic_single_nan' : 'semantic_double_nan',
        row: { expected: known(nan) },
        expected: { kind: 'True' },
      })
    }
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + (quick ? '/reference-quick.json' : '/reference.json'),
      JSON.stringify(
        { quick, fixtures: fixtures.length, inserts, invariant, dependent, reference },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'floatoutput', group, names, fixtures)
    console.info('Float output parity', {
      quick,
      fixtures: fixtures.length,
      inserts,
      invariant,
      dependent,
    })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
