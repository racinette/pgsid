import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'
import { rangeArrayText, readRangeArrayFixture } from './check-range-array-fixtures.js'
import { readMultirangeArrayFixture } from './check-multirange-array-fixtures.js'

it('retains exact range and multirange sort ties while deferring unspecified unequal wire representations', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-range-array-sort-'))
  try {
    const forms = [
      { type: 'pg_catalog.numrange', send: 'range_send', name: 'ranges' },
      { type: 'pg_catalog.nummultirange', send: 'multirange_send', name: 'multiranges' },
    ] as const
    for (const f of forms)
      await pg.exec(
        'CREATE TABLE tie_' +
          f.name +
          '(payload ' +
          f.type +
          '[],wire bytea,CHECK(' +
          f.send +
          '((array_sort(payload))[1]) IS NOT DISTINCT FROM wire))',
      )
    const catalog = await snapshotCatalog(pg)
    const group = prepareCheckRustGroup(
      forms.flatMap((f) => {
        const table = catalog.tables.find((t) => t.name === 'tie_' + f.name)!
        return (['source', 'stored'] as const).map((origin) => ({
          identity: { schema: 'public', kind: 'table' as const, owner: f.name, constraint: origin },
          expression: lowerTableCheck(
            table,
            origin === 'source'
              ? {
                  name: 'checked',
                  type: 'check',
                  definition:
                    'CHECK(' + f.send + '((array_sort(payload))[1]) IS NOT DISTINCT FROM wire)',
                }
              : table.constraints[0]!,
            catalog.enums,
            catalog.domains,
            origin,
          )!.expression,
        }))
      }),
      { defaultCollation: 'C', serverEncoding: 'UTF8' },
    )
    expect(group.checks.filter((c) => c.kind !== 'supported')).toEqual([])
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    let inserts = 0,
      ambiguous = 0
    for (const f of forms) {
      const first = f.name === 'ranges' ? '[1.00,3.000)' : '{[1.00,3.000),[7.0,9.00)}'
      const second = f.name === 'ranges' ? '[1.0000,3.00000)' : '{[1.0000,3.00000),[7.000,9.0000)}'
      for (const cells of [
        null,
        [],
        [null],
        [first, first],
        [first, first, null],
        [first, second, null],
      ] as (null | (string | null)[])[]) {
        const text = cells === null ? null : rangeArrayText(cells)
        const payload =
          f.name === 'ranges'
            ? await readRangeArrayFixture(pg, f.type as 'pg_catalog.numrange', text)
            : await readMultirangeArrayFixture(pg, 'pg_catalog.nummultirange', text)
        const wire = (
          await pg.query<{ wire: string | null }>(
            'SELECT encode(' + f.send + '((array_sort($1::' + f.type + "[]))[1]),'hex') wire",
            [text],
          )
        ).rows[0]!.wire
        const uncertain = cells?.includes(second) ?? false
        for (const mismatch of [false, true]) {
          const expectedWire = mismatch ? 'ff' : wire
          if (mismatch)
            await expect(
              pg.query('INSERT INTO tie_' + f.name + " VALUES($1,decode($2,'hex'))", [
                text,
                expectedWire,
              ]),
            ).rejects.toMatchObject({ code: '23514' })
          else
            await pg.query('INSERT INTO tie_' + f.name + " VALUES($1,decode($2,'hex'))", [
              text,
              expectedWire,
            ])
          inserts++
          if (uncertain) ambiguous++
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: f.name + '_' + origin,
              row: {
                payload: payload ? { kind: 'Value', value: payload } : { kind: 'Null' },
                wire:
                  expectedWire === null ? { kind: 'Null' } : { kind: 'Value', value: expectedWire },
              },
              expected: { kind: uncertain ? 'Unknown' : mismatch ? 'False' : 'True' },
            })
        }
      }
    }
    await runCheckParity(
      directory,
      'rangesortties',
      group,
      forms.flatMap((f) => ['source', 'stored'].map((o) => f.name + '_' + o)),
      fixtures,
    )
    await mkdir('artifacts/check-multirange-arrays', { recursive: true })
    await writeFile(
      'artifacts/check-multirange-arrays/sort-ties-report.json',
      JSON.stringify(
        { inserts, fixtures: fixtures.length, ambiguous, identicalTiesKnown: true },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 120000)
