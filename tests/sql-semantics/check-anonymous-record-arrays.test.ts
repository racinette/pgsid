import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { readCatalogCompositeTypes } from '../../src/postgres/composite-types.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

it('captures source-only record field callbacks and default-expression dependencies without executing callbacks', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-anonymous-record-array-context-')),
    packet = 'artifacts/goal-checks/anonymous-record-arrays-active'
  try {
    await pg.exec(`CREATE FUNCTION custom_json_eq(json,json) RETURNS bool LANGUAGE plpgsql IMMUTABLE STRICT AS $$BEGIN RAISE EXCEPTION 'callback reached'; END$$;
CREATE FUNCTION custom_json_cmp(json,json) RETURNS int4 LANGUAGE plpgsql IMMUTABLE STRICT AS $$BEGIN RAISE EXCEPTION 'callback reached'; END$$;
CREATE OPERATOR = (LEFTARG=json,RIGHTARG=json,FUNCTION=custom_json_eq);
CREATE OPERATOR CLASS custom_json DEFAULT FOR TYPE json USING btree AS OPERATOR 3 =(json,json),FUNCTION 1 custom_json_cmp(json,json);
CREATE SCHEMA defaults_only;
CREATE FUNCTION defaults_only.probe(a xml DEFAULT NULL::xml) RETURNS bool LANGUAGE sql IMMUTABLE AS 'SELECT true';`)
    const forms = {
        order: 'btrecordcmp(ROW(n,v::json),ROW(m,w::json))<0',
        any: 'ROW(n,v::json)=ANY(ARRAY[ROW(m,w::json)])',
        null_any: 'ROW(n,NULL::json)=ANY(ARRAY[ROW(m,NULL::json)])',
      },
      sql = (body: string) => `CASE WHEN bypass THEN true ELSE ${body} END`
    for (const [name, body] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE context_${name}(n int,m int,v text,w text,bypass bool,CHECK(${sql(body)}))`,
      )
    const graph = await readCatalogCompositeTypes(pg, ['public']),
      json = graph.definitions.find((node) => node.schema === 'pg_catalog' && node.name === 'json')!
    expect(json.comparison).toMatchObject({
      equalityAvailable: true,
      comparisonAvailable: true,
      equalityImplementation: `function:["public","custom_json_eq"](${json.identity},${json.identity})`,
      comparator: `function:["public","custom_json_cmp"](${json.identity},${json.identity})`,
    })
    expect(graph.definitions.some((node) => node.name === 'xml')).toBe(false)
    expect(
      (await readCatalogCompositeTypes(pg, ['defaults_only'])).definitions.some(
        (node) => node.name === 'xml',
      ),
    ).toBe(true)
    expect(await readCatalogCompositeTypes(pg, [])).toEqual({ roots: [], definitions: [] })
    const catalog = await snapshotCatalog(pg),
      plans = Object.entries(forms).flatMap(([name, body]) => {
        const table = catalog.tables.find((t) => t.name === 'context_' + name)!
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
              table.constraints[0]!,
              [],
              [],
              origin,
              catalog.rangeTypes,
              catalog.compositeTypeGraph,
              origin === 'source' ? `CHECK(${sql(body)})` : undefined,
            )!.expression,
          ),
        }))
      }),
      group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' }),
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    group.checks.forEach((c) => expect(c.kind, 'reason' in c ? c.reason : '').toBe('supported'))
    const samples = [
      [1, 2, '{}', '{}'],
      [1, 1, '{}', '{}'],
      [2, 1, '{}', '{}'],
      [1, 1, null, null],
      [1, 1, '{}', null],
      [null, null, '{}', '{}'],
      [null, 1, '{}', '{}'],
      [1, 1, 'bad', '{}'],
    ] as const
    const known = (value: string | number | boolean | null): Input =>
      value === null ? { kind: 'Null' } : { kind: 'Value', value }
    for (const [n, m, v, w] of samples)
      for (const bypass of [false, true])
        for (const name of Object.keys(forms)) {
          let failure: string | undefined
          try {
            await pg.query(`INSERT INTO context_${name} VALUES($1,$2,$3,$4,$5)`, [
              n,
              m,
              v,
              w,
              bypass,
            ])
          } catch (e) {
            failure = (e as { code: string }).code
          }
          const expected: Outcome =
              failure === 'P0001'
                ? { kind: 'Unknown' }
                : failure && failure !== '23514'
                  ? { kind: 'Error', value: { state: parseInt(failure, 36) } }
                  : { kind: failure ? 'False' : 'True' },
            row: Row = { n: known(n), m: known(m), v: known(v), w: known(w), bypass: known(bypass) }
          for (const origin of ['source', 'stored'])
            fixtures.push({ name: name + '_' + origin, row, expected })
          references.push({ name, n, m, v, w, bypass, failure })
        }
    for (const origin of ['source', 'stored'])
      fixtures.push({
        name: 'any_' + origin,
        row: {
          n: { kind: 'Unknown' },
          m: known(1),
          v: known('{}'),
          w: known('{}'),
          bypass: known(false),
        },
        expected: { kind: 'Unknown' },
      })
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/context-reference.json',
      JSON.stringify(
        { nativeInserts: references.length, fixtures: fixtures.length, references },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      root,
      'anonymousrecordarrays',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)

it('evaluates anonymous record array quantifiers, searches, transformations, sorting, extrema and buckets against native INSERTs', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-anonymous-record-arrays-')),
    packet = 'artifacts/goal-checks/anonymous-record-arrays-active'
  const known = (value: string | number | boolean | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  try {
    const needle = 'ROW(n,t COLLATE "C")',
      other = 'ROW(m,u COLLATE "C")',
      values = `ARRAY[${other},${needle},NULL::record]`
    const forms: Record<string, string> = {
      any: `${needle}=ANY(${values})`,
      any_null: `${needle}=ANY(ARRAY[${other},NULL::record])`,
      all: `${needle}=ALL(${values})`,
      unequal_all: `${needle}<>ALL(ARRAY[${other}])`,
      empty_any: `${needle}=ANY(ARRAY[]::record[])`,
      empty_all: `${needle}=ALL(ARRAY[]::record[])`,
      any_skip_shape: `${needle}=ANY(ARRAY[${needle},ROW(n)])`,
      any_reached_shape: `${needle}=ANY(ARRAY[ROW(n),${needle}])`,
      all_skip_shape: `${needle}=ALL(ARRAY[ROW(n+1),ROW(n)])`,
      position: `array_position(${values},${needle})`,
      position_start: `array_position(${values},${needle},divisor)`,
      positions: `array_positions(${values},${needle})`,
      null_position: `array_position(${values},NULL::record)`,
      remove: `to_jsonb(array_remove(${values},${needle}))`,
      replace: `to_jsonb(array_replace(${values},${needle},ROW(n+1,t COLLATE "C")))`,
      contains: `${values}@>ARRAY[${needle}]`,
      contained: `ARRAY[${needle}]<@${values}`,
      overlap: `ARRAY[${needle}]&&ARRAY[${other}]`,
      sort: `to_jsonb(array_sort(${values}))`,
      sort_descending: `to_jsonb(array_sort(${values},pick))`,
      sort_flags: `to_jsonb(array_sort(${values},pick,NOT pick))`,
      sort_shapes: 'to_jsonb(array_sort(ARRAY[ROW(n),ROW(m,u COLLATE "C")]))',
      larger: `to_jsonb(array_larger(${values},ARRAY[${needle}]))`,
      smaller: `to_jsonb(array_smaller(${values},ARRAY[${needle}]))`,
      larger_shapes: 'to_jsonb(array_larger(ARRAY[ROW(n)],ARRAY[ROW(m,u COLLATE "C")]))',
      bucket: `width_bucket(${needle},ARRAY[ROW(0,''::text COLLATE "C"),ROW(10,''::text COLLATE "C")])`,
      bucket_shapes: 'width_bucket(ROW(n),ARRAY[ROW(0),ROW(10,u COLLATE "C")])',
      bucket_null: `width_bucket(${needle},ARRAY[${other},NULL::record])`,
      search_shapes: 'array_position(ARRAY[ROW(n),ROW(m,u COLLATE "C")],ROW(n))',
      multidimensional: `array_position(ARRAY[ARRAY[${needle}],ARRAY[${other}]],${needle})`,
    }
    const columns = 'n int4,m int4,t text,u text,divisor int4,pick bool,expected text,bypass bool',
      check = (body: string) =>
        `CASE WHEN bypass THEN true ELSE (${body})::text IS NOT DISTINCT FROM expected END`
    for (const [name, body] of Object.entries(forms))
      await pg.exec(`CREATE TABLE anon_${name}(${columns},CONSTRAINT rule CHECK(${check(body)}))`)
    await pg.exec(`CREATE TEMP TABLE inputs(${columns})`)
    const catalog = await snapshotCatalog(pg),
      plans = Object.entries(forms).flatMap(([name, body]) => {
        const table = catalog.tables.find((t) => t.name === 'anon_' + name)!,
          constraint = table.constraints[0]!
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
              constraint,
              catalog.enums,
              catalog.domains,
              origin,
              catalog.rangeTypes,
              catalog.compositeTypeGraph,
              origin === 'source' ? `CHECK(${check(body)})` : undefined,
            )!.expression,
          ),
        }))
      }),
      group = prepareCheckRustGroup(plans, {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        arrayNulls: true,
      })
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/preparation.json',
      JSON.stringify(
        group.checks.map((c, i) => ({ name: plans[i]!.identity.constraint, ...c })),
        null,
        2,
      ) + '\n',
    )
    expect(
      plans.filter((plan) => hasUncertain(plan.expression)).map((plan) => plan.identity.constraint),
    ).toEqual([])
    group.checks.forEach((c, i) =>
      expect(c.kind, plans[i]!.identity.constraint + ('reason' in c ? ': ' + c.reason : '')).toBe(
        'supported',
      ),
    )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    const samples = [
      [1, 2, 'x', 'y', 1, true],
      [1, 1, 'x', 'x', 1, false],
      [null, null, null, 'x', 1, true],
      [2, 2, null, null, 0, false],
      [-1, 2, 'x', 'x', 1, false],
      [null, 1, 'y', 'x', 0, true],
      [1, 1, 'x', 'y', 1, true],
      [2, 1, 'é', '日本', -2, false],
    ] as const
    for (const sample of samples)
      for (const variant of [0, 1, 2]) {
        const bypass = variant === 2
        await pg.exec('DELETE FROM inputs')
        await pg.query('INSERT INTO inputs VALUES($1,$2,$3,$4,$5,$6,NULL,$7)', [...sample, bypass])
        for (const [name, body] of Object.entries(forms)) {
          await pg.exec('UPDATE inputs SET expected=NULL')
          try {
            await pg.exec(
              `UPDATE inputs SET expected=${variant === 1 ? "'wrong'" : `(${body})::text`}`,
            )
          } catch {}
          const expectedText = (
            await pg.query<{ expected: string | null }>('SELECT expected FROM inputs')
          ).rows[0]!.expected
          let value: boolean | null = null,
            state: string | undefined,
            failure: string | undefined
          try {
            value = (await pg.query<{ v: boolean | null }>(`SELECT ${check(body)} v FROM inputs`))
              .rows[0]!.v
          } catch (e) {
            state = (e as { code: string }).code
          }
          try {
            await pg.exec(`INSERT INTO anon_${name} SELECT * FROM inputs`)
          } catch (e) {
            failure = (e as { code: string }).code
          }
          expect(failure).toBe(state ?? (value === false ? '23514' : undefined))
          const expected: Outcome = state
              ? { kind: 'Error', value: { state: parseInt(state, 36) } }
              : { kind: value === null ? 'Null' : value ? 'True' : 'False' },
            row: Row = Object.fromEntries([
              ...['n', 'm', 't', 'u', 'divisor', 'pick'].map((key, i) => [key, known(sample[i]!)]),
              ['expected', known(expectedText)],
              ['bypass', known(bypass)],
            ])
          for (const origin of ['source', 'stored'])
            fixtures.push({ name: name + '_' + origin, row, expected })
          references.push({ name, sample, variant, expectedText, value, state, failure })
        }
      }
    await writeFile(
      packet + '/reference.json',
      JSON.stringify(
        { nativeInserts: references.length, fixtures: fixtures.length, references },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      root,
      'anonymousrecordarrays',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)

it('retains empty and NULL quantifiers, eager record-array errors and useful partial sort shape', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-anonymous-record-array-state-')),
    packet = 'artifacts/goal-checks/anonymous-record-arrays-active'
  try {
    const forms = {
      empty_any: 'ROW(n)=ANY(ARRAY[]::record[])',
      empty_all: 'ROW(n)=ALL(ARRAY[]::record[])',
      null_array: 'ROW(n)=ANY(NULL::record[])',
      eager: 'ROW(n)=ANY(ARRAY[ROW(n),ROW(1/divisor)])',
      selected: 'ROW(n)=ANY(CASE WHEN pick THEN ARRAY[ROW(n)] ELSE ARRAY[ROW(m)] END)',
      sort_count: 'cardinality(array_sort(ARRAY[ROW(n),ROW(m)]))=2',
      search: 'array_position(ARRAY[ROW(n)],ROW(m)) IS NOT NULL',
      recover_any: 'ROW(1)=ANY(ARRAY[ROW(n),ROW(1)])',
      recover_all: 'ROW(1)=ALL(ARRAY[ROW(n),ROW(2)])',
      recover_order: 'ROW(1)>ANY(ARRAY[ROW(n),ROW(0)])',
      unsafe_shape: 'ROW(1)=ANY(ARRAY[ROW(n,1),ROW(1)])',
      unsafe_operator: "ROW(1,'{}'::json)>ANY(ARRAY[ROW(n,'{}'::json),ROW(0,'{}'::json)])",
    }
    const sql = (body: string) => `CASE WHEN bypass THEN true ELSE ${body} END`
    for (const [name, body] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE state_${name}(n int,m int,divisor int,pick bool,bypass bool,CHECK(${sql(body)}))`,
      )
    const catalog = await snapshotCatalog(pg),
      plans = Object.entries(forms).flatMap(([name, body]) => {
        const table = catalog.tables.find((t) => t.name === 'state_' + name)!
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
              table.constraints[0]!,
              [],
              [],
              origin,
              catalog.rangeTypes,
              catalog.compositeTypeGraph,
              origin === 'source' ? `CHECK(${sql(body)})` : undefined,
            )!.expression,
          ),
        }))
      }),
      group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' }),
      fixtures: { name: string; row: Row; expected: Outcome }[] = []
    group.checks.forEach((c) => expect(c.kind, 'reason' in c ? c.reason : '').toBe('supported'))
    for (const name of Object.keys(forms))
      for (const bypass of [false, true]) {
        let state: string | undefined
        try {
          await pg.query(`INSERT INTO state_${name} VALUES(1,2,0,true,$1)`, [bypass])
        } catch (e) {
          state = (e as { code: string }).code
        }
        expect(state).toBe(
          bypass
            ? undefined
            : name === 'eager'
              ? '22012'
              : name === 'unsafe_shape'
                ? '42804'
                : name === 'unsafe_operator'
                  ? '42883'
                  : ['empty_any', 'search', 'recover_all'].includes(name)
                    ? '23514'
                    : undefined,
        )
      }
    const value = (value: number | boolean): Input => ({ kind: 'Value', value }),
      unknown: Input = { kind: 'Unknown' },
      error: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } },
      base: Row = {
        n: value(1),
        m: value(2),
        divisor: value(1),
        pick: value(true),
        bypass: value(false),
      }
    const add = (name: string, patch: Row, expected: Outcome) => {
      for (const origin of ['source', 'stored'])
        fixtures.push(
          { name: name + '_' + origin, row: { ...base, ...patch }, expected },
          {
            name: name + '_' + origin,
            row: { ...base, ...patch, bypass: value(true) },
            expected: { kind: 'True' },
          },
        )
    }
    add('empty_any', { n: unknown }, { kind: 'False' })
    add('empty_all', { n: unknown }, { kind: 'True' })
    add('null_array', { n: unknown }, { kind: 'Null' })
    add(
      'eager',
      { n: unknown, divisor: value(0) },
      { kind: 'Error', value: { state: parseInt('22012', 36) } },
    )
    add('selected', { pick: unknown }, { kind: 'Unknown' })
    add('sort_count', { n: unknown }, { kind: 'True' })
    add('search', { n: unknown }, { kind: 'Unknown' })
    add('empty_any', { n: error }, { kind: 'Error', value: { state: parseInt('22012', 36) } })
    add('null_array', { n: error }, { kind: 'Error', value: { state: parseInt('22012', 36) } })
    add('recover_any', { n: unknown }, { kind: 'True' })
    add('recover_all', { n: unknown }, { kind: 'False' })
    add('recover_order', { n: unknown }, { kind: 'True' })
    add('unsafe_shape', { n: unknown }, { kind: 'Unknown' })
    add('unsafe_operator', { n: unknown }, { kind: 'Unknown' })
    await runCheckParity(
      root,
      'anonymousrecordarrays',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/state-validation.json',
      JSON.stringify(
        { nativeInserts: Object.keys(forms).length * 2, fixtures: fixtures.length },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)

it('preserves record-array cast controls and exact recursive sort ties while exposing memory-dependent representations', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-anonymous-record-array-controls-')),
    packet = 'artifacts/goal-checks/anonymous-record-arrays-active'
  const known = (value: string | number | boolean | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  try {
    const forms: Record<string, string> = {
      alias: 'ROW(n)=ANY((ARRAY[ROW(n)])::record[])',
      null_any: 'ROW(n)=ANY(NULL::record[])',
      null_all: 'ROW(n)=ALL(NULL::record[])',
      empty_sorted: 'to_jsonb(array_sort(ARRAY[]::record[]))',
      null_sorted: 'to_jsonb(array_sort(NULL::record[]))',
      null_entries: 'to_jsonb(array_sort(ARRAY[NULL::record,NULL::record]))',
      nested_tie: `to_jsonb(array_sort(ARRAY[ROW(ROW(1,'x'::text)),ROW(ROW(1,'x'::text))],pick))`,
      array_tie: 'to_jsonb(array_sort(ARRAY[ROW(ARRAY[1,2]),ROW(ARRAY[1,2])],pick))',
      numeric_tie: 'to_jsonb(array_sort(ARRAY[ROW(1.00::numeric),ROW(1.00::numeric)],pick))',
      different_scales: 'to_jsonb(array_sort(ARRAY[ROW(1.0::numeric),ROW(1.00::numeric)],pick))',
      different_count: 'cardinality(array_sort(ARRAY[ROW(1.0::numeric),ROW(1.00::numeric)],pick))',
    }
    const columns = 'n int4,m int4,t text,u text,divisor int4,pick bool,expected text,bypass bool',
      check = (body: string) =>
        `CASE WHEN bypass THEN true ELSE (${body})::text IS NOT DISTINCT FROM expected END`
    for (const [name, body] of Object.entries(forms))
      await pg.exec(`CREATE TABLE anon_${name}(${columns},CONSTRAINT rule CHECK(${check(body)}))`)
    await pg.exec(`CREATE TEMP TABLE inputs(${columns})`)
    const memoryReferences = []
    for (const memory of ['64kB', '64MB']) {
      await pg.exec(`SET work_mem='${memory}'`)
      memoryReferences.push({
        memory,
        ...(
          await pg.query<{ hash: string }>(
            "SELECT md5(array_sort(array_agg(ROW(('1.'||repeat('0',i%7))::numeric)))::text) hash FROM generate_series(1,10000) i",
          )
        ).rows[0]!,
      })
    }
    expect(memoryReferences[0]!.hash).not.toBe(memoryReferences[1]!.hash)
    await pg.exec('RESET work_mem')
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/tie-memory-native.json',
      JSON.stringify(memoryReferences, null, 2) + '\n',
    )
    const catalog = await snapshotCatalog(pg),
      plans = Object.entries(forms).flatMap(([name, body]) => {
        const table = catalog.tables.find((t) => t.name === 'anon_' + name)!,
          constraint = table.constraints[0]!
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
              constraint,
              catalog.enums,
              catalog.domains,
              origin,
              catalog.rangeTypes,
              catalog.compositeTypeGraph,
              origin === 'source' ? `CHECK(${check(body)})` : undefined,
            )!.expression,
          ),
        }))
      }),
      group = prepareCheckRustGroup(plans, {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        arrayNulls: true,
      })
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/controls-preparation.json',
      JSON.stringify(
        group.checks.map((c, i) => ({ name: plans[i]!.identity.constraint, ...c })),
        null,
        2,
      ) + '\n',
    )
    expect(
      plans.filter((plan) => hasUncertain(plan.expression)).map((plan) => plan.identity.constraint),
    ).toEqual([])
    group.checks.forEach((c, i) =>
      expect(c.kind, plans[i]!.identity.constraint + ('reason' in c ? ': ' + c.reason : '')).toBe(
        'supported',
      ),
    )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    const samples = [
      [1, 2, 'x', 'y', 1, false],
      [1, 2, 'x', 'y', 1, true],
      [1, 2, 'x', 'y', 1, null],
    ] as const
    for (const sample of samples)
      for (const variant of [0, 1, 2]) {
        const bypass = variant === 2
        await pg.exec('DELETE FROM inputs')
        await pg.query('INSERT INTO inputs VALUES($1,$2,$3,$4,$5,$6,NULL,$7)', [...sample, bypass])
        for (const [name, body] of Object.entries(forms)) {
          await pg.exec('UPDATE inputs SET expected=NULL')
          try {
            await pg.exec(
              `UPDATE inputs SET expected=${variant === 1 ? "'wrong'" : `(${body})::text`}`,
            )
          } catch {}
          const expectedText = (
            await pg.query<{ expected: string | null }>('SELECT expected FROM inputs')
          ).rows[0]!.expected
          let value: boolean | null = null,
            state: string | undefined,
            failure: string | undefined
          try {
            value = (await pg.query<{ v: boolean | null }>(`SELECT ${check(body)} v FROM inputs`))
              .rows[0]!.v
          } catch (e) {
            state = (e as { code: string }).code
          }
          try {
            await pg.exec(`INSERT INTO anon_${name} SELECT * FROM inputs`)
          } catch (e) {
            failure = (e as { code: string }).code
          }
          expect(failure).toBe(state ?? (value === false ? '23514' : undefined))
          const expected: Outcome =
              name === 'different_scales' && sample[5] !== null && !bypass
                ? { kind: 'Unknown' }
                : state
                  ? { kind: 'Error', value: { state: parseInt(state, 36) } }
                  : { kind: value === null ? 'Null' : value ? 'True' : 'False' },
            row: Row = Object.fromEntries([
              ...['n', 'm', 't', 'u', 'divisor', 'pick'].map((key, i) => [key, known(sample[i]!)]),
              ['expected', known(expectedText)],
              ['bypass', known(bypass)],
            ])
          for (const origin of ['source', 'stored'])
            fixtures.push({ name: name + '_' + origin, row, expected })
          references.push({ name, sample, variant, expectedText, value, state, failure })
        }
      }
    await writeFile(
      packet + '/controls-reference.json',
      JSON.stringify(
        { nativeInserts: references.length, fixtures: fixtures.length, references },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      root,
      'anonymousrecordarrays',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
