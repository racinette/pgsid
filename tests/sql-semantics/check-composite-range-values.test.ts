import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  assembleCheckRust,
  type prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import { rustStringLiteral } from '../../src/codegen/shared/rust-literals.js'
import { functionMetadata } from '../../src/postgres/builtins/inventory.js'
import {
  rangeRustCell,
  type RangeInputCell,
  type RangeInputBoundProfile,
} from '../../tools/check-rust/range-input.js'
import { runCheckParity, type Outcome } from '../../tools/check-rust/parity.js'

const node = (typeName: string, kind: number, comparison = kind): RangeInputBoundProfile => ({
  typeName,
  kind,
  comparison,
  canonical: 1,
  missingComparison: false,
  elementType: '',
  child: 0,
  enumLabels: '',
  enumCount: -1,
  fields: [],
})
const field = (typeName: string, child: number, comparisonAvailable = true) => ({
  typeName,
  child,
  comparisonAvailable,
})
const record = (typeName: string, fields: RangeInputCell[]): RangeInputCell => ({
  kind: 'Composite',
  value: { typeName, fields },
})
const nullCell: RangeInputCell = { kind: 'Null' }
const int = (n: number | null): RangeInputCell =>
  n === null ? nullCell : { kind: 'Int4', value: n }
const text = (s: string | null): RangeInputCell =>
  s === null ? nullCell : { kind: 'Text', value: s }

