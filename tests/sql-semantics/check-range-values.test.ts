import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { assembleCheckRust } from '../../src/codegen/shared/check-rust-source.js'
import {
  checkTypescriptArtifacts,
  transpileCheckRustFiles,
} from '../../src/codegen/shared/check-rust-transpile.js'
import { functionMetadata } from '../../src/postgres/builtins/inventory.js'
import { PG18_RANGE_TYPES } from '../../src/postgres/builtins/type-ranges.generated.js'
import { arrayElementFamily } from '../../src/codegen/shared/check-array-types.js'
import { rustStringLiteral } from '../../src/codegen/shared/rust-literals.js'
import { writeCheckRustSources } from '../../tools/check-rust/sources.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'

type Cell = { kind: string; value?: string | number | bigint }
type Range =
  | {
      kind: 'Value'
      value: {
        type_name: string
        element_type: string
        element_kind: number
        empty: boolean
        lower_inclusive: boolean
        upper_inclusive: boolean
        bounds: Cell[]
      }
    }
  | { kind: 'Unknown' | 'Null' }
  | { kind: 'Error'; value: { state: number } }

const names = ['isempty', 'lower_inc', 'upper_inc', 'lower_inf', 'upper_inf'] as const
const pascal = (name: string) =>
  name
    .split('_')
    .filter(Boolean)
    .map((s) => s[0]!.toUpperCase() + s.slice(1))
    .join('')
const camel = (name: string) => {
  const s = pascal(name)
  return s[0]!.toLowerCase() + s.slice(1)
}
const rustCell = (cell: Cell): string => {
  if (cell.kind === 'Null' || cell.kind === 'Unknown') return `ArrayElement::${cell.kind}`
  const v =
    typeof cell.value === 'bigint'
      ? cell.value + 'i64'
      : typeof cell.value === 'number'
        ? String(cell.value)
        : `${rustStringLiteral(cell.value as string)}.to_owned()`
  return `ArrayElement::${cell.kind}(${v})`
}
const goCell = (cell: Cell): string =>
  `checkruntime.ArrayElement{Kind:checkruntime.ArrayElement${cell.kind}${cell.value === undefined ? '' : ',' + cell.kind + ':' + (typeof cell.value === 'string' ? JSON.stringify(cell.value) : String(cell.value))}}`
const rustRange = (range: Range): string => {
  if (range.kind === 'Error') return `RangeValue::Error(make_sql_error(${range.value.state}))`
  if (range.kind !== 'Value') return `RangeValue::${range.kind}`
  const p = range.value
  return `make_coerced_range_value(RangePayload {type_name:${rustStringLiteral(p.type_name)}.to_owned(),element_type:${rustStringLiteral(p.element_type)}.to_owned(),element_kind:${p.element_kind},support:range_unknown_support(),empty:${p.empty},lower_inclusive:${p.lower_inclusive},upper_inclusive:${p.upper_inclusive},bounds:vec![${p.bounds.map(rustCell).join(',')}]})`
}
const goRange = (range: Range): string => {
  if (range.kind === 'Error')
    return `checkruntime.RangeValue{Kind:checkruntime.RangeValueError,Error:checkruntime.SqlError{State:${range.value.state}}}`
  if (range.kind !== 'Value')
    return `checkruntime.RangeValue{Kind:checkruntime.RangeValue${range.kind}}`
  const p = range.value
  return `checkruntime.MakeCoercedRangeValue(checkruntime.RangePayload{TypeName:${JSON.stringify(p.type_name)},ElementType:${JSON.stringify(p.element_type)},ElementKind:${p.element_kind},Empty:${p.empty},LowerInclusive:${p.lower_inclusive},UpperInclusive:${p.upper_inclusive},Bounds:[]checkruntime.ArrayElement{${p.bounds.map(goCell).join(',')}}})`
}
const tsPayload = (payload: Extract<Range, { kind: 'Value' }>['value']) => ({
  typeName: payload.type_name,
  elementType: payload.element_type,
  elementKind: payload.element_kind,
  support: { comparison: 0, canonical: 0 },
  empty: payload.empty,
  lowerInclusive: payload.lower_inclusive,
  upperInclusive: payload.upper_inclusive,
  bounds: payload.bounds,
})

