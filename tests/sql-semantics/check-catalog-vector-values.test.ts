import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  assembleCheckRust,
  type prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import { rustStringLiteral } from '../../src/codegen/shared/rust-literals.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import type { FunctionMetadata } from '../../src/postgres/builtins/catalog.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const known = (value: string | number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (code: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})
const forms = [
  '',
  ' ',
  '1 2',
  '1 1',
  '-1 0 +2',
  '32767 -32768',
  '\t1 2',
  '1\t2',
  '1 \t2',
  '1\n',
  '1 \n',
  '01 0x10',
  '0x10',
  '0x',
  '0b10',
  '1_0',
  '1+2',
  '1-2',
  '0x1e+2',
  '32768x',
  '-32769x',
  '999999999999999999999999x',
  '-2147483649',
  '4294967296',
  '18446744073709551616',
  '1\u00a02',
  '+',
  '-',
  '1 NULL',
  '1 2,3',
  ...Array.from({ length: 24 }, (_, i) =>
    Array.from({ length: i % 7 }, (_, j) => String(((i * 17 + j * 31) % 100) - 30)).join(' '),
  ),
]

it('establishes owned integer/OID vector backends, native grammar, specialized order, hashes and array-shape composition before SQL admission', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-catalog-vector-values-'))
  try {
    const sourceText = await readFile(
        'crates/check-evaluator/src/operations/pg_catalog/catalog_vectors.rs',
        'utf8',
      ),
      functions = builtinCallables().filter(
        (f): f is FunctionMetadata =>
          f.kind === 'function' && sourceText.includes(`pub fn ${f.rustName}(`),
      ),
      cases: { name: string; row: Row; expected: Outcome }[] = [],
      shapeRust: string[] = []
    expect(functions).toHaveLength(12)
    let nativeInsertCases = 0
    const base: Row = {
        mode: known(0),
        a: known('1 2'),
        b: known('1 2'),
        expected: known('1 2'),
        number: known(0n),
        flag: known(true),
        shape: known(-1),
        other: known(-1),
        seed: known(0n),
        order: known(1),
      },
      add = (name: string, mode: number, row: Row, expected: Outcome) =>
        cases.push({ name, row: { ...base, ...row, mode: known(mode) }, expected }),
      scalar = async (
        sql: string,
      ): Promise<{ value: string | number | boolean | null } | { error: string }> => {
        try {
          return (
            await pg.query<{ value: string | number | boolean | null }>('SELECT ' + sql + ' value')
          ).rows[0]!
        } catch (e) {
          return { error: (e as { code: string }).code }
        }
      }
    const ops = new Map<
      number,
      {
        sql: (v: string) => string
        rust: string
        result: 'text' | 'int4' | 'int8' | 'bool' | 'wire'
      }
    >([
      [0, { sql: (v) => `${v}::text`, rust: 'catalog_vector_to_text(left,oid)', result: 'text' }],
      [
        1,
        {
          sql: (v) => `array_ndims(${v})`,
          rust: 'sql__pg_catalog__array_ndims__8wu3(left)',
          result: 'int4',
        },
      ],
      [
        2,
        {
          sql: (v) => `cardinality(${v})`,
          rust: 'sql__pg_catalog__cardinality__m1rn(left)',
          result: 'int4',
        },
      ],
      [
        3,
        {
          sql: (v) => `array_lower(${v},1)`,
          rust: 'sql__pg_catalog__array_lower__3uq2(left,make_int4_value(1))',
          result: 'int4',
        },
      ],
      [
        4,
        {
          sql: (v) => `array_upper(${v},1)`,
          rust: 'sql__pg_catalog__array_upper__lnz3(left,make_int4_value(1))',
          result: 'int4',
        },
      ],
      [
        5,
        {
          sql: (v) => `array_length(${v},1)`,
          rust: 'sql__pg_catalog__array_length__pebh(left,make_int4_value(1))',
          result: 'int4',
        },
      ],
      [
        6,
        {
          sql: (v) => `array_dims(${v})`,
          rust: 'sql__pg_catalog__array_dims__01ex(left)',
          result: 'text',
        },
      ],
      [
        7,
        {
          sql: (v) => `(${v})[0]::bigint`,
          rust: 'catalog_vector_units(array_fetch_subscript(left,append_array_subscript(make_array_subscripts(),make_int4_value(0),false,true)),oid)',
          result: 'int8',
        },
      ],
      [8, { sql: (v) => `encode(SEND(${v}),'hex')`, rust: 'SEND(left)', result: 'wire' }],
      [
        9,
        {
          sql: (v) => `length(SEND(${v}))`,
          rust: 'sql__pg_catalog__length__j2mn(SEND(left))',
          result: 'int4',
        },
      ],
      [
        10,
        {
          sql: (v) => `array_lower((${v})[0:1],1)`,
          rust: 'sql__pg_catalog__array_lower__3uq2(vector_slice(left),make_int4_value(1))',
          result: 'int4',
        },
      ],
      [
        11,
        {
          sql: (v) => `cardinality((${v})[0:1])`,
          rust: 'sql__pg_catalog__cardinality__m1rn(vector_slice(left))',
          result: 'int4',
        },
      ],
    ])
    for (const [type, oid] of [
      ['int2vector', false],
      ['oidvector', true],
    ] as const) {
      const name = type,
        send = functions.find((f) => f.name === type + 'send')!
      await pg.exec(
        `CREATE TABLE native_${type}(value ${type},expected text,CHECK(value::text=expected))`,
      )
      for (const text of forms) {
        const literal = "'" + text.replaceAll("'", "''") + "'::" + type,
          result = await scalar(literal + '::text'),
          deferred = oid && ['0x', '0b10', '-2147483649'].includes(text)
        const insertion = pg.query(`INSERT INTO native_${type} VALUES($1::${type},$2)`, [
          text,
          'error' in result ? '' : result.value,
        ])
        nativeInsertCases++
        if ('error' in result) await expect(insertion).rejects.toMatchObject({ code: result.error })
        else await insertion
        add(
          name,
          0,
          { a: known(text), expected: known('error' in result ? '' : String(result.value)) },
          deferred
            ? { kind: 'Unknown' }
            : 'error' in result
              ? failure(result.error)
              : { kind: 'True' },
        )
      }
      await expect(
        pg.query(`INSERT INTO native_${type} VALUES('1 2','incorrect')`),
      ).rejects.toMatchObject({ code: '23514' })
      nativeInsertCases++
      add(name, 0, { expected: known('incorrect') }, { kind: 'False' })
      const specimens = [
        `''::${type}`,
        `'0'::${type}`,
        `'1 2'::${type}`,
        `'2 1'::${type}`,
        `'1 2 3 4'::${type}`,
        `'32767 0'::${type}`,
        `ARRAY[1,2]::${type}`,
        `ARRAY[]::${type}`,
        `ARRAY[NULL,2]::${type}`,
        `ARRAY[[1,2],[3,4]]::${type}`,
        `NULL::${type}`,
      ]
      if (oid) specimens.push("'4294967295 2147483648 0'::oidvector")
      else specimens.push("'-32768 32767'::int2vector")
      specimens.push(`'0 0'::${type}`)
      const shapes: number[] = []
      for (const specimen of specimens) {
        const wire = await scalar(`encode(${type}send(${specimen}),'hex')`)
        if ('error' in wire) throw Error(wire.error)
        const index = shapeRust.length
        shapes.push(index)
        if (wire.value === null) shapeRust.push('ArrayValue::Null')
        else {
          const bytes = Buffer.from(String(wire.value), 'hex'),
            ndim = bytes.readInt32BE(),
            nulls = bytes.readInt32BE(4) !== 0,
            dimensions = Array.from({ length: ndim }, (_, i) => ({
              length: bytes.readInt32BE(12 + i * 8),
              lower: bytes.readInt32BE(16 + i * 8),
            })),
            cells: string[] = []
          let at = 12 + ndim * 8
          while (at < bytes.length) {
            const size = bytes.readInt32BE(at)
            at += 4
            if (size === -1) cells.push('ArrayElement::Null')
            else {
              cells.push(
                oid
                  ? `ArrayElement::Oid(${bytes.readUInt32BE(at)}i64)`
                  : `ArrayElement::Int2(${bytes.readInt16BE(at)})`,
              )
              at += size
            }
          }
          shapeRust.push(
            `let mut dimensions:Vec<ArrayDimension>=Vec::new();${dimensions.map((d) => `dimensions.push(ArrayDimension {lower:${d.lower},length:${d.length}});`).join('')}let mut elements:Vec<ArrayElement>=Vec::new();${cells.map((c) => `elements.push(${c});`).join('')}catalog_vector_from_coerced(ArrayValue::Value(ArrayPayload {element_type:${rustStringLiteral(oid ? 'pg_catalog.oid' : 'pg_catalog.int2')}.to_owned(),element_kind:${oid ? 33 : 1},null_bitmap:BoolValue::Value(${nulls}),dimensions,elements}),${oid})`,
          )
        }
        for (const [mode, op] of ops) {
          const result = await scalar(op.sql(specimen).replaceAll('SEND(', send.name + '(')),
            row: Row = { shape: known(index) },
            expected: Outcome =
              'error' in result
                ? failure(result.error)
                : {
                    kind:
                      result.value === null ? 'Null' : op.result === 'wire' ? 'Unknown' : 'True',
                  }
          if (!('error' in result)) {
            if (op.result === 'text' || op.result === 'wire')
              row.expected = known(result.value === null ? null : String(result.value))
            else row.number = known(result.value === null ? null : BigInt(String(result.value)))
          }
          if (mode === 0) {
            const insertion = pg.query(`INSERT INTO native_${type} VALUES(${specimen},$1)`, [
              'error' in result ? '' : result.value,
            ])
            nativeInsertCases++
            if ('error' in result)
              await expect(insertion).rejects.toMatchObject({ code: result.error })
            else await insertion
          }
          add(name, mode, row, expected)
        }
      }
      if (oid) {
        for (const [fIndex, f] of functions.filter((f) => !f.name.endsWith('send')).entries()) {
          const mode = 20 + fIndex,
            args = f.args.map((t, i) =>
              t === 'pg_catalog.int8' ? 'seed' : i === 0 ? 'left' : 'right',
            ),
            result =
              f.result === 'pg_catalog.text'
                ? 'text'
                : f.result === 'pg_catalog.bool'
                  ? 'bool'
                  : f.result === 'pg_catalog.int8'
                    ? 'int8'
                    : 'int4'
          ops.set(mode, {
            sql: () => '',
            rust: `${f.rustName}(${args.join(',')})`,
            result,
          })
          for (let i = 0; i < specimens.length; i++)
            for (const j of f.args[1] === 'pg_catalog.oidvector' ? specimens.keys() : [0])
              for (const seed of f.args[1] === 'pg_catalog.int8'
                ? [0n, 1n, -1n, -9223372036854775808n, 9223372036854775807n]
                : [0n]) {
                const nativeArgs = f.args.map((t, k) =>
                    t === 'pg_catalog.int8' ? `'${seed}'::bigint` : specimens[k === 0 ? i : j]!,
                  ),
                  r = await scalar(`pg_catalog.${f.name}(${nativeArgs.join(',')})`),
                  row: Row = {
                    shape: known(shapes[i]!),
                    other: known(shapes[j]!),
                    seed: known(seed),
                  }
                if (!('error' in r)) {
                  if (result === 'text') row.expected = known(r.value as string | null)
                  else if (result === 'bool') row.flag = known(r.value as boolean | null)
                  else row.number = known(r.value === null ? null : BigInt(String(r.value)))
                }
                add(
                  name,
                  mode,
                  row,
                  'error' in r
                    ? failure(r.error)
                    : {
                        kind:
                          r.value === null
                            ? 'Null'
                            : result === 'text' &&
                                r.value !== '' &&
                                !/^-(?:, -)*$/u.test(String(r.value))
                              ? 'Unknown'
                              : 'True',
                      },
                )
              }
          for (const state of [
            { kind: 'Unknown' },
            { kind: 'Null' },
            failure('22012'),
          ] as Input[]) {
            add(name, mode, { a: state }, state as Outcome)
            if (f.args[1] === 'pg_catalog.oidvector')
              add(name, mode, { b: state }, state as Outcome)
          }
          if (f.args.length === 2) {
            const second = f.args[1] === 'pg_catalog.int8' ? 'seed' : 'b'
            add(
              name,
              mode,
              { a: { kind: 'Unknown' }, [second]: failure('22003') },
              failure('22003'),
            )
            add(name, mode, { a: failure('22012'), [second]: failure('22003') }, failure('22012'))
          }
        }
      }
      for (const state of [{ kind: 'Unknown' }, { kind: 'Null' }, failure('22012')] as Input[]) {
        add(name, 0, { a: state }, state as Outcome)
        for (const mode of [8, 9])
          add(name, mode, { a: state, expected: known('00') }, state as Outcome)
      }
    }
    for (const [i, name] of ['int2vector', 'oidvector'].entries())
      add(name, 90, { flag: known(i === 1) }, { kind: 'True' })
    const oidFns = functions.filter((f) => f.name.startsWith('hash'))
    for (const f of oidFns) {
      const mode = [...ops].find(([, op]) => op.rust.startsWith(f.rustName + '('))![0]
      const alternativeMode = f.args.length === 2 ? 81 : 80
      ops.set(alternativeMode, {
        sql: () => '',
        rust: `vector_hash_alternative(left,seed,byte_order,${f.args.length === 2})`,
        result: 'int8',
      })
      for (const text of ['', '0', '0 0', '1', '1 2', '4294967295 2147483648']) {
        const result = await scalar(
          `pg_catalog.${f.name}('${text}'::oidvector${f.args.length === 2 ? ',0::bigint' : ''})`,
        )
        if ('error' in result) throw Error(result.error)
        const row: Row = {
          a: known(text),
          number: known(BigInt(String(result.value))),
          order: known(0),
        }
        add('oidvector', mode, row, { kind: 'True' })
        for (const order of [0, 1, 2])
          add('oidvector', alternativeMode, { ...row, order: known(order) }, { kind: 'True' })
      }
    }
    const entryNames = ['int2vector', 'oidvector'].map((type) =>
        checkRustEntryName({ schema: 'public', kind: 'table', owner: type, constraint: 'backend' }),
      ),
      parameters =
        'mode:Int4Value,a:TextValue,b:TextValue,expected:TextValue,number:Int8Value,flag:BoolValue,shape:Int4Value,other:Int4Value,seed:Int8Value,order:Int4Value',
      evaluatorSource = entryNames
        .map(
          (entry, i) =>
            `pub fn ${entry}(${parameters})->CheckOutcome {let value=vector_probe(mode,a,b,expected,number,flag,shape,other,seed,order,${i === 1});check_from_bool(value)}`,
        )
        .join('\n'),
      source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.push({
        path: 'tests/catalog_vector_probes.rs',
        source: `
${shapeRust.map((rust, i) => `fn vector_shape_${i}()->ArrayValue {${rust}}`).join('\n')}
fn vector_shape(input:Int4Value)->ArrayValue {if let Int4Value::Value(mode)=input {${shapeRust.map((_, i) => `if mode==${i} {return vector_shape_${i}();};`).join('\n')}};ArrayValue::Unknown}
fn vector_slice(input:ArrayValue)->ArrayValue {let upper=append_array_subscript(make_array_subscripts(),make_int4_value(1),false,true);let bounds=append_array_subscript(upper,make_int4_value(0),true,true);array_slice_subscript(input,bounds)}
fn vector_expected_int4(input:Int8Value)->Int4Value {if let Int8Value::Value(v)=input {return make_int4_value(v as i32);};if input==Int8Value::Null {return Int4Value::Null;};Int4Value::Unknown}
fn vector_owned_states(oid:bool)->BoolValue {
 let original=catalog_vector_from_text(make_text_value("1 2"),oid);
 let owned=original.clone();if let ArrayValue::Value(payload)=owned {
  let mut elements=payload.elements;let mut dimensions=payload.dimensions;
  if oid {elements[0]=ArrayElement::Oid(9i64);} else {elements[0]=ArrayElement::Int2(9);};
  dimensions[0]=ArrayDimension {lower:4,length:2};
  let edited=catalog_vector_from_coerced(ArrayValue::Value(ArrayPayload {element_type:payload.element_type,element_kind:payload.element_kind,null_bitmap:payload.null_bitmap,dimensions,elements}),oid);
  if catalog_vector_to_text(edited,oid)!=make_text_value("9 2") {return BoolValue::Value(false);};
 };
 if catalog_vector_to_text(original,oid)!=make_text_value("1 2") {return BoolValue::Value(false);};
 if array_is_null(catalog_vector_from_coerced(catalog_vector_from_text(make_text_value("1"),oid),oid==false))!=BoolValue::Unknown {return BoolValue::Value(false);};
 if oid {
  let known=catalog_vector_from_text(make_text_value("1 2"),true);
  if let ArrayValue::Value(payload)=known {
   let mut elements=payload.elements;elements[0]=ArrayElement::Unknown;
   let partial=catalog_vector_from_coerced(ArrayValue::Value(ArrayPayload {element_type:payload.element_type,element_kind:payload.element_kind,null_bitmap:payload.null_bitmap,dimensions:payload.dimensions,elements}),true);
   if sql__pg_catalog__btoidvectorcmp__6oyf(partial.clone(),catalog_vector_from_text(make_text_value(""),true))!=make_int4_value(2) {return BoolValue::Value(false);};
   if sql__pg_catalog__hashoidvector__hb8d(partial.clone())!=Int4Value::Unknown {return BoolValue::Value(false);};
   if sql__pg_catalog__length__j2mn(sql__pg_catalog__oidvectorsend__l5tl(partial))!=make_int4_value(36) {return BoolValue::Value(false);};
  };
 };
 let empty=catalog_vector_from_text(make_text_value(""),oid);
 let empty_owned=empty.clone();if let ArrayValue::Value(payload)=empty_owned {
  if array_is_null(make_array_value(payload))!=BoolValue::Unknown {return BoolValue::Value(false);};
 };
 if sql__pg_catalog__array_ndims__8wu3(empty.clone())!=make_int4_value(1) {return BoolValue::Value(false);};
 if sql__pg_catalog__array_length__pebh(empty.clone(),make_int4_value(1))!=make_int4_value(0) {return BoolValue::Value(false);};
 if catalog_vector_to_text(catalog_vector_from_coerced(empty,oid),oid)!=make_text_value("") {return BoolValue::Value(false);};
 if catalog_vector_to_text(ArrayValue::Error(make_sql_error(3452582)),oid)!=TextValue::Error(make_sql_error(3452582)) {return BoolValue::Value(false);};
 BoolValue::Value(true)
}
fn vector_hash_alternative(input:ArrayValue,seed:Int8Value,byte_order:i32,extended:bool)->Int8Value {
 let plan=catalog_vector_hash_bytes(input);
 if plan.state!=CheckOutcome::True {return Int8Value::Unknown;};
 if let Int8Value::Value(value)=seed {
  if extended {return hash_native64(plan.bytes,value,byte_order,4);};
  let result=hash_native32(plan.bytes,byte_order,4);
  if let Int4Value::Value(number)=result {return make_int8_value(number as i64);};
 };
 Int8Value::Unknown
}
pub fn vector_probe(${parameters},oid:bool)->BoolValue {
 let mut left=catalog_vector_from_text(a,oid);let mut right=catalog_vector_from_text(b,oid);
 if shape!=Int4Value::Value(-1) {left=vector_shape(shape);};if other!=Int4Value::Value(-1) {right=vector_shape(other);};
 let mut byte_order:i32=0;if let Int4Value::Value(value)=order {byte_order=value;};
 if let Int4Value::Value(selected)=mode {
 if selected==90 {return vector_owned_states(oid);};
 ${[...ops]
   .map(([mode, op]) => {
     const expression = op.rust.replaceAll('SEND(left)', 'vector_send(left,oid)')
     return `if selected==${mode} {return ${op.result === 'text' ? `sql__pg_catalog__texteq__aet8(${expression},expected)` : op.result === 'bool' ? `sql__pg_catalog__booleq__y6qu(${expression},flag)` : op.result === 'wire' ? `sql__pg_catalog__byteaeq__z0yh(${expression},make_bytea_value_from_hex(expected))` : op.result === 'int8' ? `sql__pg_catalog__int8eq__jdhd(${expression},number)` : `sql__pg_catalog__int4eq__lrxe(${expression},vector_expected_int4(number))`};};`
   })
   .join('\n')}
 };BoolValue::Unknown
}
fn vector_send(input:ArrayValue,oid:bool)->ByteaValue {if oid {return sql__pg_catalog__oidvectorsend__l5tl(input);};sql__pg_catalog__int2vectorsend__4kiy(input)}
fn make_bytea_value_from_hex(input:TextValue)->ByteaValue {if let TextValue::Value(text)=input {return make_bytea_value(text.as_str());};if let TextValue::Null=input {return ByteaValue::Null;};ByteaValue::Unknown}
`,
      })
    const inputNames = [
        'mode',
        'a',
        'b',
        'expected',
        'number',
        'flag',
        'shape',
        'other',
        'seed',
        'order',
      ],
      inputs = inputNames.map((name) => ({
        name,
        rustName: name,
        type: ['a', 'b', 'expected'].includes(name)
          ? 'pg_catalog.text'
          : ['number', 'seed'].includes(name)
            ? 'pg_catalog.int8'
            : name === 'flag'
              ? 'pg_catalog.bool'
              : 'pg_catalog.int4',
        rustType: ['a', 'b', 'expected'].includes(name)
          ? 'TextValue'
          : ['number', 'seed'].includes(name)
            ? 'Int8Value'
            : name === 'flag'
              ? 'BoolValue'
              : 'Int4Value',
      })),
      group: ReturnType<typeof prepareCheckRustGroup> = {
        source,
        evaluatorSource,
        requiresRegex: false,
        checks: entryNames.map((entryName) => ({ kind: 'supported', entryName, inputs })),
      }
    await runCheckParity(root, 'catalogvectorvalues', group, ['int2vector', 'oidvector'], cases)
    console.info('Catalog vector backend parity', {
      fixtures: cases.length,
      nativeInsertCases,
      callables: functions.length,
    })
    const api = await import(pathToFileURL(join(root, 'typescript/checkruntime/runtime.ts')).href)
    const raw = {
        kind: 'Value',
        value: {
          elementType: 'pg_catalog.oid',
          elementKind: 33,
          nullBitmap: { kind: 'Value', value: false },
          dimensions: [{ lower: 0, length: 2 }],
          elements: [
            { kind: 'Oid', value: 1n },
            { kind: 'Oid', value: 2n },
          ],
        },
      },
      copied = api.catalogVectorFromCoerced(raw, true)
    raw.value.elements[0]!.value = 9n
    raw.value.dimensions[0]!.lower = 4
    expect(copied.value.elements[0].value).toBe(1n)
    expect(copied.value.dimensions[0].lower).toBe(0)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 360_000)
