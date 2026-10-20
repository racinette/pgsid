import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  runCheckParity,
  type Row,
  type Outcome,
  type Input,
} from '../../tools/check-rust/parity.js'
import { customRangeSchema, nativeCustomRangeOutcome } from './check-custom-range-fixtures.js'

it('defers only reached unavailable range input support and retains grammar, NULL, error and lazy boundaries', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-custom-range-input-state-'))
  try {
    await pg.exec(
      customRangeSchema +
        `CREATE FUNCTION "Custom.Range".opaque_allowed(int4) RETURNS bool LANGUAGE sql IMMUTABLE STRICT AS 'SELECT $1>0';
      CREATE DOMAIN "Custom.Range".opaque_bound AS int4 CHECK("Custom.Range".opaque_allowed(VALUE));
      CREATE TYPE "Custom.Range".opaque_bound_span AS RANGE(subtype="Custom.Range".opaque_bound);`,
    )
    const probes = [
      ...[
        ['empty', false],
        ['(1,1)', false],
        ['[1,1]', true],
        ['[1,3)', true],
        ['(,)', true],
        ['(,2147483647]', true],
        ['[3,1)', false],
        ['[bad,1)', false],
        ['[bad,3]junk', false],
      ].map(([payload, defer]) => ({
        type: 'discrete_span',
        payload: payload as string,
        defer: defer as boolean,
      })),
      ...[
        ['empty', false],
        ['(,)', false],
        ['(,3]', false],
        ['[3,)', false],
        ['[3,1)', true],
        ['[1,3)', true],
        ['(1,1)', true],
        ['[bad,1)', false],
        ['[2147483648,1)', false],
      ].map(([payload, defer]) => ({
        type: 'reverse_span',
        payload: payload as string,
        defer: defer as boolean,
      })),
      ...[
        ['empty', false],
        ['(,)', false],
        ['[1,3]', true],
        ['[bad,3]', true],
        ['[bad,3]junk', false],
      ].map(([payload, defer]) => ({
        type: 'opaque_bound_span',
        payload: payload as string,
        defer: defer as boolean,
      })),
    ].map((probe, index) => ({
      ...probe,
      name: `range_input_state_${index}`,
      sql: `CASE WHEN bypass THEN true ELSE (payload::"Custom.Range".${probe.type})::text COLLATE "C" IS NOT DISTINCT FROM label COLLATE "C" END`,
    }))
    for (const probe of probes)
      await pg.exec(
        `CREATE TABLE ${probe.name}(payload text,label text,bypass bool,CONSTRAINT valid CHECK(${probe.sql}))`,
      )
    const catalog = await snapshotCatalog(pg)
    const plans = probes.flatMap((probe) => {
      const table = catalog.tables.find((table) => table.name === probe.name)!
      return (['source', 'stored'] as const).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: probe.name,
          constraint: origin,
        },
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
    })
    const group = prepareCheckRustGroup(plans),
      names = plans.map((plan) => plan.identity.owner + '_' + plan.identity.constraint)
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        names[index] + (check.kind === 'unsupported' ? ': ' + check.reason : ''),
      ).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const [index, probe] of probes.entries()) {
      let label: string | null = null
      try {
        label = (
          await pg.query<{ value: string | null }>(
            `SELECT $1::"Custom.Range".${probe.type}::text AS value`,
            [probe.payload],
          )
        ).rows[0]!.value
      } catch (error) {
        if (!error || typeof error !== 'object' || !('code' in error)) throw error
      }
      for (const bypass of [false, true]) {
        const args = [probe.payload, label, bypass]
        const native = await nativeCustomRangeOutcome(
          pg,
          `SELECT (${probe.sql})AS value FROM(SELECT $1::text payload,$2::text label,$3::bool bypass)inputs`,
          args,
        )
        const insert = pg.query(`INSERT INTO ${probe.name} VALUES($1,$2,$3)`, args)
        if (native.kind === 'Error')
          await expect(insert).rejects.toMatchObject({
            code: native.value.state.toString(36).toUpperCase().padStart(5, '0'),
          })
        else await insert
        const expected: Outcome = !bypass && probe.defer ? { kind: 'Unknown' } : native
        for (let origin = 0; origin < 2; origin++)
          fixtures.push({
            name: names[index * 2 + origin]!,
            row: {
              payload: { kind: 'Value', value: probe.payload },
              label: label === null ? { kind: 'Null' } : { kind: 'Value', value: label },
              bypass: { kind: 'Value', value: bypass },
            },
            expected,
          })
      }
    }
    for (const payload of [
      { kind: 'Null' },
      { kind: 'Unknown' },
      { kind: 'Error', value: { state: parseInt('22012', 36) } },
    ] as Input[])
      for (const bypass of [false, true]) {
        const expected: Outcome =
          bypass || payload.kind === 'Null'
            ? { kind: 'True' }
            : payload.kind === 'Error'
              ? { kind: 'Error', value: payload.value }
              : { kind: 'Unknown' }
        for (let origin = 0; origin < 2; origin++)
          fixtures.push({
            name: names[origin]!,
            row: { payload, label: { kind: 'Null' }, bypass: { kind: 'Value', value: bypass } },
            expected,
          })
      }
    await runCheckParity(directory, 'customrangeinputstate', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
