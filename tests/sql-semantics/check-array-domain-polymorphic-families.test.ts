import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { catalogArrayType } from '../../src/sql-semantics/catalog-check-binder.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { arrayElementFamily } from '../../src/codegen/shared/check-array-types.js'
import { arrayScalarProfiles } from './check-array-fixtures.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

it('fills nominal scalar-domain arrays over every represented carrier while preserving input validity and skipped errors', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-domain-poly-families-'))
  try {
    await pg.exec(
      "SET TimeZone='UTC';SET DateStyle='ISO, MDY';SET IntervalStyle='iso_8601';CREATE TYPE array_stage AS ENUM('new','done')",
    )
    for (const [index, [type]] of arrayScalarProfiles.entries())
      await pg.exec(
        `CREATE DOMAIN fill_item_${index} AS ${type} CHECK(VALUE IS NOT NULL);CREATE TABLE fill_family_${index}(payload text,recorded integer,bypass boolean,CONSTRAINT filled CHECK(CASE WHEN bypass THEN true ELSE cardinality(array_fill(${type.startsWith('reg') ? '(payload::oid)' : 'payload'}::fill_item_${index},ARRAY[2]))=recorded END))`,
      )
    const catalog = await snapshotCatalog(pg),
      families = new Set<number>(),
      references: unknown[] = []
    const plans = arrayScalarProfiles.flatMap((_, index) => {
      const table = catalog.tables.find((item) => item.name === 'fill_family_' + index)!
      const identity = catalogArrayType(
        `public.fill_item_${index}[]`,
        undefined,
        catalog.domains,
        catalog.enums,
      )!
      families.add(arrayElementFamily(identity.slice(6))!)
      return (['source', 'stored'] as const).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(table, table.constraints[0]!, catalog.enums, catalog.domains, origin)!
            .expression,
        ),
      }))
    })
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      arrayNulls: true,
    })
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.owner + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const [index, [type, literal]] of arrayScalarProfiles.entries()) {
      const payload =
        type === 'money' || type.startsWith('reg')
          ? '0'
          : (await pg.query<{ value: string }>(`SELECT (${literal}::${type})::text value`)).rows[0]!
              .value
      expect(
        (
          await pg.query<{ value: number }>(
            `SELECT cardinality(array_fill(${type.startsWith('reg') ? '($1::text::oid)' : '$1::text'}::fill_item_${index},ARRAY[2])) value`,
            [payload],
          )
        ).rows[0]!.value,
        type,
      ).toBe(2)
      await expect(
        pg.query(`SELECT cardinality(array_fill(NULL::fill_item_${index},ARRAY[2]))`),
      ).rejects.toMatchObject({ code: '23514' })
      const value = { kind: 'Value' as const, value: payload },
        error = { kind: 'Error' as const, value: { state: parseInt('22012', 36) } }
      const cases: { row: Row; expected: Outcome }[] = [
        {
          row: {
            payload: value,
            recorded: { kind: 'Value', value: 2 },
            bypass: { kind: 'Value', value: false },
          },
          expected: { kind: 'True' },
        },
        {
          row: {
            payload: value,
            recorded: { kind: 'Value', value: 3 },
            bypass: { kind: 'Value', value: false },
          },
          expected: { kind: 'False' },
        },
        {
          row: {
            payload: { kind: 'Null' },
            recorded: { kind: 'Value', value: 2 },
            bypass: { kind: 'Value', value: false },
          },
          expected: { kind: 'Error', value: { state: parseInt('23514', 36) } },
        },
        {
          row: {
            payload: { kind: 'Unknown' },
            recorded: { kind: 'Value', value: 2 },
            bypass: { kind: 'Value', value: false },
          },
          expected: { kind: 'Unknown' },
        },
        {
          row: {
            payload: error,
            recorded: { kind: 'Value', value: 2 },
            bypass: { kind: 'Value', value: false },
          },
          expected: error,
        },
        {
          row: {
            payload: { kind: 'Unknown' },
            recorded: { kind: 'Value', value: 2 },
            bypass: { kind: 'Value', value: true },
          },
          expected: { kind: 'True' },
        },
        {
          row: {
            payload: error,
            recorded: { kind: 'Value', value: 2 },
            bypass: { kind: 'Value', value: true },
          },
          expected: { kind: 'True' },
        },
      ]
      references.push({ type, payload, numericOidRelabel: type.startsWith('reg') })
      for (const test of cases)
        for (const origin of ['source', 'stored'])
          fixtures.push({ name: `${index}_${origin}`, ...test })
    }
    expect(families.size).toBe(40)
    expect(arrayScalarProfiles).toHaveLength(58)
    expect(fixtures).toHaveLength(812)
    const artifact = process.env['PGSID_DOMAIN_POLY_ARTIFACTS']
    if (artifact) {
      await mkdir(artifact, { recursive: true })
      await writeFile(join(artifact, 'family-fixtures.json'), JSON.stringify(fixtures))
      await writeFile(join(artifact, 'family-references.json'), JSON.stringify(references))
    }
    await runCheckParity(
      directory,
      'domainpolyfamilies',
      group,
      plans.map((p, index) => `${Math.floor(index / 2)}_${p.identity.constraint}`),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240000)
