import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

it('preserves stored geometry words, shapes and cached bounds through containers and schema changes', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-row-geometry-constants-')),
    artifact = 'artifacts/goal-checks/geometry-row-constants-active'
  try {
    await pg.exec(`SET search_path=public,pg_catalog;SET extra_float_digits=1;
      CREATE DOMAIN positive AS int4 CHECK(VALUE>=0);CREATE TYPE positive_span AS RANGE(subtype=positive);
      CREATE TYPE inner_value AS(v int4,old int4,label text COLLATE "C");CREATE TYPE stage AS ENUM('a','b');
      CREATE DOMAIN saved_point AS point CHECK(VALUE IS NOT NULL);
      CREATE TYPE saved_fields AS(position saved_point,shape polygon,old integer);`)
    const quoted = async (sql: string) =>
      (await pg.query<{ value: string }>(`SELECT quote_literal((${sql})::text) value`)).rows[0]!
        .value
    const arrays: Record<string, string> = {}
    arrays['point'] = await quoted("ARRAY['(-0,NaN)'::point,NULL::point]")
    arrays['line'] = await quoted("ARRAY['{1,2,-0}'::line,NULL::line]")
    arrays['lseg'] = await quoted("ARRAY['[(1,2),(-0,Infinity)]'::lseg,NULL::lseg]")
    arrays['box'] = await quoted("ARRAY['(1,2),(-0,-0)'::box,NULL::box]")
    arrays['circle'] = await quoted("ARRAY['<(-0,2),3>'::circle,NULL::circle]")
    arrays['path'] = await quoted("ARRAY['[(-0,NaN),(3,4)]'::path,NULL::path]")
    arrays['polygon'] = await quoted("ARRAY['((0,0),(-0,-0),(3,4))'::polygon,NULL::polygon]")
    const record = await quoted(
      "ROW('(1,2)'::saved_point,'((0,0),(-0,-0),(3,4))'::polygon,1)::saved_fields",
    )
    const definitions = [
        { name: 'point', type: 'point', value: "'(-0,NaN)'::point" },
        { name: 'point_wire', type: 'text', value: "encode(point_send('(-0,NaN)'::point),'hex')" },
        { name: 'point_array', type: 'point[]', value: `${arrays.point}::point[]` },
        { name: 'line', type: 'line', value: "'{1,2,-0}'::line" },
        { name: 'line_wire', type: 'text', value: "encode(line_send('{1,2,-0}'::line),'hex')" },
        { name: 'line_array', type: 'line[]', value: `${arrays.line}::line[]` },
        { name: 'lseg', type: 'lseg', value: "'[(1,2),(-0,Infinity)]'::lseg" },
        {
          name: 'lseg_wire',
          type: 'text',
          value: "encode(lseg_send('[(1,2),(-0,Infinity)]'::lseg),'hex')",
        },
        { name: 'lseg_array', type: 'lseg[]', value: `${arrays.lseg}::lseg[]` },
        { name: 'box', type: 'box', value: "'(1,2),(-0,-0)'::box" },
        { name: 'box_wire', type: 'text', value: "encode(box_send('(1,2),(-0,-0)'::box),'hex')" },
        { name: 'box_array', type: 'box[]', value: `${arrays.box}::box[]` },
        { name: 'circle', type: 'circle', value: "'<(-0,2),3>'::circle" },
        {
          name: 'circle_wire',
          type: 'text',
          value: "encode(circle_send('<(-0,2),3>'::circle),'hex')",
        },
        { name: 'circle_array', type: 'circle[]', value: `${arrays.circle}::circle[]` },
        { name: 'path', type: 'path', value: "'[(-0,NaN),(3,4)]'::path" },
        {
          name: 'path_wire',
          type: 'text',
          value: "encode(path_send('[(-0,NaN),(3,4)]'::path),'hex')",
        },
        { name: 'path_array', type: 'path[]', value: `${arrays.path}::path[]` },
        { name: 'polygon', type: 'polygon', value: "'((0,0),(-0,-0),(3,4))'::polygon" },
        {
          name: 'polygon_wire',
          type: 'text',
          value: "encode(poly_send('((0,0),(-0,-0),(3,4))'::polygon),'hex')",
        },
        { name: 'polygon_array', type: 'polygon[]', value: `${arrays.polygon}::polygon[]` },
        { name: 'closed', type: 'path', value: "'((-0,NaN),(3,4))'::path" },
        { name: 'negative_circle', type: 'circle', value: "circle('(-0,2)'::point,-3.0)" },
        {
          name: 'cached_bounds',
          type: 'text',
          value: "encode(box_send(box('((0,0),(-0,-0),(3,4))'::polygon)),'hex')",
        },
        { name: 'record', type: 'saved_fields', value: `${record}::saved_fields` },
        {
          name: 'record_array',
          type: 'saved_fields[]',
          value: `ARRAY[${record}::saved_fields,NULL]`,
        },
        {
          name: 'point_bounds',
          type: 'point[]',
          value: '\'[-2:0]={"(-0,NaN)",NULL,"(1,2)"}\'::point[]',
        },
        {
          name: 'json_values',
          type: 'jsonb',
          value:
            "jsonb_build_array('(-0,NaN)'::point,'[(1,2),(3,4)]'::path,'((0,0),(-0,-0),(3,4))'::polygon)",
        },
        {
          name: 'eager',
          type: 'int4',
          value: "CASE WHEN '(-0,NaN)'::point ~= '(0,NaN)'::point THEN 1/0 ELSE 1 END",
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
      ALTER DOMAIN saved_point ADD CHECK(VALUE IS NULL) NOT VALID;
      ALTER TYPE saved_fields DROP ATTRIBUTE old;ALTER TYPE saved_fields RENAME ATTRIBUTE position TO current_position;`)
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
        name: 'point_project_' + origin,
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
      'example.com/row-geometry-constants',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 900_000)
