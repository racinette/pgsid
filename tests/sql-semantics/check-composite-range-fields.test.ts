import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { rangeTypeProfile, multirangeTypeProfile } from '../../src/sql-semantics/range-profiles.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'
import { readRangeFixture } from './check-range-fixtures.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'

it('admits custom range fields inside composite bounds through domains, arrays, nested records and multiranges', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-composite-range-fields-'))
  const artifact = 'artifacts/goal-checks/composite-range-field-dependencies-active'
  try {
    await pg.exec(`CREATE TYPE stage AS ENUM('z','a');CREATE TYPE inner_span AS RANGE(subtype=int2);CREATE TYPE phase_span AS RANGE(subtype=stage);
CREATE DOMAIN checked_span AS inner_span NOT NULL CHECK(NOT isempty(VALUE));CREATE DOMAIN batch AS checked_span[] CHECK(cardinality(VALUE)<=3);
CREATE TYPE child AS(part inner_span,parts inner_span_multirange);
CREATE TYPE entry AS(n int2,selected checked_span,phase phase_span,parts inner_span_multirange,history batch,nested child);
CREATE TYPE entry_span AS RANGE(subtype=entry);CREATE TYPE entry_array_span AS RANGE(subtype=entry[]);CREATE TYPE outer_span AS RANGE(subtype=entry_span);`)
    const bound = (n: number, part: string) =>
      `ROW(${n},'${part}'::checked_span,'[z,a)'::phase_span,'{[1,3),[5,8)}'::inner_span_multirange,ARRAY['[1,3)'::checked_span]::batch,ROW('[2,4)'::inner_span,'{}'::inner_span_multirange)::child)::entry`
    const expression = `entry_span(${bound(1, '[1,3)')},${bound(3, '[2,4)')})`
    const equalPrefix = `entry_span(${bound(1, '[1,3)')},${bound(1, '[2,4)')})`
    const text = async (sql: string) =>
      (await pg.query<{ value: string }>(`SELECT (${sql})::text value`)).rows[0]!.value
    const value = await text(expression),
      sameN = await text(equalPrefix),
      single = await text(`entry_span(${bound(1, '[1,3)')},NULL)`)
    const inputs: Record<string, (string | null)[]> = {
      entry_span: [
        null,
        'empty',
        '(,)',
        value,
        sameN,
        single,
        'bad',
        value.replaceAll('[1,3)', '[32768,3)'),
        value.replaceAll('[1,3)', 'empty'),
        value.replaceAll('[z,a)', '[missing,a)'),
      ],
      entry_span_multirange: [null, '{}', '{' + value + '}', '{' + sameN + '}', '{' + single + '}'],
      entry_array_span: [
        null,
        'empty',
        '(,)',
        await text(
          `entry_array_span(ARRAY[${bound(1, '[1,3)')},NULL],ARRAY[${bound(3, '[2,4)')}])`,
        ),
      ],
      outer_span: [
        null,
        'empty',
        '(,)',
        await text(`outer_span(${expression},entry_span(${bound(5, '[1,3)')},NULL))`),
      ],
    }
    for (const type of Object.keys(inputs))
      for (const mode of ['text', 'typed'])
        await pg.exec(
          `CREATE TABLE gate_${type}_${mode}(payload ${mode === 'text' ? 'text' : type},expected text,bypass bool,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE (payload::${type})::text COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END))`,
        )
    const catalog = await snapshotCatalog(pg)
    const plans = Object.keys(inputs).flatMap((type) =>
      ['text', 'typed'].flatMap((mode) => {
        const table = catalog.tables.find((t) => t.name === `gate_${type}_${mode}`)!,
          constraint = table.constraints.find((c) => c.name === 'valid')!
        return (['source', 'stored'] as const).map((origin) => ({
          name: `${type}_${mode}_${origin}`,
          expression: lowerTableCheck(
            table,
            constraint,
            catalog.enums,
            catalog.domains,
            origin,
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
          )!.expression,
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: origin,
          },
        }))
      }),
    )
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      arrayNulls: true,
    })
    await mkdir(artifact, { recursive: true })
    await writeFile(
      join(artifact, 'field-plans.json'),
      JSON.stringify({ plans, checks: group.checks }, null, 2),
    )
    for (const [i, c] of group.checks.entries())
      expect(c.kind, plans[i]!.name + ': ' + JSON.stringify(c)).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    for (const [type, values] of Object.entries(inputs)) {
      const typedPlan = plans.find((p) => p.name === `${type}_typed_source`)!
      const prepared = group.checks[plans.indexOf(typedPlan)]!
      if (prepared.kind !== 'supported') throw new Error('Missing supported typed check')
      const declared = prepared.inputs.find((i) => i.name === 'payload')!.type
      for (const value of values) {
        let output: string | null = null,
          error: string | undefined
        try {
          output = (
            await pg.query<{ value: string | null }>(`SELECT ($1::text::${type})::text value`, [
              value,
            ])
          ).rows[0]!.value
        } catch (e) {
          error = (e as { code: string }).code
        }
        for (const mode of ['text', 'typed']) {
          if (mode === 'typed' && error) continue
          let payload: Row[string] = value === null ? { kind: 'Null' } : { kind: 'Value', value }
          if (mode === 'typed' && value !== null) {
            const range = rangeTypeProfile(declared),
              multi = multirangeTypeProfile(declared)
            const owned = range
              ? await readRangeFixture(pg, `SELECT $1::${type} span`, 'span', range.rangeType, [
                  value,
                ])
              : await readMultirangeFixture(pg, multi!.multirangeType, value)
            if (!owned) throw new Error('Missing typed range fixture')
            payload = { kind: 'Value', value: owned }
          }
          for (const bypass of [false, true])
            for (const mismatch of [false, true]) {
              const expectedText = mismatch ? 'wrong' : output
              const code = !bypass ? (error ?? (mismatch ? '23514' : undefined)) : undefined
              const expected: Outcome =
                error && !bypass
                  ? { kind: 'Error', value: { state: parseInt(error, 36) } }
                  : code
                    ? { kind: 'False' }
                    : { kind: 'True' }
              const row: Row = {
                payload,
                expected:
                  expectedText === null ? { kind: 'Null' } : { kind: 'Value', value: expectedText },
                bypass: { kind: 'Value', value: bypass },
              }
              const insert = pg.query(
                `INSERT INTO gate_${type}_${mode} VALUES($1::${mode === 'text' ? 'text' : type},$2,$3)`,
                [value, expectedText, bypass],
              )
              if (code) await expect(insert).rejects.toMatchObject({ code })
              else await insert
              for (const origin of ['source', 'stored'])
                fixtures.push({ name: `${type}_${mode}_${origin}`, row, expected })
              reference.push({ type, mode, value, bypass, mismatch, code })
            }
        }
      }
    }
    await writeFile(join(artifact, 'field-evaluators.rs'), group.evaluatorSource!)
    await runCheckParity(
      root,
      'compositerangefields',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
    await writeFile(
      join(artifact, 'field-report.json'),
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

it('preserves stored range fields and coerced record endpoints after later field-domain constraints', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-composite-range-field-stored-'))
  try {
    await pg.exec(`CREATE TYPE inner_span AS RANGE(subtype=int2);CREATE DOMAIN checked_span AS inner_span NOT NULL;
CREATE TYPE entry AS(n int2,part checked_span,history checked_span[]);CREATE TYPE entry_span AS RANGE(subtype=entry);
CREATE TABLE retained(a entry_span);INSERT INTO retained SELECT entry_span(ROW(2,'[1,3)'::checked_span,ARRAY['[1,3)'::checked_span])::entry,ROW(3,'[4,6)'::checked_span,ARRAY['[4,6)'::checked_span])::entry);`)
    const value = (await pg.query<{ value: string }>('SELECT a::text value FROM retained')).rows[0]!
        .value,
      quoted = "'" + value.replaceAll("'", "''") + "'"
    await pg.exec(`CREATE TABLE gate(a entry_span,bypass bool,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE a=${quoted}::entry_span END));
CREATE TABLE constructed(a entry_span,bypass bool,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE entry_span(lower(a),upper(a),'[)')=a END));
ALTER DOMAIN checked_span ADD CONSTRAINT raised_lower CHECK(lower(VALUE)>=2) NOT VALID;`)
    const catalog = await snapshotCatalog(pg)
    const plans = ['gate', 'constructed'].flatMap((name) => {
      const table = catalog.tables.find((t) => t.name === name)!,
        constraint = table.constraints.find((c) => c.name === 'valid')!
      return (['source', 'stored'] as const).map((origin) => ({
        name: name + '_' + origin,
        expression: lowerTableCheck(
          table,
          constraint,
          catalog.enums,
          catalog.domains,
          origin,
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
        )!.expression,
        identity: { schema: 'public', kind: 'table' as const, owner: name, constraint: origin },
      }))
    })
    const group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' })
    for (const [i, c] of group.checks.entries())
      expect(c.kind, plans[i]!.name + ': ' + JSON.stringify(c)).toBe('supported')
    const prepared = group.checks[1]!
    if (prepared.kind !== 'supported') throw new Error('Missing stored check')
    const type = rangeTypeProfile(prepared.inputs.find((i) => i.name === 'a')!.type)!.rangeType
    const owned = await readRangeFixture(pg, 'SELECT a FROM retained', 'a', type)
    if (!owned) throw new Error('Missing retained row')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const bypass of [false, true]) {
      for (const table of ['gate', 'constructed'])
        await pg.query(`INSERT INTO ${table} SELECT a,$1 FROM retained`, [bypass])
      await expect(
        pg.exec(
          `SELECT CASE WHEN ${bypass} THEN true ELSE NULL::entry_span=${quoted}::entry_span END`,
        ),
      ).rejects.toMatchObject({ code: '23514' })
      const row: Row = {
        a: { kind: 'Value', value: owned },
        bypass: { kind: 'Value', value: bypass },
      }
      for (const name of ['gate_stored', 'constructed_source', 'constructed_stored'])
        fixtures.push({ name, row, expected: { kind: 'True' } })
      fixtures.push({
        name: 'gate_source',
        row,
        expected: { kind: 'Error', value: { state: parseInt('23514', 36) } },
      })
    }
    await runCheckParity(
      root,
      'compositerangefieldstored',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
    await writeFile(
      'artifacts/goal-checks/composite-range-field-dependencies-active/stored-report.json',
      JSON.stringify({
        fixtures: fixtures.length,
        nativeStoredInserts: 4,
        sourceLiteralErrors: 2,
      }) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)

it('restores stored record range fields without replaying subtype comparators or canonicalizers', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-composite-range-field-callbacks-'))
  try {
    await pg.exec(`CREATE FUNCTION selected_compare(int2,int2) RETURNS int4 LANGUAGE plpgsql IMMUTABLE STRICT AS $$BEGIN IF current_setting('pgsid.field_callbacks_fail',true)='on' THEN RAISE EXCEPTION 'field comparator' USING ERRCODE='22000';END IF;RETURN btint2cmp($1,$2);END$$;
CREATE OPERATOR CLASS selected_ops FOR TYPE int2 USING btree AS OPERATOR 1 pg_catalog.<(int2,int2),OPERATOR 2 pg_catalog.<=(int2,int2),OPERATOR 3 pg_catalog.=(int2,int2),OPERATOR 4 pg_catalog.>=(int2,int2),OPERATOR 5 pg_catalog.>(int2,int2),FUNCTION 1 selected_compare(int2,int2);
CREATE TYPE ordered_span AS RANGE(subtype=int2,subtype_opclass=selected_ops);
CREATE TYPE canonical_span;CREATE FUNCTION selected_canonical(canonical_span) RETURNS canonical_span AS 'int4range_canonical' LANGUAGE internal IMMUTABLE STRICT;CREATE TYPE canonical_span AS RANGE(subtype=int4,canonical=selected_canonical);
CREATE OR REPLACE FUNCTION selected_canonical(canonical_span) RETURNS canonical_span LANGUAGE plpgsql IMMUTABLE STRICT AS $$BEGIN IF current_setting('pgsid.field_callbacks_fail',true)='on' THEN RAISE EXCEPTION 'field canonicalizer' USING ERRCODE='22000';END IF;RETURN $1;END$$;
CREATE TYPE entry AS(n int2,ordered ordered_span,canonical canonical_span,parts ordered_span_multirange,history canonical_span[]);CREATE TYPE entry_span AS RANGE(subtype=entry);`)
    const value = (
      await pg.query<{ value: string }>(
        `SELECT entry_span(ROW(1,'[1,3)'::ordered_span,'[1,3]'::canonical_span,'{[1,3)}'::ordered_span_multirange,ARRAY['[1,3]'::canonical_span])::entry,NULL)::text value`,
      )
    ).rows[0]!.value
    const quoted = "'" + value.replaceAll("'", "''") + "'"
    await pg.exec(
      `CREATE TABLE gate(bypass bool,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE (${quoted}::entry_span)::text=${quoted} END));SET pgsid.field_callbacks_fail='on';`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'gate')!,
      constraint = table.constraints.find((c) => c.name === 'valid')!
    const plans = (['source', 'stored'] as const).map((origin) => ({
      name: origin,
      expression: lowerTableCheck(
        table,
        constraint,
        catalog.enums,
        catalog.domains,
        origin,
        catalog.rangeTypes,
        catalog.compositeTypeGraph,
      )!.expression,
      identity: { schema: 'public', kind: 'table' as const, owner: 'gate', constraint: origin },
    }))
    const group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' })
    for (const [i, c] of group.checks.entries())
      expect(c.kind, plans[i]!.name + ': ' + JSON.stringify(c)).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const bypass of [false, true]) {
      await pg.query('INSERT INTO gate VALUES($1)', [bypass])
      await expect(
        pg.exec(
          `SELECT CASE WHEN ${bypass} THEN true ELSE (${quoted}::entry_span)::text=${quoted} END`,
        ),
      ).rejects.toMatchObject({ code: '22000' })
      const row: Row = { bypass: { kind: 'Value', value: bypass } }
      fixtures.push(
        { name: 'stored', row, expected: { kind: 'True' } },
        { name: 'source', row, expected: { kind: 'Unknown' } },
      )
    }
    await runCheckParity(
      root,
      'compositestoredcallbacks',
      group,
      plans.map((p) => p.name),
      fixtures,
    )
    await writeFile(
      'artifacts/goal-checks/composite-range-field-dependencies-active/callback-report.json',
      JSON.stringify({
        fixtures: fixtures.length,
        nativeStoredInserts: 2,
        sourceCallbackErrors: 2,
        localSourceCallbackRequirement: 'Unknown',
        storedCallbacksReplayed: false,
      }) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
