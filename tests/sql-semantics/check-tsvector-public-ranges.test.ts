import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { catalogCompositeType } from '../../src/sql-semantics/composite-profiles.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { renderGoSchemaCheckArtifacts } from '../../src/codegen/go/sql/catalog-checks.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { parseConfigString } from '../../src/config/loader.js'
import { go, printGoFile, type GoExpression } from '../../src/codegen/go/ast.js'
import { goFixtureBinding } from '../../tools/check-rust/go-fixtures.js'
import { rangeGoInput, type RangeInputPayload } from '../../tools/check-rust/range-input.js'
import {
  multirangeGoInput,
  type MultirangeInputPayload,
} from '../../tools/check-rust/multirange-input.js'
import { arrayGoInput, type OwnedArrayInputPayload } from '../../tools/check-rust/array-input.js'
import {
  compositeGoInput,
  type CompositeInputPayload,
} from '../../tools/check-rust/composite-input.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
import { customRangeProfiles } from './check-custom-range-fixtures.js'
import { readRangeFixture } from './check-range-fixtures.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'
import { readRangeArrayFixture } from './check-range-array-fixtures.js'
import { readCompositeFixture } from './check-composite-fixtures.js'

const packet = 'artifacts/goal-checks/tsvector-public-ranges-active'
const context = {
  serverEncoding: 'UTF8',
  clientEncoding: 'UTF8',
  defaultCollation: 'C',
  arrayNulls: true,
} as const
const known = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const publicResult = (outcome: Outcome) =>
  outcome.kind === 'Unknown'
    ? { certain: false }
    : outcome.kind === 'Error'
      ? {
          certain: true,
          error: outcome.value.state.toString(36).toUpperCase().padStart(5, '0'),
        }
      : { certain: true, value: outcome.kind === 'Null' ? null : outcome.kind === 'True' }
const forms = {
  ordered: 'v<w',
  contained: 'm @> v',
  located: 'array_position(items,v)=-2',
  projected: '(bundle).span IS NOT DISTINCT FROM v',
  recursive: '(bundle).history[-2] IS NOT DISTINCT FROM v',
  text: 'v::text IS NOT DISTINCT FROM expected_text',
  wire: "encode(range_send(v),'hex') IS NOT DISTINCT FROM expected_wire",
  multi_wire: "encode(multirange_send(m),'hex') IS NOT DISTINCT FROM expected_multi_wire",
  missing_hash: 'hash_range(v) IS NULL',
  missing_extended_hash: 'hash_multirange_extended(m,seed) IS NULL',
}

function visitObjects(
  value: unknown,
  visitor: (value: Record<string, unknown>) => boolean,
): boolean {
  if (!value || typeof value !== 'object') return false
  if (visitor(value as Record<string, unknown>)) return true
  return Object.values(value).some((child) => visitObjects(child, visitor))
}

function changeDocument(value: unknown, change: (payload: Record<string, unknown>) => void) {
  expect(
    visitObjects(value, (node) => {
      if (!Array.isArray(node.lexemes)) return false
      change(node)
      return true
    }),
  ).toBe(true)
}

