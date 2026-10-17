import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { callableIdentity, type FunctionMetadata } from '../../src/postgres/builtins/catalog.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { supportsTextCallableCollation } from '../../src/sql-semantics/collation.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { runCheckParity, type Outcome, type Row } from '../../tools/check-rust/parity.js'

it('requires C for every regex array overload and preserves lazy context deferrals in source/stored expressions', async () => {
  const functions = builtinCallables().filter(
    (f): f is FunctionMetadata =>
      f.kind === 'function' &&
      f.schema === 'pg_catalog' &&
      ['regexp_match', 'regexp_split_to_array'].includes(f.name),
  )
  expect(functions).toHaveLength(4)
  for (const fn of functions) {
    expect(supportsTextCallableCollation(callableIdentity(fn), 'C')).toBe(true)
    for (const c of [undefined, 'deterministic', 'other'])
      expect(supportsTextCallableCollation(callableIdentity(fn), c)).toBe(false)
  }
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-regex-context-'))
  try {
    await pg.exec(
      `CREATE COLLATION regex_icu(provider=icu,locale='und',deterministic=true); CREATE COLLATION regex_insensitive(provider=icu,locale='und',deterministic=false);`,
    )
    const sql: Record<string, string> = {}
    const collations = ['pg_catalog."default"', 'pg_catalog."C"', 'regex_icu', 'regex_insensitive']
    for (const fn of functions)
      sql[fn.rustName] =
        `CASE WHEN bypass THEN true ELSE cardinality(pg_catalog.${fn.name}(subject,pattern${fn.args.length === 3 ? ',flags' : ''})) = expected END`
    for (const [i, c] of collations.entries())
      await pg.exec(
        `CREATE TABLE regex_context_${i}(subject text COLLATE ${c},pattern text COLLATE ${c},flags text COLLATE ${c},expected integer,bypass boolean,${Object.entries(
          sql,
        )
          .map(([n, s]) => `CONSTRAINT "${n}" CHECK(${s})`)
          .join(',')})`,
      )
    const catalog = await snapshotCatalog(pg)
    const plans = collations.flatMap((_, i) => {
      const table = catalog.tables.find((t) => t.name === `regex_context_${i}`)!
      return Object.entries(sql).flatMap(([name, expr]) =>
        (['source', 'stored'] as const).map((origin) => ({
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: `${name}_${i}_${origin}`,
          },
          expression: lowerTableCheck(
            table,
            origin === 'source'
              ? { name, type: 'check', definition: `CHECK(${expr})` }
              : table.constraints.find((c) => c.name === name)!,
            catalog.enums,
            catalog.domains,
            origin,
          )!.expression,
        })),
      )
    })
    for (const plan of plans)
      expect(hasUncertain(plan.expression), plan.identity.constraint).toBe(false)
    let total = 0
    for (const declared of [false, true]) {
      const group = prepareCheckRustGroup(plans, declared ? { defaultCollation: 'C' } : {})
      const fixtures: { name: string; row: Row; expected: Outcome }[] = []
      for (const [i, c] of collations.entries())
        for (const fn of functions) {
          const query = `SELECT cardinality(pg_catalog.${fn.name}('é🙂a'::text COLLATE ${c},'🙂'::text COLLATE ${c}${fn.args.length === 3 ? ",'i'" : ''})) value`
          let value = 1
          if (i === 3) await expect(pg.query(query)).rejects.toMatchObject({ code: '0A000' })
          else value = (await pg.query<{ value: number }>(query)).rows[0]!.value
          for (const origin of ['source', 'stored'])
            for (const wrong of [false, true])
              for (const bypass of [false, true]) {
                const definitive = i === 1 || (i === 0 && declared)
                fixtures.push({
                  name: `${fn.rustName}_${i}_${origin}`,
                  row: {
                    subject: { kind: 'Value', value: 'é🙂a' },
                    pattern: { kind: 'Value', value: '🙂' },
                    flags: { kind: 'Value', value: 'i' },
                    expected: { kind: 'Value', value: value + Number(wrong) },
                    bypass: { kind: 'Value', value: bypass },
                  },
                  expected: {
                    kind: bypass ? 'True' : definitive ? (wrong ? 'False' : 'True') : 'Unknown',
                  },
                })
              }
          for (const origin of ['source', 'stored']) {
            const row: Row = {
              subject: { kind: 'Null' },
              pattern: { kind: 'Unknown' },
              flags: { kind: 'Value', value: 'g' },
              expected: { kind: 'Value', value: 1 },
              bypass: { kind: 'Value', value: false },
            }
            const name = `${fn.rustName}_${i}_${origin}`
            fixtures.push({ name, row, expected: { kind: 'Null' } })
            fixtures.push({
              name,
              row: { ...row, pattern: { kind: 'Error', value: { state: parseInt('22003', 36) } } },
              expected: { kind: 'Error', value: { state: parseInt('22003', 36) } },
            })
            fixtures.push({
              name,
              row: {
                ...row,
                bypass: { kind: 'Value', value: true },
                pattern: { kind: 'Error', value: { state: parseInt('22003', 36) } },
              },
              expected: { kind: 'True' },
            })
          }
        }
      const batchDirectory = join(directory, declared ? 'declared' : 'missing')
      await mkdir(batchDirectory)
      await runCheckParity(
        batchDirectory,
        'arrayregexcontext',
        group,
        plans.map((p) => p.identity.constraint),
        fixtures,
      )
      total += fixtures.length
    }
    await mkdir('artifacts/goal-checks/array-regex', { recursive: true })
    await writeFile(
      'artifacts/goal-checks/array-regex/context-measurements.json',
      JSON.stringify({ fixtures: total, collations: collations.length, contexts: 2 }, null, 2) +
        '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)
