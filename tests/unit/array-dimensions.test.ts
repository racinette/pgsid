import { describe, expect, it } from 'vitest'
import { parseConfigString } from '../../src/config/loader.js'
import { printNode } from '../../src/codegen/typescript/ast.js'
import { resolveTypescriptPgType } from '../../src/codegen/typescript/type-mapping.js'
import { resolveGoPgType } from '../../src/codegen/go/type-mapping.js'
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

  it('wraps only the nullable SQL element, and keeps custom element mappings', () => {
    const type = resolveTypescriptPgType(
      'integer[]',
      config,
      undefined,
      undefined,
      undefined,
      undefined,
      [1, 2],
    ).type
    expect(printNode(type)).toBe('(number | null)[] | (number | null)[][]')
    const mapped = parseConfigString(
      'schema: schema.sql\nsql:\n  codegen:\n    typescript:\n      mappings:\n        pgType:\n          pg_catalog.int4: bigint',
    )
    expect(
      printNode(
        resolveTypescriptPgType('integer[]', mapped, undefined, undefined, undefined, undefined, 2)
          .type,
      ),
    ).toBe('(bigint | null)[][]')
  })

  it('uses nested Go slices for fixed depths and pgtype.Array for an explicit union', () => {
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
      undefined,
      [1, 2],
    )
    const source = printGoFile({
      package: 'arrays',
      imports: union.imports.map((item) => ({ path: item.path })),
      declarations: [go.type('Cube', fixed.type), go.type('Flexible', union.type)],
    })
    expect(source).toContain('type Cube [][][]int32')
    expect(source).toContain('type Flexible pgtype.Array[int32]')
    expect(union.arrayDimensions).toEqual([1, 2])
  })

  it('rejects dimension annotations combined with complete PostgreSQL array type overrides', () => {
    for (const target of ['typescript', 'go']) {
      const overridden = parseConfigString(
        `schema: schema.sql\nsql:\n  codegen:\n    ${target}:\n      mappings:\n        pgType:\n          integer[]: CustomArray`,
      )
      const resolve = target === 'go' ? resolveGoPgType : resolveTypescriptPgType
      expect(() =>
        resolve('integer[]', overridden, undefined, undefined, undefined, undefined, 2),
      ).toThrow('map the element type instead')
    }
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
