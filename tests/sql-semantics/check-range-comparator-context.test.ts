import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

it('keeps portable range ordering separate from raw tsvector comparator magnitude across nested ranges and containers', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-range-comparator-context-'))
  try {
    await pg.exec(`CREATE TYPE doc_span AS RANGE(subtype=tsvector,multirange_type_name=doc_ranges);
      CREATE TYPE span_span AS RANGE(subtype=doc_span,multirange_type_name=span_ranges);
      CREATE TYPE small_span AS RANGE(subtype=int2);
      CREATE TYPE doc_pair AS(span doc_span,rank int4);CREATE TYPE member_pair AS(span doc_ranges,rank int4);`)
    const left = 'public.doc_span(source::tsvector,NULL)',
      right = 'public.doc_span(target::tsvector,NULL)',
      ml = 'public.doc_ranges(' + left + ')',
      mr = 'public.doc_ranges(' + right + ')',
      nl = 'public.span_span(' + left + ',NULL)',
      nr = 'public.span_span(' + right + ',NULL)'
    const forms = Object.entries({
      builtin_control: {
        sql: 'range_cmp(int4range(length(source),NULL),int4range(length(target),NULL))',
        raw: false,
      },
      narrow_control: {
        sql: 'range_cmp(public.small_span(length(source)::int2,NULL),public.small_span(length(target)::int2,NULL))',
        raw: false,
      },
      raw_range: { sql: `range_cmp(${left},${right})`, raw: true },
      raw_multirange: { sql: `multirange_cmp(${ml},${mr})`, raw: true },
      raw_nested: { sql: `range_cmp(${nl},${nr})`, raw: true },
      raw_nested_members: {
        sql: `multirange_cmp(public.span_ranges(${nl}),public.span_ranges(${nr}))`,
        raw: true,
      },
      range_boolean: { sql: `CASE WHEN ${left}<${right} THEN -1 ELSE 0 END`, raw: false },
      multirange_boolean: { sql: `CASE WHEN ${ml}<${mr} THEN -1 ELSE 0 END`, raw: false },
      array: { sql: `btarraycmp(ARRAY[${left}],ARRAY[${right}])`, raw: false },
      member_array: { sql: `btarraycmp(ARRAY[${ml}],ARRAY[${mr}])`, raw: false },
      record: {
        sql: `btrecordcmp(ROW(${left},1)::public.doc_pair,ROW(${right},1)::public.doc_pair)`,
        raw: false,
      },
      member_record: {
        sql: `btrecordcmp(ROW(${ml},1)::public.member_pair,ROW(${mr},1)::public.member_pair)`,
        raw: false,
      },
    }).map(([name, form]) => ({
      name,
      ...form,
      definition: `CHECK(CASE WHEN bypass THEN true ELSE (${form.sql})=expected END)`,
    }))
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE compare_${f.name}(source text,target text,expected int4,bypass bool,${f.definition})`,
      )
    const catalog = await snapshotCatalog(pg),
      plans = forms.flatMap((f) => {
        const table = catalog.tables.find((t) => t.name === 'compare_' + f.name)!
        return (['source', 'stored'] as const).map((origin) => ({
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: f.name + '_' + origin,
          },
          expression: portableCheckAtoms(
            lowerTableCheck(
              table,
              origin === 'source'
                ? { ...table.constraints[0]!, definition: f.definition }
                : table.constraints[0]!,
              [],
              [],
              origin,
              catalog.rangeTypes,
              catalog.compositeTypeGraph,
            )!.expression,
          ),
        }))
      }),
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    for (const f of forms)
      for (const [source, target, opaque] of [
        ['aa', 'zz', true],
        ['a', 'z', true],
        ['a', 'bbb', false],
        ['aa', 'aa', false],
        ['a:1A', 'a:2B', false],
        ['aa', null, false],
        [null, 'aa', false],
        [null, null, false],
        ['a:0', 'aa', false],
      ] as const) {
        let value = 0,
          state: string | undefined
        try {
          value = (
            await pg.query<{ value: number }>(
              `SELECT (${f.sql}) value FROM(SELECT $1::text source,$2::text target) q`,
              [source, target],
            )
          ).rows[0]!.value
        } catch (e) {
          state = (e as { code: string }).code
        }
        for (const wrong of [false, true])
          for (const bypass of [false, true]) {
            const expected = value + (wrong ? 1 : 0)
            let failure: string | undefined
            try {
              await pg.query('INSERT INTO compare_' + f.name + ' VALUES($1,$2,$3,$4)', [
                source,
                target,
                expected,
                bypass,
              ])
            } catch (e) {
              failure = (e as { code: string }).code
            }
            expect(failure, f.name + '/' + source + '/' + target).toBe(
              bypass ? undefined : (state ?? (wrong ? '23514' : undefined)),
            )
            const result: Outcome = bypass
              ? { kind: 'True' }
              : state
                ? { kind: 'Error', value: { state: parseInt(state, 36) } }
                : f.raw && opaque
                  ? { kind: 'Unknown' }
                  : { kind: wrong ? 'False' : 'True' }
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: f.name + '_' + origin,
                row: {
                  source: known(source),
                  target: known(target),
                  expected: known(expected),
                  bypass: known(bypass),
                },
                expected: result,
              })
            references.push({ name: f.name, source, target, wrong, bypass, value, failure, result })
          }
      }
    expect(references).toContainEqual(
      expect.objectContaining({
        name: 'raw_range',
        source: 'aa',
        target: 'zz',
        value: -25,
        result: { kind: 'Unknown' },
      }),
    )
    const group = prepareCheckRustGroup(plans, {
      serverEncoding: 'UTF8',
      clientEncoding: 'UTF8',
      defaultCollation: 'C',
      arrayNulls: true,
    })
    group.checks.forEach((c, i) =>
      expect(c.kind, plans[i]!.identity.constraint + ('reason' in c ? ': ' + c.reason : '')).toBe(
        'supported',
      ),
    )
    const packet = 'artifacts/goal-checks/range-storage-active'
    await mkdir(packet, { recursive: true })
    await writeFile(
      join(packet, 'comparator-reference.json'),
      JSON.stringify(
        { nativeInserts: references.length, fixtures: fixtures.length, references },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      root,
      'rangecomparator',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600_000)
