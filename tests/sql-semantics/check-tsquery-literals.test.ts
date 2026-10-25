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

const packet = 'artifacts/goal-checks/tsquery-literals-active'
const known = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const context = { serverEncoding: 'UTF8', clientEncoding: 'UTF8', defaultCollation: 'C' } as const
const definitions: Record<string, string> = {
  original: "tsquerysend(source::tsquery)=tsquerysend('a & (b & c)'::tsquery)",
  left_grouped: "tsquerysend(source::tsquery)=tsquerysend('(a & b) & c'::tsquery)",
  selected:
    "tsquerysend(CASE WHEN choose_first THEN 'a & (b & c)'::tsquery ELSE '(a & b) & c'::tsquery END)=tsquerysend(source::tsquery)",
  coalesced:
    "tsquerysend(COALESCE(NULL::tsquery,source::tsquery,'a & (b & c)'::tsquery))=tsquerysend('a & (b & c)'::tsquery)",
  unicode: "tsquerysend(source::tsquery)=tsquerysend('é:*AB <2> (😀 <-> z:D)'::tsquery)",
  quoted: "tsquerysend(source::tsquery)=tsquerysend($query$'it''s':*AB | !'a\\b'$query$::tsquery)",
  checked: 'source::allowed_query IS NOT NULL',
  required: 'source::required_query IS NOT NULL',
  domain_literal: "tsquerysend(source::tsquery)=tsquerysend('a & (b & c)'::allowed_query)",
  constant_domain: "numnode('a & (b & c)'::allowed_query)=5",
  rendered: "('a & (b & c)'::tsquery)::text=source",
  empty: "numnode(''::tsquery)=0",
  null_literal: 'NULL::tsquery IS NULL',
}
const columns = 'source text,choose_first bool,bypass bool'
const schema = `CREATE DOMAIN imported_query AS tsquery;CREATE DOMAIN nested_query AS imported_query;
CREATE DOMAIN allowed_query AS nested_query CHECK(tsquerysend(VALUE)<>tsquerysend('bad'::tsquery));
CREATE DOMAIN required_query AS nested_query NOT NULL;
${Object.entries(definitions)
  .map(
    ([name, sql]) =>
      `CREATE TABLE query_literal_${name}(${columns},CONSTRAINT rule CHECK(CASE WHEN bypass THEN true ELSE ${sql} END));`,
  )
  .join('\n')}`

it('preserves exact tsquery constants, checked domains and preparation across source/stored native INSERTs and every target', async () => {
  const pg = await PGlite.create(),
    other = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsquery-literals-'))
  try {
    await pg.exec(schema)
    await pg.exec(`CREATE TEMP TABLE query_input(${columns})`)
    const catalog = await snapshotCatalog(pg)
    const prepare = (snapshot: typeof catalog) =>
        prepareCheckRustGroup(
          Object.entries(definitions).flatMap(([name, sql]) => {
            const table = snapshot.tables.find((t) => t.name === 'query_literal_' + name)!,
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
                  snapshot.domains,
                  origin,
                )!.expression,
              ),
            }))
          }),
          context,
        ),
      group = prepare(catalog)
    group.checks.forEach((check) =>
      expect(check.kind, 'reason' in check ? check.reason : '').toBe('supported'),
    )
    const original = catalog.tables.find((t) => t.name === 'query_literal_original')!
        .constraints[0]!.tsqueryConstants!,
      left = catalog.tables.find((t) => t.name === 'query_literal_left_grouped')!.constraints[0]!
        .tsqueryConstants!
    expect(original.complete).toBe(true)
    expect(original.constants).not.toEqual(left.constants)
    expect(
      catalog.domains.find((d) => d.name === 'allowed_query')!.checks[0]!.tsqueryConstants
        ?.complete,
    ).toBe(true)
    await other.exec("CREATE TYPE padding_one AS ENUM('x');CREATE TYPE padding_two AS(a int4)")
    await other.exec(schema)
    const shifted = await snapshotCatalog(other)
    expect(shifted.domains.find((d) => d.name === 'imported_query')!.oid).not.toBe(
      catalog.domains.find((d) => d.name === 'imported_query')!.oid,
    )
    expect(prepare(shifted).evaluatorSource).toBe(group.evaluatorSource)
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    const samples = [
      null,
      '',
      'a & (b & c)',
      '(a & b) & c',
      "'a' & 'b' & 'c'",
      'bad',
      'é:*AB <2> (😀 <-> z:D)',
      "'it''s':*AB | !'a\\b'",
      "'a' &",
      'a'.repeat(2047),
    ]
    let inserts = 0,
      rejected = 0
    for (const source of samples)
      for (const choose of [false, true])
        for (const bypass of [false, true]) {
          await pg.query('DELETE FROM query_input')
          await pg.query('INSERT INTO query_input VALUES($1,$2,$3)', [source, choose, bypass])
          for (const [name, sql] of Object.entries(definitions)) {
            let value: boolean | null = null,
              state: string | undefined
            try {
              value = (
                await pg.query<{ value: boolean | null }>(
                  `SELECT CASE WHEN bypass THEN true ELSE ${sql} END value FROM query_input`,
                )
              ).rows[0]!.value
            } catch (error) {
              state = (error as { code: string }).code
            }
            let failure: string | undefined
            try {
              await pg.exec(`INSERT INTO query_literal_${name} SELECT * FROM query_input`)
            } catch (error) {
              failure = (error as { code: string }).code
            }
            expect(failure).toBe(state ?? (value === false ? '23514' : undefined))
            inserts++
            if (failure) rejected++
            const expected: Outcome = state
                ? { kind: 'Error', value: { state: parseInt(state, 36) } }
                : { kind: value === null ? 'Null' : value ? 'True' : 'False' },
              row: Row = {
                source: known(source),
                choose_first: known(choose),
                bypass: known(bypass),
              }
            for (const origin of ['source', 'stored'])
              fixtures.push({ name: name + '_' + origin, row, expected })
            references.push({
              source: source && source.length > 100 ? { length: source.length } : source,
              choose,
              bypass,
              name,
              value,
              state,
            })
          }
        }
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'native.json'),
      JSON.stringify(
        {
          inserts,
          rejected,
          fixtures: fixtures.length,
          original,
          left,
          independentCatalogSourcesEqual: true,
          references,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      root,
      'tsqueryliterals',
      group,
      Object.keys(definitions).flatMap((name) =>
        ['source', 'stored'].map((origin) => name + '_' + origin),
      ),
      fixtures,
    )
  } finally {
    await pg.close()
    await other.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
