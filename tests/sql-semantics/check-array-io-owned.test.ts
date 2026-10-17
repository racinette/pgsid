import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { runCheckParity, type Outcome, type Row } from '../../tools/check-rust/parity.js'

it('converts large owned text/numeric arrays through linear element I/O loops without whole-cursor copies', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-io-owned-'))
  try {
    await pg.exec('CREATE TABLE array_io_owned(payload text,expected text)')
    const outputs = {
      numeric: 'array_to_json(array_fill(payload,ARRAY[50000])::numeric[])::text',
      roundtrip: 'array_to_json((array_fill(payload,ARRAY[50000])::numeric[])::text[])::text',
    }
    const forms = Object.fromEntries(
      Object.entries(outputs).map(([name, sql]) => [
        name,
        `(${sql}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"`,
      ]),
    )
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(`ALTER TABLE array_io_owned ADD CONSTRAINT "${name}" CHECK(${sql})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'array_io_owned')!
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
            origin === 'source'
              ? {
                  ...table.constraints.find((item) => item.name === name)!,
                  definition: `CHECK(${sql})`,
                }
              : table.constraints.find((item) => item.name === name)!,
            [],
            [],
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
    for (const check of group.checks) expect(check.kind).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const [name, sql] of Object.entries(outputs)) {
      const output = (
        await pg.query<{ value: string }>(
          `SELECT (${sql}) value FROM (SELECT '1.2500'::text payload) q`,
        )
      ).rows[0]!.value
      expect(output.length).toBe(name === 'numeric' ? 350001 : 450001)
      references.push({ name, cells: 50000, characters: output.length })
      for (const origin of ['source', 'stored'])
        for (const wrong of [false, true])
          fixtures.push({
            name: name + '_' + origin,
            row: {
              payload: { kind: 'Value', value: '1.2500' },
              expected: { kind: 'Value', value: wrong ? 'wrong' : output },
            },
            expected: { kind: wrong ? 'False' : 'True' },
          })
    }
    await mkdir('artifacts/array-io-casts', { recursive: true })
    await writeFile(
      'artifacts/array-io-casts/owned-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-io-casts/owned-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arrayioowned',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)
