import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'
import { readRangeFixture } from './check-range-fixtures.js'
import { PG18_RANGE_TYPES } from '../../src/postgres/builtins/type-ranges.generated.js'

it('keeps successful unknown hashes out of planning errors and preserves strict seeds, ordered binary state and complete hash cancellation', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-range-wire-state-'))
  try {
    const reference = JSON.parse(readFileSync('tests/fixtures/check-native-hash.json', 'utf8')) as {
      samples: {
        type: string
        value: string
        seed: string
        little32: number
        big32: number
        little64: string
        big64: string
      }[]
    }
    const divergent = reference.samples.find(
      (s) =>
        s.type === 'pg_catalog."numeric"' &&
        s.seed === '0' &&
        s.little32 !== s.big32 &&
        s.little64 !== s.big64,
    )!
    expect(divergent).toBeDefined()
    const literal = '[' + divergent.value + ',)'
    const forms = [
      {
        table: 'range_hash_seed',
        sql: 'CASE WHEN bypass THEN true ELSE hash_range_extended(payload,seed) IS NULL END',
        constant: false,
      },
      {
        table: 'range_hash_division',
        sql: 'CASE WHEN bypass THEN true ELSE hash_range_extended(payload,1/divisor::bigint) IS NULL END',
        constant: false,
      },
      {
        table: 'range_hash_constant32',
        sql: `CASE WHEN bypass THEN true ELSE hash_range('${literal}'::numrange)=expected32 END`,
        constant: true,
      },
      {
        table: 'range_hash_constant64',
        sql: `CASE WHEN bypass THEN true ELSE hash_range_extended('${literal}'::numrange,0)=expected64 END`,
        constant: true,
      },
    ]
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE ${f.table}(payload numrange,seed bigint,divisor integer,expected32 integer,expected64 bigint,bypass boolean,CHECK(${f.sql}))`,
      )
    const catalog = await snapshotCatalog(pg)
    const group = prepareCheckRustGroup(
      forms.flatMap((f) => {
        const table = catalog.tables.find((t) => t.name === f.table)!
        return ['source', 'stored'].map((origin) => ({
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: f.table,
            constraint: origin,
          },
          expression: portableCheckAtoms(
            lowerTableCheck(
              table,
              origin === 'source'
                ? { name: 'check', type: 'check', definition: `CHECK(${f.sql})` }
                : table.constraints[0]!,
              catalog.enums,
              catalog.domains,
              origin as 'source' | 'stored',
            )!.expression,
          ),
        }))
      }),
    )
    expect(group.checks.filter((c) => c.kind !== 'supported')).toEqual([])
    const native = (
      await pg.query<{ h32: number; h64: string }>(
        'SELECT hash_range($1::numrange) h32,hash_range_extended($1::numrange,0)::text h64',
        [literal],
      )
    ).rows[0]!
    const range = await readRangeFixture(
      pg,
      'SELECT $1::numrange span',
      'span',
      'pg_catalog.numrange',
      [literal],
    )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    let inserts = 0
    for (const form of forms)
      for (const payload of [null, literal])
        for (const bypass of [false, true]) {
          let expected: Outcome = { kind: 'True' }
          try {
            await pg.query(`INSERT INTO ${form.table} VALUES($1::numrange,NULL,0,$2,$3,$4)`, [
              payload,
              native.h32,
              native.h64,
              bypass,
            ])
          } catch (error) {
            expect((error as { code: string }).code).toBe('22012')
            expected = { kind: 'Error', value: { state: parseInt('22012', 36) } }
          }
          inserts++
          if (form.constant && !bypass) expected = { kind: 'Unknown' }
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: form.table + '_' + origin,
              row: {
                payload: payload === null ? { kind: 'Null' } : { kind: 'Value', value: range! },
                seed: { kind: 'Null' },
                divisor: { kind: 'Value', value: 0 },
                expected32: { kind: 'Value', value: native.h32 },
                expected64: { kind: 'Value', value: BigInt(native.h64) },
                bypass: { kind: 'Value', value: bypass },
              },
              expected,
            })
        }
    for (const origin of ['source', 'stored'])
      fixtures.push({
        name: 'range_hash_seed_' + origin,
        row: {
          payload: { kind: 'Unknown' },
          seed: { kind: 'Null' },
          bypass: { kind: 'Value', value: false },
        },
        expected: { kind: 'True' },
      })
    const entryName = checkRustEntryName({
      schema: 'public',
      kind: 'table',
      owner: 'range_wire',
      constraint: 'state',
    })
    const entrySource = `pub fn ${entryName}() -> CheckOutcome { let state = range_wire_state_probe(); check_from_bool(state) }`
    group.checks = [...group.checks, { kind: 'supported', entryName, inputs: [] }]
    group.evaluatorSource += '\n' + entrySource
    const checks = group.source!.modules.find((m) => m.name === 'checks')!
    checks.files[0]!.source = group.evaluatorSource!
    group
      .source!.modules.find((m) => m.name === 'pg_catalog')!
      .files.push({
        path: 'tests/range_wire_state.rs',
        source: `
pub fn range_wire_state_probe() -> BoolValue {
 let span=range_from_text(make_text_value("[1,3)"),"pg_catalog.int4range","pg_catalog.int4",2);
 let empty=range_from_text(make_text_value("empty"),"pg_catalog.int4range","pg_catalog.int4",2);
 let all=range_from_text(make_text_value("(,)"),"pg_catalog.int4range","pg_catalog.int4",2);
 let failure=make_sql_error(${parseInt('22012', 36)});
 let error=ByteaValue::Error(failure);
 if sql__pg_catalog__range_send__b1w5(empty.clone(),error.clone(),error.clone()) != make_bytea_value("01") {return BoolValue::Value(false);};
 if sql__pg_catalog__range_send__b1w5(all,error.clone(),error.clone()) != make_bytea_value("18") {return BoolValue::Value(false);};
 if sql__pg_catalog__range_send__b1w5(span.clone(),ByteaValue::Unknown,error.clone()) != ByteaValue::Unknown {return BoolValue::Value(false);};
 if sql__pg_catalog__range_send__b1w5(span.clone(),error.clone(),ByteaValue::Unknown) != error {return BoolValue::Value(false);};
 if sql__pg_catalog__range_send__b1w5(span.clone(),ByteaValue::Unspecified(4),make_bytea_value("00000003")) != ByteaValue::Unspecified(17) {return BoolValue::Value(false);};
 let first=sql__pg_catalog__hash_range__ov3e(span.clone(),make_int4_value(0),make_int4_value(1),make_int4_value(0));
 let second=sql__pg_catalog__hash_range__ov3e(span.clone(),make_int4_value(0),make_int4_value(2),make_int4_value(6));
 if array_hash_finish32(first,second) != make_int4_value(2) {return BoolValue::Value(false);};
 let a=sql__pg_catalog__hash_range_extended__axg0(span.clone(),make_int8_value(0i64),make_int8_value(0i64),make_int8_value(1i64),make_int8_value(0i64));
 let b=sql__pg_catalog__hash_range_extended__axg0(span.clone(),make_int8_value(0i64),make_int8_value(0i64),make_int8_value(2i64),make_int8_value(6i64));
 if array_hash_finish64(a,b) != make_int8_value(2i64) {return BoolValue::Value(false);};
 if sql__pg_catalog__hash_range_extended__axg0(RangeValue::Null,Int8Value::Error(failure),Int8Value::Unknown,Int8Value::Unknown,Int8Value::Unknown) != Int8Value::Error(failure) {return BoolValue::Value(false);};
 if sql__pg_catalog__hash_range_extended__axg0(RangeValue::Error(failure),Int8Value::Null,Int8Value::Unknown,Int8Value::Unknown,Int8Value::Unknown) != Int8Value::Error(failure) {return BoolValue::Value(false);};
 if sql__pg_catalog__hash_range_extended__axg0(RangeValue::Unknown,Int8Value::Null,Int8Value::Unknown,Int8Value::Unknown,Int8Value::Unknown) != Int8Value::Null {return BoolValue::Value(false);};
 if sql__pg_catalog__hash_range__ov3e(empty,make_int4_value(1),Int4Value::Error(failure),Int4Value::Error(failure)) != make_int4_value(2) {return BoolValue::Value(false);};
 if range_to_text(span) != make_text_value("[1,3)") {return BoolValue::Value(false);};
 BoolValue::Value(true)
}`,
      })
    fixtures.push({ name: 'states', row: {}, expected: { kind: 'True' } })
    await runCheckParity(
      directory,
      'rangewirestate',
      group,
      [...forms.flatMap((f) => ['source', 'stored'].map((o) => f.table + '_' + o)), 'states'],
      fixtures,
    )
    await mkdir('artifacts/check-range-wire-hash', { recursive: true })
    await writeFile(
      'artifacts/check-range-wire-hash/state-report.json',
      JSON.stringify(
        {
          inserts,
          fixtures: fixtures.length,
          completeHashCancellation: true,
          orderedBinaryOutput: true,
          successfulUnknownConstantHashes: true,
          strictSeedNull: true,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 120000)

it('preserves eager invalid typed range inputs under both otherwise non-failing hash functions', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-range-hash-eager-'))
  try {
    await pg.exec('CREATE TABLE range_hash_eager(bypass boolean)')
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'range_hash_eager')!
    const forms = Object.values(PG18_RANGE_TYPES).flatMap((r, family) =>
      ['hash_range', 'hash_range_extended'].map((fn) => ({
        name: family + '_' + fn,
        sql: `CASE WHEN bypass THEN true ELSE ${fn}('['::${r.identity}${fn.endsWith('extended') ? ',0' : ''}) IS NULL END`,
      })),
    )
    for (const form of forms)
      await expect(
        pg.exec(`CREATE TABLE invalid_range_hash_${form.name}(bypass boolean,CHECK(${form.sql}))`),
      ).rejects.toMatchObject({ code: '22P02' })
    const group = prepareCheckRustGroup(
      forms.map((f) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: f.name,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            { name: f.name, type: 'check', definition: `CHECK(${f.sql})` },
            catalog.enums,
            catalog.domains,
            'source',
          )!.expression,
        ),
      })),
    )
    expect(group.checks.filter((c) => c.kind !== 'supported')).toEqual([])
    await runCheckParity(
      directory,
      'rangehasheager',
      group,
      forms.map((f) => f.name),
      forms.flatMap((f) =>
        [false, true].map((bypass) => ({
          name: f.name,
          row: { bypass: { kind: 'Value' as const, value: bypass } },
          expected: { kind: 'Error' as const, value: { state: parseInt('22P02', 36) } },
        })),
      ),
    )
    await mkdir('artifacts/check-range-wire-hash', { recursive: true })
    await writeFile(
      'artifacts/check-range-wire-hash/eager-report.json',
      JSON.stringify(
        {
          nativeDDLRejections: forms.length,
          fixtures: forms.length * 2,
          typedLiteralInputErrors: 'eager before skipped hash call',
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 120000)
