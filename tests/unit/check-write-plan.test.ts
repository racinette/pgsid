import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import ts from 'typescript'
import { parseSql } from '../../src/ast.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { planCheckInputs, planCheckWrite } from '../../src/codegen/shared/check-inputs.js'
import { checkTriggerWarning } from '../../src/codegen/shared/check-trigger-warning.js'
import { renderTypescriptSchemaChecks } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { renderTypescriptSchemaArtifacts } from '../../src/codegen/typescript/schema.js'
import { renderGoSchemaArtifacts } from '../../src/codegen/go/schema.js'
import { parseConfigString } from '../../src/config/loader.js'
import type { CatalogSnapshot } from '../../src/catalog/types.js'
import type { WriteValueLineage, ValueLineage } from '../../src/query/value-lineage.js'

let db: PGlite
let catalog: CatalogSnapshot

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    CREATE TABLE check_boundary (
      id integer PRIMARY KEY,
      i integer DEFAULT 1 NOT NULL,
      j integer NOT NULL,
      CONSTRAINT positive_i CHECK (i > 0),
      CONSTRAINT positive_j CHECK (j > 0)
    );
    CREATE DOMAIN bounded_label AS varchar(3);
    CREATE DOMAIN nested_label AS bounded_label;
    CREATE TABLE text_boundary (
      short varchar(3) CHECK (short = 'abc'),
      fixed char(3) CHECK (fixed = 'abc'),
      nested nested_label CHECK (nested = 'abc'),
      unbounded varchar CHECK (unbounded = 'abc')
    );
    CREATE DOMAIN mask_boundary AS bit(8);
    CREATE TABLE bit_boundary (
      fixed bit(8) CHECK (fixed = B'00001111'),
      varying bit varying CHECK (varying = B'00000000'),
      nested mask_boundary CHECK (nested = B'00001111')
    )
  `)
  catalog = await snapshotCatalog(db)
})

afterAll(async () => {
  await db?.close()
})

const statement = async (sql: string) => (await parseSql(sql)).stmts![0]!.stmt!
const parameter = (number: number): ValueLineage => ({
  kind: 'parameter',
  number,
  resolvedType: 'pg_catalog.int4',
})
const write = (
  column: string,
  source: 'insert' | 'update',
  value: ValueLineage,
): WriteValueLineage => ({
  target: { schema: 'public', relation: 'check_boundary', column },
  source,
  value,
  partial: false,
})
const sources = (plan: ReturnType<typeof planCheckWrite>) =>
  Object.fromEntries(plan?.columns.map(({ name, source }) => [name, source]) ?? [])

describe('CHECK write boundary', () => {
  it('defers raw bit inputs until SQL notation and assignment widths are coerced', async () => {
    const insert = await statement(
      'INSERT INTO bit_boundary (fixed, varying, nested) VALUES ($1, $2, $3)',
    )
    const writes: WriteValueLineage[] = ['fixed', 'varying', 'nested'].map((column, index) => ({
      target: { schema: 'public', relation: 'bit_boundary', column },
      source: 'insert',
      value: parameter(index + 1),
      partial: false,
    }))
    expect(
      planCheckInputs(insert, writes, catalog, ['bit(8)', 'bit varying', 'mask_boundary']),
    ).toEqual([])
    expect(
      (
        await db.query(
          'INSERT INTO bit_boundary VALUES ($1,$2,$3) RETURNING fixed,varying,nested',
          ['x0f', 'X00', 'B00001111'],
        )
      ).rows,
    ).toEqual([{ fixed: '00001111', varying: '00000000', nested: '00001111' }])
  })
  it('defers raw bounded varchar and char inputs until assignment coercion is modeled', async () => {
    const insert = await statement(
      'INSERT INTO text_boundary (short, fixed, nested, unbounded) VALUES ($1, $2, $3, $4)',
    )
    const writes: WriteValueLineage[] = ['short', 'fixed', 'nested', 'unbounded'].map(
      (column, index) => ({
        target: { schema: 'public', relation: 'text_boundary', column },
        source: 'insert',
        value: parameter(index + 1),
        partial: false,
      }),
    )
    const plans = planCheckInputs(insert, writes, catalog, [
      'character varying',
      'character',
      'nested_label',
      'character varying',
    ])
    expect(plans[0]?.columns).toEqual([{ name: 'unbounded', parameter: 4 }])
    expect(
      (
        await db.query(
          'INSERT INTO text_boundary (short, fixed, nested, unbounded) VALUES ($1, $2, $3, $4) RETURNING short, fixed, nested',
          ['abc   ', 'abc   ', 'abc   ', 'abc'],
        )
      ).rows,
    ).toEqual([{ short: 'abc', fixed: 'abc', nested: 'abc' }])
  })
  it('keeps omitted, DEFAULT, explicit NULL, and parameter values distinct on INSERT', async () => {
    const omitted = await statement('INSERT INTO check_boundary (id, j) VALUES (1, $1)')
    const omittedWrites = [write('j', 'insert', parameter(1))]
    expect(sources(planCheckWrite(omitted, omittedWrites, catalog, ['pg_catalog.int4']))).toEqual({
      i: { kind: 'default' },
      j: { kind: 'parameter', number: 1 },
    })
    expect(
      planCheckInputs(omitted, omittedWrites, catalog, ['pg_catalog.int4'])[0]?.columns,
    ).toEqual([{ name: 'j', parameter: 1 }])

    const explicitDefault = await statement(
      'INSERT INTO check_boundary (id, i, j) VALUES (1, DEFAULT, $1)',
    )
    expect(
      sources(planCheckWrite(explicitDefault, omittedWrites, catalog, ['pg_catalog.int4'])),
    ).toEqual({ i: { kind: 'default' }, j: { kind: 'parameter', number: 1 } })

    const explicitNull = await statement(
      'INSERT INTO check_boundary (id, i, j) VALUES (1, NULL, $1)',
    )
    expect(
      sources(
        planCheckWrite(
          explicitNull,
          [
            write('i', 'insert', { kind: 'literal', value: null, resolvedType: null }),
            ...omittedWrites,
          ],
          catalog,
          ['pg_catalog.int4'],
        ),
      ),
    ).toEqual({ i: { kind: 'sql-null' }, j: { kind: 'parameter', number: 1 } })

    expect(
      (await db.query('INSERT INTO check_boundary (id, j) VALUES (1, 2) RETURNING i')).rows,
    ).toEqual([{ i: 1 }])
    await expect(
      db.query('INSERT INTO check_boundary (id, i, j) VALUES (2, $1, 2)', [null]),
    ).rejects.toMatchObject({
      code: '23502',
    })
    const missingRequired = await statement('INSERT INTO check_boundary (id, i) VALUES (3, 1)')
    expect(sources(planCheckWrite(missingRequired, [], catalog, []))).toEqual({
      i: { kind: 'unknown' },
      j: { kind: 'sql-null' },
    })
    await expect(
      db.query('INSERT INTO check_boundary (id, i) VALUES (3, 1)'),
    ).rejects.toMatchObject({
      code: '23502',
    })

    const rewritten: CatalogSnapshot = {
      ...catalog,
      tables: catalog.tables.map((table) =>
        table.name === 'check_boundary'
          ? {
              ...table,
              writeRewritesTree: {
                ...table.writeRewritesTree,
                beforeRow: [...table.writeRewritesTree.beforeRow, 'insert'],
              },
            }
          : table,
      ),
    }
    const afterTrigger = planCheckWrite(omitted, omittedWrites, rewritten, ['pg_catalog.int4'])
    expect(sources(afterTrigger)).toEqual({
      i: { kind: 'default' },
      j: { kind: 'parameter', number: 1 },
    })
    expect(afterTrigger?.canPrevalidate).toBe(true)
    expect(
      planCheckInputs(omitted, omittedWrites, rewritten, ['pg_catalog.int4'])[0]?.columns,
    ).toEqual([{ name: 'j', parameter: 1 }])

    const table = rewritten.tables.find((item) => item.name === 'check_boundary')!
    expect(checkTriggerWarning(table, 'insert')).toContain('BEFORE INSERT')
    expect(checkTriggerWarning(table, 'update')).toBeNull()
    const config = parseConfigString(`
      schema: migrations/*.sql
      sql:
        codegen:
          typescript:
            schema: { outDir: generated }
          go:
            schema: { outDir: generated, importPath: example/db }
    `)
    const typescript = renderTypescriptSchemaArtifacts(rewritten, config, {}, '/generated')
    expect(typescript.diagnostics).toMatchObject([
      { code: 'check-before-trigger', severity: 'warning' },
    ])
    expect(typescript.artifacts.some((item) => item.path.endsWith('/checks.ts'))).toBe(true)
    const go = renderGoSchemaArtifacts(rewritten, config, {}, '/generated', 'example/db')
    expect(go.diagnostics).toMatchObject([{ code: 'check-before-trigger', severity: 'warning' }])
    expect(go.artifacts.some((item) => item.path.endsWith('/checks.go'))).toBe(true)
  })

  it('marks untouched UPDATE columns as previous and never prevalidates a possible zero-row write', async () => {
    const update = await statement('UPDATE check_boundary SET j = $1 WHERE id = $2')
    const writes = [write('j', 'update', parameter(1))]
    const plan = planCheckWrite(update, writes, catalog, ['pg_catalog.int4', 'pg_catalog.int4'])
    expect(sources(plan)).toEqual({
      i: { kind: 'previous' },
      j: { kind: 'parameter', number: 1 },
    })
    expect(plan?.canPrevalidate).toBe(false)
    expect(
      planCheckInputs(update, writes, catalog, ['pg_catalog.int4', 'pg_catalog.int4']),
    ).toEqual([])
    expect(
      (await db.query('UPDATE check_boundary SET j = $1 WHERE id = $2', [-1, -999])).affectedRows,
    ).toBe(0)

    const reset = await statement('UPDATE check_boundary SET i = DEFAULT, j = $1 WHERE id = $2')
    expect(
      sources(planCheckWrite(reset, writes, catalog, ['pg_catalog.int4', 'pg_catalog.int4'])),
    ).toEqual({ i: { kind: 'default' }, j: { kind: 'parameter', number: 1 } })
    expect(
      (await db.query('UPDATE check_boundary SET i = DEFAULT WHERE id = 1 RETURNING i')).rows,
    ).toEqual([{ i: 1 }])
    await expect(db.query('UPDATE check_boundary SET i = NULL WHERE id = 1')).rejects.toMatchObject(
      {
        code: '23502',
      },
    )
    const explicitNull = await statement('UPDATE check_boundary SET i = NULL WHERE id = 1')
    expect(
      sources(
        planCheckWrite(
          explicitNull,
          [write('i', 'update', { kind: 'literal', value: null, resolvedType: null })],
          catalog,
          [],
        ),
      ),
    ).toEqual({ i: { kind: 'sql-null' }, j: { kind: 'previous' } })
  })

  it('types a partial CHECK row independently of stored NOT NULL columns', async () => {
    const table = catalog.tables.find((item) => item.name === 'check_boundary')!
    const checks = renderTypescriptSchemaChecks([table], catalog.domains, [], {
      typedInputs: true,
    })
    const root = await mkdtemp(join(tmpdir(), 'pgsid-check-types-'))
    try {
      await mkdir(join(root, 'public'))
      await writeFile(join(root, 'public/checks.ts'), checks)
      await writeFile(
        join(root, 'helpers.d.ts'),
        'export interface TableTypes<S, I, U> { select: S; insert: I; update: U }\nexport type InferSelect<T extends TableTypes<unknown, unknown, unknown>> = T["select"]',
      )
      await writeFile(
        join(root, 'public/tables.d.ts'),
        'import type { TableTypes } from "../helpers.js"; export type CheckBoundary = TableTypes<{ id: number; i: number; j: number }, unknown, unknown>',
      )
      await writeFile(
        join(root, 'usage.ts'),
        'import type { PublicCheckBoundaryCheckInput } from "./public/checks.js"; const partial: PublicCheckBoundaryCheckInput = { i: null }; void partial; // @ts-expect-error wrong scalar\nconst invalid: PublicCheckBoundaryCheckInput = { i: "bad" }; void invalid',
      )
      const program = ts.createProgram([join(root, 'public/checks.ts'), join(root, 'usage.ts')], {
        strict: true,
        noEmit: true,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        types: [],
      })
      expect(
        ts
          .getPreEmitDiagnostics(program)
          .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')),
      ).toEqual([])
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
