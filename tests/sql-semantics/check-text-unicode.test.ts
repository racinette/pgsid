import { describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { callableIdentity, type FunctionMetadata } from '../../src/postgres/builtins/catalog.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { supportsTextCallableCollation } from '../../src/sql-semantics/collation.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const sourceNames = new Set(
  [
    ...readFileSync(
      'crates/check-evaluator/src/operations/pg_catalog/text_unicode.rs',
      'utf8',
    ).matchAll(/pub fn (sql__[a-z0-9_]+)\(/gu),
  ].map((match) => match[1]!),
)
const functions = builtinCallables().filter(
  (fn): fn is FunctionMetadata => fn.kind === 'function' && sourceNames.has(fn.rustName),
)
const input = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (state: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(state, 36) },
})
const samples: (string | null)[] = [
  null,
  '',
  'plain ASCII',
  'é',
  'e\u0301',
  '\u0344',
  '\u0f73',
  '\u1e9b\u0323',
  '\ufb01',
  '\ufdfa',
  '\u212b',
  '\u00a0',
  '\u1100\u1161\u11a8',
  '\uac00',
  '\uac01',
  '\u0315\u0300',
  'A\u0301\u0300',
  '\u0301A\u0300',
  'A\u0301\u0323',
  '\u0378',
  '\ue000',
  '\ufdd0',
  '\uffff',
  '\u{10ffff}',
  '\u{1f60a}',
  '\ufeff',
  '\ufeffe\u0301',
  '\t\n\r',
  '日e\u0301😊'.repeat(16),
]
const collations = ['"default"', '"C"', 'public.unicode_order', 'public.unicode_insensitive']
const profile = JSON.parse(
  readFileSync('vendor/postgresql-unicode/database-profile.json', 'utf8'),
) as { unicode: string; icu: string | null }
const expressions = {
  normalized: 'pg_catalog.normalize(label,normal_form) COLLATE "C" = recorded_text',
  normalized_octets:
    'pg_catalog.octet_length(pg_catalog.normalize(label,normal_form)) = recorded_octets',
  normalized_predicate: 'pg_catalog.is_normalized(label,normal_form) = recorded_bool',
  assigned: 'pg_catalog.unicode_assigned(label) = recorded_bool',
  database_version: 'pg_catalog.unicode_version() COLLATE "C" = recorded_text',
  icu_version: 'pg_catalog.icu_unicode_version() COLLATE "C" = recorded_text',
  mixed_regex:
    'pg_catalog.regexp_count(pg_catalog.normalize(label) COLLATE "C",pattern) = recorded_octets',
  default_normalized: 'normalize(label) COLLATE "C" = recorded_text',
  default_predicate: 'pg_catalog.is_normalized(label) = recorded_bool',
  sql_nfc: '(label IS NORMALIZED) = recorded_bool',
  sql_not_nfc: '(label IS NOT NORMALIZED) = NOT recorded_bool',
  sql_nfd: '(label IS NFD NORMALIZED) = recorded_bool',
  sql_nfkc: '(label IS NFKC NORMALIZED) = recorded_bool',
  sql_nfkd: '(label IS NFKD NORMALIZED) = recorded_bool',
  literal_null: "pg_catalog.normalize(NULL::text,'invalid') IS NULL",
  predicate_null: "pg_catalog.is_normalized(NULL::text,'invalid') IS NULL",
}
type Constraint = keyof typeof expressions

