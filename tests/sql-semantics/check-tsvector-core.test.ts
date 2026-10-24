import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  assembleCheckRust,
  type prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const packet = 'artifacts/goal-checks/tsvector-core-active'
const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (state: string): Outcome => ({ kind: 'Error', value: { state: parseInt(state, 36) } })
const comparisonHelpers = String.raw`
pub fn tsvector_test_text(actual:TextValue,expected:TextValue)->BoolValue {
 if let TextValue::Error(error)=actual {return BoolValue::Error(error);};
 if let TextValue::Unknown=actual {return BoolValue::Unknown;};
 if actual==TextValue::Null && expected==TextValue::Null {return make_bool_value(true);};
 if actual==TextValue::Null || expected==TextValue::Null {return make_bool_value(false);};
 sql__pg_catalog__texteq__aet8(actual,expected)
}
pub fn tsvector_test_number(actual:Int4Value,expected:Int4Value)->BoolValue {
 if let Int4Value::Error(error)=actual {return BoolValue::Error(error);};
 if actual==Int4Value::Unknown {return BoolValue::Unknown;};
 make_bool_value(actual==expected)
}
pub fn tsvector_test_boolean(actual:BoolValue,expected:BoolValue)->BoolValue {
 if let BoolValue::Error(error)=actual {return BoolValue::Error(error);};
 if actual==BoolValue::Unknown {return BoolValue::Unknown;};
 make_bool_value(actual==expected)
}
pub fn tsvector_test_array(input:ArrayValue)->TextValue {
 let payload=prepare_array_output(input);
 let rendered_arguments=array_conversion_arguments(payload.clone(),"pg_catalog.text",8);
 finish_array_output(payload,rendered_arguments,false)
}
`
const inputs = [
  { name: 'source', rustName: 'source', type: 'pg_catalog.text' as const, rustType: 'TextValue' },
  { name: 'other', rustName: 'other', type: 'pg_catalog.text' as const, rustType: 'TextValue' },
  {
    name: 'weight',
    rustName: 'weight',
    type: 'pg_catalog."char"' as const,
    rustType: 'InternalCharValue',
  },
  {
    name: 'expected_text',
    rustName: 'expected_text',
    type: 'pg_catalog.text' as const,
    rustType: 'TextValue',
  },
  {
    name: 'expected_number',
    rustName: 'expected_number',
    type: 'pg_catalog.int4' as const,
    rustType: 'Int4Value',
  },
  {
    name: 'expected_boolean',
    rustName: 'expected_boolean',
    type: 'pg_catalog.bool' as const,
    rustType: 'BoolValue',
  },
  { name: 'bypass', rustName: 'bypass', type: 'pg_catalog.bool' as const, rustType: 'BoolValue' },
]
const definitions: Record<
  string,
  { sql: string; body: string; kind: 'text' | 'number' | 'boolean'; other?: boolean }
> = {
  render: {
    sql: 'source::tsvector::text',
    body: 'let actual=tsvector_to_text(vector);',
    kind: 'text',
  },
  stripped: {
    sql: 'strip(source::tsvector)::text',
    body: 'let stripped=sql__pg_catalog__strip__3rdv(vector);let actual=tsvector_to_text(stripped);',
    kind: 'text',
  },
  length: {
    sql: 'length(source::tsvector)',
    body: 'let actual=sql__pg_catalog__length__grcw(vector);',
    kind: 'number',
  },
  weighted: {
    sql: 'setweight(source::tsvector,weight)::text',
    body: 'let weighted=sql__pg_catalog__setweight__hza4(vector,weight);let actual=tsvector_to_text(weighted);',
    kind: 'text',
  },
  lexemes: {
    sql: 'tsvector_to_array(source::tsvector)::text',
    body: 'let array=sql__pg_catalog__tsvector_to_array__rv21(vector);let actual=tsvector_test_array(array);',
    kind: 'text',
  },
  equal: {
    sql: 'source::tsvector=other::tsvector',
    body: 'let actual=sql__pg_catalog__tsvector_eq__aqk8(vector,right);',
    kind: 'boolean',
    other: true,
  },
  unequal: {
    sql: 'source::tsvector<>other::tsvector',
    body: 'let actual=sql__pg_catalog__tsvector_ne__v0j3(vector,right);',
    kind: 'boolean',
    other: true,
  },
  before: {
    sql: 'source::tsvector<other::tsvector',
    body: 'let actual=sql__pg_catalog__tsvector_lt__6duo(vector,right);',
    kind: 'boolean',
    other: true,
  },
  not_after: {
    sql: 'source::tsvector<=other::tsvector',
    body: 'let actual=sql__pg_catalog__tsvector_le__7xey(vector,right);',
    kind: 'boolean',
    other: true,
  },
  after: {
    sql: 'source::tsvector>other::tsvector',
    body: 'let actual=sql__pg_catalog__tsvector_gt__dorq(vector,right);',
    kind: 'boolean',
    other: true,
  },
  not_before: {
    sql: 'source::tsvector>=other::tsvector',
    body: 'let actual=sql__pg_catalog__tsvector_ge__sjck(vector,right);',
    kind: 'boolean',
    other: true,
  },
}

