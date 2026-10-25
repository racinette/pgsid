import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

it('preserves selected native DISTINCT, NULLIF, field projections and concrete polymorphic results through historical rows', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-row-native-operations-')),
    artifact = 'artifacts/goal-checks/row-native-operations-active'
  try {
    await pg.exec(`SET search_path=public,pg_catalog;CREATE TYPE inner_value AS(v int4,label text COLLATE "C");
      CREATE TYPE nested_value AS(r inner_value);CREATE DOMAIN positive AS int4 CHECK(VALUE>=0);
      CREATE TYPE positive_span AS RANGE(subtype=positive);CREATE TYPE stage AS ENUM('a','b','c');
      CREATE TYPE stage_span AS RANGE(subtype=stage);CREATE TYPE record_span AS RANGE(subtype=inner_value);`)
    const definitions = [
        { name: 'distinct', type: 'bool', value: 'n IS DISTINCT FROM d' },
        { name: 'not_distinct', type: 'bool', value: 'n IS NOT DISTINCT FROM d' },
        { name: 'distinct_error', type: 'bool', value: 'n/d IS DISTINCT FROM 1' },
        {
          name: 'distinct_case',
          type: 'int4',
          value: 'CASE WHEN n IS NOT DISTINCT FROM d THEN 1/d ELSE NULL END',
        },
        { name: 'nullif', type: 'int4', value: 'NULLIF(n,d)' },
        { name: 'nullif_promoted', type: 'numeric', value: 'NULLIF(n,d::numeric)' },
        { name: 'nullif_cross', type: 'int2', value: 'NULLIF(n::int2,d::int8)' },
        { name: 'nullif_text', type: 'text', value: 'NULLIF(label::varchar,label::text)' },
        { name: 'nullif_bool', type: 'bool', value: 'NULLIF(pick,n/d>0)' },
        { name: 'nullif_enum', type: 'stage', value: "NULLIF('a'::stage,'c'::stage)" },
        { name: 'nullif_array', type: 'int4[]', value: 'NULLIF(ARRAY[n,d],ARRAY[d,n])' },
        {
          name: 'nullif_range',
          type: 'int4range',
          value: "NULLIF('[1,3)'::int4range,'[1,3)'::int4range)",
        },
        { name: 'nullif_null', type: 'int4', value: 'NULLIF(NULL::int4,n/d)' },
        { name: 'lazy', type: 'int4', value: 'CASE WHEN pick THEN NULLIF(n,d) ELSE n/d END' },
        { name: 'prepared', type: 'int4', value: 'NULLIF(n,1/0)' },
        { name: 'field', type: 'int4', value: "('(1,x)'::inner_value).v" },
        {
          name: 'field_text',
          type: 'int4',
          value: `CASE WHEN ('(1,x)'::inner_value).label COLLATE "C"='x' THEN 1/d ELSE NULL END`,
        },
        { name: 'nested_field', type: 'int4', value: `(('("(1,x)")'::nested_value).r).v` },
        {
          name: 'lower',
          type: 'int4',
          value: "CASE WHEN lower('[1,3)'::int4range)=1 THEN 1/d ELSE NULL END",
        },
        {
          name: 'lower_domain',
          type: 'int4',
          value: "CASE WHEN lower('[1,3)'::positive_span)=1 THEN 1/d ELSE NULL END",
        },
        {
          name: 'lower_enum',
          type: 'int4',
          value: `CASE WHEN lower('[a,c)'::stage_span)::text COLLATE "C"='cold' THEN 1/d ELSE NULL END`,
        },
        {
          name: 'lower_record',
          type: 'int4',
          value: `CASE WHEN (lower('["(1,x)","(3,z)")'::record_span)).v=1 THEN 1/d ELSE NULL END`,
        },
        {
          name: 'range_merge',
          type: 'int4',
          value:
            "CASE WHEN lower(range_merge('{[1,3),[5,9)}'::int4multirange))=1 THEN 1/d ELSE NULL END",
        },
        {
          name: 'array_append',
          type: 'int4',
          value: 'CASE WHEN cardinality(array_append(ARRAY[n],d))=2 THEN 1/d ELSE NULL END',
        },
        { name: 'array_promoted', type: 'numeric[]', value: 'array_append(ARRAY[n],d::numeric)' },
        {
          name: 'enum_first',
          type: 'int4',
          value: `CASE WHEN enum_first(NULL::stage)::text COLLATE "C"='cold' THEN 1/d ELSE NULL END`,
        },
        {
          name: 'enum_range',
          type: 'int4',
          value:
            'CASE WHEN cardinality(enum_range(NULL::stage,NULL::stage))=3 THEN 1/d ELSE NULL END',
        },
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
    await pg.exec(`ALTER TYPE inner_value RENAME ATTRIBUTE v TO score;
      ALTER TYPE inner_value RENAME ATTRIBUTE label TO "renamed.label";
      ALTER DOMAIN positive ADD CHECK(VALUE>=10);ALTER TYPE stage RENAME VALUE 'a' TO 'cold';
      CREATE FUNCTION public.lower(int4range) RETURNS int4 LANGUAGE SQL IMMUTABLE STRICT AS 'SELECT 99';
      CREATE FUNCTION public.lower(positive_span) RETURNS int4 LANGUAGE SQL IMMUTABLE STRICT AS 'SELECT 99';`)
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
      native: unknown[] = []
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
          expected:
            f.family === 'prepared'
              ? { kind: 'Error', value: { state: parseInt('22012', 36) } }
              : { kind: 'True' },
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
      'example.com/row-native-operations',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 900_000)