describe('Rust CHECK Unicode catalog functions', () => {
  it('resolves all five catalog identities and ignores input collation', () => {
    expect(functions.map((fn) => fn.name).sort()).toEqual([
      'icu_unicode_version',
      'is_normalized',
      'normalize',
      'unicode_assigned',
      'unicode_version',
    ])
    expect(sourceNames.size).toBe(functions.length)
    for (const fn of functions.filter((fn) => fn.args.includes('pg_catalog.text')))
      for (const collation of [undefined, 'C', 'deterministic', 'other'])
        expect(supportsTextCallableCollation(callableIdentity(fn), collation)).toBe(true)
  })

  it('matches PostgreSQL normalization, assignment, versions, default arguments, SQL predicates, states and lazy arms in every target', async () => {
    const pg = await PGlite.create()
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-check-unicode-'))
    try {
      await pg.exec(`CREATE COLLATION public.unicode_order (provider=icu,locale='und',deterministic=true);
        CREATE COLLATION public.unicode_insensitive (provider=icu,locale='und',deterministic=false);`)
      for (const [index, collation] of collations.entries())
        await pg.exec(`CREATE TABLE unicode_forms_${index} (
          label text COLLATE ${collation}, normal_form text COLLATE ${collation}, pattern text COLLATE "C", recorded_text text COLLATE "C",
          recorded_bool boolean, recorded_octets integer, skip boolean,
          ${Object.entries(expressions)
            .map(
              ([name, sql]) =>
                `CONSTRAINT ${name} CHECK (${name.endsWith('_null') ? sql : `CASE WHEN skip THEN true ELSE ${sql} END`})`,
            )
            .join(',')}
        )`)
      const catalog = await snapshotCatalog(pg)
      const checks: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
      const fixtures: { name: string; row: Row; expected: Outcome }[] = []
      for (const [index, collation] of collations.entries()) {
        const table = catalog.tables.find((table) => table.name === `unicode_forms_${index}`)!
        for (const [constraint, sql] of Object.entries(expressions))
          for (const form of ['raw', 'stored']) {
            const name = `${constraint}_${index}_${form}`
            const plan = lowerTableCheck(
              table,
              form === 'raw'
                ? {
                    name: constraint,
                    type: 'check',
                    definition: `CHECK (${constraint.endsWith('_null') ? sql : `CASE WHEN skip THEN true ELSE ${sql} END`})`,
                  }
                : table.constraints.find((check) => check.name === constraint)!,
            )!
            expect(plan.expression.kind, name).not.toBe('uncertain')
            checks.push({
              expression: plan.expression,
              identity: { schema: 'public', kind: 'table', owner: table.name, constraint: name },
            })
          }
        const add = (names: readonly Constraint[], row: Row, expected: Outcome): void => {
          for (const constraint of names)
            for (const form of ['raw', 'stored'])
              fixtures.push({ name: `${constraint}_${index}_${form}`, row: { ...row }, expected })
        }
        const base = (): Row => ({
          label: input('abc'),
          normal_form: input('NFC'),
          pattern: input('a'),
          recorded_text: input('abc'),
          recorded_bool: input(true),
          recorded_octets: input(3),
          skip: input(false),
        })
        for (const label of samples)
          for (const normalForm of ['NFC', 'nFd', 'NFKC', 'nfkd']) {
            const query = `pg_catalog.normalize($1::text COLLATE ${collation},$2::text COLLATE ${collation})`
            const result = (
              await pg.query<{
                hex: string | null
                octets: number | null
                normalized: boolean | null
                assigned: boolean | null
              }>(
                `SELECT encode(convert_to(${query},'UTF8'),'hex') hex, octet_length(${query}) octets,
              pg_catalog.is_normalized($1::text COLLATE ${collation},$2::text COLLATE ${collation}) normalized,
              pg_catalog.unicode_assigned($1::text COLLATE ${collation}) assigned`,
                [label, normalForm],
              )
            ).rows[0]!
            const text =
              result.hex === null ? null : Buffer.from(result.hex, 'hex').toString('utf8')
            const row = {
              ...base(),
              label: input(label),
              normal_form: input(normalForm),
              recorded_text: input(text),
              recorded_octets: input(result.octets),
            }
            const normalNames: Constraint[] = [
              'normalized',
              'normalized_octets',
              ...(normalForm === 'NFC' ? ['default_normalized' as const] : []),
            ]
            add(normalNames, row, { kind: text === null ? 'Null' : 'True' })
            if (text !== null)
              add(
                normalNames,
                {
                  ...row,
                  recorded_text: input(text + '!'),
                  recorded_octets: input(result.octets! + 1),
                },
                { kind: 'False' },
              )
            const predicateNames: Constraint[] = [
              'normalized_predicate',
              ...(normalForm === 'NFC'
                ? ['default_predicate' as const, 'sql_nfc' as const, 'sql_not_nfc' as const]
                : []),
              ...(normalForm === 'nFd' ? ['sql_nfd' as const] : []),
              ...(normalForm === 'NFKC' ? ['sql_nfkc' as const] : []),
              ...(normalForm === 'nfkd' ? ['sql_nfkd' as const] : []),
            ]
            add(
              predicateNames,
              { ...row, recorded_bool: input(result.normalized) },
              { kind: result.normalized === null ? 'Null' : 'True' },
            )
            if (result.normalized !== null)
              add(
                predicateNames,
                { ...row, recorded_bool: input(!result.normalized) },
                { kind: 'False' },
              )
            if (normalForm === 'NFC') {
              add(
                ['assigned'],
                { ...row, recorded_bool: input(result.assigned) },
                { kind: result.assigned === null ? 'Null' : 'True' },
              )
              if (result.assigned !== null)
                add(
                  ['assigned'],
                  { ...row, recorded_bool: input(!result.assigned) },
                  { kind: 'False' },
                )
            }
          }
        for (const normalForm of ['', 'NFC ', ' nfc', 'NＦC', 'normal', 'invalid', null]) {
          const row = { ...base(), normal_form: input(normalForm) }
          let expected: Outcome = { kind: 'Null' }
          if (normalForm !== null) {
            await expect(
              pg.query('SELECT pg_catalog.normalize($1::text,$2::text)', ['abc', normalForm]),
            ).rejects.toMatchObject({ code: '22023' })
            await expect(
              pg.query('SELECT pg_catalog.is_normalized($1::text,$2::text)', ['abc', normalForm]),
            ).rejects.toMatchObject({ code: '22023' })
            expected = error('22023')
          }
          add(['normalized', 'normalized_octets', 'normalized_predicate'], row, expected)
          add(
            ['normalized', 'normalized_octets', 'normalized_predicate'],
            { ...row, label: input(null) },
            { kind: 'Null' },
          )
          add(
            ['normalized', 'normalized_octets', 'normalized_predicate'],
            { ...row, skip: input(true) },
            { kind: 'True' },
          )
        }
        const states: Input[] = [input('abc'), input(null), { kind: 'Unknown' }, error('22003')]
        const forms: Input[] = [input('NFC'), input(null), { kind: 'Unknown' }, error('22012')]
        for (const label of states)
          for (const normalForm of forms) {
            const expected: Outcome =
              label.kind === 'Error'
                ? label
                : normalForm.kind === 'Error'
                  ? normalForm
                  : label.kind === 'Unknown' || normalForm.kind === 'Unknown'
                    ? { kind: 'Unknown' }
                    : label.kind === 'Null' || normalForm.kind === 'Null'
                      ? { kind: 'Null' }
                      : { kind: 'True' }
            const row = { ...base(), label, normal_form: normalForm }
            add(['normalized', 'normalized_octets', 'normalized_predicate'], row, expected)
            add(
              ['normalized', 'normalized_octets', 'normalized_predicate'],
              { ...row, skip: input(true) },
              { kind: 'True' },
            )
          }
        for (const label of states) {
          const expected: Outcome = label.kind === 'Value' ? { kind: 'True' } : label
          add(
            ['assigned', 'default_normalized', 'default_predicate', 'sql_nfc', 'sql_not_nfc'],
            { ...base(), label },
            expected,
          )
          add(['mixed_regex'], { ...base(), label, recorded_octets: input(1) }, expected)
        }
        add(
          ['mixed_regex'],
          { ...base(), label: input('e\u0301é'), pattern: input('é'), recorded_octets: input(2) },
          { kind: 'True' },
        )
        add(['mixed_regex'], { ...base(), recorded_octets: input(0) }, { kind: 'False' })
        add(['mixed_regex'], { ...base(), pattern: input('[') }, error('2201B'))
        add(
          ['mixed_regex'],
          { ...base(), pattern: input('['), skip: input(true) },
          { kind: 'True' },
        )
        for (const constraint of Object.keys(expressions) as Constraint[]) {
          add(
            [constraint],
            { ...base(), skip: { kind: 'Unknown' } },
            { kind: constraint.endsWith('_null') ? 'True' : 'Unknown' },
          )
          add(
            [constraint],
            { ...base(), skip: error('22003') },
            constraint.endsWith('_null') ? { kind: 'True' } : error('22003'),
          )
          const row = {
            ...base(),
            label: error('22003'),
            normal_form: error('22012'),
            recorded_text: error('22023'),
            recorded_bool: error('42601'),
            skip: input(true),
          }
          add([constraint], row, { kind: 'True' })
        }
        for (const [constraint, name] of [
          ['database_version', 'unicode_version'],
          ['icu_version', 'icu_unicode_version'],
        ] as const) {
          const version = (
            await pg.query<{ value: string | null }>(`SELECT pg_catalog.${name}() value`)
          ).rows[0]!.value
          expect(version).toBe(name === 'unicode_version' ? profile.unicode : profile.icu)
          add(
            [constraint],
            { ...base(), recorded_text: input(version) },
            { kind: version === null ? 'Null' : 'True' },
          )
          add(
            [constraint],
            { ...base(), recorded_text: input('incorrect') },
            { kind: version === null ? 'Null' : 'False' },
          )
          add([constraint], { ...base(), recorded_text: input(null) }, { kind: 'Null' })
          add([constraint], { ...base(), recorded_text: { kind: 'Unknown' } }, { kind: 'Unknown' })
          add([constraint], { ...base(), recorded_text: error('22003') }, error('22003'))
        }
        add(['literal_null', 'predicate_null'], base(), { kind: 'True' })
      }
      const group = prepareCheckRustGroup(checks)
      for (const [index, check] of group.checks.entries()) {
        expect(check.kind, check.kind === 'unsupported' ? check.reason : '').toBe('supported')
        if (checks[index]!.identity.constraint.includes('_null_') && check.kind === 'supported')
          expect(check.inputs).toHaveLength(0)
      }
      await runCheckParity(
        directory,
        'pgsid-check-unicode',
        group,
        checks.map((check) => check.identity.constraint),
        fixtures,
      )
    } finally {
      await pg.close()
      await rm(directory, { recursive: true, force: true })
    }
  }, 600000)
})
