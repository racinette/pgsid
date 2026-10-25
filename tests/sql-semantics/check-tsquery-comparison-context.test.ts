import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
import { readTsqueryFixture } from './check-tsquery-fixtures.js'

it('retains count/size/structure decisions and term containment without reading unavailable CRC encoding or comparator magnitude', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsquery-comparison-context-')),
    packet = 'artifacts/goal-checks/tsquery-comparison-active'
  const definitions: Record<string, string> = {
    same: 'item=reference',
    less: 'item<reference',
    raw: 'tsquery_cmp(item,reference)=0',
    contains: 'item @> reference',
  }
  try {
    const columns = 'item tsquery,reference tsquery,bypass bool'
    for (const [name, sql] of Object.entries(definitions))
      await pg.exec(
        `CREATE TABLE context_${name}(${columns},CONSTRAINT rule CHECK(CASE WHEN bypass THEN true ELSE ${sql} END))`,
      )
    const catalog = await snapshotCatalog(pg),
      checks = Object.entries(definitions).flatMap(([name, sql]) => {
        const table = catalog.tables.find((t) => t.name === 'context_' + name)!,
          c = table.constraints[0]!
        return (['source', 'stored'] as const).map((origin) => ({
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
                ? { ...c, definition: `CHECK(CASE WHEN bypass THEN true ELSE ${sql} END)` }
                : c,
              [],
              catalog.domains,
              origin,
            )!.expression,
          ),
        }))
      }),
      group = prepareCheckRustGroup(checks, { defaultCollation: 'C' })
    group.checks.forEach((c) => expect(c.kind, 'reason' in c ? c.reason : '').toBe('supported'))
    const cases: { a: string | null; b: string | null; unknown: string[]; missingSize?: true }[] = [
      { a: 'é:A', b: 'é:*B', unknown: [] },
      { a: 'é', b: 'ê', unknown: ['same', 'less', 'raw'] },
      { a: 'é', b: 'a', unknown: [] },
      { a: 'é', b: 'a & b', unknown: [] },
      { a: 'é | x', b: 'ê & x', unknown: [] },
      { a: 'é & a', b: 'ê & b', unknown: [] },
      { a: 'é <2> x', b: 'ê <1> x', unknown: ['same', 'less', 'raw'] },
      { a: 'fGEtsNKMDB', b: '6P7Sag1hsi', unknown: ['raw'] },
      { a: 'é', b: 'a', unknown: ['same', 'less', 'raw'], missingSize: true },
      { a: 'é', b: 'a & b', unknown: [], missingSize: true },
      { a: null, b: 'é', unknown: [] },
      { a: '', b: '', unknown: ['same', 'less', 'raw'], missingSize: true },
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    const capture = async (text: string | null, missing = false): Promise<Input> => {
      if (text === null) return { kind: 'Null' }
      const value = (await readTsqueryFixture(pg, 'SELECT $1::tsquery item', 'item', [text]))!
      return { kind: 'Value', value: { ...value, nativeBytes: missing ? -1 : value.nativeBytes } }
    }
    let inserts = 0
    for (const c of cases)
      for (const bypass of [false, true]) {
        const row: Row = {
          item: await capture(c.a, c.missingSize),
          reference: await capture(c.b),
          bypass: { kind: 'Value', value: bypass },
        }
        for (const [name, sql] of Object.entries(definitions)) {
          const query = 'SELECT $1::tsquery item,$2::tsquery reference,$3::bool bypass',
            parameters = [c.a, c.b, bypass],
            value = (
              await pg.query<{ value: boolean | null }>(
                `SELECT CASE WHEN bypass THEN true ELSE ${sql} END value FROM (${query}) input`,
                parameters,
              )
            ).rows[0]!.value
          let failure: string | undefined
          try {
            await pg.query(`INSERT INTO context_${name} ${query}`, parameters)
          } catch (error) {
            failure = (error as { code: string }).code
          }
          expect(failure).toBe(value === false ? '23514' : undefined)
          inserts++
          const expected: Outcome =
            !bypass && c.unknown.includes(name)
              ? { kind: 'Unknown' }
              : { kind: value === null ? 'Null' : value ? 'True' : 'False' }
          for (const origin of ['source', 'stored'])
            fixtures.push({ name: name + '_' + origin, row, expected })
          references.push({ c, bypass, name, value, expected })
        }
      }
    const error: Input = { kind: 'Error', value: { state: parseInt('22023', 36) } },
      unknown: Input = { kind: 'Unknown' },
      nil: Input = { kind: 'Null' }
    for (const [a, b] of [
      [error, unknown],
      [unknown, error],
      [nil, unknown],
      [unknown, nil],
      [nil, nil],
    ])
      for (const bypass of [false, true]) {
        const expected: Outcome = bypass
          ? { kind: 'True' }
          : a?.kind === 'Error'
            ? a
            : b?.kind === 'Error'
              ? b
              : a?.kind === 'Null' && b?.kind === 'Null'
                ? { kind: 'Null' }
                : { kind: 'Unknown' }
        for (const name of Object.keys(definitions))
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: name + '_' + origin,
              row: { item: a!, reference: b!, bypass: { kind: 'Value', value: bypass } },
              expected,
            })
      }
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'context-reference.json'),
      JSON.stringify({ nativeInserts: inserts, fixtures: fixtures.length, references }, null, 2) +
        '\n',
    )
    await runCheckParity(
      root,
      'tsquerycomparisoncontext',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
