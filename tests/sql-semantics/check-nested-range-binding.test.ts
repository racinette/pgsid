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
  type Row,
  type Input,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import { customRangeProfiles } from './check-custom-range-fixtures.js'
import { readRangeFixture, readRangeBoundCell } from './check-range-fixtures.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'
import { rangeArrayText, readRangeArrayFixture } from './check-range-array-fixtures.js'
import { scalarRangeText } from './check-scalar-range-fixtures.js'
const input = (value: Extract<Input, { kind: 'Value' }>['value'] | null) =>
  value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }

const boundValue = async (
  pg: PGlite,
  type: string,
  text: string | null,
  sql: string,
): Promise<Extract<Input, { kind: 'Value' }>['value'] | null> => {
  if (text === null) return null
  const cell = await readRangeBoundCell(pg, type, text, sql)
  if (cell.kind !== 'Range' && cell.kind !== 'Multirange' && cell.kind !== 'Array')
    throw new Error('Expected a native known bound')
  return cell.value
}

it('binds nested range and multirange subtypes through source/stored SQL inputs and composed native INSERT checks', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-nested-range-binding-'))
  try {
    await pg.exec(`CREATE TYPE stage AS ENUM('z','mid','a');
CREATE TYPE stage_span AS RANGE(subtype=stage);
CREATE DOMAIN admitted AS int4range;
CREATE DOMAIN positive AS int4 CHECK(VALUE>0);CREATE TYPE positive_span AS RANGE(subtype=positive);
CREATE TYPE ints_outer AS RANGE(subtype=int4range,multirange_type_name=ints_set);
CREATE TYPE nums_outer AS RANGE(subtype=numrange,multirange_type_name=nums_set);
CREATE TYPE multi_outer AS RANGE(subtype=int4multirange,multirange_type_name=multi_set);
CREATE TYPE enum_outer AS RANGE(subtype=stage_span,multirange_type_name=enum_set);
CREATE TYPE domain_outer AS RANGE(subtype=admitted,multirange_type_name=domain_set);
CREATE TYPE checked_outer AS RANGE(subtype=positive_span,multirange_type_name=checked_set);
CREATE TYPE array_outer AS RANGE(subtype=int4range[],multirange_type_name=array_set);
CREATE TYPE deep_outer AS RANGE(subtype=ints_outer,multirange_type_name=deep_set);`)
    const initial = await snapshotCatalog(pg),
      profiles = customRangeProfiles(initial).filter((p) => p.name.endsWith('_outer'))
    expect(profiles).toHaveLength(8)
    const family = profiles.map((p, index) => {
      const a =
          p.name === 'enum_outer'
            ? '[z,mid]'
            : p.name === 'multi_outer'
              ? '{[1,3)}'
              : p.name === 'array_outer'
                ? '{"[1,3)"}'
                : p.name === 'deep_outer'
                  ? '["[1,3)",)'
                  : '[1,3)',
        b =
          p.name === 'enum_outer'
            ? '[mid,a]'
            : p.name === 'multi_outer'
              ? '{[4,6)}'
              : p.name === 'array_outer'
                ? '{"[4,6)"}'
                : p.name === 'deep_outer'
                  ? '["[4,6)",)'
                  : '[4,6)'
      return { p, index, a, b, literal: scalarRangeText(a, b) }
    })
    const forms = family.flatMap((f) =>
      Object.entries({
        output: 'v::text',
        lower: 'lower(v)::text',
        equal: '(v=w)::text',
        ordered: '(v<w)::text',
        contains: '(v @> a)::text',
        intersection: '(v*w)::text',
        constructed: `${f.p.identity}(a,b,flags)::text`,
        parsed: `(payload::${f.p.identity})::text`,
        literal: `'${f.literal.replaceAll("'", "''")}'::${f.p.identity}::text`,
        coalesce: `COALESCE(v,'empty'::${f.p.identity})::text`,
        multi_output: 'm::text',
        multi_parsed: `((m::text)::${f.p.multirange})::text`,
        multi_literal: `'${('{' + f.literal + '}').replaceAll("'", "''")}'::${f.p.multirange}::text`,
        multi_merge: 'range_merge(m)::text',
        multi_constructed: `${f.p.multirange}(v,w)::text`,
        array_output: 'items::text',
        array_sort: 'array_sort(items)::text',
        array_fetch: 'items[-2]::text',
        json: 'to_jsonb(v)::text',
        array_json: 'to_jsonb(items)::text',
      }).map(([name, output]) => ({
        ...f,
        name,
        output,
        table: `array_range_${f.index}_${name}`,
        sql: `CASE WHEN bypass THEN true ELSE (${output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END`,
      })),
    )
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE ${f.table}(v ${f.p.identity},w ${f.p.identity},m ${f.p.multirange},items ${f.p.identity}[],a ${f.p.subtype},b ${f.p.subtype},payload text,flags text,expected text,bypass bool,CONSTRAINT matches CHECK(${f.sql}))`,
      )
    const catalog = await snapshotCatalog(pg)
    const plans = forms.flatMap((f) => {
      const table = catalog.tables.find((t) => t.name === f.table)!
      return (['source', 'stored'] as const).map((origin) => ({
        identity: { schema: 'public', kind: 'table' as const, owner: f.table, constraint: origin },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'source'
              ? { ...table.constraints[0]!, definition: `CHECK(${f.sql})` }
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
    for (const [i, check] of group.checks.entries())
      expect(
        check.kind,
        plans[i]!.identity.owner + ': ' + JSON.stringify(check).slice(0, 1200),
      ).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    let inserts = 0
    for (const f of family) {
      const empty = f.p.name === 'multi_outer' || f.p.name === 'array_outer' ? '{}' : 'empty'
      const samples: {
        v: string | null
        w: string | null
        a: string | null
        b: string | null
        flags?: string | null
        payload?: string
        only?: string
      }[] = [
        { v: null, w: null, a: null, b: null },
        { v: 'empty', w: '(,)', a: empty, b: empty },
        { v: f.literal, w: scalarRangeText(f.b, null), a: f.a, b: f.b },
        { v: scalarRangeText(f.a, null), w: '(,)', a: f.a, b: null },
        { v: f.literal, w: 'empty', a: f.b, b: f.a, only: 'constructed' },
        { v: f.literal, w: 'empty', a: f.a, b: f.b, flags: null, only: 'constructed' },
        { v: f.literal, w: 'empty', a: f.a, b: f.b, flags: 'bad', only: 'constructed' },
        { v: f.literal, w: 'empty', a: f.a, b: f.b, payload: 'bad', only: 'parsed' },
        {
          v: f.literal,
          w: 'empty',
          a: f.a,
          b: f.b,
          payload: scalarRangeText('bad', null),
          only: 'parsed',
        },
        ...(f.p.name === 'checked_outer'
          ? [
              {
                v: f.literal,
                w: 'empty',
                a: f.a,
                b: f.b,
                payload: scalarRangeText('[-1,2]', null),
                only: 'parsed',
              },
            ]
          : []),
      ]
      for (const sample of samples) {
        const m = sample.v === null ? null : `{${sample.v}}`,
          items = sample.v === null ? null : rangeArrayText([sample.v, null, sample.w], -2)
        const row: Row = {
          v: input(
            await readRangeFixture(pg, `SELECT $1::${f.p.identity} span`, 'span', f.p.rangeType, [
              sample.v,
            ]),
          ),
          w: input(
            await readRangeFixture(pg, `SELECT $1::${f.p.identity} span`, 'span', f.p.rangeType, [
              sample.w,
            ]),
          ),
          m: input(await readMultirangeFixture(pg, f.p.multirangeType, m)),
          items: input(await readRangeArrayFixture(pg, f.p.rangeType, items)),
          a: input(await boundValue(pg, f.p.elementType, sample.a, f.p.subtype)),
          b: input(await boundValue(pg, f.p.elementType, sample.b, f.p.subtype)),
          payload: input(sample.payload ?? sample.v),
          flags: input(Object.hasOwn(sample, 'flags') ? sample.flags! : '[]'),
          expected: input(null),
          bypass: input(false),
        }
        for (const form of forms.filter(
          (form) => form.index === f.index && (!sample.only || form.name === sample.only),
        )) {
          const parameters = [
            sample.v,
            sample.w,
            m,
            items,
            sample.a,
            sample.b,
            sample.payload ?? sample.v,
            Object.hasOwn(sample, 'flags') ? sample.flags! : '[]',
          ]
          let expected: string | null = null,
            failure: string | undefined
          try {
            expected = (
              await pg.query<{ value: string | null }>(
                `SELECT (${form.output}) value FROM(SELECT $1::${f.p.identity} v,$2::${f.p.identity} w,$3::${f.p.multirange} m,$4::${f.p.identity}[] items,$5::${f.p.subtype} a,$6::${f.p.subtype} b,$7::text payload,$8::text flags)q`,
                parameters,
              )
            ).rows[0]!.value
          } catch (error) {
            failure = (error as { code: string }).code
          }
          for (const wrong of [false, true])
            for (const bypass of [false, true]) {
              const value = wrong ? 'wrong' : expected
              let native: Outcome
              try {
                await pg.query(`INSERT INTO ${form.table} VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [
                  ...parameters,
                  value,
                  bypass,
                ])
                native = { kind: 'True' }
              } catch (error) {
                const code = (error as { code: string }).code
                native =
                  failure && !bypass
                    ? { kind: 'Error', value: { state: parseInt(code, 36) } }
                    : code === '23514'
                      ? { kind: 'False' }
                      : { kind: 'Error', value: { state: parseInt(code, 36) } }
              }
              inserts++
              for (const origin of ['source', 'stored'])
                fixtures.push({
                  name: form.table + '_' + origin,
                  row: { ...row, expected: input(value), bypass: input(bypass) },
                  expected: native,
                })
              references.push({
                profile: f.p.identity,
                form: form.name,
                sample,
                wrong,
                bypass,
                expected: value,
                failure,
                native,
              })
            }
        }
      }
    }
    await mkdir('artifacts/nested-range-binding', { recursive: true })
    await writeFile(
      'artifacts/nested-range-binding/report.json',
      JSON.stringify(
        {
          profiles: profiles.length,
          forms: forms.length,
          fixtures: fixtures.length,
          inserts,
          references,
        },
        null,
        2,
      ) + '\n',
    )
    await writeFile('artifacts/nested-range-binding/evaluators.rs', group.evaluatorSource!)
    await runCheckParity(
      directory,
      'nestedrangebinding',
      group,
      plans.map((p) => p.identity.owner + '_' + p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 600_000)
