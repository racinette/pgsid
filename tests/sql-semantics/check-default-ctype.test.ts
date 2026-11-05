import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  assembleCheckRust,
  prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import type { CheckExecutionContext } from '../../src/codegen/shared/check-rust-evaluator.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const profiles = [
  { name: 'lower', sql: 'lower(a) = b' },
  { name: 'upper', sql: 'upper(a) = b' },
  { name: 'initcap', sql: 'initcap(a) = b' },
  { name: 'casefold', sql: 'casefold(a) = b' },
  { name: 'ilike', sql: 'a ILIKE b' },
  { name: 'not_ilike', sql: 'a NOT ILIKE b' },
  { name: 'regex', sql: 'a ~ b' },
  { name: 'regex_insensitive', sql: 'a ~* b' },
  { name: 'not_regex', sql: 'a !~ b' },
  { name: 'regexp_like', sql: 'regexp_like(a,b)' },
  { name: 'regexp_count', sql: 'regexp_count(a,b) > 0' },
  { name: 'regexp_replace', sql: `regexp_replace(a,b,'x') = a` },
  { name: 'bpchar_ilike', sql: 'a::bpchar ILIKE b' },
  { name: 'name_regex', sql: 'a::name ~ b' },
  { name: 'similar_substring', sql: `substring(a, b, '#') = a` },
  // The escape is translated before the regex runs, so it fails on every row a NULL pattern does
  // not skip.
  { name: 'similar_bad_escape', sql: `substring(a, b, '##') = a`, escapeFails: true },
  { name: 'starts_with', sql: 'starts_with(a, b)', ctypeFree: true },
  { name: 'prefix_operator', sql: 'a ^@ b', ctypeFree: true },
  { name: 'explicit_c', sql: 'lower(a COLLATE "C") = b', explicit: true },
] as const
// PGlite orders by C but classifies by C.UTF-8, so only ASCII rows can witness a declared C ctype.
const contexts: { name: string; context: CheckExecutionContext; ascii: boolean }[] = [
  {
    name: 'native',
    context: { defaultCollation: 'C', defaultCtype: 'C.UTF-8', serverEncoding: 'UTF8' },
    ascii: false,
  },
  {
    name: 'declared',
    context: { defaultCollation: 'C', defaultCtype: 'C', serverEncoding: 'UTF8' },
    ascii: true,
  },
]
const rows: [string | null, string | null][] = [
  ['Abc', 'abc'],
  ['abc', 'ABC'],
  ['hello world', 'Hello World'],
  ['ab', 'a%'],
  ['xyz', '^[a-z]+$'],
  ['A1', '[[:alpha:]][[:digit:]]'],
  ['a', '('],
  ['É', 'é'],
  ['é', '[[:alpha:]]'],
  ['ß', '\\w'],
  [null, 'a'],
  ['a', null],
]
const value = (v: string | boolean): Input => ({ kind: 'Value', value: v })
const nil: Input = { kind: 'Null' }
const unknown: Input = { kind: 'Unknown' }
const failure = (code: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})

