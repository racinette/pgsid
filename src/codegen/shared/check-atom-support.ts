import { isMoneyNumericConversion } from '../../sql-semantics/money-callables.js'
import { isXmlOptionPredicate } from '../../sql-semantics/xml-callables.js'
import { capturedEnumSupport, isOidAliasType } from '../../sql-semantics/expressions.js'
import type { EvalBoolExpression } from '../../sql-semantics/check-expressions.js'
import type { EvalExpression } from '../../sql-semantics/eval-expressions.js'
import type { SqlBindingGroup } from '../../sql-semantics/signatures.js'
import { checkRustCallableNames } from './check-rust-source.js'
import {
  supportsJsonbConversion,
  isJsonConversion,
  isJsonbBuilder,
  isJsonBuilder,
  isJsonpathTimezoneCallable,
  isCatalogVectorTypeNames,
  isArrayStringIO,
  isArrayBinarySend,
  isRecordBinarySend,
  isRangeBinarySend,
  isMultirangeBinarySend,
} from './check-rust-evaluator.js'
import { builtinCast, builtinMetadata, builtinTypeIO } from '../../postgres/builtins/inventory.js'
import { enumEqualityOperation } from '../../sql-semantics/expressions.js'
import { goSqlBackend } from '../go/sql/registry.js'
import { typescriptSqlBackend } from '../typescript/sql/registry.js'

const signatures = <Ast>(bindings: readonly SqlBindingGroup<Ast>[]): Set<string> =>
  new Set(
    bindings.flatMap((group) => [
      ...Object.keys(group.operators).filter((key) => group.operators[key] !== undefined),
      ...Object.keys(group.functions).filter((key) => group.functions[key] !== undefined),
    ]),
  )
const go = signatures(goSqlBackend.bindings)
const typescript = signatures(typescriptSqlBackend.bindings)
const portable = (signature: string, rustNames: ReadonlySet<string>, rust: boolean): boolean => {
  if (enumEqualityOperation(signature) !== null) return true
  const metadata = builtinMetadata(signature)
  const implementation =
    metadata.kind === 'operator' ? builtinMetadata(metadata.implementation) : metadata
  const conditionalCatalogInput =
    implementation.kind === 'function' &&
    implementation.schema === 'pg_catalog' &&
    implementation.strict &&
    !implementation.returnsSet &&
    implementation.args.length === 1 &&
    implementation.args[0] === 'pg_catalog.text' &&
    isOidAliasType(implementation.result) &&
    rustNames.has(implementation.rustName) &&
    (implementation.name === 'to_' + implementation.result.slice('pg_catalog.'.length) ||
      builtinCast('pg_catalog.text', implementation.result)?.implementation === signature)
  return (
    (metadata.volatility === 'i' ||
      (rust &&
        implementation.kind === 'function' &&
        capturedEnumSupport(implementation) &&
        rustNames.has(implementation.rustName)) ||
      (rust &&
        implementation.kind === 'function' &&
        (isArrayStringIO(implementation) ||
          isArrayBinarySend(implementation) ||
          isRecordBinarySend(implementation) ||
          isRangeBinarySend(implementation) ||
          isMultirangeBinarySend(implementation)) &&
        rustNames.has(implementation.rustName)) ||
      (rust &&
        isJsonpathTimezoneCallable(implementation) &&
        rustNames.has(implementation.rustName)) ||
      (rust &&
        implementation.kind === 'function' &&
        (signature === builtinCast('pg_catalog.text', 'pg_catalog.xml')?.implementation ||
          signature === builtinTypeIO('pg_catalog.xml')?.send ||
          isXmlOptionPredicate(implementation)) &&
        rustNames.has(implementation.rustName)) ||
      (rust &&
        implementation.kind === 'function' &&
        isCatalogVectorTypeNames(implementation) &&
        rustNames.has(implementation.rustName)) ||
      (rust && isJsonbBuilder(implementation) && rustNames.has(implementation.rustName)) ||
      (rust && isJsonBuilder(implementation) && rustNames.has(implementation.rustName)) ||
      (rust && isJsonConversion(implementation) && rustNames.has(implementation.rustName)) ||
      (rust &&
        implementation.kind === 'function' &&
        implementation.schema === 'pg_catalog' &&
        implementation.name === 'to_jsonb' &&
        implementation.strict &&
        implementation.volatility === 's' &&
        !implementation.returnsSet &&
        implementation.args.length === 1 &&
        implementation.args[0] === 'pg_catalog.anyelement' &&
        implementation.result === 'pg_catalog.jsonb' &&
        rustNames.has(implementation.rustName)) ||
      (rust &&
        implementation.kind === 'function' &&
        isMoneyNumericConversion(implementation) &&
        rustNames.has(implementation.rustName)) ||
      conditionalCatalogInput ||
      (implementation.kind === 'function' &&
        implementation.schema === 'pg_catalog' &&
        ['namesend', 'textsend', 'varcharsend', 'bpcharsend'].includes(implementation.name) &&
        implementation.strict &&
        !implementation.returnsSet &&
        implementation.args.length === 1 &&
        implementation.args[0] ===
          {
            namesend: 'pg_catalog.name',
            textsend: 'pg_catalog.text',
            varcharsend: 'pg_catalog."varchar"',
            bpcharsend: 'pg_catalog.bpchar',
          }[implementation.name] &&
        implementation.result === 'pg_catalog.bytea' &&
        rustNames.has(implementation.rustName))) &&
    ((go.has(signature) && typescript.has(signature)) ||
      (implementation.kind === 'function' && rustNames.has(implementation.rustName)))
  )
}

