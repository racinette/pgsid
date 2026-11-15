import type { CallableMetadata } from '../../../../src/postgres/builtins/catalog.js'

type CallableInventory = Readonly<Record<string, CallableMetadata>>

export type CallableSignatures<
  Inventory extends CallableInventory,
  Kind extends CallableMetadata['kind'],
> = {
  [K in keyof Inventory]: Inventory[K]['kind'] extends Kind ? K : never
}[keyof Inventory]

export type OperatorSignatures<Inventory extends CallableInventory> = CallableSignatures<
  Inventory,
  'operator'
>
export type FunctionSignatures<Inventory extends CallableInventory> = CallableSignatures<
  Inventory,
  'function' | 'aggregate' | 'window'
>
