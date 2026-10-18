import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { arrayElementFamily } from '../../src/codegen/shared/check-array-types.js'
import { catalogArrayType } from '../../src/sql-semantics/catalog-check-binder.js'
import { arrayScalarProfiles } from './check-array-fixtures.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

it('parses every represented scalar domain element family with input typmods, lexical NULL failure, partial input and lazy branches', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-domain-array-input-families-'))
  try {
    await pg.exec(
      "SET TimeZone='UTC';SET DateStyle='ISO, MDY';SET IntervalStyle='iso_8601';CREATE TYPE array_stage AS ENUM('new','done')",
    )
    for (const [index, [type]] of arrayScalarProfiles.entries())
      await pg.exec(
        `CREATE DOMAIN input_scalar_${index} AS ${type} CHECK(VALUE IS NOT NULL);CREATE TABLE input_family_${index}(payload text,bypass boolean,CONSTRAINT parsed CHECK(CASE WHEN bypass THEN true ELSE cardinality(payload::input_scalar_${index}[])=2 END))`,
      )
    const catalog = await snapshotCatalog(pg),
      families = new Set<number>(),
      references: unknown[] = []
    const plans = arrayScalarProfiles.flatMap((_, index) => {
      const table = catalog.tables.find((item) => item.name === 'input_family_' + index)!
      const array = catalogArrayType(
        'public.input_scalar_' + index + '[]',
        undefined,
        catalog.domains,
        catalog.enums,
      )!
      families.add(arrayElementFamily(array.slice(6))!)
      return ['source', 'stored'].map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            table.constraints[0]!,
            catalog.enums,
            catalog.domains,
            origin as 'source' | 'stored',
          )!.expression,
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
        type === 'money'
          ? '{0,0}'
          : (
              await pg.query<{ payload: string }>(
                `SELECT ARRAY[${literal}::${type},${literal}::${type}]::text AS payload`,
              )
            ).rows[0]!.payload
      expect(
        (
          await pg.query<{ value: number }>(
            `SELECT cardinality($1::input_scalar_${index}[]) AS value`,
            [payload],
          )
        ).rows[0]!.value,
        type,
      ).toBe(2)
      const array = catalogArrayType(
          'public.input_scalar_' + index + '[]',
          undefined,
          catalog.domains,
          catalog.enums,
        )!,
        family = arrayElementFamily(array.slice(6))!
      const invalid = family === 27 ? '{NULL;bad}' : '{NULL,bad}'
      await expect(
        pg.query(`SELECT cardinality($1::input_scalar_${index}[])`, [invalid]),
      ).rejects.toMatchObject({ code: '23514', constraint: 'input_scalar_' + index + '_check' })
      references.push({ type, payload, invalid, nullState: '23514' })
      const samples: { row: Row; expected: Outcome }[] = [
        {
          row: {
            payload: { kind: 'Value', value: payload },
            bypass: { kind: 'Value', value: false },
          },
          expected: { kind: 'True' },
        },
        {
          row: {
            payload: { kind: 'Value', value: invalid },
            bypass: { kind: 'Value', value: false },
          },
          expected: { kind: 'Error', value: { state: parseInt('23514', 36) } },
        },
        {
          row: { payload: { kind: 'Null' }, bypass: { kind: 'Value', value: false } },
          expected: { kind: 'Null' },
        },
        {
          row: { payload: { kind: 'Unknown' }, bypass: { kind: 'Value', value: false } },
          expected: { kind: 'Unknown' },
        },
        {
          row: {
            payload: { kind: 'Error', value: { state: parseInt('22012', 36) } },
            bypass: { kind: 'Value', value: false },
          },
          expected: { kind: 'Error', value: { state: parseInt('22012', 36) } },
        },
        {
          row: { payload: { kind: 'Value', value: 'bad' }, bypass: { kind: 'Value', value: true } },
          expected: { kind: 'True' },
        },
        {
          row: { payload: { kind: 'Value', value: '{}' }, bypass: { kind: 'Value', value: false } },
          expected: { kind: 'False' },
        },
      ]
      for (const origin of ['source', 'stored'])
        for (const sample of samples)
          fixtures.push({ name: 'input_family_' + index + '_' + origin, ...sample })
    }
    expect(families.size).toBe(40)
    expect(fixtures).toHaveLength(812)
    const artifacts = process.env['PGSID_DOMAIN_ARRAY_INPUT_ARTIFACT_DIR']
    if (artifacts) {
      await mkdir(artifacts, { recursive: true })
      await writeFile(
        join(artifacts, 'family-fixtures.json'),
        JSON.stringify(fixtures, null, 2) + '\n',
      )
      await writeFile(
        join(artifacts, 'family-references.json'),
        JSON.stringify(references, null, 2) + '\n',
      )
    }
    await runCheckParity(
      directory,
      'domaininputfamilies',
      group,
      plans.map((plan) => plan.identity.owner + '_' + plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 360000)
