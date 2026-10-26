import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

it('preserves stored snapshot words and recursive containers through schema changes without text input', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-row-snapshot-constants-')),
    artifact = 'artifacts/goal-checks/snapshot-row-constants-active'
  try {
    await pg.exec(`SET search_path=public,pg_catalog;
      CREATE DOMAIN saved_snapshot AS pg_snapshot CHECK(pg_snapshot_xmin(VALUE)='1'::xid8);
      CREATE TYPE saved_fields AS(value saved_snapshot,legacy txid_snapshot,old integer);`)
    const quoted = async (sql: string) =>
      (await pg.query<{ value: string }>(`SELECT quote_literal((${sql})::text) value`)).rows[0]!
        .value
    const modern = "'1:9:3,3,5'::pg_snapshot",
      legacy = "'1:9:3,3,5'::txid_snapshot",
      wide = "'9223372036854775809:18446744073709551615:9223372036854775809,18446744073709551614'",
      record = await quoted(
        `ROW(${modern}::saved_snapshot,${wide}::txid_snapshot,1)::saved_fields`,
      ),
      modernArray = await quoted(`ARRAY[${modern},NULL::pg_snapshot,'1:1:'::pg_snapshot]`),
      legacyArray = await quoted(
        `ARRAY[${wide}::txid_snapshot,NULL::txid_snapshot,'1:1:'::txid_snapshot]`,
      ),
      definitions = [
        { name: 'modern', type: 'pg_snapshot', value: modern },
        { name: 'legacy', type: 'txid_snapshot', value: legacy },
        { name: 'empty_modern', type: 'pg_snapshot', value: "'1:1:'::pg_snapshot" },
        { name: 'empty_legacy', type: 'txid_snapshot', value: "'1:1:'::txid_snapshot" },
        { name: 'wide_modern', type: 'pg_snapshot', value: `${wide}::pg_snapshot` },
        { name: 'wide_legacy', type: 'txid_snapshot', value: `${wide}::txid_snapshot` },
        {
          name: 'max_modern',
          type: 'pg_snapshot',
          value: "'18446744073709551615:18446744073709551615:'::pg_snapshot",
        },
        {
          name: 'max_legacy',
          type: 'txid_snapshot',
          value: "'18446744073709551615:18446744073709551615:'::txid_snapshot",
        },
        { name: 'modern_wire', type: 'text', value: `encode(pg_snapshot_send(${modern}),'hex')` },
        {
          name: 'legacy_wire',
          type: 'text',
          value: `encode(txid_snapshot_send(${wide}::txid_snapshot),'hex')`,
        },
        { name: 'modern_min', type: 'xid8', value: `pg_snapshot_xmin(${wide}::pg_snapshot)` },
        { name: 'modern_max', type: 'xid8', value: `pg_snapshot_xmax(${wide}::pg_snapshot)` },
        { name: 'legacy_min', type: 'int8', value: `txid_snapshot_xmin(${wide}::txid_snapshot)` },
        { name: 'legacy_max', type: 'int8', value: `txid_snapshot_xmax(${wide}::txid_snapshot)` },
        { name: 'modern_array', type: 'pg_snapshot[]', value: `${modernArray}::pg_snapshot[]` },
        { name: 'legacy_array', type: 'txid_snapshot[]', value: `${legacyArray}::txid_snapshot[]` },
        { name: 'record', type: 'saved_fields', value: `${record}::saved_fields` },
        {
          name: 'record_array',
          type: 'saved_fields[]',
          value: `ARRAY[${record}::saved_fields,NULL]`,
        },
        {
          name: 'modern_visible',
          type: 'bool',
          value: `pg_visible_in_snapshot('4'::xid8,${modern})`,
        },
        {
          name: 'modern_in_progress',
          type: 'bool',
          value: `pg_visible_in_snapshot('3'::xid8,${modern})`,
        },
        { name: 'legacy_visible', type: 'bool', value: `txid_visible_in_snapshot(4,${legacy})` },
        {
          name: 'legacy_upper',
          type: 'bool',
          value: `txid_visible_in_snapshot(-1,${wide}::txid_snapshot)`,
        },
        {
          name: 'chosen',
          type: 'pg_snapshot',
          value: `CASE WHEN pick THEN ${modern} ELSE NULL::pg_snapshot END`,
        },
        {
          name: 'json_values',
          type: 'jsonb',
          value: `jsonb_build_array(${modern},${legacy},${modernArray}::pg_snapshot[])`,
        },
        {
          name: 'eager',
          type: 'int4',
          value: `CASE WHEN pg_visible_in_snapshot('4'::xid8,${modern}) THEN 1/0 ELSE 1 END`,
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
    await pg.exec(`ALTER DOMAIN saved_snapshot ADD CHECK(pg_snapshot_xmin(VALUE)='2'::xid8) NOT VALID;
      ALTER TYPE saved_fields DROP ATTRIBUTE old;ALTER TYPE saved_fields RENAME ATTRIBUTE value TO current_value;`)
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
        name: 'modern_project_' + origin,
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
      'example.com/row-snapshot-constants',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 900_000)
