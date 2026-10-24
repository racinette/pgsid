import { go, type GoExpression } from '../../src/codegen/go/ast.js'
import { rustStringLiteral } from '../../src/codegen/shared/rust-literals.js'

export interface TsvectorInputPayload {
  lexemes: { text: string; positions: { position: number; weight: number }[] }[]
  nativeBytes: number
}
export function tsvectorRustPayload(value: TsvectorInputPayload): string {
  const lexemes = value.lexemes.map(
    (l) =>
      `TsvectorLexeme {text:${rustStringLiteral(l.text)}.to_owned(),positions:vec![${l.positions.map((p) => `TsvectorPosition {position:${p.position},weight:${p.weight}}`).join(',')}]}`,
  )
  return `TsvectorPayload {lexemes:vec![${lexemes.join(',')}],native_bytes:${value.nativeBytes}}`
}
export function tsvectorGoPayload(value: TsvectorInputPayload): GoExpression {
  const runtime = (name: string) => go.selector(go.ident('checkruntime'), name)
  return go.composite(runtime('TsvectorPayload'), [
    go.keyValue('NativeBytes', go.number(value.nativeBytes)),
    go.keyValue(
      'Lexemes',
      go.composite(
        go.slice(runtime('TsvectorLexeme')),
        value.lexemes.map((l) =>
          go.composite(runtime('TsvectorLexeme'), [
            go.keyValue('Text', go.string(l.text)),
            go.keyValue(
              'Positions',
              go.composite(
                go.slice(runtime('TsvectorPosition')),
                l.positions.map((p) =>
                  go.composite(runtime('TsvectorPosition'), [
                    go.keyValue('Position', go.number(p.position)),
                    go.keyValue('Weight', go.number(p.weight)),
                  ]),
                ),
              ),
            ),
          ]),
        ),
      ),
    ),
  ])
}
