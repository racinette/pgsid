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
import { readMultirangeFixture } from './check-multirange-fixtures.js'
import { PG18_RANGE_TYPES } from '../../src/postgres/builtins/type-ranges.generated.js'

it('keeps successful unknown hashes out of planning errors and preserves strict seeds, ordered binary state and complete hash cancellation', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-multirange-wire-state-'))
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
    const literal = '{[' + divergent.value + ',)}'
    const forms = [
      {
        table: 'multi_hash_seed',
        sql: 'CASE WHEN bypass THEN true ELSE hash_multirange_extended(payload,seed) IS NULL END',
        constant: false,
      },
      {
        table: 'multi_hash_division',
        sql: 'CASE WHEN bypass THEN true ELSE hash_multirange_extended(payload,1/divisor::bigint) IS NULL END',
        constant: false,
      },
      {
        table: 'multi_hash_constant32',
        sql: `CASE WHEN bypass THEN true ELSE hash_multirange('${literal}'::nummultirange)=expected32 END`,
        constant: true,
      },
      {
        table: 'multi_hash_constant64',
        sql: `CASE WHEN bypass THEN true ELSE hash_multirange_extended('${literal}'::nummultirange,0)=expected64 END`,
        constant: true,
      },
    ]
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE ${f.table}(payload nummultirange,seed bigint,divisor integer,expected32 integer,expected64 bigint,bypass boolean,CHECK(${f.sql}))`,
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
        'SELECT hash_multirange($1::nummultirange) h32,hash_multirange_extended($1::nummultirange,0)::text h64',
        [literal],
      )
    ).rows[0]!
    const range = await readMultirangeFixture(pg, 'pg_catalog.nummultirange', literal)
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    let inserts = 0
    for (const form of forms)
      for (const payload of [null, literal])
        for (const bypass of [false, true]) {
          let expected: Outcome = { kind: 'True' }
          try {
            await pg.query(`INSERT INTO ${form.table} VALUES($1::nummultirange,NULL,0,$2,$3,$4)`, [
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
        name: 'multi_hash_seed_' + origin,
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
      owner: 'multi_wire',
      constraint: 'state',
    })
    const entrySource = `pub fn ${entryName}() -> CheckOutcome { let state = multi_wire_state_probe(); check_from_bool(state) }`
    group.checks = [...group.checks, { kind: 'supported', entryName, inputs: [] }]
    group.evaluatorSource += '\n' + entrySource
    const checks = group.source!.modules.find((m) => m.name === 'checks')!
    checks.files[0]!.source = group.evaluatorSource!
    group
      .source!.modules.find((m) => m.name === 'pg_catalog')!
      .files.push({
        path: 'tests/multi_wire_state.rs',
        source: `
const MULTIRANGE_WIRE_TEST_DIVISION_BY_ZERO: u32 = 3452582;
const MULTIRANGE_WIRE_TEST_OVERFLOW: u32 = 3452547;
pub fn multi_wire_state_probe() -> BoolValue {
 let first=make_sql_error(MULTIRANGE_WIRE_TEST_DIVISION_BY_ZERO);
 let second=make_sql_error(MULTIRANGE_WIRE_TEST_OVERFLOW);
 let count=make_int4_value(2);
 let known=BoolValue::Value(false);
 let seed=make_int8_value(0i64);
 if multirange_binary_initial32(BoolValue::Error(first),count,Int8Value::Error(second))!=Int4Value::Error(first) {return BoolValue::Value(false);};
 if multirange_binary_initial64(BoolValue::Value(true),count,Int8Value::Error(second))!=Int8Value::Error(second) {return BoolValue::Value(false);};
 if multirange_binary_initial64(BoolValue::Unknown,count,Int8Value::Null)!=Int8Value::Null {return BoolValue::Value(false);};
 if multirange_binary_initial32(known,count,Int8Value::Unknown)!=Int4Value::Unknown {return BoolValue::Value(false);};
 if multirange_binary_initial32(known,count,seed)!=make_int4_value(1) {return BoolValue::Value(false);};
 if multirange_binary_initial_send(BoolValue::Unknown,count)!=ByteaValue::Unknown {return BoolValue::Value(false);};
 if multirange_binary_initial_send(BoolValue::Value(true),count)!=ByteaValue::Null {return BoolValue::Value(false);};
 if multirange_binary_initial_send(BoolValue::Error(first),count)!=ByteaValue::Error(first) {return BoolValue::Value(false);};
 let header=multirange_binary_initial_send(known,count);
 if header!=make_bytea_value("00000002") {return BoolValue::Value(false);};
 let prefix=multirange_binary_append(header.clone(),make_bytea_value("18"));
 if prefix!=make_bytea_value("000000020000000118") {return BoolValue::Value(false);};
 if multirange_binary_append(header.clone(),ByteaValue::Unspecified(17))!=ByteaValue::Unspecified(25) {return BoolValue::Value(false);};
 let unknown=multirange_binary_append(header.clone(),ByteaValue::Unknown);
 if unknown!=ByteaValue::Unknown {return BoolValue::Value(false);};
 if multirange_binary_continues_send(count,make_int4_value(1),unknown) {return BoolValue::Value(false);};
 if multirange_binary_continues32(count,make_int4_value(1),Int4Value::Unknown,make_int4_value(1)) {return BoolValue::Value(false);};
 if multirange_binary_continues64(count,make_int4_value(1),Int8Value::Error(first),seed) {return BoolValue::Value(false);};
 let initial=make_int4_value(1);
 let little= array_hash_step32(initial,make_int4_value(1));
 let big= array_hash_step32(initial,make_int4_value(2));
 let a=array_hash_step32(little,make_int4_value(31));
 let b=array_hash_step32(big,make_int4_value(0));
 if array_hash_finish32(a,b)!=make_int4_value(1023) {return BoolValue::Value(false);};
 let little64=array_hash_step64(make_int8_value(1i64),make_int8_value(1i64));
 let big64=array_hash_step64(make_int8_value(1i64),make_int8_value(2i64));
 let a64=array_hash_step64(little64,make_int8_value(31i64));
 let b64=array_hash_step64(big64,make_int8_value(0i64));
 if array_hash_finish64(a64,b64)!=make_int8_value(1023i64) {return BoolValue::Value(false);};
 let original=multirange_from_text(make_text_value("{[1,3),[5,9)}"),"pg_catalog.int4multirange","pg_catalog.int4range","pg_catalog.int4",2);
 let snapshot=original.clone();
 let payload=multirange_binary_payload(original.clone());
 if multirange_binary_count(&payload)!=count {return BoolValue::Value(false);};
 let member=multirange_binary_member(&payload,make_int4_value(1));
 if range_to_text(member)!=make_text_value("[5,9)") {return BoolValue::Value(false);};
 if multirange_to_text(original)!=multirange_to_text(snapshot) {return BoolValue::Value(false);};
 BoolValue::Value(true)
}`,
      })
    fixtures.push({ name: 'states', row: {}, expected: { kind: 'True' } })
    await runCheckParity(
      directory,
      'multiwirestate',
      group,
      [...forms.flatMap((f) => ['source', 'stored'].map((o) => f.table + '_' + o)), 'states'],
      fixtures,
    )
    await mkdir('artifacts/check-multirange-wire-hash', { recursive: true })
    await writeFile(
      'artifacts/check-multirange-wire-hash/state-report.json',
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

it('preserves eager invalid typed multirange inputs under both otherwise non-failing hash functions', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-multirange-hash-eager-'))
  try {
    await pg.exec('CREATE TABLE multi_hash_eager(bypass boolean)')
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'multi_hash_eager')!
    const forms = Object.values(PG18_RANGE_TYPES).flatMap((r, family) =>
      ['hash_multirange', 'hash_multirange_extended'].map((fn) => ({
        name: family + '_' + fn,
        sql: `CASE WHEN bypass THEN true ELSE ${fn}('['::${r.multirange}${fn.endsWith('extended') ? ',0' : ''}) IS NULL END`,
      })),
    )
    for (const form of forms)
      await expect(
        pg.exec(`CREATE TABLE invalid_multi_hash_${form.name}(bypass boolean,CHECK(${form.sql}))`),
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
      'multihasheager',
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
    await mkdir('artifacts/check-multirange-wire-hash', { recursive: true })
    await writeFile(
      'artifacts/check-multirange-wire-hash/eager-report.json',
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
