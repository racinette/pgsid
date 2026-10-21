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

const cell = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const quote = (name: string) => '"' + name.replaceAll('"', '""') + '"'

it('binds text ranges and multiranges through C profiles, domains, constructors, input/output, arrays and JSON in source/stored CHECKs', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-text-range-binding-'))
  try {
    await pg.exec(textRangeSchema)
    const initial = await snapshotCatalog(pg)
    const profiles = customRangeProfiles(initial)
    const families = profiles.flatMap((profile, index) =>
      [false, true].map((multi) => ({
        profile,
        multi,
        index: index * 2 + Number(multi),
        type: multi ? profile.multirange : profile.identity,
      })),
    )
    const forms = families.flatMap((family) => {
      const { profile, multi, index } = family
      const named = (implementation: string) => {
        const fn = initial.rangeTypes
          .find((item) => item.identity === profile.identity)!
          .callables!.find((fn) => fn.implementation === implementation)!
        return [fn.schema, fn.name].map(quote).join('.')
      }
      const outputs = {
        output: 'v::text',
        lower: 'lower(v)::text',
        upper: 'upper(v)::text',
        empty: 'isempty(v)::text',
        equal: '(v=w)::text',
        ordered: '(v<w)::text',
        contains: '(v @> w)::text',
        overlaps: '(v && w)::text',
        adjacent: '(v -|- w)::text',
        element: `(v @> element::${profile.subtype})::text`,
        intersection: '(v*w)::text',
        union: '(v+w)::text',
        difference: '(v-w)::text',
        input: `(payload::${family.type})::text`,
        coalesce: `COALESCE(v,'${multi ? '{}' : 'empty'}'::${family.type})::text`,
        array_output: 'items::text',
        array_sort: 'array_sort(items)::text',
        array_compare: '(items=items)::text',
        array_contain: '(items @> items)::text',
        array_fetch: '(items[-2])::text',
        array_raw_json: 'array_to_json(items)::text',
        array_jsonb: 'to_jsonb(items)::text',
        scalar_json: 'to_json(v)::text',
        scalar_jsonb: 'to_jsonb(v)::text',
        object_key: 'jsonb_build_object(v,v)::text',
        variadic_json: 'jsonb_build_array(VARIADIC items)::text',
        nested: `to_jsonb(ARRAY[items::text_history_${index},NULL::text_history_${index}])::text`,
        domain: `to_jsonb(v::text_saved_${index})::text`,
        constructed: multi
          ? `${named('multirange_constructor1')}(range_merge(v))::text`
          : `${named('range_constructor3')}(element,finish,bounds)::text`,
      }
      return Object.entries(outputs).map(([name, output]) => ({
        ...family,
        name,
        output,
        table: `text_ranges_${index}_${name}`,
        sql: `CASE WHEN bypass THEN true ELSE (${output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END`,
      }))
    })
    for (const family of families)
      await pg.exec(
        `CREATE DOMAIN text_saved_${family.index} AS ${family.type};CREATE DOMAIN text_history_${family.index} AS ${family.type}[]`,
      )
    for (const form of forms)
      await pg.exec(
        `CREATE TABLE ${form.table}(v ${form.type},w ${form.type},items ${form.type}[],payload text,element text,finish text,bounds text,expected text,bypass bool,CONSTRAINT matches CHECK(${form.sql}))`,
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
      serverEncoding: 'UTF8',
      arrayNulls: true,
    })
    for (const [index, check] of group.checks.entries())
      expect(check.kind, plans[index]!.identity.owner + JSON.stringify(check).slice(0, 1500)).toBe(
        'supported',
      )
    const samples = [
      { v: null, w: null, m: null, n: null, e: null, f: null, flags: null },
      { v: 'empty', w: '(,)', m: '{}', n: '{(,)}', e: '', f: 'z', flags: '[]' },
      { v: '[a,m]', w: '[m,z]', m: '{[a,m],[n,z]}', n: '{[m,z]}', e: 'a', f: 'm', flags: '[]' },
      {
        v: '[é,漢]',
        w: '[\uE000,𐀀]',
        m: '{[é,漢],[\uE000,𐀀]}',
        n: '{[𐀀,😀]}',
        e: 'é',
        f: '漢',
        flags: '()',
      },
      {
        v: '["a b","a\\\\b"]',
        w: '["a""b","a,b"]',
        m: '{["a b","a\\\\b"]}',
        n: '{["a""b","a,b"]}',
        e: 'a"b',
        f: 'a,b',
        flags: '[)',
      },
      { v: '(,)', w: 'empty', m: '{(,)}', n: '{}', e: null, f: null, flags: '[]' },
      { v: '[x,x]', w: '[x,x)', m: '{[x,x]}', n: '{}', e: 'x', f: 'x', flags: '[]' },
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    let inserts = 0
    for (const family of families)
      for (const sample of samples) {
        const { profile, multi } = family,
          text = multi ? sample.m : sample.v,
          other = multi ? sample.n : sample.w,
          itemsText = text === null ? null : rangeArrayText([text, null, other], -2)
        const read = async (value: string | null) =>
          multi
            ? readMultirangeFixture(pg, profile.multirangeType, value)
            : readRangeFixture(pg, `SELECT $1::${family.type} span`, 'span', profile.rangeType, [
                value,
              ])
        const v = await read(text),
          w = await read(other),
          items = multi
            ? await readMultirangeArrayFixture(pg, profile.multirangeType, itemsText)
            : await readRangeArrayFixture(pg, profile.rangeType, itemsText)
        for (const form of forms.filter((form) => form.index === family.index)) {
          let output: string | null = null,
            failure: string | undefined
          try {
            output = (
              await pg.query<{ value: string | null }>(
                `SELECT (${form.output}) value FROM(SELECT $1::${family.type} v,$2::${family.type} w,$3::${family.type}[] items,$4::text payload,$5::text element,$6::text finish,$7::text bounds)q`,
                [text, other, itemsText, text, sample.e, sample.f, sample.flags],
              )
            ).rows[0]!.value
          } catch (error) {
            failure = (error as { code: string }).code
          }
          references.push({ type: family.type, form: form.name, sample, output, failure })
          for (const bypass of [false, true])
            for (const wrong of [false, true]) {
              const expected = wrong ? '!different!' : output
              let native: Outcome
              try {
                const result = (
                  await pg.query<{ value: boolean | null }>(
                    `INSERT INTO ${form.table} VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING (${form.sql}) value`,
                    [
                      text,
                      other,
                      itemsText,
                      text,
                      sample.e,
                      sample.f,
                      sample.flags,
                      expected,
                      bypass,
                    ],
                  )
                ).rows[0]!.value
                native = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
              } catch (error) {
                const code = (error as { code: string }).code
                native =
                  code === '23514' && (error as { constraint?: string }).constraint === 'matches'
                    ? { kind: 'False' }
                    : { kind: 'Error', value: { state: parseInt(code, 36) } }
              }
              inserts++
              const row: Row = {
                v: v === null ? { kind: 'Null' } : { kind: 'Value', value: v },
                w: w === null ? { kind: 'Null' } : { kind: 'Value', value: w },
                items: items === null ? { kind: 'Null' } : { kind: 'Value', value: items },
                payload: cell(text),
                element: cell(sample.e),
                finish: cell(sample.f),
                bounds: cell(sample.flags),
                expected: cell(expected),
                bypass: cell(bypass),
              }
              for (const origin of ['source', 'stored'])
                fixtures.push({ name: form.table + '_' + origin, row, expected: native })
            }
        }
      }
    await mkdir('artifacts/text-range-binding', { recursive: true })
    await writeFile(
      'artifacts/text-range-binding/report.json',
      JSON.stringify(
        {
          profiles: profiles.length,
          plans: plans.length,
          inserts,
          fixtures: fixtures.length,
          references,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      directory,
      'textrangebinding',
      group,
      plans.map((plan) => plan.identity.owner + '_' + plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 600_000)
