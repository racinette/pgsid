import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { PG18_RANGE_TYPES } from '../../src/postgres/builtins/type-ranges.generated.js'
import { arrayElementFamily } from '../../src/codegen/shared/check-array-types.js'
import {
  assembleCheckRust,
  type prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import {
  runCheckParity,
  type Row,
  type Outcome,
  type Input,
} from '../../tools/check-rust/parity.js'
import { multirangeInputForms } from './check-multirange-input-forms.js'
import { multirangeExactProbe } from './check-multirange-exact-probe.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'
import { rangeCoreSamples } from './check-range-fixtures.js'

it('parses multirange grammar and ordered members with exact canonical payloads in Rust, Go and TypeScript', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-multirange-input-values-'))
  try {
    await pg.exec("SET DateStyle='ISO,YMD';SET TimeZone='UTC'")
    const checks: ReturnType<typeof prepareCheckRustGroup>['checks'][number][] = [],
      entries: string[] = [],
      names: string[] = [],
      fixtures: { name: string; row: Row; expected: Outcome }[] = []
    let inserts = 0,
      cases = 0,
      mutationCases = 0
    const errors = new Set<string>(),
      cache = new Map<string, ReturnType<typeof readMultirangeFixture>>()
    const load = (type: string, text: string | null) => {
      const key = JSON.stringify([type, text])
      let p = cache.get(key)
      if (!p) {
        p = readMultirangeFixture(pg, type, text)
        cache.set(key, p)
      }
      return p
    }
    for (const [i, m] of Object.values(PG18_RANGE_TYPES).entries()) {
      const name = 'input_' + i,
        entryName = checkRustEntryName({
          schema: 'public',
          kind: 'table',
          owner: name,
          constraint: 'input',
        })
      names.push(name)
      entries.push(
        `pub fn ${entryName}(payload:TextValue,expected:MultirangeValue)->CheckOutcome {let actual=multirange_from_text(payload,"${m.multirange}","${m.identity}","${m.subtype.replaceAll('"', '\\"')}",${arrayElementFamily(m.subtype)});let result=multirange_fixture_exact(actual,expected);check_from_bool(result)}`,
      )
      checks.push({
        kind: 'supported',
        entryName,
        inputs: [
          { name: 'payload', rustName: 'payload', type: 'pg_catalog.text', rustType: 'TextValue' },
          {
            name: 'expected',
            rustName: 'expected',
            type: m.multirange,
            rustType: 'MultirangeValue',
          },
        ],
      })
      await pg.exec(
        `CREATE TABLE ${name}(payload text,expected ${m.multirange},CHECK(payload::${m.multirange} IS NOT DISTINCT FROM expected))`,
      )
      const temporal = [
          'pg_catalog.date',
          'pg_catalog."timestamp"',
          'pg_catalog.timestamptz',
        ].includes(m.subtype),
        offset = m.subtype === 'pg_catalog.timestamptz' ? ' 00:00+00' : ''
      const [a, b, c, d] = temporal
        ? ['2000-01-01', '2000-01-03', '2000-01-05', '2000-01-07'].map((s) => s + offset)
        : m.subtype === 'pg_catalog.int8'
          ? ['9007199254740993', '9007199254740995', '9007199254740997', '9007199254740999']
          : ['1', '3', '5', '7']
      const inventory = multirangeInputForms.find((f) => f.type === m.multirange)!
      const texts: (string | null)[] = [
        null,
        ...inventory.handled,
        ...inventory.rejected,
        ...rangeCoreSamples(m.identity)
          .ranges.filter((s): s is string => s !== null)
          .map((s) => `{${s}}`),
        `{[${c},${d}),[${a},${b}),[${b},${c})}`,
        `{empty,[${a},${b}),empty,[${a},${b})}`,
        `{["${a}","${b}")}`,
        `{[${a},${b}) , [${c},${d})}`,
        `\t{\n[${a},${b})\t,\vEMPTY\f}\r`,
        `{[${a},${b})junk}`,
        `{[${a},${b}),}`,
        `{[${a},${b})`,
        ` { [${a},${b}) } trailing`,
        `{["${a}\\ ",${b})}`,
        `{[${a}\\ ,${b})}`,
      ]
      if (!temporal) {
        texts.push(
          '{["1""",3)}',
          '{[1,3\\))}',
          '{[\\1,3)}',
          '{[1,\\3)}',
          '{[1\\],3)}',
          '{[1,3),[bad,5)}',
          '{[1,3),[4,5)}garbage',
        )
        if (m.subtype === 'pg_catalog.int4')
          texts.push(
            '{[2147483648,3)junk}',
            '{[2147483648,3),}',
            '{[2147483648,3}',
            '{[2147483647,)}',
            '{(2147483647,)}',
            '{(,2147483647]}',
            '{[bad,2147483648)}',
          )
        if (m.subtype === 'pg_catalog.int8')
          texts.push(
            '{[9223372036854775808,3)junk}',
            '{(9223372036854775807,)}',
            '{(,9223372036854775807]}',
          )
        if (m.subtype === 'pg_catalog."numeric"')
          texts.push('{[1.0000,3.0000),[1.0,3.0),[5.000,7.00]}', '{[NaN,Infinity]}', '{[NaN,NaN]}')
        if (m.subtype === 'pg_catalog.int4' || m.subtype === 'pg_catalog."numeric"') {
          const initial = '{[1,3),[5,9)}',
            characters = ['{', '}', ',', '"', '\\', '[', ']', '(', ')', ' ', '\t']
          for (let n = 0; n < initial.length; n++) {
            texts.push(initial.slice(0, n) + initial.slice(n + 1))
            mutationCases++
            for (const ch of characters) {
              texts.push(initial.slice(0, n) + ch + initial.slice(n))
              mutationCases++
            }
          }
        }
      }
      for (const text of [...new Set(texts)]) {
        let native: string | null = null,
          error: string | null = null
        try {
          native = (
            await pg.query<{ value: string | null }>(`SELECT $1::${m.multirange}::text value`, [
              text,
            ])
          ).rows[0]!.value
        } catch (e) {
          error = (e as { code: string }).code
          errors.add(error)
        }
        for (const mismatch of [false, true]) {
          const wanted = error ? null : mismatch ? (native === '{}' ? '{(,)}' : '{}') : native,
            expectedPayload = await load(m.multirange, wanted)
          let expected: Outcome
          try {
            await pg.query(`INSERT INTO ${name} VALUES($1,$2)`, [text, wanted])
            expected = { kind: 'True' }
          } catch (e) {
            const code = (e as { code: string }).code
            expected =
              code === '23514'
                ? { kind: 'False' }
                : { kind: 'Error', value: { state: parseInt(code, 36) } }
            if (error) expect(code, text ?? 'NULL').toBe(error)
          }
          fixtures.push({
            name,
            row: {
              payload: text === null ? { kind: 'Null' } : { kind: 'Value', value: text },
              expected: expectedPayload
                ? { kind: 'Value', value: expectedPayload }
                : { kind: 'Null' },
            },
            expected,
          })
          inserts++
        }
        cases++
      }
      for (const payload of [
        { kind: 'Unknown' },
        { kind: 'Error', value: { state: parseInt('22012', 36) } },
        { kind: 'Error', value: { state: parseInt('22003', 36) } },
      ] as Input[])
        fixtures.push({
          name,
          row: { payload, expected: { kind: 'Null' } },
          expected: payload as Outcome,
        })
    }
    const evaluatorSource = entries.join('\n'),
      source = assembleCheckRust({ source: evaluatorSource, callables: [] })
    source.modules
      .find((m) => m.name === 'pg_catalog')!
      .files.push({ path: 'tests/multirange_input_exact_probe.rs', source: multirangeExactProbe })
    await runCheckParity(
      directory,
      'multirangeinputvalues',
      { source, evaluatorSource, checks, requiresRegex: false },
      names,
      fixtures,
    )
    expect(fixtures).toHaveLength(inserts + 18)
    expect(cases).toBeGreaterThan(400)
    expect(mutationCases).toBeGreaterThan(200)
    expect(errors).toContain('22P02')
    expect(errors).toContain('22003')
    await mkdir('artifacts/check-multirange-input', { recursive: true })
    await writeFile(
      'artifacts/check-multirange-input/values-report.json',
      JSON.stringify(
        {
          inserts,
          cases,
          fixtures: fixtures.length,
          mutationCases,
          errors: [...errors].sort(),
          families: names.length,
          exactMembers: true,
          automaticBinding: 'separate owner',
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240000)
