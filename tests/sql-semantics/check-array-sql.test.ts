import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { execFile } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { renderGoSchemaArtifacts } from '../../src/codegen/go/schema.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  bindProbe,
  hasUncertain,
  valueRepresentation,
} from '../../scripts/check-measurements/probes.js'
import { catalogScalarType } from '../../src/sql-semantics/catalog-check-binder.js'
import { parseConfigString } from '../../src/config/loader.js'
import { writeCheckRustSources } from '../../tools/check-rust/sources.js'
import { arrayFixtureSource } from './check-array-fixtures.js'

it('binds public arrays, metadata and owned composition through Rust, Go and TypeScript', async () => {
  const pg = await PGlite.create()
  const root = await mkdtemp(join(tmpdir(), 'pgsid-array-sql-'))
  const run = promisify(execFile)
  const scalarTypes = [
    'smallint',
    'integer',
    'bigint',
    'timestamp',
    'timestamptz',
    'public.array_stage',
    'date',
    'text',
    'boolean',
    'numeric',
    'json',
    'jsonb',
    'inet',
    'bit varying',
    'bytea',
    'macaddr',
    'macaddr8',
    'uuid',
    'real',
    'double precision',
    'time',
    'timetz',
    'interval',
    'point',
    'line',
    'lseg',
    'box',
    'path',
    'polygon',
    'circle',
    'money',
    '"char"',
    'oid',
    'xid',
    'cid',
    'pg_snapshot',
    'xid8',
    'pg_lsn',
    'tid',
    'jsonpath',
  ]
  try {
    await pg.exec(`CREATE TYPE array_stage AS ENUM ('new','done'); CREATE DOMAIN retained_array AS integer[];
      CREATE TABLE array_metadata(value retained_array,fallback integer[],dimension integer,expected_count integer,expected_ndims integer,expected_length integer,expected_lower integer,expected_upper integer,expected_dims text,bypass boolean,
      CONSTRAINT count CHECK(cardinality(value) IS NOT DISTINCT FROM expected_count),
      CONSTRAINT ndims CHECK(array_ndims(value) IS NOT DISTINCT FROM expected_ndims),
      CONSTRAINT length CHECK(array_length(value,dimension) IS NOT DISTINCT FROM expected_length),
      CONSTRAINT lower_bound CHECK(array_lower(value,dimension) IS NOT DISTINCT FROM expected_lower),
      CONSTRAINT upper_bound CHECK(array_upper(value,dimension) IS NOT DISTINCT FROM expected_upper),
      CONSTRAINT dimensions CHECK(array_dims(value) COLLATE "C" IS NOT DISTINCT FROM expected_dims COLLATE "C"),
      CONSTRAINT composition CHECK(cardinality(COALESCE(CASE WHEN bypass THEN NULL::integer[] ELSE value END,fallback)) IS NOT DISTINCT FROM expected_count))`)
    for (const [index, type] of scalarTypes.entries())
      await pg.exec(
        `CREATE TABLE family_${index + 1}(value ${type}[],expected_count integer NOT NULL,CONSTRAINT count CHECK(cardinality(value) IS NOT DISTINCT FROM expected_count))`,
      )
    await pg.exec(
      'CREATE TABLE null_arrays(value integer[],CONSTRAINT present CHECK(value IS NOT NULL))',
    )
    const catalog = await snapshotCatalog(pg)
    catalog.tables.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    const plans = catalog.tables.flatMap((table) =>
      table.constraints
        .filter(
          (c) =>
            (c.type === 'check' && ['count', 'present'].includes(c.name)) ||
            table.name === 'array_metadata',
        )
        .map((constraint) => ({
          expression: portableCheckAtoms(
            lowerTableCheck(table, constraint, catalog.enums, catalog.domains)!.expression,
          ),
          identity: {
            schema: table.schema,
            kind: 'table' as const,
            owner: table.name,
            constraint: constraint.name,
          },
        })),
    )
    for (const plan of plans)
      expect(hasUncertain(plan.expression), JSON.stringify(plan.identity)).toBe(false)
    const group = prepareCheckRustGroup(plans)
    for (const check of group.checks)
      expect(check.kind, 'reason' in check ? check.reason : '').toBe('supported')
    expect(group.evaluatorSource).toContain('ArrayValue')
    expect(group.evaluatorSource).toContain('.clone()')
    expect(catalogScalarType('numeric(12,2)[][]')).toBe('array:pg_catalog."numeric"')
    expect(catalogScalarType('pg_catalog._jsonb')).toBe('array:pg_catalog.jsonb')
    expect(catalogScalarType('pg_catalog._tsvector')).toBe(null)
    expect(valueRepresentation('pg_catalog._int4').represented).toBe(true)
    writeCheckRustSources(join(root, 'checks.rs'), group.source!)
    const familyChecks = group.checks.slice(7, 47)
    const nativeCases = familyChecks
      .map((check, index) => {
        if (check.kind !== 'supported') throw new Error('Missing family')
        const arrayInput = check.inputs.find((input) => input.rustType === 'ArrayValue')!
        return `{let mut builder=make_array_arguments(${JSON.stringify(arrayInput.type.slice(6))},${index + 1});builder=append_array_dimension(builder,-2,2);builder=append_array_argument(builder,array_fixture_element(${index + 1}));builder=append_array_argument(builder,ArrayElement::Null);let value=finish_array_arguments(builder);assert!(${check.entryName}(${check.inputs.map((input) => (input.rustType === 'ArrayValue' ? 'value' : 'make_int4_value(2)')).join(',')})==CheckOutcome::True);}`
      })
      .join('\n')
    await writeFile(
      join(root, 'checks_test.rs'),
      `include!("checks.rs");\n${arrayFixtureSource}\n#[test]fn public_array_families(){${nativeCases}}`,
    )
    await run('rustc', [
      '--edition',
      '2021',
      '-Awarnings',
      '--test',
      join(root, 'checks_test.rs'),
      '-o',
      join(root, 'native'),
    ])
    await run(join(root, 'native'), []).catch((error) => {
      throw new Error(error.stdout + error.stderr)
    })
    const ts = renderTypescriptSchemaCheckArtifacts(
      catalog.tables,
      catalog.domains,
      catalog.domains,
      { enums: catalog.enums },
    )
    const go = renderGoSchemaArtifacts(
      catalog,
      parseConfigString(
        'schema: schema.sql\nsql:\n  codegen:\n    go:\n      schema: { outDir: schema }\n',
      ),
      {},
      join(root, 'schema'),
      'arraysql/schema',
    )
    expect(go.diagnostics).toEqual([])
    await writeFile(join(root, 'package.json'), '{"type":"module"}\n')
    await symlink(resolve('node_modules'), join(root, 'node_modules'), 'dir')
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
    const generatedEvidence = 'artifacts/array-sql/generated'
    await mkdir(generatedEvidence, { recursive: true })
    await writeFile(join(generatedEvidence, 'package.json'), '{"type":"module"}\n')
    await writeFile(join(generatedEvidence, 'checks.ts'), ts.checks)
    for (const artifact of checkTypescriptArtifacts(ts.rustFiles!)) {
      const path = join(generatedEvidence, 'checks-rust', artifact.path)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, artifact.content)
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
    ]).catch((error) => {
      throw new Error(error.stdout + error.stderr)
    })
    const generated = await import(pathToFileURL(join(root, 'js/checks.js')).href)
    const runtime = await import(
      pathToFileURL(join(root, 'js/checks-rust/checkruntime/runtime.js')).href
    )
    const operations = await import(
      pathToFileURL(join(root, 'js/checks-rust/pg_catalog/operations.js')).href
    )
    for (const table of catalog.tables.filter((table) => table.name.startsWith('family_'))) {
      const bound = bindProbe(
        'cardinality(value) IS NOT DISTINCT FROM expected_count',
        table.columns,
        catalog.enums,
      )
      expect(bound.fullyBound, table.name).toBe(true)
    }
    const expressions = Array.from(
      arrayFixtureSource.matchAll(/if kind==(\d+) \{return (.*);\};/gu),
    ).map((match) => match[2]!)
    expect(expressions).toHaveLength(40)
    const camel = (name: string) =>
      name.replace(/_([a-z0-9])/gu, (_, part: string) => part.toUpperCase())
    const pascal = (name: string) =>
      name.replace(/(^|_)([a-z0-9])/gu, (_, _separator: string, part: string) => part.toUpperCase())
    const construct = (source: string) =>
      Function(
        'runtime',
        'operations',
        'return ' +
          source
            .replace(/(\d+)i64/gu, '$1n')
            .replace(
              /\b([a-z][a-z0-9_]+)\(/gu,
              (_, name: string) => `(runtime.${camel(name)} ?? operations.${camel(name)})(`,
            ),
      )(runtime, operations)
    const goExpression = (source: string) =>
      source
        .replace(/(\d+)i64/gu, '$1')
        .replace(
          /\b([a-z][a-z0-9_]+)\(/gu,
          (_, name: string) =>
            `${['path_from_text', 'polygon_from_text', 'snapshot_from_text', 'jsonpath_from_coerced_source_utf8'].includes(name) ? 'pg_catalog' : 'checkruntime'}.${pascal(name)}(`,
        )
    const goCases: string[] = []
    for (const [index, check] of familyChecks.entries()) {
      if (check.kind !== 'supported') throw new Error('Missing family')
      const input = check.inputs.find((input) => input.rustType === 'ArrayValue')!
      const elementType = input.type.slice(6),
        family = index + 1,
        cell = construct(expressions[index]!)
      const value = {
        kind: 'Value',
        value: {
          elementType,
          elementKind: family,
          dimensions: [{ lower: -2, length: 2 }],
          elements: [cell, { kind: 'Null' }],
        },
      }
      const result = generated[`evaluatePublicFamily${family}Checks`]({ value, expected_count: 2 })
      expect(result).toHaveLength(1)
      expect(result[0].result).toEqual({ certain: true, value: true })
      goCases.push(
        `{builder:=checkruntime.MakeArrayArguments(${JSON.stringify(elementType)},${family});builder=checkruntime.AppendArrayDimension(builder,-2,2);builder=checkruntime.AppendArrayArgument(builder,${goExpression(expressions[index]!)});builder=checkruntime.AppendArrayArgument(builder,checkruntime.ArrayElement{Kind:checkruntime.ArrayElementNull});value:=checkruntime.FinishArrayArguments(builder);result:=EvaluatePublicFamily${family}Checks(PublicFamily${family}CheckInput{Value:KnownCheckValue(value),ExpectedCount:KnownCheckValue(int32(2))});if len(result)!=1 || !result[0].Result.Certain || !result[0].Result.Value.Valid || !result[0].Result.Value.Value {t.Fatalf("family ${family}: %+v",result)}}`,
      )
    }
    const outcomes: unknown[] = []
    for (const [literal, dimensions, elements] of [
      ['{}', [], []],
      [
        '{1,NULL,3}',
        [{ lower: 1, length: 3 }],
        [{ kind: 'Int4', value: 1 }, { kind: 'Null' }, { kind: 'Int4', value: 3 }],
      ],
      [
        '[0:1][-3:-2]={{1,NULL},{3,4}}',
        [
          { lower: 0, length: 2 },
          { lower: -3, length: 2 },
        ],
        [
          { kind: 'Int4', value: 1 },
          { kind: 'Null' },
          { kind: 'Int4', value: 3 },
          { kind: 'Int4', value: 4 },
        ],
      ],
    ] as const)
      for (const dimension of [-1, 0, 1, 2, 3, 2147483647]) {
        const row = (
          await pg.query<Record<string, unknown>>(
            `SELECT cardinality($1::int[]) AS expected_count,array_ndims($1::int[]) AS expected_ndims,array_length($1::int[],$2) AS expected_length,array_lower($1::int[],$2) AS expected_lower,array_upper($1::int[],$2) AS expected_upper,array_dims($1::int[]) AS expected_dims`,
            [literal, dimension],
          )
        ).rows[0]!
        const value = {
          kind: 'Value',
          value: { elementType: 'pg_catalog.int4', elementKind: 2, dimensions, elements },
        }
        const results = generated.evaluatePublicArrayMetadataChecks({
          ...row,
          value,
          fallback: value,
          dimension,
          bypass: false,
        })
        for (const result of results) expect(result.result).toEqual({ certain: true, value: true })
        outcomes.push({ literal, dimension, expected: row })
      }
    for (const value of [null, { kind: 'Null' }])
      expect(generated.evaluatePublicFamily2Checks({ value, expected_count: 2 })[0].result).toEqual(
        { certain: true, value: false },
      )
    for (const value of [undefined, { kind: 'Unknown' }])
      expect(
        generated.evaluatePublicFamily2Checks({ value, expected_count: 2 })[0].result.certain,
      ).toBe(false)
    expect(
      generated.evaluatePublicFamily2Checks({
        value: { kind: 'Error', value: { state: parseInt('22012', 36) } },
        expected_count: 2,
      })[0].result,
    ).toMatchObject({ certain: true, error: '22012' })
    const partial = {
      kind: 'Value',
      value: {
        elementType: 'pg_catalog.int4',
        elementKind: 2,
        dimensions: [{ lower: 0, length: 2 }],
        elements: [{ kind: 'Unknown' }, { kind: 'Null' }],
      },
    }
    expect(
      generated.evaluatePublicFamily2Checks({ value: partial, expected_count: 2 })[0].result,
    ).toEqual({ certain: true, value: true })
    const composed = generated.evaluatePublicArrayMetadataChecks({
      value: { kind: 'Unknown' },
      fallback: partial,
      bypass: true,
      expected_count: 2,
    })
    expect(
      composed.find((check: { constraint: string }) => check.constraint === 'composition').result,
    ).toEqual({ certain: true, value: true })
    expect(generated.evaluatePublicNullArraysChecks({ value: partial })[0].result).toEqual({
      certain: true,
      value: true,
    })
    expect(generated.evaluatePublicNullArraysChecks({ value: null })[0].result).toEqual({
      certain: true,
      value: false,
    })
    expect(generated.evaluatePublicNullArraysChecks({ value: { kind: 'Null' } })[0].result).toEqual(
      { certain: true, value: false },
    )
    expect(
      generated.evaluatePublicNullArraysChecks({ value: { kind: 'Unknown' } })[0].result.certain,
    ).toBe(false)
    expect(
      generated.evaluatePublicNullArraysChecks({
        value: { kind: 'Error', value: { state: parseInt('22012', 36) } },
      })[0].result,
    ).toMatchObject({ certain: true, error: '22012' })
    goCases.push(
      `{for _,value:=range []checkruntime.ArrayValue{checkruntime.ArrayNull(),checkruntime.ArrayUnknown(),{Kind:checkruntime.ArrayValueError,Error:checkruntime.SqlError{State:3452558}}} {result:=EvaluatePublicNullArraysChecks(PublicNullArraysCheckInput{Value:KnownCheckValue(value)})[0].Result;if value.Kind==checkruntime.ArrayValueNull && (!result.Certain || !result.Value.Valid || result.Value.Value) {t.Fatal("NULL array",result)};if value.Kind==checkruntime.ArrayValueUnknown && result.Certain {t.Fatal("Unknown array",result)};if value.Kind==checkruntime.ArrayValueError && (!result.Certain || result.Value.Error=="") {t.Fatal("array error",result)}}}`,
    )
    const storedPathArray = {
      kind: 'Value',
      value: {
        elementType: 'pg_catalog.jsonpath',
        elementKind: 40,
        dimensions: [{ lower: 1, length: 1 }],
        elements: [{ kind: 'JsonpathStoredText', value: '$.a' }],
      },
    }
    expect(
      generated.evaluatePublicFamily40Checks({ value: storedPathArray, expected_count: 1 })[0]
        .result,
    ).toEqual({ certain: true, value: true })
    expect(
      generated.evaluatePublicFamily40Checks({
        value: {
          ...storedPathArray,
          value: {
            ...storedPathArray.value,
            elements: [{ kind: 'JsonpathStoredText', value: '' }],
          },
        },
        expected_count: 1,
      })[0].result.certain,
    ).toBe(false)
    goCases.push(
      `{value:=checkruntime.ArrayValue{Kind:checkruntime.ArrayValueValue,Value:checkruntime.ArrayPayload{ElementType:"pg_catalog.jsonpath",ElementKind:40,Dimensions:[]checkruntime.ArrayDimension{{Lower:1,Length:1}},Elements:[]checkruntime.ArrayElement{{Kind:checkruntime.ArrayElementJsonpathStoredText,JsonpathStoredText:"$.a"}}}};result:=EvaluatePublicFamily40Checks(PublicFamily40CheckInput{Value:KnownCheckValue(value),ExpectedCount:KnownCheckValue(int32(1))})[0].Result;if !result.Certain || !result.Value.Valid || !result.Value.Value {t.Fatal("stored JSONPath array",result)}}`,
    )
    const invalid = [
      {},
      [],
      { kind: 'Value', value: {} },
      {
        kind: 'Value',
        value: {
          elementType: 'pg_catalog.int4',
          elementKind: 2,
          dimensions: [{ lower: 1, length: 1 }],
          elements: [{ kind: 'Int4', value: 1.5 }],
        },
      },
      {
        kind: 'Value',
        value: { elementType: 'pg_catalog.text', elementKind: 8, dimensions: [], elements: [] },
      },
      {
        kind: 'Value',
        value: {
          elementType: 'pg_catalog.int4',
          elementKind: 2,
          dimensions: [{ lower: 2147483647, length: 1 }],
          elements: [{ kind: 'Int4', value: 1 }],
        },
      },
    ]
    for (const value of invalid) {
      const result = generated.evaluatePublicFamily2Checks({ value, expected_count: 1 })
      expect(result[0].result.certain).toBe(false)
    }
    await writeFile(
      join(root, 'go.mod'),
      'module arraysql\n\ngo 1.25\n\nrequire (\n github.com/jackc/pgx/v5 v5.10.0\n github.com/shopspring/decimal v1.4.0\n)\n',
    )
    const { readFile } = await import('node:fs/promises')
    await writeFile(
      join(root, 'go.sum'),
      await readFile('tests/fixtures/codegen/project/go.sum', 'utf8'),
    )
    await writeFile(
      join(root, 'schema/public/checks_test.go'),
      `package public\nimport("testing";"arraysql/schema/public/checkrust/checkruntime";"arraysql/schema/public/checkrust/pg_catalog")\nfunc TestArrayFamilies(t *testing.T){${goCases.join('\n')}}`,
    )
    await run('go', ['test', '-p', '1', './...'], {
      cwd: root,
      env: { ...process.env, GOCACHE: '/tmp/pgsid-check-rust-go-cache' },
    }).catch((error) => {
      throw new Error(error.stdout + error.stderr)
    })
    await mkdir('artifacts/array-sql', { recursive: true })
    await writeFile(
      'artifacts/array-sql/public-inputs.json',
      JSON.stringify(
        { families: 40, metadataReferences: outcomes, invalidInputs: invalid.length },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 240_000)
