import { scalar, type Tree } from './expression-tree.js'
import { storedReferenceBytes } from './constant-storage-bytes.js'
import { storedTextConstant } from './text-constant-storage.js'

export type TextLikeConstantStorage =
  | { type: 'pg_catalog."char"'; value: number }
  | { type: 'pg_catalog.name' | 'pg_catalog.refcursor'; value: string }

export function validTextLikeConstantStorage(value: unknown): value is TextLikeConstantStorage {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const object = value as Record<string, unknown>,
    item = object['value']
  if (object['type'] === 'pg_catalog."char"')
    return typeof item === 'number' && Number.isInteger(item) && item >= 0 && item <= 255
  return (
    ['pg_catalog.name', 'pg_catalog.refcursor'].includes(object['type'] as string) &&
    typeof item === 'string' &&
    !item.includes('\0') &&
    !/[\uD800-\uDFFF]/u.test(item)
  )
}

export function storedTextLikeConstant(
  node: Tree,
  type: TextLikeConstantStorage['type'],
  byteOrder: 'little' | 'big',
  utf8: boolean,
): TextLikeConstantStorage | null | undefined {
  if (scalar(node, 'constisnull') === 'true') return null
  if (type === 'pg_catalog."char"') {
    const raw = node.fields['constvalue'],
      data = raw?.[1]
    if (
      scalar(node, 'constisnull') !== 'false' ||
      scalar(node, 'constbyval') !== 'true' ||
      scalar(node, 'constlen') !== '1' ||
      raw?.length !== 2 ||
      raw[0] !== '1' ||
      !Array.isArray(data) ||
      ![4, 8].includes(data.length) ||
      data.some((v) => typeof v !== 'string' || !/^-?\d+$/u.test(v) || +v < -128 || +v > 255)
    )
      return undefined
    return { type, value: Number(byteOrder === 'little' ? data[0] : data.at(-1)) & 255 }
  }
  if (type === 'pg_catalog.refcursor') {
    const value = storedTextConstant(node, utf8, byteOrder)
    return typeof value === 'string' ? { type, value } : undefined
  }
  const width = scalar(node, 'constlen')
  if (!width || !/^[1-9][0-9]*$/u.test(width) || !Number.isSafeInteger(Number(width)))
    return undefined
  const bytes = storedReferenceBytes(node, Number(width)),
    end = bytes?.indexOf(0)
  if (!bytes || end === undefined || end < 0) return undefined
  const body = bytes.subarray(0, end),
    value = body.toString('utf8')
  return (!utf8 && body.some((b) => b > 127)) || !Buffer.from(value, 'utf8').equals(body)
    ? undefined
    : { type, value }
}
