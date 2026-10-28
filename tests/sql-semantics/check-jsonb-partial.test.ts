import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  assembleCheckRust,
  prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const profiles = [
  { name: 'array', sql: 'jsonb_build_array(n,b)' },
  { name: 'object', sql: "jsonb_build_object('n',n,'b',b)" },
  { name: 'record', sql: 'to_jsonb(ROW(n,b))' },
  { name: 'typed_array', sql: 'to_jsonb(ARRAY[n,m])' },
  { name: 'dimensions', sql: 'to_jsonb(ARRAY[ARRAY[n],ARRAY[m]])' },
  { name: 'nested', sql: "jsonb_build_array(jsonb_build_object('n',n))" },
  { name: 'nested_array', sql: 'jsonb_build_array(ARRAY[n])' },
  { name: 'nested_record', sql: 'jsonb_build_array(ROW(n,b))' },
  { name: 'identity', sql: 'to_jsonb(jsonb_build_array(n))' },
  { name: 'raw_conversion', sql: 'to_json(jsonb_build_array(n))' },
  { name: 'json_cast', sql: 'jsonb_build_array(n)::json' },
  { name: 'text_cast', sql: 'jsonb_build_array(n)::text' },
  { name: 'root_type', sql: 'jsonb_typeof(jsonb_build_array(n))' },
  { name: 'owned_array', sql: 'to_jsonb(ARRAY[jsonb_build_array(n)])' },
  { name: 'owned_record', sql: 'to_jsonb(ROW(jsonb_build_array(n)))' },
  { name: 'raw_record', sql: 'row_to_json(ROW(jsonb_build_array(n)))' },
  { name: 'raw_array', sql: 'to_json(ARRAY[jsonb_build_array(n)])' },
  { name: 'raw_builder', sql: 'json_build_array(jsonb_build_array(n))' },
  { name: 'coalesce', sql: 'COALESCE(jsonb_build_array(n),jsonb_build_object(NULL,m))' },
  { name: 'later_key', sql: "jsonb_build_object('n',n,NULL,m)", error: '22023' },
  { name: 'nested_key', sql: 'jsonb_build_object(jsonb_build_array(n),m)', error: '22023' },
  { name: 'later_conversion', sql: 'jsonb_build_array(n,doc)', conversion: true },
  { name: 'record_conversion', sql: 'to_jsonb(ROW(n,doc))', conversion: true },
  { name: 'later_argument', sql: 'jsonb_build_array(n,1/m)' },
  { name: 'nullable_scalar', sql: 'to_jsonb(n)', unknown: true },
  { name: 'raw_uncertain', sql: 'jsonb_build_array(json_build_array(n))', unknown: true },
] as const
const value = (value: string | number | boolean): Input => ({ kind: 'Value', value })
const unknown: Input = { kind: 'Unknown' }
const error = (code: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})
const packet = 'artifacts/goal-checks/jsonb-partial-active'

