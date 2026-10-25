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

it('requires CRC encoding only for reached rewrite sorting and preserves strict errors before empty identities', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsquery-rewrite-context-')),
    packet = 'artifacts/goal-checks/tsquery-rewrite-active'
  const definitions: Record<string, string> = {
    rendered: 'ts_rewrite(item,target,replacement)::text=expected',
    nodes: 'numnode(ts_rewrite(item,target,replacement))=expected_count',
  }
  const guard = (sql: string) => `CASE WHEN bypass THEN true ELSE ${sql} END`
  const known = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  try {
    const columns =
      'item tsquery,target tsquery,replacement tsquery,expected text,expected_count int4,bypass bool'
    for (const [name, sql] of Object.entries(definitions))
      await pg.exec(`CREATE TABLE context_${name}(${columns},CONSTRAINT rule CHECK(${guard(sql)}))`)
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
              origin === 'source' ? { ...c, definition: `CHECK(${guard(sql)})` } : c,
              [],
              catalog.domains,
              origin,
            )!.expression,
          ),
        }))
      }),
      group = prepareCheckRustGroup(checks, { defaultCollation: 'C' })
    group.checks.forEach((c) => expect(c.kind, 'reason' in c ? c.reason : '').toBe('supported'))
    const cases: { a: string | null; b: string | null; c: string | null; unknown?: boolean }[] = [
      { a: 'é', b: 'ê', c: 'x' },
      { a: 'é', b: 'é', c: 'ê' },
      { a: 'é & é', b: 'missing', c: 'x' },
      { a: 'é & ê', b: 'é', c: 'x', unknown: true },
      { a: 'é <2> ê', b: 'é', c: 'x' },
      { a: 'é', b: 'x', c: 'ê & é' },
      { a: 'a', b: 'a', c: 'é & ê' },
      { a: 'a & b & c', b: 'a & c', c: 'é & ê', unknown: true },
      { a: 'é & ê', b: '', c: 'x' },
      { a: '', b: 'é & ê', c: 'x' },
      { a: 'fGEtsNKMDB | 6P7Sag1hsi', b: 'none', c: 'x' },
      { a: null, b: 'a', c: 'b' },
      { a: 'a', b: null, c: 'b' },
      { a: 'a', b: 'a', c: null },
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    let inserts = 0
    for (const c of cases) {
      const capture = async (text: string | null) =>
        text === null
          ? known(null)
          : known((await readTsqueryFixture(pg, 'SELECT $1::tsquery item', 'item', [text]))!)
      const native = (
        await pg.query<{ rendered: string | null; nodes: number | null }>(
          'SELECT ts_rewrite($1::tsquery,$2::tsquery,$3::tsquery)::text rendered,numnode(ts_rewrite($1::tsquery,$2::tsquery,$3::tsquery)) nodes',
          [c.a, c.b, c.c],
        )
      ).rows[0]!
      for (const wrong of [false, true])
        for (const bypass of [false, true]) {
          const rendered = wrong ? 'wrong' : native.rendered,
            count = wrong ? -1 : native.nodes,
            query =
              'SELECT $1::tsquery item,$2::tsquery target,$3::tsquery replacement,$4::text expected,$5::int4 expected_count,$6::bool bypass',
            parameters = [c.a, c.b, c.c, rendered, count, bypass],
            row: Row = {
              item: await capture(c.a),
              target: await capture(c.b),
              replacement: await capture(c.c),
              expected: known(rendered),
              expected_count: known(count),
              bypass: known(bypass),
            }
          for (const [name, sql] of Object.entries(definitions)) {
            const value = (
              await pg.query<{ value: boolean | null }>(
                `SELECT ${guard(sql)} value FROM (${query}) input`,
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
              !bypass && c.unknown
                ? { kind: 'Unknown' }
                : { kind: value === null ? 'Null' : value ? 'True' : 'False' }
            for (const origin of ['source', 'stored'])
              fixtures.push({ name: name + '_' + origin, row, expected })
            references.push({ c, wrong, bypass, name, value, expected })
          }
        }
    }
    const error: Input = { kind: 'Error', value: { state: parseInt('22023', 36) } },
      unknown: Input = { kind: 'Unknown' },
      nil: Input = { kind: 'Null' },
      empty: Input = known((await readTsqueryFixture(pg, "SELECT ''::tsquery item", 'item'))!)
    const states: Input[][] = [
      [error, unknown, nil],
      [unknown, error, nil],
      [nil, unknown, error],
      [empty, unknown, nil],
      [empty, nil, unknown],
      [nil, nil, nil],
    ]
    for (const args of states)
      for (const bypass of [false, true]) {
        const expected: Outcome = bypass
          ? { kind: 'True' }
          : args.some((a) => a.kind === 'Error')
            ? (error as Outcome)
            : args.some((a) => a.kind === 'Unknown')
              ? { kind: 'Unknown' }
              : { kind: 'Null' }
        for (const name of Object.keys(definitions))
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: name + '_' + origin,
              row: {
                item: args[0]!,
                target: args[1]!,
                replacement: args[2]!,
                expected: known(''),
                expected_count: known(0),
                bypass: known(bypass),
              },
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
      'tsqueryrewritecontext',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
