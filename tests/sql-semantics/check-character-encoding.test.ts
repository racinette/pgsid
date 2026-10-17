import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const input = (value: number | string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (code: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})
const forms: Record<string, string> = {
  ascii_eq: 'ascii(label)=expected_code',
  ascii_null: 'ascii(label) IS NULL',
  ascii_value_case: '(CASE WHEN skip THEN 0 ELSE ascii(label) END)=expected_code',
  ascii_lazy: 'CASE WHEN skip THEN true ELSE ascii(label)=expected_code END',
  ascii_default: 'COALESCE(ascii(label),0)=expected_code',
  ascii_literal: "ascii('é')=233",
  ascii_first_only: "ascii('Aé')=65",
  chr_eq: 'chr(codepoint)=label',
  chr_null: 'chr(codepoint) IS NULL',
  chr_default: "COALESCE(chr(codepoint),'A')=label",
  chr_selected: "(CASE WHEN skip THEN 'A' ELSE chr(codepoint) END)=label",
  chr_lazy: 'CASE WHEN skip THEN true ELSE chr(codepoint)=label END',
  chr_input_default: 'chr(COALESCE(codepoint,backup))=label',
  chr_literal: "chr(128512)='😀'",
  hidden_literal: "CASE WHEN false THEN chr(128512)='😀' ELSE true END",
  prepared_literal: "CASE WHEN skip THEN true ELSE chr(128512)='😀' END",
  prepared_bad_literal: "CASE WHEN skip THEN true ELSE chr(0)='A' END",
  runtime_order: 'ascii(chr(codepoint))=expected_code',
}
const asciiAlways = ['ascii_eq', 'ascii_null', 'ascii_default']
const asciiChosen = ['ascii_value_case', 'ascii_lazy']
const chrAlways = ['chr_eq', 'chr_null', 'chr_default', 'runtime_order', 'chr_input_default']
const chrChosen = ['chr_selected', 'chr_lazy']
const contextLiterals = ['ascii_literal', 'chr_literal', 'prepared_literal']

