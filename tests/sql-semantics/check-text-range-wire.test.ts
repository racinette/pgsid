import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
import { customRangeProfiles } from './check-custom-range-fixtures.js'
import { textRangeSchema } from './check-text-range-fixtures.js'
import { readRangeFixture } from './check-range-fixtures.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'
import { rangeArrayText, readRangeArrayFixture } from './check-range-array-fixtures.js'
import { readMultirangeArrayFixture } from './check-multirange-array-fixtures.js'

const cell = (value: string | boolean | bigint | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

it.each([true, false])(
  'preserves text range wire and hash context with declared UTF8=%s',
  async (utf8) => {
    const pg = await PGlite.create(),
      directory = await mkdtemp(join(tmpdir(), 'pgsid-text-range-wire-'))
    try {
      await pg.exec(textRangeSchema)
      const profiles = customRangeProfiles(await snapshotCatalog(pg))
      const families = profiles.flatMap((profile, index) =>
        [false, true].map((multi) => ({
          profile,
          multi,
          index: index * 2 + Number(multi),
          type: multi ? profile.multirange : profile.identity,
        })),
      )
      for (const family of families)
        await pg.exec(`CREATE DOMAIN text_wire_history_${family.index} AS ${family.type}[]`)
      const forms = families.flatMap((family) =>
        Object.entries({
          send: `encode(${family.multi ? 'multirange' : 'range'}_send(v),'hex')`,
          hash: `hash_${family.multi ? 'multirange' : 'range'}(v)::text`,
          extended: `hash_${family.multi ? 'multirange' : 'range'}_extended(v,seed)::text`,
          array_hash: 'hash_array(items)::text',
          array_extended: 'hash_array_extended(items,seed)::text',
          nested: `hash_array(ARRAY[items::text_wire_history_${family.index}])::text`,
        }).map(([name, output]) => ({
          ...family,
          name,
          output,
          table: `text_wire_${family.index}_${name}`,
          extended: name.includes('extended'),
          sql: `CASE WHEN bypass THEN true ELSE (${output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END`,
        })),
      )
      for (const form of forms)
        await pg.exec(
          `CREATE TABLE ${form.table}(v ${form.type},items ${form.type}[],seed bigint,expected text,bypass bool,CONSTRAINT matches CHECK(${form.sql}))`,
        )
      const catalog = await snapshotCatalog(pg)
      const plans = forms.flatMap((form) => {
        const table = catalog.tables.find((table) => table.name === form.table)!
        return (['source', 'stored'] as const).map((origin) => ({
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: origin,
          },
          expression: portableCheckAtoms(
            lowerTableCheck(
              table,
              origin === 'source'
                ? { ...table.constraints[0]!, definition: `CHECK(${form.sql})` }
                : table.constraints[0]!,
              catalog.enums,
              catalog.domains,
              origin,
              catalog.rangeTypes,
            )!.expression,
          ),
        }))
      })
      const group = prepareCheckRustGroup(plans, {
        defaultCollation: 'C',
        nativeByteOrder: 'little',
        arrayNulls: true,
        ...(utf8 ? { serverEncoding: 'UTF8' as const } : {}),
      })
      for (const [index, check] of group.checks.entries())
        expect(
          check.kind,
          plans[index]!.identity.owner + JSON.stringify(check).slice(0, 1500),
        ).toBe('supported')
      const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
        references: unknown[] = []
      let inserts = 0
      for (const family of families)
        for (const raw of [null, 'empty', '(,)', '[a,z)', '[é,漢]', '[\uE000,𐀀]']) {
          const text = family.multi && raw !== null ? (raw === 'empty' ? '{}' : `{${raw}}`) : raw,
            itemsText = text === null ? null : rangeArrayText([text, null, text], -3),
            v = family.multi
              ? await readMultirangeFixture(pg, family.profile.multirangeType, text)
              : await readRangeFixture(
                  pg,
                  `SELECT $1::${family.type} span`,
                  'span',
                  family.profile.rangeType,
                  [text],
                ),
            items = family.multi
              ? await readMultirangeArrayFixture(pg, family.profile.multirangeType, itemsText)
              : await readRangeArrayFixture(pg, family.profile.rangeType, itemsText),
            nonAscii = raw !== null && /[^\x00-\x7f]/u.test(raw)
          for (const form of forms.filter((form) => form.index === family.index))
            for (const seed of form.extended ? [0n, -1n, null] : [0n]) {
              let output: string | null = null,
                failure: string | undefined
              try {
                output = (
                  await pg.query<{ value: string | null }>(
                    `SELECT (${form.output}) value FROM(SELECT $1::${family.type} v,$2::${family.type}[] items,$3::int8 seed)q`,
                    [text, itemsText, seed],
                  )
                ).rows[0]!.value
              } catch (error) {
                failure = (error as { code: string }).code
              }
              references.push({ type: family.type, form: form.name, text, seed, output, failure })
              for (const bypass of [false, true])
                for (const wrong of [false, true]) {
                  const expected = wrong ? '!different!' : output
                  let native: Outcome
                  try {
                    const result = (
                      await pg.query<{ value: boolean | null }>(
                        `INSERT INTO ${form.table} VALUES($1,$2,$3,$4,$5) RETURNING (${form.sql}) value`,
                        [text, itemsText, seed, expected, bypass],
                      )
                    ).rows[0]!.value
                    native = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
                  } catch (error) {
                    const code = (error as { code: string }).code
                    native =
                      code === '23514' &&
                      (error as { constraint?: string }).constraint === 'matches'
                        ? { kind: 'False' }
                        : { kind: 'Error', value: { state: parseInt(code, 36) } }
                  }
                  inserts++
                  const unavailable =
                    !bypass &&
                    !failure &&
                    nonAscii &&
                    (form.name === 'send' || (!utf8 && (!form.extended || seed !== null)))
                  const row: Row = {
                    v: v === null ? { kind: 'Null' } : { kind: 'Value', value: v },
                    items: items === null ? { kind: 'Null' } : { kind: 'Value', value: items },
                    seed: cell(seed),
                    expected: cell(expected),
                    bypass: cell(bypass),
                  }
                  for (const origin of ['source', 'stored'])
                    fixtures.push({
                      name: form.table + '_' + origin,
                      row,
                      expected: unavailable ? { kind: 'Unknown' } : native,
                    })
                }
            }
        }
      await mkdir('artifacts/text-range-wire', { recursive: true })
      await writeFile(
        `artifacts/text-range-wire/${utf8 ? 'utf8' : 'unspecified'}-report.json`,
        JSON.stringify(
          { inserts, fixtures: fixtures.length, plans: plans.length, references },
          (_key, value) => (typeof value === 'bigint' ? value.toString() : value),
          2,
        ) + '\n',
      )
      await runCheckParity(
        directory,
        'textwire' + Number(utf8),
        group,
        plans.map((plan) => plan.identity.owner + '_' + plan.identity.constraint),
        fixtures,
      )
    } finally {
      await pg.close()
      await rm(directory, { recursive: true, force: true })
    }
  },
  300_000,
)
