import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { PG18_RANGE_TYPES } from '../../src/postgres/builtins/type-ranges.generated.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import {
  rangeCoreSamples,
  readRangeFixture,
  rangeBoundProjection,
  rangeBoundCell,
} from './check-range-fixtures.js'

const value = (input: number | boolean | string | bigint | null): Input =>
  input === null ? { kind: 'Null' } : { kind: 'Value', value: input }
const calls = [
  ['range_eq', '='],
  ['range_ne', '<>'],
  ['range_lt', '<'],
  ['range_le', '<='],
  ['range_gt', '>'],
  ['range_ge', '>='],
  ['range_before', '<<'],
  ['range_after', '>>'],
  ['range_overleft', '&<'],
  ['range_overright', '&>'],
  ['range_adjacent', '-|-'],
  ['range_overlaps', '&&'],
  ['range_contains', '@>'],
  ['range_contained_by', '<@'],
] as const

it('matches range ordering, endpoint relations and subtype containment across complete sample pairs in all targets', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-range-comparisons-'))
  try {
    await pg.exec("SET DateStyle='ISO,YMD';SET TimeZone='UTC'")
    const forms = Object.values(PG18_RANGE_TYPES).flatMap((metadata, family) =>
      ['function', 'operator'].map((style) => {
        const predicates = calls.map(([fn, op]) =>
          style === 'function' ? `pg_catalog.${fn}(payload,other)` : `(payload ${op} other)`,
        )
        predicates.push(
          style === 'function' ? 'range_contains_elem(payload,needle)' : '(payload @> needle)',
          style === 'function' ? 'elem_contained_by_range(needle,payload)' : '(needle <@ payload)',
        )
        const mask = predicates
          .map(
            (p, i) =>
              `(CASE WHEN ${p} THEN ${3 ** i} WHEN NOT (${p}) THEN 0 ELSE ${2 * 3 ** i} END)`,
          )
          .join('+')
        return {
          metadata,
          style,
          mask,
          table: `range_comparison_${family}_${style}`,
          sql: `CASE WHEN bypass THEN true ELSE (${mask})=expected AND range_cmp(payload,other) IS NOT DISTINCT FROM ordering END`,
        }
      }),
    )
    for (const form of forms)
      await pg.exec(
        `CREATE TABLE ${form.table}(payload ${form.metadata.identity},other ${form.metadata.identity},needle ${form.metadata.subtype},expected integer,ordering integer,bypass boolean,CHECK(${form.sql}))`,
      )
    const catalog = await snapshotCatalog(pg)
    const plans = forms.flatMap((form) => {
      const table = catalog.tables.find((t) => t.name === form.table)!
      return ['source', 'stored'].map((origin) => {
        const plan = lowerTableCheck(
          table,
          origin === 'source'
            ? { name: 'check', type: 'check', definition: `CHECK(${form.sql})` }
            : table.constraints[0]!,
          catalog.enums,
          catalog.domains,
          origin as 'source' | 'stored',
        )!
        expect(hasUncertain(plan.expression), form.table + '/' + origin).toBe(false)
        return {
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: form.table,
            constraint: origin,
          },
          expression: portableCheckAtoms(plan.expression),
        }
      })
    })
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    let inserts = 0,
      pairs = 0
    for (const form of forms) {
      const { ranges, elements } = rangeCoreSamples(form.metadata.identity)
      const payloads = await Promise.all(
        ranges.map((p) =>
          readRangeFixture(
            pg,
            `SELECT $1::${form.metadata.identity} span`,
            'span',
            form.metadata.identity,
            [p],
          ),
        ),
      )
      const needles = await Promise.all(
        elements.map(async (p) => {
          const text = (
            await pg.query<{ value: string | null }>(
              `SELECT ${rangeBoundProjection(`$1::${form.metadata.subtype}`, form.metadata.subtype)} value`,
              [p],
            )
          ).rows[0]!.value
          const cell = rangeBoundCell(form.metadata.subtype, text)
          return 'value' in cell ? value(cell.value as string | number | bigint) : value(null)
        }),
      )
      for (const [i, payload] of ranges.entries())
        for (const [j, other] of ranges.entries()) {
          const needleIndex = (i + j) % elements.length
          const needle = elements[needleIndex]!
          const oracle = (
            await pg.query<{ expected: number; ordering: number | null }>(
              `SELECT (${form.mask}) expected,range_cmp(payload,other) ordering FROM (SELECT $1::${form.metadata.identity} payload,$2::${form.metadata.identity} other,$3::${form.metadata.subtype} needle) q`,
              [payload, other, needle],
            )
          ).rows[0]!
          pairs++
          for (const mismatch of j === 0 ? [false, true] : [false]) {
            const expectedMask = oracle.expected + (mismatch ? 1 : 0)
            if (mismatch)
              await expect(
                pg.query(
                  `INSERT INTO ${form.table} VALUES($1::${form.metadata.identity},$2::${form.metadata.identity},$3::${form.metadata.subtype},$4,$5,false)`,
                  [payload, other, needle, expectedMask, oracle.ordering],
                ),
              ).rejects.toMatchObject({ code: '23514' })
            else
              await pg.query(
                `INSERT INTO ${form.table} VALUES($1::${form.metadata.identity},$2::${form.metadata.identity},$3::${form.metadata.subtype},$4,$5,false)`,
                [payload, other, needle, expectedMask, oracle.ordering],
              )
            inserts++
            const row: Row = {
              payload: payloads[i] ? { kind: 'Value', value: payloads[i]! } : value(null),
              other: payloads[j] ? { kind: 'Value', value: payloads[j]! } : value(null),
              needle: needles[needleIndex]!,
              expected: value(expectedMask),
              ordering: value(oracle.ordering),
              bypass: value(false),
            }
            for (const mode of ['source', 'stored'])
              fixtures.push({
                name: form.table + '_' + mode,
                row,
                expected: { kind: mismatch ? 'False' : 'True' },
              })
          }
        }
      const firstError: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } },
        secondError: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
      for (const [payload, other, expected] of [
        [{ kind: 'Unknown' }, { kind: 'Unknown' }, { kind: 'Unknown' }],
        [firstError, secondError, firstError],
        [value(null), secondError, secondError],
        [{ kind: 'Unknown' }, value(null), { kind: 'True' }],
      ] as [Input, Input, Outcome][])
        for (const bypass of [false, true])
          for (const mode of ['source', 'stored'])
            fixtures.push({
              name: form.table + '_' + mode,
              row: {
                payload,
                other,
                needle: value(null),
                expected: value(3 ** 16 - 1),
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
      'rangecomparisons',
      group,
      forms.flatMap((f) => ['source', 'stored'].map((m) => f.table + '_' + m)),
      fixtures,
    )
    expect(pairs).toBeGreaterThan(3000)
    await mkdir('artifacts/check-range-core', { recursive: true })
    await writeFile(
      'artifacts/check-range-core/comparison-report.json',
      JSON.stringify(
        {
          inserts,
          pairs,
          fixtures: fixtures.length,
          plans: plans.length,
          predicates: 16,
          comparator: true,
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
