import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'
import { readCompositeFixture } from './check-composite-fixtures.js'

it('converts captured records and nested containers to JSON and JSONB with native field names, raw layout, NULLs and strict pretty flags', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-composite-json-'))
  const artifact = 'artifacts/goal-checks/composite-json-active'
  try {
    await pg.exec(`CREATE TYPE stage AS ENUM('z','a');CREATE TYPE leaf AS(n int2,obsolete int4,label varchar(3),flag bool,phase stage,amount numeric(6,2),raw json,document jsonb,span int4range);ALTER TYPE leaf DROP ATTRIBUTE obsolete;
CREATE DOMAIN approved AS leaf CHECK((VALUE).n>0);CREATE TYPE keys_record AS("é" text,"two words" int4,"quote""name" json);CREATE TYPE leaf_span AS RANGE(subtype=leaf);CREATE TYPE packet AS(current_reading leaf,backup approved,readings approved[],labels stage[],payload json,named keys_record,bounded leaf_span);CREATE TYPE no_fields AS();`)
    const forms: Record<string, string> = {
      json: 'to_json(value)::text',
      row: 'row_to_json(value)::text',
      pretty: 'row_to_json(value,pretty)::text',
      binary: 'to_jsonb(value)::text',
      array: 'json_build_array(value,other)::text',
      object: "json_build_object('row',value)::text",
      binary_array: 'jsonb_build_array(value,other)::text',
      binary_object: "jsonb_build_object('row',value)::text",
      key: 'json_build_object(value,1)::text',
      binary_key: 'jsonb_build_object(value,1)::text',
      rows: 'array_to_json(ARRAY[value,other])::text',
      pretty_rows: 'array_to_json(ARRAY[value,other],pretty)::text',
      binary_rows: 'to_jsonb(ARRAY[value,other])::text',
      coalesced: 'to_jsonb(COALESCE(value,other))::text',
      empty: 'row_to_json(empty,pretty)::text',
      variadic: 'json_build_array(VARIADIC ARRAY[value,other])::text',
      variadic_object: 'json_build_object(VARIADIC ARRAY[value,other])::text',
      binary_variadic_object: 'jsonb_build_object(VARIADIC ARRAY[value,other])::text',
      constructed: `to_json(ROW(2,'abc',false,'z',1.25,'{"x":1}'::json,'{}'::jsonb,'[1,3)'::int4range)::leaf)::text`,
      reparsed: 'to_json(value::text::packet)::text',
    }
    for (const [name, expression] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE gate_${name}(value packet,other packet,empty no_fields,pretty bool,skip bool,expected text,CONSTRAINT valid CHECK(CASE WHEN skip THEN true ELSE (${expression}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END))`,
      )
    await pg.exec('CREATE TABLE oracle(value packet,other packet,empty no_fields,pretty bool)')
    const catalog = await snapshotCatalog(pg)
    const plans = Object.keys(forms).flatMap((name) => {
      const t = catalog.tables.find((t) => t.name === 'gate_' + name)!,
        c = t.constraints.find((c) => c.name === 'valid')!
      return (['source', 'stored'] as const).map((origin) => ({
        name: name + '_' + origin,
        expression: lowerTableCheck(
          t,
          c,
          catalog.enums,
          catalog.domains,
          origin,
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
        )!.expression,
        identity: { schema: 'public', kind: 'table' as const, owner: t.name, constraint: origin },
      }))
    })
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      arrayNulls: true,
    })
    await mkdir(artifact, { recursive: true })
    await writeFile(
      join(artifact, 'plans.json'),
      JSON.stringify({ plans, checks: group.checks }, null, 2),
    )
    for (const [i, c] of group.checks.entries())
      expect(c.kind, plans[i]!.name + ': ' + JSON.stringify(c)).toBe('supported')
    const leaf = `ROW(2,'abc',false,'z',1.25,'{ "x":1,"x":2 }'::json,'{"é":1.00,"a":2}'::jsonb,'[1,3)'::int4range)::leaf`
    const packet = `ROW(${leaf},${leaf}::approved,ARRAY[${leaf}::approved,NULL::approved],ARRAY['z'::stage,NULL,'a'::stage],'{ "before":1,"before":2 }'::json,ROW('snow',7,'{ "q":1 }'::json)::keys_record,leaf_span(${leaf},NULL))::packet`
    const samples = [
      ['NULL::packet', 'NULL::packet', false],
      ['ROW(NULL,NULL,NULL,NULL,NULL,NULL,NULL)::packet', 'NULL::packet', true],
      [packet, 'NULL::packet', false],
      [packet, packet, true],
      ['NULL::packet', packet, null],
      [
        `ROW(NULL,NULL,'{}'::approved[],'{}'::stage[],'null'::json,NULL,NULL)::packet`,
        packet,
        true,
      ],
    ] as const
    const types = new Map<string, string>()
    for (const c of group.checks)
      if (c.kind === 'supported')
        for (const i of c.inputs)
          if (['value', 'other', 'empty'].includes(i.name)) types.set(i.name, i.type)
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    for (const [index, [left, right, pretty]] of samples.entries()) {
      await pg.exec('TRUNCATE oracle')
      await pg.query(`INSERT INTO oracle SELECT ${left},${right},'()'::no_fields,$1`, [pretty])
      const values = (
        await pg.query<{ value: string | null; other: string | null }>(
          'SELECT value::text value,other::text other FROM oracle',
        )
      ).rows[0]!
      const row: Row = {
        pretty: pretty === null ? { kind: 'Null' } : { kind: 'Value', value: pretty },
      }
      for (const name of ['value', 'other', 'empty']) {
        const payload = await readCompositeFixture(
          pg,
          `SELECT "${name}" FROM oracle`,
          name,
          types.get(name)!,
        )
        row[name] = payload === null ? { kind: 'Null' } : { kind: 'Value', value: payload }
      }
      for (const [name, expression] of Object.entries(forms)) {
        let output: string | null = null,
          error: string | undefined
        try {
          output = (
            await pg.query<{ value: string | null }>(`SELECT ${expression} value FROM oracle`)
          ).rows[0]!.value
        } catch (e) {
          error = (e as { code: string }).code
        }
        for (const skip of [false, true])
          for (const wrong of index === 2 ? [false, true] : [false]) {
            const expectedText = wrong ? 'wrong' : output,
              code = !skip ? (error ?? (wrong ? '23514' : undefined)) : undefined
            const expected: Outcome =
              error && !skip
                ? { kind: 'Error', value: { state: parseInt(error, 36) } }
                : code
                  ? { kind: 'False' }
                  : { kind: 'True' }
            const input: Row = {
              ...row,
              skip: { kind: 'Value', value: skip },
              expected:
                expectedText === null ? { kind: 'Null' } : { kind: 'Value', value: expectedText },
            }
            const insert = pg.query(
              `INSERT INTO gate_${name} SELECT value,other,empty,pretty,$1,$2 FROM oracle`,
              [skip, expectedText],
            )
            if (code) await expect(insert).rejects.toMatchObject({ code })
            else await insert
            for (const origin of ['source', 'stored'])
              fixtures.push({ name: name + '_' + origin, row: input, expected })
            reference.push({ index, name, skip, wrong, output, error, ...values })
          }
      }
    }
    await writeFile(
      join(artifact, 'fixtures.json'),
      JSON.stringify(
        fixtures,
        (_key, value) => (typeof value === 'bigint' ? value.toString() + 'n' : value),
        2,
      ),
    )
    await writeFile(join(artifact, 'evaluators.rs'), group.evaluatorSource!)
    await runCheckParity(
      root,
      'compositejson',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
    await writeFile(
      join(artifact, 'report.json'),
      JSON.stringify(
        { fixtures: fixtures.length, nativeInserts: reference.length, reference },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)

it('ignores record and array JSON casts while preserving reached field-cast requirements and record-key errors', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-composite-json-casts-')),
    artifact = 'artifacts/goal-checks/composite-json-active'
  try {
    await pg.exec(`CREATE TYPE phase AS ENUM('z','a');CREATE FUNCTION phase_json(phase) RETURNS json LANGUAGE sql IMMUTABLE STRICT AS $$SELECT json_build_object('cast',$1::text)$$;CREATE CAST(phase AS json) WITH FUNCTION phase_json(phase);
CREATE FUNCTION phases_json(phase[]) RETURNS json LANGUAGE plpgsql IMMUTABLE STRICT AS $$BEGIN RAISE EXCEPTION 'array cast must not run';END$$;CREATE CAST(phase[] AS json) WITH FUNCTION phases_json(phase[]);
CREATE TYPE leaf AS(n int4,phase phase,phases phase[]);CREATE FUNCTION leaf_json(leaf) RETURNS json LANGUAGE plpgsql IMMUTABLE STRICT AS $$BEGIN RAISE EXCEPTION 'record cast must not run';END$$;CREATE CAST(leaf AS json) WITH FUNCTION leaf_json(leaf);`)
    const forms: Record<string, string> = {
      json: 'to_json(value)::text',
      binary: 'to_jsonb(value)::text',
      row: 'row_to_json(value)::text',
      array: 'array_to_json(ARRAY[value])::text',
      key: 'json_build_object(value,1)::text',
      binary_key: 'jsonb_build_object(value,1)::text',
      variadic_key: 'json_build_object(VARIADIC ARRAY[value,value])::text',
      binary_variadic_key: 'jsonb_build_object(VARIADIC ARRAY[value,value])::text',
    }
    for (const [name, expression] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE gate_${name}(value leaf,expected text,skip bool,CONSTRAINT valid CHECK(CASE WHEN skip THEN true ELSE (${expression}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END))`,
      )
    await pg.exec('CREATE TABLE oracle(value leaf)')
    const catalog = await snapshotCatalog(pg)
    for (const name of ['phase', '_phase', 'leaf'])
      expect(
        catalog.compositeTypeGraph!.definitions.find(
          (d) => d.schema === 'public' && d.name === name,
        )!.jsonCast,
      ).toBeTruthy()
    const plans = Object.keys(forms).flatMap((name) => {
      const t = catalog.tables.find((t) => t.name === 'gate_' + name)!,
        c = t.constraints.find((c) => c.name === 'valid')!
      return (['source', 'stored'] as const).map((origin) => ({
        name: name + '_' + origin,
        expression: lowerTableCheck(
          t,
          c,
          catalog.enums,
          catalog.domains,
          origin,
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
        )!.expression,
        identity: { schema: 'public', kind: 'table' as const, owner: t.name, constraint: origin },
      }))
    })
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      arrayNulls: true,
    })
    for (const [i, c] of group.checks.entries())
      expect(c.kind, plans[i]!.name + ': ' + JSON.stringify(c)).toBe('supported')
    const check = group.checks[0]!
    if (check.kind !== 'supported') throw new Error('Missing JSON check')
    const type = check.inputs.find((i) => i.name === 'value')!.type
    const samples = [
      ['NULL::leaf', false],
      [`ROW(1,NULL,'{}'::phase[])::leaf`, false],
      [`ROW(1,NULL,ARRAY[NULL]::phase[])::leaf`, false],
      [`ROW(1,'z',ARRAY['a'::phase])::leaf`, true],
      [`ROW(1,NULL,ARRAY['z'::phase])::leaf`, true],
    ] as const
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    for (const [sql, requiresCast] of samples) {
      await pg.exec('TRUNCATE oracle')
      await pg.exec(`INSERT INTO oracle VALUES(${sql})`)
      const payload = await readCompositeFixture(pg, 'SELECT value FROM oracle', 'value', type)
      for (const [name, expression] of Object.entries(forms)) {
        let output: string | null = null,
          error: string | undefined
        try {
          output = (
            await pg.query<{ value: string | null }>(`SELECT ${expression} value FROM oracle`)
          ).rows[0]!.value
        } catch (e) {
          error = (e as { code: string }).code
        }
        for (const skip of [false, true]) {
          const insert = pg.query(`INSERT INTO gate_${name} SELECT value,$1,$2 FROM oracle`, [
            output,
            skip,
          ])
          if (error && !skip) await expect(insert).rejects.toMatchObject({ code: error })
          else await insert
          const expected: Outcome = skip
            ? { kind: 'True' }
            : error
              ? { kind: 'Error', value: { state: parseInt(error, 36) } }
              : requiresCast
                ? { kind: 'Unknown' }
                : { kind: 'True' }
          const row: Row = {
            value: payload === null ? { kind: 'Null' } : { kind: 'Value', value: payload },
            skip: { kind: 'Value', value: skip },
            expected: output === null ? { kind: 'Null' } : { kind: 'Value', value: output },
          }
          for (const origin of ['source', 'stored'])
            fixtures.push({ name: name + '_' + origin, row, expected })
          reference.push({ sql, name, skip, output, error, expected })
        }
      }
    }
    await runCheckParity(
      root,
      'compositejsoncasts',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
    await writeFile(
      join(artifact, 'casts-report.json'),
      JSON.stringify(
        { fixtures: fixtures.length, nativeInserts: reference.length, reference },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
