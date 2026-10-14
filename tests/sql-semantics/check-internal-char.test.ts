import { internalCharInputForms } from './check-internal-char-input-forms.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { callableIdentity, type FunctionMetadata } from '../../src/postgres/builtins/catalog.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
const known = (value: string | number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (state: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(state, 36) },
})
const spelling = (value: number | null): string | null =>
  value === null ? null : '\\' + value.toString(8).padStart(3, '0')
const wire = (sql: string, type: string): string => {
  if (type === 'pg_catalog.bytea') return sql
  const send: Record<string, string> = {
    'pg_catalog."char"': 'charsend',
    'pg_catalog.text': 'textsend',
    'pg_catalog.bpchar': 'bpcharsend',
    'pg_catalog.bool': 'boolsend',
    'pg_catalog.int4': 'int4send',
    'pg_catalog.int8': 'int8send',
  }
  if (!send[type]) throw new Error(type)
  return `${send[type]}(${sql})`
}
describe('internal single-byte char values', () => {
  let pg: PGlite, directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-internal-char-'))
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  const prepare = async (name: string, columns: string, expressions: Record<string, string>) => {
    await pg.exec(
      `CREATE TABLE ${name}(${columns},${Object.entries(expressions)
        .map(([key, sql]) => `CONSTRAINT "${key}" CHECK(${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === name)!
    const checks = Object.entries(expressions).flatMap(([key, sql]) => {
      const constraint = table.constraints.find((c) => c.name === key)!
      return [
        { ...constraint, name: key + '_raw', definition: `CHECK(${sql})` },
        { ...constraint, name: key + '_stored' },
      ].map((c) => ({
        expression: portableCheckAtoms(lowerTableCheck(table, c, [], catalog.domains)!.expression),
        identity: { schema: 'public', kind: 'table' as const, owner: name, constraint: c.name },
      }))
    })
    const group = prepareCheckRustGroup(checks)
    for (const [i, c] of group.checks.entries())
      expect(c.kind, checks[i]!.identity.constraint).toBe('supported')
    return { group, names: checks.map((c) => c.identity.constraint) }
  }
  const run = async (
    label: string,
    prepared: Awaited<ReturnType<typeof prepare>>,
    fixtures: { name: string; row: Row; expected: Outcome }[],
  ) => {
    const target = join(directory, label)
    await mkdir(target)
    await runCheckParity(
      target,
      label,
      prepared.group,
      prepared.names,
      fixtures.flatMap((f) =>
        ['raw', 'stored'].map((suffix) => ({ ...f, name: f.name + '_' + suffix })),
      ),
    )
  }
  it('matches all catalog core functions and operator aliases, unsigned comparisons, signed casts, literals, domains and composition', async () => {
    const source = await readFile(
      'crates/check-evaluator/src/operations/pg_catalog/internal_char.rs',
      'utf8',
    )
    const functions = builtinCallables().filter(
      (f): f is FunctionMetadata =>
        f.kind === 'function' && source.includes(`pub fn ${f.rustName}(`),
    )
    expect(functions).toHaveLength(15)
    const calls = new Map<string, { sql: string; type: string; hash: boolean; bpchar: boolean }>()
    for (const fn of functions) {
      let ordinal = 0
      const args = fn.args.map((t) =>
        t === 'pg_catalog."char"'
          ? ['a', 'b'][ordinal++]!
          : t === 'pg_catalog.int4'
            ? 'integer_value'
            : t === 'pg_catalog.int8'
              ? 'seed'
              : 'source',
      )
      calls.set(fn.rustName, {
        sql: `pg_catalog."${fn.name}"(${args.join(',')})`,
        type: fn.result,
        hash: fn.name.startsWith('hashchar'),
        bpchar: fn.name === 'bpchar',
      })
    }
    const identities = new Set(functions.map(callableIdentity))
    for (const [index, op] of builtinCallables()
      .filter((f) => f.kind === 'operator' && identities.has(f.implementation))
      .entries())
      if (op.kind === 'operator')
        calls.set('operator_' + index, {
          sql: `a OPERATOR(pg_catalog.${op.name}) b`,
          type: op.result,
          hash: false,
          bpchar: false,
        })
    const expressions = Object.fromEntries(
      [...calls].map(([name, call]) => [
        name,
        ['pg_catalog.text', 'pg_catalog.bpchar'].includes(call.type)
          ? `${call.sql} COLLATE \"C\"=expected_text::${call.type} COLLATE \"C\"`
          : `${wire(call.sql, call.type)}=expected`,
      ]),
    )
    Object.assign(expressions, {
      selected: 'charsend(CASE WHEN skip THEN a ELSE b END)=expected',
      coalesced: 'charsend(COALESCE(a,b))=expected',
      greatest: 'charsend(GREATEST(a,b))=expected',
      least: 'charsend(LEAST(a,b))=expected',
      nullif: 'charsend(NULLIF(a,b))=expected',
      distinct: '(a IS DISTINCT FROM b)=expected_bool',
      row_compare: '(a,b)<=(b,a)',
      literal: "charsend('é'::nested_octet)='\\xc3'::bytea",
      typed_null: 'NULL::"char" IS NULL',
      lazy: 'CASE WHEN skip THEN true ELSE integer_value::"char" IS NOT NULL END',
    })
    await pg.exec('CREATE DOMAIN octet AS "char";CREATE DOMAIN nested_octet AS octet')
    const prepared = await prepare(
      'single_byte_values',
      'a nested_octet,b "char",integer_value integer,seed bigint,source text,expected bytea,expected_text text,expected_bool boolean,skip boolean',
      expressions,
    )
    const base: Row = {
      a: known(65),
      b: known(90),
      integer_value: known(-128),
      seed: known(0n),
      source: known('é'),
      expected: known('00'),
      expected_bool: known(true),
      skip: known(true),
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const values = [0, 1, 32, 65, 127, 128, 195, 255, null]
    for (const a of values) {
      const b = a === null ? null : 255 - a
      const parameters = [spelling(a), spelling(b), '-128', '0', 'é']
      for (const [name, call] of calls) {
        const deferred =
          a !== null && ((call.hash && a >= 128) || (call.bpchar && (a === 0 || a >= 128)))
        const textResult = ['pg_catalog.text', 'pg_catalog.bpchar'].includes(call.type)
        const result =
          deferred && call.bpchar
            ? ''
            : (
                await pg.query<{ answer: string | null }>(
                  `SELECT ${textResult ? `(${call.sql})::text` : `encode(${wire(call.sql, call.type)},'hex')`} answer FROM (SELECT $1::"char" a,$2::"char" b,$3::integer integer_value,$4::bigint seed,$5::text source) args`,
                  parameters,
                )
              ).rows[0]!.answer
        fixtures.push({
          name,
          row: {
            ...base,
            a: known(a),
            b: known(b),
            [textResult ? 'expected_text' : 'expected']: known(result),
          },
          expected: { kind: deferred ? 'Unknown' : result === null ? 'Null' : 'True' },
        })
      }
      for (const name of [
        'selected',
        'coalesced',
        'greatest',
        'least',
        'nullif',
        'distinct',
        'row_compare',
      ]) {
        const sql = expressions[name]!
        const expected = (
          await pg.query<{ value: boolean | null }>(
            `SELECT ${sql} value FROM (SELECT $1::"char" a,$2::"char" b,$3::bytea expected,true expected_bool,true skip) args`,
            [spelling(a), spelling(b), Buffer.from([0])],
          )
        ).rows[0]!.value
        fixtures.push({
          name,
          row: { ...base, a: known(a), b: known(b) },
          expected: { kind: expected === null ? 'Null' : expected ? 'True' : 'False' },
        })
      }
    }
    for (const name of ['literal', 'typed_null', 'lazy'])
      fixtures.push({ name, row: base, expected: { kind: 'True' } })
    fixtures.push({
      name: 'lazy',
      row: { ...base, skip: known(false), integer_value: known(128) },
      expected: error('22003'),
    })
    for (const [a, b, outcome] of [
      [{ kind: 'Unknown' }, known(1), { kind: 'Unknown' }],
      [known(null), known(1), { kind: 'Null' }],
      [known(null), { kind: 'Unknown' }, { kind: 'Unknown' }],
      [{ kind: 'Unknown' }, error('22012'), error('22012')],
      [error('22003'), error('22012'), error('22003')],
    ] as [Input, Input, Outcome][])
      fixtures.push({
        name: 'sql__pg_catalog__chareq__nib3',
        row: { ...base, a, b },
        expected: outcome,
      })
    await run('core', prepared, fixtures)
  }, 600_000)
  it('matches every byte through text input/output, binary output and signed integer conversion, including octal wrapping and UTF8 first-byte input', async () => {
    const expressions = {
      parse: 'charsend(source::"char")=expected',
      output: 'a::text COLLATE \"C\"=expected_text COLLATE \"C\"',
      integer: 'int4send(a::integer)=expected',
      construct: 'charsend(integer_value::"char")=expected',
      bpchar_input: 'charsend(padded::"char")=expected',
      varchar_input: 'charsend(source::varchar::"char")=expected',
      bpchar_function: 'charsend(pg_catalog."char"(padded))=expected',
      bpchar_trimmed: 'charsend(pg_catalog."char"(padded::text))=expected',
    }
    const prepared = await prepare(
      'single_byte_inputs',
      'source text,padded bpchar,a "char",integer_value integer,expected bytea,expected_text text',
      expressions,
    )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      base: Row = {
        source: known(''),
        padded: known(''),
        a: known(0),
        integer_value: known(0),
        expected: known('00'),
      }
    for (let a = 0; a < 256; a++) {
      const source = spelling(a)!,
        integer = a < 128 ? a : a - 256
      const result = (
        await pg.query<{ parse: string; output: string; integer: string; construct: string }>(
          'SELECT encode(charsend($1::"char"),\'hex\') parse,$1::"char"::text output,encode(int4send($1::"char"::integer),\'hex\') integer,encode(charsend($2::integer::"char"),\'hex\') construct',
          [source, integer.toString()],
        )
      ).rows[0]!
      for (const name of ['parse', 'output', 'integer', 'construct'] as const)
        fixtures.push({
          name,
          row: {
            ...base,
            source: known(source),
            a: known(a),
            integer_value: known(integer),
            expected: known(name === 'output' ? '00' : result[name]),
            expected_text: known(result.output),
          },
          expected: { kind: 'True' },
        })
    }
    for (const source of internalCharInputForms) {
      for (const name of [
        'parse',
        'bpchar_input',
        'varchar_input',
        'bpchar_function',
        'bpchar_trimmed',
      ]) {
        const type =
          name === 'bpchar_input' ? 'bpchar' : name === 'varchar_input' ? 'varchar' : 'text'
        const result = (
          await pg.query<{ wire: string }>(
            `SELECT encode(charsend(${name === 'bpchar_function' ? 'pg_catalog."char"($1::bpchar)' : name === 'bpchar_trimmed' ? 'pg_catalog."char"($1::bpchar::text)' : '$1::' + type + '::"char"'}),'hex') wire`,
            [source],
          )
        ).rows[0]!.wire
        fixtures.push({
          name,
          row: { ...base, source: known(source), padded: known(source), expected: known(result) },
          expected: { kind: 'True' },
        })
      }
    }
    for (const integer_value of [-2147483648, -129, 128, 2147483647])
      fixtures.push({
        name: 'construct',
        row: { ...base, integer_value: known(integer_value) },
        expected: error('22003'),
      })
    for (const [source, outcome] of [
      [known(null), { kind: 'Null' }],
      [{ kind: 'Unknown' }, { kind: 'Unknown' }],
      [error('22012'), error('22012')],
    ] as [Input, Outcome][])
      fixtures.push({ name: 'parse', row: { ...base, source }, expected: outcome })
    await run('input', prepared, fixtures)
  }, 600_000)
  it('witnesses both native-char hash interpretations and preserves definite ASCII hashes and error/NULL propagation', async () => {
    for (const a of [0, 1, 65, 127, 128, 195, 255])
      for (const seed of ['0', '-1', '9223372036854775807']) {
        const result = (
          await pg.query<{
            hash: number
            signed: number
            unsigned: number
            extended: string
            signed_extended: string
            unsigned_extended: string
          }>(
            'SELECT hashchar($1::"char") hash,hashint4($2::integer) signed,hashint4($3::integer) unsigned,hashcharextended($1::"char",$4::bigint)::text extended,hashint4extended($2::integer,$4::bigint)::text signed_extended,hashint4extended($3::integer,$4::bigint)::text unsigned_extended',
            [spelling(a), (a < 128 ? a : a - 256).toString(), a.toString(), seed],
          )
        ).rows[0]!
        expect(result.hash).toBe(result.signed)
        expect(result.extended).toBe(result.signed_extended)
        if (a >= 128) {
          expect(result.signed).not.toBe(result.unsigned)
          expect(result.signed_extended).not.toBe(result.unsigned_extended)
        } else {
          expect(result.signed).toBe(result.unsigned)
          expect(result.signed_extended).toBe(result.unsigned_extended)
        }
      }
    const prepared = await prepare('single_byte_hash_state', 'a "char",seed bigint', {
      hash: 'hashcharextended(a,seed) IS NULL',
      bpchar: 'a::bpchar IS NULL',
    })
    await run('hash_state', prepared, [
      { name: 'hash', row: { a: known(255), seed: known(0n) }, expected: { kind: 'Unknown' } },
      { name: 'hash', row: { a: known(255), seed: known(null) }, expected: { kind: 'Unknown' } },
      { name: 'hash', row: { a: known(255), seed: error('22012') }, expected: error('22012') },
      { name: 'hash', row: { a: known(null), seed: known(0n) }, expected: { kind: 'True' } },
      { name: 'hash', row: { a: known(65), seed: known(0n) }, expected: { kind: 'False' } },
      { name: 'bpchar', row: { a: known(0) }, expected: { kind: 'Unknown' } },
      { name: 'bpchar', row: { a: known(255) }, expected: { kind: 'Unknown' } },
      { name: 'bpchar', row: { a: known(65) }, expected: { kind: 'False' } },
    ])
  }, 600_000)
})
