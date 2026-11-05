import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

// Each expression combines text whose implicit collations disagree, so the comparison or call
// that needs a collation has none.
const expressions: Record<string, string> = {
  equal: 'label = recorded',
  ordered: 'label < recorded',
  lowered: 'lower(label || recorded) = recorded',
  position: 'strpos(label, recorded) > 0',
  joined: "label || recorded = 'ab'",
  matched: 'regexp_substr(label, pattern) = recorded',
  chosen: "(CASE WHEN label = 'a' THEN label ELSE recorded END) = 'a'",
}
const values = ['a', 'b', 'é😊 a', '']

it('raises 42P22 where conflicting implicit collations reach a call that needs one, after NULL and unknown arguments', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-collation-conflict-'))
  try {
    await pg.exec(`CREATE COLLATION public.und_order (provider=icu, locale='und', deterministic=true);
      CREATE TABLE conflicts (label text COLLATE public.und_order, recorded text COLLATE "C",
        pattern text COLLATE public.und_order,
        ${Object.entries(expressions)
          .map(([name, sql]) => `CONSTRAINT ${name} CHECK (${sql})`)
          .join(',')});
      CREATE TABLE samples (id int, label text COLLATE public.und_order, recorded text COLLATE "C",
        pattern text COLLATE public.und_order)`)
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((x) => x.name === 'conflicts')!
    const checks: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
    const names: string[] = []
    for (const [name, sql] of Object.entries(expressions))
      for (const form of ['raw', 'stored']) {
        const plan = lowerTableCheck(
          table,
          form === 'raw'
            ? { name, type: 'check', definition: `CHECK (${sql})` }
            : table.constraints.find((check) => check.name === name)!,
        )!
        expect(plan.expression.kind, `${name}_${form}`).not.toBe('uncertain')
        names.push(`${name}_${form}`)
        checks.push({
          expression: plan.expression,
          identity: {
            schema: 'public',
            kind: 'table',
            owner: table.name,
            constraint: `${name}_${form}`,
          },
        })
      }
    const group = prepareCheckRustGroup(checks)
    for (const check of group.checks)
      expect(check.kind, check.kind === 'unsupported' ? check.reason : '').toBe('supported')
    const input = (value: string | null): Input =>
      value === null ? { kind: 'Null' } : { kind: 'Value', value }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    let id = 0
    for (const label of [...values, null])
      for (const recorded of [...values, null]) {
        id += 1
        await pg.query('INSERT INTO samples VALUES ($1, $2, $3, $4)', [id, label, recorded, 'a'])
        for (const [name, sql] of Object.entries(expressions)) {
          let expected: Outcome
          try {
            const value = (
              await pg.query<{ v: boolean | null }>(
                `SELECT (${sql}) v FROM samples WHERE id = $1`,
                [id],
              )
            ).rows[0]!.v
            expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
          } catch (error) {
            expected = {
              kind: 'Error',
              value: { state: parseInt((error as { code: string }).code, 36) },
            }
          }
          // The regular expression runs under the column's non-C collation, whose provider decides
          // the match and could decide an error, so only a NULL subject decides that row.
          if (name === 'matched' && label !== null) expected = { kind: 'Unknown' }
          for (const form of ['raw', 'stored'])
            fixtures.push({
              name: `${name}_${form}`,
              row: { label: input(label), recorded: input(recorded), pattern: input('a') },
              expected,
            })
        }
      }
    const unknown: Input = { kind: 'Unknown' }
    const failed: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
    for (const form of ['raw', 'stored']) {
      // A NULL argument answers NULL whatever the other one is; an unknown one could be NULL.
      fixtures.push(
        {
          name: `equal_${form}`,
          row: { label: unknown, recorded: input(null), pattern: input('a') },
          expected: { kind: 'Null' },
        },
        {
          name: `equal_${form}`,
          row: { label: unknown, recorded: input('a'), pattern: input('a') },
          expected: { kind: 'Unknown' },
        },
        {
          name: `equal_${form}`,
          row: { label: failed, recorded: input(null), pattern: input('a') },
          expected: failed as Outcome,
        },
        {
          name: `ordered_${form}`,
          row: { label: input('a'), recorded: failed, pattern: input('a') },
          expected: failed as Outcome,
        },
      )
    }
    await runCheckParity(directory, 'collation_conflict', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 600_000)
