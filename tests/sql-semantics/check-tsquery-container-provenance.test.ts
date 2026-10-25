import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Outcome, type Row } from '../../tools/check-rust/parity.js'

it('rejects unverified query-container capture sites and defers inconsistent captured trees or leaf counts', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-tsquery-container-provenance-'))
  const context = { serverEncoding: 'UTF8', defaultCollation: 'C', arrayNulls: true } as const
  try {
    await pg.exec(
      `CREATE TABLE query_provenance(source text,CHECK((('{"a & (b & c)",NULL,"z"}'::tsquery[])[1])=source::tsquery))`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'query_provenance')!,
      constraint = table.constraints[0]!,
      captured = constraint.tsqueryConstants!
    expect(captured.complete).toBe(true)
    expect(captured.containers?.[0]?.storage).toHaveLength(2)
    type Check = typeof constraint
    const lower = (name: string, c: Check) => ({
      identity: { schema: 'public', kind: 'table' as const, owner: table.name, constraint: name },
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
    })
    const prepare = (c: Check) => prepareCheckRustGroup([lower('guard', c)], context).checks[0]!
    for (const c of [
      { ...constraint, tsqueryConstants: undefined },
      { ...constraint, tsqueryConstants: { ...captured, complete: false } },
      { ...constraint, tsqueryConstants: { ...captured, definition: captured.definition + ' ' } },
      {
        ...constraint,
        tsqueryConstants: {
          ...captured,
          containers: [...captured.containers!, ...captured.containers!],
        },
      },
    ])
      expect(prepare(c)).toMatchObject({
        kind: 'unsupported',
        reason: expect.stringContaining('captured query trees'),
      })
    const invalid = structuredClone(constraint)
    invalid.tsqueryConstants!.containers![0]!.storage![0]!.root = 999
    expect(prepare(invalid)).toMatchObject({
      kind: 'unsupported',
      reason: expect.stringContaining('Invalid tsquery container storage metadata'),
    })
    const altered = structuredClone(constraint)
    altered.tsqueryConstants!.containers![0]!.storage![0]!.nodes[0]!.text = 'changed'
    const missing = structuredClone(constraint)
    missing.tsqueryConstants!.containers![0]!.storage!.pop()
    const extra = structuredClone(constraint)
    extra.tsqueryConstants!.containers![0]!.storage!.push(
      structuredClone(captured.containers![0]!.storage![1]!),
    )
    const checks = [
      lower('original', constraint),
      lower('altered', altered),
      lower('missing', missing),
      lower('extra', extra),
    ]
    const group = prepareCheckRustGroup(checks, context)
    group.checks.forEach((c) => expect(c.kind, 'reason' in c ? c.reason : '').toBe('supported'))
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const source of [null, 'a & (b & c)', '(a & b) & c', 'a', 'a &']) {
      let value: boolean | null = null,
        state: string | undefined
      try {
        value = (
          await pg.query<{ v: boolean | null }>(
            `SELECT ('{"a & (b & c)",NULL,"z"}'::tsquery[])[1]=$1::tsquery v`,
            [source],
          )
        ).rows[0]!.v
      } catch (e) {
        state = (e as { code: string }).code
      }
      const row: Row = {
        source: source === null ? { kind: 'Null' } : { kind: 'Value', value: source },
      }
      const actual: Outcome = state
        ? { kind: 'Error', value: { state: parseInt(state, 36) } }
        : { kind: value === null ? 'Null' : value ? 'True' : 'False' }
      fixtures.push({ name: 'original', row, expected: actual })
      for (const name of ['altered', 'missing', 'extra'])
        fixtures.push({ name, row, expected: { kind: 'Unknown' } })
    }
    await runCheckParity(
      root,
      'queryprovenance',
      group,
      checks.map((c) => c.identity.constraint),
      fixtures,
    )
    await mkdir('artifacts/goal-checks/tsquery-container-storage-active', { recursive: true })
    await writeFile(
      'artifacts/goal-checks/tsquery-container-storage-active/provenance-reference.json',
      JSON.stringify(
        { fixtures: fixtures.length, unverifiedCaptures: 5, mismatchedPlans: 3 },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
