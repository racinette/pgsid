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
import { readRangeFixture, readArrayBoundFixture } from './check-range-fixtures.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'
import { rangeArrayText, readRangeArrayFixture } from './check-range-array-fixtures.js'
import { scalarRangeText } from './check-scalar-range-fixtures.js'
const input = (value: Extract<Input, { kind: 'Value' }>['value'] | null) =>
  value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }

it('binds array-subtype ranges through source/stored constructors, input, output and composition with native INSERT parity', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-range-binding-'))
  try {
    await pg.exec(`CREATE TYPE stage AS ENUM('z','a','','é');CREATE DOMAIN bag AS int4[] CHECK(cardinality(VALUE)<=4);CREATE DOMAIN bags AS bag;
   CREATE TYPE ints_span AS RANGE(subtype=int4[],multirange_type_name=ints_set);
   CREATE TYPE enum_span AS RANGE(subtype=stage[],multirange_type_name=enum_set);
   CREATE TYPE domain_span AS RANGE(subtype=bags,multirange_type_name=domain_set);
   CREATE TYPE nested_span AS RANGE(subtype=bag[],multirange_type_name=nested_set);
   CREATE TYPE json_span AS RANGE(subtype=json[],multirange_type_name=json_set);
   CREATE TYPE text_span AS RANGE(subtype=text[],collation="C",multirange_type_name=text_set);`)
    const initial = await snapshotCatalog(pg),
      profiles = customRangeProfiles(initial)
    expect(profiles).toHaveLength(6)
    const family = profiles.map((p, index) => {
      const a =
        p.name === 'enum_span'
          ? '{z}'
          : p.name === 'text_span'
            ? '{a}'
            : p.name === 'nested_span'
              ? '\\{"{1}"\\}'.replaceAll('\\', '')
              : p.name === 'json_span'
                ? '{}'
                : '{1}'
      const b =
        p.name === 'enum_span'
          ? '{a}'
          : p.name === 'text_span'
            ? '{é}'
            : p.name === 'nested_span'
              ? '\\{"{3}"\\}'.replaceAll('\\', '')
              : p.name === 'json_span'
                ? '{}'
                : '{3}'
      return { p, index, a, b, literal: p.name === 'json_span' ? '(,)' : scalarRangeText(a, b) }
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
      const samples: {
        v: string | null
        w: string | null
        a: string | null
        b: string | null
        flags?: string | null
        only?: string
      }[] = [
        { v: null, w: null, a: null, b: null },
        { v: 'empty', w: '(,)', a: '{}', b: '{}' },
        {
          v: f.p.name === 'json_span' ? scalarRangeText(f.a, null) : f.literal,
          w: scalarRangeText(f.b, null),
          a: f.a,
          b: f.b,
        },
      ]
      if (f.p.name === 'ints_span') {
        for (const flags of [null, 'bad'])
          samples.push({
            v: f.literal,
            w: scalarRangeText(f.b, null),
            a: f.a,
            b: f.b,
            flags,
            only: 'constructed',
          })
        samples.push(
          { v: f.literal, w: scalarRangeText(f.b, null), a: f.b, b: f.a, only: 'constructed' },
          {
            v: f.literal,
            w: scalarRangeText(f.b, null),
            a: '[-2:-1]={1,2}',
            b: '{3}',
            only: 'constructed',
          },
        )
      }
      if (f.p.name === 'enum_span')
        for (const bound of ['{é}', '{""}', '{NULL}'])
          samples.push({
            v: f.literal,
            w: scalarRangeText(f.b, null),
            a: bound,
            b: bound,
            only: 'constructed',
          })
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
          a: input(await readArrayBoundFixture(pg, f.p.elementType, f.p.subtype, sample.a)),
          b: input(await readArrayBoundFixture(pg, f.p.elementType, f.p.subtype, sample.b)),
          payload: input(sample.v),
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
            sample.v,
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
    await mkdir('artifacts/array-range-binding', { recursive: true })
    await writeFile(
      'artifacts/array-range-binding/report.json',
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
    await writeFile('artifacts/array-range-binding/evaluators.rs', group.evaluatorSource!)
    await runCheckParity(
      directory,
      'arrayrangebinding',
      group,
      plans.map((p) => p.identity.owner + '_' + p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 600_000)
