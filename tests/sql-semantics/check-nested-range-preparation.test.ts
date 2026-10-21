import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { runCheckParity, type Outcome, type Row } from '../../tools/check-rust/parity.js'
import { customRangeSchema, nativeCustomRangeOutcome } from './check-custom-range-fixtures.js'

it('prepares nested range literals before lazy branches while preserving runtime casts, child domain checks and canonicalized stored values', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-nested-range-preparation-'))
  try {
    await pg.exec(`CREATE DOMAIN positive AS int4 CHECK(VALUE>0);
CREATE TYPE positive_span AS RANGE(subtype=positive);
CREATE TYPE ints_outer AS RANGE(subtype=int4range);
CREATE TYPE checked_outer AS RANGE(subtype=positive_span);
CREATE TYPE multi_outer AS RANGE(subtype=int4multirange);
CREATE TYPE array_outer AS RANGE(subtype=int4range[]);
CREATE TABLE literal_host(bypass bool,payload text)`)
    const inputs = [
      { type: 'ints_outer', text: '["bad",)', good: false },
      { type: 'ints_outer', text: '["[bad,3]",)', good: false },
      { type: 'ints_outer', text: '["[1,3]",)', good: true },
      { type: 'checked_outer', text: '["[-1,3]",)', good: false },
      { type: 'checked_outer', text: '["[bad,3]",)', good: false },
      { type: 'checked_outer', text: '["[1,3]",)', good: true },
      { type: 'multi_outer', text: '["{[bad,3)}",)', good: false },
      { type: 'array_outer', text: '["{bad}",)', good: false },
      { type: 'array_outer', text: '["{bad}",)junk', good: false },
      { type: 'checked_outer', text: 'empty', good: true },
      { type: 'checked_outer', text: '(,)', good: true },
    ]
    const cases = inputs
      .flatMap((probe) => [
        { expr: `'${probe.text}'::${probe.type}`, good: probe.good },
        { expr: `payload::${probe.type}`, payload: probe.text, good: true },
      ])
      .map((probe, index) => ({
        ...probe,
        name: `nested_literal_${index}`,
        sql: `CASE WHEN bypass THEN true ELSE isempty(${probe.expr}) END`,
      }))
    for (const probe of cases) {
      const create = pg.exec(
        `CREATE TABLE ${probe.name}(bypass bool,payload text,CONSTRAINT valid CHECK(${probe.sql}))`,
      )
      if (probe.good) await create
      else await expect(create).rejects.toHaveProperty('code')
    }
    const catalog = await snapshotCatalog(pg),
      host = catalog.tables.find((table) => table.name === 'literal_host')!
    const targets = cases.flatMap((probe) => [
      { probe, origin: 'source' as const, table: host, definition: `CHECK(${probe.sql})` },
      ...(probe.good
        ? [
            {
              probe,
              origin: 'stored' as const,
              table: catalog.tables.find((table) => table.name === probe.name)!,
              definition: '',
            },
          ]
        : []),
    ])
    const plans = targets.map((target) => ({
      identity: {
        schema: 'public',
        kind: 'table' as const,
        owner: target.probe.name,
        constraint: target.origin,
      },
      expression: portableCheckAtoms(
        lowerTableCheck(
          target.table,
          target.origin === 'source'
            ? { name: 'valid', type: 'check', definition: target.definition }
            : target.table.constraints[0]!,
          catalog.enums,
          catalog.domains,
          target.origin,
          catalog.rangeTypes,
        )!.expression,
      ),
    }))
    const group = prepareCheckRustGroup(plans, {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        arrayNulls: true,
      }),
      names = plans.map((plan) => plan.identity.owner + '_' + plan.identity.constraint)
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        names[index] + (check.kind === 'unsupported' ? ': ' + check.reason : ''),
      ).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const [index, target] of targets.entries())
      for (const bypass of [false, true]) {
        let expected: Outcome
        if (target.origin === 'source')
          expected = await nativeCustomRangeOutcome(
            pg,
            `SELECT (${target.probe.sql}) AS value FROM(SELECT $1::bool bypass,$2::text payload) inputs`,
            [bypass, 'payload' in target.probe ? target.probe.payload : null],
          )
        else {
          try {
            await pg.query(`INSERT INTO ${target.table.name}(bypass,payload) VALUES($1,$2)`, [
              bypass,
              'payload' in target.probe ? target.probe.payload : null,
            ])
            expected = { kind: target.probe.expr.startsWith('NULL') && !bypass ? 'Null' : 'True' }
          } catch (error) {
            if (
              !error ||
              typeof error !== 'object' ||
              !('code' in error) ||
              typeof error.code !== 'string'
            )
              throw error
            expected =
              error.code === '23514' && 'constraint' in error && error.constraint === 'valid'
                ? { kind: 'False' }
                : { kind: 'Error', value: { state: parseInt(error.code, 36) } }
          }
        }
        fixtures.push({
          name: names[index]!,
          row: {
            bypass: { kind: 'Value', value: bypass },
            payload:
              'payload' in target.probe
                ? { kind: 'Value', value: target.probe.payload as string }
                : { kind: 'Null' },
          },
          expected,
        })
      }
    await runCheckParity(directory, 'nestedrangepreparation', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('reads stored nested range constants without rechecking changed child domains, comparators or canonicalizers', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-nested-range-stored-'))
  try {
    await pg.exec(
      customRangeSchema +
        `
      CREATE TYPE stored_canonical_span;
      CREATE FUNCTION stored_canonical(stored_canonical_span) RETURNS stored_canonical_span AS 'int4range_canonical' LANGUAGE internal IMMUTABLE STRICT;
      CREATE TYPE stored_canonical_span AS RANGE(subtype=int4,canonical=stored_canonical);
      CREATE OR REPLACE FUNCTION stored_canonical(stored_canonical_span) RETURNS stored_canonical_span LANGUAGE plpgsql IMMUTABLE STRICT AS $$BEGIN IF current_setting('pgsid.range_callback_fail',true)='on' THEN RAISE EXCEPTION 'canonicalizer reached' USING ERRCODE='22000';END IF;RETURN $1;END$$;
      CREATE FUNCTION stored_reverse(int4,int4) RETURNS int4 LANGUAGE plpgsql IMMUTABLE STRICT AS $$BEGIN IF current_setting('pgsid.range_callback_fail',true)='on' THEN RAISE EXCEPTION 'comparator reached' USING ERRCODE='22000';END IF;RETURN btint4cmp($2,$1);END$$;
      CREATE OPERATOR CLASS stored_reverse_ops FOR TYPE int4 USING btree AS OPERATOR 1 >,OPERATOR 2 >=,OPERATOR 3 =,OPERATOR 4 <=,OPERATOR 5 <,FUNCTION 1 stored_reverse(int4,int4);
      CREATE TYPE stored_reverse_span AS RANGE(subtype=int4,subtype_opclass=stored_reverse_ops);
      CREATE TYPE stored_domain_outer AS RANGE(subtype="Custom.Range".positive_span);
      CREATE TYPE stored_canonical_outer AS RANGE(subtype=stored_canonical_span);
      CREATE TYPE stored_reverse_outer AS RANGE(subtype=stored_reverse_span);
      SET pgsid.range_callback_fail=off;`,
    )
    const definitions = [
      { name: 'owned_domain', expr: `'["[1,3]",)'::stored_domain_outer`, lower: 1, upper: 3 },
      {
        name: 'owned_canonical',
        expr: `'["[1,3]",)'::stored_canonical_outer`,
        lower: 1,
        upper: 3,
      },
      {
        name: 'owned_comparator',
        expr: `'["[3,1]",)'::stored_reverse_outer`,
        lower: 3,
        upper: 1,
      },
    ]
    for (const target of definitions)
      await pg.exec(
        `CREATE TABLE ${target.name}(expected_lower int4,expected_upper int4,bypass bool,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE lower(lower(${target.expr})) IS NOT DISTINCT FROM expected_lower AND upper(lower(${target.expr})) IS NOT DISTINCT FROM expected_upper END))`,
      )
    await pg.exec(
      `ALTER DOMAIN "Custom.Range".positive ADD CONSTRAINT tightened CHECK(VALUE>2);SET pgsid.range_callback_fail=on;`,
    )
    for (const target of definitions)
      await expect(pg.exec(`SELECT ${target.expr}`)).rejects.toMatchObject({
        code: target.name === 'owned_domain' ? '23514' : '22000',
      })
    const catalog = await snapshotCatalog(pg)
    const plans = definitions.map((target) => {
      const table = catalog.tables.find((table) => table.name === target.name)!
      return {
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: target.name,
          constraint: 'stored',
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            table.constraints[0]!,
            catalog.enums,
            catalog.domains,
            'stored',
            catalog.rangeTypes,
          )!.expression,
        ),
      }
    })
    const group = prepareCheckRustGroup(plans, {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        arrayNulls: true,
      }),
      names = definitions.map((target) => target.name)
    for (const [index, check] of group.checks.entries())
      expect(check.kind, names[index]).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const target of definitions)
      for (const [lower, upper, bypass] of [
        [target.lower, target.upper, false],
        [target.lower + 1, target.upper, false],
        [target.lower + 1, target.upper, true],
      ] as const) {
        const insert = pg.query(`INSERT INTO ${target.name} VALUES($1,$2,$3)`, [
          lower,
          upper,
          bypass,
        ])
        const valid = bypass || lower === target.lower
        if (valid) await insert
        else await expect(insert).rejects.toMatchObject({ code: '23514' })
        fixtures.push({
          name: target.name,
          row: {
            expected_lower: { kind: 'Value', value: lower },
            expected_upper: { kind: 'Value', value: upper },
            bypass: { kind: 'Value', value: bypass },
          },
          expected: { kind: valid ? 'True' : 'False' },
        })
      }
    await runCheckParity(directory, 'nestedrangestored', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
