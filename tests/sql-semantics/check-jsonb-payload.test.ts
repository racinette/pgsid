import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  renderTypescriptSchemaCheckArtifacts,
  renderTypescriptSchemaChecks,
} from '../../src/codegen/typescript/sql/catalog-checks.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import {
  jsonbInputForms,
  invalidJsonbInputForms,
  deferredJsonbEncodingForms,
} from './check-jsonb-input-forms.js'

it('validates public JSONB logical payloads, rejects malformed graphs and preserves SQL-coerced semantics through real INSERTs', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-jsonb-payload-'))
  try {
    const scalarTargets = {
      numeric: 'numeric',
      int2: 'int2',
      int4: 'int4',
      int8: 'int8',
      float4: 'float4',
      float8: 'float8',
      limited: 'numeric(6,2)',
    }
    const scalarSend: Record<string, string> = {
      numeric: 'numeric_send',
      int2: 'int2send',
      int4: 'int4send',
      int8: 'int8send',
      float4: 'float4send',
      float8: 'float8send',
      limited: 'numeric_send',
    }
    await pg.exec(`CREATE DOMAIN stored_document AS jsonb;CREATE DOMAIN retained_document AS stored_document;
    CREATE TABLE jsonb_payloads(document retained_document,expected_kind text,expected_source text,bypass boolean,
    CONSTRAINT shape CHECK(jsonb_typeof(document) COLLATE "C"=expected_kind COLLATE "C"),
    CONSTRAINT source CHECK(document::text COLLATE "C"=expected_source COLLATE "C"),
    CONSTRAINT present CHECK(document IS NOT NULL),
    CONSTRAINT guarded CHECK(CASE WHEN bypass THEN true ELSE jsonb_typeof(document) COLLATE "C"=expected_kind COLLATE "C" END));
    CREATE TABLE jsonb_text_inputs(source_text text,expected_source text,bypass boolean,
    CONSTRAINT canonical CHECK(CASE WHEN bypass THEN true ELSE source_text::retained_document::text COLLATE "C"=expected_source COLLATE "C" END));
    CREATE TABLE jsonb_read_inputs(document retained_document,field_name text,element_index integer,expected_json text,expected_text text,expected_element_json text,expected_element_text text,expected_count integer,expected_exists boolean,check_count boolean,bypass boolean,
    CONSTRAINT field_source CHECK(CASE WHEN bypass THEN true ELSE (document->field_name)::text COLLATE "C" IS NOT DISTINCT FROM expected_json COLLATE "C" END),
    CONSTRAINT field_text CHECK(CASE WHEN bypass THEN true ELSE (document->>field_name) COLLATE "C" IS NOT DISTINCT FROM expected_text COLLATE "C" END),
    CONSTRAINT element_source CHECK(CASE WHEN bypass THEN true ELSE (document->element_index)::text COLLATE "C" IS NOT DISTINCT FROM expected_element_json COLLATE "C" END),
    CONSTRAINT element_text CHECK(CASE WHEN bypass THEN true ELSE (document->>element_index) COLLATE "C" IS NOT DISTINCT FROM expected_element_text COLLATE "C" END),
    CONSTRAINT array_length CHECK(CASE WHEN bypass OR NOT check_count THEN true ELSE jsonb_array_length(document) IS NOT DISTINCT FROM expected_count END),
    CONSTRAINT key_exists CHECK(CASE WHEN bypass THEN true ELSE (document ? field_name) IS NOT DISTINCT FROM expected_exists END));
    CREATE TABLE jsonb_relation_inputs(lhs retained_document,rhs jsonb,expected_equal boolean,expected_unequal boolean,expected_contains boolean,expected_contained boolean,expected_lower boolean,expected_order integer,bypass boolean,
    CONSTRAINT same_value CHECK(CASE WHEN bypass THEN true ELSE (lhs=rhs) IS NOT DISTINCT FROM expected_equal END),
    CONSTRAINT different_value CHECK(CASE WHEN bypass THEN true ELSE (lhs<>rhs) IS NOT DISTINCT FROM expected_unequal END),
    CONSTRAINT includes_value CHECK(CASE WHEN bypass THEN true ELSE (lhs @> rhs) IS NOT DISTINCT FROM expected_contains END),
    CONSTRAINT included_value CHECK(CASE WHEN bypass THEN true ELSE (lhs <@ rhs) IS NOT DISTINCT FROM expected_contained END),
    CONSTRAINT ordered_value CHECK(CASE WHEN bypass THEN true ELSE (lhs<rhs) IS NOT DISTINCT FROM expected_lower END),
    CONSTRAINT compared_value CHECK(CASE WHEN bypass THEN true ELSE jsonb_cmp(lhs,rhs) IS NOT DISTINCT FROM expected_order END));
    CREATE TABLE jsonb_scalar_inputs(numeric_document retained_document,boolean_document jsonb,expected_bool boolean,${Object.keys(
      scalarTargets,
    )
      .map((name) => 'expected_' + name + ' text')
      .join(',')},bypass boolean,
    CONSTRAINT flag_value CHECK(CASE WHEN bypass THEN true ELSE boolean_document::bool IS NOT DISTINCT FROM expected_bool END),
    ${Object.entries(scalarTargets)
      .map(
        ([name, type]) =>
          `CONSTRAINT cast_${name} CHECK(CASE WHEN bypass THEN true ELSE encode(${scalarSend[name]}(numeric_document::${type}),'hex') COLLATE "C" IS NOT DISTINCT FROM expected_${name} COLLATE "C" END)`,
      )
      .join(',')});`)
    await pg.exec(`CREATE TABLE jsonb_edit_inputs(lhs retained_document,rhs jsonb,key_name text,element_index integer,expected_concat jsonb,expected_key jsonb,expected_index jsonb,delete_members boolean,delete_positions boolean,bypass boolean,
    CONSTRAINT merged_document CHECK(CASE WHEN bypass THEN true ELSE (lhs||rhs) IS NOT DISTINCT FROM expected_concat END),
    CONSTRAINT without_key CHECK(CASE WHEN bypass OR NOT delete_members THEN true ELSE (lhs-key_name) IS NOT DISTINCT FROM expected_key END),
    CONSTRAINT without_index CHECK(CASE WHEN bypass OR NOT delete_positions THEN true ELSE (lhs-element_index) IS NOT DISTINCT FROM expected_index END))`)
    await pg.exec(`CREATE TABLE jsonb_format_inputs(document retained_document,strip_arrays boolean,expected_default jsonb,expected_strip jsonb,expected_pretty text,bypass boolean,
    CONSTRAINT default_stripped CHECK(CASE WHEN bypass THEN true ELSE jsonb_strip_nulls(document) IS NOT DISTINCT FROM expected_default END),
    CONSTRAINT flag_stripped CHECK(CASE WHEN bypass THEN true ELSE jsonb_strip_nulls(document,strip_arrays) IS NOT DISTINCT FROM expected_strip END),
    CONSTRAINT pretty_layout CHECK(CASE WHEN bypass THEN true ELSE jsonb_pretty(jsonb_strip_nulls(document,strip_arrays)) COLLATE "C" IS NOT DISTINCT FROM expected_pretty COLLATE "C" END))`)
    const conversionTypes = {
      text: 'text',
      number: 'numeric',
      flag: 'boolean',
      integer: 'bigint',
      json: 'json',
      jsonb: 'jsonb',
      uuid: 'uuid',
      oid: 'oid',
    }
    await pg.exec(`CREATE TABLE jsonb_conversion_inputs(${Object.entries(conversionTypes)
      .map(([name, type]) => `source_${name} ${type},expected_${name} jsonb`)
      .join(',')},bypass boolean,
      ${Object.keys(conversionTypes)
        .map(
          (name) =>
            `CONSTRAINT converted_${name} CHECK(CASE WHEN bypass THEN true ELSE to_jsonb(source_${name}) IS NOT DISTINCT FROM expected_${name} END)`,
        )
        .join(',')})`)
    await pg.exec(`CREATE TYPE conversion_label AS ENUM('plain');
    CREATE FUNCTION conversion_label_json(conversion_label) RETURNS json LANGUAGE SQL IMMUTABLE STRICT AS $$ SELECT '"custom"'::json $$;
    CREATE CAST(conversion_label AS json) WITH FUNCTION conversion_label_json(conversion_label);
    CREATE TABLE jsonb_conversion_legacy(flag boolean, CONSTRAINT converted CHECK(jsonb_typeof(to_jsonb(flag)) COLLATE "C"='boolean'));
    CREATE TABLE jsonb_conversion_boundaries(label conversion_label,expected jsonb,bypass boolean,
      CONSTRAINT custom_conversion CHECK(CASE WHEN bypass THEN true ELSE to_jsonb(label) IS NOT DISTINCT FROM expected END))`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'jsonb_payloads')!
    const textTable = catalog.tables.find((t) => t.name === 'jsonb_text_inputs')!
    const readTable = catalog.tables.find((t) => t.name === 'jsonb_read_inputs')!
    const relationTable = catalog.tables.find((t) => t.name === 'jsonb_relation_inputs')!
    const scalarTable = catalog.tables.find((t) => t.name === 'jsonb_scalar_inputs')!
    const editTable = catalog.tables.find((t) => t.name === 'jsonb_edit_inputs')!
    const formatTable = catalog.tables.find((t) => t.name === 'jsonb_format_inputs')!
    const conversionTable = catalog.tables.find((t) => t.name === 'jsonb_conversion_inputs')!
    const conversionBoundaries = catalog.tables.find(
      (t) => t.name === 'jsonb_conversion_boundaries',
    )!
    const legacyConversion = catalog.tables.find((t) => t.name === 'jsonb_conversion_legacy')!
    const boundCustom = lowerTableCheck(
      conversionBoundaries,
      conversionBoundaries.constraints[0]!,
      catalog.enums,
      catalog.domains,
    )!
    expect(hasUncertain(boundCustom.expression)).toBe(false)
    expect(hasUncertain(portableCheckAtoms(boundCustom.expression))).toBe(true)
    const bundle = renderTypescriptSchemaCheckArtifacts(
      [
        table,
        textTable,
        readTable,
        relationTable,
        scalarTable,
        editTable,
        formatTable,
        conversionTable,
        conversionBoundaries,
        legacyConversion,
      ],
      catalog.domains,
      catalog.domains,
      { enums: catalog.enums, executionContext: { defaultCollation: 'C', serverEncoding: 'UTF8' } },
    )
    const deferred = renderTypescriptSchemaCheckArtifacts([relationTable], catalog.domains)
    await writeFile(join(root, 'deferred-checks.ts'), deferred.checks)
    await writeFile(
      join(root, 'legacy-checks.ts'),
      renderTypescriptSchemaChecks([legacyConversion], catalog.domains),
    )
    await writeFile(join(root, 'package.json'), '{"type":"module"}\n')
    await symlink(resolve('node_modules'), join(root, 'node_modules'), 'dir')
    await writeFile(join(root, 'checks.ts'), bundle.checks)
    for (const artifact of checkTypescriptArtifacts(bundle.rustFiles!)) {
      const path = join(root, 'checks-rust', artifact.path)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, artifact.content)
    }
    await promisify(execFile)('node_modules/.bin/tsc', [
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
      join(root, 'deferred-checks.ts'),
      join(root, 'legacy-checks.ts'),
    ]).catch((e: { stdout: string; stderr: string; message: string }) => {
      throw new Error(e.stdout + e.stderr || e.message, { cause: e })
    })
    const generated = await import(pathToFileURL(join(root, 'js/checks.js')).href)
    const legacy = await import(pathToFileURL(join(root, 'js/legacy-checks.js')).href)
    expect(legacy.evaluatePublicJsonbConversionLegacyChecks({ flag: true })[0].result).toEqual({
      certain: false,
    })
    expect(generated.evaluatePublicJsonbConversionLegacyChecks({ flag: true })[0].result).toEqual({
      certain: true,
      value: true,
    })
    const runtime = await import(
      pathToFileURL(join(root, 'js/checks-rust/checkruntime/runtime.js')).href
    )
    expect(
      (await pg.query<{ value: string }>(`SELECT to_jsonb('plain'::conversion_label)::text value`))
        .rows[0]!.value,
    ).toBe('"custom"')
    for (const bypass of [false, true]) {
      const result = generated.evaluatePublicJsonbConversionBoundariesChecks({
        label: 'plain',
        expected: runtime.makeJsonbValue('"custom"'),
        bypass,
      })[0].result
      expect(result).toEqual(bypass ? { certain: true, value: true } : { certain: false })
    }
    await pg.exec(`INSERT INTO jsonb_conversion_boundaries VALUES('plain','"custom"',false)`)
    for (const sample of [
      {
        text: '[1,null]',
        number: '9007199254740993.12300',
        flag: true,
        integer: '9223372036854775807',
        json: '{"a":1,"a":2}',
        jsonb: '{"aa":1,"é":2}',
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        oid: '4294967295',
      },
      {
        text: '雪😊\n"',
        number: 'NaN',
        flag: false,
        integer: '-9223372036854775808',
        json: 'null',
        jsonb: 'null',
        uuid: '00000000-0000-0000-0000-000000000000',
        oid: '0',
      },
      Object.fromEntries(Object.keys(conversionTypes).map((name) => [name, null])),
    ]) {
      const input: Record<string, unknown> = { bypass: false },
        args: unknown[] = []
      for (const [name, type] of Object.entries(conversionTypes)) {
        const value = (sample as Record<string, unknown>)[name]
        const output = (
          await pg.query<{ value: string | null }>(`SELECT to_jsonb($1::${type})::text value`, [
            value,
          ])
        ).rows[0]!.value
        input['source_' + name] =
          value === null
            ? null
            : name === 'integer'
              ? BigInt(value as string)
              : name === 'oid'
                ? runtime.makeOidValue(BigInt(value as string))
                : name === 'json'
                  ? runtime.makeJsonValue(value)
                  : name === 'jsonb'
                    ? runtime.makeJsonbValue(value)
                    : value
        input['expected_' + name] = output === null ? null : runtime.makeJsonbValue(output)
        args.push(value, output)
      }
      const before = structuredClone(input)
      for (const result of generated.evaluatePublicJsonbConversionInputsChecks(input))
        expect(result.result, result.constraint).toEqual({ certain: true, value: true })
      expect(input).toEqual(before)
      await pg.query(
        `INSERT INTO jsonb_conversion_inputs VALUES(${Object.entries(conversionTypes)
          .flatMap(([_, type], i) => [`$${i * 2 + 1}::${type}`, `$${i * 2 + 2}::jsonb`])
          .join(',')},false)`,
        args,
      )
      input.expected_text = runtime.makeJsonbValue('false')
      expect(
        generated
          .evaluatePublicJsonbConversionInputsChecks(input)
          .find((c: { constraint: string }) => c.constraint === 'converted_text').result,
      ).toEqual({ certain: true, value: false })
      input.bypass = true
      for (const result of generated.evaluatePublicJsonbConversionInputsChecks(input))
        expect(result.result).toEqual({ certain: true, value: true })
    }
    const conversionInput = {
      source_json: runtime.makeJsonValue('"\\u0000"'),
      expected_json: runtime.makeJsonbValue('null'),
      bypass: false,
    }
    expect(
      generated
        .evaluatePublicJsonbConversionInputsChecks(conversionInput)
        .find((c: { constraint: string }) => c.constraint === 'converted_json').result,
    ).toEqual({ certain: true, error: '22P05' })
    await expect(
      pg.query(
        'INSERT INTO jsonb_conversion_inputs(source_json,expected_json,bypass) VALUES($1::json,$2::jsonb,false)',
        ['"\\u0000"', 'null'],
      ),
    ).rejects.toMatchObject({ code: '22P05' })
    conversionInput.source_json = runtime.makeJsonValue('"\\u96ea"')
    expect(
      generated
        .evaluatePublicJsonbConversionInputsChecks(conversionInput)
        .find((c: { constraint: string }) => c.constraint === 'converted_json').result,
    ).toEqual({ certain: false })
    for (const source of [
      undefined,
      { kind: 'Unknown' },
      { kind: 'Error', value: { state: parseInt('22003', 36) } },
    ]) {
      const result = generated
        .evaluatePublicJsonbConversionInputsChecks({
          source_text: source,
          expected_text: runtime.makeJsonbValue('null'),
          bypass: false,
        })
        .find((c: { constraint: string }) => c.constraint === 'converted_text').result
      expect(result).toEqual({ certain: false })
    }
    expect(
      generated
        .evaluatePublicJsonbConversionInputsChecks({
          source_number: { kind: 'Error', value: { state: parseInt('22003', 36) } },
          expected_number: runtime.makeJsonbValue('null'),
          bypass: false,
        })
        .find((c: { constraint: string }) => c.constraint === 'converted_number').result,
    ).toEqual({ certain: true, error: '22003' })
    for (const [source, context] of [
      [null, false],
      ['null', false],
      ['{"a":null,"b":[null,1]}', false],
      ['[null,{"a":null},[null]]', false],
      ['{"a":1,"a":null}', false],
      ['{"aa":null,"é":2}', false],
      ['{"aa":1,"é":2}', true],
      ['{"n":9007199254740993.00,"a":null}', false],
    ] as const)
      for (const arrays of [false, true, null]) {
        const row = (
          await pg.query<{
            source: string | null
            default_strip: string | null
            stripped: string | null
            pretty: string | null
          }>(
            `SELECT document::text source,jsonb_strip_nulls(document)::text default_strip,jsonb_strip_nulls(document,$2::bool)::text stripped,jsonb_pretty(jsonb_strip_nulls(document,$2::bool)) pretty FROM(SELECT $1::jsonb document)q`,
            [source, arrays],
          )
        ).rows[0]!
        const wrapped = (text: string | null) =>
          text === null ? null : runtime.makeJsonbValue(text)
        const input = {
          document: wrapped(row.source),
          strip_arrays: arrays,
          expected_default: wrapped(row.default_strip),
          expected_strip: wrapped(row.stripped),
          expected_pretty: row.pretty,
          bypass: false,
        }
        const before = JSON.stringify(input)
        for (const c of generated.evaluatePublicJsonbFormatInputsChecks(input))
          expect(c.result).toEqual(
            c.constraint === 'pretty_layout' && context && arrays !== null
              ? { certain: false }
              : { certain: true, value: true },
          )
        expect(JSON.stringify(input)).toBe(before)
        await pg.query(
          'INSERT INTO jsonb_format_inputs VALUES($1::jsonb,$2,$3::jsonb,$4::jsonb,$5,false)',
          [source, arrays, row.default_strip, row.stripped, row.pretty],
        )
      }
    const formatInput = {
      document: runtime.makeJsonbValue('{"a":null,"b":[null,1]}'),
      strip_arrays: true,
      expected_default: runtime.makeJsonbValue('{"b":[null,1]}'),
      expected_strip: runtime.makeJsonbValue('{"b":[1]}'),
      expected_pretty: 'wrong',
      bypass: false,
    }
    expect(
      generated
        .evaluatePublicJsonbFormatInputsChecks(formatInput)
        .find((c: { constraint: string }) => c.constraint === 'pretty_layout').result,
    ).toEqual({ certain: true, value: false })
    for (const document of [
      undefined,
      '{}',
      { kind: 'Unknown' },
      { kind: 'Value', value: { root: 0, nodes: [], characters: [] } },
    ]) {
      for (const c of generated.evaluatePublicJsonbFormatInputsChecks({ ...formatInput, document }))
        expect(c.result.certain).toBe(false)
      for (const c of generated.evaluatePublicJsonbFormatInputsChecks({
        ...formatInput,
        document,
        bypass: true,
      }))
        expect(c.result).toEqual({ certain: true, value: true })
    }
    for (const c of generated.evaluatePublicJsonbFormatInputsChecks({
      ...formatInput,
      document: { kind: 'Error', value: { state: parseInt('22003', 36) } },
    }))
      expect(c.result).toEqual({ certain: true, error: '22003' })
    for (const [lhs, rhs, key, index, members, positions] of [
      ['{"a":1,"b":2}', '{"a":3}', 'a', 0, true, false],
      ['{"aa":1,"é":2}', '{"雪":3,"aa":4}', 'é', 0, true, false],
      ['["a",1,"a",["a"],{"a":1}]', '[null]', 'a', -1, true, true],
      ['[]', '{}', 'missing', -2147483648, true, true],
      ['null', '[]', 'missing', 0, false, false],
      [null, '{}', 'missing', 0, true, true],
      ['[9007199254740993.00]', '[2]', 'a', 0, true, true],
    ] as const) {
      const row = (
        await pg.query<{
          lhs: string | null
          rhs: string | null
          combined: string | null
          removed_key: string | null
          removed_index: string | null
        }>(
          `SELECT lhs::text lhs,rhs::text rhs,(lhs||rhs)::text combined,CASE WHEN $5::bool THEN (lhs-$3::text)::text ELSE NULL END removed_key,CASE WHEN $6::bool THEN (lhs-$4::int)::text ELSE NULL END removed_index FROM(SELECT $1::jsonb lhs,$2::jsonb rhs)q`,
          [lhs, rhs, key, index, members, positions],
        )
      ).rows[0]!
      const wrapped = (source: string | null) =>
        source === null ? null : runtime.makeJsonbValue(source)
      const input = {
        lhs: wrapped(row.lhs),
        rhs: wrapped(row.rhs),
        key_name: key,
        element_index: index,
        expected_concat: wrapped(row.combined),
        expected_key: wrapped(row.removed_key),
        expected_index: wrapped(row.removed_index),
        delete_members: members,
        delete_positions: positions,
        bypass: false,
      }
      const before = JSON.stringify(input)
      expect(
        generated
          .evaluatePublicJsonbEditInputsChecks(input)
          .every(
            (c: { result: { certain: boolean; value?: boolean } }) =>
              c.result.certain && c.result.value === true,
          ),
      ).toBe(true)
      expect(JSON.stringify(input)).toBe(before)
      await pg.query(
        'INSERT INTO jsonb_edit_inputs VALUES($1::jsonb,$2::jsonb,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8,$9,false)',
        [
          lhs,
          rhs,
          key,
          index,
          row.combined,
          row.removed_key,
          row.removed_index,
          members,
          positions,
        ],
      )
      const wrong = generated
        .evaluatePublicJsonbEditInputsChecks({
          ...input,
          expected_concat: runtime.makeJsonbValue('"wrong"'),
        })
        .find((c: { constraint: string }) => c.constraint === 'merged_document')
      expect(wrong.result).toEqual({ certain: true, value: false })
    }
    for (const value of [
      undefined,
      '{}',
      { kind: 'Unknown' },
      { kind: 'Value', value: { root: 0, nodes: [], characters: [] } },
    ]) {
      const input = {
        lhs: value,
        rhs: runtime.makeJsonbValue('{}'),
        key_name: 'a',
        element_index: 0,
        delete_members: true,
        delete_positions: true,
        bypass: false,
      }
      for (const c of generated.evaluatePublicJsonbEditInputsChecks(input))
        expect(c.result.certain).toBe(false)
      for (const c of generated.evaluatePublicJsonbEditInputsChecks({ ...input, bypass: true }))
        expect(c.result).toEqual({ certain: true, value: true })
    }
    for (const c of generated.evaluatePublicJsonbEditInputsChecks({
      lhs: { kind: 'Error', value: { state: parseInt('22003', 36) } },
      rhs: { kind: 'Error', value: { state: parseInt('22012', 36) } },
      key_name: 'a',
      element_index: 0,
      delete_members: true,
      delete_positions: true,
      bypass: false,
    }))
      expect(c.result).toEqual({ certain: true, error: '22003' })
    type ScalarResult = { certain: boolean; value?: boolean; error?: string }
    for (const [numericSource, booleanSource] of [
      [null, null],
      ['null', 'null'],
      ['1.5', 'true'],
      ['-1.5', 'false'],
      ['9007199254740993', 'true'],
      ['32767.5', 'true'],
      ['1e39', 'true'],
      ['1e-1000', 'true'],
      ['"1"', 'true'],
      ['[]', 'false'],
      ['1', '1'],
      ['1', '"true"'],
    ] as const) {
      const input: Record<string, unknown> = {
        numeric_document: numericSource === null ? null : runtime.makeJsonbValue(numericSource),
        boolean_document: booleanSource === null ? null : runtime.makeJsonbValue(booleanSource),
        expected_bool: null,
        bypass: false,
      }
      const expected: Record<string, ScalarResult> = {}
      try {
        input.expected_bool = (
          await pg.query<{ value: boolean | null }>('SELECT $1::jsonb::bool value', [booleanSource])
        ).rows[0]!.value
        expected.flag_value = { certain: true, value: true }
      } catch (e) {
        expected.flag_value = { certain: true, error: (e as { code: string }).code }
      }
      for (const [name, type] of Object.entries(scalarTargets)) {
        try {
          input['expected_' + name] = (
            await pg.query<{ value: string | null }>(
              `SELECT encode(${scalarSend[name]}($1::jsonb::${type}),'hex') value`,
              [numericSource],
            )
          ).rows[0]!.value
          expected['cast_' + name] = { certain: true, value: true }
        } catch (e) {
          input['expected_' + name] = null
          expected['cast_' + name] = { certain: true, error: (e as { code: string }).code }
        }
      }
      const before = JSON.stringify(input)
      const actual = Object.fromEntries(
        generated
          .evaluatePublicJsonbScalarInputsChecks(input)
          .map((c: { constraint: string; result: ScalarResult }) => [c.constraint, c.result]),
      )
      expect(actual).toEqual(expected)
      expect(JSON.stringify(input)).toBe(before)
      const args = [
        numericSource,
        booleanSource,
        input.expected_bool,
        ...Object.keys(scalarTargets).map((name) => input['expected_' + name]),
        false,
      ]
      const insert = pg.query(
        'INSERT INTO jsonb_scalar_inputs VALUES(' +
          args.map((_, i) => '$' + (i + 1)).join(',') +
          ')',
        args,
      )
      if (Object.values(expected).every((r) => r.value === true)) await insert
      else
        await expect(insert).rejects.toMatchObject({
          code: expect.stringMatching(/^(22003|22023)$/),
        })
      expect(
        generated
          .evaluatePublicJsonbScalarInputsChecks({ ...input, bypass: true })
          .every((c: { result: ScalarResult }) => c.result.certain && c.result.value === true),
      ).toBe(true)
    }
    for (const document of [
      undefined,
      '1',
      { kind: 'Unknown' },
      { kind: 'Value', value: { root: 0, nodes: [], characters: [] } },
    ])
      for (const c of generated.evaluatePublicJsonbScalarInputsChecks({
        numeric_document: document,
        boolean_document: document,
        bypass: false,
      }))
        expect(c.result.certain).toBe(false)
    for (const c of generated.evaluatePublicJsonbScalarInputsChecks({
      numeric_document: { kind: 'Error', value: { state: parseInt('22012', 36) } },
      boolean_document: { kind: 'Error', value: { state: parseInt('22012', 36) } },
      bypass: false,
    }))
      expect(c.result).toEqual({ certain: true, error: '22012' })
    const deferredGenerated = await import(pathToFileURL(join(root, 'js/deferred-checks.js')).href)
    for (const c of deferredGenerated.evaluatePublicJsonbRelationInputsChecks({
      lhs: runtime.makeJsonbValue('1'),
      rhs: runtime.makeJsonbValue('2'),
      expected_lower: true,
      expected_order: -1,
      bypass: false,
    }))
      if (['ordered_value', 'compared_value'].includes(c.constraint)) {
        expect(c.result.certain).toBe(false)
        expect(JSON.stringify(c)).toContain(
          'JSONB ordering requires declared database default collation C and server encoding UTF8',
        )
      }
    type Result = { certain: boolean; value?: boolean | null; error?: string }
    const evaluateRelations = (
      lhs: unknown,
      rhs: unknown,
      expected: Record<string, unknown> = {},
      bypass = false,
    ): Record<string, Result> =>
      Object.fromEntries(
        generated
          .evaluatePublicJsonbRelationInputsChecks({
            lhs,
            rhs,
            expected_equal: true,
            expected_unequal: false,
            expected_contains: true,
            expected_contained: true,
            expected_lower: false,
            expected_order: 0,
            ...expected,
            bypass,
          })
          .map((c: { constraint: string; result: Result }) => [c.constraint, c.result]),
      )
    for (const [lhs, rhs] of [
      [null, null],
      [null, '{}'],
      ['1.00', '1e0'],
      ['9007199254740993', '9007199254740992'],
      ['[]', 'null'],
      ['[null]', '[[]]'],
      ['"é"', '"z"'],
      ['{"aa":1,"é":2}', '{"é":2,"aa":1.00}'],
      ['{"a":1,"a":2}', '{"a":2}'],
      ['[2,1,1]', '[1,2]'],
      ['[[1,2]]', '[[1]]'],
      ['[[1,2]]', '[1]'],
      ['[{"a":0},{"a":1}]', '[{"a":1}]'],
      ['{"a":[1,2]}', '{"a":1}'],
    ] as const) {
      const row = (
        await pg.query<{
          lhs: string | null
          rhs: string | null
          expected_equal: boolean | null
          expected_unequal: boolean | null
          expected_contains: boolean | null
          expected_contained: boolean | null
          expected_lower: boolean | null
          expected_order: number | null
        }>(
          `SELECT lhs::text lhs,rhs::text rhs,lhs=rhs expected_equal,lhs<>rhs expected_unequal,lhs @> rhs expected_contains,lhs <@ rhs expected_contained,lhs<rhs expected_lower,jsonb_cmp(lhs,rhs) expected_order FROM (SELECT $1::jsonb lhs,$2::jsonb rhs) q`,
          [lhs, rhs],
        )
      ).rows[0]!
      const { lhs: a, rhs: b, ...expected } = row
      const first = a === null ? null : runtime.makeJsonbValue(a),
        second = b === null ? null : runtime.makeJsonbValue(b)
      const before = JSON.stringify([first, second])
      expect(
        Object.values(evaluateRelations(first, second, expected)).every(
          (r) => r.certain && r.value === true,
        ),
      ).toBe(true)
      expect(JSON.stringify([first, second])).toBe(before)
      await pg.query(
        'INSERT INTO jsonb_relation_inputs VALUES($1::jsonb,$2::jsonb,$3,$4,$5,$6,$7,$8,false)',
        [
          lhs,
          rhs,
          row.expected_equal,
          row.expected_unequal,
          row.expected_contains,
          row.expected_contained,
          row.expected_lower,
          row.expected_order,
        ],
      )
    }
    const relationValue = runtime.makeJsonbValue('{"a":1}')
    expect(
      evaluateRelations(relationValue, relationValue, { expected_equal: false }).same_value,
    ).toEqual({ certain: true, value: false })
    for (const lhs of [
      undefined,
      '{}',
      { kind: 'Unknown' },
      { kind: 'Value', value: { root: 0, nodes: [], characters: [] } },
    ]) {
      expect(
        Object.values(evaluateRelations(lhs, relationValue)).every((r) => r.certain === false),
      ).toBe(true)
      expect(
        Object.values(evaluateRelations(lhs, relationValue, {}, true)).every(
          (r) => r.certain && r.value === true,
        ),
      ).toBe(true)
    }
    for (const result of Object.values(
      evaluateRelations(
        { kind: 'Error', value: { state: parseInt('22003', 36) } },
        { kind: 'Error', value: { state: parseInt('22012', 36) } },
      ),
    ))
      expect(result).toEqual({ certain: true, error: '22003' })
    const evaluateReads = (
      document: unknown,
      expected: Record<string, unknown> = {},
      bypass = false,
    ): Record<string, Result> =>
      Object.fromEntries(
        generated
          .evaluatePublicJsonbReadInputsChecks({
            document,
            field_name: 'a',
            element_index: 0,
            expected_json: null,
            expected_text: null,
            expected_element_json: null,
            expected_element_text: null,
            expected_count: 0,
            expected_exists: false,
            check_count: true,
            ...expected,
            bypass,
          })
          .map((c: { constraint: string; result: Result }) => [c.constraint, c.result]),
      )
    for (const [source, key, index] of [
      ['{"a":1,"a":2}', 'a', 0],
      ['{"雪":"😊"}', '雪', 0],
      ['{"a":[{"name":"first"},{"name":"last"}]}', 'a', 0],
      ['[null,9007199254740993.00,"a"]', 'a', -1],
      ['["a",null]', 'a', -2147483648],
      ['[]', 'a', 0],
      ['"a"', 'a', -1],
      ['null', 'a', 0],
      ['42.00', 'a', 0],
    ] as const) {
      const row = (
        await pg.query<{
          source: string
          expected_json: string | null
          expected_text: string | null
          expected_element_json: string | null
          expected_element_text: string | null
          expected_count: number | null
          expected_exists: boolean
          check_count: boolean
        }>(
          `SELECT document::text source,(document->$2::text)::text expected_json,document->>$2::text expected_text,(document->$3::int)::text expected_element_json,document->>$3::int expected_element_text,CASE WHEN jsonb_typeof(document)='array' THEN jsonb_array_length(document) ELSE NULL END expected_count,document ? $2::text expected_exists,jsonb_typeof(document)='array' check_count FROM (SELECT $1::jsonb document) q`,
          [source, key, index],
        )
      ).rows[0]!
      const { source: normalized, ...expected } = row
      const value = runtime.makeJsonbValue(normalized),
        before = JSON.stringify(value)
      const inputs = { ...expected, field_name: key, element_index: index }
      expect(
        Object.values(evaluateReads(value, inputs)).every((r) => r.certain && r.value === true),
        source,
      ).toBe(true)
      expect(JSON.stringify(value)).toBe(before)
      await pg.query(
        'INSERT INTO jsonb_read_inputs VALUES($1::jsonb,$2,$3,$4,$5,$6,$7,$8,$9,$10,false)',
        [
          source,
          key,
          index,
          row.expected_json,
          row.expected_text,
          row.expected_element_json,
          row.expected_element_text,
          row.expected_count,
          row.expected_exists,
          row.check_count,
        ],
      )
      expect(evaluateReads(value, { ...inputs, expected_text: 'wrong' }).field_text).toEqual({
        certain: true,
        value: false,
      })
      expect(
        evaluateReads(value, { ...inputs, expected_exists: !row.expected_exists }).key_exists,
      ).toEqual({ certain: true, value: false })
    }
    expect(evaluateReads(runtime.makeJsonbValue('{}')).array_length).toEqual({
      certain: true,
      error: '22023',
    })
    const uncertainSubtree = runtime.makeJsonbValue('{"a":{"aa":1,"é":2},"plain":"known"}')
    expect(evaluateReads(uncertainSubtree).field_source).toEqual({ certain: false })
    expect(
      evaluateReads(uncertainSubtree, { field_name: 'plain', expected_text: 'known' }).field_text,
    ).toEqual({ certain: true, value: true })
    const evaluateText = (
      source_text: unknown,
      expected_source: unknown = '{}',
      bypass = false,
    ): Result =>
      generated.evaluatePublicJsonbTextInputsChecks({ source_text, expected_source, bypass })[0]
        .result
    for (const input of jsonbInputForms) {
      const source = (await pg.query<{ source: string }>('SELECT $1::jsonb::text source', [input]))
        .rows[0]!.source
      expect(evaluateText(input, source), input).toEqual({ certain: true, value: true })
      await pg.query('INSERT INTO jsonb_text_inputs VALUES($1,$2,false)', [input, source])
    }
    for (const input of invalidJsonbInputForms) {
      const state = await pg.query('SELECT $1::jsonb', [input]).then(
        () => {
          throw new Error('Invalid JSONB accepted')
        },
        (e: { code: string }) => e.code,
      )
      expect(evaluateText(input), input).toEqual({ certain: true, error: state })
      expect(evaluateText(input, '{}', true), input).toEqual({ certain: true, value: true })
      await expect(
        pg.query('INSERT INTO jsonb_text_inputs VALUES($1,$2,false)', [input, '{}']),
      ).rejects.toMatchObject({ code: state })
      await pg.query('INSERT INTO jsonb_text_inputs VALUES($1,$2,true)', [input, '{}'])
    }
    for (const input of deferredJsonbEncodingForms)
      expect(evaluateText(input), input).toEqual({ certain: false })
    expect(evaluateText('{}', '[]')).toEqual({ certain: true, value: false })
    expect(evaluateText(null)).toEqual({ certain: true, value: null })
    for (const input of ['"a\0b"', '"\ud800"', undefined, 123, {}])
      expect(evaluateText(input)).toEqual({ certain: false })
    const evaluate = (
      document: unknown,
      expected_kind = 'object',
      expected_source = '{"a": 2}',
      bypass = false,
    ): Record<string, Result> =>
      Object.fromEntries(
        generated
          .evaluatePublicJsonbPayloadsChecks({ document, expected_kind, expected_source, bypass })
          .map((c: { constraint: string; result: Result }) => [c.constraint, c.result]),
      )
    for (const input of [
      'null',
      'true',
      '-0.00',
      '9007199254740993.00',
      '1.230e-5',
      '"雪😊"',
      '"\\u00e9"',
      '[]',
      '[null,1,"x"]',
      '{"a":1,"a":2}',
      '{"雪":"😊"}',
      '{"a":{"雪":1},"a":2}',
    ]) {
      const row = (
        await pg.query<{ source: string; kind: string }>(
          'SELECT value::text source,jsonb_typeof(value) kind FROM (SELECT $1::jsonb value) q',
          [input],
        )
      ).rows[0]!
      const value = runtime.makeJsonbValue(row.source)
      const results = evaluate(value, row.kind, row.source)
      expect(
        Object.values(results).every((c) => c.certain && c.value === true),
        input,
      ).toBe(true)
      await pg.query('INSERT INTO jsonb_payloads VALUES($1::jsonb,$2,$3,false)', [
        input,
        row.kind,
        row.source,
      ])
      expect(evaluate(value, 'wrong', row.source).shape, input).toEqual({
        certain: true,
        value: false,
      })
      await expect(
        pg.query('INSERT INTO jsonb_payloads VALUES($1::jsonb,$2,$3,false)', [
          input,
          'wrong',
          row.source,
        ]),
      ).rejects.toMatchObject({ code: '23514' })
    }
    const ambiguity = runtime.makeJsonbValue('{"aa":1,"é":2}')
    expect(evaluate(ambiguity).shape).toEqual({ certain: true, value: true })
    expect(evaluate(ambiguity).source).toEqual({ certain: false })
    expect(evaluate(ambiguity).present).toEqual({ certain: true, value: true })
    const bad: unknown[] = [
      undefined,
      '{"a":2}',
      2,
      [],
      {},
      { kind: 'Value' },
      { kind: 'Value', value: {} },
      { kind: 'Error' },
      { kind: 'Error', value: { state: NaN } },
    ]
    const mutations: ((value: ReturnType<typeof runtime.makeJsonbValue>) => void)[] = [
      (v) => {
        v.value.root = 0
      },
      (v) => {
        v.value.root = 999
      },
      (v) => {
        v.value.root = -1
      },
      (v) => {
        v.value.root = 1.5
      },
      (v) => {
        v.value.nodes[1].kind = 7
      },
      (v) => {
        v.value.nodes[1].child = 1
      },
      (v) => {
        v.value.nodes[1].child = 999
      },
      (v) => {
        v.value.nodes[2].next = 2
      },
      (v) => {
        v.value.nodes[2].next = 999
      },
      (v) => {
        v.value.nodes[2].child = 1
      },
      (v) => {
        v.value.nodes[2].textEnd = 999
      },
      (v) => {
        v.value.nodes[2].textStart = v.value.nodes[2].textEnd + 1
      },
      (v) => {
        v.value.nodes[2].keyStart = -1
      },
      (v) => {
        v.value.characters[v.value.nodes[2].keyStart] = '\0'
      },
      (v) => {
        v.value.characters[v.value.nodes[2].textStart] = '\0'
      },
      (v) => {
        v.value.characters[0] = '\ud800'
      },
    ]
    for (const mutate of mutations) {
      const value = structuredClone(runtime.makeJsonbValue('{"a":"x"}'))
      mutate(value)
      bad.push(value)
    }
    for (const text of ['NaN', '1e999999', '{"a":1}', 'null', '1,2']) {
      const value = structuredClone(runtime.makeJsonbValue('1'))
      value.value.characters = Array.from(text)
      value.value.nodes[1].textStart = 0
      value.value.nodes[1].textEnd = Array.from(text).length
      bad.push(value)
    }
    for (const value of bad) {
      const results = evaluate(value)
      for (const name of ['shape', 'source', 'present', 'guarded'])
        expect(results[name], name + ':' + JSON.stringify(value)).toEqual({ certain: false })
      expect(evaluate(value, 'object', '{"a": 2}', true).guarded).toEqual({
        certain: true,
        value: true,
      })
      expect(Object.values(evaluateReads(value)).every((r) => r.certain === false)).toBe(true)
      expect(
        Object.values(evaluateReads(value, {}, true)).every((r) => r.certain && r.value === true),
      ).toBe(true)
    }
    expect(evaluate(null).present).toEqual({ certain: true, value: false })
    expect(evaluate(runtime.makeJsonbValue('null'), 'null', 'null').present).toEqual({
      certain: true,
      value: true,
    })
    for (const result of Object.values(
      evaluate({ kind: 'Error', value: { state: parseInt('22003', 36) } }),
    ))
      expect(result).toEqual({ certain: true, error: '22003' })
    const first = runtime.makeJsonbValue('{"a":1,"a":2}'),
      before = JSON.stringify(first)
    expect(evaluate(first).source).toEqual({ certain: true, value: true })
    expect(JSON.stringify(first)).toBe(before)
    const reordered = structuredClone(runtime.makeJsonbValue('{"a":2,"b":3}'))
    const firstNode = reordered.value.nodes[1].child,
      secondNode = reordered.value.nodes[firstNode].next
    reordered.value.nodes[1].child = secondNode
    reordered.value.nodes[secondNode].next = firstNode
    reordered.value.nodes[firstNode].next = 0
    expect(evaluate(reordered, 'object', '{"a": 2, "b": 3}').source).toEqual({
      certain: true,
      value: true,
    })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 240000)
