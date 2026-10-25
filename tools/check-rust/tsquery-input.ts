import { go, type GoExpression } from '../../src/codegen/go/ast.js'
import { rustStringLiteral } from '../../src/codegen/shared/rust-literals.js'

import type {
  TsqueryConstantNode,
  TsqueryConstantStorage,
} from '../../src/catalog/tsquery-constant-storage.js'
export type TsqueryInputNode = TsqueryConstantNode
export type TsqueryInputPayload = TsqueryConstantStorage

export function tsqueryRustPayload(value: TsqueryInputPayload): string {
  return `TsqueryPayload {nodes:vec![${value.nodes.map(tsqueryRustNode).join(',')}],root:${value.root},native_bytes:${value.nativeBytes}}`
}

export function tsqueryRustNode(node: TsqueryInputNode): string {
  return `TsqueryNode {kind:${node.kind},text:${rustStringLiteral(node.text)}.to_owned(),weight:${node.weight},prefix:${node.prefix},distance:${node.distance},left:${node.left},right:${node.right}}`
}

export function tsqueryGoPayload(value: TsqueryInputPayload): GoExpression {
  const runtime = (name: string) => go.selector(go.ident('checkruntime'), name)
  return go.composite(runtime('TsqueryPayload'), [
    go.keyValue(
      'Nodes',
      go.composite(
        go.slice(runtime('TsqueryNode')),
        value.nodes.map((node) =>
          go.composite(runtime('TsqueryNode'), [
            go.keyValue('Kind', go.number(node.kind)),
            go.keyValue('Text', go.string(node.text)),
            go.keyValue('Weight', go.number(node.weight)),
            go.keyValue('Prefix', go.ident(String(node.prefix))),
            go.keyValue('Distance', go.number(node.distance)),
            go.keyValue('Left', go.number(node.left)),
            go.keyValue('Right', go.number(node.right)),
          ]),
        ),
      ),
    ),
    go.keyValue('Root', go.number(value.root)),
    go.keyValue('NativeBytes', go.number(value.nativeBytes)),
  ])
}
