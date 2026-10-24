import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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
import type {
  OwnedArrayInputCell,
  OwnedArrayInputPayload,
} from '../../tools/check-rust/array-input.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { renderGoSchemaCheckArtifacts } from '../../src/codegen/go/sql/catalog-checks.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { parseConfigString } from '../../src/config/loader.js'

it('preserves ACL arrays, generic equality and hashing, privilege containment, shape errors and obsolete update behavior in every target', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-aclitem-arrays-')),
    packet = 'artifacts/goal-checks/aclitem-arrays-active'
  const entry = (
    grantee: bigint,
    grantor: bigint,
    privileges: bigint,
    grantOptions = 0n,
  ): OwnedArrayInputCell => ({
    kind: 'Aclitem',
    value: { grantee, grantor, privileges, grantOptions },
  })
  const array = (
    elements: OwnedArrayInputCell[],
    dimensions: { lower: number; length: number }[] = elements.length
      ? [{ lower: 1, length: elements.length }]
      : [],
    bitmap = elements.some((e) => e.kind === 'Null'),
  ): OwnedArrayInputPayload => ({
    elementType: 'pg_catalog.aclitem',
    elementKind: 46,
    dimensions,
    elements,
    nullBitmap: { kind: 'Value', value: bitmap },
  })
  const known = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  const a = entry(1n, 2n, 2n),
    wide = entry(1n, 2n, 3n, 3n),
    insert = entry(1n, 2n, 1n),
    different = entry(1n, 3n, 2n),
    maximum = entry(4294967295n, 2147483648n, 16384n, 16384n),
    aSql = "makeaclitem(1,2,'SELECT',false)",
    wideSql = "makeaclitem(1,2,'SELECT,INSERT',true)",
    insertSql = "makeaclitem(1,2,'INSERT',false)",
    differentSql = "makeaclitem(1,3,'SELECT',false)",
    maximumSql = "makeaclitem('4294967295'::oid,'2147483648'::oid,'MAINTAIN',true)"
  const expressions: Record<string, string> = {
    acl_contains: 'aclcontains(items,probe)',
    acl_operator: 'items @> probe',
    generic_contains: 'items @> ARRAY[probe]',
    overlaps: 'items && ARRAY[probe]',
    equality: 'items=other',
    unequal: 'items<>other',
    hash: 'hash_array(items) IS NOT DISTINCT FROM expected_hash',
    extended: 'hash_array_extended(items,seed) IS NOT DISTINCT FROM expected_extended',
    position: 'array_position(items,probe) IS NOT DISTINCT FROM expected_position',
    positions: 'array_positions(items,probe) IS NOT DISTINCT FROM expected_positions',
    removed: 'hash_array(array_remove(items,probe)) IS NOT DISTINCT FROM expected_removed',
    appended:
      '(array_append(items,probe))[array_upper(array_append(items,probe),1)] IS NOT DISTINCT FROM probe',
    no_order: 'items<other',
    obsolete_insert: 'aclinsert(items,probe) IS NULL',
    obsolete_remove: '(items-probe) IS NULL',
    record_projection: '((ROW(probe,items)::acl_bundle).entry) IS NOT DISTINCT FROM probe',
    record_array: '((ROW(probe,items)::acl_bundle).entries) IS NOT DISTINCT FROM items',
  }
  try {
    await pg.exec('CREATE TYPE acl_bundle AS(entry aclitem,entries aclitem[])')
    const arrays: { sql: string; payload: OwnedArrayInputPayload | null }[] = [
        { sql: 'NULL::aclitem[]', payload: null },
        { sql: 'ARRAY[]::aclitem[]', payload: array([]) },
        { sql: `ARRAY[${aSql}]`, payload: array([a]) },
        { sql: `ARRAY[${wideSql}]`, payload: array([wide]) },
        { sql: `ARRAY[${aSql},${insertSql}]`, payload: array([a, insert]) },
        { sql: `ARRAY[${aSql},${aSql},${differentSql}]`, payload: array([a, a, different]) },
        { sql: `ARRAY[${maximumSql}]`, payload: array([maximum]) },
        { sql: `ARRAY[${wideSql},NULL::aclitem]`, payload: array([wide, { kind: 'Null' }]) },
        {
          sql: `ARRAY[[${wideSql},${aSql}]]`,
          payload: array(
            [wide, a],
            [
              { lower: 1, length: 1 },
              { lower: 1, length: 2 },
            ],
          ),
        },
        {
          sql: `ARRAY[[${wideSql},NULL::aclitem]]`,
          payload: array(
            [wide, { kind: 'Null' }],
            [
              { lower: 1, length: 1 },
              { lower: 1, length: 2 },
            ],
          ),
        },
        {
          sql: `array_fill(${wideSql},ARRAY[1],ARRAY[-4])`,
          payload: array([wide], [{ lower: -4, length: 1 }]),
        },
        {
          sql: `(ARRAY[${wideSql},NULL::aclitem])[1:1]`,
          payload: array([wide], [{ lower: 1, length: 1 }], true),
        },
      ],
      probes = [
        { sql: 'NULL::aclitem', cell: null },
        { sql: aSql, cell: a },
        { sql: wideSql, cell: wide },
        { sql: insertSql, cell: insert },
        { sql: differentSql, cell: different },
        { sql: maximumSql, cell: maximum },
      ]
    const columns =
      'items aclitem[],probe aclitem,other aclitem[],expected_hash int,seed bigint,expected_extended bigint,expected_position int,expected_positions int[],expected_removed int,bypass boolean'
    for (const [name, sql] of Object.entries(expressions))
      await pg.exec(
        `CREATE TABLE acl_arrays_${name}(${columns},CONSTRAINT rule CHECK(CASE WHEN bypass THEN true ELSE ${sql} END))`,
      )
    const catalog = await snapshotCatalog(pg),
      checks = Object.entries(expressions).flatMap(([name, sql]) => {
        const table = catalog.tables.find((t) => t.name === 'acl_arrays_' + name)!,
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
              catalog.rangeTypes,
              catalog.compositeTypeGraph,
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
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    let nativeInserts = 0,
      rejections = 0
    for (const input of arrays)
      for (const probe of probes) {
        const source = `SELECT ${input.sql} items,${probe.sql} probe,ARRAY[${wideSql}] other,-1::bigint seed`
        const capture = async <T>(sql: string): Promise<T | null> => {
          try {
            return (await pg.query<{ v: T }>(`SELECT ${sql} v FROM (${source}) q`)).rows[0]!.v
          } catch {
            return null
          }
        }
        const hash = await capture<number>('hash_array(items)'),
          extended = await capture<string>('hash_array_extended(items,seed)::text'),
          position = await capture<number>('array_position(items,probe)'),
          positions = await capture<number[]>('array_positions(items,probe)'),
          removed = await capture<number>('hash_array(array_remove(items,probe))'),
          positionPayload: OwnedArrayInputPayload | null =
            positions === null
              ? null
              : {
                  elementType: 'pg_catalog.int4',
                  elementKind: 2,
                  dimensions: positions.length ? [{ lower: 1, length: positions.length }] : [],
                  elements: positions.map((value) => ({ kind: 'Int4', value })),
                  nullBitmap: { kind: 'Value', value: false },
                },
          row: Row = {
            items: known(input.payload),
            probe:
              probe.cell && probe.cell.kind === 'Aclitem' ? known(probe.cell.value) : known(null),
            other: known(array([wide])),
            expected_hash: known(hash),
            seed: known(-1n),
            expected_extended: known(extended === null ? null : BigInt(extended)),
            expected_position: known(position),
            expected_positions: known(positionPayload),
            expected_removed: known(removed),
            bypass: known(false),
          },
          args = [hash, extended, position, positions, removed],
          sqlRow = `SELECT items,probe,other,$1::int expected_hash,seed,$2::bigint expected_extended,$3::int expected_position,$4::int[] expected_positions,$5::int expected_removed,false bypass FROM (${source}) q`
        for (const [name, sql] of Object.entries(expressions)) {
          let expected: Outcome
          try {
            const result = (
              await pg.query<{ v: boolean | null }>(`SELECT ${sql} v FROM (${sqlRow}) q`, args)
            ).rows[0]!.v
            expected = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
          } catch (error) {
            expected = {
              kind: 'Error',
              value: { state: parseInt((error as { code: string }).code, 36) },
            }
          }
          let code: string | undefined
          try {
            await pg.query(`INSERT INTO acl_arrays_${name} ${sqlRow}`, args)
          } catch (error) {
            code = (error as { code: string }).code
          }
          expect(code, `${name}/${input.sql}/${probe.sql}`).toBe(
            expected.kind === 'Error'
              ? expected.value.state.toString(36).toUpperCase().padStart(5, '0')
              : expected.kind === 'False'
                ? '23514'
                : undefined,
          )
          nativeInserts++
          if (code) rejections++
          for (const origin of ['source', 'stored']) {
            fixtures.push({ name: name + '_' + origin, row, expected })
            if (expected.kind === 'Error')
              fixtures.push({
                name: name + '_' + origin,
                row: { ...row, bypass: known(true) },
                expected: { kind: 'True' },
              })
          }
          reference.push({ name, array: input.sql, probe: probe.sql, expected })
        }
      }
    const partial: Row = {
      items: known(array([{ kind: 'Unknown' }, wide])),
      probe: known((a as Extract<OwnedArrayInputCell, { kind: 'Aclitem' }>).value),
      other: known(array([wide])),
      bypass: known(false),
    }
    for (const origin of ['source', 'stored']) {
      fixtures.push({ name: 'acl_contains_' + origin, row: partial, expected: { kind: 'True' } })
      fixtures.push({
        name: 'acl_contains_' + origin,
        row: { ...partial, items: known({ ...array([wide]), nullBitmap: { kind: 'Unknown' } }) },
        expected: { kind: 'Unknown' },
      })
      fixtures.push({
        name: 'acl_contains_' + origin,
        row: {
          ...partial,
          items: known({
            ...array(
              [wide],
              [
                { lower: 1, length: 1 },
                { lower: 1, length: 1 },
              ],
            ),
            nullBitmap: { kind: 'Unknown' },
          }),
        },
        expected: { kind: 'Error', value: { state: parseInt('22023', 36) } },
      })
      fixtures.push({
        name: 'acl_contains_' + origin,
        row: {
          ...partial,
          probe: known((different as Extract<OwnedArrayInputCell, { kind: 'Aclitem' }>).value),
        },
        expected: { kind: 'Unknown' },
      })
    }
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'reference.json'),
      JSON.stringify({ nativeInserts, rejections, fixtures: fixtures.length, reference }, null, 2) +
        '\n',
    )
    await runCheckParity(
      root,
      'aclitemarrays',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
    console.log(
      `ACL arrays: ${nativeInserts} native INSERTs, ${rejections} native rejections and ${fixtures.length} Rust/Go/TypeScript fixtures`,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)

it('validates public owned ACL arrays and preserves bitmap metadata in both target APIs', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-aclitem-owned-')),
    run = promisify(execFile),
    packet = 'artifacts/goal-checks/aclitem-arrays-active'
  const a = { grantee: 1n, grantor: 2n, privileges: 2n, grantOptions: 0n },
    wide = { ...a, privileges: 3n, grantOptions: 3n },
    aSql = "makeaclitem(1,2,'SELECT',false)",
    wideSql = "makeaclitem(1,2,'SELECT,INSERT',true)",
    array = (
      cells: ('a' | 'wide' | 'null')[],
      dimensions = cells.length ? [{ lower: 1, length: cells.length }] : [],
      bitmap = cells.includes('null'),
    ): OwnedArrayInputPayload => ({
      elementType: 'pg_catalog.aclitem',
      elementKind: 46,
      dimensions,
      elements: cells.map((v) =>
        v === 'null' ? { kind: 'Null' } : { kind: 'Aclitem', value: v === 'a' ? a : wide },
      ),
      nullBitmap: { kind: 'Value', value: bitmap },
    })
  const forms: Record<string, string> = {
    covers: 'aclcontains(items,probe)',
    exact: 'items @> ARRAY[probe]',
    same: 'items=reference',
    hashed: 'hash_array(items)=hash_array(reference)',
    position: 'array_position(items,probe) IS NOT DISTINCT FROM 1',
    projected: '((ROW(probe,items)::public_acl_bundle).entries) IS NOT DISTINCT FROM items',
  }
  try {
    await pg.exec(
      'CREATE TYPE public_acl_bundle AS(entry aclitem,entries aclitem[]);' +
        `CREATE TABLE owned_acls(items aclitem[],probe aclitem,reference aclitem[],${Object.entries(
          forms,
        )
          .map(([n, s]) => `CONSTRAINT ${n} CHECK(${s})`)
          .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'owned_acls')!,
      samples = [
        { sql: `ARRAY[${wideSql}]`, value: array(['wide']), probe: a, probeSql: aSql },
        { sql: `ARRAY[${aSql}]`, value: array(['a']), probe: wide, probeSql: wideSql },
        {
          sql: `ARRAY[${aSql},NULL::aclitem]`,
          value: array(['a', 'null']),
          probe: a,
          probeSql: aSql,
        },
        { sql: 'ARRAY[]::aclitem[]', value: array([]), probe: a, probeSql: aSql },
        {
          sql: `ARRAY[[${wideSql}]]`,
          value: array(
            ['wide'],
            [
              { lower: 1, length: 1 },
              { lower: 1, length: 1 },
            ],
          ),
          probe: a,
          probeSql: aSql,
        },
        {
          sql: `(ARRAY[${wideSql},NULL::aclitem])[1:1]`,
          value: array(['wide'], [{ lower: 1, length: 1 }], true),
          probe: a,
          probeSql: aSql,
        },
        {
          sql: `ARRAY[${wideSql}]`,
          value: array(['wide']),
          probe: null,
          probeSql: 'NULL::aclitem',
        },
        { sql: 'NULL::aclitem[]', value: null, probe: a, probeSql: aSql },
      ]
    const cases = []
    for (const s of samples) {
      const expected: Record<string, { certain: boolean; value?: boolean | null; error?: string }> =
        {}
      for (const [name, sql] of Object.entries(forms)) {
        try {
          expected[name] = {
            certain: true,
            value: (
              await pg.query<{ v: boolean | null }>(
                `SELECT ${sql} v FROM(SELECT ${s.sql} items,${s.probeSql} probe,ARRAY[${wideSql}] reference) q`,
              )
            ).rows[0]!.v,
          }
        } catch (error) {
          expected[name] = { certain: true, error: (error as { code: string }).code }
        }
      }
      cases.push({
        row: {
          items: s.value === null ? { kind: 'Null' } : { kind: 'Value', value: s.value },
          probe: s.probe === null ? { kind: 'Null' } : { kind: 'Value', value: s.probe },
          reference: { kind: 'Value', value: array(['wide']) },
        },
        expected,
      })
    }
    const tsBundle = renderTypescriptSchemaCheckArtifacts([table], catalog.domains, [], {
        compositeTypeGraph: catalog.compositeTypeGraph,
        rangeTypes: catalog.rangeTypes,
      }),
      tsRoot = join(root, 'typescript')
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
            .evaluatePublicOwnedAclsChecks(row)
            .map((c: { constraint: string; result: unknown }) => [c.constraint, c.result]),
        )
    for (const c of cases) expect(evaluate(c.row)).toEqual(c.expected)
    const unknownBitmap = { ...array(['wide']), nullBitmap: { kind: 'Unknown' } }
    expect(
      evaluate({ ...cases[0]!.row, items: { kind: 'Value', value: unknownBitmap } }).covers,
    ).toEqual({ certain: false })
    for (const field of ['grantee', 'grantor', 'privileges', 'grantOptions'])
      for (const invalid of [-1n, 4294967296n, 1.5, '2']) {
        const value = {
          ...array(['wide']),
          elements: [{ kind: 'Aclitem', value: { ...wide, [field]: invalid } }],
        }
        expect(evaluate({ ...cases[0]!.row, items: { kind: 'Value', value } }).covers).toEqual({
          certain: false,
        })
        expect(evaluate({ ...cases[0]!.row, items: { kind: 'Value', value } }).same).toEqual({
          certain: false,
        })
      }
    const goRoot = join(root, 'go'),
      goBundle = renderGoSchemaCheckArtifacts(
        [table],
        'checks',
        catalog.domains,
        [],
        catalog,
        parseConfigString('schema: schema.sql\nsql:\n  codegen:\n    go: {}\n'),
        undefined,
        'acl-owned',
      )
    await mkdir(goRoot)
    await writeFile(join(goRoot, 'go.mod'), 'module acl-owned\n\ngo 1.25\n')
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
    const goAcl = (p: typeof a) =>
        `checkruntime.MakeAclitemValue(${p.grantee},${p.grantor},${p.privileges},${p.grantOptions})`,
      goArray = (p: OwnedArrayInputPayload) =>
        `checkruntime.MakeArrayValue(checkruntime.ArrayPayload{ElementType:"pg_catalog.aclitem",ElementKind:46,Dimensions:[]checkruntime.ArrayDimension{${p.dimensions.map((d) => `{Lower:${d.lower},Length:${d.length}}`).join(',')}},Elements:[]checkruntime.ArrayElement{${p.elements.map((c) => (c.kind === 'Null' ? 'checkruntime.ArrayElement{Kind:checkruntime.ArrayElementNull}' : c.kind === 'Aclitem' ? `checkruntime.ArrayElementFromAclitem(${goAcl(c.value)})` : '')).join(',')}},NullBitmap:checkruntime.BoolValue{Kind:checkruntime.BoolValueValue,Value:${p.nullBitmap.kind === 'Value' && p.nullBitmap.value}}})`
    const rows = samples.map(
        (s) =>
          `PublicOwnedAclsCheckInput{Items:KnownCheckValue(${s.value === null ? 'checkruntime.ArrayNull()' : goArray(s.value)}),Probe:KnownCheckValue(${s.probe === null ? 'checkruntime.AclitemNull()' : goAcl(s.probe)}),Reference:KnownCheckValue(${goArray(array(['wide']))})}`,
      ),
      assertions = cases.flatMap((c, i) =>
        Object.entries(c.expected).map(
          ([name, r]) =>
            `if r:=results[${i}]["${name}"]; ${r.error ? `!r.Certain||r.Value.Error!="${r.error}"` : r.value === null ? '!r.Certain||r.Value.Valid' : `!r.Certain||!r.Value.Valid||r.Value.Value!=${r.value}`} {t.Fatalf("${i} ${name}: %+v",r)}`,
        ),
      )
    await writeFile(
      join(goRoot, 'checks_test.go'),
      `package checks
import("testing";checkruntime "acl-owned/checkrust/checkruntime")
func TestArrays(t *testing.T){rows:=[]PublicOwnedAclsCheckInput{${rows.join(',')}};results:=[]map[string]EvalBool{};for _,row:=range rows{values:=map[string]EvalBool{};for _,c:=range EvaluatePublicOwnedAclsChecks(row){values[c.Constraint]=c.Result};results=append(results,values)}
${assertions.join('\n')}
base:=rows[0];bad:=base.Items.V;bad.Value.Elements=append([]checkruntime.ArrayElement(nil),bad.Value.Elements...);bad.Value.Elements[0].Aclitem.Privileges=-1;base.Items=KnownCheckValue(bad);for _,c:=range EvaluatePublicOwnedAclsChecks(base){if(c.Constraint=="covers"||c.Constraint=="same")&&c.Result.Certain{t.Fatal("malformed ACL array accepted",c)}}
base=rows[0];missing:=base.Items.V;missing.Value.NullBitmap=checkruntime.BoolValue{};base.Items=KnownCheckValue(missing);for _,c:=range EvaluatePublicOwnedAclsChecks(base){if c.Constraint=="covers"&&c.Result.Certain{t.Fatal("unknown bitmap became definite",c)}}
}`,
    )
    await run('go', ['test', '-p', '1', './...'], { cwd: goRoot }).catch(
      (e: { stdout: string; stderr: string }) => {
        throw new Error(e.stdout + e.stderr)
      },
    )
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'public-reference.json'),
      JSON.stringify(
        {
          nativeRows: samples.length,
          publicRowsPerTarget: cases.length,
          malformedTypeScriptRows: 16,
          bitmapRequirementTested: true,
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

it('preserves NULL and empty ACL array text forms and defers role-name conversion', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-aclitem-array-io-')),
    packet = 'artifacts/goal-checks/aclitem-arrays-active'
  try {
    await pg.exec('CREATE ROLE acl_array_reader;CREATE ROLE acl_array_owner;SET array_nulls=on')
    const forms = {
      absent: 'source::aclitem[] IS NULL',
      size: 'cardinality(source::aclitem[]) IS NOT DISTINCT FROM expected_size',
      output: '(source::aclitem[])::text IS NOT DISTINCT FROM expected_text',
    }
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE acl_io_${name}(source text,expected_size int,expected_text text,bypass boolean,CONSTRAINT rule CHECK(CASE WHEN bypass THEN true ELSE ${sql} END))`,
      )
    const catalog = await snapshotCatalog(pg),
      checks = Object.entries(forms).flatMap(([name, sql]) => {
        const table = catalog.tables.find((t) => t.name === 'acl_io_' + name)!,
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
            )!.expression,
          ),
        }))
      }),
      group = prepareCheckRustGroup(checks, { arrayNulls: true })
    group.checks.forEach((c, i) =>
      expect(c.kind, checks[i]!.identity.constraint + ('reason' in c ? ': ' + c.reason : '')).toBe(
        'supported',
      ),
    )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    let nativeInserts = 0
    for (const source of [
      null,
      '{}',
      '{NULL}',
      '{NULL,NULL}',
      '[0:0]={NULL}',
      '{acl_array_reader=r/acl_array_owner}',
      '{',
      '{NULL,}',
    ]) {
      let normalized: string | null = null,
        size: number | null = null
      try {
        const v = (
          await pg.query<{ text: string | null; size: number | null }>(
            'SELECT ($1::aclitem[])::text text,cardinality($1::aclitem[]) size',
            [source],
          )
        ).rows[0]!
        normalized = v.text
        size = v.size
      } catch {}
      const row: Row = {
        source: source === null ? { kind: 'Null' } : { kind: 'Value', value: source },
        expected_size: size === null ? { kind: 'Null' } : { kind: 'Value', value: size },
        expected_text:
          normalized === null ? { kind: 'Null' } : { kind: 'Value', value: normalized },
        bypass: { kind: 'Value', value: false },
      }
      for (const [name, sql] of Object.entries(forms)) {
        let expected: Outcome
        try {
          const v = (
            await pg.query<{ v: boolean | null }>(
              `SELECT ${sql} v FROM (SELECT $1::text source,$2::int expected_size,$3::text expected_text) q`,
              [source, size, normalized],
            )
          ).rows[0]!.v
          expected = { kind: v === null ? 'Null' : v ? 'True' : 'False' }
        } catch (e) {
          expected = { kind: 'Error', value: { state: parseInt((e as { code: string }).code, 36) } }
        }
        let rejection: string | undefined
        try {
          await pg.query(`INSERT INTO acl_io_${name} VALUES($1,$2,$3,false)`, [
            source,
            size,
            normalized,
          ])
        } catch (e) {
          rejection = (e as { code: string }).code
        }
        expect(rejection).toBe(
          expected.kind === 'False'
            ? '23514'
            : expected.kind === 'Error'
              ? expected.value.state.toString(36).toUpperCase().padStart(5, '0')
              : undefined,
        )
        nativeInserts++
        for (const origin of ['source', 'stored']) {
          fixtures.push({
            name: name + '_' + origin,
            row,
            expected: source?.includes('acl_array_reader') ? { kind: 'Unknown' } : expected,
          })
          fixtures.push({
            name: name + '_' + origin,
            row: { ...row, bypass: { kind: 'Value', value: true } },
            expected: { kind: 'True' },
          })
        }
      }
    }
    await runCheckParity(
      root,
      'aclitemarrayio',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
    await writeFile(
      join(packet, 'io-reference.json'),
      JSON.stringify(
        { nativeInserts, fixtures: fixtures.length, roleNameConversionDeferred: true },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 300_000)
