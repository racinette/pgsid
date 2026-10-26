import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

it('preserves stored full-text trees, document positions and recursive containers through schema changes', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-row-fulltext-constants-')),
    artifact = 'artifacts/goal-checks/fulltext-row-constants-active'
  try {
    await pg.exec(`SET search_path=public,pg_catalog;
      CREATE DOMAIN saved_document AS tsvector CHECK(length(VALUE)<=3);
      CREATE TYPE saved_fields AS(document saved_document,query tsquery,old integer);
      CREATE TYPE document_span AS RANGE(subtype=tsvector,multirange_type_name=document_set);
      CREATE TYPE query_span AS RANGE(subtype=tsquery,multirange_type_name=query_set);`)
    const quoted = async (sql: string) =>
      (await pg.query<{ value: string }>(`SELECT quote_literal((${sql})::text) value`)).rows[0]!
        .value
    const document = '$v$a:1A,3B é:2C 😀$v$::tsvector',
      query = '$q$a & (é | 😀:*)$q$::tsquery',
      record = await quoted(`ROW(${document}::saved_document,${query},1)::saved_fields`),
      documents = await quoted(`ARRAY[${document},NULL::tsvector,''::tsvector]`),
      queries = await quoted(`ARRAY[${query},NULL::tsquery,''::tsquery]`),
      documentRange = await quoted(`document_span('a:1A'::tsvector,'z:2B'::tsvector,'[]')`),
      queryRange = await quoted(`query_span('a'::tsquery,'z'::tsquery,'[]')`),
      queryMulti = await quoted(`query_set(query_span('a'::tsquery,'z'::tsquery,'[]'))`),
      definitions = [
        { name: 'document', type: 'tsvector', value: document },
        { name: 'query', type: 'tsquery', value: query },
        { name: 'empty_document', type: 'tsvector', value: "''::tsvector" },
        { name: 'empty_query', type: 'tsquery', value: "''::tsquery" },
        { name: 'grouped_query', type: 'tsquery', value: "'a & (b & c)'::tsquery" },
        { name: 'phrase_query', type: 'tsquery', value: "'a <2> (!b | c:*AB)'::tsquery" },
        { name: 'stripped', type: 'tsvector', value: `strip(${document})` },
        { name: 'weighted', type: 'tsvector', value: `setweight(${document},'B')` },
        { name: 'document_wire', type: 'text', value: `encode(tsvectorsend(${document}),'hex')` },
        { name: 'query_wire', type: 'text', value: `encode(tsquerysend(${query}),'hex')` },
        { name: 'document_size', type: 'int4', value: `length(${document})` },
        { name: 'query_nodes', type: 'int4', value: `numnode(${query})` },
        { name: 'document_array', type: 'tsvector[]', value: `${documents}::tsvector[]` },
        { name: 'query_array', type: 'tsquery[]', value: `${queries}::tsquery[]` },
        { name: 'record', type: 'saved_fields', value: `${record}::saved_fields` },
        {
          name: 'record_array',
          type: 'saved_fields[]',
          value: `ARRAY[${record}::saved_fields,NULL]`,
        },
        { name: 'document_range', type: 'document_span', value: `${documentRange}::document_span` },
        { name: 'query_range', type: 'query_span', value: `${queryRange}::query_span` },
        { name: 'query_multi', type: 'query_set', value: `${queryMulti}::query_set` },
        { name: 'matched', type: 'bool', value: `${document} @@ ${query}` },
        { name: 'not_matched', type: 'bool', value: `${document} @@ 'missing'::tsquery` },
        { name: 'ordered', type: 'bool', value: "'a'::tsvector<'z'::tsvector" },
        {
          name: 'chosen',
          type: 'tsquery',
          value: `CASE WHEN pick THEN ${query} ELSE NULL::tsquery END`,
        },
        {
          name: 'json_values',
          type: 'jsonb',
          value: `jsonb_build_array(${document},${query},${documents}::tsvector[])`,
        },
        {
          name: 'eager',
          type: 'int4',
          value: `CASE WHEN ${document} @@ ${query} THEN 1/0 ELSE 1 END`,
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
    await pg.exec(`ALTER DOMAIN saved_document ADD CHECK(length(VALUE)>3) NOT VALID;
      ALTER TYPE saved_fields DROP ATTRIBUTE old;ALTER TYPE saved_fields RENAME ATTRIBUTE document TO current_document;`)
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
        nativeByteOrder: 'little',
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
        name: 'document_project_' + origin,
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
      'example.com/row-fulltext-constants',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 900_000)
