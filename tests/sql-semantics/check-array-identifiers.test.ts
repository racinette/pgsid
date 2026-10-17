import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { callableIdentity } from '../../src/postgres/builtins/catalog.js'
import { arrayValueRequirements } from '../../scripts/check-measurements/arrays.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { supportsTextCallableCollation } from '../../src/sql-semantics/collation.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (code: string): Outcome => ({ kind: 'Error', value: { state: parseInt(code, 36) } })

it('parses identifier arrays, scanner whitespace, quotes, ASCII/high-bit names, strict suffixes, defaults and composition in Rust, Go and TypeScript', async () => {
  const functions = builtinCallables().filter(
    (f) => f.kind === 'function' && f.schema === 'pg_catalog' && f.name === 'parse_ident',
  )
  expect(functions).toHaveLength(1)
  const fn = functions[0]!
  expect(fn).toMatchObject({
    args: ['pg_catalog.text', 'pg_catalog.bool'],
    result: 'pg_catalog._text',
    strict: true,
    volatility: 'i',
    returnsSet: false,
    numArgDefaults: 1,
    defaultArguments: 'true',
  })
  for (const c of [undefined, 'C', 'deterministic', 'other'])
    expect(supportsTextCallableCollation(callableIdentity(fn), c)).toBe(true)
  expect(arrayValueRequirements(fn)).toEqual([
    expect.objectContaining({
      kind: 'encoding',
      owner: 'tests/sql-semantics/check-array-identifiers.test.ts',
    }),
  ])
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-identifiers-'))
  try {
    const calls = {
      automatic: 'parse_ident(payload)',
      explicit: 'parse_ident(payload,strict_mode)',
      relaxed: 'parse_ident(payload,false)',
    }
    const forms: Record<string, string> = {}
    for (const [key, call] of Object.entries(calls))
      Object.assign(forms, {
        [key + '_eq']: `${call} IS NOT DISTINCT FROM recorded::text[]`,
        [key + '_count']: `cardinality(${call}) IS NOT DISTINCT FROM cardinality(recorded::text[])`,
        [key + '_dims']: `array_dims(${call}) IS NOT DISTINCT FROM array_dims(recorded::text[])`,
        [key + '_first']: `(${call})[1] IS NOT DISTINCT FROM (recorded::text[])[1]`,
        [key + '_slice']: `(${call})[1:2] IS NOT DISTINCT FROM (recorded::text[])[1:2]`,
        [key + '_json']: `to_jsonb(${call}) IS NOT DISTINCT FROM to_jsonb(recorded::text[])`,
        [key + '_owned']:
          `array_reverse(${call}) IS NOT DISTINCT FROM array_reverse(recorded::text[])`,
        [key + '_lazy']:
          `CASE WHEN bypass THEN true ELSE ${call} IS NOT DISTINCT FROM recorded::text[] END`,
      })
    Object.assign(forms, {
      icu: 'to_jsonb(parse_ident(payload COLLATE identifier_icu,strict_mode)) IS NOT DISTINCT FROM to_jsonb(recorded::text[])',
      insensitive:
        'to_jsonb(parse_ident(payload COLLATE identifier_insensitive,strict_mode)) IS NOT DISTINCT FROM to_jsonb(recorded::text[])',
      null_argument: 'parse_ident(substring(payload,1,width),NULL::boolean) IS NULL',
      eager_argument: 'parse_ident(payload,quantity/divisor>0) IS NULL',
      computed: 'cardinality(ARRAY[parse_ident(payload,strict_mode)]) > 0',
      prepared: `CASE WHEN bypass THEN true ELSE parse_ident('""') IS NULL END`,
      pruned: `CASE WHEN true THEN true ELSE parse_ident('""') IS NULL END`,
    })
    await pg.exec(
      `CREATE COLLATION identifier_icu(provider=icu,locale='und',deterministic=true); CREATE COLLATION identifier_insensitive(provider=icu,locale='und',deterministic=false); CREATE TABLE identifier_arrays(payload text,strict_mode boolean,recorded text,bypass boolean,width integer,quantity integer,divisor integer);CREATE TABLE identifier_oracle(LIKE identifier_arrays);`,
    )
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(
        `ALTER TABLE identifier_arrays ADD CONSTRAINT "${name}" CHECK(${sql}) NOT VALID`,
      )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'identifier_arrays')!
    const plans = Object.entries(forms).flatMap(([name, sql]) =>
      (['source', 'stored'] as const).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: name + '_' + origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'source'
              ? { name, type: 'check', definition: `CHECK(${sql})` }
              : table.constraints.find((c) => c.name === name)!,
            catalog.enums,
            catalog.domains,
            origin,
          )!.expression,
        ),
      })),
    )
    for (const plan of plans)
      expect(hasUncertain(plan.expression), plan.identity.constraint).toBe(false)
    const samples: (string | null)[] = [
      null,
      '',
      ' ',
      '\t\n\r\v\f',
      'a',
      'ABC',
      '_',
      '_A$1',
      'select',
      'null',
      'true',
      'a.b',
      'a.b.c.d.e.f.g',
      'a . "Mixed.Case" ._X',
      '"SomeSchema".someTable',
      '"a""b"',
      '""""',
      '" A . \n B "',
      '"a\\b"',
      'ÉTÉ.İ.Σ.雪.🙂',
      '"ÉTÉ".ABC',
      '"雪🙂"',
      'a\u00a0B',
      '\u00a0',
      'a\u2028B',
      'A'.repeat(128),
      '"' + 'É'.repeat(80) + '"',
      '.',
      '.a',
      'a.',
      'a..b',
      'a. .b',
      'a . \t',
      '""',
      '"',
      '"unclosed',
      'a.""',
      'a."unterminated',
      '1abc',
      '$abc',
      'a$b1',
      'a.b()',
      'a trailing',
      '"a"trailing',
      'a/*comment*/.b',
      'a--comment\nb',
      'a . --comment',
      'U&"foo"',
      'a;SELECT x',
      'a, b',
      "a'quote",
      'a[1]',
      'a::text',
      '"a".bé',
      '"A".B.É',
      '"A"é',
    ]
    const observations: unknown[] = []
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const origin of ['source', 'stored'])
        fixtures.push({ name: name + '_' + origin, row: { ...row }, expected })
    }
    const observe = async (
      name: string,
      payload: string | null,
      mode: boolean | null,
      recorded: string | null,
      bypass = false,
      width = 1,
      quantity = 1,
      divisor = 1,
    ) => {
      const values = [payload, mode, recorded, bypass, width, quantity, divisor]
      await pg.exec('TRUNCATE identifier_oracle')
      await pg.query('INSERT INTO identifier_oracle VALUES($1,$2,$3,$4,$5,$6,$7)', values)
      let expected: Outcome
      try {
        const v = (
          await pg.query<{ value: boolean | null }>(
            `SELECT (${forms[name]!}) AS value FROM identifier_oracle`,
          )
        ).rows[0]!.value
        expected = { kind: v === null ? 'Null' : v ? 'True' : 'False' }
      } catch (caught) {
        expected = error((caught as { code: string }).code)
      }
      const row = Object.fromEntries(
        ['payload', 'strict_mode', 'recorded', 'bypass', 'width', 'quantity', 'divisor'].map(
          (k, i) => [k, known(values[i]!)],
        ),
      )
      add(name, row, expected)
      observations.push({ name, values, expected })
    }
    for (const [key, call] of Object.entries(calls))
      for (const payload of samples)
        for (const mode of key === 'explicit' ? [true, false, null] : [true]) {
          let recorded: string | null = null
          try {
            recorded = (
              await pg.query<{ value: string | null }>(
                `SELECT (${call})::text value FROM (SELECT $1::text payload,$2::boolean strict_mode) s`,
                [payload, mode],
              )
            ).rows[0]!.value
          } catch {
            recorded = null
          }
          for (const name of Object.keys(forms).filter((n) => n.startsWith(key + '_')))
            await observe(name, payload, mode, recorded)
          await observe(key + '_eq', payload, mode, '{wrong}')
          await observe(key + '_lazy', payload, mode, recorded, true)
        }
    for (const payload of ['ABC', 'ÉTÉ', '"MIXED".ABC', 'a trailing', '"雪🙂"'])
      for (const mode of [false, true]) {
        let recorded: string | null = null
        try {
          recorded = (
            await pg.query<{ value: string }>('SELECT parse_ident($1,$2)::text value', [
              payload,
              mode,
            ])
          ).rows[0]!.value
        } catch {
          recorded = null
        }
        for (const name of ['icu', 'insensitive']) await observe(name, payload, mode, recorded)
      }
    for (let code = 1; code < 128; code++)
      for (const payload of [String.fromCharCode(code), `A${String.fromCharCode(code)}B`])
        for (const mode of [false, true]) {
          let recorded: string | null = null
          try {
            recorded = (
              await pg.query<{ value: string | null }>('SELECT parse_ident($1,$2)::text value', [
                payload,
                mode,
              ])
            ).rows[0]!.value
          } catch {
            recorded = null
          }
          await observe('explicit_eq', payload, mode, recorded)
        }
    for (const payload of ['a.b', '.', null])
      for (const mode of [true, false, null])
        for (const bypass of [false, true])
          for (const name of ['null_argument', 'eager_argument', 'computed', 'prepared', 'pruned'])
            await observe(name, payload, mode, '{a,b}', bypass, -1, 1, 0)
    const base: Row = {
      payload: known('a.b'),
      strict_mode: known(true),
      recorded: known('{a,b}'),
      bypass: known(false),
      width: known(1),
      quantity: known(1),
      divisor: known(1),
    }
    for (const key of Object.keys(calls)) {
      add(key + '_eq', { ...base, payload: { kind: 'Unknown' } }, { kind: 'Unknown' })
      add(
        key + '_lazy',
        {
          ...base,
          payload: { kind: 'Error', value: { state: parseInt('22003', 36) } },
          bypass: known(true),
        },
        { kind: 'True' },
      )
      add(
        key + '_eq',
        { ...base, payload: { kind: 'Error', value: { state: parseInt('22003', 36) } } },
        error('22003'),
      )
    }
    add(
      'explicit_eq',
      { ...base, payload: { kind: 'Unknown' }, strict_mode: known(null), recorded: known(null) },
      { kind: 'True' },
    )
    add(
      'explicit_eq',
      { ...base, payload: known(null), strict_mode: { kind: 'Unknown' }, recorded: known(null) },
      { kind: 'True' },
    )
    add(
      'explicit_eq',
      {
        ...base,
        payload: known(null),
        strict_mode: { kind: 'Error', value: { state: parseInt('22012', 36) } },
      },
      error('22012'),
    )
    add(
      'explicit_eq',
      {
        ...base,
        payload: { kind: 'Error', value: { state: parseInt('22003', 36) } },
        strict_mode: { kind: 'Error', value: { state: parseInt('22012', 36) } },
      },
      error('22003'),
    )
    await mkdir('artifacts/goal-checks/array-identifiers', { recursive: true })
    await writeFile(
      'artifacts/goal-checks/array-identifiers/observations.json',
      JSON.stringify(observations, null, 2) + '\n',
    )
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      arrayNulls: true,
    })
    for (const [i, c] of group.checks.entries())
      expect(c.kind, plans[i]!.identity.constraint + ('reason' in c ? c.reason : '')).toBe(
        'supported',
      )
    const main = join(directory, 'main')
    await mkdir(main)
    await runCheckParity(
      main,
      'arrayidentifiers',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
    await writeFile(
      'artifacts/goal-checks/array-identifiers/measurements.json',
      JSON.stringify(
        {
          forms: Object.keys(forms).length,
          fixtures: fixtures.length,
          postgresObservations: observations.length,
          asciiBoundaries: 127,
        },
        null,
        2,
      ) + '\n',
    )
    const contextPlans = plans.filter((p) =>
      ['eq', 'count', 'first', 'dims', 'lazy'].some((s) =>
        p.identity.constraint.startsWith('explicit_' + s + '_'),
      ),
    )
    const contextGroup = prepareCheckRustGroup(contextPlans, { arrayNulls: true })
    const contextFixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const [payload, recorded, kind] of [
      ['ABC._X', '{abc,_x}', 'True'],
      ['"ÉTÉ".ABC', '{ÉTÉ,abc}', 'True'],
      ['"雪🙂"', '{雪🙂}', 'True'],
      ['ÉTÉ', '{ÉTÉ}', 'Unknown'],
      ['"A".É', '{A,É}', 'Unknown'],
      ['É.', '{}', 'Unknown'],
      ['.É', '{}', 'Error'],
      ['a', '{a}', 'True'],
      ['"a" trailing É', '{a}', 'True'],
    ] as const)
      for (const plan of contextPlans) {
        const expected: Outcome = kind === 'Error' ? error('22023') : { kind }
        contextFixtures.push({
          name: plan.identity.constraint,
          row: {
            ...base,
            payload: known(payload),
            recorded: known(recorded),
            strict_mode: known(false),
          },
          expected,
        })
        if (plan.identity.constraint.includes('_lazy_'))
          contextFixtures.push({
            name: plan.identity.constraint,
            row: {
              ...base,
              payload: known(payload),
              recorded: known(recorded),
              bypass: known(true),
            },
            expected: { kind: 'True' },
          })
      }
    const context = join(directory, 'context')
    await mkdir(context)
    await runCheckParity(
      context,
      'arrayidentifiercontext',
      contextGroup,
      contextPlans.map((p) => p.identity.constraint),
      contextFixtures,
    )
    await writeFile(
      'artifacts/goal-checks/array-identifiers/context-measurements.json',
      JSON.stringify(
        { fixtures: contextFixtures.length, forms: contextPlans.length, missingEncoding: true },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)
