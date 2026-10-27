import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { runCheckParity, type Outcome, type Row } from '../../tools/check-rust/parity.js'
const known = (value: string | boolean | null) =>
  value === null ? { kind: 'Null' as const } : { kind: 'Value' as const, value }

it('requires deployment element identity for binary array output, preserving NULL/errors and classifying internal receive and volatile operations', async () => {
  const pg = await PGlite.create(),
    second = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-binary-context-'))
  try {
    await pg.exec(
      "CREATE TYPE binary_stage AS ENUM ('new','done');CREATE TABLE binary_values(source text,bypass boolean)",
    )
    await second.exec(
      "CREATE TYPE padding_stage AS ENUM ('x');CREATE TYPE binary_stage AS ENUM ('new','done')",
    )
    const references: unknown[] = []
    const headers = []
    for (const [index, database] of [pg, second].entries()) {
      const row = (
        await database.query<{ oid: number; empty: string; nulls: string; value: string }>(
          "SELECT 'binary_stage'::regtype::oid oid,encode(array_send('{}'::binary_stage[]),'hex') empty,encode(array_send('{NULL}'::binary_stage[]),'hex') nulls,encode(array_send('{new}'::binary_stage[]),'hex') value",
        )
      ).rows[0]!
      for (const bytes of [row.empty, row.nulls, row.value])
        expect(Buffer.from(bytes, 'hex').readUInt32BE(8)).toBe(row.oid)
      expect(Buffer.from(row.empty, 'hex')).toHaveLength(12)
      headers.push(row)
      references.push({ database: index, ...row })
    }
    expect(headers[0]!.oid).not.toBe(headers[1]!.oid)
    expect(headers[0]!.empty).not.toBe(headers[1]!.empty)
    const forms = {
      integer: 'array_send(source::int[]) IS NULL',
      text: 'array_send(source::text[]) IS NULL',
      enum: 'array_send(source::binary_stage[]) IS NULL',
      guarded: 'CASE WHEN bypass THEN true ELSE array_send(source::int[]) IS NULL END',
      null_literal: 'array_send(NULL::int[]) IS NULL',
    }
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(`ALTER TABLE binary_values ADD CONSTRAINT ${name} CHECK(${sql})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((item) => item.name === 'binary_values')!
    const plans = Object.entries(forms).flatMap(([name, sql]) =>
      ['source', 'stored'].map((origin) => ({
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
              ? {
                  ...table.constraints.find((item) => item.name === name)!,
                  definition: `CHECK(${sql})`,
                }
              : table.constraints.find((item) => item.name === name)!,
            catalog.enums,
            catalog.domains,
            origin as 'source' | 'stored',
          )!.expression,
        ),
      })),
    )
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
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const [name, sql] of Object.entries(forms))
      for (const value of [null, '{}', '{NULL}', '{1}', 'bad']) {
        let postgres: Outcome
        try {
          const row = (
            await pg.query<{ value: boolean | null }>(
              `SELECT (${sql}) value FROM (SELECT $1::text source,false bypass) q`,
              [value],
            )
          ).rows[0]!
          postgres = { kind: row.value === null ? 'Null' : row.value ? 'True' : 'False' }
        } catch (error) {
          postgres = {
            kind: 'Error',
            value: { state: parseInt((error as { code: string }).code, 36) },
          }
        }
        const expected: Outcome = postgres
        references.push({ name, value, postgres, expected })
        for (const origin of ['source', 'stored'])
          fixtures.push({
            name: name + '_' + origin,
            row: { source: known(value), bypass: known(false) },
            expected,
          })
      }
    for (const origin of ['source', 'stored']) {
      fixtures.push({
        name: 'integer_' + origin,
        row: { source: { kind: 'Unknown' } },
        expected: { kind: 'Unknown' },
      })
      fixtures.push({
        name: 'integer_' + origin,
        row: { source: { kind: 'Error', value: { state: parseInt('22012', 36) } } },
        expected: { kind: 'Error', value: { state: parseInt('22012', 36) } },
      })
      fixtures.push({
        name: 'guarded_' + origin,
        row: { source: { kind: 'Unknown' }, bypass: known(true) },
        expected: { kind: 'True' },
      })
    }
    const receive = builtinCallables().find(
      (item) => item.kind === 'function' && item.name === 'array_recv',
    )!
    expect(receive).toMatchObject({
      args: ['pg_catalog.internal', 'pg_catalog.oid', 'pg_catalog.int4'],
      result: 'pg_catalog.anyarray',
    })
    await expect(pg.query('SELECT array_recv(NULL::internal,0,0)')).rejects.toMatchObject({
      code: '42846',
    })
    for (const name of ['array_shuffle', 'array_sample']) {
      expect(
        builtinCallables().find((item) => item.kind === 'function' && item.name === name),
      ).toMatchObject({ volatility: 'v' })
      const sql =
        name === 'array_sample'
          ? 'array_sample(source::int[],1) IS NULL'
          : 'array_shuffle(source::int[]) IS NULL'
      const expression = portableCheckAtoms(
        lowerTableCheck(
          table,
          { name, type: 'check', definition: `CHECK(${sql})` },
          catalog.enums,
          catalog.domains,
          'source',
        )!.expression,
      )
      expect(expression).toMatchObject({
        kind: 'eval-scalar',
        expression: {
          kind: 'null-test',
          operand: { kind: 'uncertain', type: 'array:pg_catalog.int4' },
        },
      })
    }
    await mkdir('artifacts/array-reverse', { recursive: true })
    await writeFile(
      'artifacts/array-reverse/binary-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-reverse/binary-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arraybinarycontext',
      group,
      plans.map((plan) => plan.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await second.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180_000)
