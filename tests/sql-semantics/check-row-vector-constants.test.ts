import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

it('preserves stored vector shapes, nominal identity and recursive containers through schema changes without input parsing', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-row-vector-constants-')),
    artifact = 'artifacts/goal-checks/vector-row-constants-active'
  try {
    await pg.exec(`SET search_path=public,pg_catalog;
      CREATE DOMAIN saved_types AS oidvector CHECK(cardinality(VALUE)<=3);
      CREATE TYPE saved_fields AS(positions int2vector,types saved_types,old integer);
      CREATE TYPE position_span AS RANGE(subtype=int2vector,multirange_type_name=position_set);
      CREATE TYPE type_span AS RANGE(subtype=oidvector,multirange_type_name=type_set);`)
    const quoted = async (sql: string) =>
      (await pg.query<{ value: string }>(`SELECT quote_literal((${sql})::text) value`)).rows[0]!
        .value
    const positions = "'-32768 0 32767'::int2vector",
      types = "'4294967295 2147483648 0'::oidvector",
      record = await quoted(`ROW(${positions},${types}::saved_types,1)::saved_fields`),
      posArray = await quoted(`ARRAY[${positions},NULL::int2vector,''::int2vector]`),
      oidArray = await quoted(`ARRAY[${types},NULL::oidvector,''::oidvector]`),
      range = await quoted(`position_span('-1'::int2vector,'3'::int2vector,'[]')`),
      multi = await quoted(`position_set(position_span('-1'::int2vector,'3'::int2vector,'[]'))`),
      oidRange = await quoted(`type_span('0'::oidvector,'4294967295'::oidvector,'[]')`),
      oidMulti = await quoted(`type_set(type_span('0'::oidvector,'4294967295'::oidvector,'[]'))`),
      definitions = [
        { name: 'positions', type: 'int2vector', value: positions },
        { name: 'types', type: 'oidvector', value: types },
        { name: 'empty_positions', type: 'int2vector', value: "''::int2vector" },
        { name: 'empty_types', type: 'oidvector', value: "''::oidvector" },
        { name: 'pos_rank', type: 'int4', value: "array_ndims(''::int2vector)" },
        { name: 'oid_lower', type: 'int4', value: `array_lower(${types},1)` },
        { name: 'pos_wire', type: 'int4', value: `octet_length(int2vectorsend(${positions}))` },
        { name: 'oid_wire', type: 'int4', value: `octet_length(oidvectorsend(${types}))` },
        { name: 'empty_wire', type: 'int4', value: "octet_length(int2vectorsend(''::int2vector))" },
        { name: 'pos_array', type: 'int2vector[]', value: `${posArray}::int2vector[]` },
        { name: 'oid_array', type: 'oidvector[]', value: `${oidArray}::oidvector[]` },
        { name: 'pos_compare', type: 'bool', value: "'-32768 0'::int2vector<'32767'::int2vector" },
        {
          name: 'oid_compare',
          type: 'int4',
          value: "btoidvectorcmp('4294967295'::oidvector,'0 0'::oidvector)",
        },
        { name: 'record', type: 'saved_fields', value: `${record}::saved_fields` },
        {
          name: 'record_array',
          type: 'saved_fields[]',
          value: `ARRAY[${record}::saved_fields,NULL]`,
        },
        { name: 'range', type: 'position_span', value: `${range}::position_span` },
        { name: 'multi', type: 'position_set', value: `${multi}::position_set` },
        { name: 'oid_range', type: 'type_span', value: `${oidRange}::type_span` },
        { name: 'oid_multi', type: 'type_set', value: `${oidMulti}::type_set` },
        { name: 'constructed', type: 'int2vector', value: 'ARRAY[1,2]::int2vector' },
        {
          name: 'oid_constructed',
          type: 'oidvector',
          value: "ARRAY['4294967295'::oid,'0'::oid]::oidvector",
        },
        { name: 'empty_constructed', type: 'int2vector', value: 'ARRAY[]::int2vector' },
        {
          name: 'null_constructed',
          type: 'int2vector',
          value: 'ARRAY[NULL::smallint]::int2vector',
        },
        {
          name: 'multi_constructed',
          type: 'int2vector',
          value: 'ARRAY[ARRAY[1,2],ARRAY[3,4]]::int2vector',
        },
        {
          name: 'chosen',
          type: 'oidvector',
          value: `CASE WHEN pick THEN ${types} ELSE NULL::oidvector END`,
        },
        {
          name: 'json_values',
          type: 'jsonb',
          value: `jsonb_build_array(${positions},${types},${posArray}::int2vector[])`,
        },
        {
          name: 'eager',
          type: 'int4',
          value: "CASE WHEN '1'::int2vector='1'::int2vector THEN 1/0 ELSE 1 END",
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
    await pg.exec(`ALTER DOMAIN saved_types ADD CHECK(cardinality(VALUE)>3) NOT VALID;
      ALTER TYPE saved_fields DROP ATTRIBUTE old;ALTER TYPE saved_fields RENAME ATTRIBUTE positions TO current_positions;`)
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
        name: 'positions_project_' + origin,
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
      'example.com/row-vector-constants',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 900_000)
