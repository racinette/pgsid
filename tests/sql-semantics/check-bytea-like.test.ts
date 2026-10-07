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
  packet: 'stored_payload',
  pattern: 'stored_payload',
  escape_bytes: 'bytea',
  recorded_escape: 'bytea',
  matched: 'boolean',
  backup: 'boolean',
  skip: 'boolean',
}
const expressions: Record<string, string> = {
  like: '(packet LIKE pattern) = matched',
  not_like: '(packet NOT LIKE pattern) = NOT matched',
  operator: '(packet ~~ pattern) = matched',
  negated_operator: '(packet !~~ pattern) = NOT matched',
  direct: 'pg_catalog.like(packet,pattern) = matched',
  direct_negated: 'notlike(packet,pattern) = NOT matched',
  bytea: 'bytealike(packet,pattern) = matched',
  bytea_negated: 'byteanlike(packet,pattern) = NOT matched',
  escaped: '(packet LIKE pattern ESCAPE escape_bytes) = matched',
  escaped_negated: '(packet NOT LIKE pattern ESCAPE escape_bytes) = NOT matched',
  escaped_direct: 'bytealike(packet,like_escape(pattern,escape_bytes)) = matched',
  converted: 'like_escape(pattern,escape_bytes) = recorded_escape',
  lazy: 'CASE WHEN skip THEN true ELSE (packet LIKE pattern) = matched END',
  selected: '(CASE WHEN skip THEN backup ELSE packet LIKE pattern END) = matched',
  defaulted: 'COALESCE(backup,packet LIKE pattern) = matched',
  typed_null: "(NULL::bytea LIKE '\\x25'::bytea) IS NULL",
}
const input = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

describe('Rust CHECK bytea LIKE', () => {
  let pg: PGlite
  let directory: string
  const domains = 'CREATE DOMAIN raw_payload AS bytea; CREATE DOMAIN stored_payload AS raw_payload;'
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-bytea-like-'))
    await pg.exec(
      `${domains} CREATE TABLE bytea_like_checks (${Object.entries(columns)
        .map(([name, type]) => `"${name}" ${type}`)
        .join(',')},${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
        .join(',')})`,
    )
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('matches byte wildcards, search backtracking, custom escapes, reached errors and lazy value states in Rust and both targets', async () => {
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((table) => table.name === 'bytea_like_checks')!
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
        await pg.query<{ value: boolean | Uint8Array | null }>(
          `SELECT (${sql}) value FROM ${candidate}`,
          Object.keys(columns).map((name) => {
            const value = row[name]
            if (value?.kind !== 'Value') return null
            if (columns[name] === 'stored_payload') return '\\x' + String(value.value)
            if (columns[name] === 'bytea') return Buffer.from(String(value.value), 'hex')
            return value.value
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
        expect(code, String(error)).toBe('22025')
        record(name, row, { kind: 'Error', value: { state: parseInt(code!, 36) } })
      }
    }
    const known: Row = {
      packet: input('6162'),
      pattern: input('6125'),
      escape_bytes: input('5c'),
      recorded_escape: input('6125'),
      matched: input(true),
      backup: input(null),
      skip: input(false),
    }
    const hex = (value: string) => Buffer.from(value).toString('hex')
    for (const text of [
      '',
      'a',
      'b',
      'aa',
      'ab',
      'ba',
      'aab',
      'abb',
      'aba',
      'abab',
      '%',
      '_',
      '\\',
      'a\\',
      'é',
      '😀',
      '\u007f',
    ])
      for (const pattern of [
        '',
        '%',
        '%%',
        '_',
        '__',
        'a',
        'a%',
        '%a',
        '%a%',
        '%ab',
        '%a_b',
        '%_a',
        '%__',
        'a%b%',
        'a\\',
        '\\',
        '%\\',
        'a%\\',
        '%b\\',
        '\\%',
        '\\_',
        '\\\\',
      ]) {
        const row: Row = { ...known, packet: input(hex(text)), pattern: input(hex(pattern)) }
        try {
          const matched = await execute('packet LIKE pattern', row)
          row.matched = input(matched as boolean | null)
        } catch (error) {
          if ((error as { code?: string }).code !== '22025') throw error
        }
        for (const name of ['like', 'not_like', 'bytea', 'direct_negated']) await oracle(name, row)
      }
    for (const escape_bytes of ['', '\\', '#', '%', '_', 'é', 'ab'])
      for (const pattern of ['', '%', '_', 'a#%', 'a#_', '#', '##', 'a\\', '\\%', 'a%a']) {
        const row: Row = {
          ...known,
          escape_bytes: input(hex(escape_bytes)),
          pattern: input(hex(pattern)),
        }
        try {
          const converted = await execute('like_escape(pattern,escape_bytes)', row)
          row.recorded_escape = input(Buffer.from(converted as Uint8Array).toString('hex'))
          const matched = await execute('packet LIKE pattern ESCAPE escape_bytes', row)
          row.matched = input(matched as boolean | null)
        } catch (error) {
          if ((error as { code?: string }).code !== '22025') throw error
        }
        for (const name of ['escaped', 'escaped_negated', 'escaped_direct', 'converted'])
          await oracle(name, row)
      }
    for (const row of [
      known,
      { ...known, packet: input('ff'), pattern: input('5f') },
      { ...known, packet: input('ff'), pattern: input('00') },
      { ...known, packet: input(null) },
      { ...known, pattern: input(null) },
      { ...known, escape_bytes: input(null) },
      { ...known, matched: input(null) },
      { ...known, matched: input(false) },
      { ...known, skip: input(true) },
    ])
      for (const name of names) await oracle(name, row)
    const unknown: Input = { kind: 'Unknown' },
      error: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } },
      other: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
    for (const name of [
      'like',
      'not_like',
      'operator',
      'negated_operator',
      'direct',
      'direct_negated',
      'bytea',
      'bytea_negated',
    ]) {
      record(name, { ...known, packet: unknown }, { kind: 'Unknown' })
      record(name, { ...known, packet: unknown, pattern: error }, error as Outcome)
      record(name, { ...known, packet: input(null), pattern: error }, error as Outcome)
      record(name, { ...known, packet: error, pattern: other }, error as Outcome)
    }
    record('converted', { ...known, pattern: unknown, escape_bytes: error }, error as Outcome)
    record('lazy', { ...known, packet: error, skip: input(true) }, { kind: 'True' })
    record(
      'selected',
      { ...known, packet: error, backup: input(true), skip: input(true) },
      { kind: 'True' },
    )
    record('defaulted', { ...known, packet: error, backup: input(true) }, { kind: 'True' })
    record('defaulted', { ...known, packet: unknown }, { kind: 'Unknown' })
    for (const kind of ['True', 'False', 'Null', 'Unknown', 'Error'])
      expect(
        fixtures.some((f) => f.name === 'like_raw' && f.expected.kind === kind),
        'like: ' + kind,
      ).toBe(true)
    await runCheckParity(directory, 'bytealike', group, fixtureNames, fixtures)
  }, 240000)
})
