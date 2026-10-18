import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const input = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (code: string): Outcome => ({ kind: 'Error', value: { state: parseInt(code, 36) } })

it('preserves catalog array modifiers, scalar input errors, narrowing, lazy branches and custom underscore type identities', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-array-catalog-name-validity-'))
  try {
    await pg.exec(`CREATE SCHEMA catalog_names;
      CREATE TYPE catalog_names._int4 AS ENUM ('ready','done');
      CREATE DOMAIN catalog_names._text AS integer CHECK(VALUE>0);
      SET search_path=catalog_names,public,pg_catalog`)
    const expressions: Record<string, string> = {
      integers: `array_to_string(payload::pg_catalog._int4,',','N')`,
      bits: `array_to_string(payload::pg_catalog._bit,',','N')`,
      characters: `array_to_string(payload::pg_catalog._bpchar,',','N')`,
      numeric_width: `array_to_string(payload::pg_catalog._numeric(4,1),',','N')`,
      varchar_width: `array_to_string(payload::pg_catalog._varchar(2),',','N')`,
      parse_first: `array_dims(ARRAY[payload::integer,1/divisor]::pg_catalog._int4)`,
      divide_first: `array_dims(ARRAY[1/divisor,payload::integer]::pg_catalog._int4)`,
      narrowing: `array_dims(ARRAY[quantity,1/divisor]::pg_catalog._int2)`,
      coalesce: `array_dims(COALESCE(payload::pg_catalog._int4,ARRAY[quantity]))`,
      literal: `array_dims('{1,NULL,3}'::pg_catalog._int4)`,
      custom_enum: `(payload::catalog_names._int4)::text`,
      unqualified_enum: `(payload::_int4)::text`,
      custom_domain: `(payload::catalog_names._text)::text`,
    }
    const samples: Record<string, (string | null)[]> = {
      integers: ['{1,NULL,3}', '{}', null, '{bad}', '{2147483648}'],
      bits: ['{1010,11,NULL}', '{0,1}', '{102}', '{}', null],
      characters: ['{"abcd","x ",NULL}', '{a,b}', '{}', null],
      numeric_width: ['{1.25,12.34,NULL}', '{1000}', '{NaN}', '{}', null],
      varchar_width: ['{"雪😊abc","abc"}', '{"NULL",NULL}', '{}', null],
      coalesce: ['{1,NULL,3}', '{}', null, '{bad}'],
      literal: [null],
      custom_enum: ['ready', 'done', 'missing', null],
      unqualified_enum: ['ready', 'done', 'missing', null],
      custom_domain: ['1', '0', 'bad', null],
    }
    const forms = Object.entries(expressions).map(([name, output]) => ({
      name,
      output,
      sql: `CASE WHEN bypass THEN true ELSE (${output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END`,
    }))
    for (const form of forms)
      await pg.exec(`CREATE TABLE checked_${form.name}(payload text,quantity integer,divisor integer,
        expected text COLLATE "C",bypass boolean,CONSTRAINT agrees CHECK(${form.sql}))`)
    const catalog = await snapshotCatalog(pg)
    const plans = forms.flatMap((form) => {
      const table = catalog.tables.find((item) => item.name === 'checked_' + form.name)!
      return (['source', 'stored'] as const).map((origin) => {
        const plan = lowerTableCheck(
          table,
          origin === 'source'
            ? { name: 'agrees', type: 'check', definition: `CHECK(${form.sql})` }
            : table.constraints[0]!,
          catalog.enums,
          catalog.domains,
          origin,
        )!
        expect(hasUncertain(plan.expression), form.name + '_' + origin).toBe(false)
        return {
          identity: {
            schema: table.schema,
            kind: 'table' as const,
            owner: table.name,
            constraint: form.name + '_' + origin,
          },
          expression: portableCheckAtoms(plan.expression),
        }
      })
    })
    const group = prepareCheckRustGroup(plans, {
      arrayNulls: true,
      defaultCollation: 'C',
      defaultCtype: 'C.UTF-8',
      serverEncoding: 'UTF8',
    })
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const references: unknown[] = []
    let inserts = 0
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const origin of ['source', 'stored'])
        fixtures.push({ name: name + '_' + origin, row, expected })
    }
    for (const form of forms) {
      const rows = samples[form.name]?.map((payload) => ({ payload, quantity: 2, divisor: 1 })) ?? [
        { payload: 'bad', quantity: 2, divisor: 0 },
        { payload: '7', quantity: 2, divisor: 0 },
        { payload: '7', quantity: 32768, divisor: 1 },
        { payload: null, quantity: null, divisor: 0 },
        { payload: '7', quantity: 2, divisor: 1 },
      ]
      for (const values of rows) {
        let output: string | null = null
        let failure: string | undefined
        try {
          output = (
            await pg.query<{ value: string | null }>(
              `SELECT (${form.output}) value FROM (SELECT $1::text payload,$2::integer quantity,$3::integer divisor) q`,
              [values.payload, values.quantity, values.divisor],
            )
          ).rows[0]!.value
        } catch (caught) {
          expect(caught).toHaveProperty('code')
          failure = (caught as { code: string }).code
        }
        references.push({ form: form.name, values, output, failure })
        for (const bypass of [false, true])
          for (const wrong of [false, true]) {
            const expected = wrong ? '!wrong!' : output
            const result: Outcome = bypass
              ? { kind: 'True' }
              : failure
                ? error(failure)
                : { kind: wrong ? 'False' : 'True' }
            const accepted = result.kind === 'True'
            const insert = pg.query(`INSERT INTO checked_${form.name} VALUES($1,$2,$3,$4,$5)`, [
              values.payload,
              values.quantity,
              values.divisor,
              expected,
              bypass,
            ])
            if (accepted) await insert
            else await expect(insert).rejects.toMatchObject({ code: failure ?? '23514' })
            inserts++
            add(
              form.name,
              {
                payload: input(values.payload),
                quantity: input(values.quantity),
                divisor: input(values.divisor),
                expected: input(expected),
                bypass: input(bypass),
              },
              result,
            )
          }
      }
    }
    const row: Row = {
      payload: { kind: 'Unknown' },
      quantity: input(2),
      divisor: input(0),
      expected: input('[1:2]'),
      bypass: input(false),
    }
    add('parse_first', row, { kind: 'Unknown' })
    add('divide_first', row, error('22012'))
    add('integers', row, { kind: 'Unknown' })
    for (const form of forms)
      add(
        form.name,
        {
          ...row,
          bypass: input(true),
          divisor: { kind: 'Error', value: { state: parseInt('22003', 36) } },
        },
        { kind: 'True' },
      )
    await mkdir('artifacts/array-catalog-names', { recursive: true })
    await writeFile(
      'artifacts/array-catalog-names/validity.json',
      JSON.stringify({ inserts, fixtures: fixtures.length, references }, null, 2) + '\n',
    )
    expect(
      references.filter((value) => (value as { failure?: string }).failure).length,
    ).toBeGreaterThan(0)
    await runCheckParity(
      directory,
      'catalogarrayvalidity',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)

it('defers missing or differently qualified catalog array identities without guessing from underscore prefixes', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec('CREATE TABLE catalog_name_boundaries(payload text)')
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((table) => table.name === 'catalog_name_boundaries')!
    for (const name of ['pg_catalog._not_a_type', 'public._int4', 'pg_catalog.__int4']) {
      const definition = `CHECK(cardinality(payload::${name})=1)`
      await expect(
        pg.exec(`ALTER TABLE catalog_name_boundaries ADD CHECK(cardinality(payload::${name})=1)`),
      ).rejects.toMatchObject({ code: '42704' })
      const plan = lowerTableCheck(
        table,
        { name: 'missing', type: 'check', definition },
        catalog.enums,
        catalog.domains,
      )!
      expect(hasUncertain(plan.expression), name).toBe(true)
    }
  } finally {
    await pg.close()
  }
})
