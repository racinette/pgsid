import { afterAll, beforeAll, describe, expect, it } from 'vitest'
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
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const columns: Record<string, string> = {
  label: 'stored_label',
  varying_label: 'varchar',
  fixed_label: 'character(4)',
  recorded_payload: 'bytea',
  backup: 'bytea',
  skip: 'boolean',
}
const transforms: Record<string, string> = {
  cast: 'label::bytea',
  direct: 'bytea(label)',
  qualified: 'pg_catalog.bytea(label)',
  varying: 'varying_label::bytea',
  varying_direct: 'bytea(varying_label)',
  fixed: 'fixed_label::bytea',
  fixed_direct: 'bytea(fixed_label)',
}
const expressions: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(transforms).map(([name, sql]) => [name, `(${sql}) = recorded_payload`]),
  ),
  selected: '(CASE WHEN skip THEN backup ELSE label::bytea END) = recorded_payload',
  defaulted: 'COALESCE(backup,label::bytea) = recorded_payload',
  lazy: 'CASE WHEN skip THEN true ELSE label::bytea = recorded_payload END',
  hex_literal: "'\\xFF 00 7f'::bytea = '\\xff007f'::bytea",
  escape_literal: "'a\\377'::bytea = '\\x61ff'::bytea",
  unicode_literal: "'é😀'::bytea = '\\xc3a9f09f9880'::bytea",
  direct_literal: "bytea('\\x FF00') = '\\xff00'::bytea",
  typed_null: 'NULL::bytea IS NULL',
}
const input = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