it('keeps character encoding explicit for values, nullness, eager constants, lazy branches and ordered errors in every target', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-character-encoding-'))
  try {
    expect((await pg.query('SHOW server_encoding')).rows[0]).toEqual({ server_encoding: 'UTF8' })
    await pg.exec(`CREATE TABLE character_values(codepoint integer,backup integer,label text COLLATE "C",expected_code integer,skip boolean);
      CREATE TABLE character_definitions(LIKE character_values,${Object.entries(forms)
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${sql})`)
        .join(',')})`)
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((item) => item.name === 'character_definitions')!
    const plans = Object.entries(forms).flatMap(([name, sql]) =>
      (['source', 'stored'] as const).map((origin) => ({
        expression: lowerTableCheck(
          table,
          origin === 'stored'
            ? table.constraints.find((check) => check.name === name)!
            : { name, type: 'check', definition: `CHECK(${sql})` },
          [],
          catalog.domains,
          origin,
        )!.expression,
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: name + '_' + origin,
        },
      })),
    )
    const cases: {
      values: [number | null, number | null, string | null, number | null, boolean | null]
      missing: readonly string[]
    }[] = [
      { values: [65, 66, 'A', 65, false], missing: [] },
      { values: [65, 66, '', 0, false], missing: [] },
      { values: [65, 66, 'Aé', 65, false], missing: [] },
      { values: [65, 66, 'é', 233, false], missing: [...asciiAlways, ...asciiChosen] },
      { values: [233, 65, 'A', 65, false], missing: [...chrAlways, ...chrChosen] },
      {
        values: [233, 65, 'é', 233, false],
        missing: [...asciiAlways, ...asciiChosen, ...chrAlways, ...chrChosen],
      },
      { values: [233, 65, 'é', 233, true], missing: [...asciiAlways, ...chrAlways] },
      {
        values: [233, 65, 'é', 233, null],
        missing: [...asciiAlways, ...asciiChosen, ...chrAlways, ...chrChosen],
      },
      {
        values: [1114111, 65, '\u{10ffff}', 1114111, false],
        missing: [...asciiAlways, ...asciiChosen, ...chrAlways, ...chrChosen],
      },
      { values: [null, 65, null, null, false], missing: [] },
      {
        values: [null, 233, 'é', 233, false],
        missing: [...asciiAlways, ...asciiChosen, 'chr_input_default'],
      },
      { values: [65, 66, null, null, false], missing: [] },
      { values: [233, 65, null, null, false], missing: [...chrAlways, ...chrChosen] },
      { values: [0, 65, 'A', 65, false], missing: [] },
      { values: [-1, 65, 'A', 65, false], missing: [] },
      { values: [55296, 65, 'A', 65, false], missing: [] },
      { values: [1114112, 65, 'A', 65, false], missing: [] },
      { values: [2147483647, 65, 'A', 65, false], missing: [] },
      { values: [-2147483648, 65, 'A', 65, false], missing: [] },
      { values: [0, 65, 'A', 65, true], missing: [] },
    ]
    const references: { name: string; row: Row; expected: Outcome; deferred: boolean }[] = []
    for (const { values, missing } of cases) {
      await pg.exec('TRUNCATE character_values')
      await pg.query('INSERT INTO character_values VALUES($1,$2,$3,$4,$5)', values)
      const row: Row = Object.fromEntries(
        ['codepoint', 'backup', 'label', 'expected_code', 'skip'].map((name, index) => [
          name,
          input(values[index]!),
        ]),
      )
      for (const [name, sql] of Object.entries(forms)) {
        let expected: Outcome
        try {
          const value = (
            await pg.query<{ value: boolean | null }>(`SELECT ${sql} value FROM character_values`)
          ).rows[0]!.value
          expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
        } catch (error) {
          const code = (error as { code: string }).code
          expect(['22023', '54000']).toContain(code)
          expected = failure(code)
        }
        references.push({
          name,
          row,
          expected,
          deferred: missing.includes(name) || contextLiterals.includes(name),
        })
      }
    }
    const unknown: Input = { kind: 'Unknown' }
    const base: Row = {
      codepoint: input(65),
      backup: input(65),
      label: input('A'),
      expected_code: input(65),
      skip: input(false),
    }
    for (const utf8 of [false, true]) {
      const group = prepareCheckRustGroup(plans, utf8 ? { serverEncoding: 'UTF8' } : {})
      expect(group.checks.every((check) => check.kind === 'supported')).toBe(true)
      const fixtures: { name: string; row: Row; expected: Outcome }[] = []
      const add = (name: string, row: Row, expected: Outcome) => {
        for (const origin of ['source', 'stored'])
          fixtures.push({ name: name + '_' + origin, row, expected })
      }
      for (const item of references)
        add(item.name, item.row, !utf8 && item.deferred ? { kind: 'Unknown' } : item.expected)
      add('ascii_eq', { ...base, label: unknown }, { kind: 'Unknown' })
      add(
        'ascii_eq',
        { ...base, label: unknown, expected_code: failure('22003') },
        utf8 ? failure('22003') : { kind: 'Unknown' },
      )
      add(
        'ascii_eq',
        { ...base, label: failure('22012'), expected_code: failure('22003') },
        failure('22012'),
      )
      add('chr_eq', { ...base, codepoint: unknown, label: failure('22012') }, { kind: 'Unknown' })
      add('chr_eq', { ...base, label: failure('22012') }, failure('22012'))
      add(
        'chr_eq',
        { ...base, codepoint: input(233), label: failure('22012') },
        utf8 ? failure('22012') : { kind: 'Unknown' },
      )
      add('chr_eq', { ...base, codepoint: input(0), label: failure('22012') }, failure('54000'))
      add('chr_eq', { ...base, codepoint: failure('22003'), label: unknown }, failure('22003'))
      add('chr_eq', { ...base, codepoint: input(null), label: failure('22012') }, failure('22012'))
      add('chr_lazy', { ...base, codepoint: failure('22003'), skip: input(true) }, { kind: 'True' })
      await mkdir('artifacts/goal-checks/character-encoding', { recursive: true })
      await writeFile(
        `artifacts/goal-checks/character-encoding/${utf8 ? 'utf8' : 'portable'}-fixtures.json`,
        JSON.stringify({ forms, references, fixtures }, null, 2) + '\n',
      )
      await runCheckParity(
        await mkdtemp(join(directory, utf8 ? 'utf8-' : 'portable-')),
        utf8 ? 'characterutf8' : 'characterportable',
        group,
        plans.map((plan) => plan.identity.constraint),
        fixtures,
      )
    }
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
