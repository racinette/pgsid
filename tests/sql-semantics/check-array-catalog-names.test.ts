import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { catalogScalarType } from '../../src/sql-semantics/catalog-check-binder.js'
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

it('binds qualified catalog array names like ordinary array spellings across represented families, NULL cells, shapes and original INSERTs', async () => {
  const pg = await PGlite.create()
  try {
    const types = (
      await pg.query<{ name: string; display: string }>(
        `SELECT t.typname name,format_type(t.oid,NULL) display FROM pg_type t
         JOIN pg_namespace n ON n.oid=t.typnamespace
         WHERE n.nspname='pg_catalog' AND t.typcategory='A' AND t.typelem<>0
         ORDER BY t.typname`,
      )
    ).rows.filter((type) => catalogScalarType('pg_catalog.' + type.name)?.startsWith('array:'))
    expect(types).toHaveLength(57)
    const forms = types.flatMap((type, index) =>
      (['input', 'constructor'] as const).map((mode) => {
        const alias = 'pg_catalog.' + (mode === 'input' ? type.name : '"' + type.name + '"')
        const value = mode === 'input' ? 'payload' : 'ARRAY[NULL,NULL]'
        return {
          name: `catalog_array_${index}_${mode}`,
          mode,
          type,
          sql: `CASE WHEN bypass THEN true ELSE cardinality((${value})::${alias}) IS NOT DISTINCT FROM expected END`,
          canonical: `CASE WHEN bypass THEN true ELSE cardinality((${value})::${catalogScalarType('pg_catalog.' + type.name)!.slice(6)}[]) IS NOT DISTINCT FROM expected END`,
        }
      }),
    )
    for (const form of forms)
      await pg.exec(`CREATE TABLE ${form.name}(payload text,expected integer,bypass boolean,
        CONSTRAINT valid_shape CHECK(${form.sql}))`)
    const catalog = await snapshotCatalog(pg)
    const plans = forms.flatMap((form) => {
      const table = catalog.tables.find((table) => table.name === form.name)!
      const alias = lowerTableCheck(
        table,
        { name: 'valid_shape', type: 'check', definition: `CHECK(${form.sql})` },
        catalog.enums,
        catalog.domains,
        'source',
      )!
      const canonical = lowerTableCheck(
        table,
        { name: 'valid_shape', type: 'check', definition: `CHECK(${form.canonical})` },
        catalog.enums,
        catalog.domains,
        'source',
      )!
      expect(hasUncertain(alias.expression), form.name).toBe(false)
      expect(alias.expression, form.name).toEqual(canonical.expression)
      const stored = lowerTableCheck(
        table,
        table.constraints[0]!,
        catalog.enums,
        catalog.domains,
        'stored',
      )!
      return [alias, stored].map((plan, index) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: form.name,
          constraint: form.name + (index === 0 ? '_source' : '_stored'),
        },
        expression: portableCheckAtoms(plan.expression),
      }))
    })
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    let inserts = 0
    for (const form of forms) {
      const samples =
        form.mode === 'constructor'
          ? [{ text: null, count: 2 }]
          : [
              { text: null, count: null },
              { text: '{}', count: 0 },
              { text: '{NULL}', count: 1 },
              { text: '[-1:0][3:4]={{NULL,NULL},{NULL,NULL}}', count: 4 },
            ]
      for (const sample of samples)
        for (const bypass of [false, true])
          for (const wrong of [false, true]) {
            const payload =
              form.type.name === '_box' ? (sample.text?.replaceAll(',', ';') ?? null) : sample.text
            const expected = wrong ? 99 : sample.count
            const accepted = bypass || !wrong
            const insert = pg.query(`INSERT INTO ${form.name} VALUES($1,$2,$3)`, [
              payload,
              expected,
              bypass,
            ])
            if (accepted) await insert
            else
              await expect(insert).rejects.toMatchObject({
                code: '23514',
                constraint: 'valid_shape',
              })
            inserts++
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: form.name + '_' + origin,
                row: {
                  payload: input(payload),
                  expected: input(expected),
                  bypass: input(bypass),
                },
                expected: { kind: accepted ? 'True' : 'False' },
              })
          }
    }
    await mkdir('artifacts/array-catalog-names', { recursive: true })
    await writeFile(
      'artifacts/array-catalog-names/families.json',
      JSON.stringify({ types, inserts, fixtures: fixtures.length }, null, 2) + '\n',
    )
    expect(inserts).toBe(1140)
    expect(fixtures).toHaveLength(2280)
    for (let offset = 0; offset < plans.length; offset += 64) {
      const batch = plans.slice(offset, offset + 64)
      const group = prepareCheckRustGroup(batch, {
        arrayNulls: true,
        defaultCollation: 'C',
        defaultCtype: 'C.UTF-8',
        serverEncoding: 'UTF8',
      })
      for (const [index, check] of group.checks.entries())
        expect(
          check.kind,
          batch[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
        ).toBe('supported')
      const names = batch.map((plan) => plan.identity.constraint)
      const directory = await mkdtemp(join(tmpdir(), 'pgsid-array-catalog-names-'))
      try {
        await runCheckParity(
          directory,
          'catalogarraynames',
          group,
          names,
          fixtures.filter((fixture) => names.includes(fixture.name)),
        )
      } finally {
        await rm(directory, { recursive: true, force: true })
      }
    }
  } finally {
    await pg.close()
  }
}, 600_000)
