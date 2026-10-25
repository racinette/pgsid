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

const packet = 'artifacts/goal-checks/tsquery-rewrite-active'
const context = { serverEncoding: 'UTF8', clientEncoding: 'UTF8', defaultCollation: 'C' } as const
const operations: Record<string, string> = {
  rewrite: 'ts_rewrite(source::tsquery,other::tsquery,replacement::tsquery)',
  composed: "ts_rewrite(source::tsquery && 'z'::tsquery,other::tsquery,replacement::tsquery)",
  nested:
    "ts_rewrite(ts_rewrite(source::tsquery,other::tsquery,replacement::tsquery),replacement::tsquery,'final'::tsquery)",
  coalesced:
    "ts_rewrite(COALESCE(source::tsquery,'fallback'::tsquery),other::tsquery,replacement::tsquery)",
}
const check = (body: string) =>
  `CASE WHEN bypass THEN true ELSE tsquerysend(${body}) IS NOT DISTINCT FROM tsquerysend(expected) AND (${body}) IS NOT DISTINCT FROM expected END`
const known = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

it('rewrites query subtrees with exact normalization, wire, native sizes and source/stored INSERT parity', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsquery-rewrite-'))
  try {
    const columns = 'source text,other text,replacement text,expected tsquery,bypass bool'
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
    const cases: [string | null, string | null, string | null][] = [
      ['', 'a', 'b'],
      ['a', '', 'b'],
      ['a', 'a', ''],
      [null, 'a', 'b'],
      ['a', null, 'b'],
      ['a', 'a', null],
      ['a', 'a', 'a & b'],
      ['a | a', 'a', 'a | b'],
      ['a & b', 'z', 'x'],
      ['a & b', 'b', 'x | y'],
      ['a & (b & c)', 'c & a', 'x'],
      ['a & b & c & d', 'b & d', 'x | y'],
      ['a & b', 'a & b & c', 'x'],
      ['a & b', 'a & a', 'x'],
      ['a:A & a:*B & a:C', 'a:*D', 'x:A'],
      ['(a & b) | (b & a)', 'b & a', 'x'],
      ['a <2> b', 'b <2> a', 'x'],
      ['a <2> b', 'a <3> b', 'x'],
      ['a <2> b', 'a <2> b', 'x'],
      ['a <2> (b <3> c)', 'b', ''],
      ['(a <2> b) <3> c', 'b', ''],
      ['!a', 'a', ''],
      ['!!a', 'a', ''],
      ['a & !b', 'b', ''],
      ['a | !b', 'a', ''],
      ['a & b & c', 'a & c', 'b & a'],
      ['a & b & c', 'a & c', ''],
      ['é:*AB & 😀 | 日本', 'é', 'ê | z'],
      ['fGEtsNKMDB:A | 6P7Sag1hsi:*B', 'none', 'x'],
      ['a &', 'a', 'b'],
      [null, 'a &', 'b'],
      ['a', 'a &', null],
      ['a', null, 'b &'],
      ['a &', null, null],
      ...[6, 7, 8, 40, 41, 64].flatMap((n) => {
        const words = Array.from({ length: n }, (_, i) =>
          i % 3 === 0 ? 'a:' + ['A', 'B', 'C', 'D'][i % 4] : i % 3 === 1 ? 'a:*' : 'b' + (n - i),
        )
        return [
          [words.join(' & '), 'none', 'x'],
          [words.join(' | '), 'a | a', 'x & y'],
        ] as [string, string, string][]
      }),
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    let inserts = 0,
      rejected = 0
    for (const [source, other, replacement] of cases)
      for (const wrong of [false, true])
        for (const bypass of [false, true]) {
          await pg.query('DELETE FROM construction_input')
          await pg.query('INSERT INTO construction_input VALUES($1,$2,$3,NULL,$4)', [
            source,
            other,
            replacement,
            bypass,
          ])
          for (const [name, body] of Object.entries(operations)) {
            await pg.exec('UPDATE construction_input SET expected=NULL')
            let state: string | undefined
            try {
              await pg.exec(
                `UPDATE construction_input SET expected=${wrong ? "'wrong'::tsquery" : body}`,
              )
            } catch (error) {
              state = (error as { code: string }).code
            }
            const expectedValue = await readTsqueryFixture(
              pg,
              'SELECT expected value FROM construction_input',
              'value',
            )
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
                replacement: known(replacement),
                expected: known(expectedValue),
                bypass: known(bypass),
              }
            for (const origin of ['source', 'stored'])
              fixtures.push({ name: name + '_' + origin, row, expected: outcome })
            references.push({
              source,
              other,
              replacement,
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
      'tsqueryrewrite',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
