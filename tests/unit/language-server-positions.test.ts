import { describe, expect, it } from 'vitest'
import {
  byteOffsetToPosition,
  positionToByteOffset,
} from '../../src/language-server/positions.js'

describe('language-server positions', () => {
  it('converts between UTF-8 bytes and UTF-16 cursor positions', () => {
    const content = Buffer.from('é🙂x\r\nnext')
    const afterEmoji = Buffer.byteLength('é🙂')

    expect(byteOffsetToPosition(content, afterEmoji)).toEqual({ line: 0, character: 3 })
    expect(positionToByteOffset(content, { line: 0, character: 3 })).toBe(afterEmoji)
    expect(positionToByteOffset(content, { line: 0, character: 99 })).toBe(
      Buffer.byteLength('é🙂x'),
    )
    expect(positionToByteOffset(content, { line: 1, character: 2 })).toBe(
      Buffer.byteLength('é🙂x\r\nne'),
    )
  })
})