describe('Rust CHECK bytea input casts', () => {
  let pg: PGlite
  let directory: string
  const domains = 'CREATE DOMAIN raw_label AS text; CREATE DOMAIN stored_label AS raw_label;'
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-bytea-input-'))
    await pg.exec(
      `${domains} CREATE TABLE bytea_input_checks (${Object.entries(columns)
        .map(([name, type]) => `${name} ${type}`)
        .join(',')},${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
        .join(',')})`,
    )
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('matches hexadecimal and escaped UTF8 inputs, syntax errors, bpchar padding, literals and lazy states in Rust and both targets', async () => {
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((table) => table.name === 'bytea_input_checks')!
    const names = Object.keys(expressions)
    const fixtureNames = names.flatMap((name) => ['raw', 'stored'].map((form) => name + '_' + form))
    const group = prepareCheckRustGroup(
      names.flatMap((name) =>
        ['raw', 'stored'].map((form) => {
          const plan = lowerTableCheck(
            table,
            form === 'stored'
              ? table.constraints.find((check) => check.name === name)!
              : { name, type: 'check', definition: `CHECK (${expressions[name]})` },
            [],
            catalog.domains,
          )!
          expect(plan.expression.kind, name + '_' + form).not.toBe('uncertain')
          return {
            expression: plan.expression,
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: table.name,
              constraint: name + '_' + form,
            },
          }
        }),
      ),
    )
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        fixtureNames[index] + (check.kind === 'unsupported' ? ': ' + check.reason : ''),
      ).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const record = (name: string, row: Row, expected: Outcome) => {
      for (const form of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + form, row: { ...row }, expected })
    }
    const candidate = `(SELECT ${Object.entries(columns)
      .map(([name, type], index) => `$${index + 1}::${type} AS "${name}"`)
      .join(',')}) candidate`
    let executions = 0
    const execute = async (sql: string, row: Row) => {
      if (executions > 0 && executions % 500 === 0) {
        await pg.close()
        pg = await PGlite.create()
        await pg.exec(domains)
      }
      executions++
      return (
        await pg.query<{ value: boolean | string | null }>(
          `SELECT (${sql}) value FROM ${candidate}`,
          Object.keys(columns).map((column) => {
            const value = row[column]
            if (value?.kind !== 'Value') return null
            return columns[column] === 'bytea'
              ? Buffer.from(String(value.value), 'hex')
              : value.value
          }),
        )
      ).rows[0]!.value
    }
    const oracle = async (name: string, row: Row) => {
      try {
        const value = await execute(expressions[name]!, row)
        record(name, row, { kind: value === null ? 'Null' : value ? 'True' : 'False' })
      } catch (error) {
        const code = (error as { code?: string }).code
        expect(['22P02', '22023'], String(error)).toContain(code)
        record(name, row, { kind: 'Error', value: { state: parseInt(code!, 36) } })
      }
    }
    const known: Row = {
      label: input('a'),
      varying_label: input('a'),
      fixed_label: input('a   '),
      recorded_payload: input('61'),
      backup: input(null),
      skip: input(false),
    }
    const transform = async (name: string, row: Row) => {
      try {
        const wire = await execute(`encode(${transforms[name]},'hex')`, row)
        await oracle(name, { ...row, recorded_payload: input(wire as string | null) })
        if (wire !== null) await oracle(name, { ...row, recorded_payload: input(wire + '00') })
      } catch (error) {
        if (!(error as { code?: string }).code) throw error
        await oracle(name, row)
      }
    }
    for (const label of [
      '',
      ' ',
      'abc',
      'é',
      '😀',
      '\n\t',
      '\\x',
      '\\xFF00',
      '\\x FF 00\n7f',
      '\\x0',
      '\\x0 0',
      '\\xgg',
      '\\X00',
      '\\',
      '\\0',
      '\\00',
      '\\000',
      '\\377',
      '\\400',
      '\\777',
      '\\\\',
      'a\\377z',
      ...Array.from({ length: 256 }, (_, byte) => '\\' + byte.toString(8).padStart(3, '0')),
    ]) {
      const row = { ...known, label: input(label), varying_label: input(label) }
      for (const name of ['cast', 'direct', 'qualified', 'varying', 'varying_direct'])
        await transform(name, row)
    }
    for (const fixed_label of ['a   ', 'é   ', '    ', '\\x00', '\\xFF', '\\xg0', '\\377'])
      for (const name of ['fixed', 'fixed_direct'])
        await transform(name, { ...known, fixed_label: input(fixed_label) })
    for (const row of [
      known,
      { ...known, label: input(null), varying_label: input(null), fixed_label: input(null) },
      { ...known, recorded_payload: input(null) },
      { ...known, skip: input(true), backup: known.recorded_payload! },
    ])
      for (const name of names) await oracle(name, row)
    await oracle('lazy', { ...known, label: input('\\xgg'), skip: input(true) })
    await oracle('lazy', { ...known, label: input('\\xgg'), skip: input(false) })
    const unknown: Input = { kind: 'Unknown' },
      error: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
    for (const name of Object.keys(transforms)) {
      const column = name.startsWith('fixed')
        ? 'fixed_label'
        : name.startsWith('varying')
          ? 'varying_label'
          : 'label'
      record(name, { ...known, [column]: unknown }, { kind: 'Unknown' })
      record(name, { ...known, [column]: error }, error as Outcome)
      record(name, { ...known, [column]: unknown, recorded_payload: error }, error as Outcome)
    }
    record(
      'selected',
      { ...known, label: error, skip: input(true), backup: known.recorded_payload! },
      { kind: 'True' },
    )
    record(
      'defaulted',
      { ...known, label: error, backup: known.recorded_payload! },
      { kind: 'True' },
    )
    record('lazy', { ...known, label: error, skip: input(true) }, { kind: 'True' })
    for (const name of Object.keys(transforms))
      for (const kind of ['True', 'False', 'Null', 'Unknown', 'Error'])
        expect(
          fixtures.some((f) => f.name === name + '_raw' && f.expected.kind === kind),
          name + ': ' + kind,
        ).toBe(true)
    await runCheckParity(directory, 'byteainput', group, fixtureNames, fixtures)
  }, 240000)
})
