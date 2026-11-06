import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
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

const expressions = {
  value: 'to_number(v, t)::text IS NOT DISTINCT FROM expected',
  lazy: 'CASE WHEN skip THEN true ELSE to_number(v, t) > 0 END',
}
const templates = [
  '999',
  '9999',
  '99.99',
  '9D99',
  '9,999',
  '9G999',
  'FM9,999',
  'S999',
  '999S',
  'S9.99',
  'SG999',
  '999MI',
  '999PL',
  '999PR',
  'RN',
  'rn',
  'L999',
  '999th',
  '99V9',
  '9V99',
  'V9',
  '"x"999',
  '9 9',
  '999.',
  '.999',
  '0000',
  'B999',
  '',
  '9.9.9',
  '9.9EEEE',
  'S9.9EEEE',
  '99V9.9',
]
const texts = [
  '',
  ' ',
  '0',
  '12',
  '-12',
  '+12',
  '1,234',
  '1.5',
  '.5',
  '12-',
  '12+',
  '<12>',
  '$12',
  'abc',
  '12abc',
  '1 2',
  'é1',
  '1é2',
  'XIV',
  'xiv',
  'MMMCMXCIX',
  'IIII',
  'VX',
  '  XII',
  '12th',
  '99999',
  '-',
  '.',
  '0.0001',
  '123.456',
  ' - 12',
  '1-2',
  'x12',
]
const input = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
// D, G, S and L read the locale; SG and PL only contain those letters.
const locale = /[DGSL]/u

it('reads number templates through to_number as PostgreSQL does', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-number-parse-'))
  try {
    for (const setting of ['lc_numeric', 'lc_monetary'])
      expect(
        (await pg.query<{ value: string }>(`SELECT current_setting('${setting}') value`)).rows[0]!
          .value,
      ).toBe('C')
    await pg.exec(`CREATE TABLE number_parse (v text, t text, expected text, skip bool,
      ${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
        .join(',')})`)
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((table) => table.name === 'number_parse')!
    const constraints = Object.keys(expressions).flatMap((name) => {
      const stored = table.constraints.find((constraint) => constraint.name === name)!
      return [
        {
          ...stored,
          name: name + '_raw',
          definition: `CHECK (${expressions[name as keyof typeof expressions]})`,
        },
        { ...stored, name: name + '_stored' },
      ]
    })
    const checks = constraints.map((constraint) => {
      const expression = lowerTableCheck(table, constraint, [], catalog.domains)!.expression
      expect(expression.kind, constraint.name).not.toBe('uncertain')
      return {
        expression,
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: constraint.name,
        },
      }
    })
    const declared = prepareCheckRustGroup(checks, { numericLocale: 'C', moneyLocale: 'C' })
    const undeclared = prepareCheckRustGroup(checks)
    for (const group of [declared, undeclared])
      group.checks.forEach((check, i) => expect(check.kind, constraints[i]!.name).toBe('supported'))
    const known: { name: string; row: Row; expected: Outcome }[] = []
    const deferred: { name: string; row: Row; expected: Outcome }[] = []
    const add = (target: typeof known, name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['raw', 'stored'])
        target.push({ name: `${name}_${suffix}`, row, expected })
    }
    let errors = 0
    for (const template of templates)
      for (const text of texts) {
        let result: string | null = null
        let code: string | undefined
        try {
          result = (
            await pg.query<{ value: string | null }>('SELECT to_number($1, $2)::text value', [
              text,
              template,
            ])
          ).rows[0]!.value
        } catch (error) {
          code = (error as { code: string }).code
          errors++
        }
        // A CHECK sees the same answer through an INSERT.
        let inserted: string | undefined
        try {
          await pg.query('INSERT INTO number_parse VALUES ($1, $2, $3, false)', [
            text,
            template,
            result,
          ])
        } catch (error) {
          inserted = (error as { code: string }).code
        }
        const lazyPasses = result === null || Number(result) > 0
        expect(inserted, `${text} ${template}`).toBe(code ?? (lazyPasses ? undefined : '23514'))
        const row: Row = {
          v: input(text),
          t: input(template),
          expected: input(result),
          skip: input(false),
        }
        const failure: Outcome | undefined =
          code === undefined ? undefined : { kind: 'Error', value: { state: parseInt(code, 36) } }
        add(known, 'value', row, failure ?? { kind: 'True' })
        if (failure === undefined && result !== null)
          add(known, 'value', { ...row, expected: input('wrong') }, { kind: 'False' })
        add(
          known,
          'lazy',
          row,
          failure ?? (result === null ? { kind: 'Null' } : { kind: lazyPasses ? 'True' : 'False' }),
        )
        add(known, 'lazy', { ...row, skip: input(true) }, { kind: 'True' })
        // Syntax errors and scientific notation fail before the locale is read.
        const readsLocale =
          template !== '' &&
          locale.test(template.replace(/"[^"]*"/gu, '').replace(/SG|PL/gu, '')) &&
          code !== '42601' &&
          code !== '0A000'
        if (readsLocale) add(deferred, 'value', row, { kind: 'Unknown' })
      }
    expect(errors).toBeGreaterThan(0)
    expect(deferred.length).toBeGreaterThan(0)
    for (const name of ['value', 'lazy']) {
      add(
        known,
        name,
        { v: input(null), t: input('999'), expected: input(null), skip: input(false) },
        name === 'value' ? { kind: 'True' } : { kind: 'Null' },
      )
      add(
        known,
        name,
        { v: { kind: 'Unknown' }, t: input('999'), expected: input(null), skip: input(true) },
        name === 'value' ? { kind: 'Unknown' } : { kind: 'True' },
      )
    }
    await mkdir(join(directory, 'declared'))
    await mkdir(join(directory, 'undeclared'))
    await runCheckParity(
      join(directory, 'declared'),
      'number_parse',
      declared,
      constraints.map((c) => c.name),
      known,
    )
    await runCheckParity(
      join(directory, 'undeclared'),
      'number_parse',
      undeclared,
      constraints.map((c) => c.name),
      deferred,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)
