import { describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import type { FunctionMetadata } from '../../src/postgres/builtins/catalog.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const names = new Set(
  [
    ...readFileSync(
      'crates/check-evaluator/src/operations/pg_catalog/regex_substring.rs',
      'utf8',
    ).matchAll(/pub fn (sql__[a-z0-9_]+)\(/gu),
  ].map((match) => match[1]!),
)
const functions = builtinCallables().filter(
  (fn): fn is FunctionMetadata => fn.kind === 'function' && names.has(fn.rustName),
)
const input = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (state: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(state, 36) },
})
const containsUncertain = (value: unknown): boolean =>
  value !== null &&
  typeof value === 'object' &&
  (('kind' in value && value.kind === 'uncertain') || Object.values(value).some(containsUncertain))

describe('Rust CHECK regular-expression substring overloads', () => {
  it('resolves the two catalog identities independently of integer-position substring', () => {
    expect(functions).toHaveLength(2)
    expect(functions.map((fn) => fn.args.length).sort()).toEqual([2, 3])
    expect(
      functions.every(
        (fn) =>
          fn.name === 'substring' &&
          fn.args.every((type) => type === 'pg_catalog.text') &&
          fn.strict &&
          fn.volatility === 'i',
      ),
    ).toBe(true)
  })

  it('matches first captures, unmatched captures, SQL patterns, owned Unicode results, errors, states and lazy branches in Rust, Go and TypeScript', async () => {
    const pg = await PGlite.create()
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-regex-substring-'))
    try {
      const expressions: Record<string, string> = {}
      for (const fn of functions) {
        const args = fn.args.length === 2 ? 'subject,pattern' : 'subject,pattern,escape'
        const call = `pg_catalog.substring(${args})`
        expressions[fn.rustName] = `${call} = recorded`
        expressions[`octets_${fn.rustName}`] = `octet_length(${call}) = recorded_octets`
        expressions[`null_${fn.rustName}`] = `${call} IS NULL`
        expressions[`syntax_${fn.rustName}`] =
          `substring(subject FROM pattern${fn.args.length === 3 ? ' FOR escape' : ''}) = recorded`
      }
      await pg.exec(
        `CREATE TABLE substring_checks(subject text COLLATE "C", pattern text COLLATE "C", escape text COLLATE "C", recorded text COLLATE "C", recorded_octets integer, skip boolean,${Object.entries(
          expressions,
        )
          .map(
            ([name, sql]) =>
              `CONSTRAINT "${name}" CHECK (CASE WHEN skip THEN true ELSE (${sql}) END)`,
          )
          .join(',')})`,
      )
      const catalog = await snapshotCatalog(pg)
      const table = catalog.tables.find((table) => table.name === 'substring_checks')!
      const fixtureNames = Object.keys(expressions).flatMap((name) =>
        ['raw', 'stored'].map((form) => name + '_' + form),
      )
      const checks = Object.entries(expressions).flatMap(([name, sql]) =>
        ['raw', 'stored'].map((form) => {
          const plan = lowerTableCheck(
            table,
            form === 'raw'
              ? {
                  name,
                  type: 'check',
                  definition: `CHECK (CASE WHEN skip THEN true ELSE (${sql}) END)`,
                }
              : table.constraints.find((check) => check.name === name)!,
            catalog.enums,
            catalog.domains,
          )!
          expect(containsUncertain(plan.expression), name + '_' + form).toBe(false)
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
      )
      const group = prepareCheckRustGroup(checks)
      for (const [i, check] of group.checks.entries())
        expect(
          check.kind,
          fixtureNames[i] + (check.kind === 'unsupported' ? ': ' + check.reason : ''),
        ).toBe('supported')
      const fixtures: { name: string; row: Row; expected: Outcome }[] = []
      const base = (): Row => ({
        subject: input('abc'),
        pattern: input('(a)'),
        escape: input('#'),
        recorded: input('a'),
        recorded_octets: input(1),
        skip: input(false),
      })
      const add = (name: string, row: Row, expected: Outcome) => {
        for (const form of ['raw', 'stored'])
          fixtures.push({ name: name + '_' + form, row: { ...row }, expected })
      }
      for (const fn of functions) {
        const related = [
          fn.rustName,
          'octets_' + fn.rustName,
          'null_' + fn.rustName,
          'syntax_' + fn.rustName,
        ]
        const evaluate = async (
          subject: string | null,
          pattern: string | null,
          escape: string | null,
        ) => {
          const row = base()
          row.subject = input(subject)
          row.pattern = input(pattern)
          row.escape = input(escape)
          let value: string | null
          try {
            value = (
              await pg.query<{ value: string | null }>(
                `SELECT pg_catalog.substring($1::text COLLATE "C",$2::text COLLATE "C"${fn.args.length === 3 ? ',$3::text COLLATE "C"' : ''}) AS value`,
                fn.args.length === 3 ? [subject, pattern, escape] : [subject, pattern],
              )
            ).rows[0]!.value
          } catch (caught) {
            const code = (caught as { code: string }).code
            expect(['2201B', '22025', '22023', '2200C']).toContain(code)
            for (const name of related) add(name, row, error(code))
            return
          }
          row.recorded = input(value)
          row.recorded_octets = input(value === null ? null : Buffer.byteLength(value, 'utf8'))
          for (const name of related)
            add(name, row, {
              kind: name.startsWith('null_')
                ? value === null
                  ? 'True'
                  : 'False'
                : value === null
                  ? 'Null'
                  : 'True',
            })
          if (value !== null) {
            row.recorded = input(value + '!')
            row.recorded_octets = input(Buffer.byteLength(value, 'utf8') + 1)
            for (const name of related.filter((name) => !name.startsWith('null_')))
              add(name, row, { kind: 'False' })
          }
        }
        const subjects = [
          '',
          'abc',
          'foobar',
          'foo',
          'aaab',
          'abab',
          'b',
          'a\nb',
          '😊ab😊a',
          'Éé',
          null,
        ]
        const patterns =
          fn.args.length === 2
            ? [
                '',
                'a',
                '(a)',
                '(😊)',
                '(é)',
                '😊(ab)',
                'foo(bar)?',
                '(a(b))',
                '(?:a)',
                '(a)|(b)',
                '(a*)b',
                '^a$',
                'a+',
                'a+?',
                '(',
                '[',
                null,
              ]
            : [
                '',
                '%',
                '_',
                'a%',
                '%a%',
                '%#"a#"%',
                '%#"😊#"%',
                '%#"ab#"%',
                '%#"a%#"%',
                '#"a#"',
                '%#"(a|b)+#"%',
                '(a|b)%',
                '%#"a#"%#"',
                '[',
                '(',
                null,
              ]
        for (const subject of subjects)
          for (const pattern of patterns)
            for (const escape of fn.args.length === 3 ? ['#', '', null] : ['#'])
              await evaluate(subject, pattern, escape)
        if (fn.args.length === 3) {
          for (const escape of ['\\', '😊', 'ab', '##'])
            for (const subject of ['a😊bc', 'abc', null])
              await evaluate(
                subject,
                escape === '\\' ? '%\\"b\\"%' : escape === '😊' ? '%😊"b😊"%' : '%',
                escape,
              )
          await evaluate('abc', '%#"a#"%#"b#"%', '#')
        }
        const args =
          fn.args.length === 2 ? ['subject', 'pattern'] : ['subject', 'pattern', 'escape']
        for (const [index, argument] of args.entries())
          for (const state of [input(null), { kind: 'Unknown' } as Input, error('22003')]) {
            const row = base()
            row[argument] = state
            for (const name of related)
              add(
                name,
                row,
                state.kind === 'Error'
                  ? state
                  : {
                      kind:
                        state.kind === 'Unknown'
                          ? 'Unknown'
                          : name.startsWith('null_')
                            ? 'True'
                            : 'Null',
                    },
              )
            if (index > 0 && state.kind === 'Error') {
              row.subject = { kind: 'Unknown' }
              for (const name of related) add(name, row, state)
              row.subject = error('22P02')
              for (const name of related) add(name, row, error('22P02'))
            }
          }
        const skipped = base()
        for (const field of Object.keys(skipped)) skipped[field] = error('22003')
        skipped.skip = input(true)
        for (const name of related) add(name, skipped, { kind: 'True' })
      }
      await runCheckParity(directory, 'pgsidsubstring', group, fixtureNames, fixtures)
    } finally {
      await pg.close()
      await rm(directory, { recursive: true, force: true })
    }
  }, 240000)
})
