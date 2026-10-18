import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { PG18_RANGE_TYPES } from '../../src/postgres/builtins/type-ranges.generated.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import { readRangeFixture, rangeCoreSamples } from './check-range-fixtures.js'

const value = (input: boolean | null): Input =>
  input === null ? { kind: 'Null' } : { kind: 'Value', value: input }

it('composes nominal ranges through equality, extrema, NULLIF, CASE and domains while preserving eager set errors', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-range-composition-'))
  try {
    await pg.exec("SET DateStyle='ISO,YMD';SET TimeZone='UTC'")
    const forms = Object.values(PG18_RANGE_TYPES).flatMap((metadata, family) => {
      const samples = rangeCoreSamples(metadata.identity),
        a = samples.ranges[5]!,
        b = samples.ranges[10]!
      return [
        { name: 'nullif', expr: 'NULLIF(payload,other)', constantError: false },
        {
          name: 'coalesce',
          expr: 'COALESCE(NULLIF(payload,other),fallback)',
          constantError: false,
        },
        { name: 'greatest', expr: 'greatest(payload,other,NULL,fallback)', constantError: false },
        { name: 'least', expr: 'least(payload,other,NULL,fallback)', constantError: false },
        {
          name: 'simple',
          expr: 'CASE payload WHEN other THEN fallback ELSE payload END',
          constantError: false,
        },
        {
          name: 'distinct',
          expr: 'CASE WHEN payload IS NOT DISTINCT FROM other THEN fallback ELSE payload END',
          constantError: false,
        },
        { name: 'domain', expr: `(payload::range_core_nested_${family})`, constantError: false },
        {
          name: 'union_constant',
          expr: `('${a}'::${metadata.identity} + '${b}'::${metadata.identity})`,
          constantError: true,
        },
        {
          name: 'minus_constant',
          expr: `('(,)'::${metadata.identity} - '${a}'::${metadata.identity})`,
          constantError: true,
        },
      ].map((form, index) => ({
        ...form,
        metadata,
        table: `range_composition_${family}_${index}`,
        sql: `CASE WHEN bypass THEN true ELSE (${form.expr}) IS NOT DISTINCT FROM expected${metadata.subtype === 'pg_catalog."numeric"' ? ` AND (${form.expr})::text IS NOT DISTINCT FROM expected::text` : ''} END`,
      }))
    })
    for (const [family, metadata] of Object.values(PG18_RANGE_TYPES).entries())
      await pg.exec(
        `CREATE DOMAIN range_core_plain_${family} AS ${metadata.identity} CHECK(isempty(VALUE) OR lower(VALUE) IS NOT NULL);CREATE DOMAIN range_core_nested_${family} AS range_core_plain_${family}`,
      )
    for (const form of forms)
      await pg.exec(
        `CREATE TABLE ${form.table}(payload ${form.metadata.identity},other ${form.metadata.identity},fallback ${form.metadata.identity},expected ${form.metadata.identity},bypass boolean,CHECK(${form.sql}))`,
      )
    const catalog = await snapshotCatalog(pg)
    const plans = forms.flatMap((form) => {
      const table = catalog.tables.find((t) => t.name === form.table)!
      return ['source', 'stored'].map((origin) => {
        const plan = lowerTableCheck(
          table,
          origin === 'source'
            ? { name: 'check', type: 'check', definition: `CHECK(${form.sql})` }
            : table.constraints[0]!,
          catalog.enums,
          catalog.domains,
          origin as 'source' | 'stored',
        )!
        expect(hasUncertain(plan.expression), form.table + '/' + origin).toBe(false)
        return {
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: form.table,
            constraint: origin,
          },
          expression: portableCheckAtoms(plan.expression),
        }
      })
    })
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    let inserts = 0
    const errors = new Set<string>()
    for (const form of forms) {
      const { ranges } = rangeCoreSamples(form.metadata.identity)
      const indices = form.constantError ? [0, 5] : [...ranges.keys()]
      const fallback = ranges[9]!
      const fallbackPayload = await readRangeFixture(
        pg,
        `SELECT $1::${form.metadata.identity} span`,
        'span',
        form.metadata.identity,
        [fallback],
      )
      const pairs = indices.map((i) => [i, (i + 5) % ranges.length] as const)
      if (form.metadata.subtype === 'pg_catalog."numeric"' && !form.constantError)
        pairs.push([5, 13], [13, 5])
      for (const [i, j] of pairs) {
        const payload = ranges[i]!,
          other = ranges[j]!
        let rendered: string | null = null,
          errorCode: string | null = null
        try {
          rendered = (
            await pg.query<{ rendered: string | null }>(
              `SELECT (${form.expr})::text rendered FROM (SELECT $1::${form.metadata.identity} payload,$2::${form.metadata.identity} other,$3::${form.metadata.identity} fallback) q`,
              [payload, other, fallback],
            )
          ).rows[0]!.rendered
        } catch (error) {
          errorCode = (error as { code: string }).code
          expect(['22000', '23514']).toContain(errorCode)
        }
        const payloadRange = await readRangeFixture(
          pg,
          `SELECT $1::${form.metadata.identity} span`,
          'span',
          form.metadata.identity,
          [payload],
        )
        const otherRange = await readRangeFixture(
          pg,
          `SELECT $1::${form.metadata.identity} span`,
          'span',
          form.metadata.identity,
          [other],
        )
        const expectedRange = await readRangeFixture(
          pg,
          `SELECT $1::${form.metadata.identity} span`,
          'span',
          form.metadata.identity,
          [rendered],
        )
        for (const bypass of [false, true]) {
          let outcome: Outcome = { kind: 'True' }
          try {
            await pg.query(
              `INSERT INTO ${form.table} VALUES($1::${form.metadata.identity},$2::${form.metadata.identity},$3::${form.metadata.identity},$4::${form.metadata.identity},$5)`,
              [payload, other, fallback, rendered, bypass],
            )
            expect(form.constantError ? errorCode : bypass ? null : errorCode).toBeNull()
          } catch (error) {
            const code = (error as { code: string }).code
            expect(code).toBe(errorCode)
            errors.add(code)
            outcome = { kind: 'Error', value: { state: parseInt(code, 36) } }
          }
          inserts++
          const row: Row = {
            payload: payloadRange ? { kind: 'Value', value: payloadRange } : value(null),
            other: otherRange ? { kind: 'Value', value: otherRange } : value(null),
            fallback: { kind: 'Value', value: fallbackPayload! },
            expected: expectedRange ? { kind: 'Value', value: expectedRange } : value(null),
            bypass: value(bypass),
          }
          for (const mode of ['source', 'stored'])
            fixtures.push({ name: form.table + '_' + mode, row, expected: outcome })
        }
      }
    }
    const group = prepareCheckRustGroup(plans)
    expect(group.checks.filter((c) => c.kind !== 'supported')).toEqual([])
    await runCheckParity(
      directory,
      'rangecomposition',
      group,
      forms.flatMap((f) => ['source', 'stored'].map((m) => f.table + '_' + m)),
      fixtures,
    )
    expect([...errors].sort()).toEqual(['22000', '23514'])
    await mkdir('artifacts/check-range-core', { recursive: true })
    await writeFile(
      'artifacts/check-range-core/composition-report.json',
      JSON.stringify(
        {
          inserts,
          fixtures: fixtures.length,
          plans: plans.length,
          errors: [...errors].sort(),
          constantErrors: 'eager even with bypass',
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180000)

it('rejects mixed nominal range identities and inconsistent polymorphic element types', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec('CREATE TABLE range_nominal(payload int4range,other numrange,wrong bigint)')
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'range_nominal')!
    for (const [i, sql] of [
      'payload=other',
      'payload IS NOT DISTINCT FROM other',
      'NULLIF(payload,other) IS NULL',
      'greatest(payload,other) IS NULL',
      'range_cmp(payload,other)=0',
      'range_merge(payload,other) IS NULL',
      'range_contains_elem(payload,wrong)',
      'wrong <@ payload',
    ].entries()) {
      let rejected = false
      try {
        await pg.exec(
          `CREATE TABLE invalid_range_nominal_${i}(payload int4range,other numrange,wrong bigint,CHECK(${sql}))`,
        )
      } catch (error) {
        expect((error as { code: string }).code).toBe(
          sql.startsWith('greatest(') ? '42846' : '42883',
        )
        rejected = true
      }
      expect(rejected, sql).toBe(true)
      const plan = lowerTableCheck(
        table,
        { name: 'check', type: 'check', definition: `CHECK(${sql})` },
        catalog.enums,
        catalog.domains,
        'source',
      )!
      expect(hasUncertain(plan.expression), sql).toBe(true)
    }
  } finally {
    await pg.close()
  }
})
