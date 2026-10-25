import { rustStringLiteral } from '../../src/codegen/shared/rust-literals.js'

export interface TsqueryInputNode {
  kind: number
  text: string
  weight: number
  prefix: boolean
  distance: number
  left: number
  right: number
}

export interface TsqueryInputPayload {
  nodes: TsqueryInputNode[]
  root: number
  nativeBytes: number
}

export function tsqueryRustPayload(value: TsqueryInputPayload): string {
  return `TsqueryPayload {nodes:vec![${value.nodes.map(tsqueryRustNode).join(',')}],root:${value.root},native_bytes:${value.nativeBytes}}`
}

export function tsqueryRustNode(node: TsqueryInputNode): string {
  return `TsqueryNode {kind:${node.kind},text:${rustStringLiteral(node.text)}.to_owned(),weight:${node.weight},prefix:${node.prefix},distance:${node.distance},left:${node.left},right:${node.right}}`
}
