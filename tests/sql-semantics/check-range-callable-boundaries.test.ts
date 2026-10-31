import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { PG18_RANGE_TYPES } from '../../src/postgres/builtins/type-ranges.generated.js'
import {
  builtinCallables,
  builtinTypeIO,
  builtinMetadata,
} from '../../src/postgres/builtins/inventory.js'
import {
  callableBoundary,
  rangeValueRequirements,
} from '../../scripts/check-measurements/catalog.js'
import { readRangeTypes } from '../../src/postgres/range-types.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { prepareCheckRust } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'

it('classifies range aggregate context, forbidden CHECK expansion and internal I/O separately from value operations', async () => {
  const pg = await PGlite.create()
  try {
    const functions = builtinCallables().filter(
      (f) =>
        f.kind === 'function' &&
        ['range_intersect_agg_transfn', 'multirange_intersect_agg_transfn'].includes(f.name),
    )
    expect(functions).toHaveLength(2)
    for (const fn of functions) {
      expect(callableBoundary(fn, new Set(fn.args)).categories).toContain(
        'aggregate-execution-context',
      )
      expect(rangeValueRequirements(fn)).toMatchObject([
        { kind: 'execution', owner: 'tests/sql-semantics/check-range-callable-boundaries.test.ts' },
      ])
      expect(rangeValueRequirements({ ...fn, schema: 'other' })).toBeNull()
    }
    for (const [index, range] of Object.values(PG18_RANGE_TYPES).entries())
      for (const multi of [false, true]) {
        const type = multi ? range.multirange : range.identity,
          empty = multi ? '{}' : 'empty',
          fn = multi ? 'multirange_intersect_agg_transfn' : 'range_intersect_agg_transfn',
          table = `range_context_${index}_${Number(multi)}`
        await pg.exec(
          `CREATE TABLE ${table}(first_value ${type},second_value ${type},bypass boolean,CHECK(CASE WHEN bypass THEN true ELSE ${fn}(first_value,second_value) IS NULL END))`,
        )
        for (const first of [null, empty])
          for (const second of [null, empty])
            for (const bypass of [false, true]) {
              const insert = pg.query(`INSERT INTO ${table} VALUES($1::${type},$2::${type},$3)`, [
                first,
                second,
                bypass,
              ])
              if (!bypass && first !== null && second !== null)
                await expect(insert).rejects.toMatchObject({ code: 'XX000' })
              else await insert
            }
        await expect(
          pg.exec(
            `CREATE TABLE invalid_aggregate_${index}_${Number(multi)}(payload ${type},CHECK(range_intersect_agg(payload) IS NULL))`,
          ),
        ).rejects.toMatchObject({ code: '42803' })
        if (multi)
          await expect(
            pg.exec(
              `CREATE TABLE invalid_expansion_${index}(payload ${type},CHECK(isempty(unnest(payload))))`,
            ),
          ).rejects.toMatchObject({ code: '0A000' })
        for (const identity of [range.identity, range.multirange]) {
          const io = builtinTypeIO(identity)!
          expect(callableBoundary(builtinMetadata(io.receive!), new Set()).categories).toContain(
            'internal-interface',
          )
          expect(callableBoundary(builtinMetadata(io.output!), new Set()).categories).toContain(
            'internal-interface',
          )
        }
      }
  } finally {
    await pg.close()
  }
}, 30_000)

it('admits custom range core checks only with captured profiles and represented subtype backends', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(
      'CREATE TYPE public.pending_range AS RANGE(subtype=integer);CREATE TABLE public.pending_ranges(payload public.pending_range,CHECK(isempty(payload)))',
    )
    const profiles = await readRangeTypes(pg, 'public')
    expect(profiles).toMatchObject([
      {
        identity: 'public.pending_range',
        subtype: 'pg_catalog.int4',
        canonical: null,
        subtypeDiff: null,
      },
    ])
    expect(
      profiles.every((profile) =>
        Object.values(profile).every((v) => v === null || typeof v === 'string'),
      ),
    ).toBe(true)
    await pg.exec("INSERT INTO public.pending_ranges VALUES('empty')")
    await expect(
      pg.exec("INSERT INTO public.pending_ranges VALUES('[1,3)')"),
    ).rejects.toMatchObject({ code: '23514' })
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'pending_ranges')!
    expect(catalog.rangeTypes).toMatchObject(profiles)
    for (const origin of ['source', 'stored'] as const) {
      const expression = lowerTableCheck(
        table,
        table.constraints[0]!,
        catalog.enums,
        catalog.domains,
        origin,
      )!.expression
      expect(hasUncertain(expression)).toBe(true)
      const captured = lowerTableCheck(
        table,
        table.constraints[0]!,
        catalog.enums,
        catalog.domains,
        origin,
        catalog.rangeTypes,
      )!.expression
      expect(hasUncertain(captured)).toBe(false)
      expect(prepareCheckRust(portableCheckAtoms(captured)).kind).toBe('supported')
    }
    await pg.exec(
      'CREATE TYPE public.words_span AS RANGE(subtype=text,collation="C");CREATE TABLE public.word_spans(payload public.words_span,CHECK(isempty(payload)))',
    )
    const words = await snapshotCatalog(pg),
      wordTable = words.tables.find((table) => table.name === 'word_spans')!
    expect(words.rangeTypes.some((range) => range.name === 'words_span')).toBe(true)
    // Captured text ranges are a represented backend; collation callbacks they cannot run are
    // deferred where evaluation reaches them, not at binding.
    const wordCheck = lowerTableCheck(
      wordTable,
      wordTable.constraints[0]!,
      words.enums,
      words.domains,
      'stored',
      words.rangeTypes,
    )!.expression
    expect(hasUncertain(wordCheck)).toBe(false)
    expect(prepareCheckRust(portableCheckAtoms(wordCheck)).kind).toBe('supported')
  } finally {
    await pg.close()
  }
}, 30_000)
