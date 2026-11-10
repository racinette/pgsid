import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { PG18_RANGE_TYPES } from '../../src/postgres/builtins/type-ranges.generated.js'
import { domainElementType } from '../../src/sql-semantics/expressions.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { renderGoSchemaArtifacts } from '../../src/codegen/go/schema.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { arrayInputPlan } from '../../src/codegen/shared/check-array-types.js'
import { parseConfigString } from '../../src/config/loader.js'
import { go, printGoFile } from '../../src/codegen/go/ast.js'
import {
  arrayGoInput,
  arrayTypescriptInput,
  type OwnedArrayInputPayload,
} from '../../tools/check-rust/array-input.js'
import { rangeGoInput, rangeTypescriptInput } from '../../tools/check-rust/range-input.js'
import { differingChecks, serverCheckResults } from '../support/check-server-results.js'
import { readRangeFixture, rangeCoreSamples } from './check-range-fixtures.js'
import { rangeArrayText, readRangeArrayFixture } from './check-range-array-fixtures.js'
import { internalCheckRows } from '../support/check-entries.js'

it('validates range array and domain-cell profiles before copying public inputs, independently of deployment OIDs', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-range-array-payload-')),
    run = promisify(execFile)
  try {
    const families = Object.values(PG18_RANGE_TYPES)
    const schema = families
      .map(
        (
          m,
          i,
        ) => `CREATE DOMAIN range_cell_${i} AS ${m.identity};CREATE DOMAIN range_history_${i} AS range_cell_${i}[];
      CREATE TABLE range_array_payload_${i}(spans ${m.identity}[],domains range_cell_${i}[],histories range_history_${i}[],head ${m.identity},bypass boolean,
      CONSTRAINT first CHECK(spans[1] IS NOT DISTINCT FROM head),CONSTRAINT shape CHECK(cardinality(spans)=3),CONSTRAINT present CHECK(spans IS NOT NULL),
      CONSTRAINT domain_cell CHECK(domains[1] IS NOT DISTINCT FROM head),CONSTRAINT nested_cell CHECK((histories[1])[1] IS NOT DISTINCT FROM head),
      CONSTRAINT guarded CHECK(CASE WHEN bypass THEN true ELSE spans[1] IS NOT DISTINCT FROM head END),
      CONSTRAINT domain_guarded CHECK(CASE WHEN domains IS NULL THEN true ELSE domains[1] IS NOT DISTINCT FROM head END),
      CONSTRAINT nested_guarded CHECK(CASE WHEN histories IS NULL THEN true ELSE (histories[1])[1] IS NOT DISTINCT FROM head END));`,
      )
      .join('\n')
    await pg.exec(schema)
    const catalog = await snapshotCatalog(pg)
    const typescript = renderTypescriptSchemaCheckArtifacts(catalog.tables, catalog.domains)
    const goFiles = renderGoSchemaArtifacts(
      catalog,
      parseConfigString(
        'schema: schema.sql\nsql:\n  codegen:\n    go:\n      schema: {outDir: schema}\n',
      ),
      {},
      join(root, 'schema'),
      'rangearraypayload/schema',
    )
    expect(goFiles.diagnostics).toEqual([])
    const other = await PGlite.create()
    try {
      await other.exec('CREATE DOMAIN unrelated_range_domain AS text;' + schema)
      const rebuilt = await snapshotCatalog(other)
      expect(rebuilt.domains.find((d) => d.name === 'range_cell_0')!.oid).not.toBe(
        catalog.domains.find((d) => d.name === 'range_cell_0')!.oid,
      )
      expect(
        renderTypescriptSchemaCheckArtifacts(
          rebuilt.tables.filter((t) => t.name.startsWith('range_array_payload_')),
          rebuilt.domains.filter((d) => d.name !== 'unrelated_range_domain'),
        ).rust,
      ).toBe(typescript.rust)
    } finally {
      await other.close()
    }
    await writeFile(join(root, 'package.json'), '{"type":"module"}\n')
    await writeFile(join(root, 'checks.ts'), typescript.checks)
    for (const a of checkTypescriptArtifacts(typescript.rustFiles!)) {
      const path = join(root, 'checks-rust', a.path)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, a.content)
    }
    for (const a of goFiles.artifacts) {
      await mkdir(dirname(a.path), { recursive: true })
      await writeFile(a.path, a.content)
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
    const internal = internalCheckRows(typescript.checks, runtime)
    const mismatches: ReturnType<typeof differingChecks> = []
    const fixtureFunctions = [],
      goCases: string[] = []
    let nativeInserts = 0,
      assertions = 0
    for (const [i, metadata] of families.entries()) {
      const text = rangeCoreSamples(metadata.identity).ranges[5]!
      const head = (await readRangeFixture(
        pg,
        `SELECT $1::${metadata.identity} span`,
        'span',
        metadata.identity,
        [text],
      ))!
      const spans = (await readRangeArrayFixture(
        pg,
        metadata.identity,
        rangeArrayText([text, null, 'empty']),
      ))!
      const element = domainElementType(
        { schema: 'public', name: 'range_cell_' + i },
        metadata.identity,
      )
      const domains = { ...spans, elementType: element }
      const history = domainElementType(
        { schema: 'public', name: 'range_history_' + i },
        `array:${element}`,
      )
      const histories: OwnedArrayInputPayload = {
        elementType: history,
        elementKind: 41,
        dimensions: [{ lower: 1, length: 1 }],
        elements: [{ kind: 'Array', value: domains }],
        nullBitmap: { kind: 'Value', value: false },
      }
      expect(arrayInputPlan(`array:${history}`).slice(2)).toEqual([
        metadata.identity,
        metadata.subtype,
        String.fromCharCode(head.elementKind),
      ])
      // Public ranges hold their subtype's public values; nested lists are dimensions, so an
      // array of the array domain has no public value with elements.
      const bound = (value: string): unknown =>
        metadata.subtype === 'pg_catalog.int4'
          ? Number(value)
          : metadata.subtype === 'pg_catalog.int8'
            ? BigInt(value)
            : metadata.subtype === 'pg_catalog."timestamp"'
              ? { localMicroseconds: BigInt(Date.parse(value + 'Z')) * 1000n }
              : metadata.subtype === 'pg_catalog.timestamptz'
                ? { epochMicroseconds: BigInt(Date.parse(value.replace('+00', 'Z'))) * 1000n }
                : value
      const [lowerText, upperText] = text.slice(1, -1).split(',') as [string, string]
      const publicHead = {
        empty: false,
        lower: { value: bound(lowerText), inclusive: text.startsWith('[') },
        upper: { value: bound(upperText), inclusive: text.endsWith(']') },
      }
      const publicSpans = [publicHead, null, { empty: true }]
      const evaluate = (
        value: unknown,
        domain: unknown = publicSpans,
        nested: unknown = null,
        bypass = false,
      ) =>
        Object.fromEntries(
          generated['evaluatePublicRangeArrayPayload' + i + 'Checks']({
            spans: value,
            domains: domain,
            histories: nested,
            head: publicHead,
            bypass,
          }).map((c: { constraint: string; result: unknown }) => [c.constraint, c.result]),
        )
      const arrayText = rangeArrayText([text, null, 'empty'])
      // Each column declares one dimension, so a history's element is one quoted array of spans.
      const quotedElement = (value: string) => `"${value.replace(/[\\"]/gu, '\\$&')}"`
      for (const [
        spansValue,
        spansText,
        domainValue,
        domainText,
        nestedValue,
        nestedText,
        bypass,
      ] of [
        [publicSpans, arrayText, publicSpans, arrayText, null, null, false],
        [publicSpans, arrayText, publicSpans, arrayText, [null], '{NULL}', false],
        [publicSpans, arrayText, publicSpans, arrayText, [], '{}', true],
        [
          publicSpans,
          arrayText,
          [null, publicHead],
          rangeArrayText([null, text]),
          null,
          null,
          false,
        ],
        [[{ empty: true }], '{empty}', [], '{}', null, null, false],
        [null, null, null, null, null, null, false],
        [[publicHead], rangeArrayText([text]), null, null, null, null, true],
        [
          publicSpans,
          arrayText,
          null,
          null,
          [publicSpans, null],
          `{${quotedElement(arrayText)},NULL}`,
          false,
        ],
        [publicSpans, arrayText, null, null, [publicSpans], `{${quotedElement(arrayText)}}`, true],
      ] as const) {
        const row = {
          spans: spansValue,
          domains: domainValue,
          histories: nestedValue,
          head: publicHead,
          bypass,
        }
        const shown = `${metadata.identity} ${JSON.stringify(row, (_key, item) =>
          typeof item === 'bigint' ? `${item}n` : item,
        )}`
        mismatches.push(
          ...differingChecks(
            shown,
            evaluate(spansValue, domainValue, nestedValue, bypass),
            await serverCheckResults(pg, `range_array_payload_${i}`, {
              spans: spansText,
              domains: domainText,
              histories: nestedText,
              head: text,
              bypass: String(bypass),
            }),
          ),
        )
        assertions++
      }
      // Malformed public elements and payloads are type errors before any check runs.
      for (const element of [
        { empty: 'false' },
        { empty: false },
        { ...publicHead, lower: { ...publicHead.lower, inclusive: 'true' } },
        { ...publicHead, lower: { value: publicHead.lower.value } },
        { ...publicHead, lower: { inclusive: true } },
        { ...publicHead, lower: { value: null, inclusive: true } },
        { ...publicHead, lower: { value: undefined, inclusive: true } },
        { ...publicHead, lower: undefined },
        // The former flat bounds with flags beside them.
        {
          empty: false,
          lower: publicHead.lower.value,
          upper: publicHead.upper.value,
          lowerInclusive: publicHead.lower.inclusive,
          upperInclusive: publicHead.upper.inclusive,
        },
        { ...publicHead, lower: { value: 1.5, inclusive: true } },
        { ...publicHead, lower: { value: publicHead, inclusive: true } },
        undefined,
        { kind: 'Range', value: head },
      ]) {
        expect(() => evaluate([element, null], publicSpans, null, true), metadata.identity).toThrow(
          TypeError,
        )
        assertions++
      }
      // A list where a span belongs is no span: nesting never adds a dimension.
      for (const value of [
        [publicSpans],
        [publicHead, [publicHead]],
        [publicSpans, null],
        '{empty}',
        { kind: 'Value', value: spans },
        { kind: 'Value', value: { ...spans, elementType: 'wrong' } },
        { kind: 'Value', value: { ...spans, elementKind: 2 } },
        { kind: 'Unknown' },
        { kind: 'Null' },
        { kind: 'Error', value: { state: parseInt('22012', 36) } },
      ])
        expect(() => evaluate(value, publicSpans, null, true)).toThrow(TypeError)
      expect(() => evaluate(publicSpans, { kind: 'Value', value: domains })).toThrow(TypeError)
      expect(() => evaluate(publicSpans, publicSpans, { kind: 'Value', value: histories })).toThrow(
        TypeError,
      )
      {
        const result = evaluate(undefined, publicSpans, null, true)
        for (const name of ['first', 'shape', 'present']) {
          expect(result[name]).toMatchObject({ certain: false })
          assertions++
        }
        expect(result.guarded).toEqual({ certain: true, value: true })
      }
      {
        const result = evaluate(null)
        expect(result.first).toEqual({ certain: true, value: false })
        expect(result.shape).toEqual({ certain: true, value: null })
        expect(result.present).toEqual({ certain: true, value: false })
      }
      // Stored values go to the evaluator entries directly: element and array identities other
      // than the column's, unknown or failed elements and bounds, and arrays of the array domain.
      const owner = `public.range_array_payload_${i}`
      const array = (payload: OwnedArrayInputPayload): unknown =>
        runtime.makeArrayValue(arrayTypescriptInput(payload, runtime))
      const failure = (code: string) => ({ kind: 'Error', value: { state: parseInt(code, 36) } })
      const undecided = (outcome: unknown, label?: string) =>
        expect(['Unknown', 'Unimplemented'], label).toContain((outcome as { kind: string }).kind)
      const rows = (
        value: unknown,
        domain: unknown = array(domains),
        nested: unknown = array(histories),
        bypass = false,
      ): Record<string, unknown> => {
        const row: Record<string, unknown> = {
          spans: value,
          domains: domain,
          histories: nested,
          head: runtime.makeCoercedRangeValue(rangeTypescriptInput(head, runtime)),
          bypass: runtime.makeBoolValue(bypass),
        }
        return internal(owner, row)
      }
      for (const [name, result] of Object.entries(rows(array(spans)))) {
        expect(result, `${metadata.identity} ${name}`).toEqual({ kind: 'True' })
        assertions++
      }
      for (const change of [
        { typeName: families[(i + 1) % families.length]!.identity },
        { elementType: 'pg_catalog.bool' },
        { elementKind: 42 },
        { bounds: [] },
        { empty: true },
      ]) {
        const bad = structuredClone(spans)
        bad.elements[0] = { kind: 'Range', value: { ...head, ...change } as typeof head }
        const result = rows(array(bad), array(domains), array(histories), true)
        // The array is present whatever its first element holds, if that is decided at all.
        expect(['True', 'Unknown', 'Unimplemented']).toContain(
          (result['present'] as { kind: string }).kind,
        )
        for (const name of ['first', 'shape'])
          undecided(result[name], `${metadata.identity} ${name}`)
        expect(result['guarded']).toEqual({ kind: 'True' })
        assertions++
      }
      {
        const result = rows(runtime.arrayUnknown(), array(domains), array(histories), true)
        for (const name of ['first', 'shape', 'present']) undecided(result[name])
        expect(result['guarded']).toEqual({ kind: 'True' })
      }
      const partial = structuredClone(spans)
      partial.elements[0] = { kind: 'Unknown' }
      undecided(rows(array(partial))['first'])
      expect(rows(array(partial))['shape']).toEqual({ kind: 'True' })
      const partialBound = structuredClone(spans)
      const first = partialBound.elements[0]
      if (first?.kind !== 'Range') throw new Error('Missing range')
      first.value.bounds[0] = { kind: 'Unknown' }
      undecided(rows(array(partialBound))['first'])
      expect(rows(array(partialBound))['shape']).toEqual({ kind: 'True' })
      const badDomain = rows(array(spans), array({ ...domains, elementType: metadata.identity }))
      for (const name of ['domain_cell', 'domain_guarded'])
        undecided(badDomain[name], `${metadata.identity} ${name}`)
      const badNested = structuredClone(histories)
      const inner = badNested.elements[0]
      if (inner?.kind !== 'Array') throw new Error('Missing nested array')
      inner.value.elementType = metadata.identity
      const nestedResult = rows(array(spans), array(domains), array(badNested))
      for (const name of ['nested_cell', 'nested_guarded'])
        undecided(nestedResult[name], `${metadata.identity} ${name}`)
      {
        const result = rows(runtime.arrayNull())
        expect(result['first']).toEqual({ kind: 'False' })
        expect(result['shape']).toEqual({ kind: 'Null' })
        expect(result['present']).toEqual({ kind: 'False' })
      }
      const error = rows(failure('22012'), array(domains), array(histories), true)
      for (const name of ['first', 'shape', 'present'])
        expect(error[name]).toEqual(failure('22012'))
      expect(error['guarded']).toEqual({ kind: 'True' })
      await pg.query(
        `INSERT INTO range_array_payload_${i} VALUES($1,$2,ARRAY[$4::range_history_${i}],$3,false)`,
        [
          rangeArrayText([text, null, 'empty']),
          rangeArrayText([text, null, 'empty']),
          text,
          rangeArrayText([text, null, 'empty']),
        ],
      )
      nativeInserts++
      await expect(
        pg.query(`INSERT INTO range_array_payload_${i} VALUES('{empty}',NULL,NULL,$1,false)`, [
          text,
        ]),
      ).rejects.toMatchObject({ code: '23514' })
      nativeInserts++
      for (const [name, payload] of [
        ['Spans', spans],
        ['Domains', domains],
        ['Histories', histories],
      ] as const)
        fixtureFunctions.push(
          go.function(
            `rangeArray${name}${i}`,
            [],
            [{ type: go.selector(go.ident('checkruntime'), 'ArrayValue') }],
            [go.return(arrayGoInput(payload))],
          ),
        )
      fixtureFunctions.push(
        go.function(
          `rangeArrayHead${i}`,
          [],
          [{ type: go.selector(go.ident('checkruntime'), 'RangeValue') }],
          [go.return(rangeGoInput(head))],
        ),
      )
      goCases.push(`{
 skip:=false;value:=rangeArraySpans${i}();domains:=rangeArrayDomains${i}();histories:=rangeArrayHistories${i}();head:=rangeArrayHead${i}()
 input:=PublicRangeArrayPayload${i}CheckInput{Spans:KnownCheckValue(value),Domains:KnownCheckValue(domains),Histories:KnownCheckValue(histories),Head:KnownCheckValue(head),Bypass:KnownCheckValue(&skip)}
 for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicRangeArrayPayload${i}Checks(input); if e != nil {panic(e)}; return r}(){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("valid range array",c)}}
 skip=true;input.Bypass=KnownCheckValue(&skip)
 for mode:=0;mode<6;mode++ {
  bad:=checkruntime.CopyArrayValue(value)
  if mode==0 {bad.Value.Elements[0].Range.TypeName="wrong"};if mode==1 {bad.Value.Elements[0].Range.ElementType="wrong"};if mode==2 {bad.Value.Elements[0].Range.ElementKind=42};if mode==3 {bad.Value.Elements[0].Range.Bounds=nil};if mode==4 {bad.Value.Elements[0].Range.Empty=true};if mode==5 {bad.Value.Elements[0].Range.Bounds[0]=checkruntime.ArrayElement{Kind:255}}
  input.Spans=KnownCheckValue(bad)
  for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicRangeArrayPayload${i}Checks(input); if e != nil {return nil}; return r}(){if c.Constraint=="guarded"{if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("lazy range array",c)}}else if c.Constraint=="first"||c.Constraint=="shape"||c.Constraint=="present"{if c.Result.Certain{t.Fatal("invalid range array",mode,c)}}}
 }
 input.Spans=KnownCheckValue(value);badDomains:=checkruntime.CopyArrayValue(domains);badDomains.Value.ElementType="wrong";input.Domains=KnownCheckValue(badDomains)
 for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicRangeArrayPayload${i}Checks(input); if e != nil {return nil}; return r}(){if c.Constraint=="domain_cell"&&c.Result.Certain{t.Fatal("domain identity",c)}}
 input.Domains=KnownCheckValue(domains);badHistory:=checkruntime.CopyArrayValue(histories);badHistory.Value.Elements[0].Array.ElementType="wrong";input.Histories=KnownCheckValue(badHistory)
 for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicRangeArrayPayload${i}Checks(input); if e != nil {return nil}; return r}(){if c.Constraint=="nested_cell"&&c.Result.Certain{t.Fatal("nested identity",c)}}
}`)
    }
    await writeFile(join(root, 'go.mod'), 'module rangearraypayload\n\ngo 1.25\n')
    await writeFile(
      join(root, 'schema/public/array_fixtures_test.go'),
      printGoFile({
        package: 'public',
        imports: [
          { alias: 'checkruntime', path: 'rangearraypayload/schema/public/checkrust/checkruntime' },
        ],
        declarations: fixtureFunctions,
      }),
    )
    await writeFile(
      join(root, 'schema/public/array_test.go'),
      'package public\nimport "testing"\nimport checkruntime "rangearraypayload/schema/public/checkrust/checkruntime"\nfunc TestRangeArrayInputs(t *testing.T){' +
        goCases.join('\n') +
        '}\n',
    )
    await run('go', ['test', '-p', '1', './...'], { cwd: root }).catch(
      (error: { stdout: string; stderr: string }) => {
        throw new Error(error.stdout + error.stderr, { cause: error })
      },
    )
    // Every public case decides as the server does.
    expect(mismatches).toEqual([])
    await mkdir('artifacts/check-range-arrays', { recursive: true })
    await writeFile(
      'artifacts/check-range-arrays/payload-report.json',
      JSON.stringify(
        {
          families: families.map((m) => m.identity),
          nativeInserts,
          assertions,
          nominalProfilesBeforeCopy: true,
          independentDeploymentOids: true,
          nestedDomainArrays: true,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 180000)
