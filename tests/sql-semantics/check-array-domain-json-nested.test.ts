import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
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
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const known = (value: string | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (code: string): Outcome => ({ kind: 'Error', value: { state: parseInt(code, 36) } })
const context = { arrayNulls: true, defaultCollation: 'C', serverEncoding: 'UTF8' } as const

it('converts array-valued domains to JSON and JSONB with recursive shapes, raw sources, pretty layout and builder key rules', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-nested-domain-json-'))
  try {
    await pg.exec(
      'CREATE DOMAIN json_leaf_group AS integer[];CREATE DOMAIN json_batch_group AS json_leaf_group[]',
    )
    const a = 'a::json_batch_group[]'
    const outputs = {
      raw: `to_json(${a})::text`,
      pretty: `array_to_json(${a},pretty)::text`,
      binary: `to_jsonb(${a})::text`,
      raw_array: `json_build_array(${a},NULL,${a})::text`,
      binary_array: `jsonb_build_array(${a},NULL,${a})::text`,
      raw_flat: `json_build_array(VARIADIC ${a})::text`,
      binary_flat: `jsonb_build_array(VARIADIC ${a})::text`,
      raw_object: `json_build_object('payload',${a},'original',a)::text`,
      binary_object: `jsonb_build_object('payload',${a},'original',a)::text`,
      raw_keys: `json_build_object(VARIADIC ${a})::text`,
      binary_keys: `jsonb_build_object(VARIADIC ${a})::text`,
      raw_key_error: `json_build_object(${a},1/divisor)::text`,
      binary_key_error: `jsonb_build_object(${a},1/divisor)::text`,
      stripped: `jsonb_strip_nulls(to_jsonb(${a}),true)::text`,
    }
    const forms = Object.entries(outputs).map(([name, output]) => ({
      name,
      output,
      sql: `CASE WHEN bypass THEN true ELSE (${output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END`,
    }))
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE nested_json_${f.name}(a text,pretty boolean,expected text,bypass boolean,divisor integer,CONSTRAINT converted CHECK(${f.sql}))`,
      )
    const catalog = await snapshotCatalog(pg)
    const plans = forms.flatMap((f) => {
      const table = catalog.tables.find((t) => t.name === 'nested_json_' + f.name)!
      const constraint = table.constraints.find((c) => c.name === 'converted')!
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
            origin === 'source' ? { ...constraint, definition: `CHECK(${f.sql})` } : constraint,
            catalog.enums,
            catalog.domains,
            origin,
          )!.expression,
        ),
      }))
    })
    const groups = []
    for (let offset = 0; offset < plans.length; offset += 8) {
      const selected = plans.slice(offset, offset + 8),
        group = prepareCheckRustGroup(selected, context)
      for (const [index, check] of group.checks.entries())
        expect(
          check.kind,
          selected[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
        ).toBe('supported')
      groups.push({ offset, group, names: selected.map((p) => p.identity.constraint) })
    }
    const sampleSql = [
      'NULL::json_batch_group[]',
      "'{}'::json_batch_group[]",
      'ARRAY[NULL::json_batch_group]',
      "ARRAY['{}'::json_batch_group]",
      'ARRAY[ARRAY[NULL::json_leaf_group]::json_batch_group]',
      "ARRAY[ARRAY['{}'::json_leaf_group]::json_batch_group]",
      'ARRAY[ARRAY[ARRAY[1,NULL,2]::json_leaf_group]::json_batch_group]',
      'ARRAY[ARRAY[ARRAY[1,2]::json_leaf_group,NULL::json_leaf_group]::json_batch_group,NULL::json_batch_group]',
      'array_fill(ARRAY[ARRAY[1,2]::json_leaf_group]::json_batch_group,ARRAY[2,1],ARRAY[-2,4])',
    ]
    const samples: (string | null)[] = []
    for (const sql of sampleSql)
      samples.push(
        (await pg.query<{ value: string | null }>(`SELECT (${sql})::text AS value`)).rows[0]!.value,
      )
    samples.push('bad')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const references: unknown[] = []
    let inserts = 0
    for (const f of forms)
      for (const a of samples)
        for (const pretty of [false, true, null]) {
          const divisor = f.name.endsWith('key_error') ? 0 : 1
          let output: string | null = null
          try {
            output = (
              await pg.query<{ value: string | null }>(
                `SELECT ${f.output} AS value FROM (SELECT $1::text a,$2::boolean pretty,$3::integer divisor) candidate`,
                [a, pretty, divisor],
              )
            ).rows[0]!.value
          } catch {}
          for (const bypass of [false, true])
            for (const mismatch of [false, true]) {
              const expectedText = mismatch ? 'wrong' : output
              let expected: Outcome
              try {
                const value = (
                  await pg.query<{ value: boolean | null }>(
                    `WITH candidate AS MATERIALIZED(SELECT $1::text a,$2::boolean pretty,$3::text expected,$4::boolean bypass,$5::integer divisor) SELECT ${f.sql} AS value FROM candidate`,
                    [a, pretty, expectedText, bypass, divisor],
                  )
                ).rows[0]!.value
                expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
              } catch (cause) {
                expected = error((cause as { code: string }).code)
              }
              const insert = pg.query(`INSERT INTO nested_json_${f.name} VALUES($1,$2,$3,$4,$5)`, [
                a,
                pretty,
                expectedText,
                bypass,
                divisor,
              ])
              if (expected.kind === 'False' || expected.kind === 'Error')
                await expect(insert).rejects.toMatchObject({
                  code:
                    'value' in expected
                      ? expected.value.state.toString(36).toUpperCase().padStart(5, '0')
                      : '23514',
                })
              else await insert
              inserts++
              const row = {
                a: known(a),
                pretty: known(pretty),
                expected: known(expectedText),
                bypass: known(bypass),
                divisor: known(divisor),
              }
              references.push({
                name: f.name,
                a,
                pretty,
                output,
                bypass,
                mismatch,
                divisor,
                expected,
              })
              for (const origin of ['source', 'stored'])
                fixtures.push({ name: f.name + '_' + origin, row, expected })
            }
        }
    await mkdir('artifacts/nested-domain-array-json', { recursive: true })
    await writeFile(
      'artifacts/nested-domain-array-json/shapes.json',
      JSON.stringify({ inserts, fixtures: fixtures.length, references }, null, 2) + '\n',
    )
    for (const { offset, group, names } of groups) {
      const batch = join(directory, 'batch-' + offset)
      await mkdir(batch)
      await runCheckParity(
        batch,
        'nestedjson' + offset,
        group,
        names,
        fixtures.filter((f) => names.includes(f.name)),
      )
    }
    expect(inserts).toBe(forms.length * samples.length * 3 * 4)
    expect(fixtures).toHaveLength(inserts * 2)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240000)

it('retains scalar-domain types, enum labels, JSON source spans and JSONB normalization through recursive array conversion', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-nested-json-profiles-'))
  try {
    await pg.exec(
      "CREATE TYPE conversion_stage AS ENUM ('new','done');CREATE DOMAIN conversion_amount AS numeric(4,1) CHECK(VALUE>0)",
    )
    const profiles = [
      ['numeric', "'1.2300'", "'NaN'"],
      ['text', "'雪😊'", String.raw`E'line\nquote"'`],
      ['conversion_stage', "'new'", "'done'"],
      ['json', `' { "a":1,"a":2 } '`, String.raw`'"\u0000"'`],
      ['jsonb', `'{"é":1,"aa":2}'`, "'[1,null]'"],
      ['conversion_amount', "'1.24'", "'-1'"],
    ] as const
    const forms: { name: string; output: string; sql: string; profile: number }[] = []
    for (const [index, [type]] of profiles.entries()) {
      await pg.exec(
        `CREATE DOMAIN conversion_leaf_${index} AS ${type}[];CREATE DOMAIN conversion_batch_${index} AS conversion_leaf_${index}[]`,
      )
      const target = index >= 3 ? `conversion_batch_${index}[]` : `conversion_leaf_${index}[]`
      const a = `a::${target}`
      const outputs = {
        raw: `to_json(${a})::text`,
        pretty: `array_to_json(${a},true)::text`,
        binary: `to_jsonb(${a})::text`,
        raw_array: `json_build_array('before',${a},a)::text`,
        binary_array: `jsonb_build_array('before',${a},a)::text`,
        raw_flat: `json_build_array(VARIADIC ${a})::text`,
        binary_flat: `jsonb_build_array(VARIADIC ${a})::text`,
      }
      for (const [operation, output] of Object.entries(outputs)) {
        const name = `profile_${index}_${operation}`,
          sql = `CASE WHEN bypass THEN true ELSE (${output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END`
        forms.push({ name, output, sql, profile: index })
        await pg.exec(
          `CREATE TABLE ${name}(a text,expected text,bypass boolean,CONSTRAINT converted CHECK(${sql}))`,
        )
      }
    }
    const catalog = await snapshotCatalog(pg)
    const plans = forms.flatMap((f) => {
      const table = catalog.tables.find((t) => t.name === f.name)!,
        constraint = table.constraints.find((c) => c.name === 'converted')!
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
            origin === 'source' ? { ...constraint, definition: `CHECK(${f.sql})` } : constraint,
            catalog.enums,
            catalog.domains,
            origin,
          )!.expression,
        ),
      }))
    })
    const groups = []
    for (let offset = 0; offset < plans.length; offset += 12) {
      const selected = plans.slice(offset, offset + 12),
        group = prepareCheckRustGroup(selected, context)
      for (const [index, check] of group.checks.entries())
        expect(
          check.kind,
          selected[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
        ).toBe('supported')
      groups.push({ offset, group, names: selected.map((p) => p.identity.constraint) })
    }
    const samplesByProfile: (string | null)[][] = []
    for (const [index, [type, first, last]] of profiles.entries()) {
      const leaf = `conversion_leaf_${index}`,
        domain = index >= 3 ? `conversion_batch_${index}` : leaf
      const element = (literal: string) =>
        index >= 3
          ? `ARRAY[ARRAY[${literal}::${type},NULL]::${leaf},NULL::${leaf}]::${domain}`
          : `ARRAY[${literal}::${type},NULL]::${domain}`
      const expressions = [
        `NULL::${domain}[]`,
        `'{}'::${domain}[]`,
        `ARRAY[NULL::${domain}]`,
        `ARRAY['{}'::${domain}]`,
        `ARRAY[${element(first)}]`,
        `array_fill(${element(first)},ARRAY[2,1],ARRAY[-2,4])`,
      ]
      const samples: (string | null)[] = []
      for (const sql of expressions)
        samples.push(
          (await pg.query<{ value: string | null }>(`SELECT (${sql})::text AS value`)).rows[0]!
            .value,
        )
      if (type === 'conversion_amount') samples.push(String.raw`{"{\"{-1}\"}"}`)
      else
        samples.push(
          (
            await pg.query<{ value: string | null }>(
              `SELECT (ARRAY[${element(last)}])::text AS value`,
            )
          ).rows[0]!.value,
        )
      samples.push('bad')
      samplesByProfile.push(samples)
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    let inserts = 0
    for (const f of forms)
      for (const [sample, a] of samplesByProfile[f.profile]!.entries()) {
        let output: string | null = null
        try {
          output = (
            await pg.query<{ value: string | null }>(
              `SELECT ${f.output} AS value FROM (SELECT $1::text a) candidate`,
              [a],
            )
          ).rows[0]!.value
        } catch {}
        for (const bypass of [false, true]) {
          let expected: Outcome
          try {
            const value = (
              await pg.query<{ value: boolean | null }>(
                `WITH candidate AS MATERIALIZED(SELECT $1::text a,$2::text expected,$3::boolean bypass)SELECT ${f.sql} AS value FROM candidate`,
                [a, output, bypass],
              )
            ).rows[0]!.value
            expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
          } catch (cause) {
            expected = error((cause as { code: string }).code)
          }
          const insert = pg.query(`INSERT INTO ${f.name} VALUES($1,$2,$3)`, [a, output, bypass])
          if (expected.kind === 'False' || expected.kind === 'Error')
            await expect(insert).rejects.toMatchObject({
              code:
                'value' in expected
                  ? expected.value.state.toString(36).toUpperCase().padStart(5, '0')
                  : '23514',
            })
          else await insert
          inserts++
          const row = { a: known(a), expected: known(output), bypass: known(bypass) }
          for (const origin of ['source', 'stored'])
            fixtures.push({ name: f.name + '_' + origin, row, expected })
          references.push({ name: f.name, sample, a, output, bypass, expected })
          if (sample === 4 && !bypass && expected.kind === 'True') {
            await expect(
              pg.query(`INSERT INTO ${f.name} VALUES($1,'wrong',false)`, [a]),
            ).rejects.toMatchObject({ code: '23514' })
            inserts++
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: f.name + '_' + origin,
                row: { ...row, expected: known('wrong') },
                expected: { kind: 'False' },
              })
          }
        }
      }
    await mkdir('artifacts/nested-domain-array-json', { recursive: true })
    await writeFile(
      'artifacts/nested-domain-array-json/profiles.json',
      JSON.stringify({ inserts, fixtures: fixtures.length, references }, null, 2) + '\n',
    )
    for (const { offset, group, names } of groups) {
      const batch = join(directory, 'batch-' + offset)
      await mkdir(batch)
      await runCheckParity(
        batch,
        'nestedjsonprofiles' + offset,
        group,
        names,
        fixtures.filter((f) => names.includes(f.name)),
      )
    }
    expect(inserts).toBe(forms.length * 8 * 2 + forms.length)
    expect(fixtures).toHaveLength(inserts * 2)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300000)

it('uses per-type enum labels in heterogeneous JSON builders across shifted catalogs and defers omitted label metadata', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-json-enum-labels-'))
  const references: unknown[] = [],
    oidSets: string[][] = []
  const fixtures: { name: string; row: Row; expected: Outcome }[] = []
  let firstGroup: ReturnType<typeof prepareCheckRustGroup> | undefined
  let firstNames: string[] = [],
    inserts = 0
  const pairs: readonly (readonly [string | null, string | null])[] = [
    [null, null],
    ['pending', 'ready'],
    ['ready', 'pending'],
    ['pending', 'pending'],
    ['ready', 'ready'],
    [null, 'ready'],
    ['pending', null],
    ['雪"stage', 'pending'],
    ['ready', '雪"stage'],
  ]
  const outputs = {
    scalar_a: 'to_json(a)::text',
    scalar_b: 'to_jsonb(b)::text',
    raw_array: 'json_build_array(a,b,a)::text',
    binary_array: 'jsonb_build_array(a,b,a)::text',
    raw_object: 'json_build_object(a,b)::text',
    binary_object: 'jsonb_build_object(b,a)::text',
    nested: 'jsonb_build_array(ARRAY[ARRAY[a]::first_group],ARRAY[ARRAY[b]::second_group])::text',
    variadic: 'json_build_array(VARIADIC ARRAY[a,a])::text',
  }
  try {
    for (const shifted of [false, true]) {
      const pg = await PGlite.create()
      try {
        if (shifted)
          for (let i = 0; i < 8; i++)
            await pg.exec(`CREATE TYPE oid_padding_${i} AS ENUM ('x','y')`)
        await pg.exec(
          `CREATE TYPE first_stage AS ENUM ('pending','ready','雪"stage');CREATE TYPE second_stage AS ENUM ('ready','pending','雪"stage');CREATE DOMAIN first_group AS first_stage[];CREATE DOMAIN second_group AS second_stage[]`,
        )
        const forms = Object.entries(outputs).map(([name, output]) => ({
          name,
          output,
          sql: `CASE WHEN bypass THEN true ELSE (${output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END`,
        }))
        for (const f of forms)
          await pg.exec(
            `CREATE TABLE enum_json_${f.name}(a first_stage,b second_stage,expected text,bypass boolean,CONSTRAINT converted CHECK(${f.sql}))`,
          )
        const catalog = await snapshotCatalog(pg)
        oidSets.push(
          (
            await pg.query<{ oid: string }>(
              "SELECT e.oid::text AS oid FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname IN ('first_stage','second_stage') ORDER BY t.typname,e.enumsortorder",
            )
          ).rows.map((r) => r.oid),
        )
        const normalPlans = forms.flatMap((f) => {
          const table = catalog.tables.find((t) => t.name === 'enum_json_' + f.name)!,
            constraint = table.constraints.find((c) => c.name === 'converted')!
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
                origin === 'source' ? { ...constraint, definition: `CHECK(${f.sql})` } : constraint,
                catalog.enums,
                catalog.domains,
                origin,
              )!.expression,
            ),
          }))
        })
        const missingPlans = normalPlans
          .filter((p) =>
            [
              'scalar_a_source',
              'scalar_a_stored',
              'raw_array_source',
              'raw_array_stored',
              'binary_array_source',
              'binary_array_stored',
            ].includes(p.identity.constraint),
          )
          .map((p) => ({
            ...p,
            identity: { ...p.identity, constraint: 'missing_' + p.identity.constraint },
            expression: JSON.parse(
              JSON.stringify(p.expression, (key, value: unknown) =>
                key === 'inputEnums' ? undefined : value,
              ),
            ) as typeof p.expression,
          }))
        const plans = [...normalPlans, ...missingPlans],
          group = prepareCheckRustGroup(plans, context)
        for (const [index, check] of group.checks.entries())
          expect(
            check.kind,
            plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
          ).toBe('supported')
        if (firstGroup) {
          expect(group.evaluatorSource).toBe(firstGroup.evaluatorSource)
        } else {
          firstGroup = group
          firstNames = plans.map((p) => p.identity.constraint)
        }
        for (const f of forms)
          for (const [a, b] of pairs) {
            let output: string | null = null
            try {
              output = (
                await pg.query<{ value: string | null }>(
                  `SELECT ${f.output} AS value FROM (SELECT $1::first_stage a,$2::second_stage b) candidate`,
                  [a, b],
                )
              ).rows[0]!.value
            } catch {}
            for (const bypass of [false, true])
              for (const mismatch of [false, true]) {
                const expectedText = mismatch ? 'wrong' : output
                let expected: Outcome
                try {
                  const value = (
                    await pg.query<{ value: boolean | null }>(
                      `WITH candidate AS MATERIALIZED(SELECT $1::first_stage a,$2::second_stage b,$3::text expected,$4::boolean bypass)SELECT ${f.sql} AS value FROM candidate`,
                      [a, b, expectedText, bypass],
                    )
                  ).rows[0]!.value
                  expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
                } catch (cause) {
                  expected = error((cause as { code: string }).code)
                }
                const insert = pg.query(`INSERT INTO enum_json_${f.name} VALUES($1,$2,$3,$4)`, [
                  a,
                  b,
                  expectedText,
                  bypass,
                ])
                if (expected.kind === 'False' || expected.kind === 'Error')
                  await expect(insert).rejects.toMatchObject({
                    code:
                      'value' in expected
                        ? expected.value.state.toString(36).toUpperCase().padStart(5, '0')
                        : '23514',
                  })
                else await insert
                inserts++
                references.push({ shifted, name: f.name, a, b, output, bypass, mismatch, expected })
                if (!shifted) {
                  const row = {
                    a: known(a === null ? null : ['pending', 'ready', '雪"stage'].indexOf(a)),
                    b: known(b === null ? null : ['ready', 'pending', '雪"stage'].indexOf(b)),
                    expected: known(expectedText),
                    bypass: known(bypass),
                  }
                  for (const origin of ['source', 'stored']) {
                    const name = f.name + '_' + origin
                    fixtures.push({ name, row, expected })
                    if (['scalar_a', 'raw_array', 'binary_array'].includes(f.name))
                      fixtures.push({
                        name: 'missing_' + name,
                        row,
                        expected:
                          !bypass && (f.name === 'scalar_a' ? a !== null : a !== null || b !== null)
                            ? { kind: 'Unknown' }
                            : expected,
                      })
                  }
                }
              }
          }
      } finally {
        await pg.close()
      }
    }
    expect(oidSets[0]).not.toEqual(oidSets[1])
    await mkdir('artifacts/nested-domain-array-json', { recursive: true })
    await writeFile(
      'artifacts/nested-domain-array-json/enums.json',
      JSON.stringify({ inserts, fixtures: fixtures.length, oidSets, references }, null, 2) + '\n',
    )
    await runCheckParity(directory, 'jsonenumlabels', firstGroup!, firstNames, fixtures)
    expect(inserts).toBe(Object.keys(outputs).length * pairs.length * 2 * 2 * 2)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 300000)

it('preserves nested JSON conversion errors, skipped keys, float context and partial inputs', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-nested-json-states-'))
  const arrayText = (values: (string | null)[]) =>
    '{' +
    values
      .map((v) =>
        v === null ? 'NULL' : '"' + v.replaceAll('\\', '\\\\').replaceAll('"', '\\"') + '"',
      )
      .join(',') +
    '}'
  try {
    await pg.exec(
      'CREATE DOMAIN state_int_group AS integer[];CREATE DOMAIN state_raw_group AS json[];CREATE DOMAIN state_float_group AS float8[]',
    )
    const outputs = {
      raw_partial: 'to_json(ARRAY[ARRAY[quantity]::state_int_group,NULL::state_int_group])::text',
      binary_partial:
        'to_jsonb(ARRAY[ARRAY[quantity]::state_int_group,NULL::state_int_group])::text',
      value_order: 'jsonb_build_array(a::state_raw_group[],1/divisor)::text',
      key_order: 'jsonb_build_object(a::state_raw_group[],1/divisor)::text',
      variadic_keys: 'jsonb_build_object(VARIADIC a::state_raw_group[])::text',
      raw_variadic_keys: 'json_build_object(VARIADIC a::state_raw_group[])::text',
      float_value: 'to_jsonb(a::state_float_group[])::text',
      float_key: 'jsonb_build_object(a::state_float_group[],1/divisor)::text',
      float_variadic_keys: 'jsonb_build_object(VARIADIC a::state_float_group[])::text',
    }
    const forms = Object.entries(outputs).map(([name, output]) => ({
      name,
      output,
      sql: `CASE WHEN bypass THEN true ELSE (${output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END`,
    }))
    for (const f of forms)
      await pg.exec(
        `CREATE TABLE state_json_${f.name}(a text,quantity integer,divisor integer,expected text,bypass boolean,CONSTRAINT converted CHECK(${f.sql}))`,
      )
    const catalog = await snapshotCatalog(pg),
      plans = forms.flatMap((f) => {
        const table = catalog.tables.find((t) => t.name === 'state_json_' + f.name)!,
          constraint = table.constraints.find((c) => c.name === 'converted')!
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
              origin === 'source' ? { ...constraint, definition: `CHECK(${f.sql})` } : constraint,
              catalog.enums,
              catalog.domains,
              origin,
            )!.expression,
          ),
        }))
      })
    const group = prepareCheckRustGroup(plans, context)
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const origin of ['source', 'stored'])
        fixtures.push({ name: name + '_' + origin, row, expected })
    }
    const badUnicode = arrayText([arrayText([String.raw`"\u0000"`]), arrayText(['1'])])
    const nullKey = arrayText([null, arrayText([String.raw`"\u0000"`])])
    let inserts = 0
    for (const f of forms) {
      const samples = f.name.startsWith('float')
        ? [
            null,
            '{}',
            '{NULL}',
            arrayText(['{}']),
            arrayText(['{1.25}', '{2.5}']),
            arrayText(['{Infinity}']),
            'bad',
          ]
        : [null, '{}', '{NULL}', arrayText(['{}']), badUnicode, nullKey, 'bad']
      for (const [sample, a] of samples.entries())
        for (const quantity of [null, 1])
          for (const divisor of [0, 1])
            for (const bypass of [false, true]) {
              let output: string | null = null
              try {
                output = (
                  await pg.query<{ value: string | null }>(
                    `SELECT ${f.output} AS value FROM (SELECT $1::text a,$2::integer quantity,$3::integer divisor)candidate`,
                    [a, quantity, divisor],
                  )
                ).rows[0]!.value
              } catch {}
              let expected: Outcome
              try {
                const value = (
                  await pg.query<{ value: boolean | null }>(
                    `WITH candidate AS MATERIALIZED(SELECT $1::text a,$2::integer quantity,$3::integer divisor,$4::text expected,$5::boolean bypass)SELECT ${f.sql} AS value FROM candidate`,
                    [a, quantity, divisor, output, bypass],
                  )
                ).rows[0]!.value
                expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
              } catch (cause) {
                expected = error((cause as { code: string }).code)
              }
              const insert = pg.query(`INSERT INTO state_json_${f.name} VALUES($1,$2,$3,$4,$5)`, [
                a,
                quantity,
                divisor,
                output,
                bypass,
              ])
              if (expected.kind === 'False' || expected.kind === 'Error')
                await expect(insert).rejects.toMatchObject({
                  code:
                    'value' in expected
                      ? expected.value.state.toString(36).toUpperCase().padStart(5, '0')
                      : '23514',
                })
              else await insert
              inserts++
              references.push({
                name: f.name,
                sample,
                a,
                quantity,
                divisor,
                bypass,
                output,
                expected,
              })
              const local =
                f.name === 'float_value' && sample === 4 && !bypass && expected.kind === 'True'
                  ? { kind: 'Unknown' as const }
                  : expected
              add(
                f.name,
                {
                  a: known(a),
                  quantity: known(quantity),
                  divisor: known(divisor),
                  expected: known(output),
                  bypass: known(bypass),
                },
                local,
              )
            }
    }
    const base: Row = {
      a: known('{}'),
      quantity: { kind: 'Unknown' },
      divisor: known(1),
      expected: known(''),
      bypass: known(false),
    }
    for (const name of ['raw_partial', 'binary_partial']) {
      add(name, base, { kind: 'Unknown' })
      add(name, { ...base, bypass: known(true) }, { kind: 'True' })
      add(
        name,
        { ...base, quantity: { kind: 'Error', value: { state: parseInt('22003', 36) } } },
        error('22003'),
      )
    }
    for (const name of ['value_order', 'key_order']) {
      add(name, { ...base, a: { kind: 'Unknown' }, divisor: known(0) }, { kind: 'Unknown' })
      add(
        name,
        {
          ...base,
          a: { kind: 'Error', value: { state: parseInt('22003', 36) } },
          divisor: known(0),
        },
        error('22003'),
      )
      add(
        name,
        {
          ...base,
          a: { kind: 'Error', value: { state: parseInt('22003', 36) } },
          divisor: known(0),
          bypass: known(true),
        },
        { kind: 'True' },
      )
    }
    await mkdir('artifacts/nested-domain-array-json', { recursive: true })
    await writeFile(
      'artifacts/nested-domain-array-json/states.json',
      JSON.stringify({ inserts, fixtures: fixtures.length, references }, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'nestedjsonstates',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
    expect(inserts).toBe(forms.length * 7 * 2 * 2 * 2)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180000)

it('propagates declared UTF8 through nested JSONB conversion while raw JSON retains source without encoding assumptions', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-nested-json-encoding-'))
  try {
    const forms: { name: string; output: string; sql: string; type: string; target: string }[] = []
    for (const type of ['json', 'jsonb']) {
      await pg.exec(
        `CREATE DOMAIN encoding_${type}_leaf AS ${type}[];CREATE DOMAIN encoding_${type}_batch AS encoding_${type}_leaf[]`,
      )
      for (const binary of [false, true]) {
        const name = type + '_' + (binary ? 'binary' : 'raw'),
          target = `encoding_${type}_batch[]`,
          output = `${binary ? 'to_jsonb' : 'to_json'}(a::${target})::text`,
          sql = `CASE WHEN bypass THEN true ELSE (${output}) COLLATE "C" IS NOT DISTINCT FROM expected COLLATE "C" END`
        forms.push({ name, output, sql, type, target })
        await pg.exec(
          `CREATE TABLE encoding_${name}(a text,expected text,bypass boolean,CONSTRAINT converted CHECK(${sql}))`,
        )
      }
    }
    const catalog = await snapshotCatalog(pg)
    const groups = ['utf8', 'missing'].map((mode) => {
      const plans = forms.flatMap((f) => {
        const table = catalog.tables.find((t) => t.name === 'encoding_' + f.name)!,
          constraint = table.constraints.find((c) => c.name === 'converted')!
        return (['source', 'stored'] as const).map((origin) => ({
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: mode + '_' + f.name + '_' + origin,
          },
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
      const group = prepareCheckRustGroup(
        plans,
        mode === 'utf8' ? context : { arrayNulls: true, defaultCollation: 'C' },
      )
      for (const [index, check] of group.checks.entries())
        expect(
          check.kind,
          plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
        ).toBe('supported')
      return { group, names: plans.map((p) => p.identity.constraint) }
    })
    const first = groups[0]!.group,
      evaluatorSource = groups.map((g) => g.group.evaluatorSource!).join('\n'),
      group = {
        ...first,
        checks: groups.flatMap((g) => g.group.checks),
        evaluatorSource,
        source: {
          ...first.source!,
          modules: first.source!.modules.map((m) =>
            m.name === 'checks'
              ? { ...m, files: [{ path: 'evaluators.rs', source: evaluatorSource }] }
              : m,
          ),
        },
      }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    let inserts = 0
    for (const f of forms) {
      const leaf = `encoding_${f.type}_leaf`,
        batch = `encoding_${f.type}_batch`
      const expressions = [
        `NULL::${batch}[]`,
        `'{}'::${batch}[]`,
        `ARRAY[NULL::${batch}]`,
        `ARRAY['{}'::${batch}]`,
        `ARRAY[ARRAY[ARRAY[' { "aa":1,"é":2,"aa":3 } '::${f.type}]::${leaf}]::${batch}]`,
        `ARRAY[ARRAY[ARRAY[' { "a":1,"a":2 } '::${f.type}]::${leaf}]::${batch}]`,
      ]
      const samples: (string | null)[] = []
      for (const sql of expressions)
        samples.push(
          (await pg.query<{ value: string | null }>(`SELECT (${sql})::text AS value`)).rows[0]!
            .value,
        )
      samples.push('bad')
      for (const [sample, a] of samples.entries())
        for (const bypass of [false, true]) {
          let output: string | null = null
          try {
            output = (
              await pg.query<{ value: string | null }>(
                `SELECT ${f.output} AS value FROM (SELECT $1::text a)candidate`,
                [a],
              )
            ).rows[0]!.value
          } catch {}
          let expected: Outcome
          try {
            const value = (
              await pg.query<{ value: boolean | null }>(
                `WITH candidate AS MATERIALIZED(SELECT $1::text a,$2::text expected,$3::boolean bypass)SELECT ${f.sql} AS value FROM candidate`,
                [a, output, bypass],
              )
            ).rows[0]!.value
            expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
          } catch (cause) {
            expected = error((cause as { code: string }).code)
          }
          const insert = pg.query(`INSERT INTO encoding_${f.name} VALUES($1,$2,$3)`, [
            a,
            output,
            bypass,
          ])
          if (expected.kind === 'False' || expected.kind === 'Error')
            await expect(insert).rejects.toMatchObject({
              code:
                'value' in expected
                  ? expected.value.state.toString(36).toUpperCase().padStart(5, '0')
                  : '23514',
            })
          else await insert
          inserts++
          references.push({ name: f.name, sample, a, output, bypass, expected })
          for (const mode of ['utf8', 'missing'])
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: mode + '_' + f.name + '_' + origin,
                row: { a: known(a), expected: known(output), bypass: known(bypass) },
                expected:
                  mode === 'missing' &&
                  sample === 4 &&
                  f.name !== 'json_raw' &&
                  !bypass &&
                  expected.kind === 'True'
                    ? { kind: 'Unknown' }
                    : expected,
              })
        }
    }
    await mkdir('artifacts/nested-domain-array-json', { recursive: true })
    await writeFile(
      'artifacts/nested-domain-array-json/encoding.json',
      JSON.stringify({ inserts, fixtures: fixtures.length, references }, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'nestedjsonencoding',
      group,
      groups.flatMap((g) => g.names),
      fixtures,
    )
    expect(inserts).toBe(forms.length * 7 * 2)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180000)