it('decides default-collation casing and regex only under a declared C ctype in all targets', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-default-ctype-'))
  try {
    await pg.exec(
      `CREATE TABLE default_ctype(a text,b text,bypass boolean,${profiles.map((p) => `CONSTRAINT profile_${p.name} CHECK(CASE WHEN bypass THEN true ELSE ${p.sql} END)`).join(',')})`,
    )
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((t) => t.name === 'default_ctype')!
    const maxIdentifierBytes = Number(
      (await pg.query<{ value: string }>("SELECT current_setting('max_identifier_length') value"))
        .rows[0]!.value,
    )
    const names: string[] = []
    const groups = contexts.map(({ name, context }) =>
      prepareCheckRustGroup(
        profiles.flatMap((p) =>
          (['source', 'stored'] as const).map((origin) => {
            const expression = portableCheckAtoms(
              lowerTableCheck(
                table,
                table.constraints.find((c) => c.name === 'profile_' + p.name)!,
                catalog.enums,
                catalog.domains,
                origin,
                catalog.rangeTypes,
                catalog.compositeTypeGraph,
                origin === 'source'
                  ? `CHECK(CASE WHEN bypass THEN true ELSE ${p.sql} END)`
                  : undefined,
              )!.expression,
            )
            expect(hasUncertain(expression), p.name + origin).toBe(false)
            names.push(`${name}_${p.name}_${origin}`)
            return {
              identity: {
                schema: 'public',
                kind: 'table' as const,
                owner: table.name,
                constraint: `${name}_${p.name}_${origin}`,
              },
              expression,
            }
          }),
        ),
        { ...context, maxIdentifierBytes },
      ),
    )
    for (const group of groups)
      for (const check of group.checks) expect(check.kind, JSON.stringify(check)).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const p of profiles) {
      await pg.exec(
        `CREATE TABLE witness_${p.name}(a text,b text,bypass boolean,CHECK(CASE WHEN bypass THEN true ELSE ${p.sql} END))`,
      )
      const add = (context: string, a: Input, b: Input, expected: Outcome, bypass = false) => {
        for (const origin of ['source', 'stored'])
          fixtures.push({
            name: `${context}_${p.name}_${origin}`,
            row: { a, b, bypass: value(bypass) },
            expected,
          })
      }
      for (const [a, b] of rows) {
        let native: Outcome
        try {
          const result = (
            await pg.query<{ value: boolean | null }>(
              `SELECT (${p.sql}) value FROM (SELECT $1::text a,$2::text b) args`,
              [a, b],
            )
          ).rows[0]!.value
          native = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
        } catch (cause) {
          native = failure((cause as { code: string }).code)
        }
        let code: string | undefined
        try {
          await pg.query(`INSERT INTO witness_${p.name} VALUES($1,$2,false)`, [a, b])
        } catch (cause) {
          code = (cause as { code: string }).code
        }
        // A SELECT folds a NULL subject before the escape is translated; a CHECK reads a column.
        if ('escapeFails' in p && code !== undefined && code !== '23514') native = failure(code)
        expect(code, `${p.name} ${a} ${b}`).toBe(
          native.kind === 'False' ? '23514' : native.kind === 'Error' ? code : undefined,
        )
        const ascii = [a, b].every((s) => s === null || /^[\x00-\x7f]*$/u.test(s))
        for (const { name, context, ascii: asciiOnly } of contexts) {
          if (asciiOnly && !ascii) continue
          // Case mapping cannot raise, so a NULL beside its deferred result still decides a strict
          // comparison.
          const decided =
            a === null ||
            b === null ||
            'explicit' in p ||
            'ctypeFree' in p ||
            'escapeFails' in p ||
            context.defaultCtype === 'C'
          add(
            name,
            a === null ? nil : value(a),
            b === null ? nil : value(b),
            decided ? native : { kind: 'Unknown' },
          )
        }
      }
      for (const { name } of contexts) {
        add(name, unknown, unknown, { kind: 'Unknown' })
        add(name, unknown, nil, { kind: 'Null' })
        add(name, failure('22012'), nil, failure('22012'))
        add(name, failure('22012'), unknown, { kind: 'True' }, true)
        add(name, unknown, value('a'), { kind: 'True' }, true)
      }
    }
    const evaluatorSource = groups.map((g) => g.evaluatorSource!).join('\n')
    const callables = [
      ...new Set([...evaluatorSource.matchAll(/\b(sql__\w+)\(/gu)].map((m) => m[1]!)),
    ]
    await runCheckParity(
      directory,
      'pgsid-default-ctype',
      {
        checks: groups.flatMap((g) => g.checks),
        evaluatorSource,
        source: assembleCheckRust({ source: evaluatorSource, callables }),
        requiresRegex: groups.some((g) => g.requiresRegex),
      },
      names,
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 360000)
