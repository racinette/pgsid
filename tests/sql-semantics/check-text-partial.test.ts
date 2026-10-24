import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

it('defers byte-dependent consumers of partial text without inventing payloads in all targets', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-text-partial-')),
    packet = 'artifacts/goal-checks/text-partial-active'
  const known = (value: string | number | boolean | null): Input =>
    value === null ? { kind: 'Null' } : { kind: 'Value', value }
  try {
    const cell = '(xpath(p,v))[i]::text',
      object = `'{"0.3333333333333333":true}'::jsonb`,
      json = `'{"0.3333333333333333":true}'::json`,
      expected = "'0.3333333333333333'"
    const expressions = {
      equality: `${cell}=${expected}`,
      jsonb_key: `${object} ? (${cell})`,
      jsonb_field: `(${object}->(${cell})) IS NULL`,
      json_field: `(${json}->(${cell})) IS NULL`,
      jsonb_path: `(${object}#>ARRAY[${cell}]) IS NULL`,
      json_path: `(${json}#>ARRAY[${cell}]) IS NULL`,
      jsonb_delete: `(${object}-(${cell}))='{}'::jsonb`,
      jsonb_delete_keys: `(${object}-ARRAY[${cell}])='{}'::jsonb`,
      processing_instruction: `XMLPI(NAME target,${cell})::text='<?target 0.3333333333333333?>'`,
      record_output: `ROW(${cell})::text='(0.3333333333333333)'`,
      array_output: `ARRAY[${cell}]::text='{0.3333333333333333}'`,
      quote: `quote_literal(${cell})='''0.3333333333333333'''`,
      join: `array_to_string(ARRAY[${cell}],',')=${expected}`,
      digest: `md5(${cell})=md5(${expected})`,
      width: `(${cell})::varchar(16)='0.33333333333333'`,
    }
    const entries = Object.entries(expressions)
    for (const [name, expression] of entries)
      await pg.exec(
        `CREATE TABLE text_partial_${name}(v xml,p text,i int,fallback text,gate bool,CONSTRAINT rule CHECK(${expression}))`,
      )
    const catalog = await snapshotCatalog(pg)
    const group = prepareCheckRustGroup(
      entries.flatMap(([name, expression]) => {
        const table = catalog.tables.find((t) => t.name === 'text_partial_' + name)!
        return ['source', 'stored'].map((origin) => ({
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: name + '_' + origin,
          },
          expression: lowerTableCheck(
            table,
            table.constraints.find((c) => c.name === 'rule')!,
            [],
            [],
            origin as 'source' | 'stored',
            [],
            catalog.compositeTypeGraph,
            origin === 'source' ? `CHECK(${expression})` : undefined,
          )!.expression,
        }))
      }),
      {
        defaultCollation: 'C',
        defaultCtype: 'C',
        clientEncoding: 'UTF8',
        serverEncoding: 'UTF8',
        xmlOption: 'content',
        xpathRecursionLimit: 5000,
      },
    )
    expect(group.checks.flatMap((c) => (c.kind === 'unsupported' ? [c.reason] : []))).toEqual([])
    const names = entries.flatMap(([name]) =>
      ['source', 'stored'].map((origin) => name + '_' + origin),
    )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    let inserts = 0
    for (const [name, expression] of entries)
      for (const v of ['<r/>', 'plain', null])
        for (const p of ['1 div 3', '//missing', '[', null])
          for (const i of [1, 2, 0, null]) {
            const gate = true,
              fallback = '<broken'
            const outcomes: Outcome[] = []
            for (const digits of [-15, -3, 0, 1, 3]) {
              await pg.exec(`SET extra_float_digits=${digits}`)
              let rejected: { code: string; constraint?: string } | undefined
              try {
                await pg.query(`INSERT INTO text_partial_${name} VALUES($1,$2,$3,$4,$5)`, [
                  v,
                  p,
                  i,
                  fallback,
                  gate,
                ])
              } catch (e) {
                rejected = e as { code: string; constraint?: string }
              }
              let outcome: Outcome
              if (rejected)
                outcome =
                  rejected.code === '23514' && rejected.constraint === 'rule'
                    ? { kind: 'False' }
                    : { kind: 'Error', value: { state: parseInt(rejected.code, 36) } }
              else {
                const r = await pg.query<{ value: boolean | null }>(
                  `WITH candidate AS MATERIALIZED(SELECT $1::xml v,$2::text p,$3::int i,$4::text fallback,$5::bool gate)SELECT (${expression})value FROM candidate`,
                  [v, p, i, fallback, gate],
                )
                expect(r.rows[0]!.value).not.toBe(false)
                outcome = { kind: r.rows[0]!.value === null ? 'Null' : 'True' }
              }
              outcomes.push(outcome)
              inserts++
            }
            const same = outcomes.every(
                (outcome) => JSON.stringify(outcome) === JSON.stringify(outcomes[0]),
              ),
              expectedOutcome: Outcome = same ? outcomes[0]! : { kind: 'Unknown' }
            const row: Row = {
              v: known(v),
              p: known(p),
              i: known(i),
              fallback: known(fallback),
              gate: known(gate),
            }
            for (const origin of ['source', 'stored'])
              fixtures.push({ name: name + '_' + origin, row, expected: expectedOutcome })
            reference.push({ name, v, p, i, outcome: expectedOutcome, native: outcomes })
          }
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/reference.json',
      JSON.stringify({ fixtures: fixtures.length, inserts, reference }, null, 2) + '\n',
    )
    expect(fixtures).toHaveLength(entries.length * 96)
    expect(inserts).toBe(entries.length * 240)
    expect(reference.some((x) => JSON.stringify(x).includes('Unknown'))).toBe(true)
    await writeFile(packet + '/evaluator.rs', group.evaluatorSource!)
    await writeFile(packet + '/checks.json', JSON.stringify(group.checks, null, 2) + '\n')
    await runCheckParity(root, 'textpartial', group, names, fixtures)
    console.info('Partial text byte consumer parity', {
      fixtures: fixtures.length,
      inserts,
    })
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
