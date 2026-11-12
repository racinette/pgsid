import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { renderGoSchemaArtifacts } from '../../src/codegen/go/schema.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { parseConfigString } from '../../src/config/loader.js'
import { customRangeSchema } from './check-custom-range-fixtures.js'
import { textRangeSchema } from './check-text-range-fixtures.js'
import { rangeTypescriptInput, type RangeInputPayload } from '../../tools/check-rust/range-input.js'
import {
  multirangeTypescriptInput,
  type MultirangeInputPayload,
} from '../../tools/check-rust/multirange-input.js'
import {
  arrayTypescriptInput,
  type OwnedArrayInputPayload,
} from '../../tools/check-rust/array-input.js'
import { differingChecks, serverCheckResults } from '../support/check-server-results.js'
import { internalCheckRows } from '../support/check-entries.js'
import { writeGoModule } from '../support/go-module.js'

it('uses portable captured profiles in public custom range and multirange adapters across independent catalogs', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-custom-range-payload-')),
    run = promisify(execFile)
  const schema =
    customRangeSchema +
    textRangeSchema +
    `
CREATE TABLE custom_text_payloads(v "Text.Range".words,w "Text.Range".words,m word_sets,items "Text.Range".words[],bypass bool,
 CONSTRAINT lower_text CHECK(CASE WHEN bypass THEN true ELSE lower(v) COLLATE "C"='a' COLLATE "C" END),
 CONSTRAINT ordered_text CHECK(CASE WHEN bypass THEN true ELSE v<w END),
 CONSTRAINT intersected_text CHECK(CASE WHEN bypass THEN true ELSE v*v=v END),
 CONSTRAINT sent_text CHECK(CASE WHEN bypass THEN true ELSE range_send(v) IS NOT NULL END),
 CONSTRAINT hashed_text CHECK(CASE WHEN bypass THEN true ELSE hash_range(v)=hash_range('[a,z]'::"Text.Range".words) END),
 CONSTRAINT multi_text CHECK(CASE WHEN bypass THEN true ELSE m::text COLLATE "C"='{[a,z]}' COLLATE "C" END),
 CONSTRAINT fetched_text CHECK(CASE WHEN bypass THEN true ELSE items[-2]=v END),
 CONSTRAINT searched_text CHECK(CASE WHEN bypass THEN true ELSE array_position(items,v)=-2 END),
 CONSTRAINT json_text CHECK(CASE WHEN bypass THEN true ELSE to_jsonb(items)::text COLLATE "C"='["[a,z]", null, "[é,漢]"]' COLLATE "C" END));
CREATE DOMAIN saved_custom_span AS "Custom.Range".integer_span;
CREATE FUNCTION "Custom.Range".default_span(lo int4 DEFAULT 1,hi int4 DEFAULT 2,bounds text DEFAULT '[]') RETURNS "Custom.Range".integer_span AS 'range_constructor3' LANGUAGE internal IMMUTABLE;
CREATE FUNCTION "Custom.Range".default_set(item "Custom.Range".integer_span DEFAULT '[1,2]'::"Custom.Range".integer_span) RETURNS integer_set AS 'multirange_constructor1' LANGUAGE internal IMMUTABLE STRICT;
CREATE FUNCTION "Custom.Range".default_many(VARIADIC items "Custom.Range".integer_span[] DEFAULT ARRAY['[1,2]'::"Custom.Range".integer_span,'[3,4]'::"Custom.Range".integer_span]) RETURNS integer_set AS 'multirange_constructor2' LANGUAGE internal IMMUTABLE STRICT;
CREATE TABLE custom_payloads(v saved_custom_span,w "Custom.Range".integer_span,m integer_set,n integer_set,p "Custom.Range".positive_span,e "Custom.Range".positive,
 CONSTRAINT bound CHECK(lower(v)=e),CONSTRAINT adjacent CHECK(NOT(v -|- w)),
 CONSTRAINT multi CHECK(NOT(m -|- n)),CONSTRAINT nominal_element CHECK(p @> e),
 CONSTRAINT default_range CHECK("Custom.Range".default_span()=v),
 CONSTRAINT default_named_range CHECK("Custom.Range".default_span(hi=>upper(v))=v),
 CONSTRAINT default_set CHECK("Custom.Range".default_set()=m),
 CONSTRAINT constructed_range CHECK("Custom.Range".integer_span(e,upper(v),'[]')=v),
 CONSTRAINT constructed_single CHECK("Custom.Range".integer_set(v)=m),
 CONSTRAINT constructed_many CHECK("Custom.Range".integer_set(v,v)=m),
 CONSTRAINT constructed_empty CHECK(isempty("Custom.Range".integer_set())),
 CONSTRAINT rendered_range CHECK(v::text COLLATE "C"='[1,2]' COLLATE "C"),
 CONSTRAINT rendered_multirange CHECK(m::text COLLATE "C"='{[1,2]}' COLLATE "C"),
 CONSTRAINT json_range CHECK(to_jsonb(v)::text COLLATE "C"='"[1,2]"' COLLATE "C"),
 CONSTRAINT json_multirange CHECK(to_json(m)::text COLLATE "C"='"{[1,2]}"' COLLATE "C"),
 CONSTRAINT json_domain CHECK(to_jsonb(p)::text COLLATE "C"='"[1,2]"' COLLATE "C"),
 CONSTRAINT rendered_domain CHECK(p::text COLLATE "C"='[1,2]' COLLATE "C"));
CREATE TABLE custom_callbacks(v "Custom.Range".reverse_span,w "Custom.Range".reverse_span,e int4,bypass bool,
 CONSTRAINT bound CHECK(lower(v)=e),CONSTRAINT ordered CHECK(v<w),CONSTRAINT guarded CHECK(CASE WHEN bypass THEN true ELSE v<w END),
 CONSTRAINT rendered CHECK(v::text COLLATE "C"='[4,1]' COLLATE "C"));
CREATE TABLE custom_hulls(m opaque_set,CONSTRAINT hull CHECK(isempty(range_merge(m))));
CREATE TABLE custom_imports(payload text,expected "Custom.Range".integer_span,bypass bool,
 CONSTRAINT parsed CHECK(CASE WHEN bypass THEN true ELSE payload::"Custom.Range".integer_span IS NOT DISTINCT FROM expected END),
 CONSTRAINT called CHECK(CASE WHEN bypass THEN true ELSE "Custom.Range".integer_span(payload) IS NOT DISTINCT FROM expected END));
CREATE TABLE custom_multi_imports(payload text,expected integer_set,bypass bool,
 CONSTRAINT parsed CHECK(CASE WHEN bypass THEN true ELSE payload::integer_set IS NOT DISTINCT FROM expected END),
 CONSTRAINT called CHECK(CASE WHEN bypass THEN true ELSE public.integer_set(payload) IS NOT DISTINCT FROM expected END));
CREATE DOMAIN custom_array_cell AS "Custom.Range".integer_span;
CREATE DOMAIN custom_windows AS "Custom.Range".integer_span[];
CREATE TABLE custom_array_payloads(windows custom_windows,typed custom_array_cell[],histories custom_windows[],head "Custom.Range".integer_span,expected_pack integer_set,bypass bool,
 CONSTRAINT counted CHECK(CASE WHEN bypass THEN true ELSE cardinality(windows)=3 END),
 CONSTRAINT fetched CHECK(CASE WHEN bypass THEN true ELSE windows[1] IS NOT DISTINCT FROM head END),
 CONSTRAINT typed_cell CHECK(CASE WHEN bypass THEN true ELSE typed[1] IS NOT DISTINCT FROM head END),
 CONSTRAINT history CHECK(CASE WHEN bypass THEN true ELSE (histories[1])[1] IS NOT DISTINCT FROM head END),
 CONSTRAINT sorted CHECK(CASE WHEN bypass THEN true ELSE array_sort(windows)=windows END),
 CONSTRAINT json_windows CHECK(CASE WHEN bypass THEN true ELSE to_jsonb(windows)::text COLLATE "C"='["[1,2]", "[1,2]", "[3,4]"]' COLLATE "C" END),
 CONSTRAINT json_history CHECK(CASE WHEN bypass THEN true ELSE to_jsonb(histories)::text COLLATE "C"='[["[1,2]", "[1,2]", "[3,4]"]]' COLLATE "C" END),
 CONSTRAINT default_many CHECK(CASE WHEN bypass THEN true ELSE "Custom.Range".default_many() IS NOT DISTINCT FROM expected_pack END),
 CONSTRAINT packed CHECK(CASE WHEN bypass THEN true ELSE "Custom.Range".integer_set(VARIADIC windows) IS NOT DISTINCT FROM expected_pack END));
CREATE TABLE custom_multi_array_payloads(windows integer_set[],head integer_set,bypass bool,
 CONSTRAINT counted CHECK(CASE WHEN bypass THEN true ELSE cardinality(windows)=3 END),
 CONSTRAINT fetched CHECK(CASE WHEN bypass THEN true ELSE windows[1] IS NOT DISTINCT FROM head END),
 CONSTRAINT json_sets CHECK(CASE WHEN bypass THEN true ELSE to_jsonb(windows)::text COLLATE "C"='["{[1,2]}", "{[1,2]}", "{[3,4]}"]' COLLATE "C" END),
 CONSTRAINT sorted CHECK(CASE WHEN bypass THEN true ELSE array_sort(windows)=windows END));`
  try {
    await pg.exec(schema)
    const catalog = await snapshotCatalog(pg)
    const ts = renderTypescriptSchemaCheckArtifacts(
      catalog.tables,
      catalog.domains,
      catalog.domains,
      {
        enums: catalog.enums,
        rangeTypes: catalog.rangeTypes,
        executionContext: {
          defaultCollation: 'C',
          serverEncoding: 'UTF8',
          nativeByteOrder: 'little',
        },
      },
    )
    const shifted = await PGlite.create()
    try {
      await shifted.exec('CREATE TABLE discarded_slots(value text);DROP TABLE discarded_slots;')
      await shifted.exec(schema)
      const other = await snapshotCatalog(shifted)
      expect(other.domains.find((domain) => domain.name === 'positive')!.oid).not.toBe(
        catalog.domains.find((domain) => domain.name === 'positive')!.oid,
      )
      const alternate = renderTypescriptSchemaCheckArtifacts(
        other.tables,
        other.domains,
        other.domains,
        {
          enums: other.enums,
          rangeTypes: other.rangeTypes,
          executionContext: {
            defaultCollation: 'C',
            serverEncoding: 'UTF8',
            nativeByteOrder: 'little',
          },
        },
      )
      expect(alternate).toEqual(ts)
    } finally {
      await shifted.close()
    }
    const go = renderGoSchemaArtifacts(
      catalog,
      parseConfigString(
        'schema: schema.sql\nsql:\n  codegen:\n    checks: {defaultCollation: C, serverEncoding: UTF8, nativeByteOrder: little}\n    go:\n      schema: {outDir: schema}\n',
      ),
      {},
      join(root, 'schema'),
      'custompayload/schema',
    )
    expect(go.diagnostics).toEqual([])
    await writeFile(join(root, 'package.json'), '{"type":"module"}\n')
    await writeFile(join(root, 'checks.ts'), ts.checks)
    for (const artifact of checkTypescriptArtifacts(ts.rustFiles!)) {
      const path = join(root, 'checks-rust', artifact.path)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, artifact.content)
    }
    for (const artifact of go.artifacts) {
      await mkdir(dirname(artifact.path), { recursive: true })
      await writeFile(artifact.path, artifact.content)
    }
    await run('node_modules/.bin/tsc', [
      '--strict',
      '--skipLibCheck',
      '--target',
      'es2022',
      '--module',
      'nodenext',
      '--moduleResolution',
      'nodenext',
      '--outDir',
      join(root, 'js'),
      join(root, 'checks.ts'),
    ]).catch((error: { stdout: string; stderr: string }) => {
      throw new Error(error.stdout + error.stderr, { cause: error })
    })
    const generated = await import(pathToFileURL(join(root, 'js/checks.js')).href)
    const runtime = await import(pathToFileURL(join(root, 'js/checks-rust/checks.js')).href)
    const internal = internalCheckRows(ts.checks, runtime)
    type Result = { certain: boolean; value?: boolean | null; error?: string }
    const resultMap = (results: { constraint: string; result: Result }[]): Record<string, Result> =>
      Object.fromEntries(results.map((result) => [result.constraint, result.result]))
    const mismatches: ReturnType<typeof differingChecks> = []
    const show = (row: unknown) =>
      JSON.stringify(row, (_key, item) => (typeof item === 'bigint' ? `${item}n` : item))
    // Each public row decides every check as the server does with the same values.
    const compare = async (
      table: string,
      evaluate: (row: object) => { constraint: string; result: Result }[],
      row: object,
      text: Record<string, string | null>,
      skip: readonly string[] = [],
    ) => {
      const before = structuredClone(row)
      const local = resultMap(evaluate(row)),
        server = await serverCheckResults(pg, table, text)
      for (const name of skip) {
        delete local[name]
        delete server[name]
      }
      mismatches.push(...differingChecks(`${table} ${show(row)}`, local, server))
      expect(row).toEqual(before)
    }
    const span = (lower: unknown, upper: unknown) => ({
      empty: false,
      lower: lower === null ? null : { value: lower, inclusive: true },
      upper: upper === null ? null : { value: upper, inclusive: true },
    })
    const True = { kind: 'True' }
    const undecided = (outcome: unknown, label?: string) =>
      expect(['Unknown', 'Unimplemented'], label).toContain((outcome as { kind: string }).kind)
    // Support other than the type's own never decides a check wrongly.
    const trueOrUndecided = (outcomes: Record<string, unknown>, label: string) => {
      for (const [name, outcome] of Object.entries(outcomes))
        expect(['True', 'Unknown', 'Unimplemented'], `${label} ${name}`).toContain(
          (outcome as { kind: string }).kind,
        )
    }
    // Internal ranges and multiranges as stored, with whatever support and identity they carry.
    const payload = (
      name: string,
      lower: number,
      upper: number,
      elementType = 'pg_catalog.int4',
    ): RangeInputPayload => ({
      typeName: '"Custom.Range".' + name,
      elementType,
      elementKind: 2,
      empty: false,
      lowerInclusive: true,
      upperInclusive: true,
      bounds: [
        { kind: 'Int4', value: lower },
        { kind: 'Int4', value: upper },
      ],
    })
    const packPayload = (
      type: string,
      ...members: RangeInputPayload[]
    ): MultirangeInputPayload => ({
      typeName: 'public.' + type,
      rangeType: members[0]!.typeName,
      elementType: members[0]!.elementType,
      elementKind: members[0]!.elementKind,
      ranges: members.map((value) => ({ kind: 'Value', value })),
    })
    const range = (value: RangeInputPayload): unknown =>
      runtime.makeCoercedRangeValue(rangeTypescriptInput(value, runtime))
    const multirange = (value: MultirangeInputPayload): unknown =>
      runtime.makeCoercedMultirangeValue(multirangeTypescriptInput(value, runtime))
    const array = (value: OwnedArrayInputPayload): unknown =>
      runtime.makeArrayValue(arrayTypescriptInput(value, runtime))

    // Text ranges: bounds are text, ordered under the range's collation.
    const textRow = {
      v: span('a', 'z'),
      w: span('é', '漢'),
      m: [span('a', 'z')],
      items: [span('a', 'z'), null, span('é', '漢')],
      bypass: false,
    }
    const textText = {
      v: '[a,z]',
      w: '[é,漢]',
      m: '{[a,z]}',
      items: '{"[a,z]",NULL,"[é,漢]"}',
      bypass: 'false',
    }
    await compare(
      'custom_text_payloads',
      generated.evaluatePublicCustomTextPayloadsChecks,
      textRow,
      textText,
    )
    await compare(
      'custom_text_payloads',
      generated.evaluatePublicCustomTextPayloadsChecks,
      { ...textRow, v: textRow.w, w: textRow.v },
      { ...textText, v: textText.w, w: textText.v },
      // Sending non-ASCII text converts it to the client's encoding, a session setting.
      ['sent_text'],
    )
    for (const bypass of [false, true])
      expect(() =>
        generated.evaluatePublicCustomTextPayloadsChecks({ ...textRow, v: span(1, 'z'), bypass }),
      ).toThrow(TypeError)
    // A stored array starting at -2, under any support, goes to the evaluator entries directly.
    for (const support of [
      undefined,
      { comparison: 8, canonical: 0 },
      { comparison: 0, canonical: 0 },
    ]) {
      const textSpan = (lo: string, hi: string): RangeInputPayload => ({
        typeName: '"Text.Range".words',
        elementType: 'pg_catalog.text',
        elementKind: 8,
        ...(support ? { support } : {}),
        empty: false,
        lowerInclusive: true,
        upperInclusive: true,
        bounds: [
          { kind: 'Text', value: lo },
          { kind: 'Text', value: hi },
        ],
      })
      const first = textSpan('a', 'z'),
        last = textSpan('é', '漢')
      const outcomes = internal('public.custom_text_payloads', {
        v: range(first),
        w: range(last),
        m: multirange({
          typeName: 'public.word_sets',
          rangeType: '"Text.Range".words',
          elementType: 'pg_catalog.text',
          elementKind: 8,
          ...(support ? { support } : {}),
          ranges: [{ kind: 'Value', value: first }],
        }),
        items: array({
          elementType: '"Text.Range".words',
          elementKind: 42,
          dimensions: [{ lower: -2, length: 3 }],
          nullBitmap: { kind: 'Value', value: true },
          elements: [
            { kind: 'Range', value: first },
            { kind: 'Null' },
            { kind: 'Range', value: last },
          ],
        }),
        bypass: runtime.makeBoolValue(false),
      })
      if (support) trueOrUndecided(outcomes, `text ${show(support)}`)
      else
        for (const [name, outcome] of Object.entries(outcomes))
          expect(outcome, `text ${name}`).toEqual(True)
    }
    await pg.exec(
      `INSERT INTO custom_text_payloads VALUES('[a,z]','[é,漢]','{[a,z]}','[-2:0]={"[a,z]",NULL,"[é,漢]"}',false)`,
    )

    // Arrays of custom ranges: the array domain, the element domain and an array of the array
    // domain, whose one declared dimension holds whole windows, each a list of ranges.
    const v = span(1, 2),
      w = span(3, 4)
    const arraysRow = {
      windows: [v, v, w],
      typed: [v, v, w],
      histories: null as unknown,
      head: v,
      expected_pack: [v, w],
      bypass: false,
    }
    const arraysText = {
      windows: '{"[1,2]","[1,2]","[3,4]"}',
      typed: '{"[1,2]","[1,2]","[3,4]"}',
      histories: null as string | null,
      head: '[1,2]',
      expected_pack: '{[1,2],[3,4]}',
      bypass: 'false',
    }
    for (const [histories, text] of [
      [null, null],
      [[null], '{NULL}'],
      [[[v, v, w]], '{"{\\"[1,2]\\",\\"[1,2]\\",\\"[3,4]\\"}"}'],
      [[[v, v, w], null], '{"{\\"[1,2]\\",\\"[1,2]\\",\\"[3,4]\\"}",NULL}'],
    ] as const)
      await compare(
        'custom_array_payloads',
        generated.evaluatePublicCustomArrayPayloadsChecks,
        { ...arraysRow, histories },
        { ...arraysText, histories: text },
      )
    await compare(
      'custom_array_payloads',
      generated.evaluatePublicCustomArrayPayloadsChecks,
      { ...arraysRow, windows: [w, v], typed: [w], expected_pack: [w] },
      { ...arraysText, windows: '{"[3,4]","[1,2]"}', typed: '{"[3,4]"}', expected_pack: '{[3,4]}' },
    )
    const storedWindows: OwnedArrayInputPayload = {
      elementType: '"Custom.Range".integer_span',
      elementKind: 42,
      dimensions: [{ lower: 1, length: 3 }],
      elements: [
        payload('integer_span', 1, 2),
        payload('integer_span', 1, 2),
        payload('integer_span', 3, 4),
      ].map((value) => ({ kind: 'Range' as const, value })),
      nullBitmap: { kind: 'Value', value: false },
    }
    const storedArrays = (windows: OwnedArrayInputPayload) => ({
      windows: array(windows),
      typed: array({ ...windows, elementType: '"public"."custom_array_cell"' }),
      histories: array({
        elementType: '"public"."custom_windows"',
        elementKind: 41,
        dimensions: [{ lower: 1, length: 1 }],
        elements: [{ kind: 'Array', value: windows }],
        nullBitmap: { kind: 'Value', value: false },
      }),
      head: range(payload('integer_span', 1, 2)),
      expected_pack: multirange(
        packPayload('integer_set', payload('integer_span', 1, 2), payload('integer_span', 3, 4)),
      ),
      bypass: runtime.makeBoolValue(false),
    })
    for (const [name, outcome] of Object.entries(
      internal('public.custom_array_payloads', storedArrays(storedWindows)),
    ))
      expect(outcome, `array ${name}`).toEqual(True)
    const forgedWindows = structuredClone(storedWindows)
    for (const cell of forgedWindows.elements)
      if (cell.kind === 'Range') cell.value.support = { comparison: 99, canonical: 99 }
    trueOrUndecided(
      internal('public.custom_array_payloads', storedArrays(forgedWindows)),
      'forged array',
    )
    undecided(
      internal('public.custom_array_payloads', {
        ...storedArrays(storedWindows),
        windows: array({ ...storedWindows, elementType: 'pg_catalog.int4range' }),
      })['counted'],
    )

    // Arrays of custom multiranges: the column declares one dimension, so each element is a whole
    // multirange, itself a list of ranges, read by the server as quoted multirange text.
    const multiRow = { windows: [null, null, null] as unknown, head: [v], bypass: false }
    for (const [windows, text] of [
      [[null, null, null], '{NULL,NULL,NULL}'],
      [[], '{}'],
      [[[v], [v], [w]], '{"{[1,2]}","{[1,2]}","{[3,4]}"}'],
      [[[v, w], [], null], '{"{[1,2],[3,4]}","{}",NULL}'],
    ] as const)
      await compare(
        'custom_multi_array_payloads',
        generated.evaluatePublicCustomMultiArrayPayloadsChecks,
        { ...multiRow, windows },
        { windows: text, head: '{[1,2]}', bypass: 'false' },
      )
    // A range where a multirange belongs, or a NULL member inside one, is no multirange.
    for (const windows of [
      [v, v, w],
      [[null], [null], [null]],
    ])
      expect(() =>
        generated.evaluatePublicCustomMultiArrayPayloadsChecks({ ...multiRow, windows }),
      ).toThrow(TypeError)
    for (const support of [undefined, { comparison: 99, canonical: 99 }]) {
      const set = (...members: RangeInputPayload[]) => {
        const value = packPayload('integer_set', ...members)
        if (support) {
          value.support = support
          for (const member of value.ranges)
            if (member.kind === 'Value') member.value.support = support
        }
        return value
      }
      const windows: OwnedArrayInputPayload = {
        elementType: 'public.integer_set',
        elementKind: 43,
        dimensions: [{ lower: 1, length: 3 }],
        elements: [
          set(payload('integer_span', 1, 2)),
          set(payload('integer_span', 1, 2)),
          set(payload('integer_span', 3, 4)),
        ].map((value) => ({ kind: 'Multirange' as const, value })),
        nullBitmap: { kind: 'Value', value: false },
      }
      const stored = {
        windows: array(windows),
        head: multirange(packPayload('integer_set', payload('integer_span', 1, 2))),
        bypass: runtime.makeBoolValue(false),
      }
      const outcomes = internal('public.custom_multi_array_payloads', stored)
      if (support) trueOrUndecided(outcomes, 'forged multirange array')
      else
        for (const [name, outcome] of Object.entries(outcomes))
          expect(outcome, `multirange array ${name}`).toEqual(True)
      const wrong = structuredClone(windows)
      const cell = wrong.elements[0]!
      if (cell.kind === 'Multirange') cell.value.rangeType = 'pg_catalog.int4range'
      undecided(
        internal('public.custom_multi_array_payloads', { ...stored, windows: array(wrong) })[
          'fetched'
        ],
      )
    }

    // Custom range input through casts and constructor calls.
    for (const [text, bypass] of [
      ['[1,2]', false],
      ['[1,3]', false],
      ['[bad,3]', false],
      ['[bad,3]', true],
    ] as const)
      await compare(
        'custom_imports',
        generated.evaluatePublicCustomImportsChecks,
        { payload: text, expected: v, bypass },
        { payload: text, expected: '[1,2]', bypass: String(bypass) },
      )
    expect(
      resultMap(
        generated.evaluatePublicCustomImportsChecks({
          payload: '[1,2]',
          expected: v,
          bypass: false,
        }),
      ).parsed,
    ).toEqual({ certain: true, value: true })
    for (const [text, bypass, expected] of [
      ['{[1,2]}', false, { certain: true, value: true }],
      ['{[1,3]}', false, { certain: true, value: false }],
      ['{[bad,3]}', false, { certain: true, error: '22P02' }],
      ['{[bad,3]}', true, { certain: true, value: true }],
    ] as const) {
      expect(
        resultMap(
          generated.evaluatePublicCustomMultiImportsChecks({
            payload: text,
            expected: [v],
            bypass,
          }),
        ).parsed,
      ).toMatchObject(expected)
      await compare(
        'custom_multi_imports',
        generated.evaluatePublicCustomMultiImportsChecks,
        { payload: text, expected: [v], bypass },
        { payload: text, expected: '{[1,2]}', bypass: String(bypass) },
      )
    }

    // Captured support decides constructors, defaults, output and JSON of custom ranges.
    const row = { v, w, m: [v], n: [w], p: v, e: 1 }
    const rowText = { v: '[1,2]', w: '[3,4]', m: '{[1,2]}', n: '{[3,4]}', p: '[1,2]', e: '1' }
    for (const result of Object.values(
      resultMap(generated.evaluatePublicCustomPayloadsChecks(row)),
    ))
      expect(result).toEqual({ certain: true, value: true })
    await compare('custom_payloads', generated.evaluatePublicCustomPayloadsChecks, row, rowText)
    expect(resultMap(generated.evaluatePublicCustomPayloadsChecks({ ...row, e: 2 })).bound).toEqual(
      { certain: true, value: false },
    )
    for (const change of [
      [{ e: 2 }, { e: '2' }],
      [{ v: span(2, 1) }, { v: '[2,1]' }],
      [
        { m: [v, w], n: [] },
        { m: '{[1,2],[3,4]}', n: '{}' },
      ],
    ] as const)
      await compare(
        'custom_payloads',
        generated.evaluatePublicCustomPayloadsChecks,
        { ...row, ...change[0] },
        { ...rowText, ...change[1] },
      )
    // A bound is null or its value with an inclusivity: the former flat bounds with flags, a null
    // or missing bound value and a bound without a boolean inclusivity are malformed.
    for (const value of [
      { kind: 'Value', value: payload('integer_span', 1, 2) },
      span(1n, 2),
      { empty: false, lower: 1, upper: 2, lowerInclusive: true, upperInclusive: true },
      {
        empty: false,
        lower: { value: null, inclusive: true },
        upper: { value: 2, inclusive: true },
      },
      { empty: false, lower: { inclusive: true }, upper: null },
      { empty: false, lower: { value: 1 }, upper: { value: 2, inclusive: true } },
      {
        empty: false,
        lower: { value: 1, inclusive: true },
        upper: { value: 2, inclusive: 'true' },
      },
    ])
      for (const change of [{ v: value }, { m: [value] }])
        expect(
          () => generated.evaluatePublicCustomPayloadsChecks({ ...row, ...change }),
          show(change),
        ).toThrow(TypeError)
    // Stored values with forged support, another nominal type or an unknown bound go to the
    // evaluator entries directly.
    const storedRow = (support?: { comparison: number; canonical: number }) => {
      const with_ = (value: RangeInputPayload) => (support ? { ...value, support } : value)
      const pack = (member: RangeInputPayload) => {
        const value = packPayload('integer_set', with_(member))
        return support ? { ...value, support } : value
      }
      return {
        v: range(with_(payload('integer_span', 1, 2))),
        w: range(with_(payload('integer_span', 3, 4))),
        m: multirange(pack(payload('integer_span', 1, 2))),
        n: multirange(pack(payload('integer_span', 3, 4))),
        p: range(with_(payload('positive_span', 1, 2, '"Custom.Range".positive'))),
        e: runtime.makeInt4Value(1),
      }
    }
    for (const [name, outcome] of Object.entries(internal('public.custom_payloads', storedRow())))
      expect(outcome, `custom ${name}`).toEqual(True)
    trueOrUndecided(
      internal('public.custom_payloads', storedRow({ comparison: 2, canonical: 2 })),
      'forged custom',
    )
    undecided(
      internal('public.custom_payloads', {
        ...storedRow(),
        v: range(payload('positive_span', 1, 2)),
      })['bound'],
    )
    undecided(
      internal('public.custom_payloads', {
        ...storedRow(),
        v: range({
          ...payload('integer_span', 1, 2),
          bounds: [{ kind: 'Unknown' }, { kind: 'Int4', value: 2 }],
        }),
      })['bound'],
    )

    // A comparator written in SQL and a canonical function in PL/pgSQL are the deployment's
    // code, so what reads them stays undecided. Range input orders public bounds with the
    // comparator, so even reading such a range waits for it, bypassed or not, since the server may
    // reject it as it reads the row; a stored range is already ordered.
    const callbacksRow = { v: span(4, 1), w: span(3, 1), e: 4, bypass: true }
    const callbacks = resultMap(generated.evaluatePublicCustomCallbacksChecks(callbacksRow))
    expect(callbacks.bound).toMatchObject({ certain: false })
    expect(callbacks.ordered).toMatchObject({ certain: false })
    expect(callbacks.guarded).toMatchObject({ certain: false })
    expect(callbacks.rendered).toMatchObject({ certain: false })
    await compare(
      'custom_callbacks',
      generated.evaluatePublicCustomCallbacksChecks,
      callbacksRow,
      { v: '[4,1]', w: '[3,1]', e: '4', bypass: 'true' },
      ['bound', 'ordered', 'guarded', 'rendered'],
    )
    const storedCallbacks = internal('public.custom_callbacks', {
      v: range(payload('reverse_span', 4, 1)),
      w: range(payload('reverse_span', 3, 1)),
      e: runtime.makeInt4Value(4),
      bypass: runtime.makeBoolValue(true),
    })
    expect(storedCallbacks['bound']).toEqual(True)
    undecided(storedCallbacks['ordered'])
    expect(storedCallbacks['guarded']).toEqual(True)
    expect(storedCallbacks['rendered']).toEqual(True)
    expect(
      resultMap(generated.evaluatePublicCustomHullsChecks({ m: [span(1, 2), span(5, 6)] })).hull,
    ).toMatchObject({ certain: false })
    await pg.exec(
      `INSERT INTO custom_payloads VALUES('[1,2]','[3,4]','{[1,2]}','{[3,4]}','[1,2]',1)`,
    )
    await expect(
      pg.exec(`INSERT INTO custom_payloads VALUES('[1,2]','[3,4]','{[1,2]}','{[3,4]}','[1,2]',2)`),
    ).rejects.toMatchObject({ code: '23514' })
    await expect(pg.exec(`INSERT INTO custom_hulls VALUES('{[1,2],[5,6]}')`)).rejects.toMatchObject(
      { code: '22000' },
    )
    await pg.exec(`INSERT INTO custom_multi_imports VALUES('{[1,2]}','{[1,2]}',false)`)
    await pg.exec(
      `INSERT INTO custom_array_payloads VALUES(ARRAY['[1,2]'::"Custom.Range".integer_span,'[1,2]'::"Custom.Range".integer_span,'[3,4]'::"Custom.Range".integer_span],ARRAY['[1,2]'::custom_array_cell,'[1,2]'::custom_array_cell,'[3,4]'::custom_array_cell],ARRAY[ARRAY['[1,2]'::"Custom.Range".integer_span,'[1,2]'::"Custom.Range".integer_span,'[3,4]'::"Custom.Range".integer_span]::custom_windows],'[1,2]','{[1,2],[3,4]}',false)`,
    )
    await pg.exec(
      `INSERT INTO custom_multi_array_payloads VALUES(ARRAY['{[1,2]}'::integer_set,'{[1,2]}'::integer_set,'{[3,4]}'::integer_set],'{[1,2]}',false)`,
    )
    await expect(
      pg.exec(`INSERT INTO custom_multi_imports VALUES('{[1,3]}','{[1,2]}',false)`),
    ).rejects.toMatchObject({ code: '23514' })
    await expect(
      pg.exec(`INSERT INTO custom_multi_imports VALUES('{[bad,3]}','{[1,2]}',false)`),
    ).rejects.toMatchObject({ code: '22P02' })
    await writeGoModule(root, 'custompayload')
    await writeFile(
      join(root, 'schema/public/custom_test.go'),
      `package public
import("testing";"fmt";checkruntime "custompayload/schema/public/checkrust/checkruntime";custom "custompayload/schema/schema_437573746f6d2e52616e6765")
func span(name string,lo int,hi int,element string,forge bool)checkruntime.RangeValue{
 support:=checkruntime.RangeSupport{};if forge{support=checkruntime.RangeSupport{Comparison:2,Canonical:2}}
 return checkruntime.MakeCoercedRangeValue(checkruntime.RangePayload{TypeName:"\\"Custom.Range\\"."+name,ElementType:element,ElementKind:2,Support:support,LowerInclusive:true,UpperInclusive:true,Bounds:[]checkruntime.ArrayElement{{Kind:checkruntime.ArrayElementInt4,Int4:lo},{Kind:checkruntime.ArrayElementInt4,Int4:hi}}})
}
func pack(name string,value checkruntime.RangeValue)checkruntime.MultirangeValue{
 return checkruntime.MakeCoercedMultirangeValue(checkruntime.MultirangePayload{TypeName:"public."+name,RangeType:value.Value.TypeName,ElementType:value.Value.ElementType,ElementKind:2,Support:value.Value.Support,Ranges:[]checkruntime.RangeValue{value}})
}
func textSpan(lo string,hi string,comparison int)checkruntime.RangeValue{
 return checkruntime.MakeCoercedRangeValue(checkruntime.RangePayload{TypeName:fmt.Sprintf("%q.%s","Text.Range","words"),ElementType:"pg_catalog.text",ElementKind:8,Support:checkruntime.MakeRangeSupport(comparison,0),LowerInclusive:true,UpperInclusive:true,Bounds:[]checkruntime.ArrayElement{{Kind:checkruntime.ArrayElementText,Text:lo},{Kind:checkruntime.ArrayElementText,Text:hi}}})
}
func TestCustomProfiles(t *testing.T){
 for _,comparison:=range []int{0,8}{
  v:=textSpan("a","z",comparison);w:=textSpan("é","漢",comparison);skip:=false
  m:=checkruntime.MultirangeValue{Kind:checkruntime.MultirangeValueValue,Value:checkruntime.MultirangePayload{TypeName:"public.word_sets",RangeType:v.Value.TypeName,ElementType:"pg_catalog.text",ElementKind:8,Support:checkruntime.MakeRangeSupport(comparison,0),Ranges:[]checkruntime.RangeValue{v}}}
  items:=checkruntime.ArrayValue{Kind:checkruntime.ArrayValueValue,Value:checkruntime.ArrayPayload{ElementType:v.Value.TypeName,ElementKind:42,Dimensions:[]checkruntime.ArrayDimension{{Lower:-2,Length:3}},Elements:[]checkruntime.ArrayElement{{Kind:checkruntime.ArrayElementRange,Range:v.Value},{Kind:checkruntime.ArrayElementNull},{Kind:checkruntime.ArrayElementRange,Range:w.Value}},NullBitmap:checkruntime.MakeBoolValue(true)}}
  input:=PublicCustomTextPayloadsCheckInput{V:KnownCheckValue(v),W:KnownCheckValue(w),M:KnownCheckValue(m),Items:KnownCheckValue(items),Bypass:KnownCheckValue(&skip)}
  for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicCustomTextPayloadsChecks(input); if e != nil {panic(e)}; return r}(){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("text profiles",comparison,c)}}
  if v.Value.Support.Comparison!=comparison||v.Value.Support.Canonical!=0{t.Fatal("text input mutated")}
  bad:=checkruntime.CopyRangeValue(v);bad.Value.Bounds[0]=checkruntime.ArrayElement{Kind:checkruntime.ArrayElementInt4,Int4:1};input.V=KnownCheckValue(bad)
  for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicCustomTextPayloadsChecks(input); if e != nil {return nil}; return r}(){if c.Constraint=="lower_text"&&c.Result.Certain{t.Fatal("malformed text bound",c)}}
  skip=true;for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicCustomTextPayloadsChecks(input); if e != nil {return nil}; return r}(){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("skipped text input",c)}}
 }

 for _,forgeArray:=range []bool{false,true}{
  av:=span("integer_span",1,2,"pg_catalog.int4",false);bv:=span("integer_span",3,4,"pg_catalog.int4",false)
  windows:=checkruntime.ArrayValue{Kind:checkruntime.ArrayValueValue,Value:checkruntime.ArrayPayload{ElementType:av.Value.TypeName,ElementKind:42,Dimensions:[]checkruntime.ArrayDimension{{Lower:1,Length:3}},Elements:[]checkruntime.ArrayElement{{Kind:checkruntime.ArrayElementRange,Range:av.Value},{Kind:checkruntime.ArrayElementRange,Range:av.Value},{Kind:checkruntime.ArrayElementRange,Range:bv.Value}},NullBitmap:checkruntime.MakeBoolValue(false)}}
  if forgeArray{for i:=range windows.Value.Elements{windows.Value.Elements[i].Range.Support=checkruntime.MakeRangeSupport(99,99)}}
  typed:=checkruntime.CopyArrayValue(windows);typed.Value.ElementType=fmt.Sprintf("%q.%q","public","custom_array_cell")
  histories:=checkruntime.ArrayValue{Kind:checkruntime.ArrayValueValue,Value:checkruntime.ArrayPayload{ElementType:fmt.Sprintf("%q.%q","public","custom_windows"),ElementKind:41,Dimensions:[]checkruntime.ArrayDimension{{Lower:1,Length:1}},Elements:[]checkruntime.ArrayElement{{Kind:checkruntime.ArrayElementArray,Array:checkruntime.CopyArrayValue(windows).Value}},NullBitmap:checkruntime.MakeBoolValue(false)}}
  expected:=pack("integer_set",av);expected.Value.Ranges=append(expected.Value.Ranges,bv);skipArrays:=false
  inputArrays:=PublicCustomArrayPayloadsCheckInput{Windows:KnownCheckValue(windows),Typed:KnownCheckValue(typed),Histories:KnownCheckValue(histories),Head:KnownCheckValue(av),ExpectedPack:KnownCheckValue(expected),Bypass:KnownCheckValue(&skipArrays)}
  for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicCustomArrayPayloadsChecks(inputArrays); if e != nil {panic(e)}; return r}(){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("custom array",forgeArray,c)}}
  if forgeArray && windows.Value.Elements[0].Range.Support.Comparison!=99{t.Fatal("array snapshot was mutated")}
  wrong:=checkruntime.CopyArrayValue(windows);wrong.Value.ElementType="pg_catalog.int4range";inputArrays.Windows=KnownCheckValue(wrong)
  for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicCustomArrayPayloadsChecks(inputArrays); if e != nil {return nil}; return r}(){if c.Constraint=="counted"&&c.Result.Certain{t.Fatal("array identity",c)}}
  skipArrays=true;for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicCustomArrayPayloadsChecks(inputArrays); if e != nil {return nil}; return r}(){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("skipped array",c)}}
  mv:=pack("integer_set",av);mw:=pack("integer_set",bv)
  multis:=checkruntime.ArrayValue{Kind:checkruntime.ArrayValueValue,Value:checkruntime.ArrayPayload{ElementType:"public.integer_set",ElementKind:43,Dimensions:[]checkruntime.ArrayDimension{{Lower:1,Length:3}},Elements:[]checkruntime.ArrayElement{{Kind:checkruntime.ArrayElementMultirange,Multirange:mv.Value},{Kind:checkruntime.ArrayElementMultirange,Multirange:mv.Value},{Kind:checkruntime.ArrayElementMultirange,Multirange:mw.Value}},NullBitmap:checkruntime.MakeBoolValue(false)}}
  if forgeArray{for i:=range multis.Value.Elements{multis.Value.Elements[i].Multirange.Support=checkruntime.MakeRangeSupport(99,99);for j:=range multis.Value.Elements[i].Multirange.Ranges{multis.Value.Elements[i].Multirange.Ranges[j].Value.Support=checkruntime.MakeRangeSupport(99,99)}}}
  skipMultis:=false;multiInput:=PublicCustomMultiArrayPayloadsCheckInput{Windows:KnownCheckValue(multis),Head:KnownCheckValue(pack("integer_set",av)),Bypass:KnownCheckValue(&skipMultis)}
  for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicCustomMultiArrayPayloadsChecks(multiInput); if e != nil {panic(e)}; return r}(){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("custom multirange array",forgeArray,c)}}
  if forgeArray&&multis.Value.Elements[0].Multirange.Support.Comparison!=99{t.Fatal("multirange array snapshot was mutated")}
  wrongMulti:=checkruntime.CopyArrayValue(multis);wrongMulti.Value.Elements[0].Multirange.RangeType="pg_catalog.int4range";multiInput.Windows=KnownCheckValue(wrongMulti)
  for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicCustomMultiArrayPayloadsChecks(multiInput); if e != nil {return nil}; return r}(){if c.Constraint=="fetched"&&c.Result.Certain{t.Fatal("multirange array member identity",c)}}
  skipMultis=true;for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicCustomMultiArrayPayloadsChecks(multiInput); if e != nil {return nil}; return r}(){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("skipped multirange array",c)}}
 }
 for _,forge:=range []bool{false,true}{
  v:=span("integer_span",1,2,"pg_catalog.int4",forge);w:=span("integer_span",3,4,"pg_catalog.int4",forge);e:=custom.Positive(1)
  input:=PublicCustomPayloadsCheckInput{V:KnownCheckValue(v),W:KnownCheckValue(w),M:KnownCheckValue(pack("integer_set",v)),N:KnownCheckValue(pack("integer_set",w)),P:KnownCheckValue(span("positive_span",1,2,"\\"Custom.Range\\".positive",forge)),E:KnownCheckValue(&e)}
  for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicCustomPayloadsChecks(input); if e != nil {panic(e)}; return r}(){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("captured support",forge,c)}}
  bad:=v;bad.Value.TypeName="pg_catalog.int4range";input.V=KnownCheckValue(bad)
  for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicCustomPayloadsChecks(input); if e != nil {return nil}; return r}(){if c.Constraint=="bound"&&c.Result.Certain{t.Fatal("nominal identity",c)}}
 }
 payload:="[1,2]";skip:=false;expectedRange:=span("integer_span",1,2,"pg_catalog.int4",false)
 imported:=PublicCustomImportsCheckInput{Payload:KnownCheckValue(&payload),Expected:KnownCheckValue(expectedRange),Bypass:KnownCheckValue(&skip)}
 for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicCustomImportsChecks(imported); if e != nil {panic(e)}; return r}(){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("custom input",c)}}
 payload="[bad,3]";for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicCustomImportsChecks(imported); if e != nil {panic(e)}; return r}(){if !c.Result.Certain||c.Result.Value.Error!="22P02"{t.Fatal("input error",c)}}
 skip=true;for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicCustomImportsChecks(imported); if e != nil {panic(e)}; return r}(){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("skipped input",c)}}
 payload="{[1,2]}";skip=false
 multiImported:=PublicCustomMultiImportsCheckInput{Payload:KnownCheckValue(&payload),Expected:KnownCheckValue(pack("integer_set",expectedRange)),Bypass:KnownCheckValue(&skip)}
 for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicCustomMultiImportsChecks(multiImported); if e != nil {panic(e)}; return r}(){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("custom multirange input",c)}}
 payload="{[bad,3]}";for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicCustomMultiImportsChecks(multiImported); if e != nil {panic(e)}; return r}(){if !c.Result.Certain||c.Result.Value.Error!="22P02"{t.Fatal("multirange input error",c)}}
 skip=true;for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicCustomMultiImportsChecks(multiImported); if e != nil {panic(e)}; return r}(){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("skipped multirange input",c)}}
 e:=int32(4);bypass:=true
 reverse:=PublicCustomCallbacksCheckInput{V:KnownCheckValue(span("reverse_span",4,1,"pg_catalog.int4",true)),W:KnownCheckValue(span("reverse_span",3,1,"pg_catalog.int4",true)),E:KnownCheckValue(&e),Bypass:KnownCheckValue(&bypass)}
 for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicCustomCallbacksChecks(reverse); if e != nil {panic(e)}; return r}(){if c.Constraint=="ordered"{if c.Result.Certain{t.Fatal("unavailable comparator",c)}}else if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("callback independent",c)}}
 opaque:=pack("opaque_set",span("opaque_span",1,2,"pg_catalog.int4",false));opaque.Value.Ranges=append(opaque.Value.Ranges,span("opaque_span",5,6,"pg_catalog.int4",false))
 for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicCustomHullsChecks(PublicCustomHullsCheckInput{M:KnownCheckValue(opaque)}); if e != nil {return nil}; return r}(){if c.Result.Certain{t.Fatal("unavailable canonicalizer",c)}}
}
`,
    )
    await run('go', ['test', '-p', '1', './...'], { cwd: root }).catch(
      (error: { stdout: string; stderr: string }) => {
        throw new Error(error.stdout + error.stderr, { cause: error })
      },
    )
    // Every public case decides as the server does.
    expect(mismatches).toEqual([])
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 240_000)
