import { scalar, type Tree } from './expression-tree.js'
import { storedReferenceBytes } from './constant-storage-bytes.js'

export interface AclitemConstantKnowledge {
  privileges: string
  grantOptions: string
  publicGrantee: boolean
  invalidGrantor: boolean
}

export function validAclitemConstantKnowledge(value: unknown): value is AclitemConstantKnowledge {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const input = value as AclitemConstantKnowledge
  return (
    typeof input.publicGrantee === 'boolean' &&
    typeof input.invalidGrantor === 'boolean' &&
    [input.privileges, input.grantOptions].every(
      (word) =>
        typeof word === 'string' &&
        /^(?:0|[1-9][0-9]{0,9})$/u.test(word) &&
        BigInt(word) <= 4294967295n,
    )
  )
}

export function storedAclitemKnowledge(
  node: Tree,
  byteOrder: 'little' | 'big',
): AclitemConstantKnowledge | null | undefined {
  if (scalar(node, 'constisnull') === 'true') return null
  const bytes = storedReferenceBytes(node, 16)
  if (!bytes) return undefined
  const word = (at: number) =>
      byteOrder === 'little' ? bytes.readUInt32LE(at) : bytes.readUInt32BE(at),
    mode = byteOrder === 'little' ? bytes.readBigUInt64LE(8) : bytes.readBigUInt64BE(8)
  return {
    privileges: (mode & 4294967295n).toString(),
    grantOptions: (mode >> 32n).toString(),
    publicGrantee: word(0) === 0,
    invalidGrantor: word(4) === 0,
  }
}
