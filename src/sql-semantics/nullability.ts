import { functionMetadata, operatorMetadata } from '../postgres/builtins/inventory.js'
import { PG18_TYPE_NAMES } from '../postgres/builtins/type-names.generated.js'
import {
  STRICT_TOTAL_BUILTINS,
  STRICT_TOTAL_BUILTIN_SIGNATURES,
  SWEPT_TOTAL_SIGNATURES,
} from '../query/builtin-totality-tables.js'
import {
  NON_TOTAL_OPERATOR_SIGNATURES,
  TOTAL_OPERATORS,
  TOTAL_OPERATOR_SIGNATURES,
} from '../query/operators.js'

export interface NullabilityClassification {
  strict: boolean
  nonNullInputs: 'total' | 'can-return-null' | 'unclassified'
}

const typeName = (type: string): string => {
  const name = PG18_TYPE_NAMES[type as keyof typeof PG18_TYPE_NAMES]
  if (!name) throw new Error(`Unknown builtin type: ${type}`)
  return name
}

export function functionNullability(signature: string): NullabilityClassification {
  const metadata = functionMetadata(signature)
  const key = `${metadata.name}(${metadata.args.map(typeName).join(',')})`
  return {
    strict: metadata.strict,
    nonNullInputs:
      metadata.kind === 'function' &&
      (STRICT_TOTAL_BUILTINS.has(metadata.name) ||
        STRICT_TOTAL_BUILTIN_SIGNATURES.has(key) ||
        SWEPT_TOTAL_SIGNATURES.has(key))
        ? 'total'
        : 'unclassified',
  }
}

export function operatorNullability(signature: string): NullabilityClassification {
  const metadata = operatorMetadata(signature)
  const key = `${metadata.name}(${metadata.left === null ? '' : typeName(metadata.left)},${metadata.right === null ? '' : typeName(metadata.right)})`
  return {
    strict: metadata.strict,
    nonNullInputs: NON_TOTAL_OPERATOR_SIGNATURES.has(key)
      ? 'can-return-null'
      : TOTAL_OPERATORS.has(metadata.name) || TOTAL_OPERATOR_SIGNATURES.has(key)
        ? 'total'
        : 'unclassified',
  }
}
