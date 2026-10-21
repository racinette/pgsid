import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  assembleCheckRust,
  type prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import { rustStringLiteral } from '../../src/codegen/shared/rust-literals.js'
import { domainElementType, arrayType } from '../../src/sql-semantics/expressions.js'
import { runCheckParity, type Outcome } from '../../tools/check-rust/parity.js'
import { type OwnedArrayInputPayload } from '../../tools/check-rust/array-input.js'
import {
  rangeRustCell,
  type RangeInputBoundProfile,
  type RangeInputPayload,
  type RangeInputCell,
} from '../../tools/check-rust/range-input.js'
import { rangeBoundProjection, readRangeBoundCell } from './check-range-fixtures.js'

type Profile = {
  name: string
  sql: string
  leaf: string
  kind: number
  comparison: number
  a: string
  b: string
  collation?: boolean
  labels?: string[]
  nested?: boolean
  missing?: boolean
}

it('owns typed array bounds through range construction, relations, sets and multiranges with native PostgreSQL behavior', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-range-array-bounds-'))
  try {
    await pg.exec(
      `CREATE TYPE bag_stage AS ENUM('z','a','','é');CREATE TYPE bag_empty AS ENUM();CREATE DOMAIN bag AS int4[];SET DateStyle='ISO,YMD';SET TimeZone='UTC'`,
    )
    const profiles: Profile[] = [
      {
        name: 'ints',
        sql: 'int4[]',
        leaf: 'pg_catalog.int4',
        kind: 2,
        comparison: 2,
        a: '1',
        b: '3',
      },
      {
        name: 'nums',
        sql: 'numeric[]',
        leaf: 'pg_catalog."numeric"',
        kind: 10,
        comparison: 10,
        a: '1.00',
        b: '3.0',
      },
      {
        name: 'text',
        sql: 'text[]',
        leaf: 'pg_catalog.text',
        kind: 8,
        comparison: 8,
        a: 'a',
        b: 'é',
        collation: true,
      },
      {
        name: 'bpchar',
        sql: 'bpchar[]',
        leaf: 'pg_catalog.bpchar',
        kind: 8,
        comparison: 108,
        a: 'a ',
        b: 'b',
        collation: true,
      },
      {
        name: 'name',
        sql: 'name[]',
        leaf: 'pg_catalog.name',
        kind: 8,
        comparison: 208,
        a: 'a ',
        b: 'b',
        collation: true,
      },
      {
        name: 'enum',
        sql: 'bag_stage[]',
        leaf: 'enum:["public","bag_stage"]',
        kind: 6,
        comparison: 6,
        a: 'z',
        b: 'a',
        labels: ['z', 'a', '', 'é'],
      },
      {
        name: 'jsonb',
        sql: 'jsonb[]',
        leaf: 'pg_catalog.jsonb',
        kind: 12,
        comparison: 12,
        a: '1',
        b: '3',
      },
      {
        name: 'cidr',
        sql: 'cidr[]',
        leaf: 'pg_catalog.cidr',
        kind: 13,
        comparison: 113,
        a: '10.0.0.0/8',
        b: '20.0.0.0/8',
      },
      {
        name: 'oids',
        sql: 'regclass[]',
        leaf: 'pg_catalog.regclass',
        kind: 33,
        comparison: 331,
        a: '0',
        b: '0',
      },
      {
        name: 'bools',
        sql: 'bool[]',
        leaf: 'pg_catalog.bool',
        kind: 9,
        comparison: 9,
        a: 'f',
        b: 't',
      },
      {
        name: 'nested',
        sql: 'bag[]',
        leaf: domainElementType({ schema: 'public', name: 'bag' }, arrayType('pg_catalog.int4')),
        kind: 41,
        comparison: 41,
        a: '"{1}"',
        b: '"{3}"',
        nested: true,
      },
      {
        name: 'json',
        sql: 'json[]',
        leaf: 'pg_catalog."json"',
        kind: 11,
        comparison: 0,
        a: 'null',
        b: 'true',
        missing: true,
      },
      {
        name: 'empty_enum',
        sql: 'bag_empty[]',
        leaf: 'enum:["public","bag_empty"]',
        kind: 6,
        comparison: 6,
        a: '',
        b: '',
        labels: [],
      },
    ]
    const arrayIdentities = new Map<string, string>()
    for (const p of profiles) {
      const identity = (
        await pg.query<{ identity: string }>(
          `SELECT format('%I.%I',n.nspname,t.typname) identity FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE t.oid=$1::regtype`,
          [p.sql],
        )
      ).rows[0]!.identity
      arrayIdentities.set(p.name, identity)
    }
    const arrayIdentity = (p: Profile) => arrayIdentities.get(p.name)!
    const nodes = (p: Profile): RangeInputBoundProfile[] => {
      const base = {
        typeName: arrayIdentity(p),
        kind: 41,
        comparison: 41,
        missingComparison: false,
        elementType: p.leaf,
        child: 1,
        enumLabels: '',
        enumCount: -1,
      }
      const leaf = {
        typeName:
          p.name === 'enum'
            ? 'public.bag_stage'
            : p.name === 'empty_enum'
              ? 'public.bag_empty'
              : p.nested
                ? 'pg_catalog._int4'
                : p.leaf,
        kind: p.kind,
        comparison: p.comparison,
        missingComparison: p.missing ?? false,
        elementType: p.nested ? 'pg_catalog.int4' : '',
        child: p.nested ? 2 : 0,
        enumLabels: p.labels?.join('\0') ?? '',
        enumCount: p.labels?.length ?? -1,
      }
      return p.nested
        ? [
            base,
            leaf,
            {
              typeName: 'pg_catalog.int4',
              kind: 2,
              comparison: 2,
              missingComparison: false,
              elementType: '',
              child: 0,
              enumLabels: '',
              enumCount: -1,
            },
          ]
        : [base, leaf]
    }
    const builders: string[] = []
    const profileBuilders = new Map<string, string>()
    const profileSource = (items: RangeInputBoundProfile[]) => {
      const key = JSON.stringify(items)
      let name = profileBuilders.get(key)
      if (!name) {
        name = 'bag_profile_' + profileBuilders.size
        profileBuilders.set(key, name)
        builders.push(
          `fn ${name}()->RangeBoundContext {let mut nodes:Vec<RangeBoundProfile>=Vec::new();${items.map((n) => `nodes.push(RangeBoundProfile {type_name:${rustStringLiteral(n.typeName)}.to_owned(),kind:${n.kind},comparison:${n.comparison},missing_comparison:${n.missingComparison},element_type:${rustStringLiteral(n.elementType)}.to_owned(),child:${n.child},enum_labels:${rustStringLiteral(n.enumLabels)}.to_owned(),enum_count:${n.enumCount}});`).join('\n')}RangeBoundContext {nodes}}`,
        )
      }
      return name + '()'
    }
    const context = (p: Profile, opaque = false) =>
      profileSource(
        nodes(p).map((node, index) => (opaque && index > 0 ? { ...node, comparison: 0 } : node)),
      )
    const arrayBuilders = new Map<string, string>()
    const cellSource = (cell: RangeInputCell): string => {
      if (cell.kind === 'Array') return `array_element_from_array(${arraySource(cell.value)})`
      if (cell.kind === 'Jsonb') {
        const node = cell.value.nodes[cell.value.root]!
        expect(node.kind).toBe(3)
        return `array_element_from_jsonb(jsonb_from_text_context(make_text_value(${rustStringLiteral(cell.value.characters.slice(node.textStart, node.textEnd).join(''))}),true))`
      }
      return rangeRustCell(cell)
    }
    const arraySource = (payload: OwnedArrayInputPayload): string => {
      const key = JSON.stringify(payload, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      )
      let name = arrayBuilders.get(key)
      if (!name) {
        name = 'bag_array_' + arrayBuilders.size
        arrayBuilders.set(key, name)
        builders.push(
          `fn ${name}()->ArrayValue {let mut args=make_array_arguments(${rustStringLiteral(payload.elementType)},${payload.elementKind});${payload.dimensions.map((d) => `args=append_array_dimension(args,${d.lower},${d.length});`).join('\n')}${payload.elements.map((cell) => `args=append_array_argument(args,${cellSource(cell as RangeInputCell)});`).join('\n')}finish_array_arguments(args)}`,
        )
      }
      return name + '()'
    }
    const spanSource = (payload: RangeInputPayload) =>
      `range_from_typed_bounds(${rustStringLiteral(payload.typeName)},${rustStringLiteral(payload.elementType)},41,${payload.empty},${payload.lowerInclusive},${payload.upperInclusive},${payload.empty ? 'ArrayElement::Null' : cellSource(payload.bounds[0]!)},${payload.empty ? 'ArrayElement::Null' : cellSource(payload.bounds[1]!)},make_range_support(41,1),"",-1,${profileSource(payload.boundProfile!.nodes)})`
    const arrays = new Map<string, Promise<OwnedArrayInputPayload>>()
    const readArray = (p: Profile, text: string): Promise<OwnedArrayInputPayload> => {
      const key = p.name + '\0' + text
      let pending = arrays.get(key)
      if (!pending) {
        pending = (async () => {
          const shape = (
            await pg.query<{ dims: string | null; has: boolean }>(
              `SELECT array_dims($1::${p.sql}) dims, array_position(ARRAY(SELECT x IS NULL FROM unnest($1::${p.sql}) x),true) IS NOT NULL has`,
              [text],
            )
          ).rows[0]!
          const dimensions = [...(shape.dims ?? '').matchAll(/\[(-?\d+):(-?\d+)\]/g)].map((m) => ({
            lower: Number(m[1]),
            length: Number(m[2]) - Number(m[1]) + 1,
          }))
          const projection = p.nested
            ? 'value::text'
            : rangeBoundProjection(
                'value',
                p.name === 'enum'
                  ? 'public.bag_stage'
                  : p.name === 'empty_enum'
                    ? 'public.bag_empty'
                    : p.leaf,
              )
          const values = (
            await pg.query<{ value: string | null }>(
              `SELECT ${projection} value FROM unnest($1::${p.sql}) AS cells(value)`,
              [text],
            )
          ).rows
          const elements: OwnedArrayInputPayload['elements'] = []
          for (const cell of values) {
            if (p.nested && cell.value !== null)
              elements.push({ kind: 'Array', value: await readArray(profiles[0]!, cell.value) })
            else if (p.missing && cell.value !== null)
              throw new Error('only empty and NULL JSON arrays have fixture payloads')
            else elements.push(await readRangeBoundCell(pg, p.leaf, cell.value))
          }
          return {
            elementType: p.leaf,
            elementKind: p.kind,
            dimensions,
            elements,
            nullBitmap: { kind: 'Value', value: shape.has },
          }
        })()
        arrays.set(key, pending)
      }
      return pending
    }
    const bound = async (p: Profile, text: string | null) =>
      text === null
        ? 'ArrayElement::Null'
        : `array_element_from_array(${arraySource(await readArray(p, text))})`
    const construct = async (
      p: Profile,
      lower: string | null,
      upper: string | null,
      flags: string | null,
    ) =>
      `range_construct_typed("public.${p.name}_span",${rustStringLiteral(arrayIdentity(p))},41,${await bound(p, lower)},${await bound(p, upper)},${flags === null ? 'TextValue::Null' : `make_text_value(${rustStringLiteral(flags)})`},make_range_support(41,1),"",-1,${context(p)})`
    const cases: { rust: string; expected: Outcome; reference?: unknown }[] = []
    const nativeText = async (sql: string, parameters: unknown[], rust: string) => {
      try {
        const value = (await pg.query<{ value: string | null }>(sql, parameters)).rows[0]!.value
        cases.push({
          rust: `sql__pg_catalog__texteq__aet8(${rust},${value === null ? 'TextValue::Null' : `make_text_value(${rustStringLiteral(value)})`})`,
          expected: { kind: value === null ? 'Null' : 'True' },
          reference: { sql, parameters, value },
        })
      } catch (error) {
        if (!error || typeof error !== 'object' || !('code' in error)) throw error
        cases.push({
          rust: `sql__pg_catalog__texteq__aet8(${rust},make_text_value(""))`,
          expected: { kind: 'Error', value: { state: parseInt(String(error.code), 36) } },
          reference: { sql, parameters, error: String(error.code) },
        })
      }
    }
    const readSpan = async (p: Profile, span: string): Promise<RangeInputPayload> => {
      const r = (
        await pg.query<{
          empty: boolean
          lo: boolean
          hi: boolean
          lower: string | null
          upper: string | null
        }>(
          `SELECT isempty(v) empty,lower_inc(v) lo,upper_inc(v) hi,lower(v)::text lower,upper(v)::text upper FROM (SELECT $1::${p.name}_span v) s`,
          [span],
        )
      ).rows[0]!
      const cell = async (text: string | null): Promise<RangeInputCell> =>
        text === null ? { kind: 'Null' } : { kind: 'Array', value: await readArray(p, text) }
      return {
        typeName: `public.${p.name}_span`,
        elementType: arrayIdentity(p),
        elementKind: 41,
        support: { comparison: 41, canonical: 1 },
        boundProfile: { nodes: nodes(p) },
        empty: r.empty,
        lowerInclusive: r.lo,
        upperInclusive: r.hi,
        bounds: r.empty ? [] : [await cell(r.lower), await cell(r.upper)],
      }
    }
    for (const p of profiles) {
      await pg.exec(
        `CREATE TYPE ${p.name}_span AS RANGE(subtype=${p.sql},multirange_type_name=${p.name}_set${p.collation ? ',collation="C"' : ''})`,
      )
      const samples: (string | null)[] =
        p.missing || p.labels?.length === 0
          ? [null, '{}', '{NULL}']
          : [
              null,
              '{}',
              `{${p.a}}`,
              `{${p.b}}`,
              '{NULL}',
              `[-2:-1]={${p.a},${p.b}}`,
              `{{${p.a},${p.b}},{${p.a},${p.b}}}`,
            ]
      for (let i = 0; i < samples.length; i++) {
        const lower = samples[i]!
        for (const upper of [lower, samples[(i + 1) % samples.length]!])
          for (const flags of ['[]', '[)', '()'])
            await nativeText(
              `SELECT ${p.name}_span($1::${p.sql},$2::${p.sql},$3)::text value`,
              [lower, upper, flags],
              `range_to_text(${await construct(p, lower, upper, flags)})`,
            )
      }
      await nativeText(
        `SELECT ${p.name}_span(NULL,NULL,$1)::text value`,
        [null],
        `range_to_text(${await construct(p, null, null, null)})`,
      )
      await nativeText(
        `SELECT ${p.name}_span(NULL,NULL,$1)::text value`,
        ['bad'],
        `range_to_text(${await construct(p, null, null, 'bad')})`,
      )
      const spans =
        p.missing || p.labels?.length === 0
          ? ['empty', '(,)', '[{},)', '(,{}]']
          : [
              'empty',
              '(,)',
              ...(await Promise.all(
                [
                  [`{${p.a}}`, `{${p.b}}`],
                  [null, `{${p.a}}`],
                  [`{${p.b}}`, null],
                ].map(
                  async ([lo, hi]) =>
                    (
                      await pg.query<{ value: string }>(
                        `SELECT ${p.name}_span($1::${p.sql},$2::${p.sql},'[]')::text value`,
                        [lo, hi],
                      )
                    ).rows[0]!.value,
                ),
              )),
            ]
      for (let i = 0; i < spans.length; i++) {
        const left = spans[i]!,
          right = spans[(i + 1) % spans.length]!
        const l = spanSource(await readSpan(p, left)),
          r = spanSource(await readSpan(p, right))
        for (const [op, fn] of [
          ['=', 'range_eq__loxq'],
          ['<', 'range_lt__t1sv'],
          ['&&', 'range_overlaps__38jd'],
          ['@>', 'range_contains__ut37'],
          ['-|-', 'range_adjacent__03u0'],
        ]) {
          try {
            const value = (
              await pg.query<{ value: boolean }>(
                `SELECT $1::${p.name}_span ${op} $2::${p.name}_span value`,
                [left, right],
              )
            ).rows[0]!.value
            cases.push({
              rust: `sql__pg_catalog__${fn}(${l},${r})`,
              expected: { kind: value ? 'True' : 'False' },
              reference: { profile: p.name, left, right, op, value },
            })
          } catch (error) {
            if (!error || typeof error !== 'object' || !('code' in error)) throw error
            cases.push({
              rust: `sql__pg_catalog__${fn}(${l},${r})`,
              expected: { kind: 'Error', value: { state: parseInt(String(error.code), 36) } },
            })
          }
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
          `multirange_to_text(bag_multi(${l},${r},"public.${p.name}_set","public.${p.name}_span",${rustStringLiteral(arrayIdentity(p))}))`,
        )
        await nativeText(
          `SELECT range_merge(${p.name}_set($1::${p.name}_span,$2::${p.name}_span))::text value`,
          [left, right],
          `range_to_text(sql__pg_catalog__range_merge__f619(bag_multi(${l},${r},"public.${p.name}_set","public.${p.name}_span",${rustStringLiteral(arrayIdentity(p))})))`,
        )
      }
    }
    cases.push({ rust: 'bag_snapshots()', expected: { kind: 'True' } })
    for (let mode = 0; mode < 12; mode++)
      cases.push({ rust: `bag_invalid(${mode})`, expected: { kind: 'Unknown' } })
    for (let mode = 0; mode < 7; mode++)
      cases.push({
        rust: `bag_context_boundary(${mode})`,
        expected: { kind: mode === 0 || mode === 2 ? 'Unknown' : 'True' },
      })
    cases.push(
      { rust: 'bag_partial(false)', expected: { kind: 'False' } },
      { rust: 'bag_partial(true)', expected: { kind: 'Unknown' } },
    )
    const entryName = checkRustEntryName({
      schema: 'public',
      kind: 'table',
      owner: 'array_bound_ranges',
      constraint: 'probe',
    })
    const evaluatorSource = `pub fn ${entryName}(mode:Int4Value)->CheckOutcome {let result=bag_probe(mode);check_from_bool(result)}`
    const source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    const sample = spanSource(await readSpan(profiles[0]!, '[{1},{3}]'))
    const enumSample = spanSource(await readSpan(profiles[5]!, '[{z},{a}]'))
    context(profiles[5]!, true)
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.push({
        path: 'tests/array_bound_ranges.rs',
        source: `
${builders.join('\n')}
fn bag_multi(left:RangeValue,right:RangeValue,multi:&str,span:&str,subtype:&str)->MultirangeValue {
 let mut input=make_array_arguments(span,42);input=append_array_argument(input,array_element_from_range(right));input=append_array_argument(input,array_element_from_range(left));
 multirange_construct_array_with_support(finish_array_constructor(input),multi,span,subtype,41,make_range_support(41,1))
}
fn bag_partial(equal:bool)->BoolValue {
 let mut lower=make_array_arguments("pg_catalog.int4",2);lower=append_array_argument(lower,ArrayElement::Int4(1));lower=append_array_argument(lower,ArrayElement::Unknown);
 let mut upper=make_array_arguments("pg_catalog.int4",2);let mut first=3;if equal {first=1;};upper=append_array_argument(upper,ArrayElement::Int4(first));upper=append_array_argument(upper,ArrayElement::Unknown);
 let actual=range_construct_typed("public.ints_span","pg_catalog._int4",41,array_element_from_array(finish_array_constructor(lower)),array_element_from_array(finish_array_constructor(upper)),make_text_value("[]"),make_range_support(41,1),"",-1,${context(profiles[0]!)});
 range_is_null(actual)
}
fn bag_snapshots()->BoolValue {
 let original=${sample};
 let saved=original.clone();
 if let RangeValue::Value(payload)=original {
  let mut context=payload.bound_profile;
  let node=context.nodes[1].clone();let saved_node=node.clone();
  context.nodes[1]=RangeBoundProfile {type_name:"changed".to_owned(),kind:node.kind,comparison:0,missing_comparison:false,element_type:node.element_type,child:node.child,enum_labels:node.enum_labels,enum_count:node.enum_count};
  let mut extra_nodes=context.nodes;extra_nodes.push(saved_node);context=RangeBoundContext {nodes:extra_nodes};
  if let RangeValue::Value(before)=saved {
   if before.bound_profile.nodes.len()!=2 || before.bound_profile.nodes[1].type_name.as_str()!="pg_catalog.int4" || before.bound_profile.nodes[1].comparison!=2 {return BoolValue::Value(false);};
   let bound=before.bounds[0].clone();
   if let ArrayElement::Array(array)=bound {
    let mut cells=array.elements;cells[0]=ArrayElement::Int4(99);
    return sql__pg_catalog__texteq__aet8(range_to_text(RangeValue::Value(before)),make_text_value("[{1},{3}]"));
   };
  };
 };BoolValue::Value(false)
}
fn bag_invalid(mode:i32)->BoolValue {
 let original=${sample};
 if let RangeValue::Value(payload)=original {
  let mut context=payload.bound_profile;
  let root=context.nodes[0].clone();let leaf=context.nodes[1].clone();
  let mut kind=root.kind;let mut child=root.child;let mut element_type=root.element_type.clone();let mut comparison=root.comparison;let mut labels=root.enum_labels.clone();let mut count=root.enum_count;
  if mode==0 {child=0;};if mode==1 {child=99;};if mode==2 {kind=42;};if mode==3 {element_type="".to_owned();};if mode==4 {comparison=2;};if mode==5 {labels="bad".to_owned();};if mode==6 {count=0;};
  if mode<7 {context.nodes[0]=RangeBoundProfile{type_name:root.type_name.clone(),kind,comparison,missing_comparison:false,element_type,child,enum_labels:labels,enum_count:count};};
  if mode==7 {context.nodes[1]=RangeBoundProfile{type_name:leaf.type_name.clone(),kind:6,comparison:6,missing_comparison:false,element_type:leaf.element_type.clone(),child:0,enum_labels:"z".to_owned(),enum_count:1};};
  if mode==8 {context.nodes[1]=RangeBoundProfile{type_name:leaf.type_name.clone(),kind:leaf.kind,comparison:leaf.comparison,missing_comparison:true,element_type:leaf.element_type.clone(),child:0,enum_labels:leaf.enum_labels.clone(),enum_count:leaf.enum_count};};
  if mode==9 {context.nodes[1]=RangeBoundProfile{type_name:leaf.type_name.clone(),kind:leaf.kind,comparison:leaf.comparison,missing_comparison:false,element_type:"bad".to_owned(),child:0,enum_labels:leaf.enum_labels.clone(),enum_count:leaf.enum_count};};
  if mode==10 {context.nodes[1]=RangeBoundProfile{type_name:leaf.type_name.clone(),kind:leaf.kind,comparison:leaf.comparison,missing_comparison:false,element_type:leaf.element_type.clone(),child:1,enum_labels:leaf.enum_labels.clone(),enum_count:leaf.enum_count};};
  if mode==11 {context.nodes[0]=RangeBoundProfile{type_name:root.type_name.clone(),kind:root.kind,comparison:root.comparison,missing_comparison:false,element_type:"pg_catalog.int8".to_owned(),child:root.child,enum_labels:root.enum_labels.clone(),enum_count:root.enum_count};};
  return range_is_null(range_with_bound_profile(RangeValue::Value(RangePayload {type_name:payload.type_name,element_type:payload.element_type,element_kind:payload.element_kind,enum_labels:payload.enum_labels,enum_count:payload.enum_count,bound_profile:empty_range_bound_context(),support:payload.support,empty:payload.empty,lower_inclusive:payload.lower_inclusive,upper_inclusive:payload.upper_inclusive,bounds:payload.bounds}),context));
 };BoolValue::Value(false)
}
fn bag_context_boundary(mode:i32)->BoolValue {
 let original=${enumSample};
 if let RangeValue::Value(payload)=original {

  let mut context=payload.bound_profile.clone();let node=context.nodes[1].clone();
  let mut labels=${rustStringLiteral(['other', 'a', '', 'é'].join('\0'))}.to_owned();let mut comparison=6;
  if mode==2 || mode==3 || mode==4 || mode==5 {labels=node.enum_labels;comparison=0;};
  context.nodes[1]=RangeBoundProfile{type_name:node.type_name,kind:node.kind,comparison,missing_comparison:false,element_type:node.element_type,child:node.child,enum_labels:labels,enum_count:node.enum_count};
  let mut lower=payload.bounds[0].clone();let mut upper=payload.bounds[1].clone();
  if mode==1 || mode==3 {lower=array_element_from_array(finish_array_constructor(make_array_arguments(${rustStringLiteral(profiles[5]!.leaf)},6)));upper=lower.clone();};
  if mode==4 {lower=ArrayElement::Null;upper=ArrayElement::Null;};
  if mode==5 || mode==6 {let mut values=make_array_arguments(${rustStringLiteral(profiles[5]!.leaf)},6);values=append_array_argument(values,ArrayElement::Null);lower=array_element_from_array(finish_array_constructor(values));upper=lower.clone();};
  let left=range_from_typed_bounds(payload.type_name.as_str(),payload.element_type.as_str(),41,false,mode!=4,mode!=4,lower.clone(),upper.clone(),payload.support,"",-1,payload.bound_profile);
  let right=range_from_typed_bounds("public.enum_span","public._bag_stage",41,false,mode!=4,mode!=4,lower,upper,make_range_support(41,1),"",-1,context);
  if mode==2 || mode==3 {let actual=range_construct_typed("public.enum_span","public._bag_stage",41,range_bound(right.clone(),false),range_bound(right,true),make_text_value("[]"),make_range_support(41,1),"",-1,${context(profiles[5]!, true)});if let RangeValue::Value(_)=actual{return BoolValue::Value(true);};return range_is_null(actual);};
  return sql__pg_catalog__range_eq__loxq(left,right);
 };BoolValue::Value(false)
}
${Array.from(
  { length: Math.ceil(cases.length / 128) },
  (_, part) =>
    `fn bag_group_${part}(selected:i32)->BoolValue {${cases
      .slice(part * 128, (part + 1) * 128)
      .map((item, index) => `if selected==${part * 128 + index} {return ${item.rust};};`)
      .join('\n')}BoolValue::Unknown}`,
).join('\n')}
pub fn bag_probe(input:Int4Value)->BoolValue {if let Int4Value::Value(mode)=input {${Array.from({ length: Math.ceil(cases.length / 128) }, (_, part) => `if mode<${(part + 1) * 128} {return bag_group_${part}(mode);};`).join('\n')}};BoolValue::Unknown}
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
    await mkdir('artifacts/range-array-bounds', { recursive: true })
    await writeFile(
      'artifacts/range-array-bounds/report.json',
      JSON.stringify({ profiles: profiles.length, fixtures: cases.length, cases }, null, 2) + '\n',
    )
    expect(cases.length).toBeGreaterThan(500)
    await runCheckParity(
      directory,
      'arrayboundranges',
      group,
      ['probe'],
      cases.map((item, mode) => ({
        name: 'probe',
        row: { mode: { kind: 'Value', value: mode } },
        expected: item.expected,
      })),
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 600_000)