it('owns and compares composite range bounds with native constructor, set, NULL and missing-field support semantics', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-composite-range-values-'))
  try {
    await pg.exec(`CREATE TYPE leaf AS(n int4,label text COLLATE "C");CREATE TYPE span AS RANGE(subtype=leaf);
CREATE TYPE document AS(n int4,doc json);CREATE TYPE document_span AS RANGE(subtype=document);
CREATE TYPE phase AS ENUM('z','a');ALTER TYPE phase ADD VALUE 'mid' BEFORE 'a';CREATE TYPE staged AS(n int4,phase phase);CREATE TYPE staged_span AS RANGE(subtype=staged);`)
    const builders: string[] = [],
      contexts = new Map<string, string>()
    const profile = (nodes: RangeInputBoundProfile[]) => {
      const key = JSON.stringify(nodes)
      let name = contexts.get(key)
      if (!name) {
        name = 'record_range_context_' + contexts.size
        contexts.set(key, name)
        builders.push(
          `fn ${name}()->RangeBoundContext{let mut value=empty_range_bound_context();${nodes.map((n) => `value=append_range_bound_profile_with_canonical(value,${rustStringLiteral(n.typeName)},${n.kind},${n.comparison},${n.canonical ?? 1},${n.missingComparison},${rustStringLiteral(n.elementType)},${n.child},${rustStringLiteral(n.enumLabels)},${n.enumCount});`).join('\n')}${nodes.flatMap((n, index) => (n.fields ?? []).map((f) => `value=append_range_bound_field(value,${index},${f.child},${rustStringLiteral(f.typeName)},${f.comparisonAvailable});`)).join('\n')}value}`,
        )
      }
      return name + '()'
    }
    const leafNodes = [
        {
          ...node('public.leaf', 44),
          fields: [field('pg_catalog.int4', 1), field('pg_catalog.text', 2)],
        },
        node('pg_catalog.int4', 2),
        node('pg_catalog.text', 8),
      ],
      leafContext = profile(leafNodes)
    const docNodes = [
        {
          ...node('public.document', 44),
          fields: [field('pg_catalog.int4', 1), field('pg_catalog."json"', 2, false)],
        },
        node('pg_catalog.int4', 2),
        { ...node('pg_catalog."json"', 11, 0), missingComparison: true },
      ],
      docContext = profile(docNodes)
    const stagedNodes = [
        {
          ...node('public.staged', 44),
          fields: [field('pg_catalog.int4', 1), field('public.phase', 2)],
        },
        node('pg_catalog.int4', 2),
        { ...node('public.phase', 6), enumLabels: 'z\0mid\0a', enumCount: 3 },
      ],
      stagedContext = profile(stagedNodes)
    const cellBuilders = new Map<string, string>()
    const cellSource = (cell: RangeInputCell): string => {
      if (cell.kind === 'Array') {
        const key = JSON.stringify(cell, (_, value) =>
          typeof value === 'bigint' ? String(value) : value,
        )
        let name = cellBuilders.get(key)
        if (!name) {
          name = 'record_bound_cell_' + cellBuilders.size
          cellBuilders.set(key, name)
          const elements = cell.value.elements
            .map(
              (value) => `args=append_array_argument(args,${cellSource(value as RangeInputCell)});`,
            )
            .join('\n')
          const dimensions = cell.value.dimensions
            .map((d) => `args=append_array_dimension(args,${d.lower},${d.length});`)
            .join('\n')
          builders.push(
            `fn ${name}()->ArrayElement{let mut args=make_array_arguments(${rustStringLiteral(cell.value.elementType)},${cell.value.elementKind});${dimensions}${elements}array_element_from_array(finish_array_arguments(args))}`,
          )
        }
        return name + '()'
      }
      if (cell.kind !== 'Composite') return rangeRustCell(cell)
      const key = JSON.stringify(cell, (_, value) =>
        typeof value === 'bigint' ? String(value) : value,
      )
      let name = cellBuilders.get(key)
      if (!name) {
        name = 'record_bound_cell_' + cellBuilders.size
        cellBuilders.set(key, name)
        const fields = cell.value.fields
          .map((field) => `value=append_composite_field(value,${cellSource(field)});`)
          .join('\n')
        builders.push(
          `fn ${name}()->ArrayElement{let mut value=make_composite_fields(${rustStringLiteral(cell.value.typeName)});${fields}array_element_from_composite(value)}`,
        )
      }
      return name + '()'
    }
    const construct = (
      type: string,
      identity: string,
      context: string,
      lo: RangeInputCell,
      hi: RangeInputCell,
      flags: string | null = '[)',
      comparison = 44,
      kind = 44,
    ) =>
      `range_construct_typed(${rustStringLiteral(type)},${rustStringLiteral(identity)},${kind},${cellSource(lo)},${cellSource(hi)},${flags === null ? 'TextValue::Null' : `make_text_value(${rustStringLiteral(flags)})`},make_range_support(${comparison},1),"",-1,${context})`
    const span = (lo: RangeInputCell, hi: RangeInputCell, flags: string | null = '[)') =>
      construct('public.span', 'public.leaf', leafContext, lo, hi, flags)
    const cases: { rust: string; expected: Outcome; reference?: unknown }[] = []
    const native = async (sql: string, parameters: unknown[], rust: string) => {
      try {
        const value = (await pg.query<{ value: boolean | null }>(sql, parameters)).rows[0]!.value
        cases.push({
          rust,
          expected: { kind: value === null ? 'Null' : value ? 'True' : 'False' },
          reference: { sql, parameters, value },
        })
      } catch (e) {
        cases.push({
          rust,
          expected: { kind: 'Error', value: { state: parseInt((e as { code: string }).code, 36) } },
          reference: { sql, parameters, error: (e as { code: string }).code },
        })
      }
    }
    const samples: [number | null, string | null][] = [
      [null, null],
      [1, 'a'],
      [1, 'b'],
      [2, 'a'],
      [2, null],
    ]
    const cells = [nullCell, ...samples.map(([n, s]) => record('public.leaf', [int(n), text(s)]))],
      encoded: (string | null)[] = [null]
    for (const [n, s] of samples)
      encoded.push(
        (
          await pg.query<{ value: string }>('SELECT ROW($1::int4,$2::text)::leaf::text value', [
            n,
            s,
          ])
        ).rows[0]!.value,
      )
    for (let lo = 0; lo < cells.length; lo++)
      for (let hi = 0; hi < cells.length; hi++)
        for (const flags of ['[)', '[]', '(]', '()', null, 'bad'])
          await native(
            'SELECT isempty(span($1::leaf,$2::leaf,$3)) value',
            [encoded[lo], encoded[hi], flags],
            `range_empty_state(${span(cells[lo]!, cells[hi]!, flags)})`,
          )
    const spans = [
      { lo: 0, hi: 0, flags: '()' },
      { lo: 2, hi: 4, flags: '[)' },
      { lo: 3, hi: 5, flags: '[]' },
      { lo: 2, hi: 2, flags: '[)' },
      { lo: 1, hi: 1, flags: '[]' },
      { lo: 2, hi: 0, flags: '[)' },
    ]
    const forms = [
      ['v=w', 'range_eq'],
      ['v<w', 'range_lt'],
      ['v @> w', 'range_contains'],
      ['v && w', 'range_overlaps'],
      ['isempty(v*w)', 'range_intersect'],
      ['isempty(v-w)', 'range_minus'],
    ] as const
    for (const a of spans)
      for (const b of spans) {
        const lhs = span(cells[a.lo]!, cells[a.hi]!, a.flags),
          rhs = span(cells[b.lo]!, cells[b.hi]!, b.flags)
        const parameters = [
          encoded[a.lo],
          encoded[a.hi],
          a.flags,
          encoded[b.lo],
          encoded[b.hi],
          b.flags,
        ]
        for (const [sql, name] of forms) {
          const metadata = functionMetadata(
            `function:["pg_catalog","${name}"](pg_catalog.anyrange,pg_catalog.anyrange)`,
          )
          const result = `${metadata.rustName}(${lhs},${rhs})`
          await native(
            `SELECT (${sql}) value FROM (SELECT span($1::leaf,$2::leaf,$3)v,span($4::leaf,$5::leaf,$6)w)input`,
            parameters,
            name === 'range_intersect' || name === 'range_minus'
              ? `range_empty_state(${result})`
              : result,
          )
        }
      }
    for (const a of [null, 1, 2])
      for (const b of [null, 1, 2]) {
        const cell = (n: number | null) => record('public.document', [int(n), nullCell])
        await native(
          'SELECT isempty(document_span(ROW($1::int4,NULL)::document,ROW($2::int4,NULL)::document,$3)) value',
          [a, b, '[]'],
          `range_empty_state(${construct('public.document_span', 'public.document', docContext, cell(a), cell(b), '[]')})`,
        )
      }
    for (const a of [0, 1, 2])
      for (const b of [0, 1, 2]) {
        const cell = (ordinal: number) =>
          record('public.staged', [int(1), { kind: 'Enum', value: { ordinal, labelOid: 777n } }])
        await native(
          'SELECT isempty(staged_span(ROW(1,$1::phase)::staged,ROW(1,$2::phase)::staged,$3)) value',
          [['z', 'mid', 'a'][a], ['z', 'mid', 'a'][b], '[]'],
          `range_empty_state(${construct('public.staged_span', 'public.staged', stagedContext, cell(a), cell(b), '[]')})`,
        )
      }
    const opaque = profile(leafNodes.map((n, index) => (index === 1 ? { ...n, comparison: 0 } : n)))
    cases.push(
      {
        rust: `range_empty_state(${construct('public.span', 'public.leaf', opaque, record('public.leaf', [nullCell, text('a')]), record('public.leaf', [nullCell, text('b')]), '[]')})`,
        expected: { kind: 'False' },
      },
      {
        rust: `range_empty_state(${construct('public.span', 'public.leaf', opaque, cells[2]!, cells[4]!, '[]')})`,
        expected: { kind: 'Unknown' },
      },
    )
    await pg.exec(`CREATE TYPE opaque_phase AS ENUM('a','b');
CREATE FUNCTION opaque_cmp(opaque_phase,opaque_phase) RETURNS int4 LANGUAGE plpgsql IMMUTABLE STRICT AS $$BEGIN RAISE EXCEPTION 'opaque compare';END$$;
CREATE OPERATOR CLASS opaque_ops DEFAULT FOR TYPE opaque_phase USING btree AS
OPERATOR 1 pg_catalog.<(anyenum,anyenum),OPERATOR 2 pg_catalog.<=(anyenum,anyenum),OPERATOR 3 pg_catalog.=(anyenum,anyenum),OPERATOR 4 pg_catalog.>=(anyenum,anyenum),OPERATOR 5 pg_catalog.>(anyenum,anyenum),FUNCTION 1 opaque_cmp(opaque_phase,opaque_phase);
CREATE TYPE opaque_record AS(n int4,p opaque_phase);CREATE TYPE opaque_span AS RANGE(subtype=opaque_record);`)
    const opaqueNodes = [
        {
          ...node('public.opaque_record', 44),
          fields: [field('pg_catalog.int4', 1), field('public.opaque_phase', 2)],
        },
        node('pg_catalog.int4', 2),
        { ...node('public.opaque_phase', 6, 0), enumLabels: 'a\0b', enumCount: 2 },
      ],
      opaqueContext = profile(opaqueNodes)
    const opaqueCell = (n: number, phase: number | null) =>
      record('public.opaque_record', [
        int(n),
        phase === null ? nullCell : { kind: 'Enum', value: { ordinal: phase, labelOid: 777n } },
      ])
    await expect(
      pg.exec("SELECT opaque_span(ROW(1,'a')::opaque_record,ROW(1,'a')::opaque_record,'[]')"),
    ).rejects.toMatchObject({ code: 'P0001' })
    cases.push({
      rust: `range_empty_state(${construct('public.opaque_span', 'public.opaque_record', opaqueContext, opaqueCell(1, 0), opaqueCell(1, 0), '[]')})`,
      expected: { kind: 'Unknown' },
      reference: { unavailableCallback: 'P0001' },
    })
    await native(
      "SELECT isempty(opaque_span(ROW(1,NULL)::opaque_record,ROW(1,NULL)::opaque_record,'[]')) value",
      [],
      `range_empty_state(${construct('public.opaque_span', 'public.opaque_record', opaqueContext, opaqueCell(1, null), opaqueCell(1, null), '[]')})`,
    )
    await native(
      "SELECT isempty(opaque_span(ROW(1,'a')::opaque_record,ROW(2,'a')::opaque_record,'[]')) value",
      [],
      `range_empty_state(${construct('public.opaque_span', 'public.opaque_record', opaqueContext, opaqueCell(1, 0), opaqueCell(2, 0), '[]')})`,
    )
    const outerNodes = [
        {
          ...node('public.wrapped', 44),
          fields: [field('public.span', 1), field('pg_catalog.int4', 5)],
        },
        { ...node('public.span', 42), elementType: 'public.leaf', child: 2 },
        { ...leafNodes[0]!, fields: [field('pg_catalog.int4', 3), field('pg_catalog.text', 4)] },
        node('pg_catalog.int4', 2),
        node('pg_catalog.text', 8),
        node('pg_catalog.int4', 2),
      ],
      outerContext = profile(outerNodes)
    builders.push(`fn record_bound_projection()->BoolValue{let context=${outerContext};let branch=range_bound_context_branch(&context,2);let expected=${leafContext};make_bool_value(range_bound_profiles_equal(&branch,&expected))}
fn record_bound_snapshot()->BoolValue{
 let original=${leafContext};let snapshot=original.clone();let mut nodes=original.nodes;let parent=nodes[0].clone();let mut fields=parent.fields;let first=fields[0].clone();
 fields[0]=RangeBoundField{type_name:"changed".to_owned(),child:first.child,comparison_available:false};
 nodes[0]=RangeBoundProfile{type_name:parent.type_name,kind:parent.kind,comparison:parent.comparison,canonical:parent.canonical,missing_comparison:parent.missing_comparison,element_type:parent.element_type,child:parent.child,enum_labels:parent.enum_labels,enum_count:parent.enum_count,fields};
 let edited=RangeBoundContext{nodes};let expected=${leafContext};
 make_bool_value(range_bound_profiles_equal(&snapshot,&expected)&&range_bound_profiles_equal(&snapshot,&edited)==false)
}
fn record_bound_invalid(mode:i32)->BoolValue{
 let original=${leafContext};let mut nodes=original.nodes;let parent=nodes[0].clone();let mut fields=parent.fields;let first=fields[0].clone();let mut child=first.child;let mut name=first.type_name;
 if mode==0{child=0;};if mode==1{child=99;};if mode==2{name="".to_owned();};
 fields[0]=RangeBoundField{type_name:name,child,comparison_available:first.comparison_available};
 nodes[0]=RangeBoundProfile{type_name:parent.type_name,kind:parent.kind,comparison:parent.comparison,canonical:parent.canonical,missing_comparison:parent.missing_comparison,element_type:parent.element_type,child:parent.child,enum_labels:parent.enum_labels,enum_count:parent.enum_count,fields};
 let edited=RangeBoundContext{nodes};make_bool_value(range_bound_profile_valid(&edited)==false)
}`)
    cases.push(
      { rust: 'record_bound_projection()', expected: { kind: 'True' } },
      { rust: 'record_bound_snapshot()', expected: { kind: 'True' } },
    )
    for (const mode of [0, 1, 2])
      cases.push({ rust: `record_bound_invalid(${mode})`, expected: { kind: 'True' } })
    builders.push(`fn record_multirange(left:RangeValue,right:RangeValue)->MultirangeValue{
 let mut args=make_array_arguments("public.span",42);args=append_array_argument(args,array_element_from_range(left));args=append_array_argument(args,array_element_from_range(right));
 multirange_construct_array_with_support(finish_array_constructor(args),"public.span_multirange","public.span","public.leaf",44,make_range_support(44,1))
}
fn record_multirange_count(input:MultirangeValue,expected:i32)->BoolValue{
 if let MultirangeValue::Error(error)=input{return BoolValue::Error(error);};if let MultirangeValue::Null=input{return BoolValue::Null;};if let MultirangeValue::Value(value)=input{return make_bool_value(value.ranges.len() as i32==expected);};BoolValue::Unknown
}`)
    for (const a of spans)
      for (const b of spans) {
        const parameters = [
          encoded[a.lo],
          encoded[a.hi],
          a.flags,
          encoded[b.lo],
          encoded[b.hi],
          b.flags,
        ]
        const count = (
          await pg.query<{ value: number }>(
            'SELECT count(*)::int4 value FROM (SELECT span_multirange(span($1::leaf,$2::leaf,$3),span($4::leaf,$5::leaf,$6))m)input CROSS JOIN LATERAL unnest(m)member',
            parameters,
          )
        ).rows[0]!.value
        cases.push({
          rust: `record_multirange_count(record_multirange(${span(cells[a.lo]!, cells[a.hi]!, a.flags)},${span(cells[b.lo]!, cells[b.hi]!, b.flags)}),${count})`,
          expected: { kind: 'True' },
          reference: { multirangeCount: count, parameters },
        })
      }
    await pg.exec(
      'CREATE TYPE array_record AS(n int4,items int4[]);CREATE TYPE array_record_span AS RANGE(subtype=array_record);CREATE TYPE nested_record AS(entry leaf,n int4);CREATE TYPE nested_record_span AS RANGE(subtype=nested_record);',
    )
    const arrayNodes = [
        {
          ...node('public.array_record', 44),
          fields: [field('pg_catalog.int4', 1), field('pg_catalog._int4', 2)],
        },
        node('pg_catalog.int4', 2),
        { ...node('pg_catalog._int4', 41), elementType: 'pg_catalog.int4', child: 3 },
        node('pg_catalog.int4', 2),
      ],
      arrayContext = profile(arrayNodes)
    const arraySamples: { text: string | null; cell: RangeInputCell }[] = [
      { text: null, cell: nullCell },
      ...[
        { text: '{}', values: [], lower: 1 },
        { text: '{1}', values: [1], lower: 1 },
        { text: '{2}', values: [2], lower: 1 },
        { text: '{1,NULL}', values: [1, null], lower: 1 },
        { text: '[-1:-1]={1}', values: [1], lower: -1 },
      ].map((a) => ({
        text: a.text,
        cell: {
          kind: 'Array' as const,
          value: {
            elementType: 'pg_catalog.int4',
            elementKind: 2,
            elements: a.values.map(int),
            dimensions: a.values.length ? [{ lower: a.lower, length: a.values.length }] : [],
            nullBitmap: { kind: 'Value' as const, value: a.values.includes(null) },
          },
        },
      })),
    ]
    for (const a of arraySamples)
      for (const b of arraySamples)
        await native(
          "SELECT isempty(array_record_span(ROW(1,$1::int4[])::array_record,ROW(1,$2::int4[])::array_record,'[]')) value",
          [a.text, b.text],
          `range_empty_state(${construct('public.array_record_span', 'public.array_record', arrayContext, record('public.array_record', [int(1), a.cell]), record('public.array_record', [int(1), b.cell]), '[]')})`,
        )
    const nestedNodes = [
        {
          ...node('public.nested_record', 44),
          fields: [field('public.leaf', 1), field('pg_catalog.int4', 4)],
        },
        { ...leafNodes[0]!, fields: [field('pg_catalog.int4', 2), field('pg_catalog.text', 3)] },
        node('pg_catalog.int4', 2),
        node('pg_catalog.text', 8),
        node('pg_catalog.int4', 2),
      ],
      nestedContext = profile(nestedNodes)
    for (let a = 0; a < cells.length; a++)
      for (let b = 0; b < cells.length; b++)
        await native(
          "SELECT isempty(nested_record_span(ROW($1::leaf,1)::nested_record,ROW($2::leaf,1)::nested_record,'[]')) value",
          [encoded[a], encoded[b]],
          `range_empty_state(${construct('public.nested_record_span', 'public.nested_record', nestedContext, record('public.nested_record', [cells[a]!, int(1)]), record('public.nested_record', [cells[b]!, int(1)]), '[]')})`,
        )
    cases.push(
      {
        rust: `range_empty_state(${span(record('public.leaf', [int(1), { kind: 'Unknown' }]), record('public.leaf', [int(2), { kind: 'Unknown' }]), '[]')})`,
        expected: { kind: 'False' },
      },
      {
        rust: `range_empty_state(${span(record('public.leaf', [{ kind: 'Unknown' }, text('a')]), record('public.leaf', [{ kind: 'Unknown' }, text('b')]), '[]')})`,
        expected: { kind: 'Unknown' },
      },
      {
        rust: `range_empty_state(${span(record('public.other', [int(1), text('a')]), nullCell, '[]')})`,
        expected: { kind: 'Unknown' },
      },
      {
        rust: `range_empty_state(${span(record('public.leaf', [int(1)]), nullCell, '[]')})`,
        expected: { kind: 'Unknown' },
      },
    )
    await native(
      "SELECT isempty(span(ROW(1/0,'a')::leaf,NULL,'bad')) value",
      [],
      `range_empty_state(${span(record('public.leaf', [{ kind: 'Error', value: { state: parseInt('22012', 36) } }, text('a')]), nullCell, 'bad')})`,
    )
    await pg.exec(
      'CREATE TYPE narrow AS(n int2);CREATE TYPE narrow_span AS RANGE(subtype=narrow);CREATE TYPE shorts AS RANGE(subtype=int2);CREATE TYPE bags AS RANGE(subtype=int2[])',
    )
    const narrowContext = profile([
        { ...node('public.narrow', 44), fields: [field('pg_catalog.int2', 1)] },
        node('pg_catalog.int2', 1),
      ]),
      bagContext = profile([
        { ...node('pg_catalog._int2', 41), elementType: 'pg_catalog.int2', child: 1 },
        node('pg_catalog.int2', 1),
      ])
    const int4eq = functionMetadata(
      'function:["pg_catalog","int4eq"](pg_catalog.int4,pg_catalog.int4)',
    ).rustName
    for (const [lower, upper] of [
      [1, 1000],
      [1000, 1],
      [-2000, 1000],
      [0, 0],
    ]) {
      const n = (value: number): RangeInputCell => ({ kind: 'Int2', value })
      const bag = (value: number): RangeInputCell => ({
        kind: 'Array',
        value: {
          elementType: 'pg_catalog.int2',
          elementKind: 1,
          elements: [n(value)],
          dimensions: [{ lower: 1, length: 1 }],
          nullBitmap: { kind: 'Value', value: false },
        },
      })
      const entries = [
        {
          sql: 'range_cmp(narrow_span(ROW($1)::narrow,NULL),narrow_span(ROW($2)::narrow,NULL))',
          left: construct(
            'public.narrow_span',
            'public.narrow',
            narrowContext,
            record('public.narrow', [n(lower!)]),
            nullCell,
          ),
          right: construct(
            'public.narrow_span',
            'public.narrow',
            narrowContext,
            record('public.narrow', [n(upper!)]),
            nullCell,
          ),
        },
        {
          sql: 'range_cmp(bags(ARRAY[$1::int2],NULL),bags(ARRAY[$2::int2],NULL))',
          left: construct(
            'public.bags',
            'pg_catalog._int2',
            bagContext,
            bag(lower!),
            nullCell,
            '[)',
            41,
            41,
          ),
          right: construct(
            'public.bags',
            'pg_catalog._int2',
            bagContext,
            bag(upper!),
            nullCell,
            '[)',
            41,
            41,
          ),
        },
        {
          sql: 'range_cmp(shorts($1::int2,NULL),shorts($2::int2,NULL))',
          left: construct(
            'public.shorts',
            'pg_catalog.int2',
            'empty_range_bound_context()',
            n(lower!),
            nullCell,
            '[)',
            1,
            1,
          ),
          right: construct(
            'public.shorts',
            'pg_catalog.int2',
            'empty_range_bound_context()',
            n(upper!),
            nullCell,
            '[)',
            1,
            1,
          ),
        },
      ]
      for (const entry of entries) {
        const value = (
          await pg.query<{ value: number }>(`SELECT ${entry.sql} value`, [lower, upper])
        ).rows[0]!.value
        cases.push({
          rust: `${int4eq}(sql__pg_catalog__range_cmp__8jgl(${entry.left},${entry.right}),make_int4_value(${value}))`,
          expected: { kind: 'True' },
          reference: { exactComparator: entry.sql, lower, upper, value },
        })
      }
    }
    const entryName = checkRustEntryName({
        schema: 'public',
        kind: 'table',
        owner: 'composite_range_values',
        constraint: 'probe',
      }),
      evaluatorSource = `pub fn ${entryName}(mode:Int4Value)->CheckOutcome{let result=composite_range_probe(mode);check_from_bool(result)}`,
      source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    const chunks = Array.from(
      { length: Math.ceil(cases.length / 64) },
      (_, part) =>
        `fn composite_range_part_${part}(mode:i32)->BoolValue{${cases
          .slice(part * 64, (part + 1) * 64)
          .map((c, i) => `if mode==${part * 64 + i}{return ${c.rust};};`)
          .join('\n')}BoolValue::Unknown}`,
    )
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.push({
        path: 'tests/composite_range_values.rs',
        source:
          builders.join('\n') +
          '\n' +
          chunks.join('\n') +
          `\npub fn composite_range_probe(input:Int4Value)->BoolValue{if let Int4Value::Value(mode)=input{${chunks.map((_, i) => `if mode<${(i + 1) * 64}{return composite_range_part_${i}(mode);};`).join('\n')}}BoolValue::Unknown}`,
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
    await mkdir('artifacts/composite-range-values', { recursive: true })
    await writeFile(
      'artifacts/composite-range-values/report.json',
      JSON.stringify({ fixtures: cases.length, cases }, null, 2) + '\n',
    )
    await runCheckParity(
      root,
      'compositerangevalues',
      group,
      ['probe'],
      cases.map((item, mode) => ({
        name: 'probe',
        row: { mode: { kind: 'Value', value: mode } },
        expected: item.expected,
      })),
    )
    expect(cases.length).toBe(585)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 360_000)
