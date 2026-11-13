import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { expectUndecidedOrRejected } from './check-public-inputs.js'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { renderGoSchemaCheckArtifacts } from '../../src/codegen/go/sql/catalog-checks.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { internalCheckRows } from '../support/check-entries.js'
import { parseConfigString } from '../../src/config/loader.js'
import { checkUnknownMessage } from '../../src/codegen/shared/check-diagnostics.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

it('validates SQL-coerced ACL payloads, domains and partial inputs through native, Rust and public Go and TypeScript validators', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-aclitem-payload-')),
    packet = 'artifacts/goal-checks/aclitem-payload-active',
    run = promisify(execFile)
  const definitions: Record<string, string> = {
    same: 'item=reference',
    hash: 'hash_aclitem(item)=expected_hash',
    extended: 'hash_aclitem_extended(item,seed)=expected_extended',
    presence: '(item IS NULL)=expected_absent',
    selected: '(CASE WHEN choose_first THEN item ELSE reference END)=reference',
    coalesced: 'COALESCE(NULL::aclitem,item,reference)=reference',
    distinctness: '(item IS DISTINCT FROM reference)=expected_distinct',
    nulled: '(NULLIF(item,reference) IS NULL)=expected_nullif',
    domain_value: '(item::nested_acl)=reference',
    null_literal: 'NULL::aclitem IS NULL',
    lazy: 'CASE WHEN bypass THEN true ELSE item=reference END',
  }
  const known = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  const payload = (
    grantee: bigint,
    grantor: bigint,
    privileges: bigint,
    grantOptions: bigint,
  ): Input => known({ grantee, grantor, privileges, grantOptions })
  try {
    await pg.exec(
      'CREATE DOMAIN imported_acl AS aclitem;CREATE DOMAIN nested_acl AS imported_acl;' +
        `CREATE TABLE acl_rows(item nested_acl,reference aclitem,expected_hash int,seed bigint,expected_extended bigint,expected_absent boolean,choose_first boolean,expected_distinct boolean,expected_nullif boolean,bypass boolean,${Object.entries(
          definitions,
        )
          .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${sql})`)
          .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'acl_rows')!,
      checks = Object.entries(definitions).flatMap(([name, sql]) =>
        ['raw', 'stored'].map((origin) => {
          const constraint = table.constraints.find((c) => c.name === name)!
          return {
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: table.name,
              constraint: name + '_' + origin,
            },
            expression: portableCheckAtoms(
              lowerTableCheck(
                table,
                origin === 'raw' ? { ...constraint, definition: `CHECK(${sql})` } : constraint,
                [],
                catalog.domains,
              )!.expression,
            ),
          }
        }),
      ),
      group = prepareCheckRustGroup(checks)
    group.checks.forEach((c, i) =>
      expect(c.kind, checks[i]!.identity.constraint + ('reason' in c ? ': ' + c.reason : '')).toBe(
        'supported',
      ),
    )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      publicCases: { row: Row; expected: Record<string, Outcome> }[] = []
    let inserts = 0,
      rejections = 0
    const masks: [string, bigint][] = [
      ['SELECT', 2n],
      ['INSERT,UPDATE', 5n],
      ['MAINTAIN', 16384n],
      ['TEMPORARY,CONNECT', 3072n],
      [
        'INSERT,SELECT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,EXECUTE,USAGE,CREATE,TEMP,CONNECT,SET,ALTER SYSTEM,MAINTAIN',
        32767n,
      ],
    ]
    for (const grantee of [0n, 1n, 2147483648n, 4294967295n])
      for (const [privilege, mask] of masks)
        for (const option of [false, true])
          for (const missing of [false, true]) {
            const grantor = 4294967295n,
              seed = option ? -1n : 0n,
              data = (
                await pg.query<{ hash: number | null; extended: string | null }>(
                  `SELECT hash_aclitem(a) hash,hash_aclitem_extended(a,$5::bigint)::text extended FROM (SELECT makeaclitem($1::oid,$2::oid,$3::text,$4::bool) a) q`,
                  [
                    missing ? null : grantee.toString(),
                    grantor.toString(),
                    privilege,
                    option,
                    seed.toString(),
                  ],
                )
              ).rows[0]!,
              row: Row = {
                item: missing ? known(null) : payload(grantee, grantor, mask, option ? mask : 0n),
                reference: payload(grantee, grantor, mask, 0n),
                expected_hash: known(data.hash),
                seed: known(seed),
                expected_extended: known(data.extended === null ? null : BigInt(data.extended)),
                expected_absent: known(missing),
                choose_first: known(true),
                expected_distinct: known(missing),
                expected_nullif: known(true),
                bypass: known(false),
              },
              values = [
                missing ? null : grantee.toString(),
                grantor.toString(),
                privilege,
                option,
                seed.toString(),
                data.hash,
                data.extended,
                missing,
              ],
              query = `SELECT ${Object.entries(definitions)
                .map(([name, sql]) => `(${sql}) AS ${name}`)
                .join(
                  ',',
                )} FROM (SELECT makeaclitem($1::oid,$2::oid,$3::text,$4::bool) item,makeaclitem('${grantee}'::oid,$2::oid,$3::text,false) reference,$6::int expected_hash,$5::bigint seed,$7::bigint expected_extended,$8::bool expected_absent,true choose_first,$8::bool expected_distinct,true expected_nullif,false bypass) input`,
              native = (await pg.query<Record<string, boolean | null>>(query, values)).rows[0]!,
              expected: Record<string, Outcome> = {}
            for (const [name, value] of Object.entries(native)) {
              expected[name] = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
              for (const origin of ['raw', 'stored'])
                fixtures.push({ name: name + '_' + origin, row, expected: expected[name]! })
            }
            let rejection: string | undefined
            try {
              await pg.query(
                `INSERT INTO acl_rows SELECT makeaclitem($1::oid,$2::oid,$3::text,$4::bool),makeaclitem('${grantee}'::oid,$2::oid,$3::text,false),$6::int,$5::bigint,$7::bigint,$8::bool,true,$8::bool,true,false`,
                values,
              )
            } catch (error) {
              rejection = (error as { code: string }).code
            }
            expect(rejection).toBe(Object.values(native).includes(false) ? '23514' : undefined)
            if (rejection) rejections++
            inserts++
            publicCases.push({ row, expected })
          }
    expect(rejections).toBe(20)
    const base = publicCases[0]!.row
    for (const item of [
      { kind: 'Unknown' } as Input,
      { kind: 'Error', value: { state: parseInt('22003', 36) } } as Input,
    ]) {
      const row = { ...base, item },
        expected: Record<string, Outcome> = {}
      for (const name of Object.keys(definitions)) {
        expected[name] =
          name === 'null_literal'
            ? { kind: 'True' }
            : item.kind === 'Error'
              ? item
              : { kind: 'Unknown' }
        for (const origin of ['raw', 'stored'])
          fixtures.push({ name: name + '_' + origin, row, expected: expected[name]! })
      }
      publicCases.push({ row, expected })
    }
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'reference.json'),
      JSON.stringify(
        { nativeInserts: inserts, nativeRejections: rejections, fixtures: fixtures.length },
        null,
        2,
      ) + '\n',
    )
    await mkdir(join(root, 'parity'))
    await runCheckParity(
      join(root, 'parity'),
      'aclitempayload',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
    const tsBundle = renderTypescriptSchemaCheckArtifacts([table], catalog.domains),
      tsRoot = join(root, 'public-ts')
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
    const api = await import(pathToFileURL(join(tsRoot, 'js/checks.js')).href)
    const runtime = await import(pathToFileURL(join(tsRoot, 'js/checks-rust/checks.js')).href)
    const internal = internalCheckRows(tsBundle.checks, runtime)
    type Result = { certain: boolean; value?: boolean | null; error?: string }
    const evaluate = (row: Record<string, unknown>): Record<string, Result> =>
      Object.fromEntries(
        api
          .evaluatePublicAclRowsChecks(row)
          .map((c: { constraint: string; result: Result }) => [c.constraint, c.result]),
      )
    // Each constraint evaluated by the server over the same parameters.
    const columnTypes: Record<string, string> = {
      item: 'nested_acl',
      reference: 'aclitem',
      expected_hash: 'int',
      seed: 'bigint',
      expected_extended: 'bigint',
      expected_absent: 'bool',
      choose_first: 'bool',
      expected_distinct: 'bool',
      expected_nullif: 'bool',
      bypass: 'bool',
    }
    const columns = Object.keys(columnTypes)
    const server = async (row: Record<string, unknown>) => {
      const results: Record<string, Result> = {}
      const source = columns
        .map((name, index) => `$${index + 1}::${columnTypes[name]} AS ${name}`)
        .join(', ')
      for (const [name, sql] of Object.entries(definitions))
        try {
          const { rows } = await pg.query<{ value: boolean | null }>(
            `SELECT (${sql}) AS value FROM (SELECT ${source}) AS input`,
            columns.map((column) => {
              // A parameter the check does not read cannot fail it.
              if (!new RegExp(`\\b${column}\\b`, 'u').test(sql)) return null
              const value = row[column]
              return typeof value === 'bigint' ? value.toString() : value
            }),
          )
          results[name] = { certain: true, value: rows[0]!.value }
        } catch (error) {
          results[name] = { certain: true, error: (error as { code: string }).code }
        }
      return results
    }
    // An ACL item's public value is its text, and only PUBLIC grantees under the default grantor
    // read without the role catalog; a stored item naming other roles is out of the public API's
    // reach, so the matrix runs over PUBLIC items.
    const publicRows: Record<string, unknown>[] = []
    for (const [privilege] of masks)
      for (const option of [false, true])
        for (const missing of [false, true]) {
          const seed = option ? -1n : 0n,
            spelled = (
              await pg.query<{
                item: string
                reference: string
                hash: number
                extended: string
              }>(
                `SELECT regexp_replace(a::text,'/[^/]*$','') item,regexp_replace(r::text,'/[^/]*$','') reference,
                 hash_aclitem(a) hash,hash_aclitem_extended(a,$3::bigint)::text extended
                 FROM (SELECT makeaclitem(0,'10'::oid,$1::text,$2::bool) a,makeaclitem(0,'10'::oid,$1::text,false) r) q`,
                [privilege, option, seed.toString()],
              )
            ).rows[0]!
          publicRows.push({
            item: missing ? null : spelled.item,
            reference: spelled.reference,
            expected_hash: missing ? null : spelled.hash,
            seed,
            expected_extended: missing ? null : BigInt(spelled.extended),
            expected_absent: missing,
            choose_first: true,
            expected_distinct: missing,
            expected_nullif: true,
            bypass: false,
          })
        }
    let publicRejections = 0
    for (const row of publicRows) {
      const results = evaluate(row)
      expect({ row, results }).toEqual({ row, results: await server(row) })
      if (Object.values(results).some((r) => r.value === false)) publicRejections++
    }
    expect(publicRejections).toBe(5)
    const publicBase = publicRows[0]!
    // Items naming roles, as the server prints stored items whose roles are gone, resolve
    // through the role catalog.
    for (const grantee of [1n, 2147483648n, 4294967295n]) {
      const spelled = (
        await pg.query<{ item: string }>(
          "SELECT makeaclitem($1::oid,'4294967295'::oid,'SELECT',false)::text item",
          [grantee.toString()],
        )
      ).rows[0]!.item
      expect(spelled).toBe(`${grantee}=r/4294967295`)
      const results = evaluate({ ...publicBase, item: spelled, reference: spelled })
      for (const [name, result] of Object.entries(results))
        expect(result, name).toEqual(
          name === 'null_literal' ? { certain: true, value: true } : { certain: false },
        )
      expect(await server({ ...publicBase, item: spelled })).toMatchObject({
        same: { certain: true, error: '42704' },
      })
    }
    for (const item of [undefined, '=r/postgres', '=r/nosuch', 'nosuch=r', 'public=r'])
      expectUndecidedOrRejected(() => evaluate({ ...publicBase, item }), String(item), [
        'same',
        'presence',
      ])
    expect(evaluate({ ...publicBase, item: undefined })).toEqual(
      Object.fromEntries(
        Object.keys(definitions).map((name) => [
          name,
          name === 'null_literal' ? { certain: true, value: true } : { certain: false },
        ]),
      ),
    )
    // Text the ACL input rejects without consulting a role, or reads to a PUBLIC item.
    for (const item of ['', '=q', '=r/', '=r x', '=r/=', ' =r ', '=rr', '=*r', '=r*'])
      expect({ item, results: evaluate({ ...publicBase, item }) }).toEqual({
        item,
        results: await server({ ...publicBase, item }),
      })
    for (const bad of [
      5n,
      {},
      { kind: 'Unknown' },
      { kind: 'Null' },
      { kind: 'Value', value: null },
      { kind: 'Value', value: { grantee: 0n, grantor: 10n, privileges: 2n, grantOptions: 0n } },
      ...['grantee', 'grantor', 'privileges', 'grantOptions'].flatMap((field) =>
        [-1n, 4294967296n, 1.5, '2', null].map((value) => ({
          kind: 'Value',
          value: {
            grantee: 0n,
            grantor: 4294967295n,
            privileges: 2n,
            grantOptions: 0n,
            [field]: value,
          },
        })),
      ),
      { kind: 'Error', value: { state: parseInt('22003', 36) } },
      { kind: 'Error', value: { state: -1 } },
      { kind: 'Error', value: { state: 1.5 } },
    ])
      expect(
        () => evaluate({ ...publicBase, item: bad }),
        JSON.stringify(bad, (_, v) => (typeof v === 'bigint' ? String(v) : v)),
      ).toThrow(TypeError)
    // Unknown and failed items handed to the evaluator directly; a PUBLIC SELECT item under the
    // bootstrap superuser is what '=r' reads to.
    const internalBase = {
      item: runtime.makeAclitemValue(0n, 10n, 2n, 0n),
      reference: runtime.makeAclitemValue(0n, 10n, 2n, 0n),
      expected_hash: runtime.makeInt4Value(publicBase.expected_hash as number),
      seed: runtime.makeInt8Value(publicBase.seed as bigint),
      expected_extended: runtime.makeInt8Value(publicBase.expected_extended as bigint),
      expected_absent: runtime.makeBoolValue(false),
      choose_first: runtime.makeBoolValue(true),
      expected_distinct: runtime.makeBoolValue(false),
      expected_nullif: runtime.makeBoolValue(true),
      bypass: runtime.makeBoolValue(false),
    }
    expect(internal('public.acl_rows', internalBase)).toEqual(
      Object.fromEntries(Object.keys(definitions).map((name) => [name, { kind: 'True' }])),
    )
    for (const item of [
      { kind: 'Unknown' },
      { kind: 'Error', value: { state: parseInt('22003', 36) } },
    ])
      expect(internal('public.acl_rows', { ...internalBase, item })).toEqual(
        Object.fromEntries(
          Object.keys(definitions).map((name) => [
            name,
            name === 'null_literal' ? { kind: 'True' } : item,
          ]),
        ),
      )
    // Stored items naming any role, as the server stores them, decide through the entries exactly
    // as the server's native evaluation did.
    const storedAcl = (input: Input) =>
      input.kind === 'Value' && typeof input.value === 'object' && 'grantee' in input.value
        ? runtime.makeAclitemValue(
            input.value.grantee,
            input.value.grantor,
            input.value.privileges,
            input.value.grantOptions,
          )
        : input
    for (const c of publicCases)
      expect(
        internal(
          'public.acl_rows',
          Object.fromEntries(
            Object.entries(c.row).map(([name, input]) => [name, storedAcl(input)]),
          ),
        ),
      ).toEqual(c.expected)
    const goRoot = join(root, 'public-go'),
      goBundle = renderGoSchemaCheckArtifacts(
        [table],
        'checks',
        catalog.domains,
        [],
        catalog,
        parseConfigString('schema: schema.sql\nsql:\n  codegen:\n    go: {}\n'),
        undefined,
        'aclitem-public',
      )
    await mkdir(goRoot)
    await writeFile(join(goRoot, 'go.mod'), 'module aclitem-public\n\ngo 1.25\n')
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
    const goInput = (name: string, input: Input): string => {
      const acl = name === 'item' || name === 'reference',
        type = acl
          ? 'checkruntime.AclitemValue'
          : name === 'expected_hash'
            ? '*int32'
            : name === 'seed' || name === 'expected_extended'
              ? '*int64'
              : '*bool'
      if (input.kind === 'Null') return `NullCheckValue[${type}]()`
      if (input.kind === 'Unknown') return `CheckOptional[${type}] {}`
      if (input.kind === 'Error')
        return `KnownCheckValue(checkruntime.AclitemValue{Kind:checkruntime.AclitemValueError,Error:checkruntime.SqlError{State:${input.value.state}}})`
      if (typeof input.value === 'object' && 'grantee' in input.value) {
        const v = input.value
        return `KnownCheckValue(checkruntime.MakeAclitemValue(${v.grantee},${v.grantor},${v.privileges},${v.grantOptions}))`
      }
      return `KnownCheckValue(ptr(${type.slice(1)}(${input.value})))`
    }
    const goRows = publicCases.map(
      (c) =>
        'publicAclRowsCheckInput{' +
        Object.entries(c.row)
          .map(
            ([name, input]) =>
              name
                .split('_')
                .map((p) => p[0]!.toUpperCase() + p.slice(1))
                .join('') +
              ':' +
              goInput(name, input),
          )
          .join(',') +
        '}',
    )
    const assertions = publicCases.flatMap((c, i) =>
      Object.entries(c.expected).map(
        ([name, outcome]) =>
          `if r:=results[${i}][${JSON.stringify(name)}]; ${outcome.kind === 'Unknown' ? 'r.Certain' : outcome.kind === 'Error' ? `!r.Certain || r.Value.Error != "${outcome.value.state.toString(36).toUpperCase()}"` : outcome.kind === 'Null' ? '!r.Certain || r.Value.Valid' : `!r.Certain || !r.Value.Valid || r.Value.Value != ${outcome.kind === 'True'}`} {t.Fatalf("${i} ${name}: %+v",r)}`,
      ),
    )
    await writeFile(
      join(goRoot, 'checks_test.go'),
      `package checks
import("testing";checkruntime "aclitem-public/checkrust/checkruntime")
func ptr[T any](value T)*T{return &value}
func TestPayloads(t *testing.T){rows:=[]publicAclRowsCheckInput{${goRows.join(',')}};results:=[]map[string]EvalBool{};for _,row:=range rows{values:=map[string]EvalBool{};for _,check:=range func() []CheckEvaluation {r, e := evaluatePublicAclRowsChecks(row); if e != nil {panic(e)}; return r}(){values[check.Constraint]=check.Result};results=append(results,values)}
${assertions.join('\n')}
base:=rows[0];for _,v:=range []checkruntime.AclitemValue{{Kind:checkruntime.AclitemValueValue,Value:checkruntime.AclitemPayload{Grantee:-1}},{Kind:checkruntime.AclitemValueValue,Value:checkruntime.AclitemPayload{Grantor:4294967296}},{Kind:checkruntime.AclitemValueValue,Value:checkruntime.AclitemPayload{Privileges:-1}},{Kind:checkruntime.AclitemValueValue,Value:checkruntime.AclitemPayload{GrantOptions:4294967296}},{Kind:checkruntime.AclitemValueKind(99)}}{base.Item=KnownCheckValue(v);for _,c:=range func() []CheckEvaluation {r, e := evaluatePublicAclRowsChecks(base); if e != nil {return nil}; return r}(){if (c.Constraint=="same"||c.Constraint=="presence")&&c.Result.Certain{t.Fatal("malformed ACL became certain",c)}}}
}`,
    )
    await run('go', ['test', '-p', '1', './...'], { cwd: goRoot }).catch(
      (e: { stdout: string; stderr: string }) => {
        throw new Error(e.stdout + e.stderr)
      },
    )
    console.log(
      `ACL payloads: ${inserts} native INSERTs, ${fixtures.length} parity fixtures and ${publicCases.length} public rows per target`,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)

it('preserves captured ACL literal facts across role recreation while deferring role-dependent values', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-aclitem-literal-')),
    packet = 'artifacts/goal-checks/aclitem-payload-active'
  try {
    await pg.exec('CREATE ROLE acl_literal_reader;CREATE ROLE acl_literal_owner')
    const query = "SELECT hash_aclitem('acl_literal_reader=r/acl_literal_owner'::aclitem) hash"
    const before = (await pg.query<{ hash: number }>(query)).rows[0]!.hash
    await pg.exec('DROP ROLE acl_literal_owner;CREATE ROLE acl_literal_owner')
    const after = (await pg.query<{ hash: number }>(query)).rows[0]!.hash
    expect(after).not.toBe(before)
    const definitions = {
      present:
        "CASE WHEN bypass THEN true ELSE 'acl_literal_reader=r/acl_literal_owner'::aclitem IS NOT NULL END",
      hash: "CASE WHEN bypass THEN true ELSE hash_aclitem('acl_literal_reader=r/acl_literal_owner'::aclitem)=expected_hash END",
      absent: 'NULL::aclitem IS NULL',
    }
    await pg.exec(
      `CREATE TABLE acl_literal_checks(bypass bool,expected_hash int,${Object.entries(definitions)
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${sql})`)
        .join(',')})`,
    )
    await pg.exec(`INSERT INTO acl_literal_checks VALUES(false,${after}),(true,${before})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'acl_literal_checks')!,
      checks = Object.entries(definitions).flatMap(([name, sql]) =>
        ['raw', 'stored'].map((origin) => {
          const c = table.constraints.find((c) => c.name === name)!
          return {
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: table.name,
              constraint: name + '_' + origin,
            },
            expression: portableCheckAtoms(
              lowerTableCheck(table, origin === 'raw' ? { ...c, definition: `CHECK(${sql})` } : c)!
                .expression,
            ),
          }
        }),
      ),
      group = prepareCheckRustGroup(checks)
    group.checks.forEach((c, i) => expect(c.kind, checks[i]!.identity.constraint).toBe('supported'))
    expect(checkUnknownMessage(checks[0]!.expression)).toContain('deployment role catalog')
    const fixtures = checks.flatMap((c) =>
      [false, true].map((bypass) => ({
        name: c.identity.constraint,
        row: {
          bypass: { kind: 'Value', value: bypass },
          expected_hash: { kind: 'Value', value: after },
        } as Row,
        expected: {
          kind:
            c.identity.constraint.startsWith('absent') ||
            c.identity.constraint === 'present_stored' ||
            (bypass &&
              (c.identity.constraint.startsWith('present') ||
                c.identity.constraint.endsWith('_stored')))
              ? 'True'
              : 'Unknown',
        } as Outcome,
      })),
    )
    await runCheckParity(
      root,
      'aclitemliteral',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'literal-reference.json'),
      JSON.stringify(
        {
          before,
          after,
          nativeInserts: 2,
          fixtures: fixtures.length,
          roleCatalogDependencyWitnessed: true,
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
