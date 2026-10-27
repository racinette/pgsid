import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { callableIdentity } from '../../src/postgres/builtins/catalog.js'
import { isLegacySimilarCallable } from '../../src/sql-semantics/text-similar-callables.js'
import { supportsTextCallableCollation } from '../../src/sql-semantics/collation.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'

const packet = 'artifacts/goal-checks/similar-legacy-active'
const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const fail = (code: string): Extract<Outcome, { kind: 'Error' }> => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})

it('admits only the native legacy scalar signature independently of collation', () => {
  const candidates = builtinCallables().filter(isLegacySimilarCallable)
  expect(candidates).toHaveLength(1)
  const fn = candidates[0]!
  for (const kind of [undefined, 'C', 'deterministic', 'other'] as const)
    expect(supportsTextCallableCollation(callableIdentity(fn), kind)).toBe(true)
  expect(isLegacySimilarCallable({ ...fn, schema: 'public' })).toBe(false)
  expect(isLegacySimilarCallable({ ...fn, args: ['pg_catalog.text'] })).toBe(false)
  expect(isLegacySimilarCallable({ ...fn, result: 'pg_catalog.bool' })).toBe(false)
  if (fn.kind === 'function') {
    expect(isLegacySimilarCallable({ ...fn, strict: true })).toBe(false)
    expect(isLegacySimilarCallable({ ...fn, returnsSet: true })).toBe(false)
    expect(isLegacySimilarCallable({ ...fn, volatility: 's' })).toBe(false)
  }
})

