import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

it('preserves opaque stored system values through containers and schema changes without input parsing', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-row-system-constants-')),
    artifact = 'artifacts/goal-checks/system-row-constants-active'
  try {
    await pg.exec(`SET search_path=public,pg_catalog;SET extra_float_digits=1;
      CREATE DOMAIN positive AS int4 CHECK(VALUE>=0);CREATE TYPE positive_span AS RANGE(subtype=positive);
      CREATE TYPE inner_value AS(v int4,old int4,label text COLLATE "C");CREATE TYPE stage AS ENUM('a','b');
      CREATE DOMAIN saved_tid AS tid CHECK(VALUE IS NOT NULL);
      CREATE TYPE saved_fields AS(number oid,pointer saved_tid,transaction xid8,old integer);`)
    const quoted = async (sql: string) =>
      (await pg.query<{ value: string }>(`SELECT quote_literal((${sql})::text) value`)).rows[0]!
        .value
    const arrays: Record<string, string> = {}
    arrays['oid'] = await quoted("ARRAY['4294967295'::oid,NULL::oid,'0'::oid]")
    arrays['xid'] = await quoted("ARRAY['4294967295'::xid,NULL::xid,'0'::xid]")
    arrays['cid'] = await quoted("ARRAY['4294967295'::cid,NULL::cid,'0'::cid]")
    arrays['xid8'] = await quoted("ARRAY['18446744073709551615'::xid8,NULL::xid8,'0'::xid8]")
    arrays['pg_lsn'] = await quoted("ARRAY['FFFFFFFF/FFFFFFFF'::pg_lsn,NULL::pg_lsn,'0/0'::pg_lsn]")
    arrays['tid'] = await quoted("ARRAY['(305419896,4660)'::tid,NULL::tid,'(0,0)'::tid]")
    const record = await quoted(
      "ROW('4294967295'::oid,'(305419896,4660)'::saved_tid,'18446744073709551615'::xid8,1)::saved_fields",
    )
    const definitions = [
        { name: 'oid', type: 'oid', value: "'4294967295'::oid" },
        { name: 'oid_wire', type: 'text', value: "encode(oidsend('4294967295'::oid),'hex')" },
        { name: 'oid_array', type: 'oid[]', value: `${arrays.oid}::oid[]` },
        { name: 'oid_zero', type: 'oid', value: "'0'::oid" },
        { name: 'xid', type: 'xid', value: "'4294967295'::xid" },
        { name: 'xid_wire', type: 'text', value: "encode(xidsend('4294967295'::xid),'hex')" },
        { name: 'xid_array', type: 'xid[]', value: `${arrays.xid}::xid[]` },
        { name: 'xid_zero', type: 'xid', value: "'0'::xid" },
        { name: 'cid', type: 'cid', value: "'4294967295'::cid" },
        { name: 'cid_wire', type: 'text', value: "encode(cidsend('4294967295'::cid),'hex')" },
        { name: 'cid_array', type: 'cid[]', value: `${arrays.cid}::cid[]` },
        { name: 'cid_zero', type: 'cid', value: "'0'::cid" },
        { name: 'xid8', type: 'xid8', value: "'18446744073709551615'::xid8" },
        {
          name: 'xid8_wire',
          type: 'text',
          value: "encode(xid8send('18446744073709551615'::xid8),'hex')",
        },
        { name: 'xid8_array', type: 'xid8[]', value: `${arrays.xid8}::xid8[]` },
        { name: 'xid8_zero', type: 'xid8', value: "'0'::xid8" },
        { name: 'pg_lsn', type: 'pg_lsn', value: "'FFFFFFFF/FFFFFFFF'::pg_lsn" },
        {
          name: 'pg_lsn_wire',
          type: 'text',
          value: "encode(pg_lsn_send('FFFFFFFF/FFFFFFFF'::pg_lsn),'hex')",
        },
        { name: 'pg_lsn_array', type: 'pg_lsn[]', value: `${arrays.pg_lsn}::pg_lsn[]` },
        { name: 'pg_lsn_zero', type: 'pg_lsn', value: "'0/0'::pg_lsn" },
        { name: 'tid', type: 'tid', value: "'(305419896,4660)'::tid" },
        { name: 'tid_wire', type: 'text', value: "encode(tidsend('(305419896,4660)'::tid),'hex')" },
        { name: 'tid_array', type: 'tid[]', value: `${arrays.tid}::tid[]` },
        { name: 'tid_zero', type: 'tid', value: "'(0,0)'::tid" },
        { name: 'xid8_high', type: 'xid8', value: "'9223372036854775808'::xid8" },
        { name: 'lsn_high', type: 'pg_lsn', value: "'80000000/0'::pg_lsn" },
        { name: 'tid_max', type: 'tid', value: "'(4294967295,65535)'::tid" },
        { name: 'record', type: 'saved_fields', value: `${record}::saved_fields` },
        {
          name: 'record_array',
          type: 'saved_fields[]',
          value: `ARRAY[${record}::saved_fields,NULL]`,
        },
        { name: 'oid_cast', type: 'int4', value: "('4294967295'::oid)::int4" },
        {
          name: 'selected_oid',
          type: 'oid',
          value: "CASE WHEN pick THEN '4294967295'::oid ELSE NULL::oid END",
        },
        {
          name: 'json_values',
          type: 'jsonb',
          value:
            "jsonb_build_array('4294967295'::oid,'4294967295'::xid,'4294967295'::cid,'18446744073709551615'::xid8,'FFFFFFFF/FFFFFFFF'::pg_lsn,'(305419896,4660)'::tid)",
        },
        {
          name: 'eager',
          type: 'int4',
          value: "CASE WHEN '4294967295'::oid='4294967295'::oid THEN 1/0 ELSE 1 END",
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
      ALTER DOMAIN saved_tid ADD CHECK(VALUE IS NULL) NOT VALID;
      ALTER TYPE saved_fields DROP ATTRIBUTE old;ALTER TYPE saved_fields RENAME ATTRIBUTE number TO current_number;`)
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
        name: 'oid_project_' + origin,
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
      'example.com/row-system-constants',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 900_000)
