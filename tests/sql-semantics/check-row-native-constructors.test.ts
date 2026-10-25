import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

it('preserves historical Boolean tests and physical row constructors through renamed, dropped and added fields', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-row-native-constructors-')),
    artifact = 'artifacts/goal-checks/row-native-constructors-active'
  try {
    await pg.exec(`SET search_path=public,pg_catalog;
      CREATE DOMAIN positive AS int4 CHECK(VALUE>=0);CREATE TYPE positive_span AS RANGE(subtype=positive);
      CREATE TYPE domain_row AS(v positive);CREATE TYPE inner_value AS(v int4,old int4,label text COLLATE "C");
      CREATE TYPE empty_value AS();CREATE TYPE stage AS ENUM('a','b');
      CREATE TYPE child_value AS(v int4);CREATE TYPE nullable_fields AS(v int4);`)
    const definitions = [
        {
          name: 'is_true',
          type: 'int4',
          value: 'CASE WHEN (n/d>0) IS TRUE THEN 1/d ELSE NULL END',
        },
        {
          name: 'not_true',
          type: 'int4',
          value: 'CASE WHEN (n/d>0) IS NOT TRUE THEN 1/d ELSE NULL END',
        },
        {
          name: 'is_false',
          type: 'int4',
          value: 'CASE WHEN (n/d>0) IS FALSE THEN 1/d ELSE NULL END',
        },
        {
          name: 'not_false',
          type: 'int4',
          value: 'CASE WHEN (n/d>0) IS NOT FALSE THEN 1/d ELSE NULL END',
        },
        {
          name: 'is_unknown',
          type: 'int4',
          value: 'CASE WHEN (n/d>0) IS UNKNOWN THEN 1/d ELSE NULL END',
        },
        {
          name: 'not_unknown',
          type: 'int4',
          value: 'CASE WHEN (n/d>0) IS NOT UNKNOWN THEN 1/d ELSE NULL END',
        },
        {
          name: 'anonymous_field',
          type: 'int4',
          value: '(ROW(n/d,label)).f1',
        },
        {
          name: 'anonymous_discarded',
          type: 'int4',
          value: '(ROW(n,label::int4)).f1',
        },
        {
          name: 'anonymous_null',
          type: 'int4',
          value: 'CASE WHEN ROW(n/d,label) IS NULL THEN 1/d ELSE NULL END',
        },
        {
          name: 'anonymous_present',
          type: 'int4',
          value: 'CASE WHEN ROW(n/d,label) IS NOT NULL THEN 1/d ELSE NULL END',
        },
        {
          name: 'anonymous_json',
          type: 'jsonb',
          value: "to_jsonb(ROW(n/d,'a'::stage,'x',NULL))",
        },
        {
          name: 'anonymous_text',
          type: 'text',
          value: 'ROW(n/d,label)::text',
        },
        {
          name: 'unknown_field',
          type: 'text',
          value: "(ROW(n/d,'é😊')).f2::text",
        },
        {
          name: 'named',
          type: 'inner_value',
          value: 'ROW(n,1/d,label)::inner_value',
        },
        {
          name: 'named_json',
          type: 'jsonb',
          value: 'to_jsonb(ROW(n,1/d,label)::inner_value)',
        },
        {
          name: 'named_field',
          type: 'int4',
          value: '(ROW(n,1/d,label)::inner_value).v',
        },
        {
          name: 'named_discarded',
          type: 'int4',
          value: '(ROW(n,label::int4,label)::inner_value).v',
        },
        {
          name: 'named_null',
          type: 'int4',
          value: 'CASE WHEN ROW(n,1/d,label)::inner_value IS NULL THEN 1/d ELSE NULL END',
        },
        {
          name: 'named_present',
          type: 'int4',
          value: 'CASE WHEN ROW(n,1/d,label)::inner_value IS NOT NULL THEN 1/d ELSE NULL END',
        },
        {
          name: 'empty_named',
          type: 'empty_value',
          value: 'ROW()::empty_value',
        },
        {
          name: 'empty_anonymous',
          type: 'int4',
          value: 'CASE WHEN ROW() IS NULL AND ROW() IS NOT NULL THEN 1/d ELSE NULL END',
        },
        {
          name: 'domain',
          type: 'int4',
          value:
            "CASE WHEN (to_jsonb(ROW(lower('[1,3)'::positive_span))::domain_row)->>'v')::int4=1 THEN 1/d ELSE NULL END",
        },
        {
          name: 'prepared',
          type: 'int4',
          value: '(ROW(n,1/0,label)::inner_value).v',
        },
        {
          name: 'added_nulls',
          type: 'int4',
          value: `CASE WHEN to_jsonb(ROW(1)::nullable_fields)='{"v":1,"phase":null,"phases":null,"span":null,"nested":null,"positive":null}'::jsonb THEN 1/d ELSE NULL END`,
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
    await pg.exec(`ALTER TYPE inner_value DROP ATTRIBUTE old;
      ALTER TYPE inner_value RENAME ATTRIBUTE v TO score;ALTER TYPE inner_value ADD ATTRIBUTE added positive;
      ALTER DOMAIN positive ADD CHECK(VALUE>=10);ALTER DOMAIN positive SET NOT NULL;
      ALTER TYPE nullable_fields ADD ATTRIBUTE phase stage, ADD ATTRIBUTE phases stage[],
        ADD ATTRIBUTE span int4range, ADD ATTRIBUTE nested child_value, ADD ATTRIBUTE positive positive;
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
    for (const f of forms.filter((f) =>
      ['anonymous_discarded', 'named_discarded'].includes(f.family),
    ))
      for (const origin of ['source', 'stored'])
        fixtures.push({
          name: f.name + '_' + origin,
          row: {
            n: input(1),
            d: { kind: 'Unknown' },
            label: { kind: 'Unknown' },
            pick: { kind: 'Unknown' },
            bypass: input(false),
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
      'example.com/row-native-constructors',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 900_000)
