import { it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Row,
  type Outcome,
  type Input,
} from '../../tools/check-rust/parity.js'
const input = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const literal = (value: string | null) =>
  value === null ? 'NULL' : `'${value.replaceAll("'", "''")}'`
it('matches width casts and direct coercion calls with all input collations, errors, NULLs and lazy arms', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-text-width-casts-'))
  try {
    await pg.exec(
      `CREATE COLLATION deterministic_order (provider=icu,locale='und',deterministic=true); CREATE COLLATION insensitive_order (provider=icu,locale='und-u-ks-level1',deterministic=false)`,
    )
    const targets = [
      'varchar(1)',
      'varchar(2)',
      'varchar(5)',
      'character(1)',
      'character(2)',
      'character(5)',
      'varchar',
      'bpchar',
      'char',
    ]
    const expressions: Record<string, string> = {}
    for (const name of ['label', 'fixed_label', 'variable_label'])
      for (const [i, target] of targets.entries())
        expressions[name + '_' + i] = `${name}::${target}`
    expressions.fixed_direct = 'pg_catalog.bpchar(fixed_label,width,is_explicit)'
    expressions.variable_direct = 'pg_catalog."varchar"(variable_label,width,is_explicit)'
    expressions.literal_fixed = `'é😊a'::character(2)`
    expressions.literal_variable = `'é😊a'::varchar(2)`
    const collations = [
      'pg_catalog."default"',
      'pg_catalog."C"',
      'deterministic_order',
      'insensitive_order',
    ]
    const groups = []
    const fixtureNames: string[] = []
    for (const [c, collation] of collations.entries()) {
      const checks = Object.entries(expressions).flatMap(([name, expression]) => [
        {
          name: `c${c}_${name}_text`,
          expression: `CASE WHEN skip THEN true ELSE (${expression})::text COLLATE "C" = recorded COLLATE "C" END`,
        },
        {
          name: `c${c}_${name}_octets`,
          expression: `CASE WHEN skip THEN true ELSE octet_length(${expression})=recorded_octets END`,
        },
      ])
      const sql = `CREATE TABLE width_checks_${c} (label text COLLATE ${collation},fixed_label bpchar COLLATE ${collation},variable_label varchar COLLATE ${collation},width int4,is_explicit bool,recorded text,recorded_octets int4,skip bool,${checks.map((check) => `CONSTRAINT ${check.name} CHECK (${check.expression})`).join(',')})`
      await pg.exec(sql)
      const catalog = await snapshotCatalog(pg)
      const table = catalog.tables.find((table) => table.name === `width_checks_${c}`)!
      for (const check of checks)
        for (const form of ['raw', 'stored']) {
          const name = check.name + '_' + form
          const expression = lowerTableCheck(
            table,
            form === 'stored'
              ? table.constraints.find((item) => item.name === check.name)!
              : { name: check.name, type: 'check', definition: `CHECK (${check.expression})` },
            [],
            catalog.domains,
          )!.expression
          expect(expression.kind, name).not.toBe('uncertain')
          groups.push({
            expression,
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: table.name,
              constraint: name,
            },
          })
          fixtureNames.push(name)
        }
    }
    const group = prepareCheckRustGroup(groups)
    for (const [i, check] of group.checks.entries())
      expect(check.kind, fixtureNames[i] + (check.kind === 'unsupported' ? check.reason : '')).toBe(
        'supported',
      )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const defaults = (value: string | null, width = 6, isExplicit: boolean | null = true): Row => ({
      label: input(value),
      fixed_label: input(value),
      variable_label: input(value),
      width: input(width),
      is_explicit: input(isExplicit),
      recorded: input(''),
      recorded_octets: input(0),
      skip: input(false),
    })
    const record = (c: number, name: string, row: Row, expected: Outcome) => {
      for (const form of ['raw', 'stored'])
        fixtures.push({ name: `c${c}_${name}_${form}`, row: { ...row }, expected })
    }
    for (const [c, collation] of collations.entries())
      for (const [name, expression] of Object.entries(expressions)) {
        for (const value of ['', 'a', 'abc', 'é😊', 'a  ', 'é😊', null])
          for (const isExplicit of name.endsWith('_direct') ? [true, false, null] : [true]) {
            const row = defaults(value, 6, isExplicit)
            const source = `SELECT ${literal(value)}::text COLLATE ${collation} label,${literal(value)}::bpchar COLLATE ${collation} fixed_label,${literal(value)}::varchar COLLATE ${collation} variable_label,6::int4 width,${isExplicit === null ? 'NULL' : isExplicit}::bool is_explicit`
            try {
              const result = (
                await pg.query<{ value: string | null; octets: number | null }>(
                  `SELECT (${expression})::text value,octet_length(${expression}) octets FROM (${source}) candidate`,
                )
              ).rows[0]!
              row.recorded = input(result.value)
              row.recorded_octets = input(result.octets)
              for (const output of ['text', 'octets'])
                record(c, name + '_' + output, row, {
                  kind: result[output === 'text' ? 'value' : 'octets'] === null ? 'Null' : 'True',
                })
              if (result.value !== null) {
                row.recorded = input(result.value + '!')
                row.recorded_octets = input(-1)
                for (const output of ['text', 'octets'])
                  record(c, name + '_' + output, row, { kind: 'False' })
              }
            } catch (error) {
              const code = (error as { code: string }).code
              expect(code).toBe('22001')
              for (const output of ['text', 'octets'])
                record(c, name + '_' + output, row, {
                  kind: 'Error',
                  value: { state: parseInt(code, 36) },
                })
            }
          }
        const operand = name.startsWith('label_')
          ? 'label'
          : name.startsWith('fixed_')
            ? 'fixed_label'
            : name.startsWith('variable_')
              ? 'variable_label'
              : null
        if (operand) {
          const row = defaults('abc')
          row[operand] = { kind: 'Unknown' }
          for (const output of ['text', 'octets'])
            record(c, name + '_' + output, row, { kind: 'Unknown' })
        }
        const skipped = defaults('abc')
        skipped.skip = input(true)
        skipped.label = { kind: 'Error', value: { state: parseInt('22003', 36) } }
        skipped.fixed_label = skipped.label
        skipped.variable_label = skipped.label
        for (const output of ['text', 'octets'])
          record(c, name + '_' + output, skipped, { kind: 'True' })
      }
    await runCheckParity(directory, 'pgsid-text-width-casts', group, fixtureNames, fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 600000)