it('matches legacy NULL escapes, conversion errors and eager arguments in Rust and both targets', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-similar-legacy-'))
  try {
    await pg.exec(`CREATE COLLATION deterministic_order (provider=icu,locale='und',deterministic=true);
      CREATE COLLATION insensitive_order (provider=icu,locale='und',deterministic=false)`)
    const collations = [
      'pg_catalog."default"',
      'pg_catalog."C"',
      'deterministic_order',
      'insensitive_order',
    ]
    const expressions = {
      result:
        'pg_catalog.similar_escape(pattern,escape) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C"',
      nullness: 'pg_catalog.similar_escape(pattern,escape) IS NULL',
      eager: 'pg_catalog.similar_escape(NULL::text,(amount/denominator)::text) IS NULL',
      error_order:
        'pg_catalog.similar_escape((amount/denominator)::text,(2147483647+amount)::text) IS NOT NULL',
      strict_difference: 'pg_catalog.similar_to_escape(pattern,escape) IS NULL',
    }
    for (const [index, collation] of collations.entries())
      await pg.exec(`CREATE TABLE legacy_similar_${index}(pattern text COLLATE ${collation},escape text COLLATE ${collation},expected text COLLATE "C",amount int,denominator int,bypass bool,
        ${Object.entries(expressions)
          .map(
            ([name, expression]) =>
              `CONSTRAINT ${name} CHECK(CASE WHEN bypass THEN true ELSE ${expression} END)`,
          )
          .join(',')})`)
    const catalog = await snapshotCatalog(pg),
      plans: Parameters<typeof prepareCheckRustGroup>[0][number][] = [],
      names: string[] = []
    for (const index of collations.keys()) {
      const table = catalog.tables.find((t) => t.name === 'legacy_similar_' + index)!
      for (const [constraint, expression] of Object.entries(expressions))
        for (const origin of ['source', 'stored'] as const) {
          const lowered = lowerTableCheck(
            table,
            table.constraints.find((c) => c.name === constraint)!,
            [],
            catalog.domains,
            origin,
            catalog.rangeTypes,
            catalog.compositeTypeGraph,
            origin === 'source'
              ? `CHECK(CASE WHEN bypass THEN true ELSE ${expression} END)`
              : undefined,
          )!
          expect(hasUncertain(lowered.expression), constraint + origin).toBe(false)
          const name = `${table.name}_${constraint}_${origin}`
          names.push(name)
          plans.push({
            identity: { schema: 'public', kind: 'table', owner: table.name, constraint: name },
            expression: lowered.expression,
          })
        }
    }
    const group = prepareCheckRustGroup(plans, { defaultCollation: 'C' })
    expect(group.requiresRegex).toBe(false)
    for (const [index, check] of group.checks.entries())
      expect(check.kind, names[index]).toBe('supported')
    const patterns = [
      '',
      '%',
      '_',
      'abc',
      'a.b^c$d',
      '(ab|cd)',
      '[%_]',
      '[^]a]',
      '[[:alpha:]]',
      String.raw`a\%b`,
      String.raw`a\"b\"c`,
      String.raw`a\"b\"c\"d`,
      'a\\',
      'é😊中',
      '😊"a😊"',
      null,
    ]
    const escapes = [null, '', '\\', '#', 'é', '😊', 'ab', 'é😊']
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations: unknown[] = [],
      errors = new Set<string>()
    for (const [index, collation] of collations.entries())
      for (const pattern of patterns)
        for (const escape of escapes) {
          let rendered: string | null = null
          try {
            rendered = (
              await pg.query<{ value: string | null }>(
                'SELECT pg_catalog.similar_escape($1::text,$2::text) value',
                [pattern, escape],
              )
            ).rows[0]!.value
          } catch (error) {
            if (!(error as { code?: string }).code) throw error
          }
          const row: Row = {
            pattern: known(pattern),
            escape: known(escape),
            expected: known(rendered),
            amount: known(0),
            denominator: known(1),
            bypass: known(false),
          }
          for (const [constraint, expression] of Object.entries(expressions)) {
            let expected: Outcome
            try {
              const value = (
                await pg.query<{ value: boolean | null }>(
                  `SELECT ${expression} value FROM(SELECT $1::text COLLATE ${collation} pattern,$2::text COLLATE ${collation} escape,$3::text COLLATE "C" expected,0::int amount,1::int denominator) args`,
                  [pattern, escape, rendered],
                )
              ).rows[0]!.value
              expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
            } catch (error) {
              const code = (error as { code?: string }).code
              if (!code) throw error
              errors.add(code)
              expected = fail(code)
            }
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: `legacy_similar_${index}_${constraint}_${origin}`,
                row,
                expected,
              })
            observations.push({ index, pattern, escape, constraint, rendered, expected })
          }
          if (rendered !== null)
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: `legacy_similar_${index}_result_${origin}`,
                row: { ...row, expected: known(rendered + '!') },
                expected: { kind: 'False' },
              })
        }
    expect([...errors].sort()).toEqual(['2200C', '22025'])
    const row: Row = {
      pattern: known('%'),
      escape: known(null),
      expected: known('^(?:.*)$'),
      amount: known(0),
      denominator: known(1),
      bypass: known(false),
    }
    const partial: { values: Partial<Row>; result: Outcome; nullness: Outcome }[] = [
      {
        values: { pattern: known(null), escape: { kind: 'Unknown' }, expected: known(null) },
        result: { kind: 'True' },
        nullness: { kind: 'True' },
      },
      {
        values: { pattern: known(null), escape: known('ab'), expected: known(null) },
        result: { kind: 'True' },
        nullness: { kind: 'True' },
      },
      {
        values: { pattern: { kind: 'Unknown' } },
        result: { kind: 'Unknown' },
        nullness: { kind: 'Unknown' },
      },
      {
        values: { pattern: known(null), escape: fail('22003') as Input },
        result: fail('22003'),
        nullness: fail('22003'),
      },
      {
        values: { pattern: { kind: 'Unknown' }, escape: fail('22012') as Input },
        result: fail('22012'),
        nullness: fail('22012'),
      },
      {
        values: { pattern: fail('22003') as Input, escape: fail('22012') as Input },
        result: fail('22003'),
        nullness: fail('22003'),
      },
    ]
    for (const index of collations.keys())
      for (const origin of ['source', 'stored']) {
        for (const sample of partial)
          for (const constraint of ['result', 'nullness'] as const)
            fixtures.push({
              name: `legacy_similar_${index}_${constraint}_${origin}`,
              row: { ...row, ...sample.values } as Row,
              expected: sample[constraint],
            })
        for (const constraint of ['eager', 'error_order']) {
          for (const [amount, denominator, expected] of [
            [0, 0, fail('22012')],
            [1, 0, fail('22012')],
            [1, 1, constraint === 'eager' ? { kind: 'True' as const } : fail('22003')],
          ] as const) {
            const native = pg.query<{ value: boolean }>(
              `SELECT ${expressions[constraint as 'eager' | 'error_order']} value FROM(SELECT $1::int amount,$2::int denominator) args`,
              [amount, denominator],
            )
            if (expected.kind === 'Error')
              await expect(native).rejects.toMatchObject({
                code: expected.value.state.toString(36).toUpperCase().padStart(5, '0'),
              })
            else expect((await native).rows[0]!.value).toBe(true)
            fixtures.push({
              name: `legacy_similar_${index}_${constraint}_${origin}`,
              row: { ...row, amount: known(amount), denominator: known(denominator) },
              expected,
            })
          }
        }
        for (const constraint of Object.keys(expressions))
          fixtures.push({
            name: `legacy_similar_${index}_${constraint}_${origin}`,
            row: {
              ...row,
              pattern: fail('22003') as Input,
              escape: fail('22012') as Input,
              bypass: known(true),
            },
            expected: { kind: 'True' },
          })
      }
    await expect(
      pg.query("SELECT pg_catalog.similar_escape('x' COLLATE \"C\",'x' COLLATE insensitive_order)"),
    ).rejects.toMatchObject({ code: '42P21' })
    const conflict = lowerTableCheck(
      catalog.tables.find((t) => t.name === 'legacy_similar_0')!,
      {
        name: 'conflict',
        type: 'check',
        definition:
          'CHECK(pg_catalog.similar_escape(pattern COLLATE "C",escape COLLATE insensitive_order) IS NULL)',
      },
    )!
    expect(hasUncertain(conflict.expression)).toBe(true)
    await mkdir(packet, { recursive: true })
    await writeFile(packet + '/evaluators.rs', group.evaluatorSource!)
    await writeFile(
      packet + '/summary.json',
      JSON.stringify({ checks: plans.length, fixtures: fixtures.length, observations }, null, 2) +
        '\n',
    )
    await runCheckParity(directory, 'similar_legacy', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
})

