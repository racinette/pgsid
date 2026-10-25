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

const packet = 'artifacts/goal-checks/tsquery-match-active'
const context = { serverEncoding: 'UTF8', clientEncoding: 'UTF8', defaultCollation: 'C' } as const
const operations: Record<string, string> = {
  forward: 'source::tsvector @@ other::tsquery',
  reverse: 'other::tsquery @@ source::tsvector',
  stripped: 'strip(source::tsvector) @@ other::tsquery',
  weighted: "setweight(source::tsvector,'A') @@ other::tsquery",
}
const check = (body: string) =>
  `CASE WHEN bypass THEN true ELSE (${body}) IS NOT DISTINCT FROM expected END`
const known = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

it('matches supplied vectors and queries with weights, prefixes, phrases, negation and source/stored INSERT parity', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsquery-match-'))
  try {
    const columns = 'source text,other text,expected bool,bypass bool'
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
    const cases: [string | null, string | null][] = [
      [null, 'a'],
      ['a', null],
      ['', ''],
      ['', '!a'],
      ['a', ''],
      ['a', 'a:A'],
      ['a:1D', 'a:A'],
      ['a:1D,2C,3B,4A', 'a:ABCD'],
      ['a:1 b:2', 'a <-> b'],
      ['a:2 b:1', 'a <-> b'],
      ['a:1 b:3', 'a <2> b'],
      ['a:1 b:1', 'a <0> b'],
      ['a:1 b:2 c:3', 'a <-> (b <-> c)'],
      ['a:1 b:2 c:3', '(a <-> b) <-> c'],
      ['a:1 b:2 c:5', 'a <-> (b | c <2> d)'],
      ['a b:2', 'a <-> b'],
      ['a b:2', '!(a <-> b)'],
      ['a:1 b', 'a <-> b'],
      ['a:1 b', 'a <-> !b'],
      ['a:1 b:2', 'a <-> !b'],
      ['a:1 c:2', 'a <-> !b'],
      ['a:1 b:2 c:3', 'a <-> (!x & b)'],
      ['a:1 b:2 c:3', 'a <-> (!x | b)'],
      ['a:1 b:2 c:3', '(!x <-> !y) <-> c'],
      ['a:1 b:2 c:3', 'a <-> !(x <3> y)'],
      ['a:1 b:2 c:3', '!(a <3> b) <-> c'],
      ['a:1 ab:2 ac:3 b:4', 'a:* <-> b'],
      ['a ab:2 b:3', 'a:* <-> b'],
      ['a:1A ab:2B b:3', 'a:*A <-> b'],
      ['a:1A ab:2B b:3', 'a:*B <-> b'],
      ['a:16382 b:16383', 'a <-> b'],
      ['a:16383 b:1', '(a | b) <16384> b'],
      ['é:1 日本:2 😀:3', 'é <-> 日本 <-> 😀'],
      ['é:1 ê:2', 'é:* <-> ê'],
      ['a &', 'a'],
      ['a', 'a &'],
      [null, 'a &'],
      ...Array.from({ length: 72 }, (_, i) => {
        const docs = [
            'a:1,4 b:2,5 c:3',
            'a:1 b c:3',
            'a ab:2 ac:3 b:4',
            'a:1A,3B b:2C,4D c:5',
            'a:16383 b:1 c:2',
            '',
          ],
          queries = [
            'a & b',
            'a | b',
            '!a',
            '!!a',
            'a <0> b',
            'a <2> b',
            'a <-> (b | c)',
            '(a | b) <-> c',
            'a <-> (b & c)',
            '(a & b) <-> c',
            '(!a | !b) <-> c',
            '(!a & !b) <-> c',
            'a <-> (!b | !c)',
            'a <-> (!b & !c)',
            '!(a <-> b) <-> c',
            'a <-> !(b <-> c)',
            'a:* <-> b',
            'a:AC <-> b:BD',
          ]
        return [
          docs[i % docs.length]!,
          queries[(Math.floor(i / docs.length) + (i % docs.length) * 2) % queries.length]!,
        ] as [string, string]
      }),
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    let inserts = 0,
      rejected = 0
    for (const [source, other] of cases)
      for (const wrong of [false, true])
        for (const bypass of [false, true]) {
          await pg.query('DELETE FROM construction_input')
          await pg.query('INSERT INTO construction_input VALUES($1,$2,NULL,$3)', [
            source,
            other,
            bypass,
          ])
          for (const [name, body] of Object.entries(operations)) {
            await pg.exec('UPDATE construction_input SET expected=NULL')
            let state: string | undefined
            try {
              await pg.exec(
                `UPDATE construction_input SET expected=${wrong ? `NOT (${body})` : body}`,
              )
            } catch (error) {
              state = (error as { code: string }).code
            }
            const expectedValue = (
              await pg.query<{ expected: boolean | null }>(
                'SELECT expected FROM construction_input',
              )
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
                expected: known(expectedValue),
                bypass: known(bypass),
              }
            for (const origin of ['source', 'stored'])
              fixtures.push({ name: name + '_' + origin, row, expected: outcome })
            references.push({
              source,
              other,
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
      'tsquerymatch',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
