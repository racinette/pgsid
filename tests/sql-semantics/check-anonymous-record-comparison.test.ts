import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

it('compares expression-owned record layouts with native field identity, support lookup, NULL order and selected branches', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-anonymous-record-comparison-')),
    packet = 'artifacts/goal-checks/anonymous-record-comparison-active'
  const known = (value: string | number | boolean | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  try {
    await pg.exec(
      'CREATE TYPE pair AS(n int4,t text COLLATE "C");CREATE DOMAIN positive AS int4 CHECK(VALUE>=0)',
    )
    const left = 'ROW(n,t COLLATE "C")',
      right = 'ROW(m,u COLLATE "C")'
    const forms: Record<string, string> = Object.fromEntries(
      ['eq', 'ne', 'lt', 'le', 'gt', 'ge'].map((name) => [
        name,
        `pg_catalog.record_${name}(${left},${right})`,
      ]),
    )
    Object.assign(forms, {
      cmp: `pg_catalog.btrecordcmp(${left},${right})`,
      nested: 'pg_catalog.record_eq(ROW(n,ROW(t)),ROW(m,ROW(u)))',
      nested_cmp: 'pg_catalog.btrecordcmp(ROW(n,ROW(t COLLATE "C")),ROW(m,ROW(u COLLATE "C")))',
      mixed: `pg_catalog.record_eq(ROW(n,t)::pair,${right})`,
      mixed_reverse: `pg_catalog.btrecordcmp(${left},ROW(m,u)::pair)`,
      empty: 'pg_catalog.record_eq(ROW(),ROW())',
      null_record: `pg_catalog.record_eq(NULL::record,${right})`,
      selected:
        'pg_catalog.record_eq(CASE WHEN pick THEN ROW(n) ELSE ROW(t) END,CASE WHEN pick THEN ROW(m) ELSE ROW(u) END)',
      selected_mismatch:
        'pg_catalog.btrecordcmp(CASE WHEN pick THEN ROW(n) ELSE ROW(t) END,ROW(m))',
      coalesced:
        'pg_catalog.record_eq(COALESCE(CASE WHEN pick THEN ROW(n) END,ROW(t)),COALESCE(CASE WHEN pick THEN ROW(m) END,ROW(u)))',
      width: 'pg_catalog.btrecordcmp(ROW(n),ROW(m,u))',
      mismatch: 'pg_catalog.record_eq(ROW(n),ROW(m::int8))',
      json: `pg_catalog.record_eq(ROW(n,'{}'::json),ROW(m,'{}'::json))`,
      json_array: 'pg_catalog.record_eq(ROW(ARRAY[]::json[]),ROW(ARRAY[]::json[]))',
      unknown: "pg_catalog.record_eq(ROW('x'),ROW('x'))",
      unknown_null: 'pg_catalog.record_eq(ROW(NULL),ROW(NULL))',
      collation: 'pg_catalog.btrecordcmp(ROW(t COLLATE "C"),ROW(u))',
      domain: 'pg_catalog.record_eq(ROW(n::positive),ROW(m::positive))',
      domain_mismatch: 'pg_catalog.record_eq(ROW(n::positive),ROW(m))',
      eager: 'pg_catalog.record_eq(ROW(n,1/divisor),ROW(m,1))',
      arrays: `ARRAY[${left}]=ARRAY[${right}]`,
      arrays_cmp: `ARRAY[${left}]<ARRAY[${right}]`,
      array_field: `pg_catalog.record_eq(ROW(ARRAY[${left}]),ROW(ARRAY[${right}]))`,
      hetero_arrays: 'ARRAY[ROW(n),ROW(t)]=ARRAY[ROW(m),ROW(u)]',
      array_shapes: 'ARRAY[ROW(n)]=ARRAY[ROW(m,u)]',
      array_types: 'ARRAY[ROW(n)]<ARRAY[ROW(u)]',
      array_field_shapes: 'pg_catalog.record_eq(ROW(ARRAY[ROW(n)]),ROW(ARRAY[ROW(m,u)]))',
      row_operator: `${left}=${right}`,
    })
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
      'anonymousrecordcomparison',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)

it('uses captured enum default support in anonymous scalar and array fields without assuming built-in ordering', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-anonymous-record-enum-context-')),
    packet = 'artifacts/goal-checks/anonymous-record-comparison-active'
  try {
    await pg.exec(`CREATE TYPE stage AS ENUM('z','a');
      CREATE FUNCTION reverse_stage(stage,stage) RETURNS int4 LANGUAGE sql IMMUTABLE STRICT AS 'SELECT -enum_cmp($1,$2)';
      CREATE OPERATOR CLASS reversed_stage DEFAULT FOR TYPE stage USING btree AS
      OPERATOR 1 <(anyenum,anyenum),OPERATOR 2 <=(anyenum,anyenum),OPERATOR 3 =(anyenum,anyenum),OPERATOR 4 >=(anyenum,anyenum),OPERATOR 5 >(anyenum,anyenum),FUNCTION 1 reverse_stage(stage,stage);`)
    const bodies = {
        scalar: 'btrecordcmp(ROW(n,v::stage),ROW(m,w::stage))<0',
        nested: 'btrecordcmp(ROW(n,ARRAY[v::stage]),ROW(m,ARRAY[w::stage]))<0',
        eq: 'record_eq(ROW(n,v::stage),ROW(m,w::stage))',
      },
      sql = (body: string) => `CASE WHEN bypass THEN true ELSE ${body} END`
    for (const [name, body] of Object.entries(bodies))
      await pg.exec(
        `CREATE TABLE callback_${name}(n int,m int,v text,w text,bypass bool,CHECK(${sql(body)}))`,
      )
    const catalog = await snapshotCatalog(pg)
    expect(
      catalog.compositeTypeGraph?.definitions.find((n) => n.identity === 'public.stage')?.comparison
        ?.comparator,
    ).toBe('function:["public","reverse_stage"](public.stage,public.stage)')
    const plans = Object.entries(bodies).flatMap(([name, body]) => {
        const table = catalog.tables.find((t) => t.name === 'callback_' + name)!
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
              catalog.enums,
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
      [1, 2, 'z', 'a'],
      [1, 1, 'z', 'a'],
      [1, 1, 'z', 'z'],
      [1, 1, null, null],
      [1, 1, 'z', null],
      [null, null, 'z', 'a'],
      [null, 1, 'z', 'a'],
      [1, 1, 'bad', 'z'],
    ] as const
    for (const [n, m, v, w] of samples)
      for (const bypass of [false, true])
        for (const name of Object.keys(bodies)) {
          let failure: string | undefined
          try {
            await pg.query(`INSERT INTO callback_${name} VALUES($1,$2,$3,$4,$5)`, [
              n,
              m,
              v,
              w,
              bypass,
            ])
          } catch (e) {
            failure = (e as { code: string }).code
          }
          const reached =
            !bypass && name !== 'eq' && n === m && v !== null && w !== null && v !== 'bad'
          const expected: Outcome = reached
            ? { kind: 'Unknown' }
            : failure && failure !== '23514'
              ? { kind: 'Error', value: { state: parseInt(failure, 36) } }
              : { kind: failure ? 'False' : 'True' }
          const known = (value: string | number | boolean | null): Input =>
            value === null ? { kind: 'Null' } : { kind: 'Value', value }
          const row: Row = {
            n: known(n),
            m: known(m),
            v: known(v),
            w: known(w),
            bypass: known(bypass),
          }
          for (const origin of ['source', 'stored'])
            fixtures.push({ name: name + '_' + origin, row, expected })
          references.push({ name, n, m, v, w, bypass, failure, reached })
        }
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/enum-context-reference.json',
      JSON.stringify(
        { nativeInserts: references.length, fixtures: fixtures.length, references },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      root,
      'anonymousrecordcomparison',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)

it('keeps anonymous record partial fields, incoming errors and selected layout laziness distinct', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-anonymous-record-partials-'))
  try {
    const bodies = {
      eq: 'pg_catalog.record_eq(ROW(n,t),ROW(m,u))',
      order: 'pg_catalog.record_lt(ROW(n,t COLLATE "C"),ROW(m,u COLLATE "C"))',
      array: 'ARRAY[ROW(n,t)]=ARRAY[ROW(m,u)]',
      selected:
        'pg_catalog.record_eq(CASE WHEN pick THEN ROW(n) ELSE ROW(t) END,CASE WHEN pick THEN ROW(m) ELSE ROW(u) END)',
      strict: 'pg_catalog.record_eq(NULL::record,ROW(n,1/divisor))',
      strict_dynamic: 'pg_catalog.record_eq(CASE WHEN pick THEN ROW(n) END,ROW(m,1/divisor))',
    }
    for (const [name, body] of Object.entries(bodies))
      await pg.exec(
        `CREATE TABLE partial_${name}(n int4,m int4,t text,u text,divisor int4,pick bool,bypass bool,CHECK(CASE WHEN bypass THEN true ELSE ${body} END))`,
      )
    const catalog = await snapshotCatalog(pg),
      plans = Object.keys(bodies).map((name) => {
        const table = catalog.tables.find((t) => t.name === 'partial_' + name)!
        return {
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: name,
          },
          expression: portableCheckAtoms(
            lowerTableCheck(
              table,
              table.constraints[0]!,
              [],
              [],
              'stored',
              catalog.rangeTypes,
              catalog.compositeTypeGraph,
            )!.expression,
          ),
        }
      }),
      group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' })
    group.checks.forEach((c) => expect(c.kind, 'reason' in c ? c.reason : '').toBe('supported'))
    await pg.exec("INSERT INTO partial_strict VALUES(1,2,'x','x',0,true,false)")
    await expect(
      pg.exec("INSERT INTO partial_strict_dynamic VALUES(1,2,'x','x',0,false,false)"),
    ).rejects.toMatchObject({ code: '22012' })
    await pg.exec("INSERT INTO partial_strict_dynamic VALUES(1,2,'x','x',1,false,false)")
    await pg.exec("INSERT INTO partial_strict_dynamic VALUES(1,2,'x','x',0,false,true)")
    const value = (value: string | number | boolean): Input => ({ kind: 'Value', value }),
      unknown: Input = { kind: 'Unknown' },
      error: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } },
      base: Row = {
        n: value(1),
        m: value(2),
        t: value('x'),
        u: value('x'),
        divisor: value(1),
        pick: value(true),
        bypass: value(false),
      },
      fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, patch: Row, expected: Outcome) => {
      fixtures.push(
        { name, row: { ...base, ...patch }, expected },
        { name, row: { ...base, ...patch, bypass: value(true) }, expected: { kind: 'True' } },
      )
    }
    add('eq', { t: unknown, u: unknown }, { kind: 'False' })
    add('eq', { m: value(1), t: unknown }, { kind: 'Unknown' })
    add('eq', { n: unknown, t: error }, { kind: 'Error', value: { state: parseInt('22012', 36) } })
    add('order', { t: unknown, u: unknown }, { kind: 'True' })
    add('order', { n: unknown }, { kind: 'Unknown' })
    add('array', { t: unknown, u: unknown }, { kind: 'False' })
    add('array', { m: value(1), t: unknown }, { kind: 'Unknown' })
    add('selected', { pick: value(false), n: error, m: unknown }, { kind: 'True' })
    add('selected', { pick: unknown }, { kind: 'Unknown' })
    add('strict', { divisor: value(0) }, { kind: 'Null' })
    add('strict', { n: unknown }, { kind: 'Null' })
    add(
      'strict_dynamic',
      { pick: value(false), divisor: value(0) },
      { kind: 'Error', value: { state: parseInt('22012', 36) } },
    )
    add('strict_dynamic', { pick: value(false), n: unknown }, { kind: 'Null' })
    await runCheckParity(root, 'anonymousrecordcomparison', group, Object.keys(bodies), fixtures)
    await mkdir('artifacts/goal-checks/anonymous-record-comparison-active', { recursive: true })
    await writeFile(
      'artifacts/goal-checks/anonymous-record-comparison-active/partial-validation.json',
      JSON.stringify({ nativeInserts: 4, fixtures: fixtures.length }, null, 2) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
