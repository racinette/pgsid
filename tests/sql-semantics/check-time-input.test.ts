import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
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
import {
  clockInputForms,
  timetzInputForms,
  deferredClockContextForms,
  unimplementedClockGrammarForms,
} from './check-time-input-forms.js'

const value = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (code: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})

describe('clock text input', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-clock-input-'))
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('preserves microseconds, numeric offsets, SQL errors and lazy branches in every target', async () => {
    const expressions: Record<string, string> = {}
    for (const family of ['time', 'timetz']) {
      expressions[family] = `${family}_send(source::${family}) = expected`
      expressions[family + '_varchar'] = `${family}_send(source::varchar::${family}) = expected`
      expressions[family + '_lazy'] =
        `CASE WHEN skip THEN true ELSE ${family}_send(source::${family}) = expected END`
    }
    await pg.exec(
      `CREATE TABLE clock_input_checks (source text, expected bytea, skip bool, ${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK (${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((table) => table.name === 'clock_input_checks')!
    const constraints = Object.entries(expressions).flatMap(([name, sql]) => {
      const stored = table.constraints.find((constraint) => constraint.name === name)!
      return [
        { ...stored, name: name + '_raw', definition: `CHECK (${sql})` },
        { ...stored, name: name + '_stored' },
      ]
    })
    const group = prepareCheckRustGroup(
      constraints.map((constraint) => ({
        expression: lowerTableCheck(table, constraint)!.expression,
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: constraint.name,
        },
      })),
    )
    for (const [index, check] of group.checks.entries())
      expect(check.kind, constraints[index]!.name).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + suffix, row, expected })
    }
    for (const family of ['time', 'timetz'] as const) {
      for (const text of family === 'time' ? clockInputForms : timetzInputForms) {
        let expected: Outcome
        let hex: string | null = null
        try {
          hex = (
            await pg.query<{ hex: string | null }>(
              `SELECT encode(${family}_send($1::${family}),'hex') hex`,
              [text],
            )
          ).rows[0]!.hex
          expected = { kind: text === null ? 'Null' : 'True' }
        } catch (caught) {
          const code = (caught as { code: string }).code
          expect(['22007', '22008', '22009']).toContain(code)
          expected = error(code)
        }
        const row = { source: value(text), expected: value(hex), skip: value(false) }
        for (const suffix of ['', '_varchar', '_lazy']) add(family + suffix, row, expected)
        add(family + '_lazy', { ...row, skip: value(true) }, { kind: 'True' })
      }
      for (const text of [
        ...deferredClockContextForms[family],
        ...unimplementedClockGrammarForms[family],
      ]) {
        add(family, { source: value(text), expected: value('') }, { kind: 'Unknown' })
        add(
          family + '_lazy',
          { source: value(text), expected: value(''), skip: value(true) },
          { kind: 'True' },
        )
      }
      for (const input of [{ kind: 'Unknown' }, { kind: 'Null' }, error('22012')] as Input[]) {
        add(family, { source: input, expected: value('') }, input as Outcome)
        add(
          family + '_lazy',
          { source: input, expected: value(''), skip: value(true) },
          { kind: 'True' },
        )
      }
    }
    await runCheckParity(
      directory,
      'clockinput',
      group,
      constraints.map((constraint) => constraint.name),
      fixtures,
    )
  }, 120_000)
})
