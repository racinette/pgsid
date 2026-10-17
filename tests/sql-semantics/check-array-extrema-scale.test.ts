import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity } from '../../tools/check-rust/parity.js'

it('selects 50,000-cell equal prefixes with borrowed comparison cursors in every target', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-extrema-scale-'))
  try {
    const count = 50000
    await pg.exec('CREATE TABLE extrema_scale(a text,b text,expected integer)')
    const forms = Object.fromEntries(
      ['array_larger', 'array_smaller'].map((fn) => [
        fn,
        `cardinality(${fn}(a::integer[],b::integer[]))=${count} AND (${fn}(a::integer[],b::integer[]))[${count}]=expected`,
      ]),
    )
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(`ALTER TABLE extrema_scale ADD CONSTRAINT "${name}" CHECK(${sql}) NOT VALID`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'extrema_scale')!
    const plans = Object.entries(forms).flatMap(([name, sql]) =>
      (['source', 'stored'] as const).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: name + '_' + origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'stored'
              ? table.constraints.find((c) => c.name === name)!
              : { name, type: 'check', definition: `CHECK(${sql})` },
            catalog.enums,
            catalog.domains,
            origin,
          )!.expression,
        ),
      })),
    )
    const group = prepareCheckRustGroup(plans, {
      arrayNulls: true,
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
    })
    for (const check of group.checks)
      expect(check.kind, 'reason' in check ? check.reason : '').toBe('supported')
    const cells = Array.from({ length: count }, (_, index) => index),
      a = '{' + cells.join(',') + '}'
    cells[count - 1] = count + 1
    const b = '{' + cells.join(',') + '}'
    const fixtures: {
        name: string
        row: {
          a: { kind: 'Value'; value: string }
          b: { kind: 'Value'; value: string }
          expected: { kind: 'Value'; value: number }
        }
        expected: { kind: 'True' }
      }[] = [],
      references: unknown[] = []
    for (const [name, sql] of Object.entries(forms)) {
      const expected = name === 'array_larger' ? count + 1 : count - 1
      const value = (
        await pg.query<{ value: boolean }>(
          `SELECT ${sql} value FROM (SELECT $1::text a,$2::text b,$3::integer expected) q`,
          [a, b, expected],
        )
      ).rows[0]!.value
      expect(value).toBe(true)
      references.push({ name, cells: count, expected, postgres: value })
      for (const origin of ['source', 'stored'])
        fixtures.push({
          name: name + '_' + origin,
          row: {
            a: { kind: 'Value', value: a },
            b: { kind: 'Value', value: b },
            expected: { kind: 'Value', value: expected },
          },
          expected: { kind: 'True' },
        })
    }
    await mkdir('artifacts/array-extrema', { recursive: true })
    await writeFile(
      'artifacts/array-extrema/scale-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-extrema/scale-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arrayextremascale',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
