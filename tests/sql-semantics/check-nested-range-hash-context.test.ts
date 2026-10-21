import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
import { customRangeProfiles } from './check-custom-range-fixtures.js'
import { readRangeFixture } from './check-range-fixtures.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'
import { rangeArrayText, readRangeArrayFixture } from './check-range-array-fixtures.js'
import { scalarRangeText } from './check-scalar-range-fixtures.js'

const input = (v: number | bigint | boolean | null): Input =>
  v === null ? { kind: 'Null' } : { kind: 'Value', value: v }
const sequence = (values: bigint[], width: number) =>
  values.reduce((a, b) => BigInt.asIntN(width, a * 31n + b), 1n)

it('propagates native byte order through nested range and multirange bounds, arrays and successful constant preparation', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-nested-range-hash-context-'))
  try {
    const reference = JSON.parse(
      await readFile('tests/fixtures/check-native-hash.json', 'utf8'),
    ) as {
      samples: {
        type: string
        value: string
        seed: string
        little32: number
        big32: number
        little64: string
        big64: string
      }[]
    }
    await pg.exec(`CREATE TYPE numbers_span AS RANGE(subtype=numrange,multirange_type_name=numbers_set);
CREATE TYPE sets_span AS RANGE(subtype=nummultirange,multirange_type_name=sets_set);
CREATE TYPE arrays_span AS RANGE(subtype=numrange[],multirange_type_name=arrays_set);
CREATE TYPE deep_span AS RANGE(subtype=numbers_span,multirange_type_name=deep_set);`)
    const families = customRangeProfiles(await snapshotCatalog(pg)).map((p, index) => ({
      p,
      index,
    }))
    const carrier = (name: string, value: string): string => {
      const inner =
        value === 'empty' ? 'empty' : value === 'null' ? '(,)' : scalarRangeText(value, null)
      return name === 'sets_span'
        ? '{' + inner + '}'
        : name === 'arrays_span'
          ? rangeArrayText([inner])
          : name === 'deep_span'
            ? scalarRangeText(inner, null)
            : inner
    }
    for (const f of families)
      await pg.exec(`CREATE DOMAIN numbers_history_${f.index} AS ${f.p.identity}[]`)
    const forms = families.flatMap((f) =>
      Object.entries({
        range: { hash: 'hash_range(v)', extended: 'hash_range_extended(v,seed)' },
        multi: { hash: 'hash_multirange(m)', extended: 'hash_multirange_extended(m,seed)' },
        array: { hash: 'hash_array(items)', extended: 'hash_array_extended(items,seed)' },
        nested: {
          hash: `hash_array(ARRAY[items::numbers_history_${f.index}])`,
          extended: `hash_array_extended(ARRAY[items::numbers_history_${f.index}],seed)`,
        },
        literal: {
          hash: `hash_range('${scalarRangeText(carrier(f.p.name, '1'), null)}'::${f.p.identity})`,
          extended: `hash_range_extended('${scalarRangeText(carrier(f.p.name, '1'), null)}'::${f.p.identity},seed)`,
        },
      }).map(([name, x]) => ({
        ...f,
        ...x,
        name,
        table: `array_context_${f.index}_${name}`,
        sql: `CASE WHEN bypass THEN true ELSE (${x.hash}) IS NOT DISTINCT FROM expected32 AND (${x.extended}) IS NOT DISTINCT FROM expected64 END`,
      })),
    )
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE ${f.table}(v ${f.p.identity},m ${f.p.multirange},items ${f.p.identity}[],seed bigint,expected32 integer,expected64 bigint,bypass boolean,CHECK(${f.sql}))`,
      )
    const catalog = await snapshotCatalog(pg),
      contexts = [
        { name: 'little', order: 'little' as const },
        { name: 'big', order: 'big' as const },
        { name: 'unspecified', order: undefined },
      ],
      groups = contexts.map((c) =>
        prepareCheckRustGroup(
          forms.flatMap((f) => {
            const table = catalog.tables.find((t) => t.name === f.table)!
            return (['source', 'stored'] as const).map((origin) => ({
              identity: {
                schema: 'public',
                kind: 'table' as const,
                owner: f.table,
                constraint: origin + '_' + c.name,
              },
              expression: lowerTableCheck(
                table,
                origin === 'source'
                  ? { ...table.constraints[0]!, definition: `CHECK(${f.sql})` }
                  : table.constraints[0]!,
                catalog.enums,
                catalog.domains,
                origin,
                catalog.rangeTypes,
              )!.expression,
            }))
          }),
          {
            serverEncoding: 'UTF8',
            defaultCollation: 'C',
            arrayNulls: true,
            ...(c.order ? { nativeByteOrder: c.order } : {}),
          },
        ),
      )
    for (const g of groups) expect(g.checks.filter((c) => c.kind !== 'supported')).toEqual([])
    const evaluatorSource = groups.map((g) => g.evaluatorSource).join('\n'),
      group = {
        ...groups[0]!,
        checks: groups.flatMap((g) => g.checks),
        evaluatorSource,
        source: {
          ...groups[0]!.source!,
          modules: groups[0]!.source!.modules.map((m) =>
            m.name === 'checks'
              ? { ...m, files: [{ path: 'evaluators.rs', source: evaluatorSource }] }
              : m,
          ),
        },
      }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    let nativeInserts = 0,
      deferred = 0,
      portable = 0
    for (const f of families)
      for (const value of ['0', '1', 'null', 'empty'])
        for (const seed of ['0', '-1']) {
          const bound = carrier(f.p.name, value),
            text = scalarRangeText(bound, null),
            v = await readRangeFixture(
              pg,
              `SELECT $1::${f.p.identity} span`,
              'span',
              f.p.rangeType,
              [text],
            ),
            mtext = '{' + text + '}',
            m = await readMultirangeFixture(pg, f.p.multirangeType, mtext),
            itemstext = rangeArrayText([text, null, 'empty']),
            items = await readRangeArrayFixture(pg, f.p.rangeType, itemstext)
          const empty = (
            await pg.query<{ word: number; extended: string }>(
              `SELECT hash_range('empty'::${f.p.identity}) word,hash_range_extended('empty'::${f.p.identity},$1)::text extended`,
              [seed],
            )
          ).rows[0]!
          for (const form of forms.filter((x) => x.index === f.index)) {
            const numeric = form.name === 'literal' ? '1' : value,
              sample = reference.samples.find(
                (s) => s.type === 'pg_catalog."numeric"' && s.value === numeric && s.seed === seed,
              )
            const alternatives: Record<string, { word: number; extended: bigint }> = {}
            for (const order of ['little', 'big'] as const) {
              const scalar32 = sample
                  ? BigInt(sample[order === 'little' ? 'little32' : 'big32'])
                  : 0n,
                scalar64 = sample ? BigInt(sample[order === 'little' ? 'little64' : 'big64']) : 0n
              const rangeHash = async (word: bigint, extended: bigint, flags = 18) => {
                const result = (
                  await pg.query<{ word: number; extended: string }>(
                    `WITH h AS(SELECT hashint4($4::integer) # $1::integer a,hashint4extended($4::integer,$3::bigint) # $2::bigint b) SELECT ((a<<1)|(a>>31 & 1)) word,(((b<<1)&(-4294967298::bigint))|((b>>31)&4294967297::bigint))::text extended FROM h`,
                    [String(word), String(extended), seed, flags],
                  )
                ).rows[0]!
                return { word: BigInt(result.word), extended: BigInt(result.extended) }
              }
              let child =
                numeric === 'empty' || numeric === 'null'
                  ? (
                      await pg.query<{ word: number; extended: string }>(
                        `SELECT hash_range($1::numrange) word,hash_range_extended($1::numrange,$2)::text extended`,
                        [numeric === 'empty' ? 'empty' : '(,)', seed],
                      )
                    ).rows.map((r) => ({ word: BigInt(r.word), extended: BigInt(r.extended) }))[0]!
                  : await rangeHash(scalar32, scalar64)
              if (f.p.name === 'sets_span' || f.p.name === 'arrays_span')
                child = {
                  word: sequence(
                    f.p.name === 'sets_span' && numeric === 'empty' ? [] : [child.word],
                    32,
                  ),
                  extended: sequence(
                    f.p.name === 'sets_span' && numeric === 'empty' ? [] : [child.extended],
                    64,
                  ),
                }
              if (f.p.name === 'deep_span') child = await rangeHash(child.word, child.extended)
              const range = await rangeHash(child.word, child.extended)
              let word = range.word,
                extended = range.extended
              if (form.name === 'multi') {
                word = sequence([word], 32)
                extended = sequence([extended], 64)
              }
              if (form.name === 'array' || form.name === 'nested') {
                word = sequence([word, 0n, BigInt(empty.word)], 32)
                extended = sequence([extended, 0n, BigInt(empty.extended)], 64)
              }
              if (form.name === 'nested') {
                word = sequence([word], 32)
                extended = sequence([extended], 64)
              }
              alternatives[order] = { word: Number(word), extended }
            }
            const native = (
              await pg.query<{ word: number; extended: string }>(
                `SELECT ${form.hash} word,(${form.extended})::text extended FROM(SELECT $1::${f.p.identity} v,$2::${f.p.multirange} m,$3::${f.p.identity}[] items,$4::bigint seed)q`,
                [text, mtext, itemstext, seed],
              )
            ).rows[0]!
            expect(native.word, f.p.name + ' ' + value + ' ' + seed + ' ' + form.name).toBe(
              alternatives.little!.word,
            )
            expect(BigInt(native.extended)).toBe(alternatives.little!.extended)
            for (const context of contexts)
              for (const wrong of [false, true])
                for (const bypass of [false, true]) {
                  const alt = alternatives[context.order ?? 'little']!,
                    word = wrong
                      ? alt.word === 2147483647
                        ? -2147483648
                        : alt.word + 1
                      : alt.word,
                    extended = wrong ? BigInt.asIntN(64, alt.extended + 1n) : alt.extended,
                    row: Row = {
                      v: v === null ? { kind: 'Null' } : { kind: 'Value', value: v },
                      m: m === null ? { kind: 'Null' } : { kind: 'Value', value: m },
                      items: items === null ? { kind: 'Null' } : { kind: 'Value', value: items },
                      seed: input(BigInt(seed)),
                      expected32: input(word),
                      expected64: input(extended),
                      bypass: input(bypass),
                    }
                  const uncertain =
                      !bypass &&
                      context.order === undefined &&
                      (alternatives.little!.word !== alternatives.big!.word ||
                        alternatives.little!.extended !== alternatives.big!.extended),
                    expected: Outcome = uncertain
                      ? { kind: 'Unknown' }
                      : { kind: bypass || !wrong ? 'True' : 'False' }
                  if (uncertain) deferred++
                  else portable++
                  for (const origin of ['source', 'stored'])
                    fixtures.push({
                      name: form.table + '_' + origin + '_' + context.name,
                      row,
                      expected,
                    })
                  if (context.order === 'little') {
                    try {
                      await pg.query(`INSERT INTO ${form.table} VALUES($1,$2,$3,$4,$5,$6,$7)`, [
                        text,
                        mtext,
                        itemstext,
                        seed,
                        word,
                        String(extended),
                        bypass,
                      ])
                      expect(expected.kind).toBe('True')
                    } catch (e) {
                      if (expected.kind !== 'False') throw e
                      expect(e).toMatchObject({ code: '23514' })
                    }
                    nativeInserts++
                  }
                }
          }
        }
    expect(deferred).toBeGreaterThan(0)
    expect(portable).toBeGreaterThan(deferred)
    await mkdir('artifacts/nested-range-hash-context', { recursive: true })
    await writeFile(
      'artifacts/nested-range-hash-context/report.json',
      JSON.stringify({
        profiles: families.length,
        forms: forms.length,
        contexts: contexts.map((c) => c.name),
        fixtures: fixtures.length,
        nativeInserts,
        deferred,
        portable,
      }) + '\n',
    )
    await writeFile('artifacts/nested-range-hash-context/evaluators.rs', evaluatorSource)
    await runCheckParity(
      directory,
      'nestedrangehashcontext',
      group,
      contexts.flatMap((c) =>
        forms.flatMap((f) => ['source', 'stored'].map((o) => f.table + '_' + o + '_' + c.name)),
      ),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 600_000)