it('composes legacy conversion with the existing regex matcher', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-similar-legacy-match-'))
  try {
    const expression =
      'CASE WHEN bypass THEN true ELSE label ~ pg_catalog.similar_escape(pattern,escape) END'
    await pg.exec(
      `CREATE TABLE legacy_similar_match(label text COLLATE "C",pattern text COLLATE "C",escape text COLLATE "C",bypass bool,CONSTRAINT matches CHECK(${expression}))`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'legacy_similar_match')!,
      plans = (['source', 'stored'] as const).map((origin) => {
        const lowered = lowerTableCheck(
          table,
          table.constraints[0]!,
          [],
          catalog.domains,
          origin,
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
          origin === 'source' ? `CHECK(${expression})` : undefined,
        )!
        expect(hasUncertain(lowered.expression)).toBe(false)
        return {
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: 'matches_' + origin,
          },
          expression: lowered.expression,
        }
      }),
      group = prepareCheckRustGroup(plans)
    expect(group.requiresRegex).toBe(true)
    for (const check of group.checks) expect(check.kind).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      outcomes = new Set<string>()
    for (const label of ['abc', 'a%b', '', null])
      for (const pattern of ['%', '_', String.raw`a\%b`, '[a-z]+', String.raw`\"a\"b\"`, null])
        for (const escape of [null, '', '#', 'ab']) {
          let expected: Outcome
          try {
            const value = (
              await pg.query<{ value: boolean | null }>(
                `WITH args AS MATERIALIZED (SELECT $1::text COLLATE "C" label,$2::text COLLATE "C" pattern,$3::text COLLATE "C" escape,false bypass) SELECT ${expression} value FROM args`,
                [label, pattern, escape],
              )
            ).rows[0]!.value
            expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
          } catch (error) {
            const code = (error as { code?: string }).code
            if (!code) throw error
            expected = fail(code)
          }
          outcomes.add(expected.kind)
          for (const plan of plans)
            fixtures.push({
              name: plan.identity.constraint,
              row: {
                label: known(label),
                pattern: known(pattern),
                escape: known(escape),
                bypass: known(false),
              },
              expected,
            })
        }
    expect([...outcomes].sort()).toEqual(['Error', 'False', 'Null', 'True'])
    for (const plan of plans)
      fixtures.push({
        name: plan.identity.constraint,
        row: {
          label: { kind: 'Unknown' },
          pattern: { kind: 'Unknown' },
          escape: fail('22003'),
          bypass: known(true),
        },
        expected: { kind: 'True' },
      })
    await writeFile(
      packet + '/match-summary.json',
      JSON.stringify({ checks: plans.length, fixtures: fixtures.length }, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'similar_legacy_match',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
})
