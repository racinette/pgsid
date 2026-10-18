import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
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

const known = (value: string | number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (code: string): Outcome => ({ kind: 'Error', value: { state: parseInt(code, 36) } })

it('hashes array-valued domains recursively with seeded folds, missing-support order and nominal scalar identities in every target', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-nested-array-hashes-'))
  try {
    await pg.exec(
      "CREATE TYPE hash_stage AS ENUM ('new','done'); CREATE DOMAIN hash_scalar AS integer CHECK(VALUE > 0)",
    )
    const profiles = [
      ['integer', '1'],
      ['hash_scalar', '2'],
      ['text', "'é'"],
      ['numeric', "'1.00'"],
      ['jsonb', `'{"é":1,"aa":2}'`],
      ['float8', "'-0'"],
      ['hash_stage', "'new'"],
      ['json', "'1'"],
      ['point', "'(0,0)'"],
    ] as const
    const forms: { name: string; sql: string; output: string; wide: boolean; profile: number }[] =
      []
    for (const [profile, [type]] of profiles.entries()) {
      await pg.exec(
        `CREATE DOMAIN hash_group_${profile} AS ${type}[]; CREATE DOMAIN hash_batch_${profile} AS hash_group_${profile}[]`,
      )
      for (const wide of [false, true]) {
        const name = `hash_${profile}_${wide ? '64' : '32'}`
        const output = `${wide ? 'hash_array_extended' : 'hash_array'}(a::hash_batch_${profile}[]${wide ? ',seed' : ''})`
        const sql = `CASE WHEN bypass THEN true ELSE (${output}) IS NOT DISTINCT FROM ${wide ? 'expected64' : 'expected32'} END`
        forms.push({ name, sql, output, wide, profile })
        await pg.exec(
          `CREATE TABLE ${name}(a text,seed bigint,expected32 integer,expected64 bigint,bypass boolean,CONSTRAINT hashed CHECK(${sql}))`,
        )
      }
    }
    const catalog = await snapshotCatalog(pg)
    const plans = forms.flatMap((form) => {
      const table = catalog.tables.find((t) => t.name === form.name)!
      const constraint = table.constraints.find((c) => c.name === 'hashed')!
      return (['source', 'stored'] as const).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: form.name + '_' + origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'source' ? { ...constraint, definition: `CHECK(${form.sql})` } : constraint,
            catalog.enums,
            catalog.domains,
            origin,
          )!.expression,
        ),
      }))
    })
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const references: unknown[] = []
    let inserts = 0
    for (const form of forms) {
      const [type, literal] = profiles[form.profile]!
      const expressions = [
        `NULL::hash_batch_${form.profile}[]`,
        `'{}'::hash_batch_${form.profile}[]`,
        `ARRAY[NULL::hash_batch_${form.profile}]`,
        `ARRAY['{}'::hash_batch_${form.profile}]`,
        `ARRAY[ARRAY[NULL::hash_group_${form.profile}]::hash_batch_${form.profile}]`,
        `ARRAY[ARRAY['{}'::hash_group_${form.profile}]::hash_batch_${form.profile}]`,
        `ARRAY[ARRAY[ARRAY[${literal}::${type},NULL]::hash_group_${form.profile}]::hash_batch_${form.profile}]`,
        `ARRAY[ARRAY[ARRAY[${literal}::${type},${literal}::${type}]::hash_group_${form.profile},NULL::hash_group_${form.profile}]::hash_batch_${form.profile},NULL::hash_batch_${form.profile}]`,
        `array_fill(ARRAY[ARRAY[${literal}::${type}]::hash_group_${form.profile}]::hash_batch_${form.profile},ARRAY[2,1],ARRAY[-2,4])`,
      ]
      const samples: (string | null)[] = []
      for (const sql of expressions)
        samples.push(
          (await pg.query<{ value: string | null }>(`SELECT (${sql})::text AS value`)).rows[0]!
            .value,
        )
      samples.push('bad')
      for (const [sample, a] of samples.entries())
        for (const seed of [0n, -9223372036854775808n, 9223372036854775807n]) {
          let expected32: number | null = null,
            expected64: bigint | null = null
          try {
            const value = (
              await pg.query<{ value: string | null }>(
                `SELECT (${form.output})::text AS value FROM (SELECT $1::text a,$2::bigint seed) candidate`,
                [a, seed.toString()],
              )
            ).rows[0]!.value
            if (form.wide) expected64 = value === null ? null : BigInt(value)
            else expected32 = value === null ? null : Number(value)
          } catch {}
          for (const bypass of [false, true])
            for (const mismatch of [false, true]) {
              const e32 = mismatch ? (expected32 === 0 ? 1 : 0) : expected32
              const e64 = mismatch ? (expected64 === 0n ? 1n : 0n) : expected64
              let expected: Outcome
              try {
                const value = (
                  await pg.query<{ value: boolean | null }>(
                    `WITH candidate AS MATERIALIZED (SELECT $1::text a,$2::bigint seed,$3::integer expected32,$4::bigint expected64,$5::boolean bypass) SELECT ${form.sql} AS value FROM candidate`,
                    [a, seed.toString(), e32, e64?.toString() ?? null, bypass],
                  )
                ).rows[0]!.value
                expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
              } catch (cause) {
                expected = error((cause as { code: string }).code)
              }
              const insert = pg.query(`INSERT INTO ${form.name} VALUES($1,$2,$3,$4,$5)`, [
                a,
                seed.toString(),
                e32,
                e64?.toString() ?? null,
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
              const row = {
                a: known(a),
                seed: known(seed),
                expected32: known(e32),
                expected64: known(e64),
                bypass: known(bypass),
              }
              references.push({
                form: form.name,
                sample,
                a,
                seed: seed.toString(),
                bypass,
                mismatch,
                expected,
              })
              if (
                type === 'hash_stage' &&
                sample >= 6 &&
                sample <= 8 &&
                !bypass &&
                expected.kind !== 'Error'
              )
                expected = { kind: 'Unknown' }
              for (const origin of ['source', 'stored'])
                fixtures.push({ name: form.name + '_' + origin, row, expected })
            }
        }
    }
    await mkdir('artifacts/nested-domain-array-hashes', { recursive: true })
    await writeFile(
      'artifacts/nested-domain-array-hashes/references.json',
      JSON.stringify({ inserts, fixtures: fixtures.length, references }, null, 2) + '\n',
    )
    for (let offset = 0; offset < plans.length; offset += 8) {
      const selected = plans.slice(offset, offset + 8)
      const group = prepareCheckRustGroup(selected, {
        arrayNulls: true,
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        nativeByteOrder: 'little',
      })
      for (const [index, check] of group.checks.entries())
        expect(
          check.kind,
          selected[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
        ).toBe('supported')
      const names = selected.map((p) => p.identity.constraint)
      const batch = join(directory, 'batch-' + offset)
      await mkdir(batch)
      await runCheckParity(
        batch,
        'nestedhashes' + offset,
        group,
        names,
        fixtures.filter((f) => names.includes(f.name)),
      )
    }
    expect(inserts).toBe(profiles.length * 2 * 10 * 3 * 4)
    expect(fixtures).toHaveLength(inserts * 2)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240000)

it('keeps byte-order alternatives correlated through nested hash folds and preserves missing encoding requirements', async () => {
  const { readFileSync } = await import('node:fs')
  const reference = JSON.parse(readFileSync('tests/fixtures/check-array-hash.json', 'utf8')) as {
    samples: {
      type: string
      seed: string
      pattern: string
      array: string
      little32: number
      big32: number
      little64: string
      big64: string
      nan: boolean
      encoding: boolean
    }[]
  }
  const wanted = [
    'pg_catalog.bytea',
    'pg_catalog.text',
    'pg_catalog.float8',
    'pg_catalog."numeric"',
    'pg_catalog.jsonb',
    'pg_catalog.tid',
  ]
  const samples = wanted.map((type) =>
    reference.samples.find(
      (s) =>
        s.type === type &&
        s.pattern === 'one' &&
        s.seed === '0' &&
        !s.nan &&
        (s.little32 !== s.big32 || s.little64 !== s.big64),
    )!,
  )
  samples.push(reference.samples.find((s) => s.pattern === 'cancellation')!)
  const unicode = reference.samples.find(
    (s) => s.type === 'pg_catalog.text' && s.pattern === 'one' && s.seed === '0' && s.encoding,
  )!
  if (!samples.includes(unicode)) samples.push(unicode)
  expect(samples.every(Boolean)).toBe(true)
  const types = [...new Set(samples.map((s) => s.type))]
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-nested-hash-context-'))
  try {
    for (const [index, type] of types.entries()) {
      await pg.exec(`CREATE DOMAIN hash_context_group_${index} AS ${type}[]`)
      for (const wide of [false, true])
        await pg.exec(
          `CREATE TABLE nested_context_${index}_${wide ? '64' : '32'}(a text,seed bigint,expected32 integer,expected64 bigint,bypass boolean,CONSTRAINT hashed CHECK(CASE WHEN bypass THEN true ELSE ${wide ? 'hash_array_extended' : 'hash_array'}(a::hash_context_group_${index}[]${wide ? ',seed' : ''}) IS NOT DISTINCT FROM ${wide ? 'expected64' : 'expected32'} END))`,
        )
    }
    const catalog = await snapshotCatalog(pg)
    const contexts = {
      little: {
        arrayNulls: true,
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        nativeByteOrder: 'little',
      },
      big: {
        arrayNulls: true,
        defaultCollation: 'C',
        serverEncoding: 'UTF8',
        nativeByteOrder: 'big',
      },
      unspecified: { arrayNulls: true, defaultCollation: 'C', serverEncoding: 'UTF8' },
      encoding_missing: { arrayNulls: true, defaultCollation: 'C', nativeByteOrder: 'little' },
    } as const
    const groups = Object.entries(contexts).map(([contextName, context]) => {
      const plans = types.flatMap((_, index) =>
        [false, true].flatMap((wide) => {
          const table = catalog.tables.find(
            (t) => t.name === `nested_context_${index}_${wide ? '64' : '32'}`,
          )!
          const constraint = table.constraints.find((c) => c.name === 'hashed')!
          return (['source', 'stored'] as const).map((origin) => ({
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: table.name,
              constraint: `${contextName}_${index}_${wide ? '64' : '32'}_${origin}`,
            },
            expression: portableCheckAtoms(
              lowerTableCheck(table, constraint, catalog.enums, catalog.domains, origin)!
                .expression,
            ),
          }))
        }),
      )
      const group = prepareCheckRustGroup(plans, context)
      for (const [index, check] of group.checks.entries())
        expect(
          check.kind,
          plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
        ).toBe('supported')
      return { group, names: plans.map((p) => p.identity.constraint) }
    })
    const first = groups[0]!.group
    const evaluatorSource = groups.map((g) => g.group.evaluatorSource!).join('\n')
    const group = {
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
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const references: unknown[] = []
    let inserts = 0,
      cancellation = 0
    const quote = (value: string) => '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'
    for (const sample of samples)
      for (const count of sample.pattern === 'cancellation' ? [1] : [1, 64]) {
        const index = types.indexOf(sample.type)
        const a = '{' + Array.from({ length: count }, () => quote(sample.array)).join(',') + '}'
        const fold = (value: number | string, width: number) => {
          let result = 1n
          for (let cell = 0; cell < count; cell++)
            result = BigInt.asIntN(width, result * 31n + BigInt(value))
          return result
        }
        for (const wide of [false, true]) {
          const width = wide ? 64 : 32
          const little = fold(wide ? sample.little64 : sample.little32, width)
          const big = fold(wide ? sample.big64 : sample.big32, width)
          const actual = (
            await pg.query<{ value: string }>(
              `SELECT ${wide ? 'hash_array_extended' : 'hash_array'}($1::hash_context_group_${index}[]${wide ? ',$2::bigint' : ''})::text AS value`,
              wide ? [a, sample.seed] : [a],
            )
          ).rows[0]!.value
          expect(BigInt(actual)).toBe(little)
          if (
            little === big &&
            BigInt(wide ? sample.little64 : sample.little32) !==
              BigInt(wide ? sample.big64 : sample.big32)
          )
            cancellation++
          await pg.query(`INSERT INTO nested_context_${index}_${width} VALUES($1,$2,$3,$4,false)`, [
            a,
            sample.seed,
            wide ? 0 : Number(little),
            wide ? little.toString() : '0',
          ])
          inserts++
          for (const context of Object.keys(contexts)) {
            const expected = context === 'big' ? big : little
            const row = {
              a: known(a),
              seed: known(BigInt(sample.seed)),
              expected32: known(wide ? 0 : Number(expected)),
              expected64: known(wide ? expected : 0n),
              bypass: known(false),
            }
            const deferred =
              (context === 'unspecified' && little !== big) ||
              (context === 'encoding_missing' && sample.encoding)
            for (const origin of ['source', 'stored']) {
              const name = `${context}_${index}_${width}_${origin}`
              fixtures.push({ name, row, expected: { kind: deferred ? 'Unknown' : 'True' } })
              fixtures.push({
                name,
                row: { ...row, bypass: known(true) },
                expected: { kind: 'True' },
              })
            }
          }
          references.push({
            type: sample.type,
            pattern: sample.pattern,
            count,
            width,
            little: little.toString(),
            big: big.toString(),
          })
        }
      }
    expect(cancellation).toBeGreaterThan(0)
    await mkdir('artifacts/nested-domain-array-hashes', { recursive: true })
    await writeFile(
      'artifacts/nested-domain-array-hashes/context-references.json',
      JSON.stringify({ fixtures: fixtures.length, inserts, cancellation, references }, null, 2) +
        '\n',
    )
    await runCheckParity(
      directory,
      'nestedhashcontext',
      group,
      groups.flatMap((g) => g.names),
      fixtures,
    ).catch(async (cause) => {
      await cp(directory, 'artifacts/nested-domain-array-hashes/context-failure', {
        recursive: true,
      })
      throw cause
    })
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180000)

it('preserves nested hash validity, partial cells, incoming errors and eager versus skipped missing support', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-nested-hash-states-'))
  try {
    await pg.exec(
      'CREATE DOMAIN state_hash_group AS integer[]; CREATE DOMAIN state_json_group AS json[]',
    )
    const nested = 'ARRAY[ARRAY[quantity]::state_hash_group,NULL::state_hash_group]'
    const calls = {
      known_shape: `cardinality(ARRAY[hash_array(${nested})])=1`,
      strict_seed: `hash_array_extended(${nested},NULL::bigint) IS NULL`,
      arithmetic: `cardinality(ARRAY[hash_array(ARRAY[ARRAY[quantity/divisor]::state_hash_group])])=1`,
      missing: 'cardinality(ARRAY[hash_array(a::state_json_group[])])=1',
      prepared_missing:
        "CASE WHEN bypass THEN true ELSE hash_array(ARRAY['{}'::state_json_group])=1 END",
      prepared_outer_empty:
        "CASE WHEN bypass THEN true ELSE hash_array('{}'::state_json_group[])=1 END",
      pruned_missing:
        "CASE WHEN true THEN true ELSE hash_array(ARRAY['{}'::state_json_group])=1 END",
      deferred_guard: `CASE WHEN bypass THEN true ELSE hash_array(${nested})=expected END`,
    }
    for (const [name, sql] of Object.entries(calls))
      await pg.exec(
        `CREATE TABLE state_${name}(a text,quantity integer,divisor integer,expected integer,bypass boolean,CONSTRAINT hashed CHECK(${sql}))`,
      )
    const catalog = await snapshotCatalog(pg)
    const plans = Object.entries(calls).flatMap(([name, sql]) => {
      const table = catalog.tables.find((t) => t.name === 'state_' + name)!
      const constraint = table.constraints.find((c) => c.name === 'hashed')!
      return (['source', 'stored'] as const).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: name + '_' + origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'source' ? { ...constraint, definition: `CHECK(${sql})` } : constraint,
            catalog.enums,
            catalog.domains,
            origin,
          )!.expression,
        ),
      }))
    })
    const group = prepareCheckRustGroup(plans, {
      arrayNulls: true,
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
      nativeByteOrder: 'little',
    })
    for (const [index, check] of group.checks.entries())
      expect(
        check.kind,
        plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
      ).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const references: unknown[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const origin of ['source', 'stored'])
        fixtures.push({ name: name + '_' + origin, row, expected })
    }
    let inserts = 0
    for (const [name, sql] of Object.entries(calls))
      for (const a of [null, '{}', '{NULL}', '{"{}"}'])
        for (const quantity of [null, 0, 1])
          for (const bypass of [false, true]) {
            const row = {
              a: known(a),
              quantity: known(quantity),
              divisor: known(0),
              expected: known(1),
              bypass: known(bypass),
            }
            let expected: Outcome
            try {
              const value = (
                await pg.query<{ value: boolean | null }>(
                  `WITH candidate AS MATERIALIZED(SELECT $1::text a,$2::integer quantity,0::integer divisor,1::integer expected,$3::boolean bypass) SELECT ${sql} AS value FROM candidate`,
                  [a, quantity, bypass],
                )
              ).rows[0]!.value
              expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
            } catch (cause) {
              expected = error((cause as { code: string }).code)
            }
            const insert = pg.query(`INSERT INTO state_${name} VALUES($1,$2,0,1,$3)`, [
              a,
              quantity,
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
            references.push({ name, a, quantity, bypass, expected })
            add(name, row, expected)
          }
    const base: Row = {
      a: known('{}'),
      quantity: { kind: 'Unknown' },
      divisor: known(1),
      expected: known(1),
      bypass: known(false),
    }
    add('known_shape', base, { kind: 'True' })
    add('arithmetic', base, { kind: 'Unknown' })
    add('strict_seed', base, { kind: 'True' })
    add('deferred_guard', base, { kind: 'Unknown' })
    add('deferred_guard', { ...base, bypass: known(true) }, { kind: 'True' })
    add('missing', { ...base, a: { kind: 'Unknown' } }, { kind: 'Unknown' })
    for (const name of ['known_shape', 'arithmetic', 'deferred_guard'])
      add(
        name,
        { ...base, quantity: { kind: 'Error', value: { state: parseInt('22012', 36) } } },
        error('22012'),
      )
    add(
      'arithmetic',
      {
        ...base,
        quantity: known(1),
        divisor: { kind: 'Error', value: { state: parseInt('22003', 36) } },
      },
      error('22003'),
    )
    expect(
      (
        await pg.query<{ value: boolean }>(
          'WITH candidate AS MATERIALIZED (SELECT 1::integer quantity,0::integer divisor) SELECT hash_array_extended(ARRAY[ARRAY[quantity/divisor]::state_hash_group],NULL::bigint) IS NULL AS value FROM candidate',
        )
      ).rows[0]!.value,
    ).toBe(true)
    add(
      'strict_seed',
      { ...base, quantity: { kind: 'Error', value: { state: parseInt('22012', 36) } } },
      { kind: 'True' },
    )
    add('prepared_missing', { ...base, bypass: known(true) }, error('42883'))
    add(
      'pruned_missing',
      { ...base, quantity: { kind: 'Error', value: { state: parseInt('22012', 36) } } },
      { kind: 'True' },
    )
    await mkdir('artifacts/nested-domain-array-hashes', { recursive: true })
    await writeFile(
      'artifacts/nested-domain-array-hashes/state-references.json',
      JSON.stringify({ inserts, fixtures: fixtures.length, references }, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'nestedhashstates',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
    expect(inserts).toBe(Object.keys(calls).length * 4 * 3 * 2)
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 120000)
