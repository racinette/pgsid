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
import { arrayGoInput, type OwnedArrayInputPayload } from '../../tools/check-rust/array-input.js'
import { multirangeGoInput } from '../../tools/check-rust/multirange-input.js'
import { rangeCoreSamples } from './check-range-fixtures.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'
import {
  multirangeArrayText,
  readMultirangeArrayFixture,
} from './check-multirange-array-fixtures.js'

it('validates multirange array and domain-cell profiles before copying public inputs, independently of deployment OIDs', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-multirange-array-payload-')),
    run = promisify(execFile)
  try {
    const families = Object.values(PG18_RANGE_TYPES)
    const schema = families
      .map(
        (
          m,
          i,
        ) => `CREATE DOMAIN multi_cell_${i} AS ${m.multirange};CREATE DOMAIN multi_history_${i} AS multi_cell_${i}[];
      CREATE TABLE multirange_array_payload_${i}(spans ${m.multirange}[],domains multi_cell_${i}[],histories multi_history_${i}[],head ${m.multirange},bypass boolean,
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
      'multiarraypayload/schema',
    )
    expect(goFiles.diagnostics).toEqual([])
    const other = await PGlite.create()
    try {
      await other.exec('CREATE DOMAIN unrelated_range_domain AS text;' + schema)
      const rebuilt = await snapshotCatalog(other)
      expect(rebuilt.domains.find((d) => d.name === 'multi_cell_0')!.oid).not.toBe(
        catalog.domains.find((d) => d.name === 'multi_cell_0')!.oid,
      )
      expect(
        renderTypescriptSchemaCheckArtifacts(
          rebuilt.tables.filter((t) => t.name.startsWith('multirange_array_payload_')),
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
    const fixtureFunctions = [],
      goCases: string[] = []
    let nativeInserts = 0,
      assertions = 0
    for (const [i, metadata] of families.entries()) {
      const text = '{' + rangeCoreSamples(metadata.identity).ranges[5]! + '}'
      const head = (await readMultirangeFixture(pg, metadata.multirange, text))!
      const spans = (await readMultirangeArrayFixture(
        pg,
        metadata.multirange,
        multirangeArrayText([text, null, '{}']),
      ))!
      const element = domainElementType(
        { schema: 'public', name: 'multi_cell_' + i },
        metadata.multirange,
      )
      const domains = { ...spans, elementType: element }
      const history = domainElementType(
        { schema: 'public', name: 'multi_history_' + i },
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
        metadata.multirange,
        metadata.identity,
        metadata.subtype,
        String.fromCharCode(head.elementKind),
      ])
      const evaluate = (
        value: unknown,
        domain: unknown = domains,
        nested: unknown = histories,
        bypass = false,
      ) =>
        Object.fromEntries(
          generated['evaluatePublicMultirangeArrayPayload' + i + 'Checks']({
            spans:
              value && typeof value === 'object' && 'elementKind' in value
                ? { kind: 'Value', value }
                : value,
            domains:
              domain && typeof domain === 'object' && 'elementKind' in domain
                ? { kind: 'Value', value: domain }
                : domain,
            histories:
              nested && typeof nested === 'object' && 'elementKind' in nested
                ? { kind: 'Value', value: nested }
                : nested,
            head: { kind: 'Value', value: head },
            bypass,
          }).map((c: { constraint: string; result: unknown }) => [c.constraint, c.result]),
        )
      for (const result of Object.values(evaluate(spans))) {
        expect(result).toEqual({ certain: true, value: true })
        assertions++
      }
      const firstSpan = head.ranges[0]!
      if (firstSpan.kind !== 'Value') throw new Error('Missing known member')
      const memberChange = (change: Record<string, unknown>) => ({
        ...head,
        ranges: [{ kind: 'Value', value: { ...firstSpan.value, ...change } }],
      })
      for (const changed of [
        { ...head, typeName: families[(i + 1) % families.length]!.multirange },
        { ...head, rangeType: 'wrong' },
        { ...head, elementType: 'pg_catalog.bool' },
        { ...head, elementKind: 43 },
        { ...head, ranges: [{ kind: 'Null' }] },
        memberChange({ bounds: [] }),
        memberChange({ empty: true }),
        memberChange({ lowerInclusive: 'true' }),
        memberChange({ typeName: 'wrong' }),
        memberChange({ elementType: 'wrong' }),
        memberChange({ bounds: [{ kind: 'Int4', value: 1.5 }, { kind: 'Null' }] }),
        memberChange({ bounds: [{ kind: 'Multirange', value: head }, { kind: 'Null' }] }),
      ]) {
        const bad = structuredClone(spans)
        bad.elements[0] = { kind: 'Multirange', value: changed as typeof head }
        const result = evaluate(bad, domains, histories, true)
        for (const name of ['first', 'shape', 'present']) {
          expect(result[name], metadata.multirange + ':' + name).toMatchObject({ certain: false })
          assertions++
        }
        expect(result.guarded).toEqual({ certain: true, value: true })
      }
      for (const value of [
        undefined,
        '{empty}',
        { kind: 'Unknown' },
        { kind: 'Value', value: { ...spans, elementType: 'wrong' } },
        { kind: 'Value', value: { ...spans, elementKind: 2 } },
      ]) {
        const result = evaluate(value, domains, histories, true)
        for (const name of ['first', 'shape', 'present']) {
          expect(result[name]).toMatchObject({ certain: false })
          assertions++
        }
        expect(result.guarded).toEqual({ certain: true, value: true })
      }
      const partial = structuredClone(spans)
      partial.elements[0] = { kind: 'Unknown' }
      expect(evaluate(partial).first).toMatchObject({ certain: false })
      expect(evaluate(partial).shape).toEqual({ certain: true, value: true })
      const partialBound = structuredClone(spans)
      const first = partialBound.elements[0]
      if (first?.kind !== 'Multirange') throw new Error('Missing range')
      const member = first.value.ranges[0]!
      if (member.kind !== 'Value') throw new Error('Missing member')
      member.value.bounds[0] = { kind: 'Unknown' }
      expect(evaluate(partialBound).first).toMatchObject({ certain: false })
      expect(evaluate(partialBound).shape).toEqual({ certain: true, value: true })
      const badDomain = { ...domains, elementType: metadata.multirange }
      expect(evaluate(spans, badDomain).domain_cell).toMatchObject({ certain: false })
      expect(evaluate(spans, badDomain).domain_guarded).toMatchObject({ certain: false })
      const badNested = structuredClone(histories)
      const inner = badNested.elements[0]
      if (inner?.kind !== 'Array') throw new Error('Missing nested array')
      inner.value.elementType = metadata.multirange
      expect(evaluate(spans, domains, badNested).nested_cell).toMatchObject({ certain: false })
      expect(evaluate(spans, domains, badNested).nested_guarded).toMatchObject({ certain: false })
      for (const value of [null, { kind: 'Null' }]) {
        const result = evaluate(value)
        expect(result.first).toEqual({ certain: true, value: false })
        expect(result.shape).toEqual({ certain: true, value: null })
        expect(result.present).toEqual({ certain: true, value: false })
      }
      const error = evaluate(
        { kind: 'Error', value: { state: parseInt('22012', 36) } },
        domains,
        histories,
        true,
      )
      for (const name of ['first', 'shape', 'present'])
        expect(error[name]).toEqual({ certain: true, error: '22012' })
      expect(error.guarded).toEqual({ certain: true, value: true })
      await pg.query(
        `INSERT INTO multirange_array_payload_${i} VALUES($1,$2,ARRAY[$4::multi_history_${i}],$3,false)`,
        [
          multirangeArrayText([text, null, '{}']),
          multirangeArrayText([text, null, '{}']),
          text,
          multirangeArrayText([text, null, '{}']),
        ],
      )
      nativeInserts++
      await expect(
        pg.query(`INSERT INTO multirange_array_payload_${i} VALUES('{"{}"}',NULL,NULL,$1,false)`, [
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
            `multirangeArray${name}${i}`,
            [],
            [{ type: go.selector(go.ident('checkruntime'), 'ArrayValue') }],
            [go.return(arrayGoInput(payload))],
          ),
        )
      fixtureFunctions.push(
        go.function(
          `multirangeArrayHead${i}`,
          [],
          [{ type: go.selector(go.ident('checkruntime'), 'MultirangeValue') }],
          [go.return(multirangeGoInput(head))],
        ),
      )
      goCases.push(`{
 skip:=false;value:=multirangeArraySpans${i}();domains:=multirangeArrayDomains${i}();histories:=multirangeArrayHistories${i}();head:=multirangeArrayHead${i}()
 input:=PublicMultirangeArrayPayload${i}CheckInput{Spans:KnownCheckValue(value),Domains:KnownCheckValue(domains),Histories:KnownCheckValue(histories),Head:KnownCheckValue(head),Bypass:KnownCheckValue(&skip)}
 for _,c:=range EvaluatePublicMultirangeArrayPayload${i}Checks(input){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("valid range array",c)}}
 skip=true;input.Bypass=KnownCheckValue(&skip)
 for mode:=0;mode<6;mode++ {
  bad:=checkruntime.CopyArrayValue(value)
  if mode==0 {bad.Value.Elements[0].Multirange.TypeName="wrong"};if mode==1 {bad.Value.Elements[0].Multirange.ElementType="wrong"};if mode==2 {bad.Value.Elements[0].Multirange.ElementKind=43};if mode==3 {bad.Value.Elements[0].Multirange.Ranges[0].Value.Bounds=nil};if mode==4 {bad.Value.Elements[0].Multirange.Ranges[0].Value.Empty=true};if mode==5 {bad.Value.Elements[0].Multirange.Ranges[0].Value.Bounds[0]=checkruntime.ArrayElement{Kind:255}}
  input.Spans=KnownCheckValue(bad)
  for _,c:=range EvaluatePublicMultirangeArrayPayload${i}Checks(input){if c.Constraint=="guarded"{if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("lazy range array",c)}}else if c.Constraint=="first"||c.Constraint=="shape"||c.Constraint=="present"{if c.Result.Certain{t.Fatal("invalid range array",mode,c)}}}
 }
 input.Spans=KnownCheckValue(value);badDomains:=checkruntime.CopyArrayValue(domains);badDomains.Value.ElementType="wrong";input.Domains=KnownCheckValue(badDomains)
 for _,c:=range EvaluatePublicMultirangeArrayPayload${i}Checks(input){if c.Constraint=="domain_cell"&&c.Result.Certain{t.Fatal("domain identity",c)}}
 input.Domains=KnownCheckValue(domains);badHistory:=checkruntime.CopyArrayValue(histories);badHistory.Value.Elements[0].Array.ElementType="wrong";input.Histories=KnownCheckValue(badHistory)
 for _,c:=range EvaluatePublicMultirangeArrayPayload${i}Checks(input){if c.Constraint=="nested_cell"&&c.Result.Certain{t.Fatal("nested identity",c)}}
}`)
    }
    await writeFile(join(root, 'go.mod'), 'module multiarraypayload\n\ngo 1.25\n')
    await writeFile(
      join(root, 'schema/public/array_fixtures_test.go'),
      printGoFile({
        package: 'public',
        imports: [
          { alias: 'checkruntime', path: 'multiarraypayload/schema/public/checkrust/checkruntime' },
        ],
        declarations: fixtureFunctions,
      }),
    )
    await writeFile(
      join(root, 'schema/public/array_test.go'),
      'package public\nimport "testing"\nimport checkruntime "multiarraypayload/schema/public/checkrust/checkruntime"\nfunc TestMultirangeArrayInputs(t *testing.T){' +
        goCases.join('\n') +
        '}\n',
    )
    await run('go', ['test', '-p', '1', './...'], { cwd: root }).catch(
      (error: { stdout: string; stderr: string }) => {
        throw new Error(error.stdout + error.stderr, { cause: error })
      },
    )
    await mkdir('artifacts/check-multirange-arrays', { recursive: true })
    await writeFile(
      'artifacts/check-multirange-arrays/payload-report.json',
      JSON.stringify(
        {
          families: families.map((m) => m.multirange),
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
