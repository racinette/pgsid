import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PG18_RANGE_TYPES } from '../../src/postgres/builtins/type-ranges.generated.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'
import { rangeCoreSamples } from './check-range-fixtures.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'
import {
  multirangeArrayText,
  readMultirangeArrayFixture,
  multirangeArrayNeedsOutputContext,
} from './check-multirange-array-fixtures.js'

it('admits all builtin multirange arrays through concrete and polymorphic CHECKs with native INSERT and Rust/Go/TypeScript parity', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-multirange-arrays-'))
  try {
    await pg.exec("SET DateStyle='ISO,YMD';SET TimeZone='UTC'")
    const bodies = {
      cardinality: 'cardinality(a) IS NOT DISTINCT FROM expected',
      dimensions: 'array_ndims(a) IS NOT DISTINCT FROM expected',
      lower_bound: 'array_lower(a,1) IS NOT DISTINCT FROM expected',
      upper_bound: 'array_upper(a,1) IS NOT DISTINCT FROM expected',
      fetch: 'a[position] IS NOT DISTINCT FROM head',
      bound: 'lower(a[position]) IS NOT DISTINCT FROM lower(head)',
      slice: 'cardinality(a[position:stop]) IS NOT DISTINCT FROM expected',
      constructor: 'ARRAY[head,tail,NULL] = a',
      equality: 'a=b',
      order: 'a<b',
      contains: 'a @> b',
      overlap: 'a && b',
      any: 'head=ANY(a)',
      all: 'head<ALL(a)',
      position: 'array_position(a,head) IS NOT DISTINCT FROM expected',
      positions: 'cardinality(array_positions(a,head)) IS NOT DISTINCT FROM expected',
      remove: 'cardinality(array_remove(a,head)) IS NOT DISTINCT FROM expected',
      replace: 'cardinality(array_replace(a,head,tail)) IS NOT DISTINCT FROM expected',
      append: 'cardinality(array_append(a,head)) IS NOT DISTINCT FROM expected',
      concatenate: 'cardinality(a||b) IS NOT DISTINCT FROM expected',
      sort: 'cardinality(array_sort(a)) IS NOT DISTINCT FROM expected',
      reverse: 'cardinality(array_reverse(a)) IS NOT DISTINCT FROM expected',
      fill: 'cardinality(array_fill(head,ARRAY[expected])) IS NOT DISTINCT FROM expected',
      coalesce: 'cardinality(COALESCE(a,ARRAY[head])) IS NOT DISTINCT FROM expected',
      hash: 'hash_array(a) IS NOT DISTINCT FROM expected',
      hash_extended: 'hash_array_extended(a,seed) IS NOT DISTINCT FROM expected64',
      input: 'cardinality(source::TYPE[]) IS NOT DISTINCT FROM expected',
      output: 'a::text IS NOT DISTINCT FROM source',
    }
    const forms = Object.values(PG18_RANGE_TYPES).flatMap((metadata, family) =>
      Object.entries(bodies).map(([name, body]) => ({
        metadata,
        name,
        table: `multi_arrays_${family}_${name}`,
        sql: `CASE WHEN bypass THEN true ELSE ${body.replaceAll('TYPE', metadata.multirange)} END`,
      })),
    )
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE ${f.table}(a ${f.metadata.multirange}[],b ${f.metadata.multirange}[],head ${f.metadata.multirange},tail ${f.metadata.multirange},expected integer,expected64 bigint,position integer,stop integer,seed bigint,source text,bypass boolean,CONSTRAINT checked CHECK(${f.sql}))`,
      )
    const catalog = await snapshotCatalog(pg)
    const plans = forms.flatMap((f) => {
      const table = catalog.tables.find((t) => t.name === f.table)!,
        constraint = table.constraints[0]!
      return (['source', 'stored'] as const).map((origin) => ({
        identity: { schema: 'public', kind: 'table' as const, owner: f.table, constraint: origin },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'source' ? { ...constraint, definition: `CHECK(${f.sql})` } : constraint,
            catalog.enums,
            catalog.domains,
            origin,
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
    expect(group.checks.filter((c) => c.kind !== 'supported')).toEqual([])
    for (const plan of plans)
      expect(hasUncertain(plan.expression), JSON.stringify(plan.identity)).toBe(false)
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    let inserts = 0,
      contextDeferrals = 0
    for (const metadata of Object.values(PG18_RANGE_TYPES)) {
      const all = rangeCoreSamples(metadata.identity).ranges.map((r) =>
        r === null ? null : '{' + r + '}',
      )
      const selected = [
        ...new Set([null, '{}', '{(,)}', ...all.filter((_, i) => i % 3 === 0), all.at(-1)!]),
      ]
      const samples: {
        a: string | null
        b: string | null
        head: string | null
        tail: string | null
      }[] = selected.map((head, i) => ({
        a: multirangeArrayText([head, selected[(i + 1) % selected.length]!, null], i % 2 ? -2 : 1),
        b: multirangeArrayText(i % 3 ? [head] : [null]),
        head,
        tail: selected[(i + 1) % selected.length]!,
      }))
      samples.push(
        { a: null, b: null, head: null, tail: null },
        { a: '{}', b: '{}', head: '{}', tail: null },
        { a: '[0:1][3:4]={{"{}",NULL},{"{(,)}","{}"}}', b: '{"{}"}', head: '{}', tail: '{(,)}' },
      )
      for (const [i, sample] of samples.entries()) {
        const a = await readMultirangeArrayFixture(pg, metadata.multirange, sample.a),
          b = await readMultirangeArrayFixture(pg, metadata.multirange, sample.b)
        const head = await readMultirangeFixture(pg, metadata.multirange, sample.head),
          tail = await readMultirangeFixture(pg, metadata.multirange, sample.tail)
        const hash = (
          await pg.query<{ h: number | null; h64: string | null }>(
            `SELECT hash_array($1::${metadata.multirange}[]) h,hash_array_extended($1::${metadata.multirange}[],$2::bigint)::text h64`,
            [sample.a, '9007199254740993'],
          )
        ).rows[0]!
        for (const bypass of [false, true])
          for (const f of forms.filter((f) => f.metadata.multirange === metadata.multirange)) {
            const expectedCount =
              f.name === 'hash' ? hash.h : i % 3 === 0 ? 3 : i % 3 === 1 ? 0 : -1
            const expected64 = hash.h64 === null ? null : BigInt(hash.h64)
            const params = [
              sample.a,
              sample.b,
              sample.head,
              sample.tail,
              expectedCount,
              expected64?.toString() ?? null,
              i % 2 ? -2 : 1,
              1,
              '9007199254740993',
              sample.a,
              bypass,
            ]
            let expected: Outcome
            try {
              const result = (
                await pg.query<{ result: boolean | null }>(
                  `INSERT INTO ${f.table} VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING (${f.sql}) result`,
                  params,
                )
              ).rows[0]!.result
              expected = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
            } catch (error) {
              const state = (error as { code: string }).code
              expect(['23514', '22000', '2202E', '0A000', '54000'], f.table).toContain(state)
              expected =
                state === '23514'
                  ? { kind: 'False' }
                  : { kind: 'Error', value: { state: parseInt(state, 36) } }
            }
            inserts++
            if (f.name === 'output' && !bypass && multirangeArrayNeedsOutputContext(a)) {
              expected = { kind: 'Unknown' }
              contextDeferrals++
            }
            const row: Row = {
              a: a ? { kind: 'Value', value: a } : { kind: 'Null' },
              b: b ? { kind: 'Value', value: b } : { kind: 'Null' },
              head: head ? { kind: 'Value', value: head } : { kind: 'Null' },
              tail: tail ? { kind: 'Value', value: tail } : { kind: 'Null' },
              expected:
                expectedCount === null ? { kind: 'Null' } : { kind: 'Value', value: expectedCount },
              expected64:
                expected64 === null ? { kind: 'Null' } : { kind: 'Value', value: expected64 },
              position: { kind: 'Value', value: i % 2 ? -2 : 1 },
              stop: { kind: 'Value', value: 1 },
              seed: { kind: 'Value', value: 9007199254740993n },
              source: sample.a === null ? { kind: 'Null' } : { kind: 'Value', value: sample.a },
              bypass: { kind: 'Value', value: bypass },
            }
            for (const origin of ['source', 'stored'])
              fixtures.push({ name: f.table + '_' + origin, row, expected })
          }
      }
    }
    await runCheckParity(
      directory,
      'multiarrays',
      group,
      forms.flatMap((f) => ['source', 'stored'].map((o) => f.table + '_' + o)),
      fixtures,
    )
    await mkdir('artifacts/check-multirange-arrays', { recursive: true })
    await writeFile(
      'artifacts/check-multirange-arrays/report.json',
      JSON.stringify(
        {
          inserts,
          fixtures: fixtures.length,
          plans: plans.length,
          types: Object.keys(PG18_RANGE_TYPES),
          operations: Object.keys(bodies),
          contextDeferrals,
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