it('retains nonnull JSONB builders through owned carriers without hiding conversion errors', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonb-partial-'))
  try {
    await pg.exec(
      `CREATE TABLE partial_jsonb(n integer,m integer,b boolean,doc json,bypass boolean,${profiles.map((p) => `CONSTRAINT "${p.name}" CHECK(CASE WHEN bypass THEN true ELSE (${p.sql}) IS NULL END)`).join(',')})`,
    )
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((t) => t.name === 'partial_jsonb')!
    const names: string[] = []
    const groups = [true, false].map((declared) =>
      prepareCheckRustGroup(
        profiles.flatMap((p) =>
          ['source', 'stored'].map((origin) => {
            const constraint = table.constraints.find((c) => c.name === p.name)!
            const expression = portableCheckAtoms(
              lowerTableCheck(
                table,
                constraint,
                catalog.enums,
                catalog.domains,
                origin as 'source' | 'stored',
                catalog.rangeTypes,
                catalog.compositeTypeGraph,
                origin === 'source'
                  ? `CHECK(CASE WHEN bypass THEN true ELSE (${p.sql}) IS NULL END)`
                  : undefined,
              )!.expression,
            )
            expect(hasUncertain(expression), p.name + origin).toBe(false)
            const name = `${declared}_${p.name}_${origin}`
            names.push(name)
            return {
              identity: {
                schema: 'public',
                kind: 'table' as const,
                owner: table.name,
                constraint: name,
              },
              expression,
            }
          }),
        ),
        declared ? { serverEncoding: 'UTF8', defaultCollation: 'C' } : {},
      ),
    )
    for (const group of groups)
      for (const check of group.checks) expect(check.kind, JSON.stringify(check)).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const observations: unknown[] = []
    const base: Row = { n: unknown, m: value(2), b: unknown, doc: value('1'), bypass: value(false) }
    for (const p of profiles) {
      const add = (row: Row, expected: Outcome) => {
        for (const declared of [true, false])
          for (const origin of ['source', 'stored'])
            fixtures.push({ name: `${declared}_${p.name}_${origin}`, row, expected })
      }
      const expected: Outcome =
        'error' in p ? error(p.error) : 'unknown' in p ? { kind: 'Unknown' } : { kind: 'False' }
      add(base, expected)
      add({ ...base, bypass: value(true) }, { kind: 'True' })
      add({ ...base, n: error('22003') }, error('22003'))
      if ('conversion' in p) {
        add({ ...base, doc: value('"\\u0000"') }, error('22P05'))
        add({ ...base, doc: value('1e1000000') }, error('22003'))
        add({ ...base, doc: unknown }, { kind: 'Unknown' })
      }
      if (p.name === 'later_argument') add({ ...base, m: value(0) }, error('22012'))
      await pg.exec(
        `CREATE TABLE witness_${p.name}(n integer,m integer,b boolean,doc json,bypass boolean,CHECK(CASE WHEN bypass THEN true ELSE (${p.sql}) IS NULL END))`,
      )
      const nativeCases = [
        { n: '1', m: 2, b: 'true', doc: '1' },
        { n: 'NULL', m: 2, b: 'NULL', doc: '1' },
        ...('conversion' in p
          ? [
              { n: '1', m: 2, b: 'true', doc: '"\\u0000"' },
              { n: '1', m: 2, b: 'true', doc: '1e1000000' },
            ]
          : []),
        ...(p.name === 'later_argument' ? [{ n: '1', m: 0, b: 'true', doc: '1' }] : []),
      ]
      for (const c of nativeCases) {
        const docLiteral = `'${c.doc}'::json`
        let actual: Outcome
        try {
          const result = (
            await pg.query<{ value: boolean }>(
              `SELECT (${p.sql}) IS NULL value FROM (SELECT ${c.n}::int n,${c.m}::int m,${c.b}::bool b,${docLiteral} doc) args`,
            )
          ).rows[0]!.value
          actual = { kind: result ? 'True' : 'False' }
        } catch (cause) {
          actual = error((cause as { code: string }).code)
        }
        let code: string | undefined
        try {
          await pg.exec(
            `INSERT INTO witness_${p.name} VALUES(${c.n},${c.m},${c.b},${docLiteral},false)`,
          )
        } catch (cause) {
          code = (cause as { code: string }).code
        }
        expect(code).toBe(
          actual.kind === 'Error'
            ? causeState(actual).toString(36).toUpperCase().padStart(5, '0')
            : actual.kind === 'False'
              ? '23514'
              : undefined,
        )
        await pg.exec(
          `INSERT INTO witness_${p.name} VALUES(${c.n},${c.m},${c.b},${docLiteral},true)`,
        )
        observations.push({ profile: p.name, ...c, actual, code, skippedAccepted: true })
        const row = {
          n: c.n === 'NULL' ? ({ kind: 'Null' } as Input) : value(1),
          m: value(c.m),
          b: c.b === 'NULL' ? ({ kind: 'Null' } as Input) : value(true),
          doc: value(c.doc),
          bypass: value(false),
        }
        for (const origin of ['source', 'stored'])
          fixtures.push({ name: `true_${p.name}_${origin}`, row, expected: actual })
      }
    }
    const evaluatorSource = groups.map((g) => g.evaluatorSource!).join('\n')
    const callables = [
      ...new Set([...evaluatorSource.matchAll(/\b(sql__\w+)\(/gu)].map((m) => m[1]!)),
    ]
    const group = {
      checks: groups.flatMap((g) => g.checks),
      evaluatorSource,
      source: assembleCheckRust({ source: evaluatorSource, callables }),
      requiresRegex: false,
    }
    await mkdir(packet, { recursive: true })
    await writeFile(join(packet, 'observations.json'), JSON.stringify(observations, null, 2) + '\n')
    await runCheckParity(directory, 'pgsid-jsonb-partial', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 360000)
function causeState(outcome: Outcome): number {
  if (outcome.kind === 'Error') return outcome.value.state
  throw new Error('Expected SQL error')
}

it('bounds partial JSONB storage and output before claiming nonnull nested results', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonb-partial-bounds-'))
  const definitions = ['nested', 'later_error', 'dimensions', 'scalar_bound']
  const entries = definitions.map((constraint) =>
    checkRustEntryName({
      schema: 'public',
      kind: 'table',
      owner: 'jsonb_partial_bounds',
      constraint,
    }),
  )
  const helpers = definitions.map((name) => `jsonb_partial_test_${name}`)
  const helperSource = `
pub fn ${helpers[0]}(maximum:Int8Value)->CheckOutcome {
 if let Int8Value::Value(bound)=maximum {
  let initial=make_jsonb_arguments();
  let first=append_jsonb_argument(initial,JsonbInput::JsonbNonNull(bound));
  let result=sql__pg_catalog__jsonb_build_array__gfm5(first);
  let nullness=jsonb_is_null(result);
  return check_from_bool(nullness);
 };
 check_unknown()
}
pub fn ${helpers[1]}(maximum:Int8Value)->CheckOutcome {
 if let Int8Value::Value(bound)=maximum {
  let initial=make_jsonb_arguments();
  let first=append_jsonb_argument(initial,JsonbInput::JsonbNonNull(bound));
  let error=make_sql_error(${parseInt('22003', 36)});
  let second=append_jsonb_argument(first,JsonbInput::ConvertedError(error));
  let result=sql__pg_catalog__jsonb_build_array__gfm5(second);
  let nullness=jsonb_is_null(result);
  return check_from_bool(nullness);
 };
 check_unknown()
}
pub fn ${helpers[2]}(maximum:Int8Value)->CheckOutcome {
 if let Int8Value::Value(bound)=maximum {
  let mut dimensions:Vec<ArrayDimension>=Vec::new();
  dimensions.push(ArrayDimension{lower:1,length:2});
  dimensions.push(ArrayDimension{lower:1,length:1});
  let mut elements:Vec<ArrayElement>=Vec::new();
  elements.push(ArrayElement::JsonbNonNull(bound));
  elements.push(ArrayElement::JsonbNonNull(bound));
  let mut values:Vec<JsonbInput>=Vec::new();
  values.push(JsonbInput::JsonbNonNull(bound));
  values.push(JsonbInput::JsonbNonNull(bound));
  let input=JsonbArrayInputPayload{state:1,error:make_sql_error(0),dimensions:dimensions,elements:elements,values:values,position:2};
  let result=jsonb_array_input_value(input);
  let nullness=jsonb_is_null(result);
  return check_from_bool(nullness);
 };
 check_unknown()
}
pub fn ${helpers[3]}(maximum:Int8Value)->CheckOutcome {
 if let Int8Value::Value(bytes)=maximum {
  let bound=jsonb_partial_scalar_bound();
  let result=make_bool_value(bound>=bytes);
  return check_from_bool(result);
 };
 check_unknown()
}`
  const evaluatorSource = entries
    .map(
      (entry, index) =>
        `pub fn ${entry}(maximum:Int8Value)->CheckOutcome { ${helpers[index]}(maximum) }`,
    )
    .join('\n')
  const source = assembleCheckRust({
    source: evaluatorSource,
    callables: ['sql__pg_catalog__jsonb_build_array__gfm5'],
  })
  source.modules
    .find((module) => module.name === 'pg_catalog')!
    .files.push({ path: 'test/jsonb_partial_bounds.rs', source: helperSource })
  const group: ReturnType<typeof prepareCheckRustGroup> = {
    source,
    evaluatorSource,
    requiresRegex: false,
    checks: entries.map((entryName) => ({
      kind: 'supported',
      entryName,
      inputs: [
        { name: 'maximum', rustName: 'maximum', rustType: 'Int8Value', type: 'pg_catalog.int8' },
      ],
    })),
  }
  const fixtures: { name: string; row: Row; expected: Outcome }[] = []
  const add = (name: string, bound: bigint, expected: Outcome) =>
    fixtures.push({ name, row: { maximum: { kind: 'Value', value: bound } }, expected })
  add('nested', 100n, { kind: 'False' })
  add('nested', 268435435n, { kind: 'False' })
  add('nested', 268435436n, { kind: 'Unknown' })
  add('nested', 9223372036854775807n, { kind: 'Unknown' })
  add('later_error', 268435455n, error('22003'))
  add('dimensions', 100n, { kind: 'False' })
  add('dimensions', 134217707n, { kind: 'Unknown' })
  try {
    const sizes = (
      await pg.query<{ rendered: number; stored: number }>(
        `SELECT octet_length(to_jsonb(n)::text) rendered,pg_column_size(to_jsonb(n)) stored FROM (SELECT (repeat('9',131072)||'.'||repeat('9',16383))::numeric n) value`,
      )
    ).rows[0]!
    add('scalar_bound', BigInt(sizes.rendered), { kind: 'True' })
    add('scalar_bound', BigInt(sizes.stored), { kind: 'True' })
    await mkdir(packet, { recursive: true })
    await writeFile(join(packet, 'numeric-bound.json'), JSON.stringify(sizes, null, 2) + '\n')
    await runCheckParity(directory, 'pgsid-jsonb-partial-bounds', group, definitions, fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180000)
