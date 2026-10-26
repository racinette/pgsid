import type { Tree } from './expression-tree.js'
import { storedSystemConstant } from './system-constant-storage.js'

export const oidAliasTypes = [
  'pg_catalog.regclass',
  'pg_catalog.regcollation',
  'pg_catalog.regconfig',
  'pg_catalog.regdictionary',
  'pg_catalog.regnamespace',
  'pg_catalog.regoper',
  'pg_catalog.regoperator',
  'pg_catalog.regproc',
  'pg_catalog.regprocedure',
  'pg_catalog.regrole',
  'pg_catalog.regtype',
] as const
export type OidAliasType = (typeof oidAliasTypes)[number]

export const isOidAliasType = (type: string | null | undefined): type is OidAliasType =>
  oidAliasTypes.some((candidate) => candidate === type)

export function storedOidAliasZero(
  node: Tree,
  type: OidAliasType,
  byteOrder: 'little' | 'big',
): OidAliasType | null | undefined {
  const value = storedSystemConstant(node, 'pg_catalog.oid', byteOrder)
  return value === null ? null : value?.value === '0' ? type : undefined
}
