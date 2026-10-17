import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (state: string): Outcome => ({
  kind: 'Error',
  value: { state: parseInt(state, 36) },
})

it('binds concrete array parameters and scalar implicit casts identically in source and PostgreSQL stored CHECKs', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-call-coercion-'))
  try {
    await pg.exec(
      'SET extra_float_digits=3;CREATE TABLE array_call_values(payload text,reading text,quantity integer,bypass boolean,expected text);CREATE TABLE array_call_oracle(LIKE array_call_values)',
    )
    const outputs: Record<
      string,
      { sql: string; type: string; family: 'triple' | 'sextuple' | 'integer' | 'json' }
    > = {}
    const elementTypes = ['int2', 'int4', 'int8', 'real', 'numeric', 'float8']
    for (const element of elementTypes) {
      for (const scalar of ['int2', 'int4', 'int8', 'numeric', 'real', 'float8']) {
        const scalarInput = ['int2', 'int4', 'int8'].includes(scalar) ? 'quantity' : 'reading'
        if (scalar !== 'float8')
          outputs[`single_${element}_${scalar}`] = {
            sql: `float4_accum(payload::${element}[],${scalarInput}::${scalar})`,
            type: 'float8[]',
            family: 'triple',
          }
        outputs[`double_${element}_${scalar}`] = {
          sql: `float8_accum(payload::${element}[],${scalarInput}::${scalar})`,
          type: 'float8[]',
          family: 'triple',
        }
      }
      outputs[`quantity_${element}`] = {
        sql: `float8_accum(payload::${element}[],quantity)`,
        type: 'float8[]',
        family: 'triple',
      }
      outputs[`regression_${element}`] = {
        sql: `float8_regr_accum(payload::${element}[],quantity,reading::real)`,
        type: 'float8[]',
        family: 'sextuple',
      }
      outputs[`merge_${element}`] = {
        sql: `float8_combine(payload::${element}[],ARRAY[2,4,8]::real[])`,
        type: 'float8[]',
        family: 'triple',
      }
      outputs[`regression_merge_${element}`] = {
        sql: `float8_regr_combine(payload::${element}[],ARRAY[2,4,8,6,18,12]::real[])`,
        type: 'float8[]',
        family: 'sextuple',
      }
    }
    for (const element of ['int2', 'int4', 'int8']) {
      outputs[`integer_${element}`] = {
        sql: `int4_avg_accum(payload::${element}[],quantity::smallint)`,
        type: 'bigint[]',
        family: 'integer',
      }
      outputs[`average_${element}`] = {
        sql: `int8_avg(payload::${element}[])`,
        type: 'numeric',
        family: 'integer',
      }
    }
    for (const element of ['varchar', 'char', 'name']) {
      outputs[`json_${element}`] = {
        sql: `jsonb_set(reading::jsonb,payload::${element}[],to_jsonb(quantity),true)`,
        type: 'jsonb',
        family: 'json',
      }
    }
    const forms: Record<string, string> = Object.fromEntries(
      Object.entries(outputs).map(([name, { sql, type }]) => [
        name,
        `${sql} IS NOT DISTINCT FROM expected::${type}`,
      ]),
    )
    const guarded = 'float8_accum(payload::numeric[],quantity)'
    Object.assign(forms, {
      lazy: `CASE WHEN bypass THEN true ELSE ${guarded} IS NOT DISTINCT FROM expected::float8[] END`,
      wrapped: `cardinality(ARRAY[${guarded}])=CASE WHEN expected IS NULL THEN 0 ELSE cardinality(expected::float8[]) END`,
      prepared:
        "CASE WHEN bypass THEN true ELSE float8_accum('{1e9999}'::numeric[],NULL::integer) IS NULL END",
      pruned:
        "CASE WHEN true THEN true ELSE float8_accum('{1e9999}'::numeric[],NULL::integer) IS NULL END",
      null_scalar: 'float8_accum(payload::numeric[],NULL) IS NULL',
    })
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(
        `ALTER TABLE array_call_values ADD CONSTRAINT "${name}" CHECK(${sql}) NOT VALID`,
      )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'array_call_values')!
    const plans = Object.entries(forms).flatMap(([name, sql]) =>
      (['source', 'stored'] as const).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: name + '_' + origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'source'
              ? { name, type: 'check', definition: `CHECK(${sql})` }
              : table.constraints.find((c) => c.name === name)!,
            catalog.enums,
            catalog.domains,
            origin,
          )!.expression,
        ),
      })),
    )
    expect(
      plans.filter((p) => hasUncertain(p.expression)).map((p) => p.identity.constraint),
    ).toEqual([])
    const group = prepareCheckRustGroup(plans, {
      arrayNulls: true,
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
    })
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    let identifierInputDeferrals = 0
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations: unknown[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const origin of ['source', 'stored'])
        fixtures.push({ name: name + '_' + origin, row, expected })
    }
    for (const [name, form] of Object.entries(forms)) {
      const output = outputs[name],
        family = output?.family ?? 'triple'
      let payloads: (string | null)[] =
        family === 'integer'
          ? ['{0,0}', '{2,9}', '[-3:-2]={2,9}', '{1}', 'bad', null]
          : family === 'json'
            ? ['{a}', '{new}', '{}', 'bad', null]
            : [
                family === 'sextuple' ? '{0,0,0,0,0,0}' : '{0,0,0}',
                family === 'sextuple' ? '{2,4,8,6,18,12}' : '{2,4,8}',
                family === 'sextuple' ? '[-3:2]={2,4,8,6,18,12}' : '[-3:-1]={2,4,8}',
                '{}',
                '{NULL,0,0}',
                '{1e100,0,0}',
                'bad',
                null,
              ]
      if (name === 'prepared' || name === 'pruned') payloads = ['bad']
      const expression = output?.sql ?? guarded
      const readings =
        family === 'json'
          ? ['{"a":1}', null]
          : expression.includes('reading')
            ? ['3', '0.1', 'Infinity', 'bad', null]
            : ['3']
      const quantities =
        ['prepared', 'pruned', 'null_scalar'].includes(name) ||
        family === 'json' ||
        !expression.includes('quantity')
          ? [2]
          : expression.includes('reading')
            ? [2, null]
            : [-32769, 0, 2, 32768, null]
      for (const payload of payloads)
        for (const reading of readings)
          for (const quantity of quantities)
            for (const bypass of name === 'lazy' ? [false, true] : [false]) {
              let text: string | null = null
              try {
                text = (
                  await pg.query<{ value: string | null }>(
                    `SELECT (${expression})::text value FROM (SELECT $1::text payload,$2::text reading,$3::integer quantity) q`,
                    [payload, reading, quantity],
                  )
                ).rows[0]!.value
              } catch {}
              await pg.exec('TRUNCATE array_call_oracle')
              await pg.query('INSERT INTO array_call_oracle VALUES($1,$2,$3,$4,$5)', [
                payload,
                reading,
                quantity,
                bypass,
                text,
              ])
              let expected: Outcome
              try {
                const value = (
                  await pg.query<{ value: boolean | null }>(
                    `SELECT ${form} value FROM array_call_oracle`,
                  )
                ).rows[0]!.value
                expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
              } catch (error) {
                expected = failure((error as { code: string }).code)
              }
              const postgres = expected
              if (
                name === 'json_name' &&
                ['{a}', '{new}'].includes(payload ?? '') &&
                reading !== null
              ) {
                expected = { kind: 'Unknown' }
                identifierInputDeferrals++
              }
              const row = {
                payload: known(payload),
                reading: known(reading),
                quantity: known(quantity),
                bypass: known(bypass),
                expected: known(text),
              }
              add(name, row, expected)
              observations.push({
                name,
                payload,
                reading,
                quantity,
                bypass,
                text,
                postgres,
                expected,
              })
            }
    }
    for (const name of ['quantity_numeric', 'wrapped']) {
      add(
        name,
        { payload: { kind: 'Unknown' }, quantity: { kind: 'Null' }, expected: { kind: 'Null' } },
        { kind: 'Unknown' },
      )
      add(
        name,
        { payload: known('{0,0,0}'), quantity: { kind: 'Unknown' }, expected: known('{1,2,0}') },
        { kind: 'Unknown' },
      )
      add(
        name,
        { payload: { kind: 'Null' }, quantity: { kind: 'Unknown' }, expected: { kind: 'Null' } },
        { kind: 'True' },
      )
      add(
        name,
        {
          payload: { kind: 'Error', value: { state: parseInt('22012', 36) } },
          quantity: { kind: 'Null' },
          expected: { kind: 'Null' },
        },
        failure('22012'),
      )
    }
    for (const [sql, code] of [
      ['float4_accum(payload::integer[],reading::float8)', '42883'],
      ['float8_accum(payload::text[],quantity)', '42883'],
      ['int4_avg_accum(payload::integer[],quantity::bigint)', '42883'],
      ['int2_avg_accum(payload::integer[],quantity)', '42883'],
    ]) {
      await expect(pg.query(`SELECT ${sql} FROM array_call_oracle`)).rejects.toMatchObject({ code })
      expect(
        hasUncertain(
          lowerTableCheck(
            table,
            { name: 'rejected', type: 'check', definition: `CHECK(${sql} IS NULL)` },
            catalog.enums,
            catalog.domains,
            'source',
          )!.expression,
        ),
        sql,
      ).toBe(true)
    }
    expect(
      builtinCallables().filter(
        (fn) =>
          fn.kind === 'function' &&
          [
            'float4_accum',
            'float8_accum',
            'float8_regr_accum',
            'float8_combine',
            'float8_regr_combine',
          ].includes(fn.name),
      ),
    ).toHaveLength(5)
    await mkdir('artifacts/goal-checks/array-call-coercion', { recursive: true })
    await writeFile(
      'artifacts/goal-checks/array-call-coercion/observations.json',
      JSON.stringify(observations, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arraycallcoercion',
      group,
      Object.keys(forms).flatMap((name) =>
        ['source', 'stored'].map((origin) => name + '_' + origin),
      ),
      fixtures,
    )
    await writeFile(
      'artifacts/goal-checks/array-call-coercion/measurements.json',
      JSON.stringify(
        {
          forms: Object.keys(forms).length,
          fixtures: fixtures.length,
          postgresObservations: observations.length,
          identifierInputDeferrals,
          rejectedImplicitNarrowingForms: 4,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)
