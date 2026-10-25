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

const packet = 'artifacts/goal-checks/tsquery-querytree-active'
const context = { serverEncoding: 'UTF8', clientEncoding: 'UTF8', defaultCollation: 'C' } as const
const operations: Record<string, string> = {
  tree: 'querytree(source::tsquery)',
  negated: 'querytree(!!(source::tsquery))',
  joined: 'querytree(source::tsquery && other::tsquery)',
  disjoined: 'querytree(source::tsquery || other::tsquery)',
  phrase: 'querytree(tsquery_phrase(source::tsquery,other::tsquery,distance))',
  selected: 'querytree(CASE WHEN distance=1 THEN source::tsquery ELSE other::tsquery END)',
  coalesced: 'querytree(COALESCE(source::tsquery,other::tsquery))',
}
const check = (body: string) =>
  `CASE WHEN bypass THEN true ELSE (${body}) IS NOT DISTINCT FROM expected END`
const known = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

it('extracts indexable query trees with exact text, strict errors and lazy source/stored INSERT parity', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsquery-querytree-'))
  try {
    const columns = 'source text,other text,distance int4,expected text,bypass bool'
    await pg.exec(`CREATE TABLE construction_input(${columns})`)
    for (const [name, body] of Object.entries(operations))
      await pg.exec(
        `CREATE TABLE construct_${name}(${columns},CONSTRAINT rule CHECK(${check(body)}))`,
      )
    const catalog = await snapshotCatalog(pg),
      checks = Object.entries(operations).flatMap(([name, body]) => {
        const table = catalog.tables.find((t) => t.name === 'construct_' + name)!,
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
              origin === 'source' ? { ...c, definition: `CHECK(${check(body)})` } : c,
              [],
              catalog.domains,
              origin,
            )!.expression,
          ),
        }))
      }),
      group = prepareCheckRustGroup(checks, context)
    group.checks.forEach((c) => expect(c.kind, 'reason' in c ? c.reason : '').toBe('supported'))
    const cases: [string | null, string | null, number | null][] = [
      ['!a', 'b', 1],
      ['!!a', '!b', 1],
      ['a & !b', 'c', 1],
      ['a | !b', 'c', 1],
      ['!a <2> b', 'c', 1],
      ['a <2> !b', 'c', 1],
      ['(a | !b) <3> c', 'd', 1],
      ['a & (b | !c)', 'd', 1],
      ['!(a & b) & c', 'd', 1],
      ['a <2> (b & !c)', 'd', 1],
      [null, 'a', 1],
      ['a', null, 1],
      ['', '', 0],
      ['', 'a:A', 2],
      ['a:*B', '', 16384],
      ['a', 'b', 0],
      ['a', 'b', 1],
      ['a | b', '!c', 2],
      ['a & (b & c)', 'd <2> e', 16384],
      ['é:*AB', '😀:D', 3],
      ['a:A', 'a:*B', null],
      ['a', 'b', -1],
      ['', 'a', -1],
      ['a', '', 16385],
      ['a', 'b', 2147483647],
      ['a', 'b', -2147483648],
      ['a &', 'b', 1],
      [null, 'a &', 1],
      ['a &', 'b', null],
      ['a', 'b &', null],
      ['a', 'b', 16385],
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    let inserts = 0,
      rejected = 0
    for (const [source, other, distance] of cases)
      for (const wrong of [false, true])
        for (const bypass of [false, true]) {
          await pg.query('DELETE FROM construction_input')
          await pg.query('INSERT INTO construction_input VALUES($1,$2,$3,NULL,$4)', [
            source,
            other,
            distance,
            bypass,
          ])
          for (const [name, body] of Object.entries(operations)) {
            await pg.exec('UPDATE construction_input SET expected=NULL')
            let state: string | undefined
            try {
              await pg.exec(
                `UPDATE construction_input SET expected=${wrong ? "'wrong'::text" : body}`,
              )
            } catch (error) {
              state = (error as { code: string }).code
            }
            const expectedValue = (
              await pg.query<{ expected: string | null }>('SELECT expected FROM construction_input')
            ).rows[0]!.expected
            let value: boolean | null = null,
              observed: string | undefined
            try {
              value = (
                await pg.query<{ value: boolean | null }>(
                  `SELECT ${check(body)} value FROM construction_input`,
                )
              ).rows[0]!.value
            } catch (error) {
              observed = (error as { code: string }).code
            }
            let failure: string | undefined
            try {
              await pg.exec(`INSERT INTO construct_${name} SELECT * FROM construction_input`)
            } catch (error) {
              failure = (error as { code: string }).code
            }
            expect(failure).toBe(observed ?? (value === false ? '23514' : undefined))
            inserts++
            if (failure) rejected++
            const outcome: Outcome = observed
                ? { kind: 'Error', value: { state: parseInt(observed, 36) } }
                : { kind: value === null ? 'Null' : value ? 'True' : 'False' },
              row: Row = {
                source: known(source),
                other: known(other),
                distance: known(distance),
                expected: known(expectedValue),
                bypass: known(bypass),
              }
            for (const origin of ['source', 'stored'])
              fixtures.push({ name: name + '_' + origin, row, expected: outcome })
            references.push({
              source,
              other,
              distance,
              wrong,
              bypass,
              name,
              value,
              state,
              observed,
              failure,
            })
          }
        }
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'raw-reference.json'),
      JSON.stringify(
        {
          nativeInserts: inserts,
          nativeRejections: rejected,
          fixtures: fixtures.length,
          references,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      root,
      'tsqueryquerytree',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
