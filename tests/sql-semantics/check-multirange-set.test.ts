import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { PG18_RANGE_TYPES } from '../../src/postgres/builtins/type-ranges.generated.js'
import { functionMetadata } from '../../src/postgres/builtins/inventory.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'
import { readRangeFixture, rangeCoreSamples } from './check-range-fixtures.js'
import { multirangeExactProbe } from './check-multirange-exact-probe.js'

const value = (input: boolean | null): Input =>
  input === null ? { kind: 'Null' } : { kind: 'Value', value: input }
const metadata = ['multirange_union', 'multirange_intersect', 'multirange_minus'].map((name) =>
  functionMetadata(
    `function:["pg_catalog","${name}"](pg_catalog.anymultirange,pg_catalog.anymultirange)`,
  ),
)
const merge = functionMetadata('function:["pg_catalog","range_merge"](pg_catalog.anymultirange)')
const exactProbe =
  multirangeExactProbe +
  String.raw`
fn multirange_set_fixture_range(actual:RangeValue,expected:RangeValue)->BoolValue {
 if let RangeValue::Error(error)=actual {return BoolValue::Error(error);};
 if let RangeValue::Error(error)=expected {return BoolValue::Error(error);};
 if let RangeValue::Null=actual {if let RangeValue::Null=expected {return BoolValue::Value(true);};return BoolValue::Value(false);};
 if let RangeValue::Null=expected {return BoolValue::Value(false);};
 if let RangeValue::Value(a)=actual {if let RangeValue::Value(b)=expected {return BoolValue::Value(multirange_fixture_span_exact(&a,&b));};};
 BoolValue::Unknown
}
pub fn multirange_set_fixture(left:MultirangeValue,right:MultirangeValue,combined:MultirangeValue,shared:MultirangeValue,remaining:MultirangeValue,hull:RangeValue)->BoolValue {
 let union=${metadata[0]!.rustName}(left.clone(),right.clone());
 let combined_result=multirange_fixture_exact(union,combined);if combined_result!=BoolValue::Value(true) {return combined_result;};
 let intersection=${metadata[1]!.rustName}(left.clone(),right.clone());
 let shared_result=multirange_fixture_exact(intersection,shared);if shared_result!=BoolValue::Value(true) {return shared_result;};
 let difference=${metadata[2]!.rustName}(left.clone(),right);
 let remaining_result=multirange_fixture_exact(difference,remaining);if remaining_result!=BoolValue::Value(true) {return remaining_result;};
 let merged=${merge.rustName}(left);multirange_set_fixture_range(merged,hull)
}
`

