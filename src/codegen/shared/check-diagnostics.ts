import {
  arrayElementBaseType,
  arrayLikeElementType,
  isArrayLikeType,
} from '../../sql-semantics/expressions.js'
import { anonymousRecordProfile } from '../../sql-semantics/anonymous-records.js'
import { compositeProfile, compositeFieldType } from '../../sql-semantics/composite-profiles.js'
import type { EvalBoolExpression } from '../../sql-semantics/check-expressions.js'
import type { CheckExecutionContext } from './check-rust-evaluator.js'
import { circlePolygonTrigonometry } from './check-trigonometry-context.js'
import { builtinCallables } from '../../postgres/builtins/inventory.js'
import { callableIdentity } from '../../postgres/builtins/catalog.js'

const trigonometry = new Set(
  builtinCallables().filter(circlePolygonTrigonometry).map(callableIdentity),
)
function needsTrigonometry(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  return Object.entries(value).some(
    ([key, item]) =>
      (key === 'signature' && typeof item === 'string' && trigonometry.has(item)) ||
      needsTrigonometry(item),
  )
}

const jsonConversions = new Set(
  builtinCallables()
    .filter(
      (item) =>
        item.kind === 'function' &&
        item.schema === 'pg_catalog' &&
        [
          'to_json',
          'to_jsonb',
          'array_to_json',
          'row_to_json',
          'json_build_array',
          'jsonb_build_array',
          'json_build_object',
          'jsonb_build_object',
        ].includes(item.name),
    )
    .map(callableIdentity),
)
function jsonRendersAcl(type: string, seen = new Set<string>()): boolean {
  type = arrayElementBaseType(type)
  if (type === 'pg_catalog.aclitem') return true
  if (seen.has(type)) return false
  seen.add(type)
  if (isArrayLikeType(type)) return jsonRendersAcl(arrayLikeElementType(type)!, seen)
  const anonymous = anonymousRecordProfile(type)
  if (anonymous)
    return anonymous.some((layout) =>
      layout.fields.some((field) => jsonRendersAcl(field.type, seen)),
    )
  const profile = compositeProfile(type),
    root = profile?.graph.definitions.find((definition) => definition.identity === profile.identity)
  return !!(
    profile &&
    root?.fields.some((field) => {
      const type = compositeFieldType(profile, field.type)
      return type !== null && jsonRendersAcl(type, seen)
    })
  )
}

function needsAclRoleCatalog(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const node = value as {
    kind?: string
    call?: { signature?: string | null }
    operands?: { type?: string }[]
  }
  if (
    node.kind === 'call' &&
    node.call?.signature &&
    jsonConversions.has(node.call.signature) &&
    node.operands?.some((operand) => operand.type !== undefined && jsonRendersAcl(operand.type))
  )
    return true
  if (
    'kind' in value &&
    (value.kind === 'text-to-aclitem' ||
      (value.kind === 'aclitem' && 'value' in value && typeof value.value === 'string') ||
      (value.kind === 'io-to-text' &&
        'operand' in value &&
        value.operand !== null &&
        typeof value.operand === 'object' &&
        'type' in value.operand &&
        value.operand.type === 'pg_catalog.aclitem'))
  )
    return true
  return Object.values(value).some(needsAclRoleCatalog)
}

export function checkUnknownMessage(
  expression: EvalBoolExpression,
  reason?: string,
  context: CheckExecutionContext = {},
): string {
  if (expression.kind === 'uncertain')
    return 'This CHECK expression is not supported by the local evaluator.'
  if (reason) return `Local evaluation is incomplete: ${reason}`
  let message =
    'A required input is unavailable, or its value or an evaluated expression is not supported.'
  if (needsAclRoleCatalog(expression))
    message += ' ACL text and JSON conversion can also depend on the deployment role catalog.'
  return context.trigonometry !== 'fdlibm' && needsTrigonometry(expression)
    ? message +
        ' Circle-to-polygon coordinate generation also requires sql.codegen.checks.trigonometry: fdlibm.'
    : message
}
