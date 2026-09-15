import type { Position, Range } from 'vscode-languageserver'

export const byteRangeToRange = (content: Buffer, start: number, end: number): Range => ({
  start: byteOffsetToPosition(content, start),
  end: byteOffsetToPosition(content, end),
})

export const byteOffsetToPosition = (content: Buffer, offset: number): Position => {
  const clamped = Math.max(
    0,
    Math.min(Number.isFinite(offset) ? offset : content.length, content.length),
  )
  const prefix = content.subarray(0, clamped).toString('utf8')
  const lastNewline = prefix.lastIndexOf('\n')
  return {
    line: prefix.match(/\n/gu)?.length ?? 0,
    character: prefix.slice(lastNewline + 1).length,
  }
}

export const positionToByteOffset = (content: Buffer, position: Position): number => {
  const text = content.toString('utf8')
  const lines = text.split('\n')
  const line = Math.max(0, Math.min(position.line, lines.length - 1))
  let offset = 0
  for (let index = 0; index < line; index++) offset += lines[index]!.length + 1
  const textLine = lines[line]!.replace(/\r$/u, '')
  offset += Math.max(0, Math.min(position.character, textLine.length))
  return Buffer.byteLength(text.slice(0, offset), 'utf8')
}
