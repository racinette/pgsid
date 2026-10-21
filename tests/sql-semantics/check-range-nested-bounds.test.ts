import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  assembleCheckRust,
  type prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import { rustStringLiteral } from '../../src/codegen/shared/rust-literals.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { runCheckParity, type Outcome } from '../../tools/check-rust/parity.js'
import {
  rangeRustCell,
  type RangeInputCell,
  type RangeInputPayload,
  type RangeInputBoundProfile,
} from '../../tools/check-rust/range-input.js'
import { customRangeProfiles } from './check-custom-range-fixtures.js'
import { readRangeFixture } from './check-range-fixtures.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'
import { readMultirangeArrayFixture } from './check-multirange-array-fixtures.js'
import { readRangeArrayFixture, rangeArrayText } from './check-range-array-fixtures.js'

const json = (value: unknown) =>
  JSON.stringify(value, (_, v) => (typeof v === 'bigint' ? v.toString() + 'n' : v))
type Profile = {
  name: string
  subtype: string
  kind: number
  nodes: RangeInputBoundProfile[]
  samples: (string | null)[]
  read: (text: string) => Promise<RangeInputCell>
  opaque?: boolean
}
const node = (
  typeName: string,
  kind: number,
  comparison = kind,
  elementType = '',
  child = 0,
  canonical = 1,
  labels?: string[],
): RangeInputBoundProfile => ({
  typeName,
  kind,
  comparison,
  canonical,
  missingComparison: false,
  elementType,
  child,
  enumLabels: labels?.join('\0') ?? '',
  enumCount: labels?.length ?? -1,
})

