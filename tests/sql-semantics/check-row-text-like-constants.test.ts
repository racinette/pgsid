import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

it('preserves stored char bytes, name strings and refcursor values through containers and schema changes', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-row-text-like-constants-')),
    artifact = 'artifacts/goal-checks/text-like-row-constants-active'
  try {
    await pg.exec(`SET search_path=public,pg_catalog;SET extra_float_digits=1;
      CREATE DOMAIN positive AS int4 CHECK(VALUE>=0);CREATE TYPE positive_span AS RANGE(subtype=positive);
      CREATE TYPE inner_value AS(v int4,old int4,label text COLLATE "C");CREATE TYPE stage AS ENUM('a','b');
      CREATE DOMAIN saved_name AS name CHECK(VALUE <> 'deny');
      CREATE TYPE saved_fields AS(label saved_name,octet "char",cursor refcursor,old integer);`)
    const quotedArray = async (sql: string) =>
      (await pg.query<{ value: string }>(`SELECT quote_literal((${sql})::text) value`)).rows[0]!
        .value
    const charArray = await quotedArray(
        'ARRAY[' +
          Array.from(
            { length: 256 },
            (_, i) => "'\\" + i.toString(8).padStart(3, '0') + '\'::"char"',
          ).join(',') +
          ']',
      ),
      nameArray = await quotedArray(`ARRAY['${'é😊'.repeat(40)}'::name,NULL::name,'tail '::name]`),
      cursorArray = await quotedArray(
        `ARRAY['cursor é😊'::refcursor,NULL::refcursor,'${'long'.repeat(40)}'::refcursor]`,
      )
    const definitions = [
        { name: 'char_zero', type: '"char"', value: '\'\\000\'::"char"' },
        { name: 'char_high', type: '"char"', value: '\'\\377\'::"char"' },
        { name: 'char_middle', type: '"char"', value: '\'\\200\'::"char"' },
        { name: 'char_runtime', type: '"char"', value: '(n/d)::"char"' },
        { name: 'char_send', type: 'bytea', value: 'charsend(\'\\377\'::"char")' },
        { name: 'char_compare', type: 'bool', value: '\'\\377\'::"char"=(n/d)::"char"' },
        { name: 'name_short', type: 'name', value: "'alpha '::name" },
        {
          name: 'name_long',
          type: 'name',
          value:
            "'é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊'::name",
        },
        { name: 'name_unicode', type: 'name', value: "'é😊'::name" },
        { name: 'name_empty', type: 'name', value: "''::name" },
        { name: 'name_send', type: 'bytea', value: "namesend('é😊'::name)" },
        {
          name: 'name_compare',
          type: 'bool',
          value: "'alpha '::name=(CASE WHEN pick THEN 'alpha '::name ELSE 'different'::name END)",
        },
        { name: 'cursor', type: 'refcursor', value: "'cursor é😊'::refcursor" },
        {
          name: 'cursor_long',
          type: 'refcursor',
          value:
            "'long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long long '::refcursor",
        },
        { name: 'cursor_text', type: 'text', value: "('cursor é😊'::refcursor)::text" },
        { name: 'name_array', type: 'name[]', value: `${nameArray}::name[]` },
        { name: 'char_array', type: '"char"[]', value: `${charArray}::"char"[]` },
        { name: 'cursor_array', type: 'refcursor[]', value: `${cursorArray}::refcursor[]` },
        { name: 'name_bounds', type: 'name[]', value: '\'[-2:0]={alpha,NULL,"tail "}\'::name[]' },
        {
          name: 'char_nested',
          type: 'jsonb',
          value:
            'jsonb_build_array(\'\\000\'::"char",\'\\200\'::"char",\'\\377\'::"char",ARRAY[\'\\000\'::"char",\'\\377\'::"char",NULL])',
        },
        {
          name: 'name_nested',
          type: 'jsonb',
          value:
            "jsonb_build_array('é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊é😊'::name,ARRAY['é😊'::name,NULL])",
        },
        {
          name: 'coerced_record',
          type: 'saved_fields',
          value: "'(ok,\\\\377,cursor,1)'::saved_fields",
        },
        {
          name: 'coerced_array',
          type: 'saved_fields[]',
          value: "ARRAY['(ok,\\\\377,cursor,1)'::saved_fields,NULL]",
        },
        {
          name: 'eager',
          type: 'int4',
          value: "CASE WHEN 'alpha'::name='alpha'::name THEN 1/0 ELSE 1 END",
        },
        { name: 'lazy', type: 'int4', value: 'CASE WHEN pick THEN 1 ELSE n/d END' },
      ],
      forms = definitions.flatMap((f) => {
        const row = `ROW(n,${f.value})::r_${f.name}`,
          rendered = f.type === 'bytea' ? `encode(${f.value},'hex')` : `(${f.value})::text`
        return [
          ['direct', `(${f.value}) IS NOT NULL`],
          ['render', `${rendered} COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"`],
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
      const rendered = f.type === 'bytea' ? `encode(${f.value},'hex')` : `(${f.value})::text`
      await pg.exec(`CREATE TYPE r_${f.name} AS(n int4,old ${f.type});
        CREATE FUNCTION pg_temp.observed_${f.name}(n int4,d int4,label text,pick bool) RETURNS text LANGUAGE SQL RETURN ${rendered}`)
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
      ALTER DOMAIN saved_name ADD CHECK(VALUE='deny') NOT VALID;
      ALTER TYPE saved_fields DROP ATTRIBUTE old;ALTER TYPE saved_fields RENAME ATTRIBUTE label TO current_label;`)
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
        clientEncoding: 'UTF8',
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
        [1, 1, '<r/>', true],
        [1, 0, '<r/>', false],
        [2, 0, '<?xml version="1.0"?><r/>', true],
        [3, 2, '<r><a/></r>', true],
        [null, 0, null, false],
        [null, null, '', null],
        [-1, 1, 'é😊', false],
        [1, 2, '2', null],
        [32768, 1, 'é😊', true],
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
        name: 'name_long_project_' + origin,
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
      'example.com/row-text-like-constants',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 900_000)