it('validates public tsvector range, array, record and nested range inputs with native output, send and missing-hash parity', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsvector-public-ranges-')),
    run = promisify(execFile)
  try {
    const definitions = `CREATE DOMAIN imported_document AS tsvector;
      CREATE TYPE document_fields AS(head tsvector,items tsvector[]);
      CREATE TYPE document_span AS RANGE(subtype=tsvector,multirange_type_name=document_ranges);
      CREATE TYPE array_span AS RANGE(subtype=tsvector[],multirange_type_name=array_ranges);
      CREATE TYPE record_span AS RANGE(subtype=document_fields,multirange_type_name=record_ranges);
      CREATE TYPE nested_span AS RANGE(subtype=document_span,multirange_type_name=nested_ranges);
      CREATE TYPE imported_span AS RANGE(subtype=imported_document,multirange_type_name=imported_ranges);`
    await pg.exec(definitions)
    const profiles = customRangeProfiles(await snapshotCatalog(pg))
    expect(profiles).toHaveLength(5)
    const columns = (index: number) => {
      const p = profiles[index]!
      return `v ${p.identity},w ${p.identity},m ${p.multirange},items ${p.identity}[],bundle window_bundle_${index},expected_text text,expected_wire text,expected_multi_wire text,seed int8,bypass bool`
    }
    const expression = (sql: string) => `CASE WHEN bypass THEN true ELSE ${sql} END`
    const tables = profiles
      .map((p, i) => {
        return `CREATE TYPE window_bundle_${i} AS(span ${p.identity},members ${p.multirange},history ${p.identity}[],document tsvector);
        CREATE TABLE owned_range_${i}(${columns(i)},${Object.entries(forms)
          .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${expression(sql)})`)
          .join(',')});`
      })
      .join('\n')
    await pg.exec(tables)
    for (const [i] of profiles.entries())
      for (const [name, sql] of Object.entries(forms))
        await pg.exec(
          `CREATE TABLE native_range_${i}_${name}(${columns(i)},CONSTRAINT rule CHECK(${expression(sql)}))`,
        )
    const catalog = await snapshotCatalog(pg),
      owners = profiles.map((_, i) => catalog.tables.find((t) => t.name === `owned_range_${i}`)!)
    const plans = owners.flatMap((table) =>
      Object.entries(forms).flatMap(([name, sql]) => {
        const constraint = table.constraints.find((c) => c.name === name)!
        return (['source', 'stored'] as const).map((origin) => ({
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: name + '_' + origin,
          },
          expression: portableCheckAtoms(
            lowerTableCheck(
              table,
              origin === 'source'
                ? { ...constraint, definition: `CHECK(${expression(sql)})` }
                : constraint,
              catalog.enums,
              catalog.domains,
              origin,
              catalog.rangeTypes,
              catalog.compositeTypeGraph,
            )!.expression,
          ),
        }))
      }),
    )
    const group = prepareCheckRustGroup(plans, context)
    for (const [i, check] of group.checks.entries())
      expect(check.kind, JSON.stringify({ plan: plans[i]!.identity, check })).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      cases: { family: number; row: Row; expected: Record<string, Outcome> }[] = [],
      references: unknown[] = []
    let nativeInserts = 0
    for (const [index, p] of profiles.entries()) {
      const bound = (text: string) =>
        p.name === 'array_span'
          ? `ARRAY['${text}'::tsvector,NULL]`
          : p.name === 'record_span'
            ? `ROW('${text}'::tsvector,ARRAY['${text}'::tsvector,NULL])::document_fields`
            : p.name === 'nested_span'
              ? `document_span('${text}'::tsvector,NULL)`
              : `'${text}'::${p.subtype}`
      const first = `${p.identity}(${bound('a')},${bound('zzzzzzzzzz')},'[)')`,
        last = `${p.identity}(${bound('bb')},NULL,'[)')`
      for (const [sample, left, right, seed] of [
        ['finite', first, last, 0n],
        ['reverse', last, first, -1n],
        ['empty', `'empty'::${p.identity}`, `'(,)'::${p.identity}`, null],
        ['empty_members', `'empty'::${p.identity}`, `'empty'::${p.identity}`, 0n],
        ['unbounded', `'(,)'::${p.identity}`, first, 1n],
        [
          'unicode',
          `${p.identity}(${bound('é:1A')},${bound('日本:1A')},'[)')`,
          `${p.identity}(${bound('日本:1A')},NULL,'[)')`,
          2n,
        ],
        ['null', `NULL::${p.identity}`, `NULL::${p.identity}`, null],
      ] as const) {
        const source = `SELECT v,w,m,items,ROW(v,m,items,'a'::tsvector)::window_bundle_${index} bundle FROM(SELECT v,w,CASE WHEN v IS NULL THEN NULL ELSE ${p.multirange}(v,w) END m,('[-2:0]='::text || ARRAY[v,NULL,w]::text)::${p.identity}[] items FROM(SELECT ${left} v,${right} w) bounds) members`
        const native = (
          await pg.query<{
            v: string | null
            w: string | null
            m: string | null
            items: string
            text: string | null
            wire: string | null
            multi_wire: string | null
          }>(
            `SELECT v::text,w::text,m::text,items::text,v::text text,encode(range_send(v),'hex') wire,encode(multirange_send(m),'hex') multi_wire FROM(${source}) candidate`,
          )
        ).rows[0]!
        const read = (text: string | null) =>
          readRangeFixture(pg, `SELECT $1::${p.identity} value`, 'value', p.rangeType, [text])
        const values = {
          v: known(await read(native.v)),
          w: known(await read(native.w)),
          m: known(await readMultirangeFixture(pg, p.multirangeType, native.m)),
          items: known(await readRangeArrayFixture(pg, p.rangeType, native.items)),
          bundle: known(
            await readCompositeFixture(
              pg,
              source,
              'bundle',
              catalogCompositeType(
                `public.window_bundle_${index}`,
                catalog.compositeTypeGraph,
                catalog.rangeTypes,
              )!,
            ),
          ),
          seed: known(seed),
        }
        for (const bypass of [false, true]) {
          const row: Row = {
              ...values,
              expected_text: known(native.text),
              expected_wire: known(native.wire),
              expected_multi_wire: known(native.multi_wire),
              bypass: known(bypass),
            },
            expected: Record<string, Outcome> = {}
          for (const [name, sql] of Object.entries(forms)) {
            const from = `FROM(${source}) candidate CROSS JOIN(SELECT $1::text expected_text,$2::text expected_wire,$3::text expected_multi_wire,$4::int8 seed,$5::bool bypass) expected`,
              parameters = [native.text, native.wire, native.multi_wire, seed, bypass]
            let value: boolean | null = null,
              state: string | undefined
            try {
              value = (
                await pg.query<{ value: boolean | null }>(
                  `SELECT ${expression(sql)} value ${from}`,
                  parameters,
                )
              ).rows[0]!.value
            } catch (error) {
              state = (error as { code: string }).code
            }
            let rejected: string | undefined
            try {
              await pg.query(
                `INSERT INTO native_range_${index}_${name} SELECT v,w,m,items,bundle,expected_text,expected_wire,expected_multi_wire,seed,bypass ${from}`,
                parameters,
              )
            } catch (error) {
              rejected = (error as { code: string }).code
            }
            expect(rejected).toBe(state ?? (value === false ? '23514' : undefined))
            nativeInserts++
            const outcome: Outcome = state
              ? { kind: 'Error', value: { state: parseInt(state, 36) } }
              : { kind: value === null ? 'Null' : value ? 'True' : 'False' }
            const deploymentIds = ['array_span', 'record_span'].includes(p.name),
              spans =
                name === 'multi_wire'
                  ? values.m.kind === 'Value'
                    ? (values.m.value as MultirangeInputPayload).ranges.flatMap((r) =>
                        r.kind === 'Value' ? [r.value] : [],
                      )
                    : []
                  : values.v.kind === 'Value'
                    ? [values.v.value as RangeInputPayload]
                    : [],
              reachedFinite = spans.some((span) =>
                span.bounds.some((bound) => bound.kind !== 'Null'),
              )
            expected[name] =
              !bypass &&
              deploymentIds &&
              reachedFinite &&
              (name === 'wire' || name === 'multi_wire')
                ? { kind: 'Unknown' }
                : outcome
            references.push({
              family: p.name,
              sample,
              name,
              bypass,
              native: outcome,
              expected: expected[name],
            })
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: `owned_range_${index}_${name}_${origin}`,
                row,
                expected: expected[name]!,
              })
          }
          cases.push({ family: index, row, expected })
        }
      }
    }
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'public-native.json'),
      JSON.stringify({ nativeInserts, fixtures: fixtures.length, references }, null, 2) + '\n',
    )
    for (const [family] of profiles.entries()) {
      const base = cases.find((c) => c.family === family)!
      const missing = structuredClone(base)
      changeDocument(missing.row.v, (node) => {
        node.nativeBytes = -1
      })
      for (const name of ['ordered', 'contained', 'located', 'projected', 'recursive'])
        missing.expected[name] = { kind: 'Unknown' }
      for (const additional of [missing]) {
        cases.push(additional)
        for (const [name, expected] of Object.entries(additional.expected))
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: `owned_range_${family}_${name}_${origin}`,
              row: additional.row,
              expected,
            })
      }
    }
    console.log(
      `native tsvector ranges: ${nativeInserts} INSERTs; checking ${fixtures.length} Rust/Go/TypeScript fixtures`,
    )
    await runCheckParity(
      root,
      'tsvectorranges',
      group,
      plans.map((p) => p.identity.owner + '_' + p.identity.constraint),
      fixtures,
    )
    console.log('tsvector range evaluator parity passed; checking public adapters')

    const ts = renderTypescriptSchemaCheckArtifacts(owners, catalog.domains, [], {
      executionContext: context,
      compositeTypeGraph: catalog.compositeTypeGraph,
      rangeTypes: catalog.rangeTypes,
    })
    const shifted = await PGlite.create()
    try {
      await shifted.exec(
        'CREATE TABLE discarded_ids(value text);DROP TABLE discarded_ids;' + definitions + tables,
      )
      const other = await snapshotCatalog(shifted)
      expect(
        (await shifted.query<{ id: number }>("SELECT 'document_span'::regtype::oid id")).rows[0]!
          .id,
      ).not.toBe(
        (await pg.query<{ id: number }>("SELECT 'document_span'::regtype::oid id")).rows[0]!.id,
      )
      expect(
        renderTypescriptSchemaCheckArtifacts(other.tables, other.domains, [], {
          executionContext: context,
          compositeTypeGraph: other.compositeTypeGraph,
          rangeTypes: other.rangeTypes,
        }),
      ).toEqual(ts)
    } finally {
      await shifted.close()
    }
    const tsRoot = join(root, 'public-ts')
    await mkdir(tsRoot)
    await writeFile(join(tsRoot, 'package.json'), '{"type":"module"}')
    await writeFile(join(tsRoot, 'checks.ts'), ts.checks)
    for (const artifact of checkTypescriptArtifacts(ts.rustFiles!)) {
      const path = join(tsRoot, 'checks-rust', artifact.path)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, artifact.content)
    }
    await run('node', [
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
      join(tsRoot, 'js'),
      join(tsRoot, 'checks.ts'),
    ]).catch((error: { stdout: string; stderr: string }) => {
      throw new Error(error.stdout + error.stderr)
    })
    const api = await import(pathToFileURL(join(tsRoot, 'js/checks.js')).href)
    const publicRow = (row: Row) =>
      Object.fromEntries(
        Object.entries(row).map(([name, value]) => [
          name,
          ['v', 'w', 'm', 'items', 'bundle'].includes(name)
            ? value
            : value.kind === 'Value'
              ? value.value
              : null,
        ]),
      )
    const evaluate = (family: number, row: unknown): Record<string, unknown> =>
      Object.fromEntries(
        api[`evaluatePublicOwnedRange${family}Checks`](row).map(
          (c: { constraint: string; result: unknown }) => [c.constraint, c.result],
        ),
      )
    for (const c of cases) {
      const input = publicRow(c.row),
        before = structuredClone(input)
      expect(evaluate(c.family, input)).toEqual(
        Object.fromEntries(
          Object.entries(c.expected).map(([name, value]) => [name, publicResult(value)]),
        ),
      )
      expect(input).toEqual(before)
    }
    for (const [family] of profiles.entries()) {
      const base = cases.find((c) => c.family === family)!
      const forged = publicRow(structuredClone(base.row))
      visitObjects(forged, (node) => {
        if (Array.isArray(node.bounds) || Array.isArray(node.ranges))
          node.support = { comparison: 1, canonical: 2 }
        return false
      })
      expect(evaluate(family, forged)).toEqual(
        Object.fromEntries(
          Object.entries(base.expected).map(([name, value]) => [name, publicResult(value)]),
        ),
      )
      for (const [field, constraint] of [
        ['v', 'ordered'],
        ['m', 'contained'],
        ['items', 'located'],
        ['bundle', 'projected'],
      ] as const)
        for (const defect of ['size', 'text', 'position']) {
          const bad = publicRow(structuredClone(base.row))
          changeDocument(bad[field], (node) => {
            if (defect === 'size') node.nativeBytes = -2
            if (defect === 'text') node.lexemes = [{ text: 'a\0', positions: [] }]
            if (defect === 'position')
              node.lexemes = [{ text: 'a', positions: [{ position: 1, weight: 4 }] }]
          })
          const before = structuredClone(bad)
          expect(evaluate(family, bad)[constraint]).toEqual({ certain: false })
          expect(bad).toEqual(before)
          expect(Object.values(evaluate(family, { ...bad, bypass: true }))).toEqual(
            Object.keys(forms).map(() => ({ certain: true, value: true })),
          )
        }
    }
    const runtime = (name: string) => go.selector(go.ident('checkruntime'), name)
    const goRoot = join(root, 'public-go'),
      generatedGo = renderGoSchemaCheckArtifacts(
        owners,
        'checks',
        catalog.domains,
        [],
        catalog,
        parseConfigString(
          'schema: schema.sql\nsql:\n  codegen:\n    go: {}\n    checks:\n      serverEncoding: UTF8\n      clientEncoding: UTF8\n      defaultCollation: C\n      arrayNulls: true\n',
        ),
        undefined,
        'tsvector-ranges',
      )
    await mkdir(goRoot)
    await writeFile(join(goRoot, 'go.mod'), 'module tsvector-ranges\n\ngo 1.25\n')
    await writeFile(join(goRoot, 'checks.go'), generatedGo.checks)
    for (const [name, source] of Object.entries(generatedGo.rustFiles!)) {
      if (!source) continue
      const path = join(
        goRoot,
        'checkrust',
        name === 'checks'
          ? 'checks.go'
          : name === 'runtime'
            ? 'checkruntime/runtime.go'
            : name === 'language'
              ? 'langruntime/runtime.go'
              : name === 'regex'
                ? 'regexengine/regex.go'
                : 'pg_catalog/operations.go',
      )
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, source)
    }
    const declarations = profiles.map((_, family) => {
      const rows = cases
        .filter((c) => c.family === family)
        .map((c) =>
          go.composite(
            go.ident(`PublicOwnedRange${family}CheckInput`),
            Object.entries(c.row).map(([name, input]) => {
              let value: GoExpression
              if (['v', 'w', 'm', 'items', 'bundle'].includes(name)) {
                if (input.kind === 'Null')
                  value = go.call(
                    runtime(
                      name === 'v' || name === 'w'
                        ? 'RangeNull'
                        : name === 'm'
                          ? 'MultirangeNull'
                          : name === 'items'
                            ? 'ArrayNull'
                            : 'CompositeNull',
                    ),
                    [],
                  )
                else if (input.kind === 'Value')
                  value =
                    name === 'v' || name === 'w'
                      ? rangeGoInput(input.value as RangeInputPayload)
                      : name === 'm'
                        ? multirangeGoInput(input.value as MultirangeInputPayload)
                        : name === 'items'
                          ? arrayGoInput(input.value as OwnedArrayInputPayload)
                          : compositeGoInput(input.value as CompositeInputPayload)
                else throw new Error('Unsupported public range state')
              } else if (input.kind === 'Null')
                value = go.call(go.ident(name === 'seed' ? 'nullInt' : 'nullStr'), [])
              else if (input.kind === 'Value')
                value = go.call(
                  go.ident(name === 'seed' ? 'intPtr' : name === 'bypass' ? 'boolPtr' : 'strPtr'),
                  [
                    name === 'seed'
                      ? go.number(input.value as bigint)
                      : name === 'bypass'
                        ? go.ident(String(input.value))
                        : go.string(String(input.value)),
                  ],
                )
              else throw new Error('Unsupported primitive state')
              return go.keyValue(
                name
                  .split('_')
                  .map((part) => part[0]!.toUpperCase() + part.slice(1))
                  .join(''),
                go.call(go.ident('KnownCheckValue'), [value]),
              )
            }),
          ),
        )
      const binding = goFixtureBinding(
        go.composite(go.slice(go.ident(`PublicOwnedRange${family}CheckInput`)), rows),
        'row',
      )
      return go.function(
        `getRows${family}`,
        [],
        [{ type: go.slice(go.ident(`PublicOwnedRange${family}CheckInput`)) }],
        [...binding.statements, go.return(binding.expression)],
      )
    })
    for (const [family, declaration] of declarations.entries())
      await writeFile(
        join(goRoot, `rows_${family}_test.go`),
        printGoFile({
          package: 'checks',
          imports: [{ path: 'tsvector-ranges/checkrust/checkruntime' }],
          declarations: [declaration],
        }),
      )
    const assertions = profiles.map((_, family) => {
      const familyCases = cases.filter((c) => c.family === family)
      return `{rows:=getRows${family}();results:=[]map[string]EvalBool{};for _,row:=range rows{before,_:=json.Marshal(row);values:=map[string]EvalBool{};for _,c:=range EvaluatePublicOwnedRange${family}Checks(row){values[c.Constraint]=c.Result};after,_:=json.Marshal(row);if !bytes.Equal(before,after){t.Fatal("mutated public row",${family})};results=append(results,values)}
      ${familyCases.flatMap((c, index) => Object.entries(c.expected).map(([name, outcome]) => `if r:=results[${index}]["${name}"];${outcome.kind === 'Unknown' ? 'r.Certain' : outcome.kind === 'Error' ? `!r.Certain||r.Value.Error!="${outcome.value.state.toString(36).toUpperCase().padStart(5, '0')}"` : outcome.kind === 'Null' ? '!r.Certain||r.Value.Valid||r.Value.Error!=""' : `!r.Certain||!r.Value.Valid||r.Value.Value!=${outcome.kind === 'True'}`}{t.Fatalf("${family}/${index}/${name}: %+v",r)}`)).join('\n')}
      row:=getRows${family}()[0];v:=row.V.V;v.Value.Support=checkruntime.RangeSupport{Comparison:1,Canonical:2};row.V=KnownCheckValue(v);for _,c:=range EvaluatePublicOwnedRange${family}Checks(row){if c.Constraint=="ordered"&&(!c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value){t.Fatal("caller support overrode compiled range",${family},c)}}
      for field:=0;field<4;field++{for defect:=0;defect<3;defect++{row:=getRows${family}()[0];var element checkruntime.ArrayElement;name:="";switch field{case 0:element=checkruntime.ArrayElement{Kind:checkruntime.ArrayElementRange,Range:row.V.V.Value};name="ordered";case 1:element=checkruntime.ArrayElement{Kind:checkruntime.ArrayElementMultirange,Multirange:row.M.V.Value};name="contained";case 2:element=checkruntime.ArrayElement{Kind:checkruntime.ArrayElementArray,Array:row.Items.V.Value};name="located";case 3:element=checkruntime.ArrayElement{Kind:checkruntime.ArrayElementComposite,Composite:row.Bundle.V.Value};name="projected"};if !corruptDocument(&element,defect){t.Fatal("no document in public fixture",${family},field)};switch field{case 0:value:=row.V.V;value.Value=element.Range;row.V=KnownCheckValue(value);case 1:value:=row.M.V;value.Value=element.Multirange;row.M=KnownCheckValue(value);case 2:value:=row.Items.V;value.Value=element.Array;row.Items=KnownCheckValue(value);case 3:value:=row.Bundle.V;value.Value=element.Composite;row.Bundle=KnownCheckValue(value)};before,_:=json.Marshal(row);for _,c:=range EvaluatePublicOwnedRange${family}Checks(row){if c.Constraint==name&&c.Result.Certain{t.Fatal("invalid nested document accepted",${family},field,defect,c)}};after,_:=json.Marshal(row);if !bytes.Equal(before,after){t.Fatal("mutated invalid public row",${family},field,defect)};row.Bypass=KnownCheckValue(boolPtr(true));for _,c:=range EvaluatePublicOwnedRange${family}Checks(row){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("invalid document defeated lazy guard",${family},field,defect,c)}}}}
      }`
    })
    await writeFile(
      join(goRoot, 'checks_test.go'),
      `package checks
