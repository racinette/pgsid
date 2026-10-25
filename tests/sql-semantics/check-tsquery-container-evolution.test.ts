import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

const quote = (s: string) => "'" + s.replaceAll("'", "''") + "'"
const array = (q: string) =>
  '{"' + q.replaceAll('\\', '\\\\').replaceAll('"', '\\"') + '",NULL,"(a & b) & c"}'
const record = (fields: string[]) =>
  '(' +
  fields.map((s) => '"' + s.replaceAll('\\', '\\\\').replaceAll('"', '""') + '"').join(',') +
  ')'

it('preserves empty, Unicode and escaped query trees in old record constants after fields are dropped and added', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsquery-container-evolution-'))
  try {
    await pg.exec(
      'CREATE TYPE archived_query AS(removed tsquery,head tsquery,options tsquery[],marker text)',
    )
    const queries = ['', 'a & (b & c)', 'é:*AB <2> (😀 | 日本)', "'it''s':*AB | !'a\\\\b'"]
    for (const [i, q] of queries.entries()) {
      const value = quote(record(['discarded', q, array(q), 'tag'])) + '::archived_query'
      await pg.exec(
        `CREATE TABLE evolved_${i}(source text,bypass bool,CHECK(CASE WHEN bypass THEN true ELSE (${value}).head=source::tsquery AND ((${value}).options)[1]=source::tsquery END))`,
      )
    }
    await pg.exec(
      'ALTER TYPE archived_query DROP ATTRIBUTE removed;ALTER TYPE archived_query ADD ATTRIBUTE quantity integer',
    )
    const catalog = await snapshotCatalog(pg),
      checks = queries.map((_, i) => {
        const table = catalog.tables.find((t) => t.name === 'evolved_' + i)!,
          c = table.constraints[0]!
        expect(c.tsqueryConstants?.complete).toBe(true)
        expect(c.tsqueryConstants?.containers).toHaveLength(2)
        for (const entry of c.tsqueryConstants!.containers!) expect(entry.storage).toHaveLength(3)
        return {
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: 'tree_' + i,
          },
          expression: portableCheckAtoms(
            lowerTableCheck(
              table,
              c,
              [],
              catalog.domains,
              'stored',
              catalog.rangeTypes,
              catalog.compositeTypeGraph,
            )!.expression,
          ),
        }
      }),
      group = prepareCheckRustGroup(checks, {
        serverEncoding: 'UTF8',
        defaultCollation: 'C',
        arrayNulls: true,
      })
    group.checks.forEach((c) => expect(c.kind, 'reason' in c ? c.reason : '').toBe('supported'))
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    let inserts = 0,
      rejections = 0
    for (const [i, q] of queries.entries())
      for (const source of [null, q, 'a', '(a & b) & c', 'a &'])
        for (const bypass of [false, true]) {
          let state: string | undefined
          try {
            await pg.query(`INSERT INTO evolved_${i} VALUES($1,$2)`, [source, bypass])
          } catch (e) {
            state = (e as { code: string }).code
          }
          inserts++
          if (state) rejections++
          const expected: Outcome =
            state === '23514'
              ? { kind: 'False' }
              : state
                ? { kind: 'Error', value: { state: parseInt(state, 36) } }
                : { kind: source === null && !bypass ? 'Null' : 'True' }
          const row: Row = {
            source: source === null ? { kind: 'Null' } : { kind: 'Value', value: source },
            bypass: { kind: 'Value', value: bypass },
          }
          fixtures.push({ name: 'tree_' + i, row, expected })
        }
    await runCheckParity(
      root,
      'queryevolution',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
    const p = 'artifacts/goal-checks/tsquery-container-storage-active'
    await mkdir(p, { recursive: true })
    await writeFile(
      p + '/evolution-reference.json',
      JSON.stringify(
        { nativeInserts: inserts, nativeRejections: rejections, fixtures: fixtures.length },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
