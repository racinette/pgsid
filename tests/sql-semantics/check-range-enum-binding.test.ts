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
  type Outcome,
  type Input,
} from '../../tools/check-rust/parity.js'
import { customRangeProfiles } from './check-custom-range-fixtures.js'
import { scalarRangeText } from './check-scalar-range-fixtures.js'
import { readRangeFixture } from './check-range-fixtures.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'
import { rangeArrayText, readRangeArrayFixture } from './check-range-array-fixtures.js'
import { readMultirangeArrayFixture } from './check-multirange-array-fixtures.js'

const quote = (name: string) => '"' + name.replaceAll('"', '""') + '"'
const input = (value: Extract<Input, { kind: 'Value' }>['value'] | null) =>
  value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }

it('admits captured enum range profiles, literals, constructors and recursive composition in source and stored INSERT checks without label OIDs', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-enum-range-binding-'))
  try {
    await pg.exec(`CREATE SCHEMA "Enum.Range";
      CREATE TYPE "Enum.Range".label AS ENUM('z','a','','é');
      ALTER TYPE "Enum.Range".label ADD VALUE 'mid' BEFORE 'a';
      CREATE TYPE "Enum.Range".span AS RANGE(subtype="Enum.Range".label,multirange_type_name=span_set);
      CREATE DOMAIN "Enum.Range".checked_label AS "Enum.Range".label CHECK(VALUE::"Enum.Range".label <> '');
      CREATE DOMAIN "Enum.Range".nested_label AS "Enum.Range".checked_label;
      CREATE TYPE "Enum.Range".domain_span AS RANGE(subtype="Enum.Range".nested_label,multirange_type_name=domain_set);
      CREATE TYPE "Enum.Range".empty_label AS ENUM();
      CREATE TYPE "Enum.Range".empty_span AS RANGE(subtype="Enum.Range".empty_label,multirange_type_name=empty_set);
      CREATE TYPE "Enum.Range".blank_label AS ENUM('');
      CREATE TYPE "Enum.Range".blank_span AS RANGE(subtype="Enum.Range".blank_label,multirange_type_name=blank_set);`)
    const initial = await snapshotCatalog(pg),
      profiles = customRangeProfiles(initial)
    expect(profiles).toHaveLength(4)
    const families = profiles.flatMap((profile, profileIndex) =>
      [false, true].map((multi, multiIndex) => ({
        profile,
        multi,
        index: profileIndex * 2 + multiIndex,
        type: multi ? profile.multirange : profile.identity,
      })),
    )
    const forms = families.flatMap((family) => {
      const named = (implementation: string) => {
        const fn = initial.rangeTypes
          .find((p) => p.identity === family.profile.identity)!
          .callables!.find((f) => f.implementation === implementation)!
        return [fn.schema, fn.name].map(quote).join('.')
      }
      const values = family.profile.subtypeEnum!.values
      const literal = values.length ? scalarRangeText(values[0]!, values.at(-1)!) : 'empty'
      return Object.entries({
        output: 'v::text',
        lower: 'lower(v)::text',
        upper: 'upper(v)::text',
        equal: '(v=w)::text',
        ordered: '(v<w)::text',
        contains: '(v @> w)::text',
        overlaps: '(v && w)::text',
        adjacent: '(v -|- w)::text',
        element: '(v @> element)::text',
        intersection: '(v*w)::text',
        union: '(v+w)::text',
        difference: '(v-w)::text',
        parsed: `(payload::${family.type})::text`,
        coalesce: `COALESCE(v,'${family.multi ? '{}' : 'empty'}'::${family.type})::text`,
        literal: `'${(family.multi ? '{' + literal + '}' : literal).replaceAll("'", "''")}'::${family.type}::text`,
        wire: `encode(${family.multi ? 'multirange_send' : 'range_send'}(v),'hex')`,
        hash: `${family.multi ? 'hash_multirange' : 'hash_range'}(v)::text`,
        seeded_hash: `${family.multi ? 'hash_multirange_extended' : 'hash_range_extended'}(v,7)::text`,
        array_output: 'items::text',
        array_sort: 'array_sort(items)::text',
        array_fetch: 'items[-2]::text',
        scalar_json: 'to_json(v)::text',
        scalar_jsonb: 'to_jsonb(v)::text',
        array_json: 'to_jsonb(items)::text',
        nested: `to_jsonb(ARRAY[items::enum_history_${family.index},NULL::enum_history_${family.index}])::text`,
        constructed: family.multi
          ? `${named('multirange_constructor1')}(range_merge(v))::text`
          : `${named('range_constructor3')}(element,finish,bounds)::text`,
      }).map(([name, output]) => ({
        ...family,
        name,
        output,
        table: `enum_range_${family.index}_${name}`,
        sql: `CASE WHEN bypass THEN true ELSE (${output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END`,
      }))
    })
    for (const family of families)
      await pg.exec(`CREATE DOMAIN enum_history_${family.index} AS ${family.type}[]`)
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE ${f.table}(v ${f.type},w ${f.type},items ${f.type}[],payload text,element ${f.profile.subtype},finish ${f.profile.subtype},bounds text,expected text,bypass bool,CONSTRAINT matches CHECK(${f.sql}))`,
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
      nativeByteOrder: 'little',
    })
    for (const [i, check] of group.checks.entries())
      expect(
        check.kind,
        plans[i]!.identity.owner + ': ' + JSON.stringify(check).slice(0, 1800),
      ).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    let inserts = 0
    for (const family of families) {
      const labels = family.profile.subtypeEnum!.values.filter(
        (label) => family.profile.name !== 'domain_span' || label !== '',
      )
      const first = labels[0] ?? null,
        last = labels.at(-1) ?? null
      const a = labels.length ? scalarRangeText(first, first) : 'empty',
        b = labels.length ? scalarRangeText(first, last) : 'empty'
      const samples = [
        { v: null, w: null, m: null, n: null, e: null, f: null },
        { v: 'empty', w: '(,)', m: '{}', n: '{(,)}', e: null, f: null },
        { v: a, w: b, m: `{${a}}`, n: `{${b}}`, e: first, f: last },
        ...(labels.length > 1
          ? [
              {
                v: scalarRangeText(labels[1]!, labels[2]!),
                w: scalarRangeText(labels[2]!, labels[2]!),
                m: `{${scalarRangeText(labels[1]!, labels[2]!)}}`,
                n: `{${scalarRangeText(labels[2]!, labels[2]!)}}`,
                e: labels[1]!,
                f: labels[2]!,
              },
            ]
          : []),
      ]
      for (const sample of samples) {
        const text = family.multi ? sample.m : sample.v,
          other = family.multi ? sample.n : sample.w,
          itemsText = text === null ? null : rangeArrayText([text, null, other], -2)
        const read = async (value: string | null) =>
          family.multi
            ? readMultirangeFixture(pg, family.profile.multirangeType, value)
            : readRangeFixture(
                pg,
                `SELECT $1::${family.type} span`,
                'span',
                family.profile.rangeType,
                [value],
              )
        const v = await read(text),
          w = await read(other),
          items = family.multi
            ? await readMultirangeArrayFixture(pg, family.profile.multirangeType, itemsText)
            : await readRangeArrayFixture(pg, family.profile.rangeType, itemsText)
        const spans =
          v === null
            ? []
            : 'ranges' in v
              ? v.ranges.flatMap((member) => (member.kind === 'Value' ? [member.value] : []))
              : [v]
        const finite = spans.some((span) => span.bounds.some((bound) => bound.kind !== 'Null'))
        for (const form of forms.filter((f) => f.index === family.index)) {
          let output: string | null = null,
            failure: string | undefined
          const parameters = [text, other, itemsText, text, sample.e, sample.f, '[]']
          try {
            output = (
              await pg.query<{ value: string | null }>(
                `SELECT (${form.output}) value FROM(SELECT $1::${family.type} v,$2::${family.type} w,$3::${family.type}[] items,$4::text payload,$5::${family.profile.subtype} element,$6::${family.profile.subtype} finish,$7::text bounds)q`,
                parameters,
              )
            ).rows[0]!.value
          } catch (error) {
            failure = (error as { code: string }).code
          }
          for (const wrong of [false, true]) {
            const expected = wrong ? '!different!' : output
            let native: Outcome
            try {
              await pg.query(`INSERT INTO ${form.table} VALUES($1,$2,$3,$4,$5,$6,$7,$8,false)`, [
                ...parameters,
                expected,
              ])
              native = { kind: 'True' }
            } catch (error) {
              const code = (error as { code: string }).code
              native =
                code === '23514'
                  ? { kind: 'False' }
                  : { kind: 'Error', value: { state: parseInt(code, 36) } }
            }
            inserts++
            if (failure)
              expect(native).toEqual({ kind: 'Error', value: { state: parseInt(failure, 36) } })
            const row: Row = {
              v: input(v),
              w: input(w),
              items: input(items),
              payload: input(text),
              element: input(
                sample.e === null ? null : family.profile.subtypeEnum!.values.indexOf(sample.e),
              ),
              finish: input(
                sample.f === null ? null : family.profile.subtypeEnum!.values.indexOf(sample.f),
              ),
              bounds: input('[]'),
              expected: input(expected),
              bypass: input(false),
            }
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: form.table + '_' + origin,
                row,
                expected:
                  !failure &&
                  native.kind !== 'Error' &&
                  text !== null &&
                  ((form.name.endsWith('hash') && finite) ||
                    (form.name === 'wire' && /[^\x00-\x7f]/u.test(text)))
                    ? { kind: 'Unknown' }
                    : native,
              })
            references.push({ family: family.type, form: form.name, sample, wrong, output, native })
          }
        }
      }
    }
    await mkdir('artifacts/enum-range-binding', { recursive: true })
    await writeFile(
      'artifacts/enum-range-binding/report.json',
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
    await runCheckParity(
      directory,
      'enumrangebinding',
      group,
      plans.map((p) => p.identity.owner + '_' + p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 600_000)
