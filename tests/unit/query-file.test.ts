import { describe, expect, it } from 'vitest'
import {
  mapRewrittenOffset,
  parseQueryFile,
  QueryFileError,
  rewriteNamedParameters,
} from '../../src/query-file.js'

describe('rewriteNamedParameters', () => {
  it('numbers first appearances and reuses repeated names', async () => {
    const rewrite = await rewriteNamedParameters(
      'SELECT @account_id, @label, @account_id, @"Case Sensitive"',
    )
    expect(rewrite.sql).toBe('SELECT $1, $2, $1, $3')
    expect(rewrite.parameters.map(({ name, index }) => ({ name, index }))).toEqual([
      { name: 'account_id', index: 1 },
      { name: 'label', index: 2 },
      { name: 'Case Sensitive', index: 3 },
    ])
    expect(rewrite.parameters[0]!.occurrences).toHaveLength(2)
  })

  it('uses PostgreSQL tokens around strings, comments, dollar quoting, and operators', async () => {
    const rewrite = await rewriteNamedParameters(`
      SELECT '@string', $$@dollar$$, value @> @filter,
             value @ spaced, value@tight,
             /* outer /* @nested */ still */ @actual
      -- @comment
    `)
    expect(rewrite.sql).toContain("'@string', $$@dollar$$")
    expect(rewrite.sql).toContain('value @> $1')
    expect(rewrite.sql).toContain('value @ spaced')
    expect(rewrite.sql).toContain('value$2')
    expect(rewrite.sql).toContain('*/ $3')
    expect(rewrite.parameters.map((parameter) => parameter.name)).toEqual([
      'filter',
      'tight',
      'actual',
    ])
  })

  it('rejects mixing named and positional parameters', async () => {
    await expect(rewriteNamedParameters('SELECT $1, @account_id')).rejects.toMatchObject({
      code: 'mixed-parameters',
      start: 7,
      end: 9,
    })
  })

  it('maps rewritten byte offsets back through changing replacement lengths', async () => {
    const rewrite = await rewriteNamedParameters("SELECT 'é', @long_name, @x")
    expect(rewrite.sql).toBe("SELECT 'é', $1, $2")
    expect(mapRewrittenOffset(rewrite, Buffer.byteLength("SELECT 'é', "))).toBe(
      Buffer.byteLength("SELECT 'é', "),
    )
    expect(mapRewrittenOffset(rewrite, Buffer.byteLength("SELECT 'é', $1, "))).toBe(
      Buffer.byteLength("SELECT 'é', @long_name, "),
    )
  })
})

describe('parseQueryFile', () => {
  it('extracts every command and parses nested statements after rewriting', async () => {
    const parsed = await parseQueryFile(`
      -- name: FindAccount :one
      WITH matching AS (
        SELECT id FROM accounts WHERE tenant_id = @tenant
      )
      SELECT id FROM matching WHERE id = @id;

      -- name: ListAccounts :many
      SELECT id FROM accounts WHERE tenant_id = @tenant;

      -- name: RenameAccount :exec
      UPDATE accounts SET name = @name WHERE id = @id;

      -- name: DeleteAccounts :execrows
      DELETE FROM accounts WHERE tenant_id = @tenant;
    `)

    expect(parsed.queries.map(({ name, command }) => ({ name, command }))).toEqual([
      { name: 'FindAccount', command: 'one' },
      { name: 'ListAccounts', command: 'many' },
      { name: 'RenameAccount', command: 'exec' },
      { name: 'DeleteAccounts', command: 'execrows' },
    ])
    expect(parsed.queries[0]!.sql).toContain('tenant_id = $1')
    expect(parsed.queries[0]!.sql).toContain('id = $2')
    expect(parsed.queries[0]!.stmt).toHaveProperty('SelectStmt')
    expect(parsed.queries[2]!.stmt).toHaveProperty('UpdateStmt')
  })

  it('recognizes annotations only when the comment owns its line', async () => {
    const parsed = await parseQueryFile(`
      -- name: Literal :one
      SELECT '-- name: Fake :many' AS value; -- name: AlsoFake :exec
    `)
    expect(parsed.queries.map((query) => query.name)).toEqual(['Literal'])
  })

  it('rejects duplicate names, empty blocks, multiple statements, and bare SQL', async () => {
    const cases = [
      {
        source: '-- name: Same :one\nSELECT 1;\n-- name: Same :many\nSELECT 2;',
        code: 'duplicate-name',
      },
      { source: '-- name: Empty :one\n', code: 'empty-query' },
      { source: '-- name: Two :many\nSELECT 1; SELECT 2;', code: 'multiple-statements' },
      { source: 'SELECT 0;\n-- name: One :one\nSELECT 1;', code: 'unnamed-statement' },
    ]
    for (const fixture of cases) {
      await expect(parseQueryFile(fixture.source)).rejects.toMatchObject({ code: fixture.code })
    }
  })

  it('reports parse errors in original byte coordinates', async () => {
    const source = "-- name: Broken :one\nSELECT 'é', @long_parameter +;"
    try {
      await parseQueryFile(source)
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(QueryFileError)
      expect(error).toMatchObject({ code: 'parse-error' })
      const diagnostic = error as QueryFileError
      const sourceBytes = Buffer.from(source)
      expect(sourceBytes.subarray(diagnostic.start, diagnostic.end).toString('utf8')).toBe(';')
    }
  })

  it('reports parameter errors in file coordinates', async () => {
    const source = '-- name: Mixed :one\nSELECT $1, @named;'
    await expect(parseQueryFile(source)).rejects.toMatchObject({
      code: 'mixed-parameters',
      start: Buffer.byteLength('-- name: Mixed :one\nSELECT '),
      end: Buffer.byteLength('-- name: Mixed :one\nSELECT $1'),
    })
  })
})
