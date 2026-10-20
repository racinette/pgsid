import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { PG18_RANGE_TYPES } from '../../src/postgres/builtins/type-ranges.generated.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'
const value = (v: string | boolean | null): Input =>
  v === null ? { kind: 'Null' } : { kind: 'Value', value: v }

it('binds multirange character input, checked domains and lazy selection in source and stored CHECKs', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-multirange-input-'))
  try {
    await pg.exec("SET DateStyle='ISO,YMD';SET TimeZone='UTC'")
    const forms = Object.values(PG18_RANGE_TYPES).flatMap((m, family) =>
      [
        { name: 'cast', expr: `payload::${m.multirange}` },
        { name: 'function', expr: `${m.multirange}(payload)` },
        { name: 'domain', expr: `payload::multi_input_nested_${family}` },
        { name: 'checked', expr: `payload::multi_input_checked_${family}` },
        { name: 'varchar', expr: `(payload::varchar)::${m.multirange}` },
        { name: 'bpchar', expr: `(payload::bpchar)::${m.multirange}` },
        { name: 'name', expr: `payload::${m.multirange}` },
        { name: 'coalesce', expr: `COALESCE(payload::${m.multirange},'{}'::${m.multirange})` },
      ].map((f, i) => ({
        ...f,
        m,
        family,
        table: `multi_input_${family}_${i}`,
        inputType: f.name === 'name' ? 'pg_catalog.name' : 'pg_catalog.text',
        sql: `CASE WHEN bypass THEN true ELSE (${f.expr}) IS NOT DISTINCT FROM expected${m.subtype === 'pg_catalog."numeric"' ? ` AND scale(lower(${f.expr})) IS NOT DISTINCT FROM scale(lower(expected)) AND scale(upper(${f.expr})) IS NOT DISTINCT FROM scale(upper(expected))` : ''} END`,
      })),
    )
    for (const [i, m] of Object.values(PG18_RANGE_TYPES).entries())
      await pg.exec(
        `CREATE DOMAIN multi_input_plain_${i} AS ${m.multirange};CREATE DOMAIN multi_input_nested_${i} AS multi_input_plain_${i};CREATE DOMAIN multi_input_checked_${i} AS multi_input_nested_${i} NOT NULL CHECK(isempty(VALUE) OR lower(VALUE) IS NOT NULL)`,
      )
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE ${f.table}(payload ${f.inputType},expected ${f.m.multirange},bypass boolean,CHECK(${f.sql}))`,
      )
    const catalog = await snapshotCatalog(pg),
      plans = forms.flatMap((f) => {
        const table = catalog.tables.find((t) => t.name === f.table)!
        return ['source', 'stored'].map((mode) => {
          const plan = lowerTableCheck(
            table,
            mode === 'source'
              ? { name: 'input', type: 'check', definition: `CHECK(${f.sql})` }
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
    let inserts = 0
    const errors = new Set<string>(),
      cache = new Map<string, ReturnType<typeof readMultirangeFixture>>()
    const load = (type: string, text: string | null) => {
      const key = JSON.stringify([type, text])
      let p = cache.get(key)
      if (!p) {
        p = readMultirangeFixture(pg, type, text)
        cache.set(key, p)
      }
      return p
    }
    for (const f of forms) {
      const temporal = [
          'pg_catalog.date',
          'pg_catalog."timestamp"',
          'pg_catalog.timestamptz',
        ].includes(f.m.subtype),
        offset = f.m.subtype === 'pg_catalog.timestamptz' ? ' 00:00+00' : ''
      const [a, b, c, d] = temporal
        ? ['2000-01-01', '2000-01-03', '2000-01-05', '2000-01-07'].map((s) => s + offset)
        : f.m.subtype === 'pg_catalog.int8'
          ? ['9007199254740993', '9007199254740995', '9007199254740997', '9007199254740999']
          : f.m.subtype === 'pg_catalog."numeric"'
            ? ['1.00', '3.000', '5.0000', '7.0']
            : ['1', '3', '5', '7']
      const texts: (string | null)[] = [
        null,
        '{}',
        '{empty}',
        '{(,)}',
        `{[${a},${b}),[${c},${d})}`,
        `{[${c},${d}),[${a},${b}),[${b},${c})}`,
        `{["${a}","${b}")}`,
        '{empty,}',
        '{',
        `{[${b},${a})}`,
        `{[${a},${b})junk}`,
      ]
      if (f.m.subtype === 'pg_catalog.int4') texts.push('{[2147483648,3)junk}', '{(2147483647,)}')
      if (f.m.subtype === 'pg_catalog.int8') texts.push('{[9223372036854775808,3)junk}')
      if (f.m.subtype === 'pg_catalog."numeric"')
        texts.push('{[1.00000,3.000),[1.0,3.0),[5.000,7.00]}', '{[NaN,NaN]}')
      for (const text of texts) {
        const normalized = (
          await pg.query<{ value: string | null }>(`SELECT $1::${f.inputType}::text value`, [text])
        ).rows[0]!.value
        let rendered: string | null = null,
          errorCode: string | null = null
        try {
          rendered = (
            await pg.query<{ value: string | null }>(
              `SELECT (${f.expr})::text value FROM(SELECT $1::${f.inputType} payload)q`,
              [normalized],
            )
          ).rows[0]!.value
        } catch (e) {
          errorCode = (e as { code: string }).code
          errors.add(errorCode)
        }
        for (const mismatch of [false, true])
          for (const bypass of [false, true]) {
            const wanted = errorCode
              ? null
              : mismatch
                ? rendered === '{}'
                  ? '{(,)}'
                  : '{}'
                : rendered
            let expected: Outcome
            try {
              const result = (
                await pg.query<{ result: boolean | null }>(
                  `INSERT INTO ${f.table} VALUES($1,$2,$3) RETURNING (${f.sql}) result`,
                  [normalized, wanted, bypass],
                )
              ).rows[0]!.result
              expected = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
            } catch (e) {
              const code = (e as { code: string }).code
              expected =
                errorCode && !bypass
                  ? { kind: 'Error', value: { state: parseInt(code, 36) } }
                  : { kind: 'False' }
              if (!bypass && errorCode) expect(code).toBe(errorCode)
            }
            const target = await load(f.m.multirange, wanted),
              row: Row = {
                payload: value(normalized),
                expected: target ? { kind: 'Value', value: target } : value(null),
                bypass: value(bypass),
              }
            for (const mode of ['source', 'stored'])
              fixtures.push({ name: f.table + '_' + mode, row, expected })
            inserts++
          }
      }
      for (const payload of [
        { kind: 'Unknown' },
        { kind: 'Error', value: { state: parseInt('22012', 36) } },
      ] as Input[])
        for (const bypass of [false, true])
          for (const mode of ['source', 'stored'])
            fixtures.push({
              name: f.table + '_' + mode,
              row: { payload, expected: value(null), bypass: value(bypass) },
              expected: bypass ? { kind: 'True' } : (payload as Outcome),
            })
    }
    const group = prepareCheckRustGroup(plans)
    expect(group.checks.filter((c) => c.kind !== 'supported')).toEqual([])
    await runCheckParity(
      directory,
      'multirangeinputbinding',
      group,
      forms.flatMap((f) => ['source', 'stored'].map((mode) => f.table + '_' + mode)),
      fixtures,
    )
    expect(errors).toContain('23502')
    expect(errors).toContain('23514')
    expect(errors).toContain('22P02')
    expect(errors).toContain('22003')
    await mkdir('artifacts/check-multirange-input', { recursive: true })
    await writeFile(
      'artifacts/check-multirange-input/binding-report.json',
      JSON.stringify(
        {
          inserts,
          fixtures: fixtures.length,
          plans: plans.length,
          forms: forms.length,
          errors: [...errors].sort(),
          rawStored: true,
          lazySelection: true,
          checkedDomains: true,
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
