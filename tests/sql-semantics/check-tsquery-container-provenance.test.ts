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

// The stored expression carries each query constant's datum, which decodes to the exact tree;
// a capture that is missing, unverified or inconsistent must not change the evaluator.
it('evaluates stored query containers from their datum whatever their capture says', async () => {
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
    const prepare = (c: Check) => prepareCheckRustGroup([lower('guard', c)], context)
    const recovered = prepare({ ...constraint, tsqueryConstants: undefined })
    expect(recovered.checks[0]!.kind).toBe('supported')
    const invalid = structuredClone(constraint)
    invalid.tsqueryConstants!.containers![0]!.storage![0]!.root = 999
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
      invalid,
    ])
      expect(prepare(c).evaluatorSource).toBe(recovered.evaluatorSource)
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
      for (const name of ['original', 'altered', 'missing', 'extra'])
        fixtures.push({ name, row, expected: actual })
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
      JSON.stringify({ fixtures: fixtures.length, inconsistentCaptures: 8, unknown: 0 }, null, 2) +
        '\n',
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
