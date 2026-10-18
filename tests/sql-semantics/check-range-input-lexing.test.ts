import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Outcome, type Row } from '../../tools/check-rust/parity.js'

it('decodes adjacent quotes and escaped Unicode or delimiters without losing scalar errors or SQL NULL', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-range-lexing-'))
  try {
    await pg.exec('CREATE TABLE range_lexing(payload text,CHECK(lower(payload::int4range)=12))')
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'range_lexing')!
    const plans = ['source', 'stored'].map((origin) => ({
      identity: { schema: 'public', kind: 'table' as const, owner: table.name, constraint: origin },
      expression: lowerTableCheck(
        table,
        origin === 'source'
          ? { name: 'check', type: 'check', definition: 'CHECK(lower(payload::int4range)=12)' }
          : table.constraints[0]!,
        catalog.enums,
        catalog.domains,
        origin as 'source' | 'stored',
      )!.expression,
    }))
    const inputs = [
      null,
      'empty',
      '(,)',
      '[12,13)',
      '["1"2,13)',
      '["\\1\\2",13)',
      '["1""2",13)',
      '["1""",13)',
      '["1\\"2",13)',
      '["1,2",13)',
      '["1]2",13)',
      '["\\é",13)',
      '["\\😀",13)',
      '[12,13)\u00a0',
      '[12,13)\v\f',
      '[2147483648,"unterminated',
      '[2147483648,"")',
      '["",2147483648)',
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const payload of inputs) {
      let expected: Outcome
      try {
        const result = (
          await pg.query<{ result: boolean | null }>(
            'INSERT INTO range_lexing VALUES($1) RETURNING lower(payload::int4range)=12 result',
            [payload],
          )
        ).rows[0]!.result
        expected = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
      } catch (error) {
        const code = (error as { code: string }).code
        expect(['23514', '22P02', '22003']).toContain(code)
        expected =
          code === '23514'
            ? { kind: 'False' }
            : { kind: 'Error', value: { state: parseInt(code, 36) } }
      }
      for (const origin of ['source', 'stored'])
        fixtures.push({
          name: 'range_lexing_' + origin,
          row: { payload: payload === null ? { kind: 'Null' } : { kind: 'Value', value: payload } },
          expected,
        })
    }
    const group = prepareCheckRustGroup(plans)
    expect(group.checks.every((c) => c.kind === 'supported')).toBe(true)
    await runCheckParity(
      directory,
      'rangelexing',
      group,
      ['range_lexing_source', 'range_lexing_stored'],
      fixtures,
    )
    expect(inputs).toHaveLength(18)
    expect(fixtures).toHaveLength(36)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 120000)
