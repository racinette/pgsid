import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { scalarRangeText } from './check-scalar-range-fixtures.js'
import { rangeArrayText } from './check-range-array-fixtures.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const known = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

it('retains identical Unicode JSONB sort ties through scalar, range, multirange and nested domain arrays while deferring unequal representations', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-jsonb-sort-ties-'))
  try {
    await pg.exec(`CREATE TYPE tie_window AS RANGE(subtype=jsonb,multirange_type_name=tie_windows);
      CREATE DOMAIN tie_jsonb_row AS jsonb[];
      CREATE DOMAIN tie_range_row AS tie_window[];
      CREATE DOMAIN tie_multi_row AS tie_windows[];`)
    const span = (value: string) => scalarRangeText(value, value),
      multi = (value: string) => `{${span(value)}}`
    const families = [
      { name: 'scalar', type: 'jsonb', wrap: (value: string) => value },
      { name: 'range', type: 'tie_window', wrap: span },
      { name: 'multi', type: 'tie_windows', wrap: multi },
      {
        name: 'jsonb_rows',
        type: 'tie_jsonb_row',
        wrap: (value: string) => rangeArrayText([value, null], -3),
      },
      {
        name: 'range_rows',
        type: 'tie_range_row',
        wrap: (value: string) => rangeArrayText([span(value), null], -3),
      },
      {
        name: 'multi_rows',
        type: 'tie_multi_row',
        wrap: (value: string) => rangeArrayText([multi(value), null], -3),
      },
    ]
    const forms = families.flatMap((family) =>
      Object.entries({
        sorted: `array_sort(payload::${family.type}[],descending,nulls_first)::text`,
        count: `cardinality(array_sort(payload::${family.type}[],descending,nulls_first))::text`,
        selected: `(array_sort(payload::${family.type}[],descending,nulls_first))[-2]::text`,
      }).map(([name, output]) => ({
        ...family,
        name,
        output,
        table: `jsonb_tie_${family.name}_${name}`,
        sql: `CASE WHEN bypass THEN true ELSE (${output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END`,
      })),
    )
    for (const form of forms)
      await pg.exec(
        `CREATE TABLE ${form.table}(payload text,descending bool,nulls_first bool,expected text,bypass bool,CONSTRAINT matches CHECK(${form.sql}))`,
      )
    const catalog = await snapshotCatalog(pg),
      plans = forms.flatMap((form) =>
        (['source', 'stored'] as const).map((origin) => {
          const table = catalog.tables.find((t) => t.name === form.table)!
          return {
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: form.table,
              constraint: origin,
            },
            expression: portableCheckAtoms(
              lowerTableCheck(
                table,
                origin === 'source'
                  ? { ...table.constraints[0]!, definition: `CHECK(${form.sql})` }
                  : table.constraints[0]!,
                catalog.enums,
                catalog.domains,
                origin,
                catalog.rangeTypes,
              )!.expression,
            ),
          }
        }),
      ),
      group = prepareCheckRustGroup(plans, {
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        arrayNulls: true,
      })
    for (const [index, check] of group.checks.entries())
      expect(check.kind, plans[index]!.identity.owner + JSON.stringify(check)).toBe('supported')
    const exact = '{"aa":1.2300,"é":2.00}',
      equal = '{"é":2.00,"aa":1.2300}',
      different = '{"aa":1.23000,"é":2.00}'
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    let inserts = 0,
      ambiguous = 0
    for (const form of forms) {
      const samples = [
        { name: 'null', value: null, uncertain: false },
        { name: 'empty', value: '{}', uncertain: false },
        { name: 'null_cells', value: rangeArrayText([null, null], -2), uncertain: false },
        {
          name: 'identical',
          value: rangeArrayText([form.wrap(exact), form.wrap(exact)], -2),
          uncertain: false,
        },
        {
          name: 'normalized',
          value: rangeArrayText([form.wrap(exact), form.wrap(equal), null], -2),
          uncertain: false,
        },
        {
          name: 'escaped',
          value: rangeArrayText([form.wrap(exact), form.wrap('{"aa":1.2300,"\\u00e9":2.00}')], -2),
          uncertain: false,
        },
        {
          name: 'duplicates',
          value: rangeArrayText([form.wrap(exact), form.wrap('{"aa":0,"aa":1.2300,"é":2.00}')], -2),
          uncertain: false,
        },
        {
          name: 'nested',
          value: rangeArrayText(
            [
              form.wrap('{"aa":[{"雪":2.00,"a":1.2300}],"é":true}'),
              form.wrap('{"é":true,"aa":[{"a":1.2300,"雪":2.00}]}'),
            ],
            -2,
          ),
          uncertain: false,
        },
        {
          name: 'wide',
          value: rangeArrayText(
            [
              form.wrap('{"aa":123456789012345678901234567890.00100,"é":"😀"}'),
              form.wrap('{"é":"\\ud83d\\ude00","aa":123456789012345678901234567890.00100}'),
            ],
            -2,
          ),
          uncertain: false,
        },
        {
          name: 'unequal_representation',
          value: rangeArrayText([form.wrap(exact), form.wrap(different)], -2),
          uncertain: true,
        },
        { name: 'bad', value: 'bad', uncertain: false },
      ]
      for (const sample of samples)
        for (const descending of [false, true])
          for (const nulls_first of [false, true]) {
            let value: string | null = null
            try {
              value = (
                await pg.query<{ value: string | null }>(
                  `SELECT (${form.output}) value FROM(SELECT $1::text payload,$2::bool descending,$3::bool nulls_first)q`,
                  [sample.value, descending, nulls_first],
                )
              ).rows[0]!.value
            } catch (error) {
              expect(error).toHaveProperty('code')
            }
            for (const wrong of [false, true])
              for (const bypass of [false, true]) {
                const expected = wrong ? '!different!' : value,
                  row: Row = {
                    payload: known(sample.value),
                    descending: known(descending),
                    nulls_first: known(nulls_first),
                    expected: known(expected),
                    bypass: known(bypass),
                  }
                let native: Outcome = { kind: 'True' }
                try {
                  await pg.query(
                    `INSERT INTO ${form.table}(payload,descending,nulls_first,expected,bypass) VALUES($1,$2,$3,$4,$5)`,
                    [sample.value, descending, nulls_first, expected, bypass],
                  )
                } catch (error) {
                  if (!error || typeof error !== 'object' || !('code' in error)) throw error
                  native =
                    error.code === '23514'
                      ? { kind: 'False' }
                      : { kind: 'Error', value: { state: parseInt(String(error.code), 36) } }
                }
                inserts++
                const uncertain = !bypass && sample.uncertain && form.name !== 'count'
                if (uncertain) ambiguous++
                const result: Outcome = uncertain ? { kind: 'Unknown' } : native
                references.push({
                  family: form.name,
                  type: form.type,
                  sample: sample.name,
                  descending,
                  nulls_first,
                  wrong,
                  bypass,
                  native,
                  result,
                })
                for (const origin of ['source', 'stored'])
                  fixtures.push({ name: form.table + '_' + origin, row, expected: result })
              }
          }
    }
    expect(ambiguous).toBeGreaterThan(0)
    await mkdir('artifacts/jsonb-sort-ties', { recursive: true })
    await writeFile(
      'artifacts/jsonb-sort-ties/report.json',
      JSON.stringify(
        {
          families: families.length,
          plans: plans.length,
          inserts,
          fixtures: fixtures.length,
          ambiguous,
          references,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      directory,
      'jsonbsortties',
      group,
      plans.map((p) => p.identity.owner + '_' + p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 600_000)
