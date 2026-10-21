import { multirangeComparisonCallables } from './check-multirange-comparison-fixtures.js'
import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { callableIdentity } from '../../src/postgres/builtins/catalog.js'
import { PG18_RANGE_TYPES } from '../../src/postgres/builtins/type-ranges.generated.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Row,
  type Input,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'
import {
  rangeCoreSamples,
  readRangeFixture,
  rangeBoundProjection,
  rangeBoundCell,
} from './check-range-fixtures.js'

const poly = ['pg_catalog.anymultirange', 'pg_catalog.anyrange', 'pg_catalog.anyelement']
const callables = builtinCallables()
const multirangePredicates = multirangeComparisonCallables.filter(
  (c) => c.result === 'pg_catalog.bool',
)
const value = (input: string | number | boolean | bigint | null): Input =>
  input === null ? { kind: 'Null' } : { kind: 'Value', value: input }

it('matches multirange ordering, mixed range predicates and element containment over canonical sample pairs in Rust, Go and TypeScript', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-multirange-comparisons-'))
  try {
    await pg.exec("SET DateStyle='ISO,YMD';SET TimeZone='UTC'")
    expect(multirangePredicates).toHaveLength(32)
    const forms = Object.values(PG18_RANGE_TYPES).flatMap((m, family) =>
      ['function', 'operator'].map((style) => {
        const predicates = multirangePredicates.map((c) => {
          const args = c.args.map((t, i) =>
            t === poly[0]
              ? i === 0
                ? 'payload'
                : c.args[0] === poly[0]
                  ? 'other'
                  : 'payload'
              : t === poly[1]
                ? 'span'
                : 'needle',
          )
          if (style === 'function') return `pg_catalog.${c.name}(${args.join(',')})`
          const op = callables.find(
            (op) =>
              op.kind === 'operator' &&
              op.implementation === callableIdentity(c) &&
              op.name !== '!=',
          )
          if (!op) throw new Error('Missing captured predicate operator: ' + c.name)
          return `(${args[0]} ${op.name} ${args[1]})`
        })
        const mask = predicates
          .map(
            (p, i) =>
              `(CASE WHEN ${p} THEN ${3n ** BigInt(i)}::bigint WHEN NOT (${p}) THEN 0::bigint ELSE ${2n * 3n ** BigInt(i)}::bigint END)`,
          )
          .join('+')
        return {
          m,
          style,
          mask,
          table: `multi_comparison_${family}_${style}`,
          domain: `comp_multi_${family}`,
          rangeDomain: `comp_range_${family}`,
          sql: `CASE WHEN bypass THEN true ELSE (${mask})=expected AND multirange_cmp(payload,other) IS NOT DISTINCT FROM ordering END`,
        }
      }),
    )
    for (const [i, m] of Object.values(PG18_RANGE_TYPES).entries())
      await pg.exec(
        `CREATE DOMAIN comp_multi_base_${i} AS ${m.multirange};CREATE DOMAIN comp_multi_${i} AS comp_multi_base_${i};CREATE DOMAIN comp_range_${i} AS ${m.identity}`,
      )
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE ${f.table}(payload ${f.domain},other ${f.domain},span ${f.rangeDomain},needle ${f.m.subtype},expected bigint,ordering integer,bypass boolean,CHECK(${f.sql}))`,
      )
    const catalog = await snapshotCatalog(pg),
      plans = forms.flatMap((f) => {
        const table = catalog.tables.find((t) => t.name === f.table)!
        return ['source', 'stored'].map((mode) => {
          const plan = lowerTableCheck(
            table,
            mode === 'source'
              ? { name: 'check', type: 'check', definition: `CHECK(${f.sql})` }
              : table.constraints[0]!,
            catalog.enums,
            catalog.domains,
            mode as 'source' | 'stored',
          )!
          expect(hasUncertain(plan.expression), f.table + '/' + mode).toBe(false)
          return {
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: f.table,
              constraint: mode,
            },
            expression: portableCheckAtoms(plan.expression),
          }
        })
      }),
      fixtures: { name: string; row: Row; expected: Outcome }[] = []
    let inserts = 0,
      pairs = 0
    for (const f of forms) {
      const { ranges, elements } = rangeCoreSamples(f.m.identity)
      const one = ranges[5]!,
        two = ranges[10]!
      const values = [
        null,
        '{}',
        '{(,)}',
        `{${one}}`,
        `{${two}}`,
        `{${one},${two}}`,
        `{${ranges[6]}}`,
        `{${ranges[7]}}`,
        `{${ranges[11]}}`,
        `{${ranges[3]}}`,
        `{${ranges[4]}}`,
        `{${one},${ranges[9]}}`,
        ...ranges.slice(13).map((s) => `{${s}}`),
      ]
      const payloads = await Promise.all(
        values.map((v) => readMultirangeFixture(pg, f.m.multirange, v)),
      )
      const spans = await Promise.all(
        ranges.map((v) =>
          readRangeFixture(pg, `SELECT $1::${f.m.identity} span`, 'span', f.m.identity, [v]),
        ),
      )
      const needles = await Promise.all(
        elements.map(async (e) => {
          const text = (
            await pg.query<{ value: string | null }>(
              `SELECT ${rangeBoundProjection(`$1::${f.m.subtype}`, f.m.subtype)} value`,
              [e],
            )
          ).rows[0]!.value
          const cell = rangeBoundCell(f.m.subtype, text)
          if ('value' in cell && typeof cell.value === 'object' && cell.kind !== 'Error')
            throw new Error('Expected a primitive multirange fixture element')
          return 'value' in cell && cell.kind !== 'Error' ? value(cell.value) : value(null)
        }),
      )
      for (const [i, payload] of values.entries())
        for (const [j, other] of values.entries()) {
          const si = (i * 7 + j * 3) % ranges.length,
            ni = (i + j) % elements.length
          const oracle = (
            await pg.query<{ expected: string; ordering: number | null }>(
              `SELECT (${f.mask})::text expected,multirange_cmp(payload,other) ordering FROM (SELECT $1::${f.m.multirange} payload,$2::${f.m.multirange} other,$3::${f.m.identity} span,$4::${f.m.subtype} needle) q`,
              [payload, other, ranges[si], elements[ni]],
            )
          ).rows[0]!
          pairs++
          for (const mismatch of j === 0 ? [false, true] : [false]) {
            const mask = BigInt(oracle.expected) + (mismatch ? 1n : 0n)
            if (mismatch)
              await expect(
                pg.query(`INSERT INTO ${f.table} VALUES($1,$2,$3,$4,$5,$6,false)`, [
                  payload,
                  other,
                  ranges[si],
                  elements[ni],
                  mask,
                  oracle.ordering,
                ]),
              ).rejects.toMatchObject({ code: '23514' })
            else
              await pg.query(`INSERT INTO ${f.table} VALUES($1,$2,$3,$4,$5,$6,false)`, [
                payload,
                other,
                ranges[si],
                elements[ni],
                mask,
                oracle.ordering,
              ])
            inserts++
            const row: Row = {
              payload: payloads[i] ? { kind: 'Value', value: payloads[i]! } : value(null),
              other: payloads[j] ? { kind: 'Value', value: payloads[j]! } : value(null),
              span: spans[si] ? { kind: 'Value', value: spans[si]! } : value(null),
              needle: needles[ni]!,
              expected: value(mask),
              ordering: value(oracle.ordering),
              bypass: value(false),
            }
            for (const mode of ['source', 'stored'])
              fixtures.push({
                name: f.table + '_' + mode,
                row,
                expected: { kind: mismatch ? 'False' : 'True' },
              })
          }
        }
      const first: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } },
        second: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
      for (const [payload, other, expected] of [
        [{ kind: 'Unknown' }, { kind: 'Unknown' }, { kind: 'Unknown' }],
        [first, second, first],
        [value(null), second, second],
        [{ kind: 'Unknown' }, value(null), { kind: 'True' }],
      ] as [Input, Input, Outcome][])
        for (const bypass of [false, true])
          for (const mode of ['source', 'stored'])
            fixtures.push({
              name: f.table + '_' + mode,
              row: {
                payload,
                other,
                span: value(null),
                needle: value(null),
                expected: value(3n ** 32n - 1n),
                ordering: value(null),
                bypass: value(bypass),
              },
              expected: bypass ? { kind: 'True' } : expected,
            })
    }
    const group = prepareCheckRustGroup(plans)
    expect(group.checks.filter((c) => c.kind !== 'supported')).toEqual([])
    await runCheckParity(
      directory,
      'multirangecomparisons',
      group,
      forms.flatMap((f) => ['source', 'stored'].map((mode) => f.table + '_' + mode)),
      fixtures,
    )
    expect(pairs).toBeGreaterThan(2500)
    await mkdir('artifacts/check-multirange-comparisons', { recursive: true })
    await writeFile(
      'artifacts/check-multirange-comparisons/core-report.json',
      JSON.stringify(
        {
          inserts,
          pairs,
          fixtures: fixtures.length,
          plans: plans.length,
          predicates: multirangePredicates.map((c) => callableIdentity(c)),
          comparator: true,
          rawStored: true,
          nestedDomains: true,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300000)
