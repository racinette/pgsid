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
import {
  rangeGoInput,
  rangeGoCell,
  rangeTypescriptInput,
  type RangeInputPayload,
} from '../../tools/check-rust/range-input.js'
import { arrayGoInput, arrayTypescriptInput } from '../../tools/check-rust/array-input.js'
import {
  multirangeGoInput,
  multirangeTypescriptInput,
  type MultirangeInputPayload,
} from '../../tools/check-rust/multirange-input.js'
import { serverCheckResults } from '../support/check-server-results.js'
import { customRangeProfiles } from './check-custom-range-fixtures.js'
import {
  scalarRangeBackends,
  scalarRangeText,
  invalidScalarRangeBounds,
} from './check-scalar-range-fixtures.js'
import { readRangeFixture } from './check-range-fixtures.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'
import { rangeArrayText, readRangeArrayFixture } from './check-range-array-fixtures.js'
import { internalCheckRows } from '../support/check-entries.js'

// Each subtype's three sample values in their public shapes, in the order of the backend fixtures.
const publicScalars = {
  'pg_catalog.int2': [-32768, 0, 32767],
  'pg_catalog.bool': [false, true, true],
  'pg_catalog.inet': ['10.0.0.0/8', '10.0.0.1/8', '::1'],
  'pg_catalog."bit"': ['', '01', '1'],
  'pg_catalog.varbit': ['', '01', '1'],
  'pg_catalog.bytea': [new Uint8Array([0]), new Uint8Array([0, 255]), new Uint8Array([255])],
  'pg_catalog.macaddr': ['00:00:00:00:00:00', '08:00:2b:01:02:03', 'ff:ff:ff:ff:ff:ff'],
  'pg_catalog.macaddr8': [
    '00:00:00:00:00:00:00:00',
    '08:00:2b:01:02:03:04:05',
    'ff:ff:ff:ff:ff:ff:ff:ff',
  ],
  'pg_catalog.uuid': [
    '00000000-0000-0000-0000-000000000000',
    '80000000-0000-0000-0000-000000000000',
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
  ],
  'pg_catalog.float4': [-0, 0, 3],
  'pg_catalog.float8': [-0, 0, 3],
  'pg_catalog."time"': [
    { microseconds: 0 },
    { microseconds: 45296123456 },
    { microseconds: 86400000000 },
  ],
  'pg_catalog.timetz': [
    { microseconds: 0, offsetSeconds: 0 },
    { microseconds: 3600000000, offsetSeconds: 0 },
    { microseconds: 0, offsetSeconds: -7200 },
  ],
  'pg_catalog."interval"': [
    { months: 0, days: 0, microseconds: 0n },
    { months: 1, days: 0, microseconds: 0n },
    { months: 0, days: 60, microseconds: 0n },
  ],
  'pg_catalog.money': [],
  'pg_catalog."char"': ['', 'A', '\\377'],
  'pg_catalog.oid': [0, 2147483648, 4294967295],
  'pg_catalog.xid8': [0n, 9223372036854775808n, 18446744073709551615n],
  'pg_catalog.pg_lsn': ['0/0', '80000000/0', 'FFFFFFFF/FFFFFFFF'],
  'pg_catalog.tid': ['(0,0)', '(2147483648,1)', '(4294967295,65535)'],
  'pg_catalog.cidr': ['10.0.0.0/8', '10.0.0.1/32', '::1/128'],
  'pg_catalog."varchar"': ['alpha ', 'beta', 'zeta  '],
  'pg_catalog.bpchar': ['alpha ', 'beta  ', 'zeta '],
  'pg_catalog.name': ['alpha ', 'beta', 'zeta '],
  ...Object.fromEntries(
    scalarRangeBackends
      .filter((p) => p.type.startsWith('pg_catalog.reg'))
      .map((p) => [p.type, ['0', '2147483648', '4294967295']]),
  ),
  'pg_catalog.jsonb': [{ a: [-1, null] }, { a: [0, null] }, { a: [1.23, null] }],
} as Record<string, readonly unknown[]>

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
        // Money bounds are the server's text, read under the declared monetary locale.
        moneyLocale: 'C' as const,
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
    const runtime = await import(pathToFileURL(join(root, 'js/checks-rust/checks.js')).href)
    const internal = internalCheckRows(ts.checks, runtime)
    const True = { kind: 'True' }
    const undecided = (outcome: unknown, label?: string) =>
      expect(['Unknown', 'Unimplemented'], label).toContain((outcome as { kind: string }).kind)
    const span = (lower: unknown, upper: unknown) => ({
      empty: false,
      lower: { value: lower, inclusive: true },
      upper: { value: upper, inclusive: true },
    })
    // Money is the server's text under its monetary locale.
    const moneyBounds = async (first: string, last: string) => {
      const index = scalarRangeBackends.findIndex((p) => p.kind === 31)
      const bounds = async (text: string) =>
        (
          await pg.query<{ lower: string; upper: string }>(
            `SELECT lower($1::"Scalar.Public".span_${index})::text AS lower, upper($1::"Scalar.Public".span_${index})::text AS upper`,
            [text],
          )
        ).rows[0]!
      const [low, high] = [await bounds(first), await bounds(last)]
      return [low.lower, low.upper, high.upper] as const
    }
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
      // Public bounds take the subtype's own shape; a public array always starts at 1.
      const [pa, pb, pc] =
        backend.kind === 31 ? await moneyBounds(first, last) : publicScalars[backend.type]!
      const publicRow = {
          v: span(pa, pb),
          w: span(pb, pc),
          m: [span(pa, pb), span(pb, pc)],
          items: [span(pa, pb), null, span(pb, pc)],
          bypass: false,
        },
        publicText = {
          v: first,
          w: last,
          m: multi,
          items: rangeArrayText([first, null, last]),
          bypass: 'false',
        },
        evaluate = generated[`evaluatePublicScalarPayload${index}Checks`]
      const compare = async (row: typeof publicRow, text: typeof publicText) => {
        const shown = `${backend.type} ${JSON.stringify(row, (_key, item) =>
          typeof item === 'bigint' ? `${item}n` : item instanceof Uint8Array ? [...item] : item,
        )}`
        expect.soft({ shown, results: map(evaluate(row)) }).toEqual({
          shown,
          results: await serverCheckResults(pg, `scalar_payload_${index}`, text),
        })
      }
      const before = structuredClone(publicRow)
      await compare(publicRow, publicText)
      expect(publicRow).toEqual(before)
      await compare(
        { ...publicRow, v: publicRow.w, w: publicRow.v },
        { ...publicText, v: last, w: first },
      )
      await compare({ ...publicRow, bypass: true }, { ...publicText, bypass: 'true' })
      for (const r of Object.values(
        map(evaluate({ ...publicRow, v: null, w: null, m: null, items: null })),
      ))
        expect(r).toEqual({ certain: true, value: null })
      // A bound of another shape is a type error, as are payloads.
      const wrong =
        backend.type === 'pg_catalog.jsonb' ? 1n : typeof pa === 'string' ? 0 : 'wrong carrier'
      expect
        .soft(() => evaluate({ ...publicRow, v: span(wrong, pb) }), backend.type)
        .toThrow(TypeError)
      expect(() => evaluate({ ...publicRow, v: { kind: 'Value', value: v } })).toThrow(TypeError)
      expect(() => evaluate({ ...publicRow, items: { kind: 'Value', value: items } })).toThrow(
        TypeError,
      )
      // Stored values go to the evaluator entries directly: an array starting at -2, nominal
      // identities other than the column's, and bound bits the input syntax cannot produce.
      const range = (payload: RangeInputPayload): unknown =>
          runtime.makeCoercedRangeValue(rangeTypescriptInput(payload, runtime)),
        multirange = (payload: MultirangeInputPayload): unknown =>
          runtime.makeCoercedMultirangeValue(multirangeTypescriptInput(payload, runtime)),
        stored = {
          v: range(v!),
          w: range(w!),
          m: multirange(m!),
          items: runtime.makeArrayValue(arrayTypescriptInput(items!, runtime)),
          bypass: runtime.makeBoolValue(false),
        },
        owner = `public.scalar_payload_${index}`
      const allTrue = { range_order: True, multi_contains: True, array_slot: True }
      expect(internal(owner, stored)).toEqual(allTrue)
      expect(internal(owner, { ...stored, v: stored.w, w: stored.v }).range_order).toEqual({
        kind: 'False',
      })
      // Support other than the type's own never decides a comparison wrongly.
      for (const support of [
        { comparison: backend.kind, canonical: 0 },
        { comparison: 0, canonical: 0 },
      ]) {
        const forged = internal(owner, {
          ...stored,
          v: range({ ...v!, support }),
          w: range({ ...w!, support }),
          m: multirange({
            ...m!,
            support,
            ranges: m!.ranges.map((member) =>
              member.kind === 'Value' ? { ...member, value: { ...member.value, support } } : member,
            ),
          }),
        })
        for (const [name, outcome] of Object.entries(forged))
          expect(['True', 'Unknown', 'Unimplemented'], name).toContain(
            (outcome as { kind: string }).kind,
          )
      }
      undecided(
        internal(owner, { ...stored, v: range({ ...v!, typeName: 'pg_catalog.int4range' }) })
          .range_order,
      )
      for (const bound of invalidScalarRangeBounds(
        v!.bounds[0]!,
        backend.type === 'pg_catalog.cidr',
      )) {
        const malformed = structuredClone(v!)
        malformed.bounds[0] = bound
        const label = JSON.stringify(bound, (_key, item) =>
          typeof item === 'bigint' ? String(item) : item,
        )
        undecided(internal(owner, { ...stored, v: range(malformed) }).range_order, label)
        expect(
          internal(owner, { ...stored, v: range(malformed), bypass: runtime.makeBoolValue(true) }),
          label,
        ).toEqual(allTrue)
      }
      for (const r of Object.values(
        internal(owner, {
          ...stored,
          v: runtime.rangeNull(),
          w: runtime.rangeNull(),
          m: runtime.multirangeNull(),
          items: runtime.arrayNull(),
        }),
      ))
        expect(r).toEqual({ kind: 'Null' })
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
          for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicScalarPayload${index}Checks(row); if e != nil {return nil}; return r}(){if c.Constraint=="range_order"&&c.Result.Certain{t.Fatal(${index},${badIndex},"invalid bound",c)}}
          skip:=true;row.Bypass=KnownCheckValue(&skip);for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicScalarPayload${index}Checks(row); if e != nil {return nil}; return r}(){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal(${index},${badIndex},"skipped invalid bound",c)}}
        }`)
      }
      checks.push(`{
        row:=scalarFixture${index}();for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicScalarPayload${index}Checks(row); if e != nil {panic(e)}; return r}(){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal(${index},"known",c)}}
        original:=checkruntime.CopyRangeValue(row.V.V);bad:=checkruntime.CopyRangeValue(original);bad.Value.Bounds[0]=checkruntime.ArrayElement{Kind:${backend.kind === 8 ? 'checkruntime.ArrayElementInt4,Int4:0' : 'checkruntime.ArrayElementText,Text:"wrong carrier"'}};row.V=KnownCheckValue(bad)
        for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicScalarPayload${index}Checks(row); if e != nil {return nil}; return r}(){if c.Constraint=="range_order"&&c.Result.Certain{t.Fatal(${index},"malformed",c)}}
        skip:=true;row.Bypass=KnownCheckValue(&skip);for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicScalarPayload${index}Checks(row); if e != nil {return nil}; return r}(){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal(${index},"skip",c)}}
        row=scalarFixture${index}();row.V,row.W=row.W,row.V;for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicScalarPayload${index}Checks(row); if e != nil {panic(e)}; return r}(){if c.Constraint=="range_order"&&(!c.Result.Certain||!c.Result.Value.Valid||c.Result.Value.Value){t.Fatal(${index},"wrong order",c)}}
        row=scalarFixture${index}();row.V=KnownCheckValue(checkruntime.RangeNull());row.W=KnownCheckValue(checkruntime.RangeNull());row.M=KnownCheckValue(checkruntime.MultirangeNull());row.Items=KnownCheckValue(checkruntime.ArrayNull());for _,c:=range func() []CheckEvaluation {r, e := EvaluatePublicScalarPayload${index}Checks(row); if e != nil {panic(e)}; return r}(){if !c.Result.Certain||c.Result.Value.Valid||c.Result.Value.Error!=""{t.Fatal(${index},"null",c)}}
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
