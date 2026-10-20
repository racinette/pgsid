import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { arrayElementIdentity } from '../../src/codegen/shared/check-array-types.js'
import { arrayType, domainElementType } from '../../src/sql-semantics/expressions.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'
import {
  customRangeSchema,
  customRangeProfiles,
  nativeCustomRangeOutcome,
} from './check-custom-range-fixtures.js'
import {
  readRangeArrayFixture,
  rangeArrayText,
  rangeArrayNeedsOutputContext,
} from './check-range-array-fixtures.js'
import {
  readMultirangeArrayFixture,
  multirangeArrayNeedsOutputContext,
} from './check-multirange-array-fixtures.js'
import { readRangeFixture } from './check-range-fixtures.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'

for (const multi of [false, true])
  it(`admits captured custom ${multi ? 'multirange' : 'range'} arrays through generic operations, domain cells, scalar I/O and native raw/stored INSERTs`, async () => {
    const pg = await PGlite.create(),
      directory = await mkdtemp(join(tmpdir(), 'pgsid-custom-arrays-'))
    try {
      await pg.exec("SET DateStyle='ISO,YMD';SET TimeZone='UTC';" + customRangeSchema)
      let catalog = await snapshotCatalog(pg)
      const profiles = customRangeProfiles(catalog).filter(
        (p) => p.canonical === null && p.name !== 'reverse_span',
      )
      expect(profiles).toHaveLength(7)
      const bodies = {
        count: 'cardinality(a) IS NOT DISTINCT FROM expected',
        dimensions: 'array_ndims(a) IS NOT DISTINCT FROM expected',
        lower: 'array_lower(a,1) IS NOT DISTINCT FROM expected',
        upper: 'array_upper(a,1) IS NOT DISTINCT FROM expected',
        fetch: 'a[position] IS NOT DISTINCT FROM head',
        bound: 'lower(a[position]) IS NOT DISTINCT FROM lower(head)',
        slice: 'cardinality(a[position:stop]) IS NOT DISTINCT FROM expected',
        constructor: 'ARRAY[head,tail,NULL] IS NOT DISTINCT FROM a',
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
        sort: 'array_sort(a) IS NOT DISTINCT FROM b',
        reverse: 'cardinality(array_reverse(a)) IS NOT DISTINCT FROM expected',
        fill: 'cardinality(array_fill(head,ARRAY[expected])) IS NOT DISTINCT FROM expected',
        coalesce: 'COALESCE(a,ARRAY[head]) IS NOT DISTINCT FROM b',
        input: 'source::TYPE[] IS NOT DISTINCT FROM a',
        output: 'a::text COLLATE "C" IS NOT DISTINCT FROM source COLLATE "C"',
        io_input: 'sources::TYPE[] IS NOT DISTINCT FROM a',
        io_output: 'a::text[] IS NOT DISTINCT FROM sources',
        typed: 'typed[position] IS NOT DISTINCT FROM a[position]',
        nested: '(history[1])[position] IS NOT DISTINCT FROM a[position]',
        ...(multi
          ? {}
          : { variadic: 'CONSTRUCTOR(VARIADIC a) IS NOT DISTINCT FROM expected_pack' }),
      }
      const shapes = profiles.map((profile, family) => {
        const raw = multi ? profile.multirange : profile.identity,
          type = multi ? profile.multirangeType : profile.rangeType,
          domain = `custom_windows_${Number(multi)}_${family}`,
          cell = `custom_cell_${Number(multi)}_${family}`,
          fn = catalog.rangeTypes
            .find((p) => p.identity === profile.identity)!
            .callables!.find((c) => c.implementation === 'multirange_constructor2')!
        return {
          profile,
          family,
          raw,
          type,
          domain,
          cell,
          fn: [fn.schema, fn.name].map((n) => '"' + n.replaceAll('"', '""') + '"').join('.'),
        }
      })
      for (const f of shapes)
        await pg.exec(`CREATE DOMAIN ${f.domain} AS ${f.raw}[];CREATE DOMAIN ${f.cell} AS ${f.raw}`)
      const forms = shapes.flatMap((f) =>
        Object.entries(bodies).map(([name, body], i) => ({
          ...f,
          name,
          table: `custom_arrays_${Number(multi)}_${f.family}_${i}`,
          sql: `CASE WHEN bypass THEN true ELSE ${body.replaceAll('TYPE', f.raw).replaceAll('CONSTRUCTOR', f.fn)} END`,
        })),
      )
      for (const f of forms)
        await pg.exec(
          `CREATE TABLE ${f.table}(a ${f.domain},b ${f.raw}[],head ${f.raw},tail ${f.raw},expected int4,position int4,stop int4,source text,sources text[],typed ${f.cell}[],history ${f.domain}[],expected_pack ${f.profile.multirange},bypass bool,CONSTRAINT valid CHECK(${f.sql}))`,
        )
      catalog = await snapshotCatalog(pg)
      const plans = forms.flatMap((f) => {
          const table = catalog.tables.find((t) => t.name === f.table)!
          return (['source', 'stored'] as const).map((origin) => {
            const expression = lowerTableCheck(
              table,
              origin === 'source'
                ? { name: 'valid', type: 'check', definition: `CHECK(${f.sql})` }
                : table.constraints[0]!,
              catalog.enums,
              catalog.domains,
              origin,
              catalog.rangeTypes,
            )!.expression
            expect(hasUncertain(expression), f.table + '/' + f.name + '/' + origin).toBe(false)
            return {
              identity: {
                schema: 'public',
                kind: 'table' as const,
                owner: f.table,
                constraint: origin,
              },
              expression: portableCheckAtoms(expression),
            }
          })
        }),
        group = prepareCheckRustGroup(plans, {
          defaultCollation: 'C',
          serverEncoding: 'UTF8',
          arrayNulls: true,
          nativeByteOrder: 'little',
        }),
        names = plans.map((p) => p.identity.owner + '_' + p.identity.constraint)
      for (const [i, c] of group.checks.entries())
        expect(c.kind, names[i] + (c.kind === 'unsupported' ? ': ' + c.reason : '')).toBe(
          'supported',
        )
      const fixtures: { name: string; row: Row; expected: Outcome }[] = []
      let inserts = 0,
        deferred = 0,
        errors = 0,
        rejections = 0
      for (const shape of shapes) {
        const p = shape.profile,
          temporal = [
            'pg_catalog.date',
            'pg_catalog."timestamp"',
            'pg_catalog.timestamptz',
          ].includes(p.elementType),
          suffix = p.elementType === 'pg_catalog.timestamptz' ? ' 00:00:00+00' : '',
          [lo, hi, end] = temporal
            ? ['2000-01-01', '2000-01-03', '2000-01-05'].map((v) => v + suffix)
            : p.elementType === 'pg_catalog."numeric"'
              ? ['1.00', '3.000', '5.0000']
              : ['1', '3', '5'],
          wrap = (range: string) =>
            multi ? (range === 'empty' ? '{}' : '{' + range + '}') : range,
          head = wrap(`[${lo},${hi}]`),
          tail = wrap(`[${hi},${end})`),
          empty = wrap('empty'),
          universal = wrap('(,)'),
          samples = [
            { a: rangeArrayText([head, tail, null]), b: rangeArrayText([head]), head, tail },
            { a: rangeArrayText([head, tail, null], -2), b: rangeArrayText([head]), head, tail },
            { a: rangeArrayText([null, empty, head]), b: rangeArrayText([null]), head: null, tail },
            {
              a: rangeArrayText([head, head, empty]),
              b: rangeArrayText([tail, empty]),
              head,
              tail,
            },
            { a: '{}', b: '{}', head: empty, tail: null },
            { a: null, b: null, head: null, tail: null },
            {
              a: `[0:1][3:4]={{${JSON.stringify(empty)},NULL},{${JSON.stringify(universal)},${JSON.stringify(empty)}}}`,
              b: rangeArrayText([empty]),
              head: empty,
              tail: universal,
            },
          ]
        const readArray = (text: string | null) =>
            multi
              ? readMultirangeArrayFixture(pg, p.multirangeType, text)
              : readRangeArrayFixture(pg, p.rangeType, text),
          readCell = (text: string | null) =>
            multi
              ? readMultirangeFixture(pg, p.multirangeType, text)
              : readRangeFixture(pg, `SELECT $1::${p.identity} AS span`, 'span', p.rangeType, [
                  text,
                ])
        for (const [index, sample] of samples.entries()) {
          const a = await readArray(sample.a),
            b = await readArray(sample.b),
            first = await readCell(sample.head),
            last = await readCell(sample.tail),
            sources = (
              await pg.query<{ value: string | null }>(
                `SELECT ($1::${shape.raw}[])::text[]::text AS value`,
                [sample.a],
              )
            ).rows[0]!.value,
            textSources =
              sources === null
                ? null
                : (
                    await pg.query<{ value: string | null }>(
                      `SELECT value FROM unnest($1::text[]) WITH ORDINALITY AS parts(value,position) ORDER BY position`,
                      [sources],
                    )
                  ).rows
          const sourceArray =
            textSources === null
              ? null
              : {
                  elementType: 'pg_catalog.text',
                  elementKind: 8,
                  dimensions: a!.dimensions,
                  elements: textSources.map((c) =>
                    c.value === null
                      ? { kind: 'Null' as const }
                      : { kind: 'Text' as const, value: c.value },
                  ),
                  nullBitmap: a!.nullBitmap,
                }
          const typed =
              a === null
                ? null
                : {
                    ...structuredClone(a),
                    elementType: arrayElementIdentity(
                      domainElementType({ schema: 'public', name: shape.cell }, shape.type),
                    ),
                  },
            nestedIdentity = domainElementType(
              { schema: 'public', name: shape.domain },
              arrayType(shape.type),
            ),
            history = {
              elementType: arrayElementIdentity(nestedIdentity),
              elementKind: 41,
              dimensions: [{ lower: 1, length: 2 }],
              elements: [
                a === null
                  ? { kind: 'Null' as const }
                  : { kind: 'Array' as const, value: structuredClone(a) },
                { kind: 'Null' as const },
              ],
              nullBitmap: { kind: 'Value' as const, value: true },
            },
            historyText = (
              await pg.query<{ value: string }>(
                `SELECT ARRAY[$1::${shape.domain},NULL::${shape.domain}]::text AS value`,
                [sample.a],
              )
            ).rows[0]!.value
          let packText: string | null = null
          if (!multi)
            try {
              packText = (
                await pg.query<{ value: string | null }>(
                  `SELECT ${shape.fn}(VARIADIC $1::${shape.raw}[])::text AS value`,
                  [sample.a],
                )
              ).rows[0]!.value
            } catch (e) {
              expect(e).toMatchObject({ code: expect.stringMatching(/^(22004|21000)$/) })
            }
          const pack = await readMultirangeFixture(pg, p.multirangeType, packText)
          for (const bypass of [false, true])
            for (const f of forms.filter((f) => f.family === shape.family)) {
              const expectedCount = index % 3 === 0 ? 3 : index % 3 === 1 ? 0 : -1,
                position = index % 2 ? -2 : 1,
                parameters = [
                  sample.a,
                  sample.b,
                  sample.head,
                  sample.tail,
                  expectedCount,
                  position,
                  1,
                  sample.a,
                  sources,
                  sample.a,
                  historyText,
                  packText,
                  bypass,
                ],
                seed = `SELECT $1::${shape.domain} AS a,$2::${shape.raw}[] AS b,$3::${shape.raw} AS head,$4::${shape.raw} AS tail,$5::int4 AS expected,$6::int4 AS position,$7::int4 AS stop,$8::text AS source,$9::text[] AS sources,$10::${shape.cell}[] AS typed,$11::${shape.domain}[] AS history,$12::${p.multirange} AS expected_pack,$13::bool AS bypass`,
                native = await nativeCustomRangeOutcome(
                  pg,
                  `WITH inputs AS MATERIALIZED(${seed})SELECT (${f.sql}) AS value FROM inputs`,
                  parameters,
                ),
                insert = pg.query(
                  `INSERT INTO ${f.table} SELECT * FROM(${seed}) inputs`,
                  parameters,
                )
              if (native.kind === 'Error') {
                await expect(insert).rejects.toMatchObject({
                  code: native.value.state.toString(36).toUpperCase().padStart(5, '0'),
                })
                errors++
              } else if (native.kind === 'False') {
                await expect(insert).rejects.toMatchObject({ code: '23514' })
                rejections++
              } else await insert
              inserts++
              const needsOutputContext = multi
                  ? multirangeArrayNeedsOutputContext(a)
                  : rangeArrayNeedsOutputContext(a),
                expected: Outcome =
                  !bypass && ['output', 'io_output'].includes(f.name) && needsOutputContext
                    ? { kind: 'Unknown' }
                    : native
              if (expected.kind === 'Unknown') deferred++
              const row: Row = {
                a: a ? { kind: 'Value', value: a } : { kind: 'Null' },
                b: b ? { kind: 'Value', value: b } : { kind: 'Null' },
                head: first ? { kind: 'Value', value: first } : { kind: 'Null' },
                tail: last ? { kind: 'Value', value: last } : { kind: 'Null' },
                expected: { kind: 'Value', value: expectedCount },
                position: { kind: 'Value', value: position },
                stop: { kind: 'Value', value: 1 },
                source: sample.a === null ? { kind: 'Null' } : { kind: 'Value', value: sample.a },
                sources: sourceArray ? { kind: 'Value', value: sourceArray } : { kind: 'Null' },
                typed: typed ? { kind: 'Value', value: typed } : { kind: 'Null' },
                history: { kind: 'Value', value: history },
                expected_pack: pack ? { kind: 'Value', value: pack } : { kind: 'Null' },
                bypass: { kind: 'Value', value: bypass },
              }
              const offset = forms.indexOf(f) * 2
              for (const origin of [0, 1])
                fixtures.push({ name: names[offset + origin]!, row, expected })
            }
        }
      }
      await runCheckParity(
        directory,
        multi ? 'custommultiarrays' : 'customrangearrays',
        group,
        names,
        fixtures,
      )
      expect(rejections).toBeGreaterThan(0)
      expect(errors).toBeGreaterThan(0)
      await mkdir('artifacts/check-custom-range-arrays', { recursive: true })
      await writeFile(
        `artifacts/check-custom-range-arrays/${multi ? 'multirange' : 'range'}-report.json`,
        JSON.stringify(
          {
            profiles: profiles.length,
            plans: plans.length,
            inserts,
            fixtures: fixtures.length,
            deferred,
            errors,
            rejections,
          },
          null,
          2,
        ) + '\n',
      )
    } finally {
      await pg.close()
      await rm(directory, { recursive: true, force: true })
    }
  }, 480_000)
