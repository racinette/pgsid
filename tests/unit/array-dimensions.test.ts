import { describe, expect, it } from 'vitest'
import { parseConfigString } from '../../src/config/loader.js'
import { printNode } from '../../src/codegen/typescript/ast.js'
import { resolveTypescriptPgType } from '../../src/codegen/typescript/type-mapping.js'
import { createGoTypeContext, resolveGoPgType } from '../../src/codegen/go/type-mapping.js'
import { go, printGoFile } from '../../src/codegen/go/ast.js'
import { resolveArrayDimensions } from '../../src/codegen/shared/array-dimensions.js'
import type { ValueLineage } from '../../src/query/value-lineage.js'

const config = parseConfigString(
  'schema: schema.sql\nsql:\n  codegen:\n    go: {}\n    typescript: {}',
)
const column: ValueLineage = {
  kind: 'column',
  column: { schema: 'public', relation: 'arrays', column: 'matrix' },
  resolvedType: 'integer[]',
}
const mappings = { 'public.arrays.matrix': { dimensions: 2 } }

describe('array dimensions', () => {
  it.each([0, -1, 1.5, 7, [], [1, 1], [1, 7]])('rejects invalid dimensions %j', (dimensions) => {
    for (const target of ['typescript', 'go'])
      expect(() =>
        parseConfigString(
          `schema: schema.sql\nsql:\n  codegen:\n    ${target}:\n      mappings:\n        column:\n          public.arrays.matrix: { dimensions: ${JSON.stringify(dimensions)} }`,
        ),
      ).toThrow()
  })

  it.each(['typescript', 'go'])(
    'accepts dimensions-only mappings for %s and rejects conflicting overrides',
    (target) => {
      const yaml = `schema: schema.sql\nsql:\n  codegen:\n    ${target}:\n      mappings:\n        column:\n          public.arrays.matrix: { dimensions: [1, 2] }`
      expect(
        parseConfigString(yaml).sql.codegen?.[target as 'go' | 'typescript']?.mappings.column[
          'public.arrays.matrix'
        ],
      ).toEqual({ dimensions: [1, 2] })
      expect(() =>
        parseConfigString(yaml.replace('dimensions: [1, 2]', 'dimensions: 2, type: Custom')),
      ).toThrow()
      expect(() =>
        parseConfigString(yaml.replace('dimensions: [1, 2]', 'dimensions: 2, jsonSchema: Custom')),
      ).toThrow()
    },
  )

  it('wraps only the nullable SQL element, and has no TypeScript element type mappings', () => {
    const type = resolveTypescriptPgType(
      'integer[]',
      config,
      undefined,
      undefined,
      undefined,
      undefined,
      [1, 2],
    ).type
    // Several counts are told apart by the count, since nesting cannot tell a dimension from a list.
    expect(printNode(type).replace(/\s+/gu, ' ')).toBe(
      '{ readonly dimensions: 1; readonly elements: (number | null)[]; } | { readonly dimensions: 2; readonly elements: (number | null)[][]; }',
    )
    expect(
      printNode(
        resolveTypescriptPgType('integer[]', config, undefined, undefined, undefined, undefined, 2)
          .type,
      ),
    ).toBe('(number | null)[][]')
    // TypeScript owns every value representation, so an element can no longer be remapped.
    expect(() =>
      parseConfigString(
        'schema: schema.sql\nsql:\n  codegen:\n    typescript:\n      mappings:\n        pgType:\n          pg_catalog.int4: bigint',
      ),
    ).toThrow("Unrecognized key(s) in object: 'pgType'")
  })

  it('uses nested Go slices for fixed depths and a shared pgsid interface for a union', () => {
    const fixed = resolveGoPgType(
      'integer[]',
      config,
      undefined,
      undefined,
      undefined,
      undefined,
      3,
    )
    const union = resolveGoPgType(
      'integer[]',
      config,
      undefined,
      undefined,
      undefined,
      createGoTypeContext('example.com/app/schema', config),
      [2, 1],
    )
    const source = printGoFile({
      package: 'arrays',
      imports: union.imports.map((item) => ({ path: item.path, alias: item.as })),
      declarations: [go.type('Cube', fixed.type), go.type('Flexible', union.type)],
    })
    expect(source).toContain('type Cube [][][]int32')
    expect(source).toContain('type Flexible pgsid.Array1Or2[int32]')
    expect(union.arrayDimensions).toEqual([1, 2])
  })

  it('rejects dimension annotations combined with complete PostgreSQL array type overrides', () => {
    const overridden = parseConfigString(
      `schema: schema.sql\nsql:\n  codegen:\n    go:\n      mappings:\n        pgType:\n          integer[]: CustomArray`,
    )
    expect(() =>
      resolveGoPgType('integer[]', overridden, undefined, undefined, undefined, undefined, 2),
    ).toThrow('map the element type instead')
    expect(() =>
      parseConfigString(
        `schema: schema.sql\nsql:\n  codegen:\n    typescript:\n      mappings:\n        pgType:\n          integer[]: CustomArray`,
      ),
    ).toThrow("Unrecognized key(s) in object: 'pgType'")
  })

  it('keeps slices dimensioned and scalar subscripts independent of their source dimensions', () => {
    const access = (slice: boolean): ValueLineage => ({
      kind: 'transform',
      operation: { kind: 'array-access', slice },
      inputs: [column],
      resolvedType: slice ? 'integer[]' : 'integer',
    })
    expect(resolveArrayDimensions(access(true), mappings)).toEqual({ dimensions: 2 })
    expect(resolveArrayDimensions(access(false), mappings)).toBeNull()
    expect(() => resolveArrayDimensions({ ...column, resolvedType: 'integer' }, mappings)).toThrow(
      'requires a PostgreSQL array',
    )
  })

  it('combines source depths across choices without guessing through unknown transformations', () => {
    const ordinary: ValueLineage = { ...column, column: { ...column.column, column: 'ordinary' } }
    const choice: ValueLineage = {
      kind: 'transform',
      operation: { kind: 'choice', form: 'case' },
      inputs: [column, ordinary],
      resolvedType: 'integer[]',
    }
    expect(resolveArrayDimensions(choice, mappings)).toEqual({ dimensions: [1, 2] })
    expect(
      resolveArrayDimensions(
        { ...choice, inputs: [column, { kind: 'unknown', resolvedType: 'integer[]' }] },
        mappings,
      ),
    ).toBeNull()
  })
})
