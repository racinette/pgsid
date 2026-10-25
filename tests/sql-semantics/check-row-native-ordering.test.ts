import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

it('preserves native row ordering families, comparisons, NULLs and lazy fields through historical capture', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-row-native-ordering-')),
    artifact = 'artifacts/goal-checks/row-native-ordering-active'
  try {
    await pg.exec(`SET search_path=public,pg_catalog;
      CREATE DOMAIN positive AS int4 CHECK(VALUE>=0);CREATE TYPE positive_span AS RANGE(subtype=positive);
      CREATE TYPE inner_value AS(v int4,old int4,label text COLLATE "C");CREATE TYPE stage AS ENUM('a','b');
      CREATE OPERATOR public.#< (LEFTARG=int4,RIGHTARG=int4,FUNCTION=pg_catalog.int4lt);
      CREATE OPERATOR FAMILY selected_order USING btree;
      ALTER OPERATOR FAMILY selected_order USING btree ADD OPERATOR 1 public.#< (int4,int4),FUNCTION 1 (int4,int4) pg_catalog.btint4cmp(int4,int4);`)
    const definitions = [
        ...[
          ['lt', '<'],
          ['le', '<='],
          ['gt', '>'],
          ['ge', '>='],
          ['eq', '='],
          ['ne', '<>'],
          ['distinct', 'IS DISTINCT FROM'],
          ['same', 'IS NOT DISTINCT FROM'],
        ].map(([name, operator]) => ({
          name: name!,
          type: 'bool',
          value: `ROW(n,n/d) ${operator} ROW(d,0)`,
        })),
        { name: 'mixed', type: 'bool', value: 'ROW(n::int2,n/d)<ROW(d::int8,0)' },
        { name: 'numeric', type: 'bool', value: 'ROW(n::numeric,n/d)<=ROW(d::int8,0)' },
        { name: 'float', type: 'bool', value: 'ROW(n::float8,n/d)<ROW(d::float8,0)' },
        { name: 'text', type: 'bool', value: `ROW(label COLLATE "C",n/d)<ROW('2' COLLATE "C",0)` },
        {
          name: 'character',
          type: 'bool',
          value: `ROW(label::char(3) COLLATE "C",n/d)<ROW('2'::char(3) COLLATE "C",0)`,
        },
        {
          name: 'enum',
          type: 'bool',
          value: `ROW((CASE WHEN pick THEN 'a'::stage ELSE 'b'::stage END),n/d)<=ROW('b'::stage,0)`,
        },
        { name: 'array', type: 'bool', value: 'ROW(ARRAY[n,d],n/d)<ROW(ARRAY[d,n],0)' },
        {
          name: 'record',
          type: 'bool',
          value: 'ROW(ROW(n,1/d,label)::inner_value,1/d)<ROW(ROW(d,1/d,label)::inner_value,0)',
        },
        { name: 'anonymous', type: 'bool', value: 'ROW(ROW(n,label),1/d)<ROW(ROW(d,label),0)' },
        {
          name: 'range',
          type: 'bool',
          value: `ROW(int4range(n,d,'[]'),n/d)<ROW(int4range(d,n,'[]'),0)`,
        },
        { name: 'jsonb', type: 'bool', value: 'ROW(to_jsonb(n),n/d)<=ROW(to_jsonb(d),0)' },
        { name: 'domain', type: 'bool', value: 'ROW(n::positive,1/d)<ROW(d,0)' },
        {
          name: 'coerced_domain',
          type: 'bool',
          value: `ROW(lower('[1,3)'::positive_span),n/d)<ROW(d,0)`,
        },
        {
          name: 'conditional',
          type: 'int4',
          value: 'CASE WHEN ROW(n,n/d)<ROW(d,0) THEN 1/d ELSE NULL END',
        },
        { name: 'boolean', type: 'bool', value: '(ROW(n,n/d)<ROW(d,0)) IS UNKNOWN' },
        { name: 'array_result', type: 'bool[]', value: 'ARRAY[ROW(n,n/d)<ROW(d,0)]' },
        { name: 'custom', type: 'bool', value: 'ROW(n,1/d) OPERATOR(public.#<) ROW(d,0)' },
        {
          name: 'custom_guard',
          type: 'int4',
          value: 'CASE WHEN ROW(n,1/d) OPERATOR(public.#<) ROW(d,0) THEN 1/d ELSE NULL END',
        },
        { name: 'prepared', type: 'bool', value: 'ROW(n,1/0)<ROW(d,0)' },
        {
          name: 'pruned',
          type: 'bool',
          value: 'ROW(n,CASE WHEN true THEN d ELSE 1/0 END)<ROW(d,0)',
        },
        { name: 'three', type: 'bool', value: 'ROW(n,d,n/d)<ROW(d,n,0)' },
      ],
      forms = definitions.flatMap((f) => {
        const row = `ROW(n,${f.value})::r_${f.name}`
        return [
          ['direct', f.type === 'bool' ? f.value : `(${f.value}) IS NOT NULL`],
          ['present', `${row} IS NOT NULL`],
          ['project', `(${row}).n>=1`],
          ['json', `to_jsonb(${row}) IS NOT DISTINCT FROM jsonb_build_object('n',n)`],
        ].map(([consumer, expression]) => ({
          ...f,
          name: f.name + '_' + consumer,
          family: f.name,
          expression,
        }))
      })
    for (const f of definitions) await pg.exec(`CREATE TYPE r_${f.name} AS(n int4,old ${f.type})`)
    for (const f of forms)
      for (const witness of [false, true])
        await pg.exec(
          `CREATE TABLE ${witness ? 'null_' : 'evolving_'}${f.name}(n int4,d int4,label text,pick bool,bypass bool,CONSTRAINT valid CHECK(${witness ? '(' : ''}CASE WHEN bypass THEN true ELSE ${f.expression} END${witness ? ') IS NULL' : ''}))`,
        )
    for (const f of definitions) await pg.exec(`ALTER TYPE r_${f.name} DROP ATTRIBUTE old`)
    await pg.exec(`ALTER DOMAIN positive ADD CHECK(VALUE>=2);
      ALTER TYPE inner_value DROP ATTRIBUTE old;ALTER TYPE inner_value RENAME ATTRIBUTE v TO score;
      ALTER TYPE inner_value ADD ATTRIBUTE added positive;
      ALTER TYPE stage RENAME VALUE 'a' TO 'cold';
      ALTER OPERATOR FAMILY selected_order USING btree DROP FUNCTION 1 (int4,int4);
      ALTER OPERATOR FAMILY selected_order USING btree ADD FUNCTION 1 (int4,int4) pg_catalog.int4larger(int4,int4);
      CREATE FUNCTION public.lower(positive_span) RETURNS int4 LANGUAGE SQL IMMUTABLE STRICT AS 'SELECT 99';
      CREATE FUNCTION changed_comparison(int4,int4) RETURNS bool LANGUAGE SQL IMMUTABLE STRICT AS 'SELECT false';
      CREATE OPERATOR public.< (LEFTARG=int4,RIGHTARG=int4,FUNCTION=changed_comparison);`)
    const c = await snapshotCatalog(pg),
      plans = forms.flatMap((f) => {
        const t = c.tables.find((t) => t.name === 'evolving_' + f.name)!,
          k = t.constraints[0]!
        expect(k.rowCoercionContext?.complete, f.name).toBe(true)
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
      group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' }),
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      native: unknown[] = [],
      bypassExpected = new Map<string, Outcome>()
    for (const [index, check] of group.checks.entries())
      expect(check.kind, plans[index]!.name + ('reason' in check ? ': ' + check.reason : '')).toBe(
        'supported',
      )
    for (const [index, item] of group.checks.entries())
      if (item.kind === 'supported')
        expect(
          item.inputs.filter((i) => i.name.startsWith('__pgsid_case_operand_')),
          plans[index]!.name,
        ).toEqual([])
    const input = (value: number | string | boolean | null): Row[string] =>
      value === null ? { kind: 'Null' } : { kind: 'Value', value }
    for (const f of forms)
      for (const [n, d, label, pick] of [
        [1, 1, '1', true],
        [1, 0, 'bad', false],
        [2, 0, '1', true],
        [3, 2, 'bad', true],
        [null, 0, null, false],
        [null, null, '', null],
        [-1, 1, 'é😊', false],
        [1, 2, '2', null],
        [32768, 1, '1', true],
      ] as const)
        for (const bypass of [false, true]) {
          const params = [n, d, label, pick, bypass]
          let error: string | undefined,
            rejected = false,
            isNull = false
          try {
            await pg.query(`INSERT INTO evolving_${f.name} VALUES($1,$2,$3,$4,$5)`, params)
          } catch (e) {
            error = (e as { code: string }).code
            rejected = error === '23514' && (e as { constraint?: string }).constraint === 'valid'
          }
          if (!error)
            try {
              await pg.query(`INSERT INTO null_${f.name} VALUES($1,$2,$3,$4,$5)`, params)
              isNull = true
            } catch (e) {
              expect((e as { code: string }).code).toBe('23514')
            }
          const expected: Outcome = error
              ? rejected
                ? { kind: 'False' }
                : { kind: 'Error', value: { state: parseInt(error, 36) } }
              : { kind: isNull ? 'Null' : 'True' },
            row: Row = {
              n: input(n),
              d: input(d),
              label: input(label),
              pick: input(pick),
              bypass: input(bypass),
            }
          if (bypass && !bypassExpected.has(f.name)) bypassExpected.set(f.name, expected)
          native.push({ name: f.name, row, expected })
          for (const origin of ['source', 'stored'])
            fixtures.push({ name: f.name + '_' + origin, row, expected })
        }
    for (const f of forms)
      for (const origin of ['source', 'stored']) {
        fixtures.push({
          name: f.name + '_' + origin,
          row: {
            n: { kind: 'Unknown' },
            d: { kind: 'Unknown' },
            label: { kind: 'Unknown' },
            pick: { kind: 'Unknown' },
            bypass: input(true),
          },
          expected: bypassExpected.get(f.name)!,
        })
      }
    for (const origin of ['source', 'stored']) {
      fixtures.push({
        name: 'lt_present_' + origin,
        row: {
          n: input(null),
          d: input(0),
          label: { kind: 'Unknown' },
          pick: { kind: 'Unknown' },
          bypass: input(false),
        },
        expected: { kind: 'False' },
      })
      fixtures.push({
        name: 'lt_present_' + origin,
        row: {
          n: input(1),
          d: { kind: 'Unknown' },
          label: { kind: 'Unknown' },
          pick: { kind: 'Unknown' },
          bypass: input(false),
        },
        expected: { kind: 'Unknown' },
      })
      fixtures.push({
        name: 'lt_project_' + origin,
        row: {
          n: input(1),
          d: { kind: 'Unknown' },
          label: { kind: 'Unknown' },
          pick: { kind: 'Unknown' },
          bypass: input(false),
        },
        expected: { kind: 'True' },
      })
    }
    await mkdir(artifact, { recursive: true })
    for (const [file, value] of Object.entries({
      plans,
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
      'example.com/row-native-ordering',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 900_000)
