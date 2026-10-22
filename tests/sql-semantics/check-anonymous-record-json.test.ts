import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

it('converts anonymous row layouts through nested JSON, heterogeneous arrays, selected branches and eager errors', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-anonymous-record-json-')),
    artifact = 'artifacts/goal-checks/anonymous-record-json-active'
  try {
    await pg.exec(
      `CREATE TYPE phase AS ENUM('z','a');CREATE TYPE leaf AS(n int4,t text);CREATE DOMAIN nonnegative AS int4 CHECK(VALUE>=0);`,
    )
    const row = `ROW(n,t,phase,'{ "x":1,"x":2 }'::json,ROW(n+1,NULL),ARRAY[n,2])`
    const deep = Array.from({ length: 20 }).reduce<string>((value) => `ROW(${value})`, 'n')
    const nestedContainers = Array.from({ length: 8 }).reduce<string>(
      (value) => `ROW(ARRAY[${value}])`,
      'n',
    )
    const forms: Record<string, string> = {
      row: `row_to_json(${row})::text`,
      pretty: `row_to_json(${row},pretty)::text`,
      json: `to_json(${row})::text`,
      binary: `to_jsonb(${row})::text`,
      array: `json_build_array(${row},ROW(t))::text`,
      binary_object: `jsonb_build_object('row',${row})::text`,
      key: 'json_build_object(ROW(n,phase),1)::text',
      binary_key: 'jsonb_build_object(ROW(n,phase),1)::text',
      empty: 'row_to_json(ROW(),pretty)::text',
      unknown_fields: `to_json(ROW('x',NULL,1.20))::text`,
      selected: 'row_to_json(CASE WHEN pick THEN ROW(n,t) ELSE ROW(t) END)::text',
      nullable: 'to_json(CASE WHEN pick THEN ROW(n,t) END)::text',
      coalesced: 'to_json(COALESCE(CASE WHEN pick THEN ROW(n,t) END,ROW(t,n/divisor)))::text',
      heterogeneous: 'to_json(ARRAY[ROW(n),ROW(t,phase),ROW()])::text',
      binary_heterogeneous: 'to_jsonb(ARRAY[ROW(n),ROW(t,phase),ROW()])::text',
      multidimensional:
        "array_to_json(ARRAY[ARRAY[ROW(n),ROW(t)],ARRAY[ROW(n+1),ROW(t||'x')]],pretty)::text",
      variadic: 'json_build_array(VARIADIC ARRAY[ROW(n),ROW(t,phase)])::text',
      variadic_object: 'json_build_object(VARIADIC ARRAY[ROW(n),ROW(t)])::text',
      named: "to_json(ROW(ROW(n,t)::leaf,ARRAY[ROW(n,t)::leaf],ROW('x',n)))::text",
      domain: 'to_json(ROW(n::nonnegative,t))::text',
      eager: 'jsonb_build_array(ROW(n/divisor),1/divisor)::text',
      null_logic:
        'json_build_array(ROW(n,t) IS NULL,ROW(n,t) IS NOT NULL,ROW(1,n/divisor) IS NULL,ROW(NULL,n/divisor) IS NOT NULL)::text',
      appended: 'to_json(array_append(ARRAY[ROW(n)],ROW(t,phase)))::text',
      subscript: 'to_json((ARRAY[ROW(n),ROW(t,phase)])[2])::text',
      selected_array:
        'to_json(CASE WHEN pick THEN ARRAY[ROW(n)] ELSE ARRAY[ROW(t,phase)] END)::text',
      null_array: 'array_to_json(ARRAY[NULL::record])::text',
      null_record: 'row_to_json(NULL::record)::text',
      coalesced_null: 'to_json(COALESCE(NULL::record,ROW(n),ROW(n/divisor)))::text',
      deep: `to_json(${deep})::text`,
      nested_containers: `to_json(${nestedContainers})::text`,
      containers: 'to_json(ROW(ARRAY[ROW(n),ROW(t,phase)],ROW(ARRAY[ROW(phase)])))::text',
    }
    for (const [name, expression] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE gate_${name}(n int4,t text,phase phase,divisor int4,pick bool,pretty bool,skip bool,expected text,CONSTRAINT valid CHECK(CASE WHEN skip THEN true ELSE (${expression}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END))`,
      )
    await pg.exec(
      'CREATE TABLE oracle(n int4,t text,phase phase,divisor int4,pick bool,pretty bool)',
    )
    const catalog = await snapshotCatalog(pg),
      plans = Object.keys(forms).flatMap((name) => {
        const table = catalog.tables.find((t) => t.name === 'gate_' + name)!,
          constraint = table.constraints.find((c) => c.name === 'valid')!
        return (['source', 'stored'] as const).map((origin) => ({
          name: name + '_' + origin,
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: origin,
          },
          expression: lowerTableCheck(
            table,
            origin === 'source'
              ? {
                  ...constraint,
                  definition: `CHECK(CASE WHEN skip THEN true ELSE (${forms[name]}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END)`,
                }
              : constraint,
            catalog.enums,
            catalog.domains,
            origin,
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
          )!.expression,
        }))
      }),
      group = prepareCheckRustGroup(plans, {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        arrayNulls: true,
      })
    await mkdir(artifact, { recursive: true })
    await writeFile(
      join(artifact, 'plans.json'),
      JSON.stringify({ plans, checks: group.checks }, null, 2),
    )
    for (const [index, check] of group.checks.entries())
      expect(check.kind, plans[index]!.name + ': ' + JSON.stringify(check)).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    const samples = [
      [2, 'snow😊', 'z', 1, true, false],
      [3, 'a"b', 'a', 0, false, true],
      [-1, null, null, 1, false, null],
      [null, null, null, 0, true, true],
    ] as const
    const known = (value: number | string | boolean | null) =>
      value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }
    for (const [n, t, phase, divisor, pick, pretty] of samples) {
      await pg.exec('TRUNCATE oracle')
      await pg.query('INSERT INTO oracle VALUES($1,$2,$3,$4,$5,$6)', [
        n,
        t,
        phase,
        divisor,
        pick,
        pretty,
      ])
      const row: Row = {
        n: known(n),
        t: known(t),
        phase: phase === null ? known(null) : known(phase === 'z' ? 0 : 1),
        divisor: known(divisor),
        pick: known(pick),
        pretty: known(pretty),
      }
      for (const [name, expression] of Object.entries(forms)) {
        let output: string | null = null,
          error: string | undefined
        try {
          output = (
            await pg.query<{ value: string | null }>(`SELECT ${expression} value FROM oracle`)
          ).rows[0]!.value
        } catch (e) {
          error = (e as { code: string }).code
        }
        for (const skip of [false, true])
          for (const wrong of [false, true]) {
            const expectedText = wrong ? 'wrong' : output,
              code = skip ? undefined : (error ?? (wrong ? '23514' : undefined))
            const insert = pg.query(
              `INSERT INTO gate_${name} SELECT n,t,phase,divisor,pick,pretty,$1,$2 FROM oracle`,
              [skip, expectedText],
            )
            if (code) await expect(insert).rejects.toMatchObject({ code })
            else await insert
            const expected: Outcome = skip
              ? { kind: 'True' }
              : error
                ? { kind: 'Error', value: { state: parseInt(error, 36) } }
                : wrong
                  ? { kind: 'False' }
                  : { kind: 'True' }
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: name + '_' + origin,
                row: { ...row, skip: known(skip), expected: known(expectedText) },
                expected,
              })
            reference.push({ name, n, t, phase, divisor, pick, pretty, skip, wrong, output, error })
          }
      }
    }
    await runCheckParity(
      root,
      'anonymousrecordjson',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
    await writeFile(
      join(artifact, 'report.json'),
      JSON.stringify(
        { fixtures: fixtures.length, nativeInserts: reference.length, reference },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)

it('defers reached anonymous enum casts while preserving selected layouts, NULL fields, key errors and eager argument errors', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-anonymous-record-json-casts-')),
    artifact = 'artifacts/goal-checks/anonymous-record-json-active'
  try {
    await pg.exec(
      `CREATE TYPE phase AS ENUM('z','a');CREATE FUNCTION phase_json(phase) RETURNS json LANGUAGE sql IMMUTABLE STRICT AS $$SELECT json_build_object('cast',$1::text)$$;CREATE CAST(phase AS json) WITH FUNCTION phase_json(phase);`,
    )
    const forms: Record<string, { sql: string; reaches: (pick: boolean) => boolean }> = {
      direct: { sql: 'to_json(ROW(n,phase))::text', reaches: () => true },
      binary: { sql: 'to_jsonb(ROW(n,phase))::text', reaches: () => true },
      array: { sql: 'array_to_json(ARRAY[ROW(phase),ROW(n)])::text', reaches: () => true },
      selected: {
        sql: 'row_to_json(CASE WHEN pick THEN ROW(n) ELSE ROW(phase) END)::text',
        reaches: (pick) => !pick,
      },
      eager: { sql: 'jsonb_build_array(ROW(phase),1/n)::text', reaches: () => true },
      key: {
        sql: 'json_build_object(VARIADIC ARRAY[ROW(phase),ROW(n)])::text',
        reaches: () => false,
      },
      nested: { sql: 'to_json(ROW(ARRAY[phase],ROW(n)))::text', reaches: () => true },
    }
    for (const [name, form] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE gate_${name}(n int4,phase phase,pick bool,skip bool,expected text,CONSTRAINT valid CHECK(CASE WHEN skip THEN true ELSE (${form.sql}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END))`,
      )
    await pg.exec('CREATE TABLE oracle(n int4,phase phase,pick bool)')
    const catalog = await snapshotCatalog(pg),
      plans = Object.keys(forms).flatMap((name) => {
        const table = catalog.tables.find((t) => t.name === 'gate_' + name)!,
          constraint = table.constraints.find((c) => c.name === 'valid')!
        return (['source', 'stored'] as const).map((origin) => ({
          name: name + '_' + origin,
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: origin,
          },
          expression: lowerTableCheck(
            table,
            origin === 'source'
              ? {
                  ...constraint,
                  definition: `CHECK(CASE WHEN skip THEN true ELSE (${forms[name]!.sql}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END)`,
                }
              : constraint,
            catalog.enums,
            catalog.domains,
            origin,
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
          )!.expression,
        }))
      }),
      group = prepareCheckRustGroup(plans, {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        arrayNulls: true,
      })
    for (const [index, check] of group.checks.entries())
      expect(check.kind, plans[index]!.name + ': ' + JSON.stringify(check)).toBe('supported')
    const descriptors = new Set<string>()
    const visit = (value: unknown): void => {
      if (typeof value === 'string' && value.startsWith('anonymous-record:')) descriptors.add(value)
      else if (value && typeof value === 'object')
        for (const child of Object.values(value)) visit(child)
    }
    visit(plans)
    expect(descriptors.size).toBeGreaterThan(0)
    for (const descriptor of descriptors) {
      expect(descriptor).not.toContain('valueOids')
      expect(descriptor).not.toContain('"oid":')
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    const samples = [
      [1, null, false],
      [1, 'z', true],
      [1, 'a', false],
      [0, 'z', true],
      [0, null, true],
    ] as const
    for (const [n, phase, pick] of samples) {
      await pg.exec('TRUNCATE oracle')
      await pg.query('INSERT INTO oracle VALUES($1,$2,$3)', [n, phase, pick])
      for (const [name, form] of Object.entries(forms)) {
        let output: string | null = null,
          error: string | undefined
        try {
          output = (
            await pg.query<{ value: string | null }>(`SELECT ${form.sql} value FROM oracle`)
          ).rows[0]!.value
        } catch (e) {
          error = (e as { code: string }).code
        }
        for (const skip of [false, true]) {
          const insert = pg.query(
            `INSERT INTO gate_${name} SELECT n,phase,pick,$1,$2 FROM oracle`,
            [skip, output],
          )
          if (!skip && error) await expect(insert).rejects.toMatchObject({ code: error })
          else await insert
          const expected: Outcome = skip
            ? { kind: 'True' }
            : error
              ? { kind: 'Error', value: { state: parseInt(error, 36) } }
              : phase !== null && form.reaches(pick)
                ? { kind: 'Unknown' }
                : { kind: 'True' }
          const row: Row = {
            n: { kind: 'Value', value: n },
            phase:
              phase === null ? { kind: 'Null' } : { kind: 'Value', value: phase === 'z' ? 0 : 1 },
            pick: { kind: 'Value', value: pick },
            skip: { kind: 'Value', value: skip },
            expected: output === null ? { kind: 'Null' } : { kind: 'Value', value: output },
          }
          for (const origin of ['source', 'stored'])
            fixtures.push({ name: name + '_' + origin, row, expected })
          reference.push({ name, n, phase, pick, skip, output, error, expected })
        }
      }
    }
    await runCheckParity(
      root,
      'anonymousrecordcasts',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
    await writeFile(
      join(artifact, 'casts-report.json'),
      JSON.stringify(
        { fixtures: fixtures.length, nativeInserts: reference.length, reference },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
