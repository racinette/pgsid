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
import { go, printGoFile, type GoDeclaration } from '../../src/codegen/go/ast.js'
import { rangeGoInput, rangeGoCell } from '../../tools/check-rust/range-input.js'
import { arrayGoInput } from '../../tools/check-rust/array-input.js'
import { multirangeGoInput } from '../../tools/check-rust/multirange-input.js'
import { customRangeProfiles } from './check-custom-range-fixtures.js'
import {
  scalarRangeBackends,
  scalarRangeText,
  invalidScalarRangeBounds,
} from './check-scalar-range-fixtures.js'
import { readRangeFixture } from './check-range-fixtures.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'
import { rangeArrayText, readRangeArrayFixture } from './check-range-array-fixtures.js'

it('validates public scalar range payloads, compiled support and snapshots independently of catalog OIDs in Go and TypeScript', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-scalar-range-payload-')),
    run = promisify(execFile)
  try {
    let schema =
      'CREATE SCHEMA "Scalar.Public";' +
      scalarRangeBackends
        .map(
          (p, i) =>
            `CREATE TYPE "Scalar.Public".span_${i} AS RANGE(subtype=${p.type},multirange_type_name=scalar_public_set_${i});`,
        )
        .join('\n')
    await pg.exec(schema)
    const profiles = customRangeProfiles(await snapshotCatalog(pg))
    const tables = profiles
      .map((p) => {
        const index = Number(p.name.slice('span_'.length))
        return `CREATE TABLE scalar_payload_${index}(v ${p.identity},w ${p.identity},m ${p.multirange},items ${p.identity}[],bypass bool,
        CONSTRAINT range_order CHECK(CASE WHEN bypass THEN true ELSE v<w END),
        CONSTRAINT multi_contains CHECK(CASE WHEN bypass THEN true ELSE m @> v END),
        CONSTRAINT array_slot CHECK(CASE WHEN bypass THEN true ELSE array_position(items,v)=-2 END));`
      })
      .join('\n')
    schema += '\n' + tables
    await pg.exec(tables)
    const catalog = await snapshotCatalog(pg),
      context = {
        defaultCollation: 'C' as const,
        serverEncoding: 'UTF8' as const,
        nativeByteOrder: 'little' as const,
      }
    const ts = renderTypescriptSchemaCheckArtifacts(
      catalog.tables,
      catalog.domains,
      catalog.domains,
      { enums: catalog.enums, rangeTypes: catalog.rangeTypes, executionContext: context },
    )
    const shifted = await PGlite.create()
    try {
      await shifted.exec(
        'CREATE TABLE discarded_ids(value text);DROP TABLE discarded_ids;' + schema,
      )
      const other = await snapshotCatalog(shifted)
      expect(
        (
          await shifted.query<{ value: string }>(
            "SELECT 'public.scalar_payload_0'::regclass::oid::text value",
          )
        ).rows[0]!.value,
      ).not.toBe(
        (
          await pg.query<{ value: string }>(
            "SELECT 'public.scalar_payload_0'::regclass::oid::text value",
          )
        ).rows[0]!.value,
      )
      expect(
        renderTypescriptSchemaCheckArtifacts(other.tables, other.domains, other.domains, {
          enums: other.enums,
          rangeTypes: other.rangeTypes,
          executionContext: context,
        }),
      ).toEqual(ts)
    } finally {
      await shifted.close()
    }
    const generatedGo = renderGoSchemaArtifacts(
      catalog,
      parseConfigString(
        'schema: schema.sql\nsql:\n  codegen:\n    checks: {defaultCollation: C, serverEncoding: UTF8, nativeByteOrder: little}\n    go:\n      schema: {outDir: schema}\n',
      ),
      {},
      join(root, 'schema'),
      'scalarpayload/schema',
    )
    expect(generatedGo.diagnostics).toEqual([])
    await writeFile(join(root, 'package.json'), '{"type":"module"}\n')
    await writeFile(join(root, 'checks.ts'), ts.checks)
    for (const artifact of checkTypescriptArtifacts(ts.rustFiles!)) {
      const path = join(root, 'checks-rust', artifact.path)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, artifact.content)
    }
    for (const artifact of generatedGo.artifacts) {
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
    type Result = { certain: boolean; value?: boolean | null; error?: string }
    const map = (results: { constraint: string; result: Result }[]): Record<string, Result> =>
      Object.fromEntries(results.map((r) => [r.constraint, r.result]))
    const declarations: GoDeclaration[] = [],
      checks: string[] = []
    let nativeInserts = 0
    for (const profile of profiles) {
      const index = Number(profile.name.slice('span_'.length)),
        backend = scalarRangeBackends[index]!,
        [a, b, c] = backend.values
      let first = scalarRangeText(a, b),
        last = scalarRangeText(b, c)
      if (backend.kind === 31) {
        first = (
          await pg.query<{ value: string }>(
            `SELECT "Scalar.Public".span_${index}((-1)::money,0::money,'[]')::text value`,
          )
        ).rows[0]!.value
        last = (
          await pg.query<{ value: string }>(
            `SELECT "Scalar.Public".span_${index}(0::money,2::money,'[]')::text value`,
          )
        ).rows[0]!.value
      }
      const v = await readRangeFixture(
          pg,
          `SELECT $1::${profile.identity} span`,
          'span',
          profile.rangeType,
          [first],
        ),
        w = await readRangeFixture(
          pg,
          `SELECT $1::${profile.identity} span`,
          'span',
          profile.rangeType,
          [last],
        ),
        multi = `{${first},${last}}`,
        array = rangeArrayText([first, null, last], -2),
        m = await readMultirangeFixture(pg, profile.multirangeType, multi),
        items = await readRangeArrayFixture(pg, profile.rangeType, array)
      expect(v).not.toBeNull()
      expect(w).not.toBeNull()
      expect(m).not.toBeNull()
      expect(items).not.toBeNull()
      for (const forge of [false, true]) {
        const support = forge
            ? { comparison: backend.kind, canonical: 0 }
            : { comparison: 0, canonical: 0 },
          row = {
            v: { kind: 'Value', value: { ...structuredClone(v!), support } },
            w: { kind: 'Value', value: { ...structuredClone(w!), support } },
            m: { kind: 'Value', value: { ...structuredClone(m!), support } },
            items: { kind: 'Value', value: structuredClone(items!) },
            bypass: false,
          }
        for (const member of row.m.value.ranges)
          if (member.kind === 'Value') member.value.support = support
        for (const item of row.items.value.elements)
          if (item.kind === 'Range') item.value.support = support
        const before = structuredClone(row),
          evaluate = generated[`evaluatePublicScalarPayload${index}Checks`],
          result = map(evaluate(row))
        for (const r of Object.values(result)) expect(r).toEqual({ certain: true, value: true })
        expect(row).toEqual(before)
        expect(map(evaluate({ ...row, v: row.w, w: row.v })).range_order).toEqual({
          certain: true,
          value: false,
        })
        const bad = structuredClone(row)
        Object.assign(
          bad.v.value.bounds[0]!,
          backend.kind === 8
            ? { kind: 'Int4', value: 0 }
            : { kind: 'Text', value: 'wrong carrier' },
        )
        expect(map(evaluate(bad)).range_order).toMatchObject({ certain: false })
        for (const r of Object.values(map(evaluate({ ...bad, bypass: true }))))
          expect(r).toEqual({ certain: true, value: true })
        const nominal = structuredClone(row)
        nominal.v.value.typeName = 'pg_catalog.int4range'
        expect(map(evaluate(nominal)).range_order).toMatchObject({ certain: false })
        for (const bound of invalidScalarRangeBounds(
          row.v.value.bounds[0]!,
          backend.type === 'pg_catalog.cidr',
        )) {
          const malformed = structuredClone(row)
          malformed.v.value.bounds[0] = bound
          expect(map(evaluate(malformed)).range_order).toMatchObject({ certain: false })
          for (const r of Object.values(map(evaluate({ ...malformed, bypass: true }))))
            expect(r).toEqual({ certain: true, value: true })
          expect(row).toEqual(before)
        }
        for (const r of Object.values(
          map(evaluate({ ...row, v: null, w: null, m: null, items: null })),
        ))
          expect(r).toEqual({ certain: true, value: null })
      }
      await pg.query(`INSERT INTO scalar_payload_${index} VALUES($1,$2,$3,$4,false)`, [
        first,
        last,
        multi,
        array,
      ])
      nativeInserts++
      await expect(
        pg.query(`INSERT INTO scalar_payload_${index} VALUES($1,$2,$3,$4,false)`, [
          last,
          first,
          multi,
          array,
        ]),
      ).rejects.toMatchObject({ code: '23514' })
      nativeInserts++
      const inputType = `PublicScalarPayload${index}CheckInput`,
        known = (value: ReturnType<typeof go.ident>) =>
          go.call(go.ident('KnownCheckValue'), [value])
      declarations.push({
        kind: 'function',
        name: `scalarFixture${index}`,
        parameters: [],
        results: [{ type: go.ident(inputType) }],
        body: [
          {
            kind: 'assign',
            targets: [go.ident('bypass')],
            expressions: [go.ident('false')],
            operator: ':=',
          },
          {
            kind: 'return',
            expressions: [
              go.composite(go.ident(inputType), [
                go.keyValue('V', known(rangeGoInput(v!))),
                go.keyValue('W', known(rangeGoInput(w!))),
                go.keyValue('M', known(multirangeGoInput(m!))),
                go.keyValue('Items', known(arrayGoInput(items!))),
                go.keyValue('Bypass', known(go.address(go.ident('bypass')))),
              ]),
            ],
          },
        ],
      })
      for (const [badIndex, bound] of invalidScalarRangeBounds(
        v!.bounds[0]!,
        backend.type === 'pg_catalog.cidr',
      ).entries()) {
        declarations.push({
          kind: 'function',
          name: `scalarInvalid${index}_${badIndex}`,
          parameters: [],
          results: [{ type: go.selector(go.ident('checkruntime'), 'ArrayElement') }],
          body: [{ kind: 'return', expressions: [rangeGoCell(bound)] }],
        })
        checks.push(`{
          row:=scalarFixture${index}();bad:=checkruntime.CopyRangeValue(row.V.V);bad.Value.Bounds[0]=scalarInvalid${index}_${badIndex}();row.V=KnownCheckValue(bad)
          for _,c:=range EvaluatePublicScalarPayload${index}Checks(row){if c.Constraint=="range_order"&&c.Result.Certain{t.Fatal(${index},${badIndex},"invalid bound",c)}}
          skip:=true;row.Bypass=KnownCheckValue(&skip);for _,c:=range EvaluatePublicScalarPayload${index}Checks(row){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal(${index},${badIndex},"skipped invalid bound",c)}}
        }`)
      }
      checks.push(`{
        row:=scalarFixture${index}();for _,c:=range EvaluatePublicScalarPayload${index}Checks(row){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal(${index},"known",c)}}
        original:=checkruntime.CopyRangeValue(row.V.V);bad:=checkruntime.CopyRangeValue(original);bad.Value.Bounds[0]=checkruntime.ArrayElement{Kind:${backend.kind === 8 ? 'checkruntime.ArrayElementInt4,Int4:0' : 'checkruntime.ArrayElementText,Text:"wrong carrier"'}};row.V=KnownCheckValue(bad)
        for _,c:=range EvaluatePublicScalarPayload${index}Checks(row){if c.Constraint=="range_order"&&c.Result.Certain{t.Fatal(${index},"malformed",c)}}
        skip:=true;row.Bypass=KnownCheckValue(&skip);for _,c:=range EvaluatePublicScalarPayload${index}Checks(row){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal(${index},"skip",c)}}
        row=scalarFixture${index}();row.V,row.W=row.W,row.V;for _,c:=range EvaluatePublicScalarPayload${index}Checks(row){if c.Constraint=="range_order"&&(!c.Result.Certain||!c.Result.Value.Valid||c.Result.Value.Value){t.Fatal(${index},"wrong order",c)}}
        row=scalarFixture${index}();row.V=KnownCheckValue(checkruntime.RangeNull());row.W=KnownCheckValue(checkruntime.RangeNull());row.M=KnownCheckValue(checkruntime.MultirangeNull());row.Items=KnownCheckValue(checkruntime.ArrayNull());for _,c:=range EvaluatePublicScalarPayload${index}Checks(row){if !c.Result.Certain||c.Result.Value.Valid||c.Result.Value.Error!=""{t.Fatal(${index},"null",c)}}
      }`)
    }
    await writeFile(
      join(root, 'schema/public/scalar_fixture_test.go'),
      printGoFile({
        package: 'public',
        imports: [
          { alias: 'checkruntime', path: 'scalarpayload/schema/public/checkrust/checkruntime' },
        ],
        declarations,
      }),
    )
    await writeFile(
      join(root, 'schema/public/scalar_payload_test.go'),
      `package public\nimport("testing";checkruntime "scalarpayload/schema/public/checkrust/checkruntime")\nfunc TestScalarPayloads(t *testing.T){${checks.join('\n')}}\n`,
    )
    await writeFile(join(root, 'go.mod'), 'module scalarpayload\n\ngo 1.25\n')
    await run('go', ['test', '-p', '1', './...'], { cwd: root }).catch(
      (error: { stdout: string; stderr: string }) => {
        throw new Error(error.stdout + error.stderr, { cause: error })
      },
    )
    await mkdir('artifacts/scalar-range-payload', { recursive: true })
    await writeFile(
      'artifacts/scalar-range-payload/report.json',
      JSON.stringify(
        { profiles: profiles.length, nativeInserts, independentCatalogs: true },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
