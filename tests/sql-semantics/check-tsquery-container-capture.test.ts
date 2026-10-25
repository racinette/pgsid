import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'

it('captures erased query grouping in stored whole containers without reparsing canonical output', async () => {
  const pg = await PGlite.create()
  try {
    const definition = 'CHECK((($q${a & (b & c)}$q$::tsquery[])[1])=source::tsquery)'
    await pg.exec(`CREATE TABLE captured_query_array(source text,${definition})`)
    expect(
      (
        await pg.query<{ same: boolean; regrouped: boolean }>(
          `SELECT ('a & (b & c)'::tsquery)::text=('(a & b) & c'::tsquery)::text same,'a & (b & c)'::tsquery='(a & b) & c'::tsquery regrouped`,
        )
      ).rows[0],
    ).toEqual({ same: true, regrouped: false })
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'captured_query_array')!,
      constraint = table.constraints[0]!
    const prepare = (origin: 'source' | 'stored') =>
      prepareCheckRustGroup(
        [
          {
            identity: { schema: 'public', kind: 'table', owner: table.name, constraint: origin },
            expression: portableCheckAtoms(
              lowerTableCheck(
                table,
                origin === 'source' ? { ...constraint, definition } : constraint,
                [],
                catalog.domains,
                origin,
                catalog.rangeTypes,
                catalog.compositeTypeGraph,
              )!.expression,
            ),
          },
        ],
        { serverEncoding: 'UTF8', defaultCollation: 'C', arrayNulls: true },
      ).checks[0]!
    expect(prepare('source').kind).toBe('supported')
    expect(constraint.tsqueryConstants?.complete).toBe(true)
    expect(constraint.tsqueryConstants?.containers).toHaveLength(1)
    expect(constraint.tsqueryConstants?.containers?.[0]?.storage).toHaveLength(1)
    expect(prepare('stored').kind).toBe('supported')
  } finally {
    await pg.close()
  }
})