it.each([true, false])(
  'normalizes owned tsvector lexemes, positions and weights with portable core operations in every target (UTF8=%s)',
  async (utf8) => {
    const pg = await PGlite.create(),
      root = await mkdtemp(join(tmpdir(), 'pgsid-tsvector-core-'))
    try {
      const checks = Object.entries(definitions).map(([name, d]) => {
          const entryName = checkRustEntryName({
              schema: 'public',
              kind: 'table',
              owner: 'tsvector_core',
              constraint: name,
            }),
            parameters = inputs.map((i) => i.name + ':' + i.rustType).join(','),
            source = `pub fn ${entryName}(${parameters})->CheckOutcome {let mut result:CheckOutcome=check_unknown();let guard=check_from_bool(bypass);if case_guard_takes(guard) {let yes=make_bool_value(true);result=check_from_bool(yes);} else {let vector=tsvector_from_text_context(source,${utf8});${d.other ? `let right=tsvector_from_text_context(other,${utf8});` : ''}${d.body}let compared=tsvector_test_${d.kind}(actual,expected_${d.kind === 'text' ? 'text' : d.kind === 'number' ? 'number' : 'boolean'});result=check_from_bool(compared);};result}`
          return { name, entryName, source }
        }),
        evaluatorSource = checks.map((c) => c.source).join('\n'),
        source = assembleCheckRust({ source: evaluatorSource, callables: [] })
      source.modules
        .find((m) => m.name === 'pg_catalog')!
        .files.push({ path: 'test/tsvector_core.rs', source: comparisonHelpers })
      const group: ReturnType<typeof prepareCheckRustGroup> = {
          source,
          evaluatorSource,
          requiresRegex: false,
          checks: checks.map((c) => ({ kind: 'supported', entryName: c.entryName, inputs })),
        },
        forms: (string | null)[] = [
          null,
          '',
          ' ',
          '\t\n',
          'a',
          'z',
          'xx',
          'a b',
          "'abc'foo",
          "'a''b':3,2A,1",
          'a\\ b:2C',
          "'a b':3,2,1a",
          'foo:1,2B foo:2A,3 foo',
          'a:16383D a:16383A',
          ...Array.from(
            { length: 4 },
            (_, seed) =>
              'a:' +
              Array.from(
                { length: 300 },
                (_, i) =>
                  `${i % 11 === 0 ? 16383 : 1 + ((i * 71 + seed * 31) % 260)}${['A', 'D', 'C', 'B'][(i + seed) % 4]}`,
              ).join(','),
          ),
          'a:1,16383D,16383A',
          'a:1,16383A,16383D',
          'abc:1a23',
          'abc:1da',
          'abc:1dd',
          'abc:1ad',
          'abc:001',
          'abc:0',
          'abc:2147483647',
          'abc:2147483648',
          'abc:4294967296',
          ':',
          '::',
          'a:',
          "''",
          "'unterminated",
          'a\\',
          'a:1,',
          'a:1,x',
          'a:1B*',
          'a!b|c(d)&e',
          'a\u00a0b',
          'é:2A 😀:1C',
          '\ue000 😀 é 𐀀',
          '😀'.repeat(511),
          '😀'.repeat(512),
          'a'.repeat(2046),
          'a'.repeat(2047),
          "'" + 'a'.repeat(2047) + "':0",
          'a:' + Array.from({ length: 300 }, (_, i) => 300 - i).join(','),
          'a:' + Array.from({ length: 260 }, (_, i) => 1 + (i % 255)).join(','),
          'a:' +
            Array.from(
              { length: 50 },
              (_, i) => `${1 + (i % 8)}${['A', 'B', 'C', 'D'][i % 4]}`,
            ).join(','),
        ],
        references: unknown[] = [],
        fixtures: { name: string; row: Row; expected: Outcome }[] = []
      for (const [name, d] of Object.entries(definitions))
        await pg.exec(
          `CREATE TABLE tsvector_core_${name}(source text,other text,weight "char",expected_text text,expected_number int,expected_boolean boolean,bypass boolean,CONSTRAINT rule CHECK(CASE WHEN bypass THEN true ELSE (${d.sql}) ${d.kind === 'text' ? 'COLLATE "C"' : ''} IS NOT DISTINCT FROM expected_${d.kind === 'text' ? 'text' : d.kind === 'number' ? 'number' : 'boolean'} ${d.kind === 'text' ? 'COLLATE "C"' : ''} END))`,
        )
      await pg.exec(
        'CREATE TEMP TABLE tsvector_core_input(source text,other text,weight "char",expected_text text,expected_number int,expected_boolean boolean,bypass boolean)',
      )
      let nativeInserts = 0,
        nativeRejections = 0
      for (const sourceText of forms)
        for (const [weightText, weightCode] of [
          ['A', 65],
          ['d', 100],
          ['?', 63],
          [null, null],
        ] as const) {
          const other = sourceText === 'a' ? 'z' : 'a:1',
            base: Row = {
              source: known(sourceText),
              other: known(other),
              weight: known(weightCode),
              expected_text: known(null),
              expected_number: known(null),
              expected_boolean: known(null),
              bypass: known(false),
            }
          await pg.query('DELETE FROM tsvector_core_input')
          await pg.query(
            'INSERT INTO tsvector_core_input VALUES($1,$2,$3::text::"char",NULL,NULL,NULL,false)',
            [sourceText, other, weightText],
          )
          for (const [name, d] of Object.entries(definitions)) {
            let value: string | number | boolean | null = null,
              state: string | undefined
            try {
              value = (
                await pg.query<{ value: string | number | boolean | null }>(
                  `SELECT (${d.sql}) AS value FROM tsvector_core_input`,
                )
              ).rows[0]!.value
            } catch (e) {
              state = (e as { code: string }).code
            }
            const column =
              'expected_' +
              (d.kind === 'text' ? 'text' : d.kind === 'number' ? 'number' : 'boolean')
            await pg.query(`UPDATE tsvector_core_input SET ${column}=$1`, [value])
            let native: Outcome = { kind: 'True' }
            if (state) native = error(state)
            let failure: string | undefined
            try {
              await pg.query(`INSERT INTO tsvector_core_${name} SELECT * FROM tsvector_core_input`)
            } catch (e) {
              failure = (e as { code: string }).code
              nativeRejections++
            }
            expect(failure, name + ':' + sourceText?.slice(0, 40)).toBe(state)
            nativeInserts++
            const deferred =
                sourceText !== null &&
                ((!utf8 && /[^\x00-\x7f]/u.test(sourceText)) ||
                  /2147483648|4294967296/u.test(sourceText)),
              expected: Outcome = deferred ? { kind: 'Unknown' } : native,
              row = { ...base, [column]: known(value) }
            references.push({
              name,
              source: sourceText,
              weight: weightText,
              value,
              state,
              expected,
            })
            fixtures.push({ name, row, expected })
            fixtures.push({
              name,
              row: { ...row, bypass: known(true) },
              expected: { kind: 'True' },
            })
          }
        }
      await mkdir(packet, { recursive: true })
      await writeFile(
        join(packet, `reference-${utf8}.json`),
        JSON.stringify(
          { nativeInserts, nativeRejections, fixtures: fixtures.length, references },
          null,
          2,
        ) + '\n',
      )
      await runCheckParity(
        root,
        'tsvectorcore' + (utf8 ? 'utf8' : 'context'),
        group,
        checks.map((c) => c.name),
        fixtures,
      )
      console.log(
        `tsvector UTF8=${utf8}: ${nativeInserts} native INSERTs, ${fixtures.length} parity fixtures`,
      )
    } finally {
      await pg.close()
      await rm(root, { recursive: true, force: true })
    }
  },
  600_000,
)

