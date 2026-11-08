import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { oidAliasTypes } from '../../src/sql-semantics/expressions.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { internalCheckRows } from '../support/check-entries.js'
const failure = (code: string) => ({ kind: 'Error', value: { state: parseInt(code, 36) } })
describe('public catalog alias payloads', () => {
  let pg: PGlite, directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-oid-alias-payload-'))
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('validates SQL-coerced unsigned carriers and retains known stored literal comparisons in the public API', async () => {
    for (const type of oidAliasTypes) {
      const name = type.slice('pg_catalog.'.length)
      await pg.exec(`CREATE DOMAIN imported_${name} AS ${type};
        CREATE DOMAIN nested_${name} AS imported_${name};
        CREATE TABLE alias_${name}_payloads(amount nested_${name},reference ${type},expected bytea,
        CONSTRAINT wire CHECK(${name}send(amount)=expected),
        CONSTRAINT same CHECK(amount=reference),
        CONSTRAINT present CHECK(amount IS NOT NULL),CONSTRAINT absent CHECK(amount IS NULL),
        CONSTRAINT minimum CHECK(amount::oid >= '125'::oid))`)
    }
    const catalog = await snapshotCatalog(pg)
    const bundle = renderTypescriptSchemaCheckArtifacts(catalog.tables, catalog.domains),
      target = join(directory, 'public')
    await mkdir(target)
    await writeFile(join(target, 'package.json'), '{"type":"module"}\n')
    await writeFile(join(target, 'checks.ts'), bundle.checks)
    for (const artifact of checkTypescriptArtifacts(bundle.rustFiles!)) {
      const path = join(target, 'checks-rust', artifact.path)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, artifact.content)
    }
    await promisify(execFile)('node_modules/.bin/tsc', [
      '--strict',
      '--skipLibCheck',
      '--target',
      'es2022',
      '--module',
      'nodenext',
      '--moduleResolution',
      'nodenext',
      '--outDir',
      join(target, 'js'),
      join(target, 'checks.ts'),
    ]).catch((error: { stdout: string; stderr: string }) => {
      throw new Error(error.stdout + error.stderr, { cause: error })
    })
    const generated = await import(pathToFileURL(join(target, 'js/checks.js')).href)
    const runtime = await import(pathToFileURL(join(target, 'js/checks-rust/checks.js')).href)
    const internal = internalCheckRows(bundle.checks, runtime)
    type Result = { certain: boolean; value?: boolean | null; error?: string }
    // Each constraint evaluated by the server over the same parameter text.
    const server = async (table: string, row: Record<string, unknown>) => {
      const columns = (
        await pg.query<{ name: string; type: string }>(
          `SELECT attname AS name, format_type(atttypid, atttypmod) AS type FROM pg_attribute
           WHERE attrelid = $1::regclass AND attnum > 0 AND NOT attisdropped ORDER BY attnum`,
          [table],
        )
      ).rows
      const constraints = (
        await pg.query<{ name: string; definition: string }>(
          `SELECT conname AS name, pg_get_constraintdef(oid) AS definition FROM pg_constraint
           WHERE conrelid = $1::regclass AND contype = 'c'`,
          [table],
        )
      ).rows
      const results: Record<string, Result> = {}
      for (const { name, definition } of constraints) {
        const values = columns.map(({ name, type }, index) => `$${index + 1}::${type} AS ${name}`)
        try {
          const { rows } = await pg.query<{ value: boolean | null }>(
            `SELECT ${definition.replace(/^CHECK /u, '')} AS value FROM (SELECT ${values.join(', ')}) AS input`,
            columns.map(({ name }) => row[name]),
          )
          results[name] = { certain: true, value: rows[0]!.value }
        } catch (error) {
          results[name] = { certain: true, error: (error as { code: string }).code }
        }
      }
      return results
    }
    for (const type of oidAliasTypes) {
      const name = type.slice('pg_catalog.'.length)
      const table = `alias_${name}_payloads`
      // Catalog aliases are public text, read through the alias's own input function.
      const evaluate = (
        amount: unknown,
        reference: unknown = '125',
        expected: unknown = Buffer.from('0000007d', 'hex'),
      ): Record<string, Result> =>
        Object.fromEntries(
          generated[
            'evaluatePublicAlias' + name[0]!.toUpperCase() + name.slice(1) + 'PayloadsChecks'
          ]({ amount, reference, expected }).map((c: { constraint: string; result: Result }) => [
            c.constraint,
            c.result,
          ]),
        )
      const known = {
        wire: { certain: true, value: true },
        same: { certain: true, value: true },
        present: { certain: true, value: true },
        absent: { certain: true, value: false },
        minimum: { certain: true, value: true },
      }
      expect(evaluate('125')).toEqual(known)
      expect(
        await server(table, {
          amount: '125',
          reference: '125',
          expected: Buffer.from('0000007d', 'hex'),
        }),
      ).toEqual(known)
      expect(evaluate('124').minimum).toEqual({
        certain: true,
        value: false,
      })
      for (const value of [0n, 4294967295n]) {
        const bytes = Buffer.alloc(4)
        bytes.writeUInt32BE(Number(value))
        const text = String(value)
        expect(evaluate(text, text, bytes)).toEqual(
          await server(table, {
            amount: text,
            reference: text,
            expected: bytes,
          }),
        )
        expect(evaluate(text, text, bytes).wire).toEqual({
          certain: true,
          value: true,
        })
      }
      expect(Object.values(evaluate(undefined))).toEqual(
        Array.from({ length: 5 }, () => ({ certain: false })),
      )
      // A name resolves against the database's catalog, but a signature alias rejects a bare name
      // before any lookup.
      if (name === 'regprocedure' || name === 'regoperator')
        expect(evaluate('named_object')).toEqual(
          await server(table, {
            amount: 'named_object',
            reference: '125',
            expected: Buffer.from('0000007d', 'hex'),
          }),
        )
      else
        expect(Object.values(evaluate('named_object'))).toEqual(
          Array.from({ length: 5 }, () => ({ certain: false })),
        )
      for (const amount of [
        1.25,
        125,
        125n,
        { kind: 'Value', value: 125n },
        { kind: 'Value', value: 125 },
        { kind: 'Value', value: '125' },
        { kind: 'Value', value: 4294967296n },
        { kind: 'Value', value: -1n },
        { kind: 'Null' },
        failure('22003'),
      ])
        expect(
          () => evaluate(amount),
          JSON.stringify(amount, (_, v) => String(v)),
        ).toThrow(TypeError)
      expect(evaluate(null)).toEqual({
        wire: { certain: true, value: null },
        same: { certain: true, value: null },
        present: { certain: true, value: false },
        absent: { certain: true, value: true },
        minimum: { certain: true, value: null },
      })
      // A NULL or failed operand handed to the evaluator directly.
      const rows = (amount: unknown) =>
        internal(`public.${table}`, {
          amount,
          reference: runtime.makeOidValue(125n),
          expected: runtime.makeByteaValue('0000007d'),
        })
      expect(rows({ kind: 'Null' })).toEqual({
        wire: { kind: 'Null' },
        same: { kind: 'Null' },
        present: { kind: 'False' },
        absent: { kind: 'True' },
        minimum: { kind: 'Null' },
      })
      expect(Object.values(rows(failure('22003')))).toEqual(
        Array.from({ length: 5 }, () => failure('22003')),
      )
      // Stored identifiers, whatever object they name.
      expect(rows(runtime.makeOidValue(125n))).toEqual({
        wire: { kind: 'True' },
        same: { kind: 'True' },
        present: { kind: 'True' },
        absent: { kind: 'False' },
        minimum: { kind: 'True' },
      })
      expect(rows(runtime.makeOidValue(124n)).minimum).toEqual({ kind: 'False' })
      for (const value of [0n, 4294967295n]) {
        const bytes = Buffer.alloc(4)
        bytes.writeUInt32BE(Number(value))
        expect(
          internal(`public.${table}`, {
            amount: runtime.makeOidValue(value),
            reference: runtime.makeOidValue(value),
            expected: runtime.makeByteaValue(bytes.toString('hex')),
          }).wire,
        ).toEqual({ kind: 'True' })
      }
    }
  }, 300_000)
})
