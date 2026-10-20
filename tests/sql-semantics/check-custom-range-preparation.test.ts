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

it('prepares custom typed literals before pruning while retaining lazy stable casts and stored canonicalized values', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-custom-range-preparation-'))
  try {
    await pg.exec(
      customRangeSchema +
        `CREATE DOMAIN "Custom.Range".preflight AS int4 CHECK(VALUE>0 OR 1/0=0);
      CREATE TYPE "Custom.Range".preflight_span AS RANGE(subtype="Custom.Range".preflight);
      CREATE TABLE literal_host(bypass bool,payload text)`,
    )
    const cases = [
      { expr: `'[bad,3]'::"Custom.Range".integer_span`, good: false },
      { expr: `payload::"Custom.Range".integer_span`, payload: '[bad,3]', good: true },
      { expr: `'[0,3]'::"Custom.Range".positive_span`, good: false },
      { expr: `payload::"Custom.Range".positive_span`, payload: '[0,3]', good: true },
      { expr: `'[bad,3]'::"Custom.Range".preflight_span`, good: false },
      { expr: `payload::"Custom.Range".preflight_span`, payload: '[bad,3]', good: true },
      { expr: `'[bad,3]junk'::"Custom.Range".preflight_span`, good: false },
      { expr: `'empty'::"Custom.Range".preflight_span`, good: true },
      { expr: `'(,)'::"Custom.Range".preflight_span`, good: true },
      { expr: `'[1,3]'::"Custom.Range".integer_span`, good: true },
      { expr: `'[1,3]'::"Custom.Range".discrete_span`, good: true, sourceUnknown: true },
      { expr: `NULL::"Custom.Range".positive_span`, good: true },
    ].map((probe, index) => ({
      ...probe,
      name: `range_literal_${index}`,
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
    const group = prepareCheckRustGroup(plans),
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
        if (
          target.origin === 'source' &&
          'sourceUnknown' in target.probe &&
          target.probe.sourceUnknown
        )
          expected = { kind: 'Unknown' }
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
    await runCheckParity(directory, 'customrangepreparation', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)

it('reads stored custom range constants without rechecking changed subtype domains, comparators or canonicalizers', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-custom-range-stored-'))
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
      SET pgsid.range_callback_fail=off;`,
    )
    const definitions = [
      { name: 'owned_domain', expr: `'[1,3]'::"Custom.Range".positive_span`, lower: 1, upper: 3 },
      {
        name: 'owned_canonical',
        expr: `'[1,3]'::stored_canonical_span`,
        lower: 1,
        upper: 3,
      },
      {
        name: 'owned_comparator',
        expr: `'[3,1]'::stored_reverse_span`,
        lower: 3,
        upper: 1,
      },
    ]
    for (const target of definitions)
      await pg.exec(
        `CREATE TABLE ${target.name}(expected_lower int4,expected_upper int4,bypass bool,CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE lower(${target.expr}) IS NOT DISTINCT FROM expected_lower AND upper(${target.expr}) IS NOT DISTINCT FROM expected_upper END))`,
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
    const group = prepareCheckRustGroup(plans),
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
    await runCheckParity(directory, 'customrangestored', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
