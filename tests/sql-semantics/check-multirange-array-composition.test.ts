import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { PG18_RANGE_TYPES } from '../../src/postgres/builtins/type-ranges.generated.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { domainElementType } from '../../src/sql-semantics/expressions.js'
import { rangeArrayText, readRangeArrayFixture } from './check-range-array-fixtures.js'
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
} from './check-multirange-array-fixtures.js'

it('preserves complete multirange array results, extrema, bucketing and exact selected wire scales through composed SQL', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-multirange-array-composition-'))
  try {
    await pg.exec("SET DateStyle='ISO,YMD';SET TimeZone='UTC'")
    const operations = [
      ['sort', 'array_sort(a)', 'array'],
      ['sort_desc', 'array_sort(a,true,false)', 'array'],
      ['reverse', 'array_reverse(a)', 'array'],
      ['remove', 'array_remove(a,head)', 'array'],
      ['replace', 'array_replace(a,head,tail)', 'array'],
      ['append', 'array_append(a,head)', 'array'],
      ['prepend', 'array_prepend(head,a)', 'array'],
      ['concat', 'a||b', 'array'],
      ['trim', 'trim_array(a,1)', 'array'],
      ['fill', 'array_fill(head,ARRAY[2],ARRAY[-2])', 'array'],
      ['slice', 'a[1:2]', 'array'],
      ['smaller', 'array_smaller(a,b)', 'array'],
      ['larger', 'array_larger(a,b)', 'array'],
      ['sorted_head', '(array_sort(a))[array_lower(a,1)]', 'wire'],
      ['replaced_head', '(array_replace(a,head,tail))[array_lower(a,1)]', 'wire'],
      ['bucket', 'width_bucket(head,array_sort(b))', 'int'],
    ] as const
    const forms = Object.values(PG18_RANGE_TYPES).flatMap((m, family) =>
      operations.map(([name, body, kind]) => {
        const expression = kind === 'wire' ? 'multirange_send(' + body + ')' : body
        return {
          m,
          name,
          expression,
          kind,
          table: 'multi_array_results_' + family + '_' + name,
          sql: '(' + expression + ') IS NOT DISTINCT FROM expected',
        }
      }),
    )
    for (const f of forms)
      await pg.exec(
        'CREATE TABLE ' +
          f.table +
          '(a ' +
          f.m.multirange +
          '[],b ' +
          f.m.multirange +
          '[],head ' +
          f.m.multirange +
          ',tail ' +
          f.m.multirange +
          ',expected ' +
          (f.kind === 'wire' ? 'bytea' : f.kind === 'int' ? 'integer' : f.m.multirange + '[]') +
          ',CHECK(' +
          f.sql +
          '))',
      )
    const catalog = await snapshotCatalog(pg)
    const plans = forms.flatMap((f) => {
      const table = catalog.tables.find((t) => t.name === f.table)!
      return (['source', 'stored'] as const).map((origin) => {
        const expression = portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'source'
              ? { name: 'checked', type: 'check', definition: 'CHECK(' + f.sql + ')' }
              : table.constraints[0]!,
            catalog.enums,
            catalog.domains,
            origin,
          )!.expression,
        )
        expect(hasUncertain(expression), f.table + '/' + origin).toBe(false)
        return {
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: f.table,
            constraint: origin,
          },
          expression,
        }
      })
    })
    const group = prepareCheckRustGroup(plans, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      arrayNulls: true,
      nativeByteOrder: 'little',
    })
    expect(group.checks.filter((c) => c.kind !== 'supported')).toEqual([])
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    let inserts = 0
    for (const m of Object.values(PG18_RANGE_TYPES)) {
      const numeric = m.subtype === 'pg_catalog."numeric"'
      const head = numeric
        ? '{[1.0000,3.00000)}'
        : '{' + rangeCoreSamples(m.identity).ranges[5]! + '}'
      const high = ['pg_catalog.int4', 'pg_catalog.int8', 'pg_catalog."numeric"'].includes(
        m.subtype,
      )
        ? '[7,9)'
        : '[2000-02-01,2000-03-01)'
      const tail = '{' + high + '}'
      const b = multirangeArrayText([tail, head, '{}'])
      const samples = [
        multirangeArrayText([head, null, tail, head]),
        multirangeArrayText([tail, head], -2),
        '{}',
        null,
        '[0:1][3:4]={{"{}",NULL},{"{(,)}","{}"}}',
      ]
      const headValue = await readMultirangeFixture(pg, m.multirange, head),
        tailValue = await readMultirangeFixture(pg, m.multirange, tail)
      const bValue = await readMultirangeArrayFixture(pg, m.multirange, b)
      for (const a of samples) {
        const aValue = await readMultirangeArrayFixture(pg, m.multirange, a)
        for (const f of forms.filter((f) => f.m.multirange === m.multirange)) {
          let rendered: string | number | null = null,
            error: string | undefined
          try {
            rendered = (
              await pg.query<{ rendered: string | number | null }>(
                'SELECT ' +
                  (f.kind === 'wire'
                    ? 'encode(' + f.expression + ",'hex')"
                    : f.kind === 'array'
                      ? '(' + f.expression + ')::text'
                      : f.expression) +
                  ' rendered FROM (SELECT $1::' +
                  m.multirange +
                  '[] a,$2::' +
                  m.multirange +
                  '[] b,$3::' +
                  m.multirange +
                  ' head,$4::' +
                  m.multirange +
                  ' tail) q',
                [a, b, head, tail],
              )
            ).rows[0]!.rendered
          } catch (failure) {
            error = (failure as { code: string }).code
            expect(['2202E', '22023', '22000', '0A000', '54000']).toContain(error)
          }
          const expectedArray =
            f.kind === 'array' && !error
              ? await readMultirangeArrayFixture(pg, m.multirange, rendered as string | null)
              : null
          let expected: Outcome = { kind: 'True' }
          try {
            await pg.query(
              'INSERT INTO ' +
                f.table +
                ' VALUES($1,$2,$3,$4,' +
                (f.kind === 'wire' ? "decode($5,'hex')" : '$5') +
                ')',
              [a, b, head, tail, rendered],
            )
            expect(error).toBeUndefined()
          } catch (failure) {
            expect((failure as { code: string }).code).toBe(error)
            expected = { kind: 'Error', value: { state: parseInt(error!, 36) } }
          }
          inserts++
          const row: Row = {
            a: aValue ? { kind: 'Value', value: aValue } : { kind: 'Null' },
            b: { kind: 'Value', value: bValue! },
            head: { kind: 'Value', value: headValue! },
            tail: { kind: 'Value', value: tailValue! },
            expected:
              f.kind === 'array'
                ? expectedArray
                  ? { kind: 'Value', value: expectedArray }
                  : { kind: 'Null' }
                : rendered === null
                  ? { kind: 'Null' }
                  : { kind: 'Value', value: rendered },
          }
          for (const origin of ['source', 'stored'])
            fixtures.push({ name: f.table + '_' + origin, row, expected })
        }
      }
    }
    await runCheckParity(
      directory,
      'multiarrayresults',
      group,
      forms.flatMap((f) => ['source', 'stored'].map((o) => f.table + '_' + o)),
      fixtures,
    )
    await mkdir('artifacts/check-multirange-arrays', { recursive: true })
    await writeFile(
      'artifacts/check-multirange-arrays/composition-report.json',
      JSON.stringify(
        {
          inserts,
          fixtures: fixtures.length,
          plans: plans.length,
          exactSelectedWireScales: true,
          operations: operations.map(([name]) => name),
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

it('lifts catalog range casts into multirange arrays with bounds, NULL cells, checked domains and lazy conversion', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-multirange-array-casts-'))
  try {
    await pg.exec("SET DateStyle='ISO,YMD';SET TimeZone='UTC'")
    const forms = Object.values(PG18_RANGE_TYPES).flatMap((m, i) =>
      [false, true].map((domain) => ({
        m,
        domain,
        index: i,
        table: 'multi_array_cast_' + i + '_' + Number(domain),
        target: domain ? 'multi_cast_nonempty_' + i : m.multirange,
      })),
    )
    for (const [i, m] of Object.values(PG18_RANGE_TYPES).entries())
      await pg.exec(
        'CREATE DOMAIN multi_cast_nonempty_' +
          i +
          ' AS ' +
          m.multirange +
          ' CHECK(NOT isempty(VALUE))',
      )
    for (const f of forms)
      await pg.exec(
        'CREATE TABLE ' +
          f.table +
          '(a ' +
          f.m.identity +
          '[],expected ' +
          f.target +
          '[],bypass boolean,CHECK(CASE WHEN bypass THEN true ELSE a::' +
          f.target +
          '[] IS NOT DISTINCT FROM expected END))',
      )
    const catalog = await snapshotCatalog(pg)
    const group = prepareCheckRustGroup(
      forms.flatMap((f) => {
        const table = catalog.tables.find((t) => t.name === f.table)!
        return (['source', 'stored'] as const).map((origin) => ({
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: f.table,
            constraint: origin,
          },
          expression: portableCheckAtoms(
            lowerTableCheck(
              table,
              origin === 'source'
                ? {
                    name: 'checked',
                    type: 'check',
                    definition:
                      'CHECK(CASE WHEN bypass THEN true ELSE a::' +
                      f.target +
                      '[] IS NOT DISTINCT FROM expected END)',
                  }
                : table.constraints[0]!,
              catalog.enums,
              catalog.domains,
              origin,
            )!.expression,
          ),
        }))
      }),
      { defaultCollation: 'C', serverEncoding: 'UTF8', arrayNulls: true },
    )
    expect(group.checks.filter((c) => c.kind !== 'supported')).toEqual([])
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    let inserts = 0
    for (const f of forms)
      for (const text of [
        null,
        '{}',
        rangeArrayText([rangeCoreSamples(f.m.identity).ranges[5]!, null], -2),
        rangeArrayText(['empty', null]),
        rangeArrayText(['(,)']),
      ]) {
        const a = await readRangeArrayFixture(pg, f.m.identity, text)
        let converted: string | null = null,
          failure: string | undefined
        try {
          converted = (
            await pg.query<{ value: string | null }>(
              'SELECT ($1::' + f.m.identity + '[]::' + f.target + '[])::text value',
              [text],
            )
          ).rows[0]!.value
        } catch (error) {
          failure = (error as { code: string }).code
          expect(failure).toBe('23514')
        }
        const expected = await readMultirangeArrayFixture(pg, f.m.multirange, converted)
        if (expected && f.domain)
          expected.elementType = domainElementType(
            { schema: 'public', name: f.target },
            f.m.multirange,
          )
        for (const bypass of [false, true]) {
          let outcome: Outcome = { kind: 'True' }
          try {
            await pg.query('INSERT INTO ' + f.table + ' VALUES($1,$2,$3)', [
              text,
              converted,
              bypass,
            ])
            expect(!failure || bypass).toBe(true)
          } catch (error) {
            expect((error as { code: string }).code).toBe(failure)
            outcome = { kind: 'Error', value: { state: parseInt(failure!, 36) } }
          }
          inserts++
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: f.table + '_' + origin,
              row: {
                a: a ? { kind: 'Value', value: a } : { kind: 'Null' },
                expected: expected ? { kind: 'Value', value: expected } : { kind: 'Null' },
                bypass: { kind: 'Value', value: bypass },
              },
              expected: outcome,
            })
        }
      }
    await runCheckParity(
      directory,
      'multiarraycasts',
      group,
      forms.flatMap((f) => ['source', 'stored'].map((o) => f.table + '_' + o)),
      fixtures,
    )
    await mkdir('artifacts/check-multirange-arrays', { recursive: true })
    await writeFile(
      'artifacts/check-multirange-arrays/cast-report.json',
      JSON.stringify(
        {
          inserts,
          fixtures: fixtures.length,
          plans: forms.length * 2,
          checkedElementDomains: true,
          lazyConversion: true,
          preservedArrayBounds: true,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180000)
