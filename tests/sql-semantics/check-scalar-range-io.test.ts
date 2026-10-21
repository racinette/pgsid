import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import { customRangeProfiles } from './check-custom-range-fixtures.js'
import {
  scalarRangeBatchStarts,
  scalarRangeBatch,
  rangeHasNonzeroOid,
  scalarRangeText,
} from './check-scalar-range-fixtures.js'
import { readRangeFixture } from './check-range-fixtures.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'
import { rangeArrayText, readRangeArrayFixture } from './check-range-array-fixtures.js'
import { readMultirangeArrayFixture } from './check-multirange-array-fixtures.js'

const cell = (value: string | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

it.each(scalarRangeBatchStarts)(
  'matches scalar range output, wire, hashes and JSON conversion in source/stored CHECKs, batch %s',
  async (start) => {
    const pg = await PGlite.create(),
      directory = await mkdtemp(join(tmpdir(), 'pgsid-scalar-range-io-'))
    try {
      await pg.exec("SET lc_monetary='C';SET IntervalStyle='postgres';SET bytea_output='hex'")
      const backends = scalarRangeBatch(start)
      for (const [index, backend] of backends.entries()) {
        await pg.exec(
          `CREATE TYPE io_span_${index} AS RANGE(subtype=${backend.type},multirange_type_name=io_set_${index})`,
        )
        if (backend.type === 'pg_catalog.cidr')
          await pg.exec(`CREATE DOMAIN io_cidr_bound_${index} AS cidr CHECK(masklen(VALUE)>=8);
            CREATE TYPE io_domain_span_${index} AS RANGE(subtype=io_cidr_bound_${index},multirange_type_name=io_domain_set_${index})`)
        if (backend.kind === 8 || backend.type.startsWith('pg_catalog.reg'))
          await pg.exec(`CREATE DOMAIN io_text_bound_${index} AS ${backend.type} CHECK(${backend.type.startsWith('pg_catalog.reg') ? 'VALUE::oid<>1' : `VALUE IS DISTINCT FROM 'forbidden'::${backend.type}`});
            CREATE TYPE io_domain_span_${index} AS RANGE(subtype=io_text_bound_${index},multirange_type_name=io_domain_set_${index})`)
      }
      const initial = await snapshotCatalog(pg),
        families = customRangeProfiles(initial).flatMap((profile, index) =>
          [false, true].map((multi) => ({
            profile,
            multi,
            index: index * 2 + Number(multi),
            type: multi ? profile.multirange : profile.identity,
            backend: backends.find((b) => b.type === profile.elementType)!,
          })),
        )
      for (const f of families) await pg.exec(`CREATE DOMAIN io_history_${f.index} AS ${f.type}[]`)
      const forms = families.flatMap((f) =>
        Object.entries({
          text: { output: 'v::text', format: 'scalar' },
          width: { output: '(v::varchar(7))::text', format: 'scalar' },
          array_text: { output: 'items::text', format: 'array' },
          send: {
            output: `encode(${f.multi ? 'multirange' : 'range'}_send(v),'hex')`,
            format: 'none',
          },
          hash: { output: `hash_${f.multi ? 'multirange' : 'range'}(v)::text`, format: 'none' },
          extended: {
            output: `hash_${f.multi ? 'multirange' : 'range'}_extended(v,seed)::text`,
            format: 'none',
          },
          array_hash: { output: 'hash_array(items)::text', format: 'none' },
          array_extended: { output: 'hash_array_extended(items,seed)::text', format: 'none' },
          nested_extended: {
            output: `hash_array_extended(ARRAY[items::io_history_${f.index}],seed)::text`,
            format: 'none',
          },
          raw_json: { output: 'to_json(v)::text', format: 'scalar' },
          json: { output: 'to_jsonb(v)::text', format: 'scalar' },
          json_array: { output: 'array_to_json(items,true)::text', format: 'array' },
          variadic: { output: 'jsonb_build_array(VARIADIC items)::text', format: 'array' },
          key: { output: 'jsonb_build_object(v,1)::text', format: 'scalar' },
          nested_json: {
            output: `to_jsonb(ARRAY[items::io_history_${f.index}] )::text`,
            format: 'array',
          },
          early_key: { output: "jsonb_build_object(NULL,1,'later',v)::text", format: 'none' },
          late_key: { output: "jsonb_build_object('first',v,NULL,1)::text", format: 'scalar' },
        }).map(([name, form]) => ({
          ...f,
          ...form,
          name,
          table: `scalar_io_${f.index}_${name}`,
          sql: `CASE WHEN bypass THEN true ELSE (${form.output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END`,
        })),
      )
      for (const f of forms)
        await pg.exec(
          `CREATE TABLE ${f.table}(v ${f.type},items ${f.type}[],seed bigint,expected text,bypass bool,CONSTRAINT matches CHECK(${f.sql}))`,
        )
      const catalog = await snapshotCatalog(pg),
        plans = forms.flatMap((f) => {
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
                  ? { ...table.constraints[0]!, definition: `CHECK(${f.sql})` }
                  : table.constraints[0]!,
                catalog.enums,
                catalog.domains,
                origin,
                catalog.rangeTypes,
              )!.expression,
            ),
          }))
        }),
        group = prepareCheckRustGroup(plans, {
          defaultCollation: 'C',
          serverEncoding: 'UTF8',
          nativeByteOrder: 'little',
        })
      for (const [index, check] of group.checks.entries())
        expect(
          check.kind,
          plans[index]!.identity.owner + JSON.stringify(check).slice(0, 1600),
        ).toBe('supported')
      const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
        references: unknown[] = []
      for (const family of families) {
        const [a, , c] = family.backend.values,
          finite =
            family.backend.kind === 31
              ? scalarRangeText('-1234.56', '2000.01')
              : scalarRangeText(a, c)
        const samples: (string | null)[] = [null, 'empty', '(,)', finite]
        if ([19, 20].includes(family.backend.kind))
          samples.push(
            scalarRangeText('0.1', '0.3'),
            scalarRangeText('NaN', 'NaN'),
            scalarRangeText('-Infinity', 'Infinity'),
          )
        for (const sample of samples) {
          const text =
              family.multi && sample !== null
                ? sample === 'empty'
                  ? '{}'
                  : `{${sample}}`
                : sample,
            array = text === null ? null : rangeArrayText([text, null, text], -2),
            value = family.multi
              ? await readMultirangeFixture(pg, family.profile.multirangeType, text)
              : await readRangeFixture(
                  pg,
                  `SELECT $1::${family.type} span`,
                  'span',
                  family.profile.rangeType,
                  [text],
                ),
            items = family.multi
              ? await readMultirangeArrayFixture(pg, family.profile.multirangeType, array)
              : await readRangeArrayFixture(pg, family.profile.rangeType, array)
          for (const form of forms.filter((f) => f.index === family.index))
            for (const seed of form.name.includes('extended') ? [0n, -1n, null] : [0n]) {
              let output: string | null = null,
                failure: string | undefined
              try {
                output = (
                  await pg.query<{ value: string | null }>(
                    `SELECT (${form.output}) value FROM(SELECT $1::${family.type} v,$2::${family.type}[] items,$3::int8 seed)q`,
                    [text, array, seed],
                  )
                ).rows[0]!.value
              } catch (error) {
                failure = (error as { code: string }).code
              }
              for (const bypass of [false, true])
                for (const wrong of [false, true]) {
                  const expected = wrong ? '!different!' : output
                  let native: Outcome
                  try {
                    const row = (
                      await pg.query<{ value: boolean | null }>(
                        `INSERT INTO ${form.table}(v,items,seed,expected,bypass) VALUES($1,$2,$3,$4,$5) RETURNING (${form.sql}) value`,
                        [text, array, seed, expected, bypass],
                      )
                    ).rows[0]!
                    native = { kind: row.value === null ? 'Null' : row.value ? 'True' : 'False' }
                  } catch (error) {
                    const e = error as { code: string; constraint?: string }
                    native =
                      e.code === '23514' && e.constraint === 'matches'
                        ? { kind: 'False' }
                        : { kind: 'Error', value: { state: parseInt(e.code, 36) } }
                  }
                  const contextual =
                      sample !== null &&
                      !['empty', '(,)'].includes(sample) &&
                      ([15, 23, 31].includes(family.backend.kind) ||
                        (family.backend.type.startsWith('pg_catalog.reg') &&
                          rangeHasNonzeroOid(value)) ||
                        sample === scalarRangeText('0.1', '0.3')),
                    deferred =
                      !bypass &&
                      ((form.format !== 'none' &&
                        contextual &&
                        (!failure || form.name === 'late_key')) ||
                        (((family.backend.kind === 32 && sample === finite) ||
                          ([19, 20].includes(family.backend.kind) &&
                            sample === scalarRangeText('NaN', 'NaN'))) &&
                          [
                            'hash',
                            'extended',
                            'array_hash',
                            'array_extended',
                            'nested_extended',
                          ].includes(form.name) &&
                          (!form.name.includes('extended') || seed !== null))),
                    result: Outcome = deferred ? { kind: 'Unknown' } : native
                  references.push({
                    type: family.type,
                    form: form.name,
                    sample,
                    seed,
                    expected,
                    bypass,
                    native,
                    result,
                  })
                  for (const origin of ['source', 'stored'])
                    fixtures.push({
                      name: form.table + '_' + origin,
                      row: {
                        v: value === null ? { kind: 'Null' } : { kind: 'Value', value },
                        items: items === null ? { kind: 'Null' } : { kind: 'Value', value: items },
                        seed: cell(seed),
                        expected: cell(expected),
                        bypass: cell(bypass),
                      },
                      expected: result,
                    })
                }
            }
        }
        for (const form of forms.filter((f) => f.index === family.index))
          for (const input of [
            { kind: 'Unknown' },
            { kind: 'Error', value: { state: parseInt('22012', 36) } },
          ] as Input[])
            for (const bypass of [false, true])
              for (const origin of ['source', 'stored']) {
                const expected: Outcome = bypass
                  ? { kind: 'True' }
                  : input.kind === 'Error'
                    ? input
                    : form.name === 'early_key'
                      ? { kind: 'Error', value: { state: parseInt('22023', 36) } }
                      : form.name === 'nested_extended' &&
                          family.profile.subtypeHashExtended === null
                        ? { kind: 'Error', value: { state: parseInt('42883', 36) } }
                        : { kind: 'Unknown' }
                fixtures.push({
                  name: form.table + '_' + origin,
                  row: {
                    v: input,
                    items: input,
                    seed: cell(0n),
                    expected: cell(null),
                    bypass: cell(bypass),
                  },
                  expected,
                })
              }
      }
      await mkdir('artifacts/scalar-range-io', { recursive: true })
      await writeFile(
        `artifacts/scalar-range-io/batch-${start}.json`,
        JSON.stringify(
          {
            profiles: families.length / 2,
            plans: plans.length,
            inserts: references.length,
            fixtures: fixtures.length,
            references,
          },
          (_k, v) => (typeof v === 'bigint' ? v.toString() : v),
          2,
        ) + '\n',
      )
      await runCheckParity(
        directory,
        'scalarrangeio' + start,
        group,
        plans.map((p) => p.identity.owner + '_' + p.identity.constraint),
        fixtures,
      )
    } finally {
      await pg.close()
      await rm(directory, { recursive: true, force: true })
    }
  },
  600_000,
)
