import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { catalogRangeType } from '../../src/sql-semantics/catalog-check-binder.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { rangeTypeProfile } from '../../src/sql-semantics/range-profiles.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import { readRangeFixture } from './check-range-fixtures.js'
import { readMultirangeQueryFixture } from './check-multirange-fixtures.js'
import { decodeCatalogVector } from './check-catalog-vector-fixtures.js'

const known = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const uncertain = (node: unknown): boolean =>
  !!node &&
  typeof node === 'object' &&
  (('kind' in node && node.kind === 'uncertain') || Object.values(node).some(uncertain))

const families = [
  ['position_span', 'position_set', false],
  ['type_span', 'type_set', true],
  ['array_type_span', 'array_type_set', true],
  ['domain_type_span', 'domain_type_set', true],
] as const

it('preserves native vector bound metadata through constructors, multirange merges and vector-to-array coercion', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-vector-bound-facets-'))
  try {
    await pg.exec(`CREATE TYPE position_span AS RANGE(subtype=int2vector,multirange_type_name=position_set);
      CREATE TYPE type_span AS RANGE(subtype=oidvector,multirange_type_name=type_set);
      CREATE TYPE array_type_span AS RANGE(subtype=oidvector,subtype_opclass=pg_catalog.array_ops,multirange_type_name=array_type_set);
      CREATE TYPE ordinary_span AS RANGE(subtype=smallint[]);
      CREATE TABLE facet_inputs(id int PRIMARY KEY,v int2vector,w int2vector,o oidvector,p oidvector);
      INSERT INTO facet_inputs VALUES(0,'1 2',ARRAY[1,2]::int2vector,'1 2',ARRAY[1,2]::oidvector),(1,NULL,NULL,NULL,NULL);`)
    const forms: Record<string, string> = {}
    for (const [range, multi, lo, hi] of [
      ['position_span', 'position_set', 'v', 'w'],
      ['type_span', 'type_set', 'o', 'p'],
      ['array_type_span', 'array_type_set', 'o', 'p'],
    ]) {
      const first = `${range}(${lo},${hi},'[]')`,
        second = `${range}(${lo},${lo},'[]')`
      forms[range + '_upper'] = `array_lower(upper(${first}),1)`
      forms[range + '_merged_upper'] = `array_lower(upper(${multi}(${first},${second})),1)`
      forms[range + '_reverse_merged_upper'] = `array_lower(upper(${multi}(${second},${first})),1)`
    }
    forms.ordinary_lower = 'array_lower(lower(ordinary_span(v,w)),1)'
    forms.ordinary_upper = 'array_lower(upper(ordinary_span(v,w)),1)'
    const definitions = Object.fromEntries(
      Object.entries(forms).map(([name, sql], i) => [
        name,
        `mode<>${i} OR (${sql}) IS NOT DISTINCT FROM expected`,
      ]),
    )
    await pg.exec(
      `CREATE TABLE facet_checks(v int2vector,w int2vector,o oidvector,p oidvector,mode int,expected int,${Object.entries(
        definitions,
      )
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'facet_checks')!
    const plans = Object.entries(definitions).flatMap(([name, sql]) => {
      const c = table.constraints.find((c) => c.name === name)!
      return (['source', 'stored'] as const).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: name + '_' + origin,
        },
        expression: lowerTableCheck(
          table,
          c,
          [],
          catalog.domains,
          origin,
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
          origin === 'source' ? `CHECK(${sql})` : undefined,
        )!.expression,
      }))
    })
    for (const plan of plans)
      expect(uncertain(plan.expression), plan.identity.constraint).toBe(false)
    const group = prepareCheckRustGroup(plans)
    expect(group.checks.filter((c) => c.kind === 'unsupported')).toEqual([])
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      reference: unknown[] = []
    for (const id of [0, 1]) {
      const row: Row = {}
      for (const name of ['v', 'w', 'o', 'p'])
        row[name] = decodeCatalogVector(
          (
            await pg.query<{ wire: string | null }>(
              `SELECT encode(${name === 'o' || name === 'p' ? 'oid' : 'int2'}vectorsend(${name}),'hex') wire FROM facet_inputs WHERE id=$1`,
              [id],
            )
          ).rows[0]!.wire,
          name === 'o' || name === 'p',
        )
      for (const [mode, [name, sql]] of Object.entries(forms).entries()) {
        const result = (
          await pg.query<{ value: number | null }>(
            `SELECT ${sql} value FROM facet_inputs WHERE id=$1`,
            [id],
          )
        ).rows[0]!.value
        await pg.query(
          'INSERT INTO facet_checks SELECT v,w,o,p,$2,$3 FROM facet_inputs WHERE id=$1',
          [id, mode, result],
        )
        for (const origin of ['source', 'stored'])
          fixtures.push({
            name: name + '_' + origin,
            row: { ...row, mode: known(mode), expected: known(result) },
            expected: { kind: 'True' },
          })
        if (result !== null) {
          await expect(
            pg.query(
              'INSERT INTO facet_checks SELECT v,w,o,p,$2,$3 FROM facet_inputs WHERE id=$1',
              [id, mode, result + 1],
            ),
          ).rejects.toMatchObject({ code: '23514', constraint: name })
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: name + '_' + origin,
              row: { ...row, mode: known(mode), expected: known(result + 1) },
              expected: { kind: 'False' },
            })
        }
        reference.push({ id, name, result })
      }
    }
    await mkdir('artifacts/goal-checks/catalog-vector-ranges-active', { recursive: true })
    await writeFile(
      'artifacts/goal-checks/catalog-vector-ranges-active/bound-facets.json',
      JSON.stringify(reference, null, 2) + '\n',
    )
    await runCheckParity(
      root,
      'vectorboundfacets',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 300_000)

it.each(families)(
  'preserves selected vector range and multirange semantics through raw/stored SQL and native INSERTs in every target: %s',
  async (family, multi, oid) => {
    const pg = await PGlite.create(),
      root = await mkdtemp(join(tmpdir(), 'pgsid-vector-ranges-'))
    try {
      await pg.exec(`CREATE DOMAIN export_types AS oidvector CHECK(cardinality(VALUE)<=3);
      CREATE TYPE position_span AS RANGE(subtype=int2vector,multirange_type_name=position_set);
      CREATE TYPE type_span AS RANGE(subtype=oidvector,multirange_type_name=type_set);
      CREATE TYPE array_type_span AS RANGE(subtype=oidvector,subtype_opclass=pg_catalog.array_ops,multirange_type_name=array_type_set);
      CREATE TYPE domain_type_span AS RANGE(subtype=export_types,multirange_type_name=domain_type_set);`)
      {
        const vector = oid ? 'oidvector' : 'int2vector',
          cell = oid ? 'oid' : 'smallint'
        const needle = family === 'domain_type_span' ? 'a::export_types' : 'a'
        const operations: Record<string, string> = {
          output: 'v::text',
          strict_output: 'textcat(NULLIF(flags,flags),v::text)',
          lower: 'lower(v)::text',
          upper: 'upper(v)::text',
          empty: 'isempty(v)::text',
          lower_inclusive: 'lower_inc(v)::text',
          upper_infinite: 'upper_inf(v)::text',
          equal: '(v=w)::text',
          compare: 'range_cmp(v,w)::text',
          contains: `(v @> ${needle})::text`,
          overlaps: '(v && w)::text',
          intersection: '(v*w)::text',
          union: '(v+w)::text',
          difference: '(v-w)::text',
          merge: 'range_merge(v,w)::text',
          constructor: `public.${family}(a,b,flags)::text`,
          input: `(input_text::public.${family})::text`,
          literal: `'empty'::public.${family}::text`,
          array_output: 'ARRAY[v,w]::text',
          array_sort: 'array_sort(ARRAY[v,w])::text',
          array_sorted_count: 'cardinality(array_sort(ARRAY[v,w]))::text',
          array_position: 'array_position(ARRAY[v,w],v)::text',
          json: 'to_json(v)::text',
          jsonb: 'to_jsonb(v)::text',
          array_jsonb: 'to_jsonb(ARRAY[v,w])::text',
          hash: 'hash_range(v)::text',
          extended_hash: 'hash_range_extended(v,-19)::text',
          wire_length: 'octet_length(range_send(v))::text',
          multi_output: 'm::text',
          strict_multi_output: 'textcat(NULLIF(flags,flags),m::text)',
          multi_lower: 'lower(m)::text',
          multi_contains: `(m @> ${needle})::text`,
          multi_merge: 'range_merge(m)::text',
          multi_constructor: `public.${multi}(v,w)::text`,
          multi_input: `((m::text)::public.${multi})::text`,
          multi_hash: 'hash_multirange(m)::text',
          multi_extended_hash: 'hash_multirange_extended(m,-19)::text',
          multi_wire_length: 'octet_length(multirange_send(m))::text',
          direct_equal: 'v=w',
        }
        const definitions = Object.fromEntries(
          Object.entries(operations).map(([name, sql], mode) => [
            name,
            `mode<>${mode} OR (${name === 'direct_equal' ? sql : `(${sql}) IS NOT DISTINCT FROM expected`})`,
          ]),
        )
        await pg.exec(`CREATE TABLE ${family}_checks(v ${family},w ${family},m ${multi},a ${vector},b ${vector},flags text,input_text text,mode integer,expected text COLLATE "C",
        ${Object.entries(definitions)
          .map(([name, sql]) => `CONSTRAINT "${name}" CHECK(${sql})`)
          .join(',')});
        CREATE TABLE ${family}_inputs(id integer PRIMARY KEY,v ${family},w ${family},m ${multi},a ${vector},b ${vector},flags text,input_text text);`)
        const r = (a: string, b: string, flags = '[)') => `${family}(${a},${b},'${flags}')`,
          v = (s: string) => `'${s}'::${vector}`
        const normal = r(v('1'), v('3')),
          other = r(v('2'), v('4'), '[]'),
          empty = `'empty'::${family}`
        const first = r(v('1 2'), `ARRAY[1,2]::${vector}`, '[]'),
          single = r(v('1 2'), v('1 2'), '[]')
        const samples = [
          {
            v: `NULL::${family}`,
            w: `NULL::${family}`,
            a: `NULL::${vector}`,
            b: `NULL::${vector}`,
            flags: '[)',
            input: 'empty',
          },
          { v: empty, w: empty, a: v(''), b: v(''), flags: '[)', input: 'empty' },
          { v: normal, w: other, a: v('1'), b: v('3'), flags: '[)', input: '[1,3)' },
          {
            v: r('NULL', 'NULL'),
            w: normal,
            a: v('100'),
            b: v('1 2'),
            flags: '[)',
            input:
              family === 'type_span' || family === 'domain_type_span'
                ? '[100,"1 2")'
                : '["1 2",100)',
          },
          {
            v: first,
            w: single,
            a: `ARRAY[1,2]::${vector}`,
            b: v('1 2'),
            flags: '[]',
            input: '["1 2","1 2"]',
          },
          {
            v: r('NULL', v('')),
            w: empty,
            a: `ARRAY[]::${vector}`,
            b: `NULL::${vector}`,
            flags: '[]',
            input: '(,"")',
          },
          {
            v: r(`ARRAY[NULL::${cell}]::${vector}`, 'NULL'),
            w: empty,
            a: `ARRAY[NULL::${cell}]::${vector}`,
            b: v('1'),
            flags: '[)',
            input: '[1,)',
          },
          {
            v: r(v(oid ? '4294967295' : '32767'), 'NULL'),
            w: normal,
            a: v(oid ? '4294967295' : '32767'),
            b: v('1 2'),
            flags: '[)',
            input: '[bad,1)',
          },
          {
            v: normal,
            w: empty,
            a: v('1 2 3 4'),
            b: `NULL::${vector}`,
            flags: '[)',
            input: '["1 2 3 4",)',
          },
          { v: normal, w: empty, a: v('1'), b: v('3'), flags: 'bad', input: '[1,3)' },
        ]
        for (const [i, s] of samples.entries())
          await pg.query(
            `INSERT INTO ${family}_inputs SELECT ${i},${s.v},${s.w},${i === 0 ? `NULL::${multi}` : `${multi}(${s.v},${s.w})`},${s.a},${s.b},$1,$2`,
            [s.flags, s.input],
          )
        const catalog = await snapshotCatalog(pg),
          table = catalog.tables.find((t) => t.name === family + '_checks')!
        const type = catalogRangeType(
          'public.' + family,
          undefined,
          catalog.domains,
          catalog.rangeTypes,
        )!
        expect(type, family).not.toBeNull()
        const profile = rangeTypeProfile(type)!
        const plans = Object.entries(definitions).flatMap(([name, sql]) => {
          const constraint = table.constraints.find((c) => c.name === name)!
          return (['source', 'stored'] as const).map((origin) => {
            const expression = portableCheckAtoms(
              lowerTableCheck(
                table,
                constraint,
                catalog.enums,
                catalog.domains,
                origin,
                catalog.rangeTypes,
                catalog.compositeTypeGraph,
                origin === 'source' ? `CHECK(${sql})` : undefined,
              )!.expression,
            )
            expect(uncertain(expression), family + '/' + name + '/' + origin).toBe(false)
            return {
              expression,
              identity: {
                schema: 'public',
                kind: 'table' as const,
                owner: family,
                constraint: name + '_' + origin,
              },
            }
          })
        })
        const group = prepareCheckRustGroup(plans, {
          defaultCollation: 'C',
          serverEncoding: 'UTF8',
          arrayNulls: true,
        })
        expect(
          group.checks.flatMap((c, i) =>
            c.kind === 'unsupported'
              ? [{ name: plans[i]!.identity.constraint, reason: c.reason }]
              : [],
          ),
        ).toEqual([])
        const rows: Row[] = []
        for (const [i, s] of samples.entries()) {
          const select = `SELECT * FROM ${family}_inputs WHERE id=${i}`
          const a = decodeCatalogVector(
            (
              await pg.query<{ wire: string | null }>(
                `SELECT encode(${oid ? 'oid' : 'int2'}vectorsend(a),'hex') wire FROM (${select}) r`,
              )
            ).rows[0]!.wire,
            oid,
          )
          const b = decodeCatalogVector(
            (
              await pg.query<{ wire: string | null }>(
                `SELECT encode(${oid ? 'oid' : 'int2'}vectorsend(b),'hex') wire FROM (${select}) r`,
              )
            ).rows[0]!.wire,
            oid,
          )
          rows.push({
            v: known(await readRangeFixture(pg, select, 'v', type)),
            w: known(await readRangeFixture(pg, select, 'w', type)),
            m: known(await readMultirangeQueryFixture(pg, profile.multirangeType, select, 'm')),
            a,
            b,
            flags: known(s.flags),
            input_text: known(s.input),
          })
        }
        const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
          reference: unknown[] = []
        let nativeInserts = 0
        for (const [mode, [name, sql]] of Object.entries(operations).entries())
          for (const i of samples.keys()) {
            let result: string | boolean | null = null,
              expected: Outcome
            try {
              result = (
                await pg.query<{ value: string | boolean | null }>(
                  `SELECT ${sql} value FROM ${family}_inputs WHERE id=${i}`,
                )
              ).rows[0]!.value
              expected = {
                kind:
                  name === 'direct_equal'
                    ? result === null
                      ? 'Null'
                      : result
                        ? 'True'
                        : 'False'
                    : 'True',
              }
            } catch (e) {
              expected = {
                kind: 'Error',
                value: { state: parseInt((e as { code: string }).code, 36) },
              }
            }
            const insertion = pg.query(
              `INSERT INTO ${family}_checks SELECT v,w,m,a,b,flags,input_text,$2,$3 FROM ${family}_inputs WHERE id=$1`,
              [i, mode, typeof result === 'string' ? result : null],
            )
            if (expected.kind === 'Error')
              await expect(insertion).rejects.toMatchObject({
                code: expected.value.state.toString(36).toUpperCase().padStart(5, '0'),
              })
            else if (expected.kind === 'False')
              await expect(insertion).rejects.toHaveProperty('code')
            else await insertion
            nativeInserts++
            const representationTie =
              (family === 'type_span' || family === 'domain_type_span') &&
              name === 'array_sort' &&
              i === 4
            if (representationTie) expected = { kind: 'Unknown' }
            const row = {
              ...rows[i]!,
              mode: known(mode),
              expected: known(typeof result === 'string' ? result : null),
            }
            for (const origin of ['source', 'stored'])
              fixtures.push({ name: name + '_' + origin, row, expected })
            reference.push({ name, i, result, expected })
            if (
              (i === 2 || representationTie) &&
              name !== 'direct_equal' &&
              (expected.kind === 'True' || expected.kind === 'Unknown')
            ) {
              await expect(
                pg.query(
                  `INSERT INTO ${family}_checks SELECT v,w,m,a,b,flags,input_text,$2,$3 FROM ${family}_inputs WHERE id=$1`,
                  [i, mode, '__different__'],
                ),
              ).rejects.toMatchObject({ code: '23514', constraint: name })
              nativeInserts++
              for (const origin of ['source', 'stored'])
                fixtures.push({
                  name: name + '_' + origin,
                  row: { ...row, expected: known('__different__') },
                  expected: { kind: representationTie ? 'Unknown' : 'False' },
                })
            }
          }
        const directory = join(root, family)
        await mkdir(directory)
        await mkdir('artifacts/goal-checks/catalog-vector-ranges-active', { recursive: true })
        await writeFile(
          `artifacts/goal-checks/catalog-vector-ranges-active/${family}.json`,
          JSON.stringify(
            {
              nativeInserts,
              fixtures: fixtures.length,
              checks: Object.keys(operations).length,
              reference,
            },
            null,
            2,
          ) + '\n',
        )
        await writeFile(
          `artifacts/goal-checks/catalog-vector-ranges-active/${family}-evaluators.rs`,
          group.evaluatorSource ?? '',
        )
        await runCheckParity(
          directory,
          family.replaceAll('_', ''),
          group,
          plans.map((p) => p.identity.constraint),
          fixtures,
        )
        console.info('Vector range parity', {
          family,
          nativeInserts,
          fixtures: fixtures.length,
          checks: Object.keys(operations).length,
        })
      }
    } finally {
      await pg.close()
      await rm(root, { recursive: true, force: true })
    }
  },
  900_000,
)
