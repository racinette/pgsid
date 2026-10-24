import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile, readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { renderGoSchemaCheckArtifacts } from '../../src/codegen/go/sql/catalog-checks.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { parseConfigString } from '../../src/config/loader.js'
import { buildProject } from '../../src/project-runtime.js'
import {
  catalogCompositeType,
  compositeProfile,
  compositeFieldType,
} from '../../src/sql-semantics/composite-profiles.js'
import { arrayLikeElementType } from '../../src/sql-semantics/expressions.js'
import { arrayElementIdentity } from '../../src/codegen/shared/check-array-types.js'
import {
  compositeGoInput,
  type CompositeInputPayload,
} from '../../tools/check-rust/composite-input.js'
import { go, printGoFile } from '../../src/codegen/go/ast.js'

it('preserves ordered ACL domain casts, array element checks, NULL rules and lazy branches in every target', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-aclitem-domains-')),
    packet = 'artifacts/goal-checks/aclitem-integration-active'
  const expressions: Record<string, string> = {
    checked: 'item::nonzero_acl IS NULL',
    required: 'hash_aclitem(item::required_acl)=recorded_hash',
    arithmetic: 'item::fraction_acl IS NOT DISTINCT FROM item',
    elements: 'cardinality(ARRAY[item,other]::nonzero_acl[])=2',
    required_element: 'cardinality(ARRAY[item,NULL::aclitem]::required_acl[])=2',
    coalesced: 'COALESCE(item::required_acl,other)::aclitem IS NOT DISTINCT FROM item',
    selected:
      '(CASE WHEN take_first THEN item::nonzero_acl ELSE other::nonzero_acl END) IS NOT NULL',
    common_cast: '(CASE WHEN take_first THEN item ELSE other END)::nonzero_acl IS NOT NULL',
  }
  const known = (v: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
    v === null ? { kind: 'Null' } : { kind: 'Value', value: v }
  try {
    await pg.exec(
      'CREATE DOMAIN nonzero_acl AS aclitem CHECK(hash_aclitem(VALUE)<>0);CREATE DOMAIN required_acl AS nonzero_acl NOT NULL;CREATE DOMAIN fraction_acl AS aclitem CHECK(1/(hash_aclitem(VALUE)-1)>0)',
    )
    for (const [name, sql] of Object.entries(expressions))
      await pg.exec(
        `CREATE TABLE acl_domain_${name}(item aclitem,other aclitem,recorded_hash int,take_first boolean,bypass boolean,CONSTRAINT rule CHECK(CASE WHEN bypass THEN true ELSE ${sql} END))`,
      )
    await pg.exec(
      'CREATE TEMP TABLE acl_domain_input(item aclitem,other aclitem,recorded_hash int,take_first boolean,bypass boolean)',
    )
    const catalog = await snapshotCatalog(pg),
      checks = Object.entries(expressions).flatMap(([name, sql]) => {
        const table = catalog.tables.find((t) => t.name === 'acl_domain_' + name)!,
          c = table.constraints[0]!
        return ['source', 'stored'].map((origin) => ({
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
                ? { ...c, definition: `CHECK(CASE WHEN bypass THEN true ELSE ${sql} END)` }
                : c,
              catalog.enums,
              catalog.domains,
              origin as 'source' | 'stored',
            )!.expression,
          ),
        }))
      }),
      group = prepareCheckRustGroup(checks)
    group.checks.forEach((c, i) =>
      expect(c.kind, checks[i]!.identity.constraint + ('reason' in c ? ': ' + c.reason : '')).toBe(
        'supported',
      ),
    )
    const samples = [
        { grantee: 1n, grantor: 2n, privileges: 2n, text: 'SELECT' },
        { grantee: 0n, grantor: 0n, privileges: 1n, text: 'INSERT' },
        { grantee: 4294967295n, grantor: 4294967295n, privileges: 2n, text: 'SELECT' },
        { grantee: 0n, grantor: 0n, privileges: 2n, text: 'SELECT' },
        null,
      ],
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    let nativeInserts = 0,
      rejections = 0
    for (const item of samples)
      for (const other of samples)
        for (const take_first of [false, true]) {
          const raw = [
              item?.grantee.toString() ?? null,
              item?.grantor.toString() ?? null,
              item?.text ?? null,
              other?.grantee.toString() ?? null,
              other?.grantor.toString() ?? null,
              other?.text ?? null,
            ],
            hash = (
              await pg.query<{ hash: number | null }>(
                'SELECT hash_aclitem(makeaclitem($1::oid,$2::oid,$3::text,false)) hash',
                raw.slice(0, 3),
              )
            ).rows[0]!.hash,
            row: Row = {
              item: known(
                item
                  ? {
                      grantee: item.grantee,
                      grantor: item.grantor,
                      privileges: item.privileges,
                      grantOptions: 0n,
                    }
                  : null,
              ),
              other: known(
                other
                  ? {
                      grantee: other.grantee,
                      grantor: other.grantor,
                      privileges: other.privileges,
                      grantOptions: 0n,
                    }
                  : null,
              ),
              recorded_hash: known(hash),
              take_first: known(take_first),
              bypass: known(false),
            },
            args = [...raw, hash, take_first],
            source =
              'SELECT makeaclitem($1::oid,$2::oid,$3::text,false) item,makeaclitem($4::oid,$5::oid,$6::text,false) other,$7::int recorded_hash,$8::bool take_first,false bypass'
          await pg.exec('TRUNCATE acl_domain_input')
          await pg.query(`INSERT INTO acl_domain_input ${source}`, args)
          for (const [name, sql] of Object.entries(expressions)) {
            let expected: Outcome
            try {
              const v = (
                await pg.query<{ v: boolean | null }>(`SELECT ${sql} v FROM acl_domain_input`)
              ).rows[0]!.v
              expected = { kind: v === null ? 'Null' : v ? 'True' : 'False' }
            } catch (error) {
              expected = {
                kind: 'Error',
                value: { state: parseInt((error as { code: string }).code, 36) },
              }
            }
            let code: string | undefined
            try {
              await pg.query(`INSERT INTO acl_domain_${name} SELECT * FROM acl_domain_input`)
            } catch (error) {
              code = (error as { code: string }).code
            }
            expect(code, `${name}/${hash}/${take_first}`).toBe(
              expected.kind === 'False'
                ? '23514'
                : expected.kind === 'Error'
                  ? expected.value.state.toString(36).toUpperCase().padStart(5, '0')
                  : undefined,
            )
            nativeInserts++
            if (code) rejections++
            for (const origin of ['source', 'stored']) {
              fixtures.push({ name: name + '_' + origin, row, expected })
              fixtures.push({
                name: name + '_' + origin,
                row: { ...row, bypass: known(true) },
                expected: { kind: 'True' },
              })
            }
            reference.push({ name, hash, take_first, expected })
          }
        }
    const row: Row = {
      item: { kind: 'Unknown' },
      other: known({ grantee: 1n, grantor: 2n, privileges: 2n, grantOptions: 0n }),
      recorded_hash: known(5),
      take_first: known(true),
      bypass: known(false),
    }
    for (const name of [
      'checked',
      'required',
      'arithmetic',
      'elements',
      'coalesced',
      'selected',
      'common_cast',
    ])
      for (const origin of ['source', 'stored'])
        fixtures.push({ name: name + '_' + origin, row, expected: { kind: 'Unknown' } })
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'domains-reference.json'),
      JSON.stringify({ nativeInserts, rejections, fixtures: fixtures.length, reference }, null, 2) +
        '\n',
    )
    await runCheckParity(
      root,
      'acldomains',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
    console.log(
      `ACL domains: ${nativeInserts} native INSERTs, ${rejections} rejections, ${fixtures.length} parity fixtures`,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)

it('validates nested public ACL composite payloads and domain-array fields in Go and TypeScript', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-aclitem-nested-')),
    packet = 'artifacts/goal-checks/aclitem-integration-active',
    run = promisify(execFile)
  const a = { grantee: 1n, grantor: 2n, privileges: 2n, grantOptions: 0n },
    wide = { ...a, privileges: 3n, grantOptions: 3n },
    aSql = "makeaclitem(1,2,'SELECT',false)",
    wideSql = "makeaclitem(1,2,'SELECT,INSERT',true)"
  const forms: Record<string, string> = {
    entry: '(((payload).primary_leaf).entry)=probe',
    covers: 'aclcontains((((payload).primary_leaf).history)::aclitem[],probe)',
    history_entry: '(((payload).history)[1]).entry IS NOT DISTINCT FROM probe',
    same_leaf: '(payload).primary_leaf IS NOT DISTINCT FROM (reference).primary_leaf',
    same_history: '(payload).history IS NOT DISTINCT FROM (reference).history',
    hash: 'hash_record(payload)=hash_record(reference)',
    dimensions: 'array_ndims((payload).defaults)=1',
    row_absence: 'payload IS NULL',
  }
  try {
    await pg.exec(
      'CREATE DOMAIN nonzero_acl AS aclitem CHECK(hash_aclitem(VALUE)<>0);CREATE TYPE acl_leaf AS(entry nonzero_acl,retired int,history nonzero_acl[]);ALTER TYPE acl_leaf DROP ATTRIBUTE retired;CREATE TYPE acl_envelope AS(primary_leaf acl_leaf,history acl_leaf[],defaults aclitem[]);' +
        `CREATE TABLE acl_nested(payload acl_envelope,reference acl_envelope,probe aclitem,bypass boolean,${Object.entries(
          forms,
        )
          .map(
            ([name, sql]) => `CONSTRAINT ${name} CHECK(CASE WHEN bypass THEN true ELSE ${sql} END)`,
          )
          .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'acl_nested')!,
      leafType = catalogCompositeType('public.acl_leaf', catalog.compositeTypeGraph)!,
      envelopeType = catalogCompositeType('public.acl_envelope', catalog.compositeTypeGraph)!,
      leafProfile = compositeProfile(leafType)!,
      envelopeProfile = compositeProfile(envelopeType)!,
      leafDefinition = leafProfile.graph.definitions.find(
        (n) => n.identity === leafProfile.identity,
      )!,
      historyField = leafDefinition.fields!.find((f) => f.name === 'history')!,
      historyType = compositeFieldType(leafProfile, historyField.type)!,
      elementIdentity = arrayElementIdentity(arrayLikeElementType(historyType)!),
      aclArray = (
        values: (typeof a | null)[],
        identity = elementIdentity,
        zeroLengthDimension = false,
      ) => ({
        elementType: identity,
        elementKind: 46,
        dimensions:
          values.length || zeroLengthDimension ? [{ lower: 1, length: values.length }] : [],
        elements: values.map((value) =>
          value === null ? { kind: 'Null' as const } : { kind: 'Aclitem' as const, value },
        ),
        nullBitmap: { kind: 'Value' as const, value: values.includes(null) },
      }),
      leaf = (entry: typeof a = a, withNull = false): CompositeInputPayload => ({
        typeName: leafProfile.identity,
        fields: [
          { kind: 'Aclitem', value: entry },
          { kind: 'Array', value: aclArray(withNull ? [entry, null] : [entry]) },
        ],
      }),
      envelope = (
        primary: CompositeInputPayload | null,
        history: (CompositeInputPayload | null)[] | null,
        defaults: (typeof a)[] | null = [],
      ): CompositeInputPayload => ({
        typeName: envelopeProfile.identity,
        fields: [
          primary === null ? { kind: 'Null' } : { kind: 'Composite', value: primary },
          history === null
            ? { kind: 'Null' }
            : {
                kind: 'Array',
                value: {
                  elementType: leafProfile.identity,
                  elementKind: 44,
                  dimensions: history.length ? [{ lower: 1, length: history.length }] : [],
                  elements: history.map((value) =>
                    value === null ? { kind: 'Null' } : { kind: 'Composite', value },
                  ),
                  nullBitmap: { kind: 'Value', value: history.includes(null) },
                },
              },
          defaults === null
            ? { kind: 'Null' }
            : { kind: 'Array', value: aclArray(defaults, 'pg_catalog.aclitem', true) },
        ],
      }),
      leafSql = (value = aSql, withNull = false) =>
        `ROW(${value},ARRAY[${value}${withNull ? ',NULL::aclitem' : ''}]::nonzero_acl[])::acl_leaf`,
      envelopeSql = (
        primary = leafSql(),
        history = `ARRAY[${leafSql()}]`,
        defaults = "acldefault('c',1)",
      ) => `ROW(${primary},${history},${defaults})::acl_envelope`,
      good = envelope(leaf(), [leaf()]),
      goodSql = envelopeSql(),
      samples: { sql: string; payload: CompositeInputPayload | null }[] = [
        { sql: goodSql, payload: good },
        { sql: envelopeSql(leafSql(wideSql)), payload: envelope(leaf(wide), [leaf()]) },
        { sql: envelopeSql('NULL::acl_leaf'), payload: envelope(null, [leaf()]) },
        {
          sql: envelopeSql(leafSql(), `ARRAY[NULL::acl_leaf,${leafSql(wideSql)}]`),
          payload: envelope(leaf(), [null, leaf(wide)]),
        },
        { sql: envelopeSql(leafSql(aSql, true)), payload: envelope(leaf(a, true), [leaf()]) },
        { sql: 'NULL::acl_envelope', payload: null },
        { sql: 'ROW(NULL,NULL,NULL)::acl_envelope', payload: envelope(null, null, null) },
        { sql: envelopeSql(leafSql(), 'ARRAY[]::acl_leaf[]'), payload: envelope(leaf(), []) },
      ]
    const cases = []
    for (const sample of samples) {
      const expected: Record<string, { certain: boolean; value?: boolean | null; error?: string }> =
        {}
      for (const [name, sql] of Object.entries(forms)) {
        try {
          expected[name] = {
            certain: true,
            value: (
              await pg.query<{ v: boolean | null }>(
                `SELECT ${sql} v FROM(SELECT ${sample.sql} payload,${goodSql} reference,${aSql} probe,false bypass) q`,
              )
            ).rows[0]!.v,
          }
        } catch (error) {
          expected[name] = { certain: true, error: (error as { code: string }).code }
        }
      }
      let accepted = true
      try {
        await pg.exec(`INSERT INTO acl_nested SELECT ${sample.sql},${goodSql},${aSql},false`)
      } catch {
        accepted = false
      }
      expect(accepted).toBe(!Object.values(expected).some((v) => v.error || v.value === false))
      cases.push({
        row: {
          payload:
            sample.payload === null ? { kind: 'Null' } : { kind: 'Value', value: sample.payload },
          reference: { kind: 'Value', value: good },
          probe: { kind: 'Value', value: a },
          bypass: false,
        },
        expected,
      })
    }
    const tsRoot = join(root, 'ts'),
      tsBundle = renderTypescriptSchemaCheckArtifacts([table], catalog.domains, [], {
        compositeTypeGraph: catalog.compositeTypeGraph,
        rangeTypes: catalog.rangeTypes,
      })
    await mkdir(tsRoot)
    await writeFile(join(tsRoot, 'package.json'), '{"type":"module"}')
    await writeFile(join(tsRoot, 'checks.ts'), tsBundle.checks)
    for (const artifact of checkTypescriptArtifacts(tsBundle.rustFiles!)) {
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
    ]).catch((e: { stdout: string; stderr: string }) => {
      throw new Error(e.stdout + e.stderr)
    })
    const api = await import(pathToFileURL(join(tsRoot, 'js/checks.js')).href),
      evaluate = (row: unknown): Record<string, unknown> =>
        Object.fromEntries(
          api
            .evaluatePublicAclNestedChecks(row)
            .map((c: { constraint: string; result: unknown }) => [c.constraint, c.result]),
        )
    for (const c of cases) expect(evaluate(c.row)).toEqual(c.expected)
    const partialLeaf = { ...leaf(), fields: [{ kind: 'Unknown' }, leaf().fields[1]!] }
    const partial = envelope(partialLeaf as CompositeInputPayload, [leaf()])
    const partialResult = evaluate({ ...cases[0]!.row, payload: { kind: 'Value', value: partial } })
    expect(partialResult.entry).toEqual({ certain: false })
    expect(partialResult.covers).toEqual({ certain: true, value: true })
    expect(partialResult.history_entry).toEqual({ certain: true, value: true })
    const malformed = envelope(leaf({ ...a, grantOptions: 4294967296n }), [leaf()])
    expect(
      evaluate({ ...cases[0]!.row, payload: { kind: 'Value', value: malformed } }).entry,
    ).toEqual({ certain: false })
    expect(
      evaluate({
        ...cases[0]!.row,
        payload: { kind: 'Error', value: { state: parseInt('22003', 36) } },
      }).entry,
    ).toEqual({ certain: true, error: '22003' })
    expect(
      Object.values(evaluate({ ...cases[0]!.row, payload: { kind: 'Unknown' }, bypass: true })),
    ).toEqual(Object.keys(forms).map(() => ({ certain: true, value: true })))
    const goRoot = join(root, 'go'),
      goBundle = renderGoSchemaCheckArtifacts(
        [table],
        'checks',
        catalog.domains,
        [],
        catalog,
        parseConfigString('schema: schema.sql\nsql:\n  codegen:\n    go: {}\n'),
        undefined,
        'acl-nested',
      )
    await mkdir(goRoot)
    await writeFile(join(goRoot, 'go.mod'), 'module acl-nested\n\ngo 1.25\n')
    await writeFile(join(goRoot, 'checks.go'), goBundle.checks)
    for (const [name, source] of Object.entries(goBundle.rustFiles!)) {
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
    const rt = (name: string) => go.selector(go.ident('checkruntime'), name),
      goComposite = (value: CompositeInputPayload | null) =>
        printGoFile({
          package: 'checks',
          imports: [],
          declarations: [
            go.function(
              'fixture',
              [],
              [{ type: rt('CompositeValue') }],
              [
                go.return(
                  value === null ? go.call(rt('CompositeNull'), []) : compositeGoInput(value),
                ),
              ],
            ),
          ],
        }).match(/return ([\s\S]*)\n\}/)![1]!,
      rows = samples.map(
        (s) =>
          `PublicAclNestedCheckInput{Payload:KnownCheckValue(${goComposite(s.payload)}),Reference:KnownCheckValue(${goComposite(good)}),Probe:KnownCheckValue(checkruntime.MakeAclitemValue(1,2,2,0)),Bypass:KnownCheckValue(ptr(false))}`,
      ),
      assertions = cases.flatMap((c, i) =>
        Object.entries(c.expected).map(
          ([name, v]) =>
            `if r:=results[${i}]["${name}"]; ${v.error ? `!r.Certain||r.Value.Error!="${v.error}"` : v.value === null ? '!r.Certain||r.Value.Valid' : `!r.Certain||!r.Value.Valid||r.Value.Value!=${v.value}`} {t.Fatalf("${i} ${name}: %+v",r)}`,
        ),
      )
    await writeFile(
      join(goRoot, 'checks_test.go'),
      `package checks
import("testing";checkruntime "acl-nested/checkrust/checkruntime")
func ptr[T any](v T)*T{return &v}
func TestNested(t *testing.T){rows:=[]PublicAclNestedCheckInput{${rows.join(',')}};results:=[]map[string]EvalBool{};for _,row:=range rows{out:=map[string]EvalBool{};for _,c:=range EvaluatePublicAclNestedChecks(row){out[c.Constraint]=c.Result};results=append(results,out)}
${assertions.join('\n')}
base:=rows[0];base.Payload=KnownCheckValue(${goComposite(partial)});for _,c:=range EvaluatePublicAclNestedChecks(base){if c.Constraint=="entry"&&c.Result.Certain{t.Fatal("unknown field became definite",c)};if(c.Constraint=="covers"||c.Constraint=="history_entry")&&(!c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value){t.Fatal("known nested field lost",c)}}
base.Payload=KnownCheckValue(${goComposite(malformed)});for _,c:=range EvaluatePublicAclNestedChecks(base){if c.Constraint=="entry"&&c.Result.Certain{t.Fatal("malformed ACL field accepted",c)}}
base.Payload=KnownCheckValue(checkruntime.CompositeValue{});base.Bypass=KnownCheckValue(ptr(true));for _,c:=range EvaluatePublicAclNestedChecks(base){if !c.Result.Certain||!c.Result.Value.Valid||!c.Result.Value.Value{t.Fatal("skip lost",c)}}
}`,
    )
    await run('go', ['test', '-p', '1', './...'], { cwd: goRoot }).catch(
      (e: { stdout: string; stderr: string }) => {
        throw new Error(e.stdout + e.stderr)
      },
    )
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'nested-reference.json'),
      JSON.stringify(
        {
          nativeInserts: cases.length,
          publicRowsPerTarget: cases.length,
          droppedField: true,
          checkedDomainFields: true,
          partialAndMalformedRows: true,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 300_000)

it('preserves raw ACL query parameters and database rejections while validating explicit portable payloads', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pgsid-aclitem-write-')),
    run = promisify(execFile),
    packet = 'artifacts/goal-checks/aclitem-integration-active'
  try {
    await mkdir(join(root, 'queries'))
    await writeFile(
      join(root, 'schema.sql'),
      'CREATE DOMAIN imported_acl AS aclitem CHECK(hash_aclitem(VALUE)<>0);CREATE DOMAIN nested_acl AS imported_acl;CREATE TABLE acl_writes(entry aclitem,domain_entry nested_acl,reference aclitem,CONSTRAINT same_entry CHECK(entry=reference),CONSTRAINT same_domain CHECK(domain_entry=reference),CONSTRAINT checked_entry CHECK(hash_aclitem(entry::nested_acl)>0));\n',
    )
    await writeFile(
      join(root, 'queries/acls.sql'),
      '-- name: InsertEntry :exec\nINSERT INTO acl_writes(entry,domain_entry,reference) VALUES(@entry,@domain_entry,@reference);\n',
    )
    await writeFile(
      join(root, 'pgsid.yaml'),
      `schema: schema.sql
sql:
 paths: [queries/*.sql]
 typecheck: {plpgsql: false}
 codegen:
  typescript:
   schema: {outDir: generated/typescript/types/schema}
   queries:
    out:
     queries:
      types: generated/typescript/types/queries
      runtime: generated/typescript/runtime/queries
  go:
   driver: pgx
   schema: {outDir: generated/schema}
   queries:
    out: {queries: generated/queries}
`,
    )
    for (const name of ['go.mod', 'go.sum'])
      await writeFile(
        join(root, name),
        await readFile('tests/fixtures/codegen/project/' + name, 'utf8'),
      )
    const built = await buildProject({ baseDirectory: root })
    expect(built.state.diagnostics).toEqual([])
    await writeFile(
      join(root, 'generated/queries/acls/acl_input_test.go'),
      `package acls
import("context";"errors";"testing";pgsid "example.com/pgsid-fixture/generated/queries/pgsid/pgx";checkruntime "example.com/pgsid-fixture/generated/queries/pgsid/pgx/checkrust/checkruntime";schema "example.com/pgsid-fixture/generated/schema/public";"github.com/jackc/pgx/v5/pgconn")
type recordingACLDB struct{pgsid.DBTX;arguments []any;calls int;failure error}
func(db *recordingACLDB)Exec(ctx context.Context,sql string,args ...any)(pgconn.CommandTag,error){db.calls++;db.arguments=args;return pgconn.NewCommandTag("INSERT 0 1"),db.failure}
func TestRawACLInputs(t *testing.T){db:=&recordingACLDB{};queries:=New(db);var entry any="acl_writer=r/acl_owner";domain:=schema.NestedAcl(entry);var reference any=entry;params:=InsertEntryParams{Entry:&entry,DomainEntry:&domain,Reference:&reference};if err:=queries.InsertEntry(context.Background(),params);err!=nil{t.Fatal(err)};if db.calls!=1||len(db.arguments)!=3||db.arguments[0]!=params.Entry||db.arguments[1]!=params.DomainEntry||db.arguments[2]!=params.Reference{t.Fatal("raw ACL parameters changed",db.arguments)};db.failure=errors.New("database ACL rejection");if err:=queries.InsertEntry(context.Background(),params);!errors.Is(err,db.failure){t.Fatal("database rejection lost",err)};if db.calls!=2{t.Fatal("raw ACL was rejected before database validation")}}
func TestPortableACLInputs(t *testing.T){v:=checkruntime.MakeAclitemValue(1,2,2,0);input:=pgsid.PublicAclWritesCheckInput{Entry:pgsid.KnownCheckValue(v),DomainEntry:pgsid.KnownCheckValue(v),Reference:pgsid.KnownCheckValue(v)};if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicAclWritesChecks);err!=nil{t.Fatal(err)};input.Entry=pgsid.KnownCheckValue(checkruntime.MakeAclitemValue(1,2,1,0));if err:=pgsid.ValidateCheckInputs(input,pgsid.EvaluatePublicAclWritesChecks);err==nil{t.Fatal("portable ACL mismatch did not reject")};input.Entry=pgsid.KnownCheckValue(checkruntime.MakeAclitemValue(4294967295,4294967295,2,0));found:=false;for _,c:=range pgsid.EvaluatePublicAclWritesChecks(input){if c.Constraint=="checked_entry"{found=true;if !c.Result.Certain||c.Result.Value.Error!="23514"{t.Fatalf("domain failure lost: %+v",c)}}};if !found{t.Fatal("missing checked ACL cast")}}
`,
    )
    await run('go', ['test', '-mod=mod', '-p', '1', './...'], { cwd: root }).catch(
      (e: { stdout: string; stderr: string }) => {
        throw new Error(e.stdout + e.stderr)
      },
    )
    await writeFile(join(root, 'package.json'), '{"type":"module"}')
    const tsEntry = join(root, 'generated/typescript/runtime/queries/acls/InsertEntry.ts')
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
      '--rootDir',
      join(root, 'generated/typescript'),
      '--outDir',
      join(root, 'js'),
      tsEntry,
    ]).catch((e: { stdout: string; stderr: string }) => {
      throw new Error(e.stdout + e.stderr)
    })
    const generated = await import(
      pathToFileURL(join(root, 'js/runtime/queries/acls/InsertEntry.js')).href
    )
    let captured: unknown[] = []
    const db = {
      query: async (_sql: string, values: unknown[]) => {
        captured = values
        return { rows: [] }
      },
    }
    const raw = {
      entry: 'acl_writer=r/acl_owner',
      domain_entry: 'acl_writer=r/acl_owner',
      reference: 'acl_writer=r/acl_owner',
    }
    await generated.insertEntry(db, raw)
    expect(captured).toEqual([raw.entry, raw.domain_entry, raw.reference])
    const opaque = { driver: 'acl', text: raw.entry }
    await generated.insertEntry(db, { entry: opaque, domain_entry: opaque, reference: opaque })
    expect(captured.every((value) => value === opaque)).toBe(true)
    const failure = new Error('database ACL rejection')
    await expect(
      generated.insertEntry(
        {
          query: async () => {
            throw failure
          },
        },
        raw,
      ),
    ).rejects.toBe(failure)
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'writes-reference.json'),
      JSON.stringify(
        {
          rawParameterIdentityPreserved: true,
          typescriptRawAndOpaqueParametersPreserved: true,
          databaseFailurePreserved: true,
          portablePayloadValidation: true,
          domainFailure: '23514',
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}, 300_000)
