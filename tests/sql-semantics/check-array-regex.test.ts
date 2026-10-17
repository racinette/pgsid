import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (state: string): Outcome => ({ kind: 'Error', value: { state: parseInt(state, 36) } })

it('returns owned regex capture/split arrays with PostgreSQL boundaries, flags, composition, strict states and preparation in every target', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-regex-'))
  try {
    const functions = builtinCallables().filter(
      (f) =>
        f.kind === 'function' &&
        f.schema === 'pg_catalog' &&
        ['regexp_match', 'regexp_split_to_array'].includes(f.name),
    )
    expect(functions).toHaveLength(4)
    expect(
      functions.every(
        (f) => f.strict && f.volatility === 'i' && !f.returnsSet && f.result === 'pg_catalog._text',
      ),
    ).toBe(true)
    const forms: Record<string, string> = {},
      calls: Record<string, string> = {}
    for (const fn of functions) {
      const key = fn.name + '_' + fn.args.length
      const call = `pg_catalog.${fn.name}(subject COLLATE "C",pattern COLLATE "C"${fn.args.length === 3 ? ',flags' : ''})`
      calls[key] = call
      Object.assign(forms, {
        [key + '_eq']: `${call} IS NOT DISTINCT FROM recorded::text[]`,
        [key + '_cardinality']: `cardinality(${call}) = cardinality(recorded::text[])`,
        [key + '_dims']: `array_dims(${call}) IS NOT DISTINCT FROM array_dims(recorded::text[])`,
        [key + '_first']: `(${call})[1] IS NOT DISTINCT FROM (recorded::text[])[1]`,
        [key + '_slice']: `(${call})[1:2] IS NOT DISTINCT FROM (recorded::text[])[1:2]`,
        [key + '_any']: `'a' = ANY(${call})`,
        [key + '_json']: `to_jsonb(${call}) IS NOT DISTINCT FROM to_jsonb(recorded::text[])`,
        [key + '_coalesce']:
          `COALESCE(${call},ARRAY['absent']) IS NOT DISTINCT FROM COALESCE(recorded::text[],ARRAY['absent'])`,
        [key + '_owned']:
          `array_reverse(${call}) IS NOT DISTINCT FROM array_reverse(recorded::text[])`,
        [key + '_lazy']: `CASE WHEN bypass THEN true ELSE cardinality(${call}) > 0 END`,
      })
    }
    Object.assign(forms, {
      null_argument: `regexp_match(NULL::text,pattern COLLATE "C",flags) IS NULL`,
      eager_argument: `regexp_match(NULL::text,substring(subject COLLATE "C",1,divisor)) IS NULL`,
      computed: `cardinality(ARRAY[regexp_match(subject COLLATE "C",pattern COLLATE "C",flags)]) > 0`,
      prepared: `CASE WHEN bypass THEN true ELSE regexp_match('a' COLLATE "C",'[') IS NULL END`,
      pruned: `CASE WHEN true THEN true ELSE regexp_match('a' COLLATE "C",'[') IS NULL END`,
    })
    await pg.exec(
      'CREATE TABLE regex_arrays(subject text COLLATE "C",pattern text COLLATE "C",flags text,recorded text,bypass boolean,divisor integer);CREATE TABLE regex_array_oracle(LIKE regex_arrays);',
    )
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(`ALTER TABLE regex_arrays ADD CONSTRAINT "${name}" CHECK(${sql}) NOT VALID`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'regex_arrays')!
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
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      arrayNulls: true,
    })
    for (const [i, check] of group.checks.entries())
      expect(
        check.kind,
        plans[i]!.identity.constraint + ('reason' in check ? check.reason : ''),
      ).toBe('supported')
    const samples: [string | null, string | null, string | null][] = [
      ['abc', 'b', ''],
      ['abc', 'x', ''],
      ['abc', '(a)(b)(z)?', ''],
      ['b', '(a)?(b)', ''],
      ['a', '(a*)()', ''],
      ['ababa', '(a)(b)', ''],
      ['foo123bar', '([a-z]+)([0-9]+)', ''],
      ['é🙂a', '(é)(🙂)(.)', ''],
      ['', '', ''],
      ['abc', '', ''],
      ['abc', '^|$', ''],
      ['abc', 'x*', ''],
      ['ab', 'a*', ''],
      ['aaa', 'a*', ''],
      [' abc ', ' +', ''],
      ['a,,b,', ',', ''],
      [',a,', ',', ''],
      ['a,b', '(,)', ''],
      ['abc', '(?=b)', ''],
      ['ab', 'a|(?=b)', ''],
      ['aaab', 'a+|$', ''],
      ['a\nb', '^|$', 'n'],
      ['a\nb', '^|$', 'w'],
      ['a\nb', '.', 'p'],
      ['ABC', '(a)(b)', 'i'],
      ['ABC', '(a)(b)', 'ic'],
      ['ABC', '(A)(B)', 'ci'],
      ['a b', 'a b', 'q'],
      ['a b', 'a # ignored\n b', 'x'],
      ['abc', '[', ''],
      ['abc', '(', ''],
      ['abc', 'x', 'g'],
      ['abc', '[', 'g'],
      ['abc', 'x', '?'],
      ['abc', '[', '?'],
      ['abc', 'x', 'qg'],
      ['abc', 'a+', 'b'],
      ['a+', 'a+', 'b'],
      ['aa', 'a+', 'e'],
      ['a+', 'a+', 'e'],
      ['aa', 'a+', 'be'],
      ['aa', 'a+', 'eb'],
      [null, '[', 'g'],
      ['a', null, 'g'],
      ['a', '[', null],
      ['abc', '[[:digit:]]', ''],
      ['abc', '(.)\\1', ''],
      ['abab', '(ab)\\1', ''],
      ['abc', '(?:a)(b)', ''],
      ['ab', '(a|(b))', ''],
      ['aaa', '(a)*', ''],
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations: unknown[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const origin of ['source', 'stored'])
        fixtures.push({ name: name + '_' + origin, row: { ...row }, expected })
    }
    const observe = async (name: string, values: (string | number | boolean | null)[]) => {
      await pg.query('TRUNCATE regex_array_oracle')
      await pg.query('INSERT INTO regex_array_oracle VALUES($1,$2,$3,$4,$5,$6)', values)
      let expected: Outcome
      try {
        const value = (
          await pg.query<{ value: boolean | null }>(
            `SELECT (${forms[name]!}) AS value FROM regex_array_oracle`,
          )
        ).rows[0]!.value
        expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
      } catch (caught) {
        expected = error((caught as { code: string }).code)
      }
      const row = Object.fromEntries(
        ['subject', 'pattern', 'flags', 'recorded', 'bypass', 'divisor'].map((k, i) => [
          k,
          known(values[i]!),
        ]),
      )
      add(name, row, expected)
      observations.push({ name, values, expected })
    }
    for (const [key, call] of Object.entries(calls))
      for (const sample of samples) {
        let recorded: string | null = null
        try {
          recorded = (
            await pg.query<{ value: string | null }>(
              `SELECT (${call})::text AS value FROM (SELECT $1::text subject,$2::text pattern,$3::text flags) s`,
              sample,
            )
          ).rows[0]!.value
        } catch {
          /* Each expression below records the oracle error. */
        }
        for (const name of Object.keys(forms).filter((name) => name.startsWith(key + '_')))
          await observe(name, [...sample, recorded, false, 1])
        for (const suffix of ['eq', 'owned'])
          await observe(key + '_' + suffix, [...sample, '{wrong}', false, 1])
        await observe(key + '_lazy', [...sample, recorded, true, 1])
      }
    for (const name of ['null_argument', 'eager_argument', 'computed', 'prepared', 'pruned'])
      for (const sample of [samples[0]!, samples[29]!, [null, '[', 'g'] as [null, string, string]])
        for (const bypass of [false, true]) await observe(name, [...sample, '{a}', bypass, -1])
    const base: Row = {
      subject: known('abc'),
      pattern: known('(a)(b)'),
      flags: known(''),
      recorded: known('{a,b}'),
      bypass: known(false),
      divisor: known(1),
    }
    for (const key of Object.keys(calls)) {
      const consumed = key.endsWith('_3') ? ['subject', 'pattern', 'flags'] : ['subject', 'pattern']
      for (const missing of consumed)
        add(
          key + '_eq',
          {
            ...base,
            [missing]: { kind: 'Unknown' },
            [missing === 'subject' ? 'pattern' : 'subject']: known(null),
            recorded: known(null),
          },
          { kind: 'True' },
        )
      add(
        key + '_lazy',
        {
          ...base,
          subject: { kind: 'Error', value: { state: parseInt('22003', 36) } },
          bypass: known(true),
        },
        { kind: 'True' },
      )
      for (const missing of consumed)
        add(key + '_eq', { ...base, [missing]: { kind: 'Unknown' } }, { kind: 'Unknown' })
      for (const missing of consumed)
        add(
          key + '_lazy',
          { ...base, [missing]: { kind: 'Unknown' }, bypass: known(true) },
          { kind: 'True' },
        )
      add(
        key + '_eq',
        {
          ...base,
          subject: { kind: 'Error', value: { state: parseInt('22003', 36) } },
          pattern: { kind: 'Error', value: { state: parseInt('22012', 36) } },
        },
        error('22003'),
      )
      add(
        key + '_eq',
        {
          ...base,
          subject: known(null),
          pattern: { kind: 'Error', value: { state: parseInt('22012', 36) } },
        },
        error('22012'),
      )
    }
    await mkdir('artifacts/goal-checks/array-regex', { recursive: true })
    await writeFile(
      'artifacts/goal-checks/array-regex/observations.json',
      JSON.stringify(observations, null, 2) + '\n',
    )
    await writeFile('artifacts/goal-checks/array-regex/evaluator.rs', group.evaluatorSource!)
    await runCheckParity(
      directory,
      'arrayregex',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
    await writeFile(
      'artifacts/goal-checks/array-regex/measurements.json',
      JSON.stringify(
        {
          forms: Object.keys(forms).length,
          fixtures: fixtures.length,
          postgresObservations: observations.length,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)
