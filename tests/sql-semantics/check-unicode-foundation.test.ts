import { describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createContext, runInContext } from 'node:vm'
import ts from 'typescript'
import { transpileCheckRust } from '../../src/codegen/shared/check-rust-transpile.js'
import type { CheckRustSource } from '../../src/codegen/shared/check-rust-source.js'
import { writeCheckRustSources } from '../../tools/check-rust/sources.js'

const run = promisify(execFile)
const forms = ['NFC', 'NFD', 'NFKC', 'NFKD']
const encode = (text: string) =>
  [...text].map((character) => character.codePointAt(0)!.toString(16)).join(',')
const scalar = (code: number) => code > 0 && code <= 0x10ffff && (code < 0xd800 || code > 0xdfff)

function samples(): string[] {
  const source = readFileSync('vendor/postgresql-unicode/unicode_norm_table.h', 'utf8')
  const decomposition = source.split('UnicodeDecompMain[')[1]!.split('};')[0]!
  const points = [...decomposition.matchAll(/\{0x([0-9A-F]+)/gu)].map((match) =>
    Number.parseInt(match[1]!, 16),
  )
  expect(points).toHaveLength(6843)
  const categories = readFileSync('vendor/postgresql-unicode/unicode_category_table.h', 'utf8')
    .split('unicode_categories[')[1]!
    .split('};')[0]!
  const boundaries = [...categories.matchAll(/\{0x([0-9A-Fa-f]+),\s*0x([0-9A-Fa-f]+)/gu)]
  expect(boundaries).toHaveLength(3368)
  for (const match of boundaries) {
    const first = Number.parseInt(match[1]!, 16)
    const last = Number.parseInt(match[2]!, 16)
    points.push(first - 1, first, last, last + 1)
  }
  const table = readFileSync('/tmp/pgsid-check-unicode-data/tables.rs', 'utf8')
  const keys = table.split('const UNICODE_COMPOSE_KEYS:')[1]!.split('];')[0]!
  const pairs = [...keys.matchAll(/(\d+)i64/gu)].map((match) => {
    const key = Number(match[1])
    return String.fromCodePoint(Math.floor(key / 2097152), key % 2097152)
  })
  expect(pairs).toHaveLength(961)
  for (let index = 0; index < 11172; index += 17) points.push(0xac00 + index)
  return [
    ...new Set([
      '',
      'plain text',
      '日😊',
      '\ufeff',
      '\ufefftext',
      'text\ufeff',
      'e\u0301',
      'a\u0315\u0300',
      '\u0301\u0327',
      'A\u034f\u030a',
      'a\u0300\u0301',
      '\u1100\u1161\u11a8',
      '\u1100\u1100\u1161\u11a8',
      '\u212b\ufb03\uff21\u00a0',
      '\u0300\u0301\u0300',
      'a\u0315\u0300'.repeat(100),
      ...points.filter(scalar).map((code) => String.fromCodePoint(code)),
      ...pairs,
      ...pairs.map((pair) => 'x\u0315' + pair + '\u0327'),
    ]),
  ]
}

type Oracle = { assigned: boolean } & Record<`${'normalized' | 'same'}${number}`, string | boolean>

describe('CHECK PostgreSQL Unicode data foundation', () => {
  it('matches every decomposition entry, composition pair, assignment boundary, Hangul and combining-mark order in Rust and both targets', async () => {
    const pg = await PGlite.create()
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-unicode-foundation-'))
    try {
      const version = await pg.query<{ postgres: string; icu: string }>(
        'SELECT unicode_version() AS postgres, icu_unicode_version() AS icu',
      )
      expect(version.rows[0]).toEqual({ postgres: '16.0', icu: '16.0' })
      const values = samples()
      const oracle: Oracle[] = []
      for (let start = 0; start < values.length; start += 512) {
        const result = await pg.query<Oracle>(
          `SELECT unicode_assigned(value) AS assigned,
          ${forms
            .flatMap((form, index) => [
              `encode(convert_to(pg_catalog.normalize(value,'${form}'),'UTF8'),'hex') AS normalized${index}`,
              `pg_catalog.is_normalized(value,'${form}') AS same${index}`,
            ])
            .join(',')}
          FROM jsonb_array_elements_text($1::jsonb) WITH ORDINALITY AS samples(value, position)
          ORDER BY position`,
          [JSON.stringify(values.slice(start, start + 512))],
        )
        for (const row of result.rows) {
          for (const [form] of forms.entries())
            row[`normalized${form}`] = Buffer.from(
              row[`normalized${form}`] as string,
              'hex',
            ).toString('utf8')
          oracle.push(row)
        }
      }
      expect(oracle).toHaveLength(values.length)
      const source = JSON.parse(
        readFileSync('src/codegen/go/assets/check-rust-sources.json', 'utf8'),
      ) as CheckRustSource
      source.modules = source.modules.filter((module) => module.name === 'checkruntime')
      const generated = transpileCheckRust(source)
      const context = createContext({ exports: {} })
      runInContext(
        ts.transpileModule(generated.typescript, {
          compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
        }).outputText,
        context,
      )
      const functions = context.exports as {
        unicodeTextAssigned(value: string): boolean
        unicodeNormalizeText(value: string, form: number): { kind: string; value: string }
        unicodeNormalizedText(value: string, form: number): { kind: string; value: boolean }
        unicodeNormalizationForm(value: string): number
        unicodeAllocationSize(count: bigint): { kind: string; value: boolean | { state: number } }
        unicodeDataVersion(): { kind: string; value: string }
        unicodeIcuDataVersion(): { kind: string; value?: string }
        unicodeIcuProfile(value: string): { kind: string; value?: string }
      }
      expect(functions.unicodeDataVersion()).toEqual({
        kind: 'Value',
        value: version.rows[0]!.postgres,
      })
      expect(functions.unicodeIcuDataVersion()).toEqual({
        kind: 'Value',
        value: version.rows[0]!.icu,
      })
      expect(functions.unicodeIcuProfile('')).toEqual({ kind: 'Null' })
      expect(functions.unicodeIcuProfile('15.1')).toEqual({ kind: 'Value', value: '15.1' })
      for (const [index, value] of values.entries()) {
        const expected = oracle[index]!
        expect(functions.unicodeTextAssigned(value), `assignment ${encode(value)}`).toBe(
          expected.assigned,
        )
        for (const [form, name] of forms.entries()) {
          expect(functions.unicodeNormalizationForm(name)).toBe(form + 1)
          expect(functions.unicodeNormalizationForm(name.toLowerCase())).toBe(form + 1)
          expect(
            functions.unicodeNormalizeText(value, form + 1),
            `${name} ${encode(value)}`,
          ).toEqual({
            kind: 'Value',
            value: expected[`normalized${form}`],
          })
          expect(
            functions.unicodeNormalizedText(value, form + 1),
            `${name} quick check ${encode(value)}`,
          ).toEqual({
            kind: 'Value',
            value: expected[`same${form}`],
          })
        }
      }
      for (const form of ['', 'NFK', 'NFX', ' NFC', 'NFC ', 'ＮＦＣ', 'nfck'])
        expect(functions.unicodeNormalizationForm(form)).toBe(0)
      for (const count of [0n, 1n, 268435454n])
        expect(functions.unicodeAllocationSize(count)).toEqual({ kind: 'Value', value: true })
      for (const count of [-1n, 268435455n, 2147483647n, 9223372036854775807n])
        expect(functions.unicodeAllocationSize(count)).toEqual({
          kind: 'Error',
          value: { state: 56966976 },
        })

      const lines =
        values
          .map((value, index) =>
            [
              encode(value),
              oracle[index]!.assigned ? '1' : '0',
              ...forms.flatMap((_, form) => [
                encode(oracle[index]![`normalized${form}`] as string),
                oracle[index]![`same${form}`] ? '1' : '0',
              ]),
            ].join('\t'),
          )
          .join('\n') + '\n'
      await writeFile(join(directory, 'cases.tsv'), lines)
      writeCheckRustSources(join(directory, 'runtime.rs'), source)
      await writeFile(
        join(directory, 'native.rs'),
        String.raw`include!("runtime.rs");
fn decode(value: &str) -> String {
    if value.is_empty() { return String::new(); }
    value.split(',').map(|part| char::from_u32(u32::from_str_radix(part,16).unwrap()).unwrap()).collect()
}
#[test] fn unicode_oracle() {
    let data = std::fs::read_to_string("cases.tsv").unwrap();
    for line in data.lines() {
        let fields: Vec<_> = line.split('\t').collect();
        let value = decode(fields[0]);
        assert_eq!(unicode_text_assigned(value.clone()), fields[1] == "1", "{line}");
        for form in 1..=4 {
            let expected = decode(fields[form * 2]);
            assert!(unicode_normalize_text(value.clone(), form as i32) == TextValue::Value(expected), "{line} form {form}");
            assert!(unicode_normalized_text(value.clone(), form as i32) == BoolValue::Value(fields[form * 2 + 1] == "1"), "{line} form {form}");
        }
    }
    for (form,name) in ["NFC","NFD","NFKC","NFKD"].iter().enumerate() {
        assert_eq!(unicode_normalization_form(name), form as i32 + 1);
        assert_eq!(unicode_normalization_form(&name.to_lowercase()), form as i32 + 1);
    }
    for form in ["", "NFK", "NFX", " NFC", "NFC ", "ＮＦＣ", "nfck"] { assert_eq!(unicode_normalization_form(form),0); }
    for count in [0,1,268435454] { assert!(unicode_allocation_size(count) == BoolValue::Value(true)); }
    for count in [-1,268435455,2147483647,i64::MAX] { assert!(unicode_allocation_size(count) == BoolValue::Error(make_sql_error(56966976))); }
    assert!(unicode_data_version() == make_text_value("16.0"));
    assert!(unicode_icu_data_version() == make_text_value("16.0"));
    assert!(unicode_icu_profile("") == TextValue::Null);
    assert!(unicode_icu_profile("15.1") == make_text_value("15.1"));
}`,
      )
      await writeFile(join(directory, 'runtime.go'), generated.go)
      await writeFile(join(directory, 'go.mod'), 'module unicodefoundation\n\ngo 1.25\n')
      await writeFile(
        join(directory, 'runtime_test.go'),
        String.raw`package generated
import ("os"; "strings"; "strconv"; "testing")
func decode(value string) string {
    if value == "" { return "" }
    var result strings.Builder
    for _, part := range strings.Split(value,",") { code,err := strconv.ParseInt(part,16,32); if err != nil {panic(err)}; result.WriteRune(rune(code)) }
    return result.String()
}
func TestUnicodeOracle(t *testing.T) {
    data,err := os.ReadFile("cases.tsv"); if err != nil {t.Fatal(err)}
    for _,line := range strings.Split(strings.TrimSuffix(string(data),"\n"),"\n") {
        fields := strings.Split(line,"\t"); value := decode(fields[0])
        if UnicodeTextAssigned(value) != (fields[1] == "1") {t.Fatal("assignment",line)}
        for form := 1; form <= 4; form++ {
            got := UnicodeNormalizeText(value,form)
            if got.Kind != TextValueValue || got.Value != decode(fields[form*2]) {t.Fatal("normalization",form,line,got)}
            same := UnicodeNormalizedText(value,form)
            if same.Kind != BoolValueValue || same.Value != (fields[form*2+1] == "1") {t.Fatal("quick check",form,line,same)}
        }
    }
    for index,name := range []string{"NFC","NFD","NFKC","NFKD"} {
        if UnicodeNormalizationForm(name) != index+1 || UnicodeNormalizationForm(strings.ToLower(name)) != index+1 {t.Fatal(name)}
    }
    for _,form := range []string{"", "NFK", "NFX", " NFC", "NFC ", "ＮＦＣ", "nfck"} {if UnicodeNormalizationForm(form) != 0 {t.Fatal(form)}}
    for _,count := range []int64{0,1,268435454} {if UnicodeAllocationSize(count).Kind != BoolValueValue {t.Fatal(count)}}
    for _,count := range []int64{-1,268435455,2147483647,9223372036854775807} {got := UnicodeAllocationSize(count); if got.Kind != BoolValueError || got.Error.State != 56966976 {t.Fatal(count,got)}}
    if UnicodeDataVersion().Value != "16.0" {t.Fatal("Unicode version")}
    if UnicodeIcuDataVersion().Value != "16.0" || UnicodeIcuProfile("").Kind != TextValueNull || UnicodeIcuProfile("15.1").Value != "15.1" {t.Fatal("ICU build profile")}
}`,
      )
      await run('rustc', [
        '--edition',
        '2021',
        '--test',
        join(directory, 'native.rs'),
        '-o',
        join(directory, 'native'),
      ])
      await run(join(directory, 'native'), [], { cwd: directory })
      await run('go', ['test', './...'], {
        cwd: directory,
        env: { ...process.env, GOCACHE: '/tmp/pgsid-check-rust-go-cache' },
      })
    } finally {
      await pg.close()
      await rm(directory, { recursive: true, force: true })
    }
  }, 180000)
})
