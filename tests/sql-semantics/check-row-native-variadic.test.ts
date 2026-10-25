import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

it('preserves native variadic argument shapes, coerced values and rendered results through schema changes', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-row-native-variadic-')),
    artifact = 'artifacts/goal-checks/row-native-variadic-active'
  try {
    await pg.exec(`SET search_path=public,pg_catalog;SET extra_float_digits=1;
      CREATE DOMAIN positive AS int4 CHECK(VALUE>=0);CREATE TYPE positive_span AS RANGE(subtype=positive);
      CREATE TYPE inner_value AS(v int4,old int4,label text COLLATE "C");CREATE TYPE stage AS ENUM('a','b');`)
    const definitions = [
        { name: 'simple', type: 'jsonb', value: 'jsonb_build_array(n,d)' },
        {
          name: 'expanded',
          type: 'jsonb',
          value: 'jsonb_build_array(n/d,label,pick,NULL::int4,1.20::numeric)',
        },
        { name: 'object', type: 'jsonb', value: `jsonb_build_object(label,n/d,'phase',pick)` },
        {
          name: 'raw_array',
          type: 'json',
          value: 'json_build_array(n/d,label,pick,1.20::numeric)',
        },
        { name: 'raw_object', type: 'json', value: `json_build_object(label,n/d,'x',label)` },
        { name: 'empty_array', type: 'jsonb', value: 'jsonb_build_array()' },
        { name: 'empty_object', type: 'json', value: 'json_build_object()' },
        {
          name: 'nested',
          type: 'jsonb',
          value:
            'jsonb_build_array(ARRAY[n,d],ROW(n,1/d,label)::inner_value,jsonb_build_array(n/d))',
        },
        { name: 'unknown_literals', type: 'jsonb', value: `jsonb_build_array('é😊','null',NULL)` },
        {
          name: 'array_cells',
          type: 'jsonb',
          value: 'jsonb_build_array(ARRAY[n/d,NULL],NULL::int4[])',
        },
        {
          name: 'variadic_array',
          type: 'jsonb',
          value: 'jsonb_build_array(VARIADIC ARRAY[n/d,NULL,d])',
        },
        {
          name: 'variadic_object',
          type: 'jsonb',
          value: `jsonb_build_object(VARIADIC ARRAY[label,n::text,'other',d::text])`,
        },
        { name: 'null_array', type: 'jsonb', value: 'jsonb_build_array(VARIADIC NULL::int4[])' },
        {
          name: 'empty_variadic',
          type: 'jsonb',
          value: 'jsonb_build_array(VARIADIC ARRAY[]::int4[])',
        },
        {
          name: 'multidimensional',
          type: 'jsonb',
          value: 'jsonb_build_array(VARIADIC ARRAY[ARRAY[n/d,1],ARRAY[d,NULL]])',
        },
        { name: 'raw_variadic', type: 'json', value: 'json_build_array(VARIADIC ARRAY[n/d,NULL])' },
        {
          name: 'enum',
          type: 'jsonb',
          value: `jsonb_build_array('a'::stage,ARRAY['b'::stage,NULL],ROW(n,1/d,label)::inner_value)`,
        },
        {
          name: 'variadic_enum',
          type: 'json',
          value: `json_build_array(VARIADIC ARRAY['a'::stage,'b'::stage,NULL])`,
        },
        {
          name: 'coerced_domain',
          type: 'jsonb',
          value: `jsonb_build_array(lower('[1,3)'::positive_span),ARRAY[lower('[1,3)'::positive_span)])`,
        },
        {
          name: 'variadic_domain',
          type: 'jsonb',
          value: `jsonb_build_array(VARIADIC ARRAY[lower('[1,3)'::positive_span),lower('[1,3)'::positive_span)])`,
        },
        {
          name: 'variadic_record',
          type: 'jsonb',
          value: 'jsonb_build_array(VARIADIC ARRAY[ROW(n,1/d,label)::inner_value,NULL])',
        },
        { name: 'float', type: 'jsonb', value: 'jsonb_build_array(n::float8/d::float8)' },
        { name: 'raw_float', type: 'json', value: `json_build_object('f',n::float4/d::float4)` },
        {
          name: 'packed_typed',
          type: 'jsonb',
          value: 'jsonb_build_array(int4multirange(int4range(n,d),int4range(NULL,NULL)))',
        },
        {
          name: 'explicit_typed',
          type: 'jsonb',
          value: 'jsonb_build_array(int4multirange(VARIADIC ARRAY[int4range(n,d)]))',
        },
        { name: 'odd', type: 'jsonb', value: `jsonb_build_object(label,n/d,'orphan')` },
        { name: 'unknown_record', type: 'jsonb', value: `jsonb_build_array(ROW(n,'x'))` },
        { name: 'unknown_field', type: 'jsonb', value: `jsonb_build_array((ROW(n,'x')).f2)` },
        { name: 'prepared', type: 'jsonb', value: 'jsonb_build_array(1/0)' },
      ],
      forms = definitions.flatMap((f) => {
        const row = `ROW(n,${f.value})::r_${f.name}`
        return [
          ['direct', `(${f.value}) IS NOT NULL`],
          ['render', `(${f.value})::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"`],
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
    for (const f of definitions) {
      await pg.exec(`CREATE TYPE r_${f.name} AS(n int4,old ${f.type});
        CREATE FUNCTION pg_temp.observed_${f.name}(n int4,d int4,label text,pick bool) RETURNS text LANGUAGE SQL RETURN (${f.value})::text`)
    }
    for (const f of forms)
      for (const witness of [false, true])
        await pg.exec(
          `CREATE TABLE ${witness ? 'null_' : 'evolving_'}${f.name}(n int4,d int4,label text,pick bool,bypass bool,expected text,CONSTRAINT valid CHECK(${witness ? '(' : ''}CASE WHEN bypass THEN true ELSE ${f.expression} END${witness ? ') IS NULL' : ''}))`,
        )
    for (const f of definitions) await pg.exec(`ALTER TYPE r_${f.name} DROP ATTRIBUTE old`)
    await pg.exec(`ALTER DOMAIN positive ADD CHECK(VALUE>=2);ALTER DOMAIN positive SET NOT NULL;
      ALTER TYPE inner_value DROP ATTRIBUTE old;ALTER TYPE inner_value RENAME ATTRIBUTE v TO score;
      ALTER TYPE inner_value ADD ATTRIBUTE added positive;
      ALTER TYPE stage RENAME VALUE 'a' TO 'cold';
      CREATE FUNCTION public.lower(positive_span) RETURNS int4 LANGUAGE SQL IMMUTABLE STRICT AS 'SELECT 99';
      CREATE FUNCTION public.jsonb_build_array(int4,int4) RETURNS jsonb LANGUAGE SQL IMMUTABLE AS 'SELECT ''[99]''::jsonb';`)
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
      group = prepareCheckRustGroup(plans, {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        extraFloatDigits: 1,
      }),
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
          let rendered: string | null = null
          try {
            rendered = (
              await pg.query<{ value: string | null }>(
                `SELECT pg_temp.observed_${f.family}($1,$2,$3,$4) value`,
                [n, d, label, pick],
              )
            ).rows[0]!.value
          } catch {
            rendered = null
          }
          const params = [n, d, label, pick, bypass, rendered]
          let error: string | undefined,
            rejected = false,
            isNull = false
          try {
            await pg.query(`INSERT INTO evolving_${f.name} VALUES($1,$2,$3,$4,$5,$6)`, params)
          } catch (e) {
            error = (e as { code: string }).code
            rejected = error === '23514' && (e as { constraint?: string }).constraint === 'valid'
          }
          if (!error)
            try {
              await pg.query(`INSERT INTO null_${f.name} VALUES($1,$2,$3,$4,$5,$6)`, params)
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
              expected: input(rendered),
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
            expected: { kind: 'Unknown' },
          },
          expected: bypassExpected.get(f.name)!,
        })
      }
    for (const origin of ['source', 'stored'])
      fixtures.push({
        name: 'expanded_project_' + origin,
        row: {
          n: input(1),
          d: { kind: 'Unknown' },
          label: { kind: 'Unknown' },
          pick: { kind: 'Unknown' },
          bypass: input(false),
          expected: { kind: 'Unknown' },
        },
        expected: { kind: 'True' },
      })
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
      'example.com/row-native-variadic',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 900_000)