it('retains tsvector ownership, validates logical payloads and separates comparator magnitude from portable relations', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsvector-model-'))
  try {
    const entries = [
        {
          name: 'compare',
          entryName: checkRustEntryName({
            schema: 'public',
            kind: 'table',
            owner: 'tsvector_model',
            constraint: 'compare',
          }),
          inputs,
        },
        {
          name: 'ownership',
          entryName: checkRustEntryName({
            schema: 'public',
            kind: 'table',
            owner: 'tsvector_model',
            constraint: 'ownership',
          }),
          inputs: [],
        },
        ...[0, 1, 2, 3, 4, 5, 6, 7, 8].map((mode) => ({
          name: 'model_' + mode,
          entryName: checkRustEntryName({
            schema: 'public',
            kind: 'table' as const,
            owner: 'tsvector_model',
            constraint: 'model_' + mode,
          }),
          inputs: [],
        })),
      ],
      parameters = inputs.map((i) => i.name + ':' + i.rustType).join(','),
      evaluatorSource =
        `pub fn ${entries[0]!.entryName}(${parameters})->CheckOutcome {let left=tsvector_from_text_context(source,true);let right=tsvector_from_text_context(other,true);let actual=sql__pg_catalog__tsvector_cmp__xinv(left,right);let value=tsvector_test_number(actual,expected_number);check_from_bool(value)}\npub fn ${entries[1]!.entryName}()->CheckOutcome {let value=tsvector_test_ownership();check_from_bool(value)}\n` +
        entries
          .slice(2)
          .map(
            (e, i) =>
              `pub fn ${e.entryName}()->CheckOutcome {let value=tsvector_test_model(${i});check_from_bool(value)}`,
          )
          .join('\n'),
      source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.push({
        path: 'test/tsvector_model.rs',
        source:
          comparisonHelpers +
          String.raw`
pub fn tsvector_test_ownership()->BoolValue {
 let original=tsvector_from_text_context(make_text_value("'a':1A 'z':2C"),true);
 let saved=original.clone();
 if let TsvectorValue::Value(payload)=saved {
  let mut lexemes=payload.lexemes;
  let first=lexemes[0].clone();
  let mut positions=first.positions;
  positions[0]=TsvectorPosition {position:9,weight:2};
  lexemes[0]=TsvectorLexeme {text:"changed".to_owned(),positions:positions};
  let altered=make_tsvector_value(TsvectorPayload {lexemes:lexemes,native_bytes:-1});
  if tsvector_to_text(altered)!=make_text_value("'changed':9B 'z':2C") {return make_bool_value(false);};
 };
 let stripped=sql__pg_catalog__strip__3rdv(original.clone());
 if tsvector_to_text(stripped)!=make_text_value("'a' 'z'") {return make_bool_value(false);};
 let weighted=sql__pg_catalog__setweight__hza4(original.clone(),make_internal_char_value(66));
 if tsvector_to_text(weighted)!=make_text_value("'a':1B 'z':2B") {return make_bool_value(false);};
 make_bool_value(tsvector_to_text(original)==make_text_value("'a':1A 'z':2C"))
}
pub fn tsvector_test_model(mode:i32)->BoolValue {
 if mode==8 {
  let mut text=String::new();let mut i:usize=0;
  while i<2047 {text.push('a');i+=1;}
  let positions:Vec<TsvectorPosition>=Vec::new();let mut lexemes:Vec<TsvectorLexeme>=Vec::new();
  lexemes.push(TsvectorLexeme {text:text,positions:positions});
  let value=make_tsvector_value(TsvectorPayload {lexemes:lexemes,native_bytes:2059});
  if sql__pg_catalog__length__grcw(value.clone())!=make_int4_value(1) {return make_bool_value(false);};
  let rendered=tsvector_to_text(value);
  return make_bool_value(sql__pg_catalog__length__ehpe(rendered)==make_int4_value(2049));
 };

 let original=tsvector_from_text_context(make_text_value("'a':1A 'z':2C"),true);
 if let TsvectorValue::Value(payload)=original {
  let mut lexemes=payload.lexemes;
  let mut bytes=payload.native_bytes;
  if mode==0 {let first=lexemes[0].clone();lexemes[0]=TsvectorLexeme {text:String::new(),positions:first.positions};};
  if mode==1 || mode==2 || mode==3 {
   let first=lexemes[0].clone();
  let mut positions=first.positions;
   let mut position:i32=0;let mut weight:i32=3;
   if mode==2 {position=16384;};
   if mode==3 {position=1;weight=4;};
   positions[0]=TsvectorPosition {position:position,weight:weight};
   lexemes[0]=TsvectorLexeme {text:"a".to_owned(),positions:positions};
  };
  if mode==4 {lexemes[1]=lexemes[0].clone();};
  if mode==5 {bytes=0;};
  if mode==6 {bytes=-1;};
  if mode==7 {bytes=1073741824;};
  let value=make_tsvector_value(TsvectorPayload {lexemes:lexemes,native_bytes:bytes});
  if mode==6 {return make_bool_value(tsvector_is_null(value)==make_bool_value(false));};
  if let TsvectorValue::Unknown=value {return make_bool_value(true);};
 };
 make_bool_value(false)
}
`,
      })
    const group: ReturnType<typeof prepareCheckRustGroup> = {
        source,
        evaluatorSource,
        requiresRegex: false,
        checks: entries.map((e) => ({
          kind: 'supported',
          entryName: e.entryName,
          inputs: e.inputs,
        })),
      },
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    await pg.exec('CREATE TABLE tsvector_binary_witness(value tsvector)')
    const payload = Buffer.concat([
        Buffer.from('00000001', 'hex'),
        Buffer.from('a'.repeat(2047)),
        Buffer.from('000000', 'hex'),
      ]),
      header = Buffer.alloc(19),
      tuple = Buffer.alloc(6)
    Buffer.from('5047434f50590aff0d0a00', 'hex').copy(header)
    tuple.writeInt16BE(1)
    tuple.writeInt32BE(payload.length, 2)
    await pg.exec("COPY tsvector_binary_witness FROM '/dev/blob' (FORMAT binary)", {
      blob: new Blob([
        new Uint8Array(Buffer.concat([header, tuple, payload, Buffer.from('ffff', 'hex')])),
      ]),
    })
    const binaryWitness = (
      await pg.query<{
        lexemes: number
        rendered: number
        native_bytes: number
        stored_bytes: number
      }>(
        "SELECT length(value) lexemes,length(value::text) rendered,pg_column_size(setweight(value,'D',ARRAY[]::text[])) native_bytes,pg_column_size(value) stored_bytes FROM tsvector_binary_witness",
      )
    ).rows[0]!
    expect(binaryWitness).toMatchObject({ lexemes: 1, rendered: 2049, native_bytes: 2059 })
    await writeFile(
      join(packet, 'binary-boundary.json'),
      JSON.stringify(binaryWitness, null, 2) + '\n',
    )
    const pairs: { left: string | null; right: string | null; deferred?: boolean }[] = [
      { left: 'a', right: 'z', deferred: true },
      { left: 'é', right: 'ê', deferred: true },
      { left: 'a zzz', right: 'aa zz' },
      { left: 'aa zz', right: 'a zzz' },
      { left: 'a', right: 'a' },
      { left: 'a', right: 'bb' },
      { left: 'a:1', right: 'a:2' },
      { left: 'a:1A', right: 'a:1B' },
      { left: 'a', right: 'b:1' },
      { left: 'xx', right: 'a b' },
      { left: 'aa:1 bb', right: 'aa bb:1' },
      { left: 'a:1,2 b:1', right: 'a:1 b:1,2' },
      { left: null, right: 'a' },
      { left: 'a', right: null },
      { left: "'", right: null },
    ]
    await pg.exec(
      'CREATE TEMP TABLE tsvector_compare_input(source text,other text,expected_number int);CREATE TABLE tsvector_compare_checked(source text,other text,expected_number int,CHECK(tsvector_cmp(source::tsvector,other::tsvector) IS NOT DISTINCT FROM expected_number))',
    )
    for (const pair of pairs) {
      await pg.query('DELETE FROM tsvector_compare_input')
      await pg.query('INSERT INTO tsvector_compare_input VALUES($1,$2,NULL)', [
        pair.left,
        pair.right,
      ])
      let value: number | null = null,
        state: string | undefined
      try {
        value = (
          await pg.query<{ value: number | null }>(
            'SELECT tsvector_cmp(source::tsvector,other::tsvector) value FROM tsvector_compare_input',
          )
        ).rows[0]!.value
      } catch (e) {
        state = (e as { code: string }).code
      }
      await pg.query('UPDATE tsvector_compare_input SET expected_number=$1', [value])
      let failure: string | undefined
      try {
        await pg.query('INSERT INTO tsvector_compare_checked SELECT * FROM tsvector_compare_input')
      } catch (e) {
        failure = (e as { code: string }).code
      }
      expect(failure).toBe(state)
      const expected: Outcome = pair.deferred
          ? { kind: 'Unknown' }
          : state
            ? error(state)
            : { kind: 'True' },
        row: Row = {
          source: known(pair.left),
          other: known(pair.right),
          weight: known(65),
          expected_text: known(null),
          expected_number: known(value),
          expected_boolean: known(null),
          bypass: known(false),
        }
      fixtures.push({ name: 'compare', row, expected })
      reference.push({ ...pair, value, state, expected })
    }
    for (const e of entries.slice(1))
      fixtures.push({ name: e.name, row: {}, expected: { kind: 'True' } })
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'model-reference.json'),
      JSON.stringify({ reference, fixtures: fixtures.length }, null, 2) + '\n',
    )
    await runCheckParity(
      root,
      'tsvectormodel',
      group,
      entries.map((e) => e.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 300_000)