import("testing";"bytes";"encoding/json";checkruntime "tsvector-ranges/checkrust/checkruntime")
func boolPtr(v bool)*bool{return &v}
func strPtr(v string)*string{return &v}
func intPtr(v int64)*int64{return &v}
func nullInt()*int64{return nil}
func nullStr()*string{return nil}
func corruptDocument(value *checkruntime.ArrayElement,defect int)bool{
switch value.Kind{
case checkruntime.ArrayElementTsvector:switch defect{case 0:value.Tsvector.NativeBytes=-2;case 1:value.Tsvector.Lexemes[0].Text="a\\x00";case 2:value.Tsvector.Lexemes[0].Positions=[]checkruntime.TsvectorPosition{{Position:1,Weight:4}}};return true
case checkruntime.ArrayElementRange:for i:=range value.Range.Bounds{if corruptDocument(&value.Range.Bounds[i],defect){return true}}
case checkruntime.ArrayElementMultirange:for i:=range value.Multirange.Ranges{member:=&value.Multirange.Ranges[i];if member.Kind==checkruntime.RangeValueValue{for j:=range member.Value.Bounds{if corruptDocument(&member.Value.Bounds[j],defect){return true}}}}
case checkruntime.ArrayElementArray:for i:=range value.Array.Elements{if corruptDocument(&value.Array.Elements[i],defect){return true}}
case checkruntime.ArrayElementComposite:for i:=range value.Composite.Fields{if corruptDocument(&value.Composite.Fields[i],defect){return true}}
};return false}
func TestPublicRanges(t *testing.T){${assertions.join('\n')}}
`,
    )
    await run('go', ['test', '-p', '1', './...'], { cwd: goRoot }).catch(
      (error: { stdout: string; stderr: string }) => {
        throw new Error(error.stdout + error.stderr)
      },
    )
    await writeFile(
      join(packet, 'public-validation.json'),
      JSON.stringify(
        {
          nativeInserts,
          fixtures: fixtures.length,
          publicRowsPerTarget: cases.length,
          malformedRowsPerPublicTarget: profiles.length * 4 * 3,
          independentCatalogs: true,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
