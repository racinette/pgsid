import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { arrayElementIdentity } from '../../src/codegen/shared/check-array-types.js'
import { arrayType, domainElementType } from '../../src/sql-semantics/expressions.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import { customRangeSchema, customRangeProfiles } from './check-custom-range-fixtures.js'
import { rangeCoreSamples, readRangeFixture } from './check-range-fixtures.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'
import { rangeArrayText, readRangeArrayFixture } from './check-range-array-fixtures.js'
import { readMultirangeArrayFixture } from './check-multirange-array-fixtures.js'

const known = (value: string | number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

for (const multi of [false, true])
  it(`sends and hashes captured custom ${multi ? 'multiranges' : 'ranges'} and recursive domain arrays through selected subtype support with native raw/stored INSERT parity`, async () => {
    const pg = await PGlite.create(),
      directory = await mkdtemp(join(tmpdir(), 'pgsid-custom-range-wire-'))
    try {
      await pg.exec("SET DateStyle='ISO,YMD';SET TimeZone='UTC';" + customRangeSchema)
      let catalog = await snapshotCatalog(pg)
      const profiles = customRangeProfiles(catalog)
      expect(profiles).toHaveLength(10)
      const families = profiles.map((profile, index) => ({
        profile,
        index,
        type: multi ? profile.multirangeType : profile.rangeType,
        raw: multi ? profile.multirange : profile.identity,
        cell: `wire_cell_${Number(multi)}_${index}`,
        list: `wire_list_${Number(multi)}_${index}`,
      }))
      for (const f of families)
        await pg.exec(`CREATE DOMAIN ${f.cell} AS ${f.raw};CREATE DOMAIN ${f.list} AS ${f.raw}[]`)
      const forms = families.flatMap((f) =>
        Object.entries({
          wire: { expr: `${multi ? 'multirange' : 'range'}_send(payload)`, output: 'wire' },
          wire_choice: {
            expr: `${multi ? 'multirange' : 'range'}_send(CASE WHEN choose THEN other ELSE payload END)`,
            output: 'wire',
          },
          wire_domain: {
            expr: `${multi ? 'multirange' : 'range'}_send(payload::${f.cell})`,
            output: 'wire',
          },
          hash32: { expr: `hash_${multi ? 'multirange' : 'range'}(payload)`, output: 'hash32' },
          hash64: {
            expr: `hash_${multi ? 'multirange' : 'range'}_extended(payload,seed)`,
            output: 'hash64',
          },
          hash_coalesce: {
            expr: `hash_${multi ? 'multirange' : 'range'}_extended(COALESCE(payload,other),seed)`,
            output: 'hash64',
          },
          array32: { expr: 'hash_array(items)', output: 'hash32' },
          array64: { expr: 'hash_array_extended(items,seed)', output: 'hash64' },
          plain32: { expr: `hash_array(items::${f.raw}[])`, output: 'hash32' },
          plain64: { expr: `hash_array_extended(items::${f.raw}[],seed)`, output: 'hash64' },
          nested32: { expr: 'hash_array(histories)', output: 'hash32' },
          nested64: { expr: 'hash_array_extended(histories,seed)', output: 'hash64' },
        }).map(([name, form], index) => ({
          ...f,
          ...form,
          name,
          table: `custom_wire_${Number(multi)}_${f.index}_${index}`,
          sql: `CASE WHEN bypass THEN true ELSE (${form.expr}) IS NOT DISTINCT FROM expected_${form.output} END`,
        })),
      )
      for (const f of forms)
        await pg.exec(
          `CREATE TABLE ${f.table}(payload ${f.cell},other ${f.raw},items ${f.cell}[],histories ${f.list}[],seed int8,choose bool,expected_wire bytea,expected_hash32 int4,expected_hash64 int8,bypass bool,CHECK(${f.sql}))`,
        )
      catalog = await snapshotCatalog(pg)
      const plans = forms.flatMap((f) => {
          const table = catalog.tables.find((t) => t.name === f.table)!
          return (['source', 'stored'] as const).map((origin) => ({
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: f.table,
              constraint: origin,
            },
            expression: portableCheckAtoms(
              lowerTableCheck(
                table,
                origin === 'source'
                  ? { name: 'valid', type: 'check', definition: `CHECK(${f.sql})` }
                  : table.constraints[0]!,
                catalog.enums,
                catalog.domains,
                origin,
                catalog.rangeTypes,
              )!.expression,
            ),
          }))
        }),
        names = plans.map((p) => p.identity.owner + '_' + p.identity.constraint),
        group = prepareCheckRustGroup(plans, { nativeByteOrder: 'little' })
      for (const [i, c] of group.checks.entries())
        expect(c.kind, names[i] + (c.kind === 'unsupported' ? ': ' + c.reason : '')).toBe(
          'supported',
        )
      const fixtures: { name: string; row: Row; expected: Outcome }[] = []
      let inserts = 0,
        rejections = 0,
        errors = 0
      for (const family of families) {
        const p = family.profile,
          wrap = (text: string | null) =>
            text === null ? null : multi ? (text === 'empty' ? '{}' : '{' + text + '}') : text,
          core =
            p.name === 'reverse_span'
              ? [null, 'empty', '(,)', '(,3]', '[3,)', '[4,1]', '(4,1)', '[4,1)', '(4,1]', '[3,3]']
              : p.canonical !== null || p.subtype !== p.elementType
                ? rangeCoreSamples(p.rangeType).ranges.slice(0, 13)
                : rangeCoreSamples(p.rangeType).ranges,
          samples = core.map(wrap),
          otherText = wrap(p.name === 'reverse_span' ? '[3,1]' : core[5]!)
        if (
          multi &&
          [
            'integer_span',
            'positive_span',
            'decimal_span',
            'discrete_span',
            'opaque_span',
          ].includes(p.name)
        )
          samples.push('{[1,2),[3,4]}')
        const read = (text: string | null) =>
            multi
              ? readMultirangeFixture(pg, p.multirangeType, text)
              : readRangeFixture(pg, `SELECT $1::${p.identity} span`, 'span', p.rangeType, [text]),
          other = await read(otherText)
        for (const [index, text] of samples.entries()) {
          const payload = await read(text),
            itemsText =
              text === null ? null : rangeArrayText([text, null, otherText], index % 2 ? -2 : 1),
            items = multi
              ? await readMultirangeArrayFixture(pg, p.multirangeType, itemsText)
              : await readRangeArrayFixture(pg, p.rangeType, itemsText),
            historiesText = (
              await pg.query<{ value: string }>(
                `SELECT ARRAY[$1::${family.list},NULL::${family.list}]::text AS value`,
                [itemsText],
              )
            ).rows[0]!.value,
            typed =
              items === null
                ? null
                : {
                    ...structuredClone(items),
                    elementType: arrayElementIdentity(
                      domainElementType({ schema: 'public', name: family.cell }, family.type),
                    ),
                  },
            histories = {
              elementType: arrayElementIdentity(
                domainElementType({ schema: 'public', name: family.list }, arrayType(family.type)),
              ),
              elementKind: 41,
              dimensions: [{ lower: 1, length: 2 }],
              elements: [
                items === null
                  ? { kind: 'Null' as const }
                  : { kind: 'Array' as const, value: structuredClone(items) },
                { kind: 'Null' as const },
              ],
              nullBitmap: { kind: 'Value' as const, value: true },
            }
          for (const f of forms.filter((f) => f.index === family.index))
            for (const seed of f.output === 'hash64'
              ? [null, 0n, 1n, -1n, -9223372036854775808n, 9223372036854775807n, 9007199254740993n]
              : [0n]) {
              const choose = index % 2 === 1,
                base = [
                  text,
                  otherText,
                  itemsText,
                  historiesText,
                  seed === null ? null : String(seed),
                  choose,
                ],
                projection = f.output === 'wire' ? `encode(${f.expr},'hex')` : `(${f.expr})::text`
              let rendered: string | null = null,
                failed: string | undefined
              try {
                rendered = (
                  await pg.query<{ value: string | null }>(
                    `SELECT ${projection} AS value FROM(SELECT $1::${family.cell} payload,$2::${family.raw} other,$3::${family.cell}[] items,$4::${family.list}[] histories,$5::int8 seed,$6::bool choose)inputs`,
                    base,
                  )
                ).rows[0]!.value
              } catch (e) {
                expect(e).toMatchObject({ code: '42883' })
                failed = '42883'
              }
              const actual =
                rendered === null
                  ? null
                  : f.output === 'wire'
                    ? rendered
                    : f.output === 'hash32'
                      ? Number(rendered)
                      : BigInt(rendered)
              for (const mismatch of !failed && index < 2 && seed === 0n
                ? [false, true]
                : [false]) {
                const expected = mismatch
                    ? f.output === 'wire'
                      ? 'ff'
                      : f.output === 'hash32'
                        ? actual === 1
                          ? 2
                          : 1
                        : actual === 1n
                          ? 2n
                          : 1n
                    : actual,
                  parameters = [...base, expected === null ? null : String(expected)],
                  columns = ['NULL::bytea', 'NULL::int4', 'NULL::int8']
                columns[f.output === 'wire' ? 0 : f.output === 'hash32' ? 1 : 2] =
                  f.output === 'wire'
                    ? "decode($7,'hex')"
                    : `$7::${f.output === 'hash32' ? 'int4' : 'int8'}`
                const insert = pg.query(
                  `INSERT INTO ${f.table} VALUES($1,$2,$3,$4,$5,$6,${columns.join(',')},false)`,
                  parameters,
                )
                if (failed) {
                  await expect(insert).rejects.toMatchObject({ code: failed })
                  errors++
                } else if (mismatch) {
                  await expect(insert).rejects.toMatchObject({ code: '23514' })
                  rejections++
                } else await insert
                inserts++
                const row: Row = {
                  payload: payload ? { kind: 'Value', value: payload } : known(null),
                  other: other ? { kind: 'Value', value: other } : known(null),
                  items: typed ? { kind: 'Value', value: typed } : known(null),
                  histories: { kind: 'Value', value: histories },
                  seed: known(seed),
                  choose: known(choose),
                  expected_wire: known(null),
                  expected_hash32: known(null),
                  expected_hash64: known(null),
                  bypass: known(false),
                }
                row['expected_' + f.output] = known(expected)
                for (const origin of [0, 1])
                  fixtures.push({
                    name: names[forms.indexOf(f) * 2 + origin]!,
                    row,
                    expected: failed
                      ? { kind: 'Error', value: { state: parseInt(failed, 36) } }
                      : { kind: mismatch ? 'False' : 'True' },
                  })
              }
            }
        }
      }
      await runCheckParity(
        directory,
        multi ? 'custommultiwire' : 'customrangewire',
        group,
        names,
        fixtures,
      )
      expect(rejections).toBeGreaterThan(0)
      await mkdir('artifacts/check-custom-range-wire-hash', { recursive: true })
      await writeFile(
        `artifacts/check-custom-range-wire-hash/${multi ? 'multirange' : 'range'}-report.json`,
        JSON.stringify(
          {
            profiles: profiles.length,
            plans: plans.length,
            inserts,
            rejections,
            errors,
            fixtures: fixtures.length,
          },
          null,
          2,
        ) + '\n',
      )
    } finally {
      await pg.close()
      await rm(directory, { recursive: true, force: true })
    }
  }, 480_000)
