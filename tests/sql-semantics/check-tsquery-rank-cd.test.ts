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

const packet = 'artifacts/goal-checks/tsquery-rank-cd-active'
const context = {
  serverEncoding: 'UTF8',
  clientEncoding: 'UTF8',
  defaultCollation: 'C',
  arrayNulls: true,
} as const
const operations: Record<string, string> = {
  default_rank: 'ts_rank_cd(source::tsvector,other::tsquery)',
  normalized: 'ts_rank_cd(source::tsvector,other::tsquery,method)',
  weighted: 'ts_rank_cd(weights::real[],source::tsvector,other::tsquery)',
  full: 'ts_rank_cd(weights::real[],source::tsvector,other::tsquery,method)',
}
const check = (body: string) =>
  `CASE WHEN bypass THEN true ELSE encode(float4send(${body}),'hex') IS NOT DISTINCT FROM expected END`
const known = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

it('ranks minimal matching covers with exact float4 wire, weights, normalization and source/stored INSERT parity', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsquery-rank-cd-'))
  try {
    const columns = 'source text,other text,weights text,method int4,expected text,bypass bool'
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
    const cases: [string | null, string | null, string | null, number | null][] = [
      [null, 'a', '{0.1,0.2,0.4,1}', 0],
      ['a', null, '{0.1,0.2,0.4,1}', 0],
      ['a:1', 'a', null, 0],
      ['a:1', 'a', '{0.1,0.2,0.4,1}', null],
      ['', 'a', '{0.1,0.2,0.4,1}', -1],
      ['a:1', '', '{0.1,0.2,0.4,1}', -1],
      ['a', 'a', '{0.1,0.2,0.4,1}', 0],
      ['a', 'a & b', '{0.1,0.2,0.4,1}', 0],
      ['a:1 b:1', 'a & b', '{0.1,0.2,0.4,1}', 0],
      ['a:16382 b', 'a & b', '{0.1,0.2,0.4,1}', 0],
      ['a:1 b:2', '!(a & b)', '{0.1,0.2,0.4,1}', 0],
      ['a:1 aa:2 ab:3 b:4', 'a:* & b', '{0.1,0.2,0.4,1}', 0],
      ['a:1 aa:2 ab:3 b:4', 'a:* | b', '{0.1,0.2,0.4,1}', 0],
      ['a:1A,2B,3C,4D', 'a:D', '{0.1,0.2,0.4,1}', 0],
      ['é:1A 日本:2B 😀:3C', 'é | 日本 | 😀', '{0.1,0.2,0.4,1}', 31],
      ...['a:1,4,10 b:2,5,9 c:3,7 d:8', 'a:1A,2B aa:3C ab:4D b:5A,6B c', 'a b:2 c:3'].flatMap(
        (document) =>
          [
            'a',
            '!a',
            '!!a',
            'a & b',
            'a | b',
            'a <-> b',
            '(a <-> b) & c',
            'a & !b',
            'a <-> !b',
            '!(a <-> b)',
            '(a | b) <-> c',
            'a <2> (b | c)',
            '!a | b',
            '!(a & b)',
            'a:* & !b',
            'a:*A <-> b',
            'a <0> a',
            '!missing <-> b',
            'b <-> !missing',
          ].map(
            (query) => [document, query, '{0.1,0.2,0.4,1}', 0] as [string, string, string, number],
          ),
      ),
      ...Array.from(
        { length: 64 },
        (_, n) =>
          ['a:1D,4C,10B b:2B,5A,9C c:3,7', 'a & b', '{0.1,0.2,0.4,1}', n] as [
            string,
            string,
            string,
            number,
          ],
      ),
      ...[0, 1, 2, 4, 8, 16, 32, 63, 64, 127, -1, -2147483648].map(
        (n) =>
          ['a:1D,3C b:2B,4A c', 'a <-> b', '{0.1,0.2,0.4,1}', n] as [
            string,
            string,
            string,
            number,
          ],
      ),
      ...[
        '{}',
        '{1,1,1}',
        '{{1,1},{1,1}}',
        '{NULL,1,1,1}',
        '{2,1,1,1,NULL}',
        '{2,1,1,1}',
        '{Infinity,1,1,1}',
        '{-Infinity,-1,-2,-3}',
        '{NaN,NaN,NaN,NaN}',
        '{0,0,0,0}',
        '{-0,0,-0,0}',
        '{0.05,0.3,0.6,0.9}',
        '[0:3]={0.1,0.2,0.4,1}',
        '[5:9]={0.1,0.2,0.4,1,2}',
        '{0.1,0.2,0.4,1,NULL}',
      ].map((w) => ['a:1A,2B b:3C,4D', 'a | b', w, 63] as [string, string, string, number]),
      ...[6, 7, 8, 40, 41].map(
        (n) =>
          [
            'a:1 aa:2 ab:3 b:4',
            Array.from({ length: n }, (_, i) => (i % 2 === 0 ? 'a:*B' : 'a:A')).join(' | '),
            '{0.1,0.2,0.4,1}',
            0,
          ] as [string, string, string, number],
      ),
      ['a:', 'a', '{0.1,0.2,0.4,1}', 0],
      ['a', 'a &', '{0.1,0.2,0.4,1}', 0],
      [null, 'a &', '{}', null],
      ['a', 'a', 'bad', null],
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    let inserts = 0,
      rejected = 0
    for (const [source, other, weights, method] of cases)
      for (const wrong of [false, true])
        for (const bypass of [false, true]) {
          await pg.query('DELETE FROM construction_input')
          await pg.query('INSERT INTO construction_input VALUES($1,$2,$3,$4,NULL,$5)', [
            source,
            other,
            weights,
            method,
            bypass,
          ])
          for (const [name, body] of Object.entries(operations)) {
            await pg.exec('UPDATE construction_input SET expected=NULL')
            let state: string | undefined
            try {
              await pg.exec(
                `UPDATE construction_input SET expected=${wrong ? "'wrong'::text" : `encode(float4send(${body}),'hex')`}`,
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
                weights: known(weights),
                method: known(method),
                expected: known(expectedValue),
                bypass: known(bypass),
              }
            for (const origin of ['source', 'stored'])
              fixtures.push({ name: name + '_' + origin, row, expected: outcome })
            references.push({
              source,
              other,
              weights,
              method,
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
      'tsqueryrankcd',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
