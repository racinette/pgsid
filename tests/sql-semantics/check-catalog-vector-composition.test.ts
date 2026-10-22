import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { pathToFileURL } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
import type { CompositeInputPayload } from '../../tools/check-rust/composite-input.js'
import { decodeCatalogVector, type CatalogVectorInput } from './check-catalog-vector-fixtures.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { renderGoSchemaArtifacts } from '../../src/codegen/go/schema.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { parseConfigString } from '../../src/config/loader.js'

const known = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const state = (outcome: Outcome): string =>
  outcome.kind === 'Error'
    ? outcome.value.state.toString(36).toUpperCase().padStart(5, '0')
    : outcome.kind
const containsUnknown = (node: unknown): boolean =>
  !!node &&
  typeof node === 'object' &&
  (('kind' in node && node.kind === 'uncertain') || Object.values(node).some(containsUnknown))

it('composes vector domains, records, arrays and catalog deferrals through native INSERTs and public Go/TypeScript adapters', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-vector-composition-')),
    run = promisify(execFile)
  try {
    const calls = new Map<string, { sql: string; kind: 'text' | 'int' | 'bool'; catalog?: true }>([
      ['alias_int2', { sql: 'int2vector(input_text)::text', kind: 'text' }],
      ['alias_oid', { sql: 'oidvector(input_text)::text', kind: 'text' }],
      ['text_alias', { sql: 'text(value)', kind: 'text' }],
      ['domain_value', { sql: '(value::limited_positions)::text', kind: 'text' }],
      ['domain_input', { sql: '(input_text::limited_positions)::text', kind: 'text' }],
      ['domain_array', { sql: 'ARRAY[value::limited_positions]::text', kind: 'text' }],
      ['domain_array_input', { sql: '(array_text::limited_positions[])::text', kind: 'text' }],
      ['projected_positions', { sql: '(record_value).positions::text', kind: 'text' }],
      ['projected_types', { sql: '(record_value).type_ids::text', kind: 'text' }],
      ['record_text', { sql: 'record_value::text', kind: 'text' }],
      ['record_json', { sql: 'row_to_json(record_value)::text', kind: 'text' }],
      ['record_jsonb', { sql: 'to_jsonb(record_value)::text', kind: 'text' }],
      ['record_equal', { sql: 'record_value=fallback', kind: 'bool' }],
      ['record_hash', { sql: 'hash_record(record_value)', kind: 'int' }],
      [
        'record_extended_hash',
        { sql: 'hash_record_extended(record_value,-19)::text', kind: 'text' },
      ],
      ['record_array', { sql: 'ARRAY[record_value,fallback]::text', kind: 'text' }],
      ['record_array_jsonb', { sql: 'to_jsonb(ARRAY[record_value,fallback])::text', kind: 'text' }],
      [
        'record_position',
        { sql: 'array_position(ARRAY[record_value,fallback],record_value)', kind: 'int' },
      ],
      ['record_array_hash', { sql: 'hash_array(ARRAY[record_value,fallback])', kind: 'int' }],
      ['record_input', { sql: '(record_text::vector_record)::text', kind: 'text' }],
      ['record_constructor', { sql: '(ROW(value,other)::vector_record)::text', kind: 'text' }],
      ['common_array', { sql: 'COALESCE(value,ARRAY[1::smallint])::text', kind: 'text' }],
      [
        'case_array',
        {
          sql: '(CASE WHEN value IS NULL THEN ARRAY[1::smallint] ELSE value END)::text',
          kind: 'text',
        },
      ],
      ['common_vector', { sql: 'COALESCE(value,ARRAY[1,2]::int2vector)::text', kind: 'text' }],
      ['type_names', { sql: 'oidvectortypes(other)', kind: 'text', catalog: true }],
      ['array_input', { sql: '(array_text::int2vector[])::text', kind: 'text' }],
      ['array_jsonb', { sql: 'to_jsonb(array_text::int2vector[])::text', kind: 'text' }],
    ])
    const definitions = Object.fromEntries(
      [...calls].map(([name, c], i) => [
        name,
        `mode<>${i} OR (${c.sql})=${c.kind === 'text' ? 'expected_text' : c.kind === 'int' ? 'expected_int' : 'expected_bool'}`,
      ]),
    )
    await pg.exec(`CREATE DOMAIN limited_positions AS int2vector CHECK(cardinality(VALUE)<=3);
      CREATE TYPE vector_record AS(positions int2vector,type_ids oidvector);
      CREATE TABLE vector_context(value int2vector,other oidvector,record_value vector_record,fallback vector_record,
        input_text text NOT NULL,array_text text NOT NULL,record_text text NOT NULL,mode integer NOT NULL,
        expected_text text NOT NULL,expected_int integer NOT NULL,expected_bool boolean NOT NULL,
        ${Object.entries(definitions)
          .map(([name, sql]) => `CONSTRAINT "${name}" CHECK(${sql})`)
          .join(',')});
      CREATE TABLE vector_inputs(id integer PRIMARY KEY,value int2vector,other oidvector,record_value vector_record,fallback vector_record);`)
    const positions = [
      'NULL::int2vector',
      "''::int2vector",
      "'1 2'::int2vector",
      "'-1 0 4'::int2vector",
      'ARRAY[]::int2vector',
      'ARRAY[NULL::smallint]::int2vector',
      'ARRAY[ARRAY[1,2],ARRAY[3,4]]::int2vector',
    ]
    const types = [
      'NULL::oidvector',
      "''::oidvector",
      "'0 0'::oidvector",
      "'1 2'::oidvector",
      'ARRAY[]::oidvector',
      'ARRAY[NULL::oid]::oidvector',
      'ARRAY[1,2]::oidvector',
    ]
    const vector = async (sql: string, oid: boolean): Promise<CatalogVectorInput> =>
      decodeCatalogVector(
        (
          await pg.query<{ wire: string | null }>(
            `SELECT encode(${oid ? 'oid' : 'int2'}vectorsend(${sql}),'hex') wire`,
          )
        ).rows[0]!.wire,
        oid,
      )
    const values = await Promise.all(positions.map((s) => vector(s, false))),
      others = await Promise.all(types.map((s) => vector(s, true)))
    const record = (v: CatalogVectorInput, o: CatalogVectorInput): CompositeInputPayload => ({
      typeName: 'public.vector_record',
      fields: [
        v.kind === 'Null' ? v : { kind: 'Array', value: v.value },
        o.kind === 'Null' ? o : { kind: 'Array', value: o.value },
      ],
    })
    const records: Input[] = values.map((v, i) =>
        i === 0 ? known(null) : known(record(v, others[i]!)),
      ),
      fallback = known(record(values[2]!, others[2]!))
    for (const i of positions.keys())
      await pg.exec(
        `INSERT INTO vector_inputs VALUES(${i},${positions[i]},${types[i]},${i === 0 ? 'NULL::vector_record' : `ROW(${positions[i]},${types[i]})::vector_record`},ROW(${positions[2]},${types[2]})::vector_record)`,
      )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'vector_context')!,
      context = {
        defaultCollation: 'C' as const,
        serverEncoding: 'UTF8' as const,
        arrayNulls: true,
      }
    const plans = Object.entries(definitions).flatMap(([name, sql]) => {
      const c = table.constraints.find((c) => c.name === name)!
      return ['raw', 'stored'].map((origin) => {
        const expression = lowerTableCheck(
          table,
          c,
          [],
          catalog.domains,
          origin === 'raw' ? 'source' : 'stored',
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
          origin === 'raw' ? `CHECK(${sql})` : undefined,
        )!.expression
        expect(containsUnknown(expression), `${name} ${origin}`).toBe(false)
        return {
          expression,
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: name + '_' + origin,
          },
        }
      })
    })
    const group = prepareCheckRustGroup(plans, context)
    expect(
      group.checks.flatMap((c, i) =>
        c.kind === 'unsupported' ? [{ name: plans[i]!.identity.constraint, reason: c.reason }] : [],
      ),
    ).toEqual([])
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      samples: { name: string; row: Row; expected: Outcome }[] = []
    let nativeInserts = 0
    for (const [mode, [name, call]] of [...calls].entries())
      for (const i of positions.keys()) {
        const inputText = i % 2 ? '1 2' : '4 5 6 7',
          arrayText = i % 3 === 0 ? '{}' : i % 3 === 1 ? '{"1 2",NULL,""}' : '{"1 2 3 4"}',
          recordText = i % 3 === 0 ? '(,)' : i % 3 === 1 ? '("1 2","0 0")' : '(1,bad_oid)'
        let result: string | number | boolean | null = null,
          expected: Outcome
        try {
          result = (
            await pg.query<{ result: string | number | boolean | null }>(
              `SELECT ${call.sql} result FROM (SELECT q.*,$2::text input_text,$3::text array_text,$4::text record_text FROM vector_inputs q WHERE id=$1) a`,
              [i, inputText, arrayText, recordText],
            )
          ).rows[0]!.result
          expected = { kind: result === null ? 'Null' : 'True' }
        } catch (e) {
          expected = { kind: 'Error', value: { state: parseInt((e as { code: string }).code, 36) } }
        }
        const parameters = [
          inputText,
          arrayText,
          recordText,
          mode,
          call.kind === 'text' ? (result ?? '') : '',
          call.kind === 'int' ? (result ?? 0) : 0,
          call.kind === 'bool' ? (result ?? false) : false,
        ]
        const insertion = pg.query(
          'INSERT INTO vector_context(value,other,record_value,fallback,input_text,array_text,record_text,mode,expected_text,expected_int,expected_bool) SELECT value,other,record_value,fallback,$2,$3,$4,$5,$6,$7,$8 FROM vector_inputs WHERE id=$1',
          [i, ...parameters],
        )
        if (expected.kind === 'Error')
          await expect(insertion).rejects.toMatchObject({ code: state(expected) })
        else await insertion
        nativeInserts++
        if (call.catalog && expected.kind === 'True' && (i === 3 || i === 6))
          expected = { kind: 'Unknown' }
        const row: Row = {
          value: values[i]!,
          other: others[i]!,
          record_value: records[i]!,
          fallback,
          input_text: known(inputText),
          array_text: known(arrayText),
          record_text: known(recordText),
          mode: known(mode),
          expected_text: known(parameters[4]!),
          expected_int: known(parameters[5]!),
          expected_bool: known(parameters[6]!),
        }
        samples.push({ name, row, expected })
        for (const origin of ['raw', 'stored'])
          fixtures.push({ name: name + '_' + origin, row, expected })
        if (
          (i === 2 || (call.catalog && i === 3)) &&
          expected.kind !== 'Error' &&
          result !== null
        ) {
          const wrong =
            call.kind === 'text'
              ? '__different__'
              : call.kind === 'int'
                ? Number(result) + 1
                : !result
          const field =
            call.kind === 'text'
              ? 'expected_text'
              : call.kind === 'int'
                ? 'expected_int'
                : 'expected_bool'
          const rejected = [...parameters]
          rejected[call.kind === 'text' ? 4 : call.kind === 'int' ? 5 : 6] = wrong
          await expect(
            pg.query(
              'INSERT INTO vector_context(value,other,record_value,fallback,input_text,array_text,record_text,mode,expected_text,expected_int,expected_bool) SELECT value,other,record_value,fallback,$2,$3,$4,$5,$6,$7,$8 FROM vector_inputs WHERE id=$1',
              [i, ...rejected],
            ),
          ).rejects.toMatchObject({ code: '23514', constraint: name })
          nativeInserts++
          const rejectedRow = { ...row, [field]: known(wrong) },
            rejectedOutcome: Outcome = { kind: expected.kind === 'Unknown' ? 'Unknown' : 'False' }
          samples.push({ name, row: rejectedRow, expected: rejectedOutcome })
          for (const origin of ['raw', 'stored'])
            fixtures.push({
              name: name + '_' + origin,
              row: rejectedRow,
              expected: rejectedOutcome,
            })
        }
      }
    await mkdir(join(root, 'parity'))
    await mkdir('artifacts/catalog-vector-sql', { recursive: true })
    await writeFile(
      'artifacts/catalog-vector-sql/composition-evaluators.rs',
      group.evaluatorSource ?? '',
    )
    await runCheckParity(
      join(root, 'parity'),
      'vectorcomposition',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
    const options = {
      enums: catalog.enums,
      rangeTypes: catalog.rangeTypes,
      compositeTypeGraph: catalog.compositeTypeGraph,
      executionContext: context,
    }
    const ts = renderTypescriptSchemaCheckArtifacts(
      [table],
      catalog.domains,
      catalog.domains,
      options,
    )
    const rendered = renderGoSchemaArtifacts(
      { ...catalog, tables: [table] },
      parseConfigString(
        'schema: schema.sql\nsql:\n  codegen:\n    checks: {defaultCollation: C, serverEncoding: UTF8, arrayNulls: true}\n    go:\n      schema: {outDir: schema}\n',
      ),
      {},
      join(root, 'schema'),
      'vectorpublic/schema',
    )
    expect(rendered.diagnostics).toEqual([])
    await writeFile(join(root, 'package.json'), '{"type":"module"}')
    for (const artifact of [
      { path: join(root, 'checks.ts'), content: ts.checks },
      ...checkTypescriptArtifacts(ts.rustFiles!).map((a) => ({
        path: join(root, 'checks-rust', a.path),
        content: a.content,
      })),
      ...rendered.artifacts,
    ]) {
      await mkdir(dirname(artifact.path), { recursive: true })
      await writeFile(artifact.path, artifact.content)
    }
    await run(process.execPath, [
      'node_modules/typescript/bin/tsc',
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
    ])
    const generated = await import(pathToFileURL(join(root, 'js/checks.js')).href)
    const unwrap = (input: Input): unknown =>
      input.kind === 'Value' ? input.value : input.kind === 'Null' ? null : input
    const publicState = (result: {
      certain: boolean
      error?: string
      value?: boolean | null
    }): string =>
      !result.certain
        ? 'Unknown'
        : (result.error ?? (result.value === null ? 'Null' : result.value ? 'True' : 'False'))
    const goCases: string[] = []
    const goArray = (input: Input): string => {
      if (input.kind === 'Null') return 'checkruntime.ArrayNull()'
      if (
        input.kind !== 'Value' ||
        typeof input.value !== 'object' ||
        !('dimensions' in input.value)
      )
        throw Error('Missing vector payload')
      const p = input.value
      const cells = p.elements.map((c) =>
        c.kind === 'Null'
          ? '{Kind:checkruntime.ArrayElementNull}'
          : c.kind === 'Int2'
            ? `{Kind:checkruntime.ArrayElementInt2,Int2:${c.value}}`
            : c.kind === 'Oid'
              ? `{Kind:checkruntime.ArrayElementOid,Oid:${c.value}}`
              : (() => {
                  throw Error('Unexpected native vector cell')
                })(),
      )
      return `checkruntime.ArrayValue{Kind:checkruntime.ArrayValueValue,Value:checkruntime.ArrayPayload{ElementType:${JSON.stringify(p.elementType)},ElementKind:${p.elementKind},Dimensions:[]checkruntime.ArrayDimension{${p.dimensions.map((d) => `{Lower:${d.lower},Length:${d.length}}`).join(',')}},Elements:[]checkruntime.ArrayElement{${cells.join(',')}},NullBitmap:checkruntime.BoolValue{Kind:checkruntime.BoolValueValue,Value:${p.nullBitmap.kind === 'Value' && p.nullBitmap.value}}}}`
    }
    const goRecord = (input: Input): string => {
      if (input.kind === 'Null') return 'checkruntime.CompositeNull()'
      if (input.kind !== 'Value' || typeof input.value !== 'object' || !('fields' in input.value))
        throw Error('Missing record')
      return `checkruntime.CompositeValue{Kind:checkruntime.CompositeValueValue,Value:checkruntime.CompositePayload{TypeName:"public.vector_record",Fields:[]checkruntime.ArrayElement{${input.value.fields
        .map((c) =>
          c.kind === 'Null'
            ? '{Kind:checkruntime.ArrayElementNull}'
            : c.kind === 'Array'
              ? `{Kind:checkruntime.ArrayElementArray,Array:${goArray({ kind: 'Value', value: c.value })}.Value}`
              : (() => {
                  throw Error('Unexpected record field')
                })(),
        )
        .join(',')}}}}`
    }
    for (const sample of samples) {
      const row = Object.fromEntries(
        Object.entries(sample.row).map(([name, value]) => [
          name,
          ['value', 'other', 'record_value', 'fallback'].includes(name) ? value : unwrap(value),
        ]),
      )
      const snapshot = structuredClone(row)
      const evaluations = generated.evaluatePublicVectorContextChecks(row) as {
        constraint: string
        result: { certain: boolean; error?: string; value?: boolean | null }
      }[]
      expect(row).toEqual(snapshot)
      for (const e of evaluations)
        expect(publicState(e.result), sample.name + '/' + e.constraint).toBe(
          e.constraint === sample.name ? state(sample.expected) : 'True',
        )
      const scalar = (name: string) => JSON.stringify(unwrap(sample.row[name]!))
      goCases.push(
        `{input:=PublicVectorContextCheckInput{Value:KnownCheckValue(${goArray(sample.row.value!)}),Other:KnownCheckValue(${goArray(sample.row.other!)}),RecordValue:KnownCheckValue(${goRecord(sample.row.record_value!)}),Fallback:KnownCheckValue(${goRecord(sample.row.fallback!)}),InputText:KnownCheckValue(${scalar('input_text')}),ArrayText:KnownCheckValue(${scalar('array_text')}),RecordText:KnownCheckValue(${scalar('record_text')}),Mode:KnownCheckValue(int32(${scalar('mode')})),ExpectedText:KnownCheckValue(${scalar('expected_text')}),ExpectedInt:KnownCheckValue(int32(${scalar('expected_int')})),ExpectedBool:KnownCheckValue(${scalar('expected_bool')})};before,_:=json.Marshal(input);for _,e:=range EvaluatePublicVectorContextChecks(input){want:="True";if e.Constraint==${JSON.stringify(sample.name)}{want=${JSON.stringify(state(sample.expected))}};got:="Unknown";if e.Result.Certain{if e.Result.Value.Error!=""{got=e.Result.Value.Error}else if !e.Result.Value.Valid{got="Null"}else if e.Result.Value.Value{got="True"}else{got="False"}};if got!=want{t.Fatal(${JSON.stringify(sample.name)},e.Constraint,got,want)}};after,_:=json.Marshal(input);if string(before)!=string(after){t.Fatal("mutated public inputs")}}`,
      )
    }
    const bad = structuredClone(
      samples.find((s) => s.name === 'text_alias' && s.row.value?.kind === 'Value')!.row,
    )
    const rawBad = Object.fromEntries(
      Object.entries(bad).map(([name, value]) => [
        name,
        ['value', 'other', 'record_value', 'fallback'].includes(name) ? value : unwrap(value),
      ]),
    )
    rawBad.value = '1 2'
    expect(
      publicState(
        generated
          .evaluatePublicVectorContextChecks(rawBad)
          .find((e: { constraint: string }) => e.constraint === 'text_alias').result,
      ),
    ).toBe('Unknown')
    const nativeVector = values[2]!
    if (nativeVector.kind !== 'Value') throw Error('Missing vector validation control')
    const vectorPayload = nativeVector.value
    const invalidVectors = [
      { ...vectorPayload, elementType: 'other.positions' },
      { ...vectorPayload, elementKind: 2 },
      { ...vectorPayload, dimensions: [{ lower: 0, length: 3 }] },
      {
        ...vectorPayload,
        elements: [
          { kind: 'Int4', value: 1 },
          { kind: 'Int4', value: 2 },
        ],
      },
      { ...vectorPayload, nullBitmap: { kind: 'Unknown' } },
    ]
    for (const payload of invalidVectors) {
      const row = {
        value: { kind: 'Value', value: payload },
        mode: [...calls.keys()].indexOf('text_alias'),
        expected_text: '1 2',
      }
      expect(
        publicState(
          generated
            .evaluatePublicVectorContextChecks(row)
            .find((e: { constraint: string }) => e.constraint === 'text_alias').result,
        ),
      ).toBe('Unknown')
    }
    for (const mutation of [
      'value.Value.ElementType="other.positions"',
      'value.Value.ElementKind=2',
      'value.Value.Dimensions[0].Length=3',
      'value.Value.Elements[0].Kind=checkruntime.ArrayElementInt4',
      'value.Value.NullBitmap=checkruntime.BoolUnknown()',
    ])
      goCases.push(
        `{value:=${goArray(nativeVector)};${mutation};input:=PublicVectorContextCheckInput{Value:KnownCheckValue(value),Mode:KnownCheckValue(int32(${[...calls.keys()].indexOf('text_alias')})),ExpectedText:KnownCheckValue("1 2")};for _,e:=range EvaluatePublicVectorContextChecks(input){if e.Constraint=="text_alias"&&e.Result.Certain{t.Fatal("malformed vector became definite",e)}}}`,
      )
    const nativeRecord = records[2]!
    if (
      nativeRecord.kind !== 'Value' ||
      typeof nativeRecord.value !== 'object' ||
      !('fields' in nativeRecord.value)
    )
      throw Error('Missing record validation control')
    const recordPayload = nativeRecord.value
    for (const payload of [
      { ...recordPayload, typeName: 'other.vector_record' },
      {
        ...recordPayload,
        fields: [
          { kind: 'Array', value: { ...vectorPayload, elementType: 'other.positions' } },
          recordPayload.fields[1],
        ],
      },
    ]) {
      const row = {
        record_value: { kind: 'Value', value: payload },
        mode: [...calls.keys()].indexOf('record_text'),
        expected_text: '("1 2","0 0")',
      }
      expect(
        publicState(
          generated
            .evaluatePublicVectorContextChecks(row)
            .find((e: { constraint: string }) => e.constraint === 'record_text').result,
        ),
      ).toBe('Unknown')
    }
    for (const mutation of [
      'value.Value.TypeName="other.vector_record"',
      'value.Value.Fields[0].Array.ElementType="other.positions"',
    ])
      goCases.push(
        `{value:=${goRecord(nativeRecord)};${mutation};input:=PublicVectorContextCheckInput{RecordValue:KnownCheckValue(value),Mode:KnownCheckValue(int32(${[...calls.keys()].indexOf('record_text')})),ExpectedText:KnownCheckValue("")};for _,e:=range EvaluatePublicVectorContextChecks(input){if e.Constraint=="record_text"&&e.Result.Certain{t.Fatal("malformed nested vector became definite",e)}}}`,
      )
    await writeFile(
      join(root, 'schema/public/vector_test.go'),
      `package public\nimport("testing";"encoding/json";checkruntime "vectorpublic/schema/public/checkrust/checkruntime")\nfunc TestVectorPublicInputs(t *testing.T){${goCases.join('\n')}}\n`,
    )
    await writeFile(join(root, 'go.mod'), 'module vectorpublic\n\ngo 1.25\n')
    await run('go', ['test', '-p', '1', './...'], {
      cwd: root,
      env: { ...process.env, GOCACHE: '/tmp/pgsid-check-rust-go-cache' },
    }).catch((e: { stdout: string; stderr: string }) => {
      throw Error(e.stdout + e.stderr)
    })
    console.info('Vector composition and public parity', {
      fixtures: fixtures.length,
      nativeInserts,
      checks: calls.size,
      publicRows: samples.length,
    })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
