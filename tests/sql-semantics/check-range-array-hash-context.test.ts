import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { catalogRangeType } from '../../src/sql-semantics/catalog-check-binder.js'
import { arrayElementIdentity } from '../../src/codegen/shared/check-array-types.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'
import { domainElementType } from '../../src/sql-semantics/expressions.js'
import type { OwnedArrayInputPayload } from '../../tools/check-rust/array-input.js'
import { rangeArrayText, readRangeArrayFixture } from './check-range-array-fixtures.js'

for (const custom of [false, true])
  it(`propagates explicit hash byte order through ${custom ? 'captured' : 'builtin'} range array cells and compares complete alternatives without it`, async () => {
    const pg = await PGlite.create(),
      directory = await mkdtemp(join(tmpdir(), 'pgsid-range-array-hash-context-'))
    try {
      const bytes = await readFile('tests/fixtures/check-native-hash.json')
      const reference = JSON.parse(bytes.toString()) as {
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
      if (custom)
        await pg.exec(
          'CREATE TYPE context_span AS RANGE(subtype=numeric,multirange_type_name=context_set)',
        )
      const sqlType = custom ? 'public.context_span' : 'pg_catalog.numrange'
      await pg.exec(`CREATE DOMAIN range_hash_history AS ${sqlType}[]`)
      const forms = [
        { name: 'word', sql: 'hash_array(payload)=expected32' },
        { name: 'extended', sql: 'hash_array_extended(payload,seed)=expected64' },
      ].flatMap((f) =>
        [false, true].map((nested) => ({
          ...f,
          name: (nested ? 'nested_' : '') + f.name,
          field: f.name as 'word' | 'extended',
          nested,
        })),
      )
      for (const f of forms)
        await pg.exec(
          `CREATE TABLE range_array_hash_${f.name}(payload ${f.nested ? 'range_hash_history[]' : sqlType + '[]'},seed bigint,expected32 integer,expected64 bigint,CHECK(${f.sql}))`,
        )
      const catalog = await snapshotCatalog(pg),
        valueType = catalogRangeType(sqlType, undefined, catalog.domains, catalog.rangeTypes)!,
        contexts = [
          { name: 'little', order: 'little' as const },
          { name: 'big', order: 'big' as const },
          { name: 'unspecified', order: undefined },
        ]
      const groups = contexts.map((context) =>
        prepareCheckRustGroup(
          forms.flatMap((f) => {
            const table = catalog.tables.find((t) => t.name === 'range_array_hash_' + f.name)!
            return (['source', 'stored'] as const).map((origin) => ({
              identity: {
                schema: 'public',
                kind: 'table' as const,
                owner: table.name,
                constraint: origin + '_' + context.name,
              },
              expression: lowerTableCheck(
                table,
                origin === 'source'
                  ? { name: 'check', type: 'check', definition: `CHECK(${f.sql})` }
                  : table.constraints[0]!,
                catalog.enums,
                catalog.domains,
                origin,
                catalog.rangeTypes,
              )!.expression,
            }))
          }),
          context.order ? { nativeByteOrder: context.order } : {},
        ),
      )
      for (const g of groups) expect(g.checks.filter((c) => c.kind !== 'supported')).toEqual([])
      const evaluatorSource = groups.map((g) => g.evaluatorSource).join('\n')
      const group: ReturnType<typeof prepareCheckRustGroup> = {
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
      const names = contexts.flatMap((c) =>
        forms.flatMap((f) =>
          ['source', 'stored'].map((o) => 'range_array_hash_' + f.name + '_' + o + '_' + c.name),
        ),
      )
      const numeric = reference.samples.filter((s) => s.type === 'pg_catalog."numeric"')
      const samples = ['0', '1', '-9223372036854775808'].flatMap((seed) => {
        const matching = numeric.filter((s) => s.seed === seed)
        return [
          matching.find((s) => s.little32 !== s.big32 && s.little64 !== s.big64),
          matching.find((s) => s.little32 === s.big32 && s.little64 === s.big64),
        ].filter((s) => s !== undefined)
      })
      expect(samples.length).toBeGreaterThan(0)
      const fixtures: { name: string; row: Row; expected: Outcome }[] = []
      let nativeInserts = 0,
        portable = 0,
        deferred = 0
      for (const sample of samples) {
        const span = '[' + sample.value + ',)'
        const alternatives: Record<string, { word: number; extended: bigint }> = {}
        for (const order of ['little', 'big'] as const) {
          const lo32 = sample[order === 'little' ? 'little32' : 'big32'],
            lo64 = sample[order === 'little' ? 'little64' : 'big64']
          const result = (
            await pg.query<{ word: number; extended: string }>(
              `WITH h AS(SELECT hashint4(18) # $1::integer a,hashint4extended(18,$3::bigint) # $2::bigint b) SELECT ((a<<1)|(a>>31 & 1)) word,(((b<<1)&(-4294967298::bigint))|((b>>31)&4294967297::bigint))::text extended FROM h`,
              [lo32, lo64, sample.seed],
            )
          ).rows[0]!
          alternatives[order] = { word: result.word, extended: BigInt(result.extended) }
        }
        const empty = (
          await pg.query<{ word: number; extended: string }>(
            `SELECT hash_range('empty'::${sqlType}) word,hash_range_extended('empty'::${sqlType},$1)::text extended`,
            [sample.seed],
          )
        ).rows[0]!
        for (const cells of [
          [],
          [null],
          ['empty'],
          [span],
          [span, null],
          [span, 'empty', span],
        ] as (string | null)[][]) {
          const text = rangeArrayText(cells),
            payload = (await readRangeArrayFixture(pg, valueType, text))!
          const hashes: Record<string, { word: number; extended: bigint }> = {}
          for (const order of ['little', 'big']) {
            let word = 1n,
              extended = 1n
            for (const cell of cells) {
              const value =
                cell === null
                  ? { word: 0, extended: 0n }
                  : cell === 'empty'
                    ? { word: empty.word, extended: BigInt(empty.extended) }
                    : alternatives[order]!
              word = BigInt.asIntN(32, word * 31n + BigInt(value.word))
              extended = BigInt.asIntN(64, extended * 31n + value.extended)
            }
            hashes[order] = { word: Number(word), extended }
          }
          const native = (
            await pg.query<{ word: number; extended: string }>(
              `SELECT hash_array($1::${sqlType}[]) word,hash_array_extended($1::${sqlType}[],$2)::text extended`,
              [text, sample.seed],
            )
          ).rows[0]!
          expect(hashes.little).toEqual({ word: native.word, extended: BigInt(native.extended) })
          const nestedHashes = Object.fromEntries(
            Object.entries(hashes).map(([order, h]) => [
              order,
              {
                word: Number(BigInt.asIntN(32, 31n + BigInt(h.word))),
                extended: BigInt.asIntN(64, 31n + h.extended),
              },
            ]),
          )
          const nestedNative = (
            await pg.query<{ word: number; extended: string; text: string }>(
              'SELECT hash_array(ARRAY[$1::range_hash_history]) word,hash_array_extended(ARRAY[$1::range_hash_history],$2)::text extended,ARRAY[$1::range_hash_history]::text text',
              [text, sample.seed],
            )
          ).rows[0]!
          expect(nestedHashes.little).toEqual({
            word: nestedNative.word,
            extended: BigInt(nestedNative.extended),
          })
          const nestedPayload: OwnedArrayInputPayload = {
            elementType: arrayElementIdentity(
              domainElementType(
                { schema: 'public', name: 'range_hash_history' },
                `array:${valueType}`,
              ),
            ),
            elementKind: 41,
            dimensions: [{ lower: 1, length: 1 }],
            elements: [{ kind: 'Array', value: payload }],
            nullBitmap: { kind: 'Value', value: false },
          }
          for (const f of forms) {
            const expectedNative = f.nested ? nestedNative : native
            await pg.query(`INSERT INTO range_array_hash_${f.name} VALUES($1,$2,$3,$4)`, [
              f.nested ? nestedNative.text : text,
              sample.seed,
              expectedNative.word,
              expectedNative.extended,
            ])
            nativeInserts++
          }
          for (const context of contexts)
            for (const f of forms)
              for (const mismatch of [false, true]) {
                const selectedHashes = f.nested ? nestedHashes : hashes
                const chosen = selectedHashes[context.order ?? 'little']!,
                  same = selectedHashes.little![f.field] === selectedHashes.big![f.field]
                const expected: Outcome =
                  context.order === undefined && !same
                    ? { kind: 'Unknown' }
                    : { kind: mismatch ? 'False' : 'True' }
                if (expected.kind === 'Unknown') deferred++
                else portable++
                const row: Row = {
                  payload: { kind: 'Value', value: f.nested ? nestedPayload : payload },
                  seed: { kind: 'Value', value: BigInt(sample.seed) },
                  expected32: { kind: 'Value', value: mismatch ? chosen.word ^ 1 : chosen.word },
                  expected64: {
                    kind: 'Value',
                    value: mismatch ? chosen.extended ^ 1n : chosen.extended,
                  },
                }
                for (const origin of ['source', 'stored'])
                  fixtures.push({
                    name: 'range_array_hash_' + f.name + '_' + origin + '_' + context.name,
                    row,
                    expected,
                  })
              }
        }
      }
      await runCheckParity(directory, 'rangearrayhashcontext', group, names, fixtures)
      await mkdir('artifacts/check-range-arrays', { recursive: true })
      await writeFile(
        custom
          ? 'artifacts/check-range-arrays/custom-hash-context-report.json'
          : 'artifacts/check-range-arrays/hash-context-report.json',
        JSON.stringify(
          {
            nativeInserts,
            fixtures: fixtures.length,
            portable,
            deferred,
            orders: contexts.map((c) => c.name),
            nestedDomainArrays: true,
            referenceSha256: createHash('sha256').update(bytes).digest('hex'),
          },
          null,
          2,
        ) + '\n',
      )
    } finally {
      await pg.close()
      await rm(directory, { recursive: true, force: true })
    }
  }, 180000)
