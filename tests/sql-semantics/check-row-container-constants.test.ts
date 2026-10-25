import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

it('recovers already coerced recursive record/range/multirange constants without repeating input or canonicalization callbacks', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-container-constants-')),
    artifact = 'artifacts/goal-checks/container-constants-active',
    quote = (s: string) => "'" + s.replaceAll("'", "''") + "'"
  try {
    await pg.exec(`CREATE TYPE inner_value AS(v int4,label text COLLATE "C");
      CREATE TYPE evolved_value AS(v int4,old text,label text COLLATE "C");
      CREATE DOMAIN positive AS int4 CHECK(VALUE>=0);
      CREATE TYPE checked_value AS(v positive,label text COLLATE "C");
      CREATE TYPE stages AS ENUM('low','middle','high');
      CREATE TYPE stage_span AS RANGE(subtype=stages);
      CREATE TYPE loose_span AS RANGE(subtype=int4);
      CREATE TYPE callback_span;
      CREATE FUNCTION callback_canonical(callback_span) RETURNS callback_span LANGUAGE internal IMMUTABLE STRICT AS 'int4range_canonical';
      CREATE TYPE callback_span AS RANGE(subtype=int4,canonical=callback_canonical);
      CREATE TYPE record_span AS RANGE(subtype=inner_value);
      CREATE TYPE array_span AS RANGE(subtype=int4[]);
      CREATE TYPE nested_value AS(r inner_value,spans numrange[],document jsonb);`)
    const definitions = [
        { name: 'record', type: 'inner_value', input: "'(1,x)'" },
        { name: 'record_null', type: 'inner_value', input: 'NULL' },
        { name: 'record_null_fields', type: 'inner_value', input: "'(,)'" },
        {
          name: 'record_evolved',
          type: 'evolved_value',
          input: "'(1,discarded,x)'",
          expected: '{"v": 1, "added": null, "label": "x"}',
        },
        { name: 'record_domain', type: 'checked_value', input: "'(1,x)'" },
        { name: 'record_array', type: 'inner_value[]', input: '\'[-2:0]={"(1,x)",NULL,"(2,y)"}\'' },
        {
          name: 'record_nested',
          type: 'nested_value',
          input: `ROW('(1,x)'::inner_value,ARRAY['[1.2300,2.4500)'::numrange,NULL,'empty'::numrange],'{"é":[1.2300,null]}'::jsonb)`,
        },
        { name: 'int_range', type: 'int4range', input: "'[1,3)'", send: 'range_send' },
        {
          name: 'big_range',
          type: 'int8range',
          input: "'(-9223372036854775808,9223372036854775807)'",
          send: 'range_send',
        },
        { name: 'numeric_range', type: 'numrange', input: "'[1.2300,2.4500]'", send: 'range_send' },
        { name: 'empty_range', type: 'numrange', input: "'empty'", send: 'range_send' },
        { name: 'unbounded_range', type: 'numrange', input: "'(,)'", send: 'range_send' },
        { name: 'lower_unbounded', type: 'numrange', input: "'(,2.4500]'", send: 'range_send' },
        { name: 'upper_unbounded', type: 'numrange', input: "'[1.2300,)'", send: 'range_send' },
        {
          name: 'date_range',
          type: 'daterange',
          input: "'[2000-01-01,infinity)'",
          send: 'range_send',
        },
        {
          name: 'timestamp_range',
          type: 'tsrange',
          input: "'[2000-01-01 01:02:03.123456,2000-01-02)'",
          send: 'range_send',
        },
        {
          name: 'timestamptz_range',
          type: 'tstzrange',
          input: "'[2000-01-01 01:02:03.123456+02,2000-01-02+00)'",
          send: 'range_send',
        },
        { name: 'range_array', type: 'int4range[]', input: '\'[-1:1]={"[1,3)",NULL,empty}\'' },
        {
          name: 'multirange',
          type: 'int4multirange',
          input: "'{[1,3),[5,9)}'",
          send: 'multirange_send',
        },
        {
          name: 'numeric_multirange',
          type: 'nummultirange',
          input: "'{[1.2300,2.4500],[5.00,9.000)}'",
          send: 'multirange_send',
        },
        { name: 'empty_multirange', type: 'nummultirange', input: "'{}'", send: 'multirange_send' },
        {
          name: 'multi_stride',
          type: 'int8multirange',
          input: "'{[1,3),[5,7),[9,11),[13,15),[17,19),[21,23)}'",
          send: 'multirange_send',
        },
        {
          name: 'multirange_array',
          type: 'int4multirange[]',
          input: '\'[-2:0]={"{[1,3),[5,9)}",NULL,\"{}\"}\'',
        },
        { name: 'loose_range', type: 'loose_span', input: "'[1,3]'", send: 'range_send' },
        { name: 'callback_range', type: 'callback_span', input: "'[1,3]'", send: 'range_send' },
        {
          name: 'enum_range',
          type: 'stage_span',
          input: "'[low,high)'",
          expected: '"[cold,high)"',
        },
        { name: 'record_range', type: 'record_span', input: `'["(1,x)","(3,z)")'` },
        { name: 'array_range', type: 'array_span', input: `'["[0:1]={1,2}","[0:1]={3,4}")'` },
      ],
      observe = (value: string, send?: string) =>
        send ? `encode(${send}(${value}),'hex')` : `to_jsonb(${value})::text`,
      forms: { name: string; family: string; expression: string }[] = [],
      values: unknown[] = []
    await pg.exec('CREATE TYPE scalar_result AS(n int4,old int4)')
    for (const f of definitions) {
      const expression = `(${f.input})::${f.type}`,
        sample = (
          await pg.query<{ text: string | null; expected: string | null }>(
            `SELECT (${expression})::text text,${observe(expression, f.send)} expected`,
          )
        ).rows[0]!,
        value = `${sample.text === null ? 'NULL' : quote(sample.text)}::${f.type}`,
        expected = f.expected ?? sample.expected,
        observed = `(${observe(value, f.send)}${expected === null ? ' IS NULL' : ' COLLATE "C" = ' + quote(expected) + ' COLLATE "C"'})`,
        scalar = `ROW(n,CASE WHEN ${observed} THEN n/d ELSE NULL::int4 END)::scalar_result`
      values.push({ ...f, value, expected })
      await pg.exec(`CREATE TYPE r_${f.name} AS(n int4,old ${f.type})`)
      forms.push(
        {
          name: f.name + '_value',
          family: f.name,
          expression: `ROW(n,${value})::r_${f.name} IS NOT NULL`,
        },
        { name: f.name + '_observed', family: f.name, expression: `${scalar} IS NOT NULL` },
        { name: f.name + '_projected', family: f.name, expression: `(${scalar}).n>=1` },
      )
    }
    for (const f of forms)
      for (const witness of [false, true])
        await pg.exec(
          `CREATE TABLE ${witness ? 'null_' : 'evolving_'}${f.name}(n int4,d int4,bypass bool,CONSTRAINT valid CHECK(${witness ? '(' : ''}CASE WHEN bypass THEN true ELSE ${f.expression} END${witness ? ') IS NULL' : ''}))`,
        )
    for (const f of definitions) await pg.exec(`ALTER TYPE r_${f.name} DROP ATTRIBUTE old`)
    await pg.exec(`ALTER TYPE scalar_result DROP ATTRIBUTE old;ALTER TYPE evolved_value DROP ATTRIBUTE old; ALTER TYPE evolved_value ADD ATTRIBUTE added int4;
      ALTER DOMAIN positive ADD CHECK(VALUE>=10);
      ALTER TYPE stages RENAME VALUE 'low' TO 'cold';
      CREATE OR REPLACE FUNCTION callback_canonical(callback_span) RETURNS callback_span LANGUAGE SQL IMMUTABLE STRICT AS 'SELECT NULL::callback_span';`)
    const c = await snapshotCatalog(pg),
      plans = forms.flatMap((f) => {
        const t = c.tables.find((t) => t.name === 'evolving_' + f.name)!,
          k = t.constraints[0]!
        expect(k.rowCoercionContext?.complete, f.name).toBe(true)
        expect(JSON.stringify(k.rowCoercionContext)).not.toMatch(/"\w*oid\w*":/iu)
        return (['source', 'stored'] as const).map((origin) => ({
          name: f.name + '_' + origin,
          identity: { schema: 'public', kind: 'table' as const, owner: f.name, constraint: origin },
          expression: lowerTableCheck(
            t,
            k,
            c.enums,
            c.domains,
            origin,
            c.rangeTypes,
            c.compositeTypeGraph,
            origin === 'source'
              ? `CHECK(CASE WHEN bypass THEN true ELSE ${f.expression} END)`
              : undefined,
          )!.expression,
        }))
      }),
      group = prepareCheckRustGroup(plans, {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        clientEncoding: 'UTF8',
      }),
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      native: unknown[] = []
    for (const [i, check] of group.checks.entries())
      expect(check.kind, plans[i]!.name + ('reason' in check ? ': ' + check.reason : '')).toBe(
        'supported',
      )
    const input = (value: number | boolean | null): Row[string] =>
      value === null ? { kind: 'Null' } : { kind: 'Value', value }
    for (const f of forms)
      for (const [n, d, bypass] of [
        [1, 1, false],
        [1, 0, false],
        [null, 0, false],
        [-1, 1, false],
        [2, null, false],
        [1, 0, true],
      ] as const) {
        let error: string | undefined,
          isNull = false
        try {
          await pg.query(`INSERT INTO evolving_${f.name} VALUES($1,$2,$3)`, [n, d, bypass])
        } catch (e) {
          error = (e as { code: string }).code
        }
        if (!error)
          try {
            await pg.query(`INSERT INTO null_${f.name} VALUES($1,$2,$3)`, [n, d, bypass])
            isNull = true
          } catch (e) {
            expect((e as { code: string }).code).toBe('23514')
          }
        const expected: Outcome = error
            ? error === '23514'
              ? { kind: 'False' }
              : { kind: 'Error', value: { state: parseInt(error, 36) } }
            : { kind: isNull ? 'Null' : 'True' },
          row: Row = { n: input(n), d: input(d), bypass: input(bypass) }
        native.push({ name: f.name, row, expected })
        for (const origin of ['source', 'stored'])
          fixtures.push({ name: f.name + '_' + origin, row, expected })
      }
    for (const f of forms)
      for (const origin of ['source', 'stored'])
        fixtures.push({
          name: f.name + '_' + origin,
          row: { n: { kind: 'Unknown' }, d: { kind: 'Unknown' }, bypass: input(true) },
          expected: { kind: 'True' },
        })
    await mkdir(artifact, { recursive: true })
    for (const [file, value] of Object.entries({
      plans,
      values,
      contexts: c.tables
        .filter((t) => t.name.startsWith('evolving_'))
        .map((t) => ({ name: t.name, constraint: t.constraints[0] })),
      'native-reference': native,
      fixtures,
    }))
      await writeFile(join(artifact, file + '.json'), JSON.stringify(value, null, 2) + '\n')
    await writeFile(join(artifact, 'evaluators.rs'), group.evaluatorSource!)
    await runCheckParity(
      root,
      'example.com/container-constants',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 900_000)
