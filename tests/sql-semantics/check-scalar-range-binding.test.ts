import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { builtinCallables, builtinTypeIO } from '../../src/postgres/builtins/inventory.js'
import { callableIdentity } from '../../src/postgres/builtins/catalog.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
import { customRangeProfiles } from './check-custom-range-fixtures.js'
import {
  scalarRangeBackends,
  scalarRangeText,
  invalidScalarRangeBounds,
} from './check-scalar-range-fixtures.js'
import { readRangeFixture } from './check-range-fixtures.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'
import { rangeArrayText, readRangeArrayFixture } from './check-range-array-fixtures.js'
import { readMultirangeArrayFixture } from './check-multirange-array-fixtures.js'

const cell = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const quote = (name: string) => '"' + name.replaceAll('"', '""') + '"'

it.each([0, 5, 10, 15])(
  'binds represented scalar range row values, constructors, domains and arrays in source/stored CHECKs, batch %s',
  async (start) => {
    const pg = await PGlite.create(),
      directory = await mkdtemp(join(tmpdir(), 'pgsid-scalar-range-binding-'))
    try {
      await pg.exec('CREATE SCHEMA "Scalar.Range"')
      const backends = scalarRangeBackends.slice(start, start + 5)
      for (const backend of backends) {
        const index = scalarRangeBackends.indexOf(backend)
        await pg.exec(
          `CREATE TYPE "Scalar.Range".span_${index} AS RANGE(subtype=${backend.type},multirange_type_name=scalar_set_${index})`,
        )
      }
      const initial = await snapshotCatalog(pg),
        profiles = customRangeProfiles(initial)
      expect(profiles).toHaveLength(backends.length)
      const families = profiles.flatMap((profile, index) =>
        [false, true].map((multi) => ({
          profile,
          multi,
          index: index * 2 + Number(multi),
          type: multi ? profile.multirange : profile.identity,
          backend: backends.find((p) => p.type === profile.elementType)!,
        })),
      )
      for (const family of families)
        await pg.exec(
          `CREATE DOMAIN scalar_saved_${family.index} AS ${family.type} CHECK(isempty(VALUE) OR lower(VALUE) IS NOT NULL);CREATE DOMAIN scalar_history_${family.index} AS ${family.type}[] CHECK(cardinality(VALUE)<=3)`,
        )
      const forms = families.flatMap((family) => {
        const { profile, multi } = family,
          send = multi ? 'multirange_send' : 'range_send',
          native = initial.rangeTypes.find((p) => p.identity === profile.identity)!,
          ctor = native.callables!.find(
            (fn) =>
              fn.implementation === (multi ? 'multirange_constructor2' : 'range_constructor3'),
          )!,
          constructor = [ctor.schema, ctor.name].map(quote).join('.'),
          subtype = builtinCallables().find(
            (fn) => callableIdentity(fn) === builtinTypeIO(profile.elementType)?.send,
          )!
        return Object.entries({
          empty: 'isempty(v)::text',
          bound: `encode(${[subtype.schema, subtype.name].map(quote).join('.')}(lower(v)),'hex')`,
          equal: '(v=w)::text',
          ordered: '(v<w)::text',
          element: '(v @> lower(w))::text',
          intersection: `encode(${send}(v*w),'hex')`,
          construct: `encode(${send}(${multi ? `${constructor}(range_merge(v),range_merge(w))` : `${constructor}(lower(v),upper(w),'[]')`}), 'hex')`,
          domain: `encode(${send}(v::scalar_saved_${family.index}),'hex')`,
          array_sort: `encode(${send}((array_sort(items))[-2]),'hex')`,
          array_position: 'array_position(items,v)::text',
          json: 'to_jsonb(v)::text',
          nested: `to_jsonb(ARRAY[items::scalar_history_${family.index}])::text`,
        }).map(([name, output]) => ({
          ...family,
          name,
          output,
          table: `scalar_ranges_${family.index}_${name}`,
          sql: `CASE WHEN bypass THEN true ELSE (${output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END`,
        }))
      })
      for (const form of forms)
        await pg.exec(
          `CREATE TABLE ${form.table}(v ${form.type},w ${form.type},items ${form.type}[],expected text,bypass bool,CONSTRAINT matches CHECK(${form.sql}))`,
        )
      const catalog = await snapshotCatalog(pg)
      const plans = forms.flatMap((form) => {
        const table = catalog.tables.find((t) => t.name === form.table)!
        return (['source', 'stored'] as const).map((origin) => ({
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: form.table,
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
        nativeByteOrder: 'little',
      })
      for (const [index, check] of group.checks.entries())
        expect(
          check.kind,
          plans[index]!.identity.owner + JSON.stringify(check).slice(0, 1400),
        ).toBe('supported')
      const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
        references: unknown[] = []
      let inserts = 0
      for (const family of families) {
        const [a, b, c] = family.backend.values,
          first = scalarRangeText(a, b),
          last = scalarRangeText(b, c)
        for (const sample of [
          [null, null],
          ['empty', first],
          ['(,)', first],
          [first, last],
          [scalarRangeText(a, a), scalarRangeText(c, c)],
        ] as const) {
          const value =
              family.multi && sample[0] !== null
                ? sample[0] === 'empty'
                  ? '{}'
                  : `{${sample[0]}}`
                : sample[0],
            other =
              family.multi && sample[1] !== null
                ? sample[1] === 'empty'
                  ? '{}'
                  : `{${sample[1]}}`
                : sample[1],
            array = value === null ? null : rangeArrayText([value, null, other], -2)
          const read = async (text: string | null) =>
            family.multi
              ? readMultirangeFixture(pg, family.profile.multirangeType, text)
              : readRangeFixture(
                  pg,
                  `SELECT $1::${family.type} span`,
                  'span',
                  family.profile.rangeType,
                  [text],
                )
          const v = await read(value),
            w = await read(other),
            items = family.multi
              ? await readMultirangeArrayFixture(pg, family.profile.multirangeType, array)
              : await readRangeArrayFixture(pg, family.profile.rangeType, array)
          for (const form of forms.filter((f) => f.index === family.index)) {
            let output: string | null = null,
              failure: string | undefined
            try {
              output = (
                await pg.query<{ value: string | null }>(
                  `SELECT (${form.output}) value FROM(SELECT $1::${family.type} v,$2::${family.type} w,$3::${family.type}[] items)q`,
                  [value, other, array],
                )
              ).rows[0]!.value
            } catch (error) {
              failure = (error as { code: string }).code
            }
            for (const bypass of [false, true])
              for (const wrong of [false, true]) {
                const expected = wrong ? '!different!' : output
                let native: Outcome
                try {
                  const result = (
                    await pg.query<{ value: boolean | null }>(
                      `INSERT INTO ${form.table} VALUES($1,$2,$3,$4,$5) RETURNING (${form.sql}) value`,
                      [value, other, array, expected, bypass],
                    )
                  ).rows[0]!.value
                  native = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
                } catch (error) {
                  const e = error as { code: string; constraint?: string }
                  native =
                    e.code === '23514' && e.constraint === 'matches'
                      ? { kind: 'False' }
                      : { kind: 'Error', value: { state: parseInt(e.code, 36) } }
                }
                inserts++
                const reached =
                  value !== null &&
                  [15, 23, 31].includes(family.backend.kind) &&
                  (form.name === 'json'
                    ? sample[0] !== 'empty' && sample[0] !== '(,)'
                    : form.name === 'nested' &&
                      sample.some(
                        (value) => value !== null && value !== 'empty' && value !== '(,)',
                      ))
                const row: Row = {
                  v: v === null ? { kind: 'Null' } : { kind: 'Value', value: v },
                  w: w === null ? { kind: 'Null' } : { kind: 'Value', value: w },
                  items: items === null ? { kind: 'Null' } : { kind: 'Value', value: items },
                  expected: cell(expected),
                  bypass: cell(bypass),
                }
                const result: Outcome =
                  !bypass && !failure && reached ? { kind: 'Unknown' } : native
                references.push({
                  type: family.type,
                  form: form.name,
                  value,
                  other,
                  expected,
                  bypass,
                  native,
                  result,
                })
                for (const origin of ['source', 'stored'])
                  fixtures.push({ name: form.table + '_' + origin, row, expected: result })
              }
          }
          if (sample[0] === first && v) {
            const span = 'ranges' in v ? v.ranges[0] : undefined
            const bound =
              'bounds' in v
                ? v.bounds[0]
                : span?.kind === 'Value'
                  ? span.value.bounds[0]
                  : undefined
            if (!bound) throw new Error('Expected a finite scalar range bound')
            const empty = forms.find(
              (form) => form.index === family.index && form.name === 'empty',
            )!
            for (const bad of invalidScalarRangeBounds(bound))
              for (const bypass of [false, true])
                for (const origin of ['source', 'stored']) {
                  const modified = structuredClone(v)
                  if ('bounds' in modified) modified.bounds[0] = bad
                  else {
                    const member = modified.ranges[0]!
                    if (member.kind !== 'Value')
                      throw new Error('Expected a finite multirange member')
                    member.value.bounds[0] = bad
                  }
                  fixtures.push({
                    name: empty.table + '_' + origin,
                    row: {
                      v: { kind: 'Value', value: modified },
                      expected: cell('false'),
                      bypass: cell(bypass),
                    },
                    expected: { kind: bypass ? 'True' : 'Unknown' },
                  })
                }
          }
        }
      }
      await mkdir('artifacts/scalar-range-binding', { recursive: true })
      await writeFile(
        `artifacts/scalar-range-binding/batch-${start}.json`,
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
        'scalarranges' + start,
        group,
        plans.map((p) => p.identity.owner + '_' + p.identity.constraint),
        fixtures,
      )
    } finally {
      await pg.close()
      await rm(directory, { recursive: true, force: true })
    }
  },
  600_000,
)