it('owns nested range and multirange bounds through constructors, comparisons, sets, formatting and independent snapshots against native PostgreSQL', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-range-nested-bounds-'))
  try {
    await pg.exec(`CREATE TYPE phase AS ENUM('z','a');ALTER TYPE phase ADD VALUE 'mid' BEFORE 'a';CREATE TYPE phase_span AS RANGE(subtype=phase,multirange_type_name=phase_set);
CREATE TYPE document_span AS RANGE(subtype=json[],multirange_type_name=document_set);
CREATE FUNCTION reverse(integer,integer) RETURNS integer LANGUAGE sql IMMUTABLE STRICT AS 'SELECT btint4cmp($2,$1)';
CREATE OPERATOR CLASS reverse_ops FOR TYPE integer USING btree AS OPERATOR 1 >,OPERATOR 2 >=,OPERATOR 3 =,OPERATOR 4 <=,OPERATOR 5 <,FUNCTION 1 reverse(integer,integer);
CREATE TYPE reverse_span AS RANGE(subtype=integer,subtype_opclass=reverse_ops,multirange_type_name=reverse_set);
CREATE DOMAIN admitted_span AS int4range;
CREATE TYPE ranges_span AS RANGE(subtype=int4range,multirange_type_name=ranges_set);`)
    const catalog = await snapshotCatalog(pg),
      captured = customRangeProfiles(catalog),
      leaf = (name: string) => captured.find((p) => p.name === name)!
    const readRange = async (
      type: Parameters<typeof readRangeFixture>[3],
      sql: string,
      text: string,
    ): Promise<RangeInputCell> => ({
      kind: 'Range',
      value: (await readRangeFixture(pg, `SELECT $1::${sql} span`, 'span', type, [text]))!,
    })
    const rnodes = [
      node('pg_catalog.int4range', 42, 42, 'pg_catalog.int4', 1, 2),
      node('pg_catalog.int4', 2),
    ]
    const profiles: Profile[] = [
      {
        name: 'ranges',
        subtype: 'pg_catalog.int4range',
        kind: 42,
        nodes: rnodes,
        samples: [null, 'empty', '(,)', '[1,3]', '[4,6]'],
        read: (t) => readRange('pg_catalog.int4range', 'pg_catalog.int4range', t),
      },
      {
        name: 'numbers',
        subtype: 'pg_catalog.numrange',
        kind: 42,
        nodes: [
          node('pg_catalog.numrange', 42, 42, 'pg_catalog."numeric"', 1),
          node('pg_catalog."numeric"', 10),
        ],
        samples: [null, 'empty', '(,)', '[1.00,3.0]', '[4.000,6]'],
        read: (t) => readRange('pg_catalog.numrange', 'pg_catalog.numrange', t),
      },
      {
        name: 'sets',
        subtype: 'pg_catalog.int4multirange',
        kind: 43,
        nodes: [
          node('pg_catalog.int4multirange', 43, 43, 'pg_catalog.int4range', 1),
          node('pg_catalog.int4range', 42, 42, 'pg_catalog.int4', 2, 2),
          node('pg_catalog.int4', 2),
        ],
        samples: [null, '{}', '{(,)}', '{[1,3],[7,9]}', '{[4,6]}'],
        read: async (t) => ({
          kind: 'Multirange',
          value: (await readMultirangeFixture(pg, 'pg_catalog.int4multirange', t))!,
        }),
      },
      {
        name: 'phases',
        subtype: 'public.phase_span',
        kind: 42,
        nodes: [
          node('public.phase_span', 42, 42, 'public.phase', 1),
          node('public.phase', 6, 6, '', 0, 1, ['z', 'mid', 'a']),
        ],
        samples: [null, 'empty', '(,)', '[z,mid]', '[mid,a]'],
        read: (t) => readRange(leaf('phase_span').rangeType, 'public.phase_span', t),
      },
      {
        name: 'arrays',
        subtype: 'pg_catalog._int4range',
        kind: 41,
        nodes: [
          node('pg_catalog._int4range', 41, 41, 'pg_catalog.int4range', 1),
          node('pg_catalog.int4range', 42, 42, 'pg_catalog.int4', 2, 2),
          node('pg_catalog.int4', 2),
        ],
        samples: [
          null,
          '{}',
          '{NULL}',
          rangeArrayText(['empty', '[1,3]'], -2),
          rangeArrayText(['[4,6]']),
        ],
        read: async (t) => ({
          kind: 'Array',
          value: (await readRangeArrayFixture(pg, 'pg_catalog.int4range', t))!,
        }),
      },
      {
        name: 'domains',
        subtype: 'public.admitted_span',
        kind: 42,
        nodes: rnodes,
        samples: [null, 'empty', '(,)', '[1,3]', '[4,6]'],
        read: (t) => readRange('pg_catalog.int4range', 'public.admitted_span', t),
      },
      {
        name: 'documents',
        subtype: 'public.document_span',
        kind: 42,
        nodes: [
          node('public.document_span', 42, 42, 'pg_catalog._json', 1),
          node('pg_catalog._json', 41, 41, 'pg_catalog."json"', 2),
          { ...node('pg_catalog."json"', 11, 0), missingComparison: true },
        ],
        samples: [null, 'empty', '(,)', '[{},)', '[{NULL},)'],
        read: (t) => readRange(leaf('document_span').rangeType, 'public.document_span', t),
      },
      {
        name: 'opaque',
        subtype: 'public.reverse_span',
        kind: 42,
        nodes: [
          node('public.reverse_span', 42, 42, 'pg_catalog.int4', 1),
          node('pg_catalog.int4', 2, 0),
        ],
        samples: [null, 'empty', '(,)', '[3,1]', '[4,2]'],
        opaque: true,
        read: (t) => readRange(leaf('reverse_span').rangeType, 'public.reverse_span', t),
      },
    ]
    const readOuter = async (p: Profile, text: string): Promise<RangeInputPayload> => {
      const r = (
        await pg.query<{
          empty: boolean
          lo: boolean
          hi: boolean
          lower: string | null
          upper: string | null
        }>(
          `SELECT isempty(v) empty,lower_inc(v) lo,upper_inc(v) hi,lower(v)::text lower,upper(v)::text upper FROM(SELECT $1::public.${p.name}_span v)s`,
          [text],
        )
      ).rows[0]!
      const cell = async (t: string | null): Promise<RangeInputCell> =>
        t === null ? { kind: 'Null' } : p.read(t)
      return {
        typeName: `public.${p.name}_span`,
        elementType: p.subtype,
        elementKind: p.kind,
        support: { comparison: p.kind, canonical: 1 },
        boundProfile: { nodes: p.nodes },
        empty: r.empty,
        lowerInclusive: r.lo,
        upperInclusive: r.hi,
        bounds: r.empty ? [] : [await cell(r.lower), await cell(r.upper)],
      }
    }
    profiles.push({
      name: 'deep',
      subtype: 'public.ranges_span',
      kind: 42,
      nodes: [
        node('public.ranges_span', 42, 42, 'pg_catalog.int4range', 1),
        node('pg_catalog.int4range', 42, 42, 'pg_catalog.int4', 2, 2),
        node('pg_catalog.int4', 2),
      ],
      samples: [null, 'empty', '(,)', '[empty,)', '["[1,3)",)'],
      read: async (t) => ({ kind: 'Range', value: await readOuter(profiles[0]!, t) }),
    })
    profiles.push(
      {
        name: 'document_arrays',
        subtype: 'public._document_span',
        kind: 41,
        nodes: [
          node('public._document_span', 41, 41, 'public.document_span', 1),
          node('public.document_span', 42, 42, 'pg_catalog._json', 2),
          node('pg_catalog._json', 41, 41, 'pg_catalog."json"', 3),
          { ...node('pg_catalog."json"', 11, 0), missingComparison: true },
        ],
        samples: [null, '{}', '{NULL}', rangeArrayText(['empty']), rangeArrayText(['[{},)'])],
        read: async (t) => ({
          kind: 'Array',
          value: (await readRangeArrayFixture(pg, leaf('document_span').rangeType, t))!,
        }),
      },
      {
        name: 'multi_arrays',
        subtype: 'pg_catalog._int4multirange',
        kind: 41,
        nodes: [
          node('pg_catalog._int4multirange', 41, 41, 'pg_catalog.int4multirange', 1),
          node('pg_catalog.int4multirange', 43, 43, 'pg_catalog.int4range', 2),
          node('pg_catalog.int4range', 42, 42, 'pg_catalog.int4', 3, 2),
          node('pg_catalog.int4', 2),
        ],
        samples: [
          null,
          '{}',
          '{NULL}',
          rangeArrayText(['{}', '{[1,3]}'], -2),
          rangeArrayText(['{[4,6]}']),
        ],
        read: async (t) => ({
          kind: 'Array',
          value: (await readMultirangeArrayFixture(pg, 'pg_catalog.int4multirange', t))!,
        }),
      },
    )
    for (const p of profiles)
      if (p.name !== 'ranges')
        await pg.exec(
          `CREATE TYPE ${p.name}_span AS RANGE(subtype=${p.subtype},multirange_type_name=${p.name}_set)`,
        )
    const builders: string[] = [],
      cells = new Map<string, string>(),
      spans = new Map<string, string>()
    const context = (p: Profile) => `nested_profile_${p.name}()`
    for (const p of profiles)
      builders.push(
        `fn nested_profile_${p.name}()->RangeBoundContext{let mut profile=empty_range_bound_context();${p.nodes.map((n) => `profile=append_range_bound_profile_with_canonical(profile,${rustStringLiteral(n.typeName)},${n.kind},${n.comparison},${n.canonical ?? 1},${n.missingComparison},${rustStringLiteral(n.elementType)},${n.child},${rustStringLiteral(n.enumLabels)},${n.enumCount});`).join('\n')}profile}`,
      )
    const contexts = new Map<string, string>()
    const profileSource = (nodes: RangeInputBoundProfile[]): string => {
      if (!nodes.length) return 'empty_range_bound_context()'
      const key = json(nodes)
      let name = contexts.get(key)
      if (!name) {
        name = 'nested_context_' + contexts.size
        contexts.set(key, name)
        builders.push(
          `fn ${name}()->RangeBoundContext{let mut profile=empty_range_bound_context();${nodes.map((n) => `profile=append_range_bound_profile_with_canonical(profile,${rustStringLiteral(n.typeName)},${n.kind},${n.comparison},${n.canonical ?? 1},${n.missingComparison},${rustStringLiteral(n.elementType)},${n.child},${rustStringLiteral(n.enumLabels)},${n.enumCount});`).join('\n')}profile}`,
        )
      }
      return name + '()'
    }
    const payloads = new Map<string, string>()
    const spanPayloadSource = (payload: RangeInputPayload): string => {
      const key = json(payload)
      let name = payloads.get(key)
      if (!name) {
        name = 'nested_owned_' + payloads.size
        payloads.set(key, name)
        const lo = payload.empty ? 'ArrayElement::Null' : cellSource(payload.bounds[0]!),
          hi = payload.empty ? 'ArrayElement::Null' : cellSource(payload.bounds[1]!)
        const support = payload.support
          ? `make_range_support(${payload.support.comparison},${payload.support.canonical})`
          : `range_builtin_support(${rustStringLiteral(payload.typeName)},${rustStringLiteral(payload.elementType)},${payload.elementKind})`
        builders.push(
          `fn ${name}()->RangeValue{range_from_typed_bounds(${rustStringLiteral(payload.typeName)},${rustStringLiteral(payload.elementType)},${payload.elementKind},${payload.empty},${payload.lowerInclusive},${payload.upperInclusive},${lo},${hi},${support},${rustStringLiteral(payload.enumLabels ?? '')},${payload.enumCount ?? -1},${profileSource(payload.boundProfile?.nodes ?? [])})}`,
        )
      }
      return name + '()'
    }
    const cellSource = (payload: RangeInputCell): string => {
      const key = json(payload)
      let name = cells.get(key)
      if (!name) {
        name = 'nested_cell_' + cells.size
        cells.set(key, name)
        let expression: string
        if (payload.kind === 'Range')
          expression = `array_element_from_range(${spanPayloadSource(payload.value)})`
        else if (payload.kind === 'Multirange') {
          const v = payload.value,
            support = v.support
              ? `make_range_support(${v.support.comparison},${v.support.canonical})`
              : `range_builtin_support(${rustStringLiteral(v.rangeType)},${rustStringLiteral(v.elementType)},${v.elementKind})`
          expression = `let mut ranges:Vec<RangeValue>=Vec::new();${v.ranges.map((r) => `ranges.push(${r.kind === 'Value' ? spanPayloadSource(r.value) : r.kind === 'Error' ? `RangeValue::Error(make_sql_error(${r.value.state}))` : `RangeValue::${r.kind}`});`).join('\n')}array_element_from_multirange(multirange_from_profiled_ranges(${rustStringLiteral(v.typeName)},${rustStringLiteral(v.rangeType)},${rustStringLiteral(v.elementType)},${v.elementKind},ranges,${support}))`
        } else if (payload.kind === 'Array') {
          const v = payload.value
          expression = `let mut args=make_array_arguments(${rustStringLiteral(v.elementType)},${v.elementKind});${v.dimensions.map((d) => `args=append_array_dimension(args,${d.lower},${d.length});`).join('\n')}${v.elements.map((c) => `args=append_array_argument(args,${cellSource(c)});`).join('\n')}array_element_from_array(finish_array_arguments(args))`
        } else expression = rangeRustCell(payload)
        builders.push(`fn ${name}()->ArrayElement{${expression}}`)
      }
      return name + '()'
    }
    const bound = async (p: Profile, text: string | null) =>
      text === null ? 'ArrayElement::Null' : cellSource(await p.read(text))
    const construct = async (
      p: Profile,
      a: string | null,
      b: string | null,
      flags: string | null,
    ) =>
      `range_construct_typed("public.${p.name}_span",${rustStringLiteral(p.subtype)},${p.kind},${await bound(p, a)},${await bound(p, b)},${flags === null ? 'TextValue::Null' : `make_text_value(${rustStringLiteral(flags)})`},make_range_support(${p.kind},1),"",-1,${context(p)})`
    const span = async (p: Profile, text: string) => {
      const key = p.name + '\0' + text
      let name = spans.get(key)
      if (!name) {
        name = 'nested_span_' + spans.size
        spans.set(key, name)
        builders.push(`fn ${name}()->RangeValue{${spanPayloadSource(await readOuter(p, text))}}`)
      }
      return name + '()'
    }
    const cases: { rust: string; expected: Outcome; reference?: unknown }[] = []
    const nativeText = async (sql: string, args: unknown[], rust: string, defer = false) => {
      try {
        const v = (await pg.query<{ value: string | null }>(sql, args)).rows[0]!.value
        cases.push({
          rust: `sql__pg_catalog__texteq__aet8(${rust},${v === null ? 'TextValue::Null' : `make_text_value(${rustStringLiteral(v)})`})`,
          expected: defer ? { kind: 'Unknown' } : { kind: v === null ? 'Null' : 'True' },
          reference: { sql, args, value: v, defer },
        })
      } catch (e) {
        const code = (e as { code: string }).code
        if (!code) throw e
        cases.push({
          rust: `sql__pg_catalog__texteq__aet8(${rust},make_text_value(""))`,
          expected: defer
            ? { kind: 'Unknown' }
            : { kind: 'Error', value: { state: parseInt(code, 36) } },
          reference: { sql, args, error: code, defer },
        })
      }
    }
    let inserts = 0
    for (const p of profiles) {
      const values = p.samples
      await nativeText(
        `SELECT NULL::${p.name}_span::text value`,
        [],
        `range_to_text(range_from_coerced_typed_profile(RangeValue::Null,"public.${p.name}_span",${rustStringLiteral(p.subtype)},${p.kind},${p.kind},1,${context(p)}))`,
      )
      for (const [i, a] of values.entries())
        for (const b of [a, values[(i + 1) % values.length]!])
          for (const flags of ['[]', '[)', '()']) {
            const opaque =
              p.opaque &&
              a !== null &&
              b !== null &&
              !['empty', '(,)'].includes(a) &&
              !['empty', '(,)'].includes(b)
            await nativeText(
              `SELECT ${p.name}_span($1::${p.subtype},$2::${p.subtype},$3)::text value`,
              [a, b, flags],
              `range_to_text(${await construct(p, a, b, flags)})`,
              opaque,
            )
          }
      for (const flags of [null, 'bad'])
        await nativeText(
          `SELECT ${p.name}_span(NULL,NULL,$1)::text value`,
          [flags],
          `range_to_text(${await construct(p, null, null, flags)})`,
        )
      if (p.opaque) continue
      const texts = [
        'empty',
        '(,)',
        ...(await Promise.all(
          [values[3]!, values[4]!].map(
            async (a) =>
              (
                await pg.query<{ value: string }>(
                  `SELECT ${p.name}_span($1::${p.subtype},NULL,'[]')::text value`,
                  [a],
                )
              ).rows[0]!.value,
          ),
        )),
      ]
      for (const [i, left] of texts.entries()) {
        const l = await span(p, left)
        for (const method of ['stored', 'runtime'] as const) {
          const raw = await readOuter(p, left),
            lower = raw.empty ? 'ArrayElement::Null' : cellSource(raw.bounds[0]!),
            upper = raw.empty ? 'ArrayElement::Null' : cellSource(raw.bounds[1]!)
          await nativeText(
            `SELECT $1::${p.name}_span::text value`,
            [left],
            `range_to_text(finish_range_${method === 'stored' ? 'stored_' : ''}text_typed(prepare_range_text(make_text_value(${rustStringLiteral(left)})),"public.${p.name}_span",${rustStringLiteral(p.subtype)},${p.kind},make_range_support(${p.kind},1),${lower},${upper},${context(p)}))`,
          )
        }
        for (const right of [left, texts[(i + 1) % texts.length]!]) {
          const r = await span(p, right)
          for (const [op, fn] of [
            ['=', 'range_eq__loxq'],
            ['<', 'range_lt__t1sv'],
            ['&&', 'range_overlaps__38jd'],
            ['@>', 'range_contains__ut37'],
            ['-|-', 'range_adjacent__03u0'],
          ]) {
            let expected: Outcome
            try {
              const value = (
                await pg.query<{ value: boolean }>(
                  `SELECT $1::${p.name}_span ${op} $2::${p.name}_span value`,
                  [left, right],
                )
              ).rows[0]!.value
              expected = { kind: value ? 'True' : 'False' }
            } catch (e) {
              const code = (e as { code: string }).code
              if (!code) throw e
              expected = { kind: 'Error', value: { state: parseInt(code, 36) } }
            }
            cases.push({
              rust: `sql__pg_catalog__${fn}(${l},${r})`,
              expected,
              reference: { profile: p.name, left, right, op },
            })
          }
          for (const [op, fn] of [
            ['+', 'range_union__8koj'],
            ['*', 'range_intersect__4pce'],
            ['-', 'range_minus__f67g'],
          ])
            await nativeText(
              `SELECT ($1::${p.name}_span ${op} $2::${p.name}_span)::text value`,
              [left, right],
              `range_to_text(sql__pg_catalog__${fn}(${l},${r}))`,
            )
          await nativeText(
            `SELECT ${p.name}_set($1::${p.name}_span,$2::${p.name}_span)::text value`,
            [left, right],
            `multirange_to_text(nested_multi(${l},${r},"public.${p.name}_set","public.${p.name}_span",${rustStringLiteral(p.subtype)},${p.kind}))`,
          )
        }
      }
      await pg.exec(
        `CREATE TABLE ${p.name}_probe(v ${p.name}_span,expected text,CHECK(v::text IS NOT DISTINCT FROM expected))`,
      )
      const witness = texts[2]!,
        owned = await span(p, witness)
      await pg.query(`INSERT INTO ${p.name}_probe VALUES($1,$2)`, [witness, witness])
      inserts++
      await expect(
        pg.query(`INSERT INTO ${p.name}_probe VALUES($1,$2)`, [witness, 'wrong']),
      ).rejects.toMatchObject({ code: '23514' })
      inserts++
      await pg.query(`INSERT INTO ${p.name}_probe VALUES(NULL,NULL)`)
      inserts++
      cases.push({
        rust: `sql__pg_catalog__texteq__aet8(range_to_text(${owned}),make_text_value("wrong"))`,
        expected: { kind: 'False' },
      })
    }
    const deep = profiles.find((p) => p.name === 'deep')!,
      deepText = (
        await pg.query<{ value: string }>(
          `SELECT deep_span($1::ranges_span,NULL,'[]')::text value`,
          ['["[1,3)",)'],
        )
      ).rows[0]!.value
    const sample = await span(deep, deepText),
      expectedText = rustStringLiteral(deepText)
    cases.push({ rust: 'nested_snapshot()', expected: { kind: 'True' } })
    cases.push({
      rust: 'nested_scalar_error_order()',
      expected: { kind: 'Error', value: { state: parseInt('22003', 36) } },
    })
    for (const mode of [0, 1, 2, 3])
      cases.push({ rust: `nested_invalid(${mode})`, expected: { kind: 'Unknown' } })
    const emptySet = await bound(
      profiles.find((p) => p.name === 'sets')!,
      '{}',
    )
    const range = profiles[0]!,
      good = await bound(range, '[1,3]')
    for (const mode of [0, 1, 2, 3])
      cases.push({
        rust: `nested_forged(${mode})`,
        expected:
          mode === 0
            ? { kind: 'False' }
            : mode === 1
              ? { kind: 'Unknown' }
              : mode === 2
                ? { kind: 'Error', value: { state: parseInt('22003', 36) } }
                : { kind: 'False' },
      })
    const identity = {
        schema: 'public',
        kind: 'table' as const,
        owner: 'nested_bound_ranges',
        constraint: 'probe',
      },
      entryName = checkRustEntryName(identity),
      evaluatorSource = `pub fn ${entryName}(mode:Int4Value)->CheckOutcome {let result=nested_probe(mode);check_from_bool(result)}`
    const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.push({
        path: 'tests/nested_bound_ranges.rs',
        source: `
${builders.join('\n')}
fn nested_multi(left:RangeValue,right:RangeValue,multi:&str,span:&str,subtype:&str,kind:i32)->MultirangeValue {
 let mut input=make_array_arguments(span,42);input=append_array_argument(input,array_element_from_range(right));input=append_array_argument(input,array_element_from_range(left));
 multirange_construct_array_with_support(finish_array_constructor(input),multi,span,subtype,kind,make_range_support(kind,1))
}
fn nested_snapshot()->BoolValue {
 let original=${sample};let saved=original.clone();
 if let RangeValue::Value(payload)=original {
  let mut nodes=payload.bound_profile.nodes;let root=nodes[0].clone();nodes[0]=RangeBoundProfile{type_name:root.type_name,kind:root.kind,comparison:0,canonical:0,missing_comparison:false,element_type:root.element_type,child:root.child,enum_labels:root.enum_labels,enum_count:root.enum_count};
  let bound=payload.bounds[0].clone();if let ArrayElement::Range(inner)=bound{let mut bounds=inner.bounds;bounds[0]=ArrayElement::Unknown;};
  let mut outer=payload.bounds;outer[0]=ArrayElement::Unknown;
  if let RangeValue::Value(before)=saved {
   if before.bound_profile.nodes[0].comparison!=42 || before.bound_profile.nodes[0].canonical!=1 {return BoolValue::Value(false);};
   return sql__pg_catalog__texteq__aet8(range_to_text(RangeValue::Value(before)),make_text_value(${expectedText}));
  };
 };BoolValue::Value(false)
}
fn nested_scalar_error_order()->BoolValue {
 let mut nodes=empty_range_bound_context();nodes=append_range_bound_profile(nodes,"public._phase",41,41,false,${rustStringLiteral('enum:["public","phase"]')},1,"",-1);nodes=append_range_bound_profile(nodes,"public.phase",6,6,false,"",0,${rustStringLiteral('z\0mid\0a')},3);
 let mut dimensions:Vec<ArrayDimension>=Vec::new();dimensions.push(ArrayDimension{lower:1,length:2});
 let mut elements:Vec<ArrayElement>=Vec::new();elements.push(ArrayElement::Enum(EnumPayload{ordinal:999,label_oid:0i64}));elements.push(ArrayElement::Error(make_sql_error(${parseInt('22003', 36)})));
 let input=ArrayElement::Array(ArrayPayload{null_bitmap:BoolValue::Value(false),element_type:${rustStringLiteral('enum:["public","phase"]')}.to_owned(),element_kind:6,dimensions,elements});
 let actual=range_construct_typed("public.scalar_array_span","public._phase",41,input,ArrayElement::Null,make_text_value("[]"),make_range_support(41,1),"",-1,nodes);
 range_is_null(actual)
}
fn nested_invalid(mode:i32)->BoolValue {
 let mut profile=nested_profile_sets();let root=profile.nodes[0].clone();let mut canonical=root.canonical;let mut element=root.element_type;let mut child=root.child;
 if mode==0 {canonical=2;};if mode==1 {element="public.other".to_owned();};if mode==2 {child=2;};
 profile.nodes[0]=RangeBoundProfile{type_name:root.type_name,kind:root.kind,comparison:root.comparison,canonical,missing_comparison:false,element_type:element,child,enum_labels:root.enum_labels,enum_count:root.enum_count};
 if mode==3 {let member=profile.nodes[1].clone();profile.nodes[1]=RangeBoundProfile{type_name:member.type_name,kind:member.kind,comparison:member.comparison,canonical:3,missing_comparison:false,element_type:member.element_type,child:member.child,enum_labels:member.enum_labels,enum_count:member.enum_count};};
 let actual=range_construct_typed("public.sets_span","pg_catalog.int4multirange",43,${emptySet},ArrayElement::Null,make_text_value("[]"),make_range_support(43,1),"",-1,profile);range_is_null(actual)
}
fn nested_forged(mode:i32)->BoolValue {
 let original=${good};
 if let ArrayElement::Range(payload)=original {
  let mut name=payload.type_name;let mut bounds=payload.bounds;
  if mode==1 {name="public.other".to_owned();};
  if mode==2 {bounds[0]=ArrayElement::Error(make_sql_error(${parseInt('22003', 36)}));};
  if mode==3 {bounds[0]=ArrayElement::Unknown;};
  let forged=ArrayElement::Range(RangePayload{type_name:name,element_type:payload.element_type,element_kind:payload.element_kind,enum_labels:"forged".to_owned(),enum_count:999,bound_profile:empty_range_bound_context(),support:make_range_support(99,99),empty:payload.empty,lower_inclusive:payload.lower_inclusive,upper_inclusive:payload.upper_inclusive,bounds});
  let actual=range_construct_typed("public.ranges_span","pg_catalog.int4range",42,forged,ArrayElement::Null,make_text_value("[]"),make_range_support(42,1),"",-1,nested_profile_ranges());
  return range_is_null(actual);
 };BoolValue::Value(false)
}
${Array.from(
  { length: Math.ceil(cases.length / 96) },
  (_, i) =>
    `fn nested_group_${i}(mode:i32)->BoolValue {${cases
      .slice(i * 96, (i + 1) * 96)
      .map((c, j) => `if mode==${i * 96 + j} {return ${c.rust};};`)
      .join('\n')}BoolValue::Unknown}`,
).join('\n')}
pub fn nested_probe(input:Int4Value)->BoolValue {if let Int4Value::Value(mode)=input{${Array.from({ length: Math.ceil(cases.length / 96) }, (_, i) => `if mode<${(i + 1) * 96} {return nested_group_${i}(mode);};`).join('\n')}};BoolValue::Unknown}
`,
      })
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      source,
      evaluatorSource,
      requiresRegex: false,
      checks: [
        {
          kind: 'supported',
          entryName,
          inputs: [
            { name: 'mode', rustName: 'mode', type: 'pg_catalog.int4', rustType: 'Int4Value' },
          ],
        },
      ],
    }
    expect(cases.length).toBeGreaterThan(500)
    expect(cases.some((c) => c.expected.kind === 'Null')).toBe(true)
    await mkdir('artifacts/range-nested-bounds', { recursive: true })
    await writeFile(
      'artifacts/range-nested-bounds/report.json',
      json({ profiles: profiles.length, fixtures: cases.length, nativeInserts: inserts, cases }) +
        '\n',
    )
    await runCheckParity(
      directory,
      'nestedboundranges',
      group,
      ['probe'],
      cases.map((c, mode) => ({
        name: 'probe',
        row: { mode: { kind: 'Value', value: mode } },
        expected: c.expected,
      })),
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 600_000)
