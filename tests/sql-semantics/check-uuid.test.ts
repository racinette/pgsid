import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { catalogCheckGroups, lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { renderGoSchemaCheckArtifacts } from '../../src/codegen/go/sql/catalog-checks.js'
import { parseConfigString } from '../../src/config/loader.js'
import { renderGoCheckTests } from './check-codegen.js'

const zero = '00000000-0000-0000-0000-000000000000'
const sample = '01234567-89ab-cdef-0123-456789abcdef'
const expressions: Record<string, string> = {
  cmp: 'uuid_cmp(a,b) = step',
  null_test: 'a IS NULL',
  present: 'a IS NOT NULL',
  simple: 'CASE a WHEN b THEN true ELSE false END',
  searched: '(CASE WHEN flag THEN a ELSE b END) = c',
  absent_else: '(CASE WHEN flag THEN a END) = c',
  coalesce: 'COALESCE(a,b) = c',
  typed_null: 'COALESCE(NULL::uuid,a) = b',
  membership: 'a IN (b,c)',
  exclusion: 'a NOT IN (b,c)',
  between: 'a BETWEEN b AND c',
  not_between: 'a NOT BETWEEN b AND c',
  literal: `a = '${sample}'::uuid`,
  text_cast: 'a::text = expected_text',
  text_call: 'text(a) = expected_text',
  text_parse: 'raw::uuid = a',
  varchar_parse: 'spelling::uuid = a',
  uuid_call: 'uuid(raw) = a',
  roundtrip: 'uuid(text(a)) = a',
  reused: 'a = b AND a = c',
  lazy_cast: 'CASE WHEN flag THEN true ELSE raw::uuid = a END',
  lazy_arm: '(CASE WHEN flag THEN a ELSE raw::uuid END) = c',
  lazy_default: 'COALESCE(a,raw::uuid) = c',
  null_literal: 'NULL::uuid = a',
  error_null: '(raw::uuid) IS NULL',
}
for (const [suffix, op] of Object.entries({
  eq: '=',
  ne: '<>',
  lt: '<',
  le: '<=',
  gt: '>',
  ge: '>=',
})) {
  expressions[suffix] = `a ${op} b`
  expressions[suffix + '_call'] = `uuid_${suffix}(a,b)`
}
const columns: Record<string, string> = {
  a: 'identifier_alias',
  b: 'uuid',
  c: 'uuid',
  step: 'integer',
  flag: 'boolean',
  expected_text: 'text COLLATE "C"',
  raw: 'text',
  spelling: 'varchar',
}
const input = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

describe('portable Rust CHECK UUID values', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-check-uuid-'))
    await pg.exec(`CREATE DOMAIN identifier AS uuid; CREATE DOMAIN identifier_alias AS identifier;
      CREATE DOMAIN nonzero_identifier AS uuid CONSTRAINT identifier_nonzero CHECK (VALUE > '${zero}'::uuid);
      CREATE DOMAIN inherited_identifier AS nonzero_identifier;
      CREATE TABLE identifiers(${Object.entries(columns)
        .map(([name, type]) => `${name} ${type}`)
        .join(',')},
      ${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK (${sql})`)
        .join(',')})`)
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('matches PostgreSQL parsing, byte ordering, casts, control flow and partial inputs in every target', async () => {
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((item) => item.name === 'identifiers')!
    const names = Object.keys(expressions)
    const fixtureNames = names.flatMap((name) => ['raw', 'stored'].map((form) => name + '_' + form))
    const group = prepareCheckRustGroup(
      names.flatMap((name) =>
        ['raw', 'stored'].map((form) => ({
          expression: lowerTableCheck(
            table,
            form === 'stored'
              ? table.constraints.find((check) => check.name === name)!
              : { name, type: 'check', definition: `CHECK (${expressions[name]})` },
            [],
            catalog.domains,
          )!.expression,
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: name + '_' + form,
          },
        })),
      ),
    )
    for (const [index, check] of group.checks.entries())
      expect(check.kind, fixtureNames[index]).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const unknownRow: Row = Object.fromEntries(
      Object.keys(columns).map((name) => [name, { kind: 'Unknown' }]),
    )
    const record = (name: string, row: Row, expected: Outcome) => {
      for (const form of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + form, row: { ...unknownRow, ...row }, expected })
    }
    const oracle = async (name: string, row: Row) => {
      let expected: Outcome
      try {
        const value = (
          await pg.query<{ value: boolean | null }>(
            `SELECT (${expressions[name]}) value FROM (SELECT ${Object.entries(columns)
              .map(([key, type], index) => `$${index + 1}::${type} ${key}`)
              .join(',')}) candidate`,
            Object.keys(columns).map((key) => (row[key]?.kind === 'Value' ? row[key].value : null)),
          )
        ).rows[0]!.value
        expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
      } catch (error) {
        expected = {
          kind: 'Error',
          value: { state: parseInt((error as { code: string }).code, 36) },
        }
      }
      record(name, row, expected)
    }
    const values: (string | null)[] = [null, zero, sample, 'ffffffff-ffff-ffff-ffff-ffffffffffff']
    // Each octet can decide memcmp, including differences larger than a signed unit.
    for (let position = 0; position < 16; position++) {
      const bytes = Array<string>(16).fill('00')
      bytes[position] = position % 2 ? 'ff' : '80'
      values.push(bytes.join(''))
    }
    for (let index = 0; index < values.length; index++) {
      const a = values[index]!
      for (const b of [null, zero, sample, a]) {
        const ref = (
          await pg.query<{ step: number | null; text: string | null }>(
            'SELECT uuid_cmp($1::uuid,$2::uuid) step, $1::uuid::text text',
            [a, b],
          )
        ).rows[0]!
        const row: Row = {
          a: input(a),
          b: input(b),
          c: input(sample),
          step: input(ref.step),
          flag: input(index % 3 === 0 ? null : index % 2 === 0),
          expected_text: input(ref.text),
          raw: input(a),
          spelling: input(a),
        }
        for (const name of names) await oracle(name, row)
      }
    }
    const base: Row = {
      a: input(sample),
      b: input(sample),
      c: input(sample),
      step: input(0),
      flag: input(false),
      expected_text: input(sample),
      raw: input(sample),
      spelling: input(sample),
    }
    // PostgreSQL permits any subset of the seven boundaries after four hex digits.
    const chunks = sample.replaceAll('-', '').match(/.{4}/gu)!
    for (let mask = 0; mask < 128; mask++) {
      const body = chunks
        .map((chunk, index) => chunk + (index < 7 && mask & (1 << index) ? '-' : ''))
        .join('')
      const spelling = mask % 2 ? '{' + body.toUpperCase() + '}' : body
      const row = { ...base, a: input(spelling), raw: input(spelling), spelling: input(spelling) }
      for (const name of [
        'text_parse',
        'varchar_parse',
        'uuid_call',
        'text_cast',
        'text_call',
        'roundtrip',
      ])
        await oracle(name, row)
    }
    const invalid = [
      '',
      ' ',
      '{' + sample,
      sample + '}',
      '{' + sample + '}-',
      sample + '-',
      sample + '0',
      sample.slice(1),
      ' ' + sample,
      sample + '\n',
      sample.replace('a', 'g'),
      sample.replace('a', 'Ａ'),
      sample.replace('-', '--'),
      '01-23456789abcdef0123456789abcdef',
      'urn:uuid:' + sample,
      '0'.repeat(1000),
    ]
    for (const text of invalid) {
      const row = { ...base, raw: input(text), spelling: input(text) }
      for (const name of [
        'text_parse',
        'varchar_parse',
        'uuid_call',
        'error_null',
        'lazy_cast',
        'lazy_arm',
        'lazy_default',
      ])
        await oracle(name, row)
      for (const name of ['lazy_cast', 'lazy_arm'])
        await oracle(name, { ...row, flag: input(true) })
      record('null_test', { ...base, a: input(text) }, { kind: 'False' })
      for (const name of ['eq', 'text_cast', 'roundtrip'])
        record(name, { ...base, a: input(text) }, { kind: 'Unknown' })
    }
    await oracle('text_parse', { ...base, raw: input(zero) })
    await oracle('text_cast', { ...base, expected_text: input(sample.toUpperCase()) })
    await oracle('text_cast', { ...base, expected_text: input('wrong') })
    await oracle('cmp', { ...base, step: input(255) })
    const error: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
    const otherError: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
    for (const name of ['eq', 'cmp']) {
      for (const other of [{ kind: 'Unknown' }, { kind: 'Null' }, input(sample)] as Input[]) {
        record(name, { ...base, a: error, b: other }, error as Outcome)
        record(name, { ...base, a: other, b: error }, error as Outcome)
      }
      record(name, { ...base, a: error, b: otherError }, error as Outcome)
      record(name, { ...base, a: { kind: 'Unknown' }, b: input(sample) }, { kind: 'Unknown' })
    }
    for (const name of [
      'text_parse',
      'varchar_parse',
      'uuid_call',
      'text_cast',
      'null_test',
      'roundtrip',
    ]) {
      const key =
        name === 'varchar_parse'
          ? 'spelling'
          : name === 'text_parse' || name === 'uuid_call'
            ? 'raw'
            : 'a'
      record(name, { ...base, [key]: error }, error as Outcome)
      record(name, { ...base, [key]: { kind: 'Unknown' } }, { kind: 'Unknown' })
    }
    record('lazy_cast', { ...base, flag: input(true), raw: error }, { kind: 'True' })
    record('lazy_arm', { ...base, flag: input(true), raw: error }, { kind: 'True' })
    record('lazy_default', { ...base, raw: error }, { kind: 'True' })
    record('lazy_default', { ...base, a: { kind: 'Unknown' }, raw: error }, { kind: 'Unknown' })
    record('simple', { ...base, a: { kind: 'Unknown' } }, { kind: 'Unknown' })
    record('searched', { ...base, flag: { kind: 'Unknown' } }, { kind: 'Unknown' })
    for (const name of [
      'eq',
      'ne',
      'lt',
      'le',
      'gt',
      'ge',
      'text_cast',
      'text_parse',
      'coalesce',
      'searched',
    ])
      for (const kind of ['True', 'False', 'Null'])
        expect(
          fixtures.some(
            (fixture) => fixture.name === name + '_raw' && fixture.expected.kind === kind,
          ),
          name + ' ' + kind,
        ).toBe(true)
    await runCheckParity(directory, 'uuidchecks', group, fixtureNames, fixtures)
  }, 180000)
  it('preserves direct and inherited UUID domain checks', async () => {
    const catalog = await snapshotCatalog(pg)
    const domains = catalogCheckGroups([], catalog.domains).filter(
      (group) =>
        group.kind === 'domain' &&
        ['nonzero_identifier', 'inherited_identifier'].includes(group.source.name),
    )
    expect(domains).toHaveLength(2)
    const names = domains.map((domain) => domain.name)
    const group = prepareCheckRustGroup(
      domains.map((domain) => ({
        expression: domain.checks[0]!.plan.expression,
        identity: {
          schema: domain.source.schema,
          kind: 'domain' as const,
          owner: domain.source.name,
          constraint: domain.checks[0]!.plan.name,
        },
      })),
    )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const name of names) {
      for (const value of [null, zero, sample]) {
        const result = (
          await pg.query<{ value: boolean | null }>(`SELECT $1::uuid > '${zero}'::uuid value`, [
            value,
          ])
        ).rows[0]!.value
        fixtures.push({
          name,
          row: { value: input(value) },
          expected: { kind: result === null ? 'Null' : result ? 'True' : 'False' },
        })
      }
      fixtures.push({ name, row: { value: { kind: 'Unknown' } }, expected: { kind: 'Unknown' } })
    }
    await mkdir(join(directory, 'domains'))
    await runCheckParity(join(directory, 'domains'), 'uuiddomains', group, names, fixtures)
  }, 180000)
  it('defers unported UUID callables through both public fallback validators', async () => {
    await pg.exec(
      'CREATE TABLE pending_uuid (identifier uuid CONSTRAINT pending_version CHECK (uuid_extract_version(identifier) = 4))',
    )
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((item) => item.name === 'pending_uuid')!
    const root = join(directory, 'fallback')
    await mkdir(root)
    const typescript = renderTypescriptSchemaCheckArtifacts([table])
    expect(typescript.rustFiles).toBeNull()
    await writeFile(join(root, 'checks.ts'), typescript.checks)
    const run = promisify(execFile)
    await run('node_modules/.bin/tsc', [
      '--strict',
      '--noEmit',
      '--skipLibCheck',
      '--target',
      'es2022',
      '--module',
      'esnext',
      join(root, 'checks.ts'),
    ])
    const { evaluatePublicPendingUuidChecks } = await import(
      pathToFileURL(join(root, 'checks.ts')).href
    )
    const rows = [{}, { identifier: null }, { identifier: '01234567-89ab-4def-8123-456789abcdef' }]
    for (const row of rows) {
      const result = evaluatePublicPendingUuidChecks(row)
      expect(result[0].result).toEqual({ certain: false })
      expect(result[0].message).toEqual(expect.any(String))
    }
    const go = renderGoSchemaCheckArtifacts(
      [table],
      'uuidfallback',
      [],
      [],
      catalog,
      parseConfigString('schema: schema.sql\nsql:\n  codegen:\n    go:\n      nulls: pointers\n'),
    )
    expect(go.rustFiles).toBeNull()
    await writeFile(join(root, 'checks.go'), go.checks)
    await writeFile(join(root, 'go.mod'), 'module uuidfallback\n\ngo 1.25\n')
    await writeFile(
      join(root, 'checks_test.go'),
      renderGoCheckTests(
        'uuidfallback',
        rows.map((row, index) => ({
          name: 'pending_' + index,
          table,
          row,
          results: [{ constraint: 'pending_version', result: { certain: false } }],
        })),
      ),
    )
    await run('go', ['test', './...'], {
      cwd: root,
      env: { ...process.env, GOCACHE: '/tmp/pgsid-check-rust-go-cache' },
    })
  }, 180000)
})
