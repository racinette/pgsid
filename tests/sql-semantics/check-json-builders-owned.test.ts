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

it('builds large VARIADIC JSON arrays and duplicate-key objects without copying the full argument batch per cell', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-json-builders-owned-'))
  try {
    await pg.exec('CREATE TABLE owned_json_builders(marker integer,expected text)')
    const outputs = {
      array: 'json_build_array(VARIADIC array_fill(marker,ARRAY[50000]))::text',
      object: 'json_build_object(VARIADIC array_fill(marker,ARRAY[50000]))::text',
    }
    const forms = Object.fromEntries(
      Object.entries(outputs).map(([name, sql]) => [
        name,
        `(${sql}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"`,
      ]),
    )
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(`ALTER TABLE owned_json_builders ADD CONSTRAINT "${name}" CHECK(${sql})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'owned_json_builders')!,
      plans = Object.entries(forms).flatMap(([name, sql]) =>
        ['source', 'stored'].map((origin) => ({
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
              origin as 'source' | 'stored',
            )!.expression,
          ),
        })),
      ),
      group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' })
    for (const check of group.checks) expect(check.kind).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const [name, sql] of Object.entries(outputs)) {
      const output = (
        await pg.query<{ value: string }>(`SELECT (${sql}) value FROM (SELECT 1 marker) q`)
      ).rows[0]!.value
      expect(output.length).toBe(name === 'array' ? 150000 : 225000)
      references.push({ name, cells: 50000, characters: output.length })
      for (const origin of ['source', 'stored']) {
        fixtures.push({
          name: name + '_' + origin,
          row: { marker: { kind: 'Value', value: 1 }, expected: { kind: 'Value', value: output } },
          expected: { kind: 'True' },
        })
        fixtures.push({
          name: name + '_' + origin,
          row: { marker: { kind: 'Value', value: 1 }, expected: { kind: 'Value', value: 'wrong' } },
          expected: { kind: 'False' },
        })
      }
    }
    await mkdir('artifacts/json-builders', { recursive: true })
    await writeFile(
      'artifacts/json-builders/owned-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/json-builders/owned-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'jsonbuildersowned',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
