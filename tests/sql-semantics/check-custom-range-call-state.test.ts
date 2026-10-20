import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'
import { customRangeSchema, nativeCustomRangeOutcome } from './check-custom-range-fixtures.js'

it('preserves constructor preparation, named parameter error order, partial states and reached callback requirements', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-custom-range-call-state-'))
  try {
    await pg.exec(
      customRangeSchema +
        `
      CREATE OR REPLACE FUNCTION "Custom.Range".integer_span(lo int4,hi int4) RETURNS "Custom.Range".integer_span AS 'range_constructor2' LANGUAGE internal IMMUTABLE;
      CREATE TYPE "Custom.Range".alias_source AS RANGE(subtype=int4);
      CREATE TYPE "Custom.Range".alias_target AS RANGE(subtype=int8);
      ALTER FUNCTION "Custom.Range".alias_source(int4,int4) RENAME TO alias_target;
      CREATE SCHEMA "Moved.Calls";
      ALTER FUNCTION "Custom.Range".alias_source(int4,int4,text) RENAME TO bound_window;
      ALTER FUNCTION "Custom.Range".bound_window(int4,int4,text) SET SCHEMA "Moved.Calls";
      CREATE TABLE call_host(lo int4,hi int4,flags text,payload text,divisor int4,bypass bool);`,
    )
    const probes = [
      { expr: '"Custom.Range".integer_span(lo,hi,flags)' },
      { expr: '"Custom.Range".integer_span(payload::int4,hi)' },
      { expr: '"Custom.Range".integer_span(hi=>payload::int4,lo=>1/divisor)' },
      { expr: '"Custom.Range".integer_span(lo=>1/divisor,hi=>payload::int4)' },
      { expr: '"Custom.Range".integer_span(3,1)' },
      { expr: `"Custom.Range".integer_span(1,3,'invalid')` },
      { expr: '"Custom.Range".reverse_span(lo,hi)', defer: 'comparison' },
      { expr: '"Custom.Range".discrete_span(lo,hi)', defer: 'canonical' },
      { expr: '"Custom.Range".opaque_set()' },
      { expr: `"Custom.Range".integer_set("Custom.Range".integer_span(lo,hi))` },
      {
        expr: `"Custom.Range".integer_set("Custom.Range".integer_span(lo,hi),NULL::"Custom.Range".integer_span)`,
      },
      {
        expr: `"Custom.Range".integer_set(VARIADIC ARRAY["Custom.Range".integer_span(lo,hi),NULL::"Custom.Range".integer_span])`,
      },
      { expr: '"Custom.Range".alias_target(lo,hi)' },
      { expr: '"Moved.Calls".bound_window(lo,hi,flags)' },
    ].map((probe, index) => ({
      ...probe,
      name: `constructor_state_${index}`,
      sql: `CASE WHEN bypass THEN true ELSE isempty(${probe.expr}) END`,
    }))
    for (const p of probes) {
      const create = pg.exec(
        `CREATE TABLE ${p.name}(lo int4,hi int4,flags text,payload text,divisor int4,bypass bool,CONSTRAINT valid CHECK(${p.sql}))`,
      )
      await create
    }
    const catalog = await snapshotCatalog(pg),
      host = catalog.tables.find((t) => t.name === 'call_host')!
    const targets = probes.flatMap((probe) => [
      { probe, origin: 'source' as const, table: host },
      {
        probe,
        origin: 'stored' as const,
        table: catalog.tables.find((t) => t.name === probe.name)!,
      },
    ])
    const plans = targets.map(({ probe, origin, table }) => ({
      identity: { schema: 'public', kind: 'table' as const, owner: probe.name, constraint: origin },
      expression: portableCheckAtoms(
        lowerTableCheck(
          table,
          origin === 'source'
            ? { name: 'valid', type: 'check', definition: `CHECK(${probe.sql})` }
            : table.constraints[0]!,
          catalog.enums,
          catalog.domains,
          origin,
          catalog.rangeTypes,
        )!.expression,
      ),
    }))
    const group = prepareCheckRustGroup(plans),
      names = plans.map((p) => p.identity.owner + '_' + p.identity.constraint)
    for (const [i, c] of group.checks.entries())
      expect(c.kind, names[i] + (c.kind === 'unsupported' ? ': ' + c.reason : '')).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const samples: readonly [
      number | null,
      number | null,
      string | null,
      string | null,
      number | null,
    ][] = [
      [1, 3, '[)', '3', 1],
      [3, 1, '[)', 'bad', 0],
      [1, 1, '()', '3', 1],
      [null, 3, '[]', null, 1],
      [1, null, '[]', '3', 1],
      [null, null, '[]', 'bad', 0],
      [1, 3, 'invalid', '3', 1],
      [1, 3, null, '3', 1],
    ]
    for (const [index, { probe }] of targets.entries())
      for (const [lo, hi, flags, payload, divisor] of samples)
        for (const bypass of [false, true]) {
          const parameters = [lo, hi, flags, payload, divisor, bypass],
            seed =
              'SELECT $1::int4 AS lo,$2::int4 AS hi,$3::text AS flags,$4::text AS payload,$5::int4 AS divisor,$6::bool AS bypass'
          const native = await nativeCustomRangeOutcome(
            pg,
            `WITH inputs AS MATERIALIZED(${seed}) SELECT (${probe.sql}) AS value FROM inputs`,
            parameters,
          )
          {
            const insert = pg.query(
              `INSERT INTO ${probe.name} SELECT * FROM(${seed}) inputs`,
              parameters,
            )
            if (native.kind === 'Error')
              await expect(insert).rejects.toMatchObject({
                code: native.value.state.toString(36).toUpperCase().padStart(5, '0'),
              })
            else if (native.kind === 'False')
              await expect(insert).rejects.toMatchObject({ code: '23514' })
            else await insert
          }
          let expected = native
          if (
            !bypass &&
            'defer' in probe &&
            (probe.defer === 'comparison'
              ? lo !== null && hi !== null
              : lo === null || hi === null || lo < hi)
          )
            expected = { kind: 'Unknown' }
          const row: Row = Object.fromEntries(
            ['lo', 'hi', 'flags', 'payload', 'divisor', 'bypass'].map((name, i) => [
              name,
              parameters[i] === null ? { kind: 'Null' } : { kind: 'Value', value: parameters[i] },
            ]),
          ) as Row
          fixtures.push({ name: names[index]!, row, expected })
        }
    const stateIndex = targets.findIndex(
      (t) => t.probe.name === 'constructor_state_0' && t.origin === 'source',
    )
    const base: Row = {
      lo: { kind: 'Value', value: 1 },
      hi: { kind: 'Value', value: 3 },
      flags: { kind: 'Value', value: '[)' },
      payload: { kind: 'Value', value: '3' },
      divisor: { kind: 'Value', value: 1 },
      bypass: { kind: 'Value', value: false },
    }
    for (const [field, input, expected] of [
      ['lo', { kind: 'Unknown' }, { kind: 'Unknown' }],
      [
        'hi',
        { kind: 'Error', value: { state: parseInt('22012', 36) } },
        { kind: 'Error', value: { state: parseInt('22012', 36) } },
      ],
      ['flags', { kind: 'Unknown' }, { kind: 'Unknown' }],
    ] as const) {
      fixtures.push({ name: names[stateIndex]!, row: { ...base, [field]: input }, expected })
      fixtures.push({
        name: names[stateIndex]!,
        row: { ...base, [field]: input, bypass: { kind: 'Value', value: true } },
        expected: { kind: 'True' },
      })
    }
    await runCheckParity(directory, 'customrangecallstate', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
