import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import type { JsonSchemaDocument } from '../../src/config/schema.js'
import type { CatalogSnapshot, DomainInfo } from '../../src/catalog/types.js'
import { parseConfigString } from '../../src/config/loader.js'
import { printNode } from '../../src/codegen/typescript/ast.js'
import { renderTypescriptJsonSchema } from '../../src/codegen/typescript/json-schema.js'
import {
  resolveTypescriptDomainBase,
  resolveTypescriptPgType,
} from '../../src/codegen/typescript/type-mapping.js'

const config = parseConfigString(
  'schema: schema.sql\nsql:\n  codegen:\n    typescript:\n      mappings:\n        pgType:\n          pg_catalog.int8: bigint',
)

const errors = (source: string) => {
  const path = '/tmp/pgsid-typescript-type-corrections.ts'
  const options = { strict: true, noEmit: true, types: [], target: ts.ScriptTarget.ES2022 }
  const host = ts.createCompilerHost(options)
  const original = host.getSourceFile.bind(host)
  host.getSourceFile = (name, languageVersion, onError, createNew) =>
    name === path
      ? ts.createSourceFile(name, 'export {};\n' + source, languageVersion, true)
      : original(name, languageVersion, onError, createNew)
  return ts
    .getPreEmitDiagnostics(ts.createProgram([path], options, host))
    .filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
}

describe('TypeScript type correctness', () => {
  it('allows SQL NULL array elements without making the whole array nullable', () => {
    const type = printNode(resolveTypescriptPgType('int4[]', config).type)
    expect(errors(`type Values = ${type}; const values: Values = [1, null];`)).toEqual([])
    expect(errors(`type Values = ${type}; const values: Values = null;`)).not.toEqual([])
  })

  it('keeps nested domain brands inhabitable and distinct', () => {
    const parent: DomainInfo = {
      schema: 'public',
      name: 'user_id',
      oid: 9000,
      baseTypeOid: 20,
      baseTypeName: 'bigint',
      notNull: false,
      default: null,
      checks: [],
    }
    const child: DomainInfo = {
      schema: 'public',
      name: 'owner_id',
      oid: 9001,
      baseTypeOid: 9000,
      baseTypeName: 'public.user_id',
      notNull: false,
      default: null,
      checks: [],
    }
    const catalog = { domains: [parent, child], enums: [] } as unknown as CatalogSnapshot
    const parentType = printNode(resolveTypescriptDomainBase(parent, catalog, config).type)
    const childType = printNode(resolveTypescriptDomainBase(child, catalog, config).type)
    expect(
      errors(`
      type UserId = ${parentType}; type OwnerId = ${childType};
      type IsNever = [OwnerId] extends [never] ? true : false;
      const inhabitable: IsNever = false;
      declare const owner: OwnerId;
      const scalar: bigint = owner;
    `),
    ).toEqual([])
    expect(
      errors(
        `type UserId = ${parentType}; type OwnerId = ${childType}; declare const owner: OwnerId; const user: UserId = owner;`,
      ),
    ).not.toEqual([])
  })

  it('preserves recursive JSON property constraints', () => {
    const schema = {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'integer' }, next: { $ref: '#' } },
      additionalProperties: false,
    }
    const type = renderTypescriptJsonSchema(schema, { rootName: 'Node' })
    expect(
      errors(`type Node = ${type}; const value: Node = {id: 1, next: {id: 2, next: {id: 3}}};`),
    ).toEqual([])
    expect(
      errors(`type Node = ${type}; const value: Node = {id: 1, next: {id: 2, next: {id: "bad"}}};`),
    ).not.toEqual([])
  })

  it.each<JsonSchemaDocument>([
    { properties: { id: { type: 'integer' } }, additionalProperties: false },
    { items: { type: 'integer' } },
    {
      properties: { id: { type: 'integer' } },
      additionalProperties: false,
      items: { type: 'integer' },
    },
  ])('keeps non-object and non-array JSON values when type is absent', (schema) => {
    const type = renderTypescriptJsonSchema(schema)
    expect(errors(`type Value = ${type}; const values: Value[] = [7, "ok", true, null];`)).toEqual(
      [],
    )
  })
})
