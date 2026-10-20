import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { PG18_RANGE_TYPES } from '../../src/postgres/builtins/type-ranges.generated.js'
import {
  builtinMetadata,
  builtinTypeComparison,
  builtinTypeIO,
} from '../../src/postgres/builtins/inventory.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { hashValueRequirements } from '../../scripts/check-measurements/catalog.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import { rangeCoreSamples, readRangeFixture } from './check-range-fixtures.js'

const value = (input: string | number | bigint | boolean | null): Input =>
  input === null ? { kind: 'Null' } : { kind: 'Value', value: input }

it('sends and hashes builtin ranges through captured subtype functions with exact bounds, flags, strict states and composition in all targets', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-range-wire-hash-'))
  try {
    await pg.exec("SET DateStyle='ISO,YMD'; SET TimeZone='UTC'")
    const forms = Object.values(PG18_RANGE_TYPES).flatMap((metadata, family) => {
      expect(builtinMetadata(builtinTypeIO(metadata.identity)!.send!).name).toBe('range_send')
      expect(builtinMetadata(builtinTypeIO(metadata.identity)!.receive!).name).toBe('range_recv')
      expect(builtinTypeIO(metadata.subtype)!.send).not.toBeNull()
      expect(builtinTypeComparison(metadata.subtype)!.hash).not.toBeNull()
      const fallback = rangeCoreSamples(metadata.identity).ranges[5]!
      return [
        { name: 'wire', expr: 'range_send(payload)', output: 'wire' },
        {
          name: 'wire_domain',
          expr: `range_send(payload::range_wire_nested_${family})`,
          output: 'wire',
        },
        { name: 'wire_coalesce', expr: 'range_send(COALESCE(payload,other))', output: 'wire' },
        {
          name: 'wire_choice',
          expr: 'range_send(CASE WHEN choose THEN other ELSE payload END)',
          output: 'wire',
        },
        {
          name: 'wire_literal',
          expr: `range_send('${fallback}'::${metadata.identity})`,
          output: 'wire',
        },
        { name: 'hash32', expr: 'hash_range(payload)', output: 'hash32' },
        { name: 'hash64', expr: 'hash_range_extended(payload,seed)', output: 'hash64' },
        {
          name: 'hash64_coalesce',
          expr: 'hash_range_extended(COALESCE(payload,other),seed)',
          output: 'hash64',
        },
        {
          name: 'hash64_choice',
          expr: 'hash_range_extended(CASE WHEN choose THEN other ELSE payload END,seed)',
          output: 'hash64',
        },
      ].map((form, i) => ({
        ...form,
        metadata,
        table: `range_wire_hash_${family}_${i}`,
        sql: `CASE WHEN bypass THEN true ELSE (${form.expr}) IS NOT DISTINCT FROM expected_${form.output} END`,
      }))
    })
    for (const [family, metadata] of Object.values(PG18_RANGE_TYPES).entries())
      await pg.exec(
        `CREATE DOMAIN range_wire_plain_${family} AS ${metadata.identity};CREATE DOMAIN range_wire_nested_${family} AS range_wire_plain_${family}`,
      )
    for (const form of forms)
      await pg.exec(
        `CREATE TABLE ${form.table}(payload ${form.metadata.identity},other ${form.metadata.identity},seed bigint,choose boolean,bypass boolean,expected_wire bytea,expected_hash32 integer,expected_hash64 bigint,CHECK(${form.sql}))`,
      )
    const catalog = await snapshotCatalog(pg)
    const plans = forms.flatMap((form) => {
      const table = catalog.tables.find((t) => t.name === form.table)!
      return ['source', 'stored'].map((origin) => {
        const plan = lowerTableCheck(
          table,
          origin === 'source'
            ? { name: 'check', type: 'check', definition: `CHECK(${form.sql})` }
            : table.constraints[0]!,
          catalog.enums,
          catalog.domains,
          origin as 'source' | 'stored',
        )!
        expect(hasUncertain(plan.expression), form.table + '/' + origin).toBe(false)
        const expression = portableCheckAtoms(plan.expression)
        expect(hasUncertain(expression), form.table + '/' + origin + '/portable').toBe(false)
        return {
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: form.table,
            constraint: origin,
          },
          expression,
        }
      })
    })
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    let inserts = 0
    const seeds = [
      null,
      '0',
      '1',
      '-1',
      '-9223372036854775808',
      '9223372036854775807',
      '9007199254740993',
    ]
    for (const form of forms) {
      const { ranges } = rangeCoreSamples(form.metadata.identity)
      const other = ranges[9]!
      const fallback = await readRangeFixture(
        pg,
        `SELECT $1::${form.metadata.identity} span`,
        'span',
        form.metadata.identity,
        [other],
      )
      for (const [i, payload] of ranges.entries()) {
        const range = await readRangeFixture(
          pg,
          `SELECT $1::${form.metadata.identity} span`,
          'span',
          form.metadata.identity,
          [payload],
        )
        for (const seed of form.output === 'hash64' ? seeds : ['0']) {
          const choose = i % 2 === 1
          const projected =
            form.output === 'wire' ? `encode(${form.expr},'hex')` : `(${form.expr})::text`
          const rendered = (
            await pg.query<{ rendered: string | null }>(
              `SELECT ${projected} rendered FROM (SELECT $1::${form.metadata.identity} payload,$2::${form.metadata.identity} other,$3::bigint seed,$4::boolean choose) q`,
              [payload, other, seed, choose],
            )
          ).rows[0]!.rendered
          const actual =
            rendered === null
              ? null
              : form.output === 'wire'
                ? rendered
                : form.output === 'hash64'
                  ? BigInt(rendered)
                  : Number(rendered)
          for (const mismatch of i === 0 ? [false, true] : [false]) {
            const expected = mismatch
              ? form.output === 'wire'
                ? 'ff'
                : typeof actual === 'bigint'
                  ? actual === 0n
                    ? 1n
                    : 0n
                  : 1
              : actual
            const parameter = expected === null ? null : String(expected)
            const placeholders = ['NULL::bytea', 'NULL::integer', 'NULL::bigint']
            placeholders[form.output === 'wire' ? 0 : form.output === 'hash32' ? 1 : 2] =
              form.output === 'wire' ? "decode($6,'hex')" : '$6'
            const sql = `INSERT INTO ${form.table} VALUES($1::${form.metadata.identity},$2::${form.metadata.identity},$3,$4,$5,${placeholders.join(',')})`
            if (mismatch)
              await expect(
                pg.query(sql, [payload, other, seed, choose, false, parameter]),
              ).rejects.toMatchObject({ code: '23514' })
            else await pg.query(sql, [payload, other, seed, choose, false, parameter])
            inserts++
            const row: Row = {
              payload: range ? { kind: 'Value', value: range } : value(null),
              other: { kind: 'Value', value: fallback! },
              seed: seed === null ? value(null) : value(BigInt(seed)),
              choose: value(choose),
              bypass: value(false),
              expected_wire: value(null),
              expected_hash32: value(null),
              expected_hash64: value(null),
            }
            row['expected_' + form.output] = value(expected)
            for (const mode of ['source', 'stored'])
              fixtures.push({
                name: form.table + '_' + mode,
                row,
                expected: { kind: mismatch ? 'False' : 'True' },
              })
          }
        }
      }
      if (form.name !== 'wire_literal')
        for (const payload of [
          { kind: 'Unknown' },
          { kind: 'Error', value: { state: parseInt('22012', 36) } },
        ] as Input[])
          for (const bypass of [false, true])
            for (const mode of ['source', 'stored'])
              fixtures.push({
                name: form.table + '_' + mode,
                row: {
                  payload,
                  other: { kind: 'Value', value: fallback! },
                  seed: value(0n),
                  choose: value(false),
                  bypass: value(bypass),
                  expected_wire: value(null),
                  expected_hash32: value(null),
                  expected_hash64: value(null),
                },
                expected: bypass ? { kind: 'True' } : (payload as Outcome),
              })
    }
    for (const name of ['hash_range', 'hash_range_extended']) {
      const signature = `function:["pg_catalog","${name}"](pg_catalog.anyrange${name.endsWith('extended') ? ',pg_catalog.int8' : ''})`
      expect(hashValueRequirements(builtinMetadata(signature))).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            requirement: expect.stringContaining('OIDs are not hash inputs'),
          }),
        ]),
      )
    }
    const group = prepareCheckRustGroup(plans, { nativeByteOrder: 'little' })
    expect(group.checks.filter((c) => c.kind !== 'supported')).toEqual([])
    await runCheckParity(
      directory,
      'rangewirehash',
      group,
      forms.flatMap((f) => ['source', 'stored'].map((m) => f.table + '_' + m)),
      fixtures,
    )
    await mkdir('artifacts/check-range-wire-hash', { recursive: true })
    await writeFile(
      'artifacts/check-range-wire-hash/report.json',
      JSON.stringify(
        {
          inserts,
          fixtures: fixtures.length,
          plans: plans.length,
          types: Object.keys(PG18_RANGE_TYPES),
          nativeByteOrder: 'little',
          subtypeSupport: 'captured binary and hash links',
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