it('matches exact multirange algebra and hull payloads through function/operator binding in Rust, Go and TypeScript', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-multirange-set-'))
  try {
    await pg.exec("SET DateStyle='ISO,YMD';SET TimeZone='UTC'")
    const forms = Object.values(PG18_RANGE_TYPES).flatMap((m, family) =>
      ['function', 'operator'].map((style) => {
        const expressions = metadata.map((c, i) =>
          style === 'function'
            ? `${c.name}(payload,other)`
            : `(payload ${['+', '*', '-'][i]} other)`,
        )
        const columns = ['combined', 'shared', 'remaining', 'hull']
        expressions.push('range_merge(payload)')
        const conditions = expressions.map(
          (expr, i) => `(${expr}) IS NOT DISTINCT FROM ${columns[i]}`,
        )
        if (m.subtype === 'pg_catalog."numeric"')
          for (const [i, expr] of expressions.entries())
            for (const bound of ['lower', 'upper'])
              conditions.push(
                `scale(${bound}(${expr})) IS NOT DISTINCT FROM scale(${bound}(${columns[i]}))`,
              )
        return {
          m,
          family,
          style,
          expressions,
          table: `multirange_algebra_${family}_${style}`,
          sql: `CASE WHEN bypass THEN true ELSE ${conditions.join(' AND ')} END`,
        }
      }),
    )
    for (const [i, m] of Object.values(PG18_RANGE_TYPES).entries())
      await pg.exec(
        `CREATE DOMAIN set_multi_base_${i} AS ${m.multirange};CREATE DOMAIN set_multi_${i} AS set_multi_base_${i}`,
      )
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE ${f.table}(payload set_multi_${f.family},other set_multi_${f.family},combined ${f.m.multirange},shared ${f.m.multirange},remaining ${f.m.multirange},hull ${f.m.identity},bypass boolean,CHECK(${f.sql}))`,
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
      group = prepareCheckRustGroup(plans)
    expect(group.checks.filter((c) => c.kind !== 'supported')).toEqual([])
    const names = forms.flatMap((f) => ['source', 'stored'].map((mode) => f.table + '_' + mode)),
      entries: string[] = [],
      checks: (typeof group.checks)[number][] = [],
      fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const cache = new Map<string, ReturnType<typeof readMultirangeFixture>>()
    const load = (type: string, text: string | null) => {
      const key = JSON.stringify([type, text])
      let p = cache.get(key)
      if (!p) {
        p = readMultirangeFixture(pg, type, text)
        cache.set(key, p)
      }
      return p
    }
    let inserts = 0,
      pairs = 0,
      mismatches = 0
    for (const f of forms) {
      const name = f.table + '_exact',
        entryName = checkRustEntryName({
          schema: 'public',
          kind: 'table',
          owner: f.table,
          constraint: 'exact',
        })
      names.push(name)
      entries.push(`pub fn ${entryName}(payload:MultirangeValue,other:MultirangeValue,combined:MultirangeValue,shared:MultirangeValue,remaining:MultirangeValue,hull:RangeValue,bypass:BoolValue)->CheckOutcome {
 let guard=check_from_bool(bypass);let mut result:CheckOutcome=check_unknown();
 if case_guard_stops(guard) {result=guard;} else {if case_guard_takes(guard) {result=guard;} else {
 let same=multirange_set_fixture(payload,other,combined,shared,remaining,hull);result=check_from_bool(same);
 };};result
}`)
      checks.push({
        kind: 'supported',
        entryName,
        inputs: [
          ...['payload', 'other', 'combined', 'shared', 'remaining'].map((n) => ({
            name: n,
            rustName: n,
            type: f.m.multirange,
            rustType: 'MultirangeValue',
          })),
          { name: 'hull', rustName: 'hull', type: f.m.identity, rustType: 'RangeValue' },
          { name: 'bypass', rustName: 'bypass', type: 'pg_catalog.bool', rustType: 'BoolValue' },
        ],
      })
      const temporal = [
          'pg_catalog.date',
          'pg_catalog."timestamp"',
          'pg_catalog.timestamptz',
        ].includes(f.m.subtype),
        offset = f.m.subtype === 'pg_catalog.timestamptz' ? ' 00:00+00' : ''
      const [a, b, c, d] = temporal
        ? ['2000-01-01', '2000-01-03', '2000-01-05', '2000-01-07'].map((s) => s + offset)
        : ['1', '3', '5', '7']
      const samples = rangeCoreSamples(f.m.identity).ranges
      const values: (string | null)[] = [
        null,
        '{}',
        ...samples.filter((s): s is string => s !== null).map((s) => `{${s}}`),
        `{[${a},${b}),[${c},${d})}`,
        `{[${a},${a}],[${b},${c}]}`,
        `{(${a},${b}),(${c},${d})}`,
        `{[${a},${d})}`,
        `{[${b},${b}],[${c},${c}]}`,
      ]
      if (f.m.subtype === 'pg_catalog."numeric"')
        values.push(
          '{[1.0000,3.0000),[5.000000,7.000000]}',
          '{[1.0,3.0),[5.00,7.00]}',
          '{[2.00000000,2.5000],[6.000,6.50000000]}',
        )
      const indices: [number, number][] = []
      for (let i = 0; i < values.length; i++)
        indices.push([i, 7], [7, i], [i, values.length - 1], [values.length - 1, i])
      for (const i of [
        0,
        1,
        2,
        7,
        8,
        9,
        10,
        values.length - 3,
        values.length - 2,
        values.length - 1,
      ])
        for (const j of [
          0,
          1,
          2,
          7,
          8,
          9,
          10,
          values.length - 3,
          values.length - 2,
          values.length - 1,
        ])
          indices.push([i, j])
      const distinct = [
        ...new Map(indices.map(([i, j]) => [i + '/' + j, [i, j] as const])).values(),
      ]
      const payloads = await Promise.all(values.map((s) => load(f.m.multirange, s)))
      for (const [i, j] of distinct) {
        const payload = values[i]!,
          other = values[j]!
        const rendered = (
          await pg.query<Record<string, string | null>>(
            `SELECT ${f.expressions.map((e, i) => `(${e})::text AS ${['combined', 'shared', 'remaining', 'hull'][i]}`).join(',')} FROM (SELECT $1::${f.m.multirange} payload,$2::${f.m.multirange} other) q`,
            [payload, other],
          )
        ).rows[0]!
        pairs++
        for (const mismatch of i === j ? [false, true] : [false])
          for (const bypass of mismatch || i === 0 ? [false, true] : [false]) {
            const combined = mismatch
              ? rendered.combined === '{}'
                ? '{(,)}'
                : '{}'
              : rendered.combined!
            let expected: Outcome
            try {
              const result = (
                await pg.query<{ result: boolean | null }>(
                  `INSERT INTO ${f.table} VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING (${f.sql}) result`,
                  [
                    payload,
                    other,
                    combined,
                    rendered.shared,
                    rendered.remaining,
                    rendered.hull,
                    bypass,
                  ],
                )
              ).rows[0]!.result
              expected = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
            } catch (e) {
              expect(e).toMatchObject({ code: '23514' })
              expected = { kind: 'False' }
            }
            const x = await load(f.m.multirange, combined),
              y = await load(f.m.multirange, rendered.shared!),
              z = await load(f.m.multirange, rendered.remaining!),
              h = await readRangeFixture(
                pg,
                `SELECT $1::${f.m.identity} span`,
                'span',
                f.m.identity,
                [rendered.hull],
              )
            const row: Row = {
              payload: payloads[i] ? { kind: 'Value', value: payloads[i]! } : value(null),
              other: payloads[j] ? { kind: 'Value', value: payloads[j]! } : value(null),
              combined: x ? { kind: 'Value', value: x } : value(null),
              shared: y ? { kind: 'Value', value: y } : value(null),
              remaining: z ? { kind: 'Value', value: z } : value(null),
              hull: h ? { kind: 'Value', value: h } : value(null),
              bypass: value(bypass),
            }
            for (const mode of ['source', 'stored', 'exact'])
              fixtures.push({ name: f.table + '_' + mode, row, expected })
            inserts++
            if (mismatch && !bypass) mismatches++
          }
      }
    }
    group.checks = [...group.checks, ...checks]
    group.evaluatorSource += '\n' + entries.join('\n')
    group
      .source!.modules.find((m) => m.name === 'checks')!
      .files.push({ path: 'tests/multirange_set_exact_entries.rs', source: entries.join('\n') })
    group
      .source!.modules.find((m) => m.name === 'pg_catalog')!
      .files.push({ path: 'tests/multirange_set_exact_probe.rs', source: exactProbe })
    await runCheckParity(directory, 'multirangesets', group, names, fixtures)
    expect(pairs).toBeGreaterThan(1500)
    expect(mismatches).toBeGreaterThan(0)
    await mkdir('artifacts/check-multirange-set', { recursive: true })
    await writeFile(
      'artifacts/check-multirange-set/core-report.json',
      JSON.stringify(
        {
          inserts,
          pairs,
          fixtures: fixtures.length,
          plans: plans.length,
          exactEntries: entries.length,
          mismatches,
          rawStored: true,
          exactMemberScales: true,
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
}, 480000)