export function portableCheckAtoms(
  expression: EvalBoolExpression,
  rust = true,
): EvalBoolExpression {
  const rustNames = checkRustCallableNames()
  const scalar = (value: EvalExpression): EvalExpression => {
    if (value.kind === 'xml-constructor') return { ...value, operands: value.operands.map(scalar) }
    if (
      (value.kind === 'array-text-literal' || value.kind === 'text-to-array') &&
      (value.conversion || value.inputConversion)
    )
      return {
        ...value,
        ...(value.kind === 'text-to-array' ? { operand: scalar(value.operand) } : {}),
        ...(value.conversion ? { conversion: scalar(value.conversion) } : {}),
        ...(value.inputConversion ? { inputConversion: scalar(value.inputConversion) } : {}),
      }
    if (value.kind === 'array-domain-coerce')
      return { ...value, operand: scalar(value.operand), conversion: scalar(value.conversion) }
    if (value.kind === 'domain-cast')
      return {
        ...value,
        operand: scalar(value.operand),
        checks: value.checks.map((check) => ({ ...check, expression: bool(check.expression) })),
      }
    if (value.kind === 'array-subscript')
      return {
        ...value,
        operand: scalar(value.operand),
        upper: value.upper.map((bound) => (bound ? scalar(bound) : null)),
        lower: value.lower.map((bound) => (bound ? scalar(bound) : null)),
      }
    if (
      value.kind === 'xml-operation' ||
      value.kind === 'clock-to-text' ||
      value.kind === 'text-to-enum' ||
      value.kind === 'text-to-boolean' ||
      value.kind === 'text-to-array' ||
      value.kind === 'array-to-text' ||
      value.kind === 'array-typmod' ||
      value.kind === 'array-coerce' ||
      value.kind === 'array-io-coerce' ||
      value.kind === 'text-to-interval' ||
      value.kind === 'text-to-clock' ||
      value.kind === 'text-to-date' ||
      value.kind === 'text-to-timestamp' ||
      value.kind === 'text-to-timestamptz' ||
      value.kind === 'text-to-network' ||
      value.kind === 'text-to-mac' ||
      value.kind === 'mac-to-text' ||
      value.kind === 'io-to-text' ||
      value.kind === 'refcursor-text-coercion' ||
      value.kind === 'text-to-point' ||
      value.kind === 'text-to-line' ||
      value.kind === 'text-to-lseg' ||
      value.kind === 'text-to-money' ||
      value.kind === 'text-to-tsvector' ||
      value.kind === 'text-to-tsquery' ||
      value.kind === 'text-to-aclitem' ||
      value.kind === 'text-to-xid' ||
      value.kind === 'text-to-cid' ||
      value.kind === 'text-to-pg_lsn' ||
      value.kind === 'text-to-tid' ||
      value.kind === 'text-to-xid8' ||
      value.kind === 'text-to-snapshot' ||
      value.kind === 'text-to-multirange' ||
      value.kind === 'text-to-json' ||
      value.kind === 'text-to-oid' ||
      value.kind === 'text-to-vector' ||
      value.kind === 'text-to-circle' ||
      value.kind === 'text-to-box' ||
      value.kind === 'text-to-uuid' ||
      value.kind === 'text-to-bytea' ||
      value.kind === 'uuid-to-text' ||
      value.kind === 'text-to-float' ||
      value.kind === 'text-to-integer' ||
      value.kind === 'text-to-numeric' ||
      value.kind === 'text-to-bit' ||
      value.kind === 'bit-to-text'
    )
      return { ...value, operand: scalar(value.operand) }
    if (value.kind === 'check') return { ...value, expression: bool(value.expression) }
    if (value.kind === 'call' && value.call.kind === 'cast' && value.call.signature === null)
      return { ...value, operands: value.operands.map(scalar) }
    if (value.kind === 'call' && value.call.signature !== null) {
      const item = builtinMetadata(value.call.signature)
      if (
        item.kind === 'function' &&
        item.schema === 'pg_catalog' &&
        ((item.name === 'to_jsonb' && item.args[0] === 'pg_catalog.anyelement') ||
          isJsonConversion(item) ||
          isJsonbBuilder(item) ||
          isJsonBuilder(item))
      ) {
        for (const operand of value.operands) {
          const type =
            operand?.kind === 'certain'
              ? operand.expression.type
              : operand?.kind === 'call'
                ? operand.call.type
                : operand?.kind === 'regex-count'
                  ? builtinMetadata(operand.signature).result
                  : operand?.type
          if (!type || !supportsJsonbConversion(type))
            return { kind: 'uncertain', type: value.call.type }
        }
      }
    }
    if (value.kind === 'call')
      return value.call.signature !== null && portable(value.call.signature, rustNames, rust)
        ? { ...value, operands: value.operands.map(scalar) }
        : { kind: 'uncertain', type: value.call.type }
    if (
      value.kind === 'boolean-logic' ||
      value.kind === 'coalesce' ||
      value.kind === 'array-constructor'
    )
      return { ...value, operands: value.operands.map(scalar) }
    if (value.kind === 'array-quantifier')
      return { ...value, operands: [scalar(value.operands[0]), scalar(value.operands[1])] }
    if (value.kind === 'membership')
      return {
        ...value,
        subject: scalar(value.subject),
        groups: value.groups.map((group) => group.map(scalar)),
      }
    if (value.kind === 'distinct' || value.kind === 'nullif')
      return value.comparison.signature !== null &&
        portable(value.comparison.signature, rustNames, rust)
        ? { ...value, operands: [scalar(value.operands[0]), scalar(value.operands[1])] }
        : { kind: 'uncertain', type: value.type }
    if (value.kind === 'minmax')
      return value.comparison.signature !== null &&
        portable(value.comparison.signature, rustNames, rust)
        ? { ...value, operands: value.operands.map(scalar) }
        : { kind: 'uncertain', type: value.type }
    if (value.kind === 'row-compare')
      return value.pairs.every(
        (pair) =>
          pair.comparison.signature !== null &&
          portable(pair.comparison.signature, rustNames, rust),
      )
        ? {
            ...value,
            pairs: value.pairs.map((pair) => ({
              ...pair,
              operands: [scalar(pair.operands[0]), scalar(pair.operands[1])],
            })),
          }
        : { kind: 'uncertain', type: value.type }
    if (value.kind === 'null-test') {
      if (!rust && value.operand.kind === 'input' && value.operand.type.startsWith('array:'))
        return {
          kind: 'input-null-test',
          type: value.type,
          name: value.operand.name,
          negated: value.negated,
        }
      return { ...value, operand: scalar(value.operand) }
    }
    if (value.kind === 'case')
      return {
        ...value,
        ...(value.scrutinee
          ? { scrutinee: { ...value.scrutinee, expression: scalar(value.scrutinee.expression) } }
          : {}),
        branches: value.branches.map((branch) => ({
          ...branch,
          when: scalar(branch.when),
          then: scalar(branch.then),
        })),
        otherwise: scalar(value.otherwise),
      }
    if (value.kind === 'regex-count') return { ...value, operands: value.operands.map(scalar) }
    return value
  }
  const bool = (value: EvalBoolExpression): EvalBoolExpression => {
    if (value.kind === 'eval-scalar') return { ...value, expression: scalar(value.expression) }
    if (value.kind === 'eval-boolean-logic') return { ...value, operands: value.operands.map(bool) }
    if (value.kind === 'eval-case')
      return {
        ...value,
        branches: value.branches.map((branch) => ({
          when: bool(branch.when),
          then: bool(branch.then),
        })),
        otherwise: bool(value.otherwise),
      }
    if (value.kind === 'eval-test') return { ...value, operand: bool(value.operand) }
    if (value.kind === 'eval-comparison')
      return {
        ...value,
        operands: value.operands.map(bool) as [EvalBoolExpression, EvalBoolExpression],
      }
    return value
  }
  return bool(expression)
}