it('preserves SQL-coerced range shapes, exact bounds, owned snapshots and structural CHECK outcomes in Rust, Go and TypeScript', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-range-values-'))
  const pg = await PGlite.create()
  const run = promisify(execFile)
  try {
    await pg.exec("SET DateStyle='ISO,YMD'; SET TimeZone='UTC'")
    const cases: Record<string, (string | null)[]> = {
      int4range: [
        null,
        'empty',
        '(,)',
        '[1,10)',
        '[1,1]',
        '(1,1)',
        '(-2147483648,2147483647)',
        '[2147483647,)',
      ],
      int8range: [
        null,
        'empty',
        '(,)',
        '[9007199254740993,9007199254740999)',
        '[-9223372036854775808,9223372036854775807)',
        '(,0]',
      ],
      numrange: [
        null,
        'empty',
        '(,)',
        '[-0.00,1.2300]',
        '(1,1)',
        '[NaN,NaN]',
        '[-Infinity,Infinity]',
        '(,NaN)',
      ],
      daterange: [
        null,
        'empty',
        '(,)',
        '[2000-01-01,2000-01-03]',
        '(2000-01-01,2000-01-01)',
        '[-infinity,infinity]',
        '(,infinity)',
      ],
      tsrange: [
        null,
        'empty',
        '(,)',
        '[2000-01-01 00:00:00.000001,2000-01-01 00:00:00.000002]',
        '[infinity,infinity]',
        '[-infinity,infinity)',
        '(,2000-01-01)',
      ],
      tstzrange: [
        null,
        'empty',
        '(,)',
        '[2000-01-01 00:00:00.000001+02,2000-01-01 00:00:00.000002+02]',
        '[-infinity,infinity]',
        '[infinity,infinity]',
      ],
    }
    const fixtures: {
      input: Range
      flags: { kind: string; value?: boolean | { state: number } }[]
      bounds: Cell[]
    }[] = []
    let inserts = 0
    for (const metadata of Object.values(PG18_RANGE_TYPES)) {
      const short = metadata.identity.slice('pg_catalog.'.length)
      const family = arrayElementFamily(metadata.subtype)!
      const kind = (
        {
          2: 'Int4',
          3: 'Int8',
          4: 'Timestamp',
          5: 'Timestamptz',
          7: 'Date',
          10: 'Numeric',
        } as Record<number, string>
      )[family]!
      const projection = (bound: string) => {
        if (family === 7)
          return `CASE WHEN ${bound}='-infinity'::date THEN '-2147483648' WHEN ${bound}='infinity'::date THEN '2147483647' ELSE (${bound}-DATE '2000-01-01')::text END`
        if (family === 4 || family === 5)
          return `CASE WHEN ${bound}='-infinity'::${metadata.subtype} THEN '-9223372036854775808' WHEN ${bound}='infinity'::${metadata.subtype} THEN '9223372036854775807' ELSE (extract(epoch FROM ${bound})*1000000-946684800000000)::numeric(30,0)::text END`
        return `${bound}::text`
      }
      await pg.exec(
        `CREATE TABLE probe_${short}(span ${metadata.identity},${names.map((n) => 'expected_' + n + ' bool').join(',')},CHECK(${names.map((n) => `${n}(span) IS NOT DISTINCT FROM expected_${n}`).join(' AND ')}))`,
      )
      for (const value of cases[short]!) {
        const row = (
          await pg.query<Record<string, boolean | string | null>>(
            `SELECT ${names.map((n) => `${n}(span) AS ${n}`).join(',')},${projection('lower(span)')} AS lo,${projection('upper(span)')} AS hi FROM (SELECT $1::${metadata.identity} span) q`,
            [value],
          )
        ).rows[0]!
        const bounds = ['lo', 'hi'].map((name): Cell =>
          row[name] === null
            ? { kind: 'Null' }
            : {
                kind,
                value:
                  family === 10
                    ? (row[name] as string)
                    : family === 2 || family === 7
                      ? Number(row[name])
                      : BigInt(row[name] as string),
              },
        )
        const input: Range =
          value === null
            ? { kind: 'Null' }
            : {
                kind: 'Value',
                value: {
                  type_name: metadata.identity,
                  element_type: metadata.subtype,
                  element_kind: family,
                  empty: row['isempty'] as boolean,
                  lower_inclusive: row['lower_inc'] as boolean,
                  upper_inclusive: row['upper_inc'] as boolean,
                  bounds: row['isempty'] ? [] : bounds,
                },
              }
        const flags = names.map((n) =>
          row[n] === null ? { kind: 'Null' } : { kind: 'Value', value: row[n] as boolean },
        )
        fixtures.push({ input, flags, bounds })
        for (const wrong of [false, true]) {
          const expected = names.map((n) => row[n])
          if (wrong) expected[0] = row['isempty'] === null ? false : !row['isempty']
          const parameters = [value, ...expected]
          try {
            await pg.query(
              `INSERT INTO probe_${short} VALUES($1::${metadata.identity},$2,$3,$4,$5,$6)`,
              parameters,
            )
            expect(wrong).toBe(false)
          } catch (error) {
            expect(wrong).toBe(true)
            expect((error as { code: string }).code).toBe('23514')
          }
          inserts++
        }
      }
    }
    for (const input of [
      { kind: 'Unknown' },
      { kind: 'Error', value: { state: 3452582 } },
    ] as Range[])
      fixtures.push({
        input,
        flags: names.map(() =>
          input.kind === 'Error' ? { kind: 'Error', value: input.value } : { kind: 'Unknown' },
        ),
        bounds: [{ kind: 'Unknown' }, { kind: 'Unknown' }],
      })
    const metadata = names.map((name) =>
      functionMetadata(`function:["pg_catalog","${name}"](pg_catalog.anyrange)`),
    )
    const entries = names.map((constraint) =>
      checkRustEntryName({
        schema: 'public',
        kind: 'table',
        owner: 'range_foundation',
        constraint,
      }),
    )
    const evaluator = metadata
      .map(
        (m, i) =>
          `pub fn ${entries[i]}(input: RangeValue) -> CheckOutcome { let value = ${m.rustName}(input); check_from_bool(value) }`,
      )
      .join('\n')
    await writeFile(join(directory, 'evaluators.rs'), evaluator)
    await run('cargo', [
      'run',
      '--quiet',
      '--locked',
      '--manifest-path',
      'tools/check-rust-dialect/Cargo.toml',
      '--',
      join(directory, 'evaluators.rs'),
    ])
    const source = assembleCheckRust({
      source: evaluator,
      callables: metadata.map((m) => m.rustName),
    })
    writeCheckRustSources(join(directory, 'checks.rs'), source)
    const rustExpected = (flag: (typeof fixtures)[number]['flags'][number]) =>
      flag.kind === 'Error'
        ? `BoolValue::Error(make_sql_error(${(flag.value as { state: number }).state}))`
        : flag.kind === 'Value'
          ? `BoolValue::Value(${flag.value})`
          : `BoolValue::${flag.kind}`
    const rustAssertions = fixtures.flatMap((fixture, i) =>
      metadata.map(
        (m, j) =>
          `assert!(${m.rustName}(${rustRange(fixture.input)}) == ${rustExpected(fixture.flags[j]!)},"fixture ${i}/${j}"); assert!(${entries[j]}(${rustRange(fixture.input)}) == check_from_bool(${rustExpected(fixture.flags[j]!)}));`,
      ),
    )
    const boundFunctions = ['sql__pg_catalog__lower__ny7i', 'sql__pg_catalog__upper__4y0a']
    for (const fixture of fixtures.filter((f) => f.input.kind !== 'Error'))
      for (let i = 0; i < 2; i++) {
        const cell = fixture.bounds[i]!
        const prefix =
          cell.kind === 'Unknown' || cell.kind === 'Null' ? 'int8' : cell.kind.toLowerCase()
        rustAssertions.push(
          `assert!(array_element_to_${prefix}(${boundFunctions[i]}(${rustRange(fixture.input)})) == array_element_to_${prefix}(${rustCell(cell)}));`,
        )
      }
    await writeFile(
      join(directory, 'checks_test.rs'),
      `include!("checks.rs");\n#[test] fn ranges_match_postgres(){${rustAssertions.join('\n')}
let mut bounds=vec![ArrayElement::Numeric("1.00".to_owned()),ArrayElement::Numeric("2.00".to_owned())];
let payload=RangePayload{type_name:"pg_catalog.numrange".to_owned(),element_type:"pg_catalog.\\\"numeric\\\"".to_owned(),element_kind:10,support:range_unknown_support(),empty:false,lower_inclusive:true,upper_inclusive:false,bounds:bounds.clone()};
let value=make_coerced_range_value(payload.clone());bounds[0]=ArrayElement::Numeric("99".to_owned());
let saved=range_require_type(value.clone(),"pg_catalog.numrange","pg_catalog.\\\"numeric\\\"",10);
assert!(array_element_to_numeric(range_bound(saved.clone(),false))==make_numeric_value("1.00"));
assert!(matches!(range_require_type(saved.clone(),"other","pg_catalog.\\\"numeric\\\"",10),RangeValue::Unknown));
assert!(matches!(range_require_type(saved.clone(),"pg_catalog.numrange","other",10),RangeValue::Unknown));
assert!(matches!(range_require_type(saved,"pg_catalog.numrange","pg_catalog.\\\"numeric\\\"",2),RangeValue::Unknown));
let mut invalid=payload.clone();invalid.empty=true;assert!(matches!(make_coerced_range_value(invalid),RangeValue::Unknown));
let mut invalid=payload.clone();invalid.bounds.clear();assert!(matches!(make_coerced_range_value(invalid),RangeValue::Unknown));
let mut invalid=payload.clone();invalid.bounds[0]=ArrayElement::Null;assert!(matches!(make_coerced_range_value(invalid),RangeValue::Unknown));
let mut invalid=payload.clone();invalid.bounds[0]=ArrayElement::Int8(1i64);assert!(matches!(make_coerced_range_value(invalid),RangeValue::Unknown));
let mut partial=payload;partial.bounds[0]=ArrayElement::Unknown;
let partial=make_coerced_range_value(partial);assert!(range_bound_flag(partial.clone(),false,true)==BoolValue::Value(false));assert!(matches!(range_bound(partial,false),ArrayElement::Unknown));
}`,
    )
    await run('rustc', [
      '--edition',
      '2021',
      '-Awarnings',
      '--test',
      join(directory, 'checks_test.rs'),
      '-o',
      join(directory, 'rust-test'),
    ])
    await run(join(directory, 'rust-test'), [])
    const split = transpileCheckRustFiles(source, 'rangevalues/pg_catalog')
    for (const [name, content] of Object.entries(split.go)) {
      if (!content) continue
      const path = join(
        directory,
        'go',
        name === 'checks'
          ? 'checks.go'
          : name === 'runtime'
            ? 'checkruntime/runtime.go'
            : name === 'language'
              ? 'langruntime/runtime.go'
              : 'pg_catalog/operations.go',
      )
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, content)
    }
    await writeFile(join(directory, 'go/go.mod'), 'module rangevalues\n\ngo 1.25\n')
    const goExpected = (flag: (typeof fixtures)[number]['flags'][number]) =>
      `checkruntime.BoolValue{Kind:checkruntime.BoolValue${flag.kind}${flag.kind === 'Value' ? ',Value:' + flag.value : flag.kind === 'Error' ? ',Error:checkruntime.SqlError{State:' + (flag.value as { state: number }).state + '}' : ''}}`
    const goAssertions = fixtures.flatMap((fixture, i) =>
      metadata.map(
        (m, j) =>
          `if !reflect.DeepEqual(pg_catalog.${pascal(m.rustName.replace('sql__pg_catalog__', ''))}(${goRange(fixture.input)}),${goExpected(fixture.flags[j]!)}) {t.Fatal("fixture ${i}/${j}")}; if !reflect.DeepEqual(${pascal(entries[j]!)}(${goRange(fixture.input)}),checkruntime.CheckFromBool(${goExpected(fixture.flags[j]!)})) {t.Fatal("entry ${i}/${j}")}`,
      ),
    )
    for (const fixture of fixtures.filter((f) => f.input.kind !== 'Error'))
      for (let i = 0; i < 2; i++)
        goAssertions.push(
          `if !reflect.DeepEqual(pg_catalog.${pascal(boundFunctions[i]!.replace('sql__pg_catalog__', ''))}(${goRange(fixture.input)}),${goCell(fixture.bounds[i]!)}) {t.Fatal("bound")}`,
        )
    await writeFile(
      join(directory, 'go/checks_test.go'),
      `package generated\nimport("testing";"reflect";"rangevalues/checkruntime";"rangevalues/pg_catalog")\nfunc TestRangeValues(t *testing.T){${goAssertions.join('\n')}
bounds:=[]checkruntime.ArrayElement{{Kind:checkruntime.ArrayElementNumeric,Numeric:"1.00"},{Kind:checkruntime.ArrayElementNumeric,Numeric:"2.00"}}
payload:=checkruntime.RangePayload{TypeName:"pg_catalog.numrange",ElementType:"pg_catalog.\\\"numeric\\\"",ElementKind:10,LowerInclusive:true,Bounds:bounds}
value:=checkruntime.MakeCoercedRangeValue(payload);bounds[0].Numeric="99"
saved:=checkruntime.RangeRequireType(value,"pg_catalog.numrange","pg_catalog.\\\"numeric\\\"",10);value.Value.Bounds[0].Numeric="88"
if checkruntime.RangeBound(saved,false).Numeric!="1.00" {t.Fatal("range snapshot alias")}
selected:=checkruntime.RangeBound(saved,false);selected.Numeric="77";if checkruntime.RangeBound(saved,false).Numeric!="1.00" {t.Fatal("extracted bound alias")}
if checkruntime.RangeRequireType(saved,"other","pg_catalog.\\\"numeric\\\"",10).Kind!=checkruntime.RangeValueUnknown {t.Fatal("nominal identity")}
if checkruntime.RangeRequireType(saved,"pg_catalog.numrange","other",10).Kind!=checkruntime.RangeValueUnknown {t.Fatal("subtype identity")}
if checkruntime.RangeRequireType(saved,"pg_catalog.numrange","pg_catalog.\\\"numeric\\\"",2).Kind!=checkruntime.RangeValueUnknown {t.Fatal("subtype family")}
invalid:=payload;invalid.Empty=true;if checkruntime.MakeCoercedRangeValue(invalid).Kind!=checkruntime.RangeValueUnknown {t.Fatal("empty shape")}
invalid=payload;invalid.Bounds=nil;if checkruntime.MakeCoercedRangeValue(invalid).Kind!=checkruntime.RangeValueUnknown {t.Fatal("missing bounds")}
invalid=payload;invalid.Bounds=[]checkruntime.ArrayElement{{Kind:checkruntime.ArrayElementNull},{Kind:checkruntime.ArrayElementNumeric,Numeric:"2"}};if checkruntime.MakeCoercedRangeValue(invalid).Kind!=checkruntime.RangeValueUnknown {t.Fatal("infinite inclusive")}
invalid=payload;invalid.Bounds=[]checkruntime.ArrayElement{{Kind:checkruntime.ArrayElementInt8,Int8:1},{Kind:checkruntime.ArrayElementNumeric,Numeric:"2"}};if checkruntime.MakeCoercedRangeValue(invalid).Kind!=checkruntime.RangeValueUnknown {t.Fatal("bound family")}
partial:=payload;partial.Bounds=[]checkruntime.ArrayElement{{Kind:checkruntime.ArrayElementUnknown},{Kind:checkruntime.ArrayElementNumeric,Numeric:"2"}};p:=checkruntime.MakeCoercedRangeValue(partial);if checkruntime.RangeBound(p,false).Kind!=checkruntime.ArrayElementUnknown || checkruntime.RangeBoundFlag(p,false,true).Value {t.Fatal("finite unavailable bound")}
}`,
    )
    await run('go', ['test', '-p', '1', './...'], { cwd: join(directory, 'go') })
    for (const artifact of checkTypescriptArtifacts(split.typescript)) {
      const path = join(directory, 'typescript', artifact.path)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, artifact.content)
    }
    await run('node_modules/.bin/tsc', [
      '--strict',
      '--noEmit',
      '--skipLibCheck',
      '--target',
      'es2022',
      '--module',
      'esnext',
      '--moduleResolution',
      'bundler',
      join(directory, 'typescript/checks.ts'),
    ])
    const runtime = await import(
      pathToFileURL(join(directory, 'typescript/checkruntime/runtime.ts')).href
    )
    const operations = await import(
      pathToFileURL(join(directory, 'typescript/pg_catalog/operations.ts')).href
    )
    const checks = await import(pathToFileURL(join(directory, 'typescript/checks.ts')).href)
    for (const fixture of fixtures) {
      const input =
        fixture.input.kind === 'Value'
          ? runtime.makeCoercedRangeValue(tsPayload(fixture.input.value))
          : fixture.input
      for (let i = 0; i < metadata.length; i++) {
        expect(
          operations[camel(metadata[i]!.rustName.replace('sql__pg_catalog__', ''))](input),
        ).toEqual(fixture.flags[i])
        const flag = fixture.flags[i]!
        expect(checks[camel(entries[i]!)](input)).toEqual(
          flag.kind === 'Value' ? { kind: flag.value ? 'True' : 'False' } : flag,
        )
      }
      for (let i = 0; i < 2; i++)
        if (fixture.input.kind !== 'Error')
          expect(
            operations[camel(boundFunctions[i]!.replace('sql__pg_catalog__', ''))](input),
          ).toEqual(fixture.bounds[i])
    }
    const payload = {
      type_name: 'pg_catalog.numrange',
      element_type: 'pg_catalog."numeric"',
      element_kind: 10,
      empty: false,
      lower_inclusive: true,
      upper_inclusive: false,
      bounds: [
        { kind: 'Numeric', value: '1.00' },
        { kind: 'Numeric', value: '2.00' },
      ],
    }
    const value = runtime.makeCoercedRangeValue(tsPayload(payload))
    payload.bounds[0]!.value = '99'
    const saved = runtime.rangeRequireType(value, 'pg_catalog.numrange', 'pg_catalog."numeric"', 10)
    value.value.bounds[0].value = '88'
    expect(runtime.rangeBound(saved, false)).toEqual({ kind: 'Numeric', value: '1.00' })
    const selected = runtime.rangeBound(saved, false)
    selected.value = '77'
    expect(runtime.rangeBound(saved, false)).toEqual({ kind: 'Numeric', value: '1.00' })
    for (const [identity, subtype, family] of [
      ['other', 'pg_catalog."numeric"', 10],
      ['pg_catalog.numrange', 'other', 10],
      ['pg_catalog.numrange', 'pg_catalog."numeric"', 2],
    ] as const)
      expect(runtime.rangeRequireType(saved, identity, subtype, family)).toEqual({
        kind: 'Unknown',
      })
    for (const change of [
      { type_name: '' },
      { element_type: '' },
      { element_kind: 0 },
      { empty: true },
      { bounds: [] },
      { bounds: [{ kind: 'Numeric', value: '1' }] },
      { bounds: [{ kind: 'Null' }, { kind: 'Numeric', value: '2' }] },
      {
        bounds: [
          { kind: 'Int8', value: 1n },
          { kind: 'Numeric', value: '2' },
        ],
      },
    ])
      expect(runtime.makeCoercedRangeValue(tsPayload({ ...payload, ...change }))).toEqual({
        kind: 'Unknown',
      })
    const partial = runtime.makeCoercedRangeValue(
      tsPayload({
        ...payload,
        bounds: [{ kind: 'Unknown' }, { kind: 'Numeric', value: '2' }],
      }),
    )
    expect(runtime.rangeBound(partial, false)).toEqual({ kind: 'Unknown' })
    expect(runtime.rangeBoundFlag(partial, false, true)).toEqual({ kind: 'Value', value: false })
    expect(runtime.rangeBound({ kind: 'Error', value: { state: 3452582 } }, false)).toEqual({
      kind: 'Error',
      value: { state: 3452582 },
    })
    expect(fixtures).toHaveLength(44)
    expect(inserts).toBe(84)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180000)
