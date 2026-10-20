import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { PG18_RANGE_TYPES } from '../../src/postgres/builtins/type-ranges.generated.js'
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
import { rangeCoreSamples, readRangeFixture } from './check-range-fixtures.js'

const value = (input: boolean | number | null): Input =>
  input === null ? { kind: 'Null' } : { kind: 'Value', value: input }

it('composes multiranges through nominal domains, NULLIF, extrema, rows, lists and quantified range arrays', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-multirange-composition-'))
  try {
    await pg.exec("SET DateStyle='ISO,YMD';SET TimeZone='UTC'")
    const forms = Object.values(PG18_RANGE_TYPES).flatMap((m, family) => {
      const predicates = [
        `(payload,other)<=(other,fallback)`,
        `payload BETWEEN other AND fallback`,
        `payload IN(other,fallback,NULL::${m.multirange})`,
        `payload NOT IN(other,fallback,NULL::${m.multirange})`,
        `payload @> ANY(ARRAY[span,second_span])`,
        `payload && ALL(ARRAY[span,second_span])`,
        `payload!=other`,
      ]
      const mask = predicates
        .map(
          (p, i) => `(CASE WHEN ${p} THEN ${3 ** i} WHEN NOT(${p}) THEN 0 ELSE ${2 * 3 ** i} END)`,
        )
        .join('+')
      return [
        { name: 'nullif', expr: 'NULLIF(payload,other)', scalar: false },
        { name: 'coalesce', expr: 'COALESCE(NULLIF(payload,other),fallback)', scalar: false },
        { name: 'greatest', expr: 'greatest(payload,other,NULL,fallback)', scalar: false },
        { name: 'least', expr: 'least(payload,other,NULL,fallback)', scalar: false },
        {
          name: 'simple',
          expr: 'CASE payload WHEN other THEN fallback ELSE payload END',
          scalar: false,
        },
        {
          name: 'distinct',
          expr: 'CASE WHEN payload IS NOT DISTINCT FROM other THEN fallback ELSE payload END',
          scalar: false,
        },
        { name: 'domain', expr: `payload::multi_plain_nested_${family}`, scalar: false },
        { name: 'predicates', expr: mask, scalar: true },
        { name: 'range_cast', expr: `span::${m.multirange}`, scalar: false },
      ].map((f, i) => ({
        ...f,
        m,
        table: `multi_composed_${family}_${i}`,
        sql: `CASE WHEN bypass THEN true ELSE (${f.expr}) IS NOT DISTINCT FROM expected${!f.scalar && m.subtype === 'pg_catalog."numeric"' ? ` AND scale(lower(${f.expr})) IS NOT DISTINCT FROM scale(lower(expected)) AND scale(upper(${f.expr})) IS NOT DISTINCT FROM scale(upper(expected))` : ''} END`,
      }))
    })
    for (const [i, m] of Object.values(PG18_RANGE_TYPES).entries())
      await pg.exec(
        `CREATE DOMAIN multi_plain_${i} AS ${m.multirange} CHECK(isempty(VALUE) OR lower(VALUE) IS NOT NULL);CREATE DOMAIN multi_plain_nested_${i} AS multi_plain_${i}`,
      )
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE ${f.table}(payload ${f.m.multirange},other ${f.m.multirange},fallback ${f.m.multirange},span ${f.m.identity},second_span ${f.m.identity},expected ${f.scalar ? 'integer' : f.m.multirange},bypass boolean,CHECK(${f.sql}))`,
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
      domainErrors = 0
    for (const f of forms) {
      const ranges = rangeCoreSamples(f.m.identity).ranges,
        one = `{${ranges[5]}}`,
        two = `{${ranges[10]}}`,
        fallback = `{${ranges[9]}}`,
        parts = `{${ranges[5]},${ranges[10]}}`
      const pairs: (readonly [string | null, string | null])[] = [
        [null, null],
        [null, one],
        [one, null],
        ['{}', one],
        [one, one],
        [one, two],
        [parts, one],
        ['{(,)}', parts],
        [`{${ranges.at(-1)}}`, `{${ranges.at(-2)}}`],
      ]
      if (f.m.subtype === 'pg_catalog."numeric"')
        pairs.push([one, '{[1.0000,3.0000)}'], ['{[1.0000,3.0000)}', one])
      for (const [i, [payload, other]] of pairs.entries()) {
        const span = ranges[(i + 5) % ranges.length]!,
          secondSpan = ranges[(i + 8) % ranges.length]!
        const candidate = `SELECT $1::${f.m.multirange} payload,$2::${f.m.multirange} other,$3::${f.m.multirange} fallback,$4::${f.m.identity} span,$5::${f.m.identity} second_span`
        let rendered: string | null = null,
          errorCode: string | null = null
        try {
          rendered = (
            await pg.query<{ rendered: string | null }>(
              `SELECT (${f.expr})::text rendered FROM (${candidate}) q`,
              [payload, other, fallback, span, secondSpan],
            )
          ).rows[0]!.rendered
        } catch (e) {
          errorCode = (e as { code: string }).code
          expect(errorCode).toBe('23514')
        }
        const a = await load(f.m.multirange, payload),
          b = await load(f.m.multirange, other),
          c = await load(f.m.multirange, fallback),
          x = await readRangeFixture(pg, `SELECT $1::${f.m.identity} span`, 'span', f.m.identity, [
            span,
          ]),
          y = await readRangeFixture(pg, `SELECT $1::${f.m.identity} span`, 'span', f.m.identity, [
            secondSpan,
          ])
        for (const mismatch of [false, true])
          for (const bypass of [false, true]) {
            const wanted = f.scalar
              ? String(Number(rendered) + (mismatch ? 1 : 0))
              : mismatch
                ? rendered === null
                  ? fallback
                  : null
                : rendered
            let expected: Outcome
            try {
              const result = (
                await pg.query<{ result: boolean | null }>(
                  `INSERT INTO ${f.table} VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING (${f.sql}) result`,
                  [payload, other, fallback, span, secondSpan, wanted, bypass],
                )
              ).rows[0]!.result
              expected = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
            } catch (e) {
              const code = (e as { code: string }).code
              expected =
                errorCode !== null && !bypass
                  ? { kind: 'Error', value: { state: parseInt(code, 36) } }
                  : { kind: 'False' }
              if (expected.kind === 'Error') domainErrors++
            }
            const target = f.scalar
              ? value(Number(wanted))
              : await load(f.m.multirange, wanted).then((p) =>
                  p ? { kind: 'Value' as const, value: p } : value(null),
                )
            const row: Row = {
              payload: a ? { kind: 'Value', value: a } : value(null),
              other: b ? { kind: 'Value', value: b } : value(null),
              fallback: c ? { kind: 'Value', value: c } : value(null),
              span: x ? { kind: 'Value', value: x } : value(null),
              second_span: y ? { kind: 'Value', value: y } : value(null),
              expected: target,
              bypass: value(bypass),
            }
            for (const mode of ['source', 'stored'])
              fixtures.push({ name: f.table + '_' + mode, row, expected })
            inserts++
          }
      }
    }
    const group = prepareCheckRustGroup(plans)
    expect(group.checks.filter((c) => c.kind !== 'supported')).toEqual([])
    await runCheckParity(
      directory,
      'multirangecomposition',
      group,
      forms.flatMap((f) => ['source', 'stored'].map((mode) => f.table + '_' + mode)),
      fixtures,
    )
    expect(domainErrors).toBeGreaterThan(0)
    await mkdir('artifacts/check-multirange-comparisons', { recursive: true })
    await writeFile(
      'artifacts/check-multirange-comparisons/composition-report.json',
      JSON.stringify(
        {
          inserts,
          fixtures: fixtures.length,
          plans: plans.length,
          domainErrors,
          selectedNumericScales: true,
          quantifiedRangeArrays: true,
          rawStored: true,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240000)

it('rejects inconsistent multirange, range and polymorphic element identities', async () => {
  const pg = await PGlite.create()
  try {
    const columns = 'payload int4multirange,other int8multirange,span int8range,small smallint'
    await pg.exec(`CREATE TABLE multirange_nominal(${columns})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'multirange_nominal')!
    const bad = [
      'payload=other',
      'payload IS NOT DISTINCT FROM other',
      'NULLIF(payload,other) IS NULL',
      'greatest(payload,other) IS NULL',
      'multirange_cmp(payload,other)=0',
      'payload @> span',
      'range_before_multirange(span,payload)',
      'payload @> small',
      'multirange_contains_elem(payload,small)',
      'small <@ payload',
    ]
    for (const [i, sql] of bad.entries()) {
      await expect(
        pg.exec(`CREATE TABLE invalid_multi_${i}(${columns},CHECK(${sql}))`),
      ).rejects.toMatchObject({ code: sql.startsWith('greatest(') ? '42846' : '42883' })
      const plan = lowerTableCheck(
        table,
        { name: 'check', type: 'check', definition: `CHECK(${sql})` },
        catalog.enums,
        catalog.domains,
        'source',
      )!
      expect(hasUncertain(plan.expression), sql).toBe(true)
    }
  } finally {
    await pg.close()
  }
})
