import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

it('preserves historical ANY and ALL operators through schema changes, shadowing and partial inputs', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-row-native-scalar-array-')),
    artifact = 'artifacts/goal-checks/row-native-scalar-array-active'
  try {
    await pg.exec(`SET search_path=public,pg_catalog;
      CREATE DOMAIN positive AS int4 CHECK(VALUE>=0);CREATE TYPE positive_span AS RANGE(subtype=positive);
      CREATE TYPE inner_value AS(v int4,old int4,label text COLLATE "C");
      CREATE TYPE stage AS ENUM('a','b');`)
    const definitions = [
        { name: 'any', type: 'bool', value: 'n=ANY(ARRAY[d,NULL])' },
        { name: 'all', type: 'bool', value: 'n<>ALL(ARRAY[d,NULL])' },
        { name: 'ordered_any', type: 'bool', value: 'n>ANY(ARRAY[d,NULL])' },
        { name: 'ordered_all', type: 'bool', value: 'n<=ALL(ARRAY[d,NULL])' },
        { name: 'mixed', type: 'bool', value: 'n::int2=ANY(ARRAY[d::int8,NULL])' },
        { name: 'empty', type: 'bool', value: 'n/d=ANY(ARRAY[]::int4[])' },
        { name: 'empty_all', type: 'bool', value: 'n/d=ALL(ARRAY[]::int4[])' },
        { name: 'null_array', type: 'bool', value: 'n/d=ANY(NULL::int4[])' },
        { name: 'dimensions', type: 'bool', value: 'n=ANY(ARRAY[ARRAY[d,NULL],ARRAY[n,1/d]])' },
        { name: 'converted', type: 'bool', value: 'n=ANY(ARRAY[d]::int8[])' },
        { name: 'vector', type: 'bool', value: 'n=ANY(label::int2vector)' },
        { name: 'text_any', type: 'bool', value: `label COLLATE "C"=ANY(ARRAY['1',NULL])` },
        { name: 'text_all', type: 'bool', value: `label COLLATE "C"<ALL(ARRAY['2','é😊',NULL])` },
        { name: 'regex', type: 'bool', value: `label COLLATE "C"~ANY(ARRAY['^1','['])` },
        { name: 'regex_all', type: 'bool', value: `label COLLATE "C"~ALL(ARRAY['^1','['])` },
        {
          name: 'enum_any',
          type: 'bool',
          value: `(CASE WHEN pick THEN 'a'::stage ELSE 'b'::stage END)=ANY(ARRAY['b'::stage,NULL])`,
        },
        {
          name: 'enum_all',
          type: 'bool',
          value: `(CASE WHEN pick THEN 'a'::stage ELSE 'b'::stage END)<ALL(ARRAY['b'::stage,NULL])`,
        },
        {
          name: 'domain_members',
          type: 'bool',
          value: `lower('[1,3)'::positive_span)=ANY(ARRAY[lower('[1,3)'::positive_span),NULL])`,
        },
        {
          name: 'record_any',
          type: 'bool',
          value: 'ROW(n,1/d,label)::inner_value=ANY(ARRAY[ROW(d,1/d,label)::inner_value,NULL])',
        },
        {
          name: 'record_all',
          type: 'bool',
          value:
            'ROW(n,label::int4,label)::inner_value<>ALL(ARRAY[ROW(d,label::int4,label)::inner_value,NULL])',
        },
        {
          name: 'range_any',
          type: 'bool',
          value: `int4range(n,d,'[]')=ANY(ARRAY[int4range(d,n,'[)'),NULL])`,
        },
        { name: 'jsonb_any', type: 'bool', value: 'to_jsonb(n)=ANY(ARRAY[to_jsonb(d),NULL])' },
        {
          name: 'guarded',
          type: 'int4',
          value: 'CASE WHEN n=ANY(ARRAY[d,NULL]) THEN 1/d ELSE NULL END',
        },
        { name: 'prepared', type: 'bool', value: 'n=ANY(ARRAY[d,1/0])' },
      ],
      forms = definitions.flatMap((f) => {
        const row = `ROW(n,${f.value})::r_${f.name}`
        return [
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
    await pg.exec(`ALTER TYPE inner_value DROP ATTRIBUTE old;
      ALTER TYPE inner_value RENAME ATTRIBUTE v TO score;ALTER TYPE inner_value ADD ATTRIBUTE added positive;
      ALTER DOMAIN positive ADD CHECK(VALUE>=10);ALTER DOMAIN positive SET NOT NULL;
      ALTER TYPE stage RENAME VALUE 'a' TO 'cold';
      CREATE FUNCTION public.lower(positive_span) RETURNS int4 LANGUAGE SQL IMMUTABLE STRICT AS 'SELECT 99';
      CREATE FUNCTION chosen(int4,int4) RETURNS bool LANGUAGE SQL IMMUTABLE STRICT AS 'SELECT false';
      CREATE OPERATOR public.> (LEFTARG=int4,RIGHTARG=int4,FUNCTION=chosen);`)
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
            isNull = false
          try {
            await pg.query(`INSERT INTO evolving_${f.name} VALUES($1,$2,$3,$4,$5)`, params)
          } catch (e) {
            error = (e as { code: string }).code
          }
          if (!error)
            try {
              await pg.query(`INSERT INTO null_${f.name} VALUES($1,$2,$3,$4,$5)`, params)
              isNull = true
            } catch (e) {
              expect((e as { code: string }).code).toBe('23514')
            }
          const expected: Outcome = error
              ? error === '23514'
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
    for (const name of ['any_present', 'all_present', 'empty_present', 'empty_all_present'])
      for (const origin of ['source', 'stored']) {
        const empty = name.startsWith('empty')
        fixtures.push({
          name: name + '_' + origin,
          row: {
            n: input(null),
            d: input(empty ? 1 : null),
            label: { kind: 'Unknown' },
            pick: { kind: 'Unknown' },
            bypass: input(false),
          },
          expected: { kind: 'False' },
        })
        fixtures.push({
          name: name + '_' + origin,
          row: {
            n: input(1),
            d: { kind: 'Unknown' },
            label: { kind: 'Unknown' },
            pick: { kind: 'Unknown' },
            bypass: input(false),
          },
          expected: { kind: 'Unknown' },
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
      'example.com/row-native-scalar-array',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 900_000)
