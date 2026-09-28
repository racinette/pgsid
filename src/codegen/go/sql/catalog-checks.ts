import type { DomainInfo, TableInfo } from '../../../catalog/types.js'
import { catalogCheckGroups } from '../../../sql-semantics/catalog-checks.js'
import { emitEvalBoolExpression } from '../../../sql-semantics/check-expressions.js'
import { portableCheckAtoms } from '../../shared/check-atom-support.js'
import { go, printGoFile, type GoExpression } from '../ast.js'
import { goName } from '../names.js'
import { goEvalBoolBackend } from './check.js'
import { goSqlBackend } from './registry.js'
import { goSqlRuntime } from './runtime.js'

export function renderGoSchemaChecks(
  tables: readonly TableInfo[],
  packageName: string,
  domains: readonly DomainInfo[] = [],
  selectedDomains: readonly DomainInfo[] = domains,
): string {
  const groups = catalogCheckGroups(tables, domains, selectedDomains)
  if (!groups.length) return ''
  const row = go.ident('row')
  const callInput = (helper: string, name: string): GoExpression =>
    go.call(go.ident(helper), [row, go.string(name)])
  const inputHelper = (type: string): [string, string] | null => {
    if (type === 'pg_catalog.bool') return ['checkInputBoolean', 'SqlBoolean']
    if (/^pg_catalog\.int[248]$/u.test(type)) return ['checkInputInteger', 'SqlInteger']
    if (/^pg_catalog\.float[48]$/u.test(type)) return ['checkInputFloat', 'SqlFloat']
    if (['pg_catalog.text', 'pg_catalog."varchar"', 'pg_catalog.bpchar'].includes(type))
      return ['checkInputText', 'SqlText']
    return null
  }
  const backend = {
    ...goEvalBoolBackend,
    guardInputs: (names: readonly string[], expression: GoExpression): GoExpression =>
      go.call({
        kind: 'function-literal',
        parameters: [],
        results: [{ type: go.ident('EvalBool') }],
        body: [
          ...names.map((name) =>
            go.if(go.notEqual(callInput('checkTextKnown', name), go.ident('true')), [
              go.return(go.call(go.ident('evalBoolUncertain'))),
            ]),
          ),
          go.return(expression),
        ],
      }),
  }
  const emitted = groups.map((group) => ({
    ...group,
    results: group.checks.map(({ plan }) =>
      emitEvalBoolExpression(
        portableCheckAtoms(plan.expression),
        { ...goSqlBackend, input: (name) => callInput('checkTextValue', name) },
        {
          ...backend,
          scalar: {
            ...backend.scalar,
            input: (type, name) => {
              const helper = inputHelper(type)
              if (!helper) throw new Error(`Unsupported CHECK input type: ${type}`)
              return {
                expression: callInput(helper[0], name),
                helpers: ['EvalValue', helper[1]],
              }
            },
          },
        },
      ),
    ),
  }))
  const resultType = go.ident('CheckEvaluation')
  return printGoFile({
    package: packageName,
    imports: [],
    source: `${goSqlRuntime(['SqlText', 'SqlInteger', 'SqlBoolean', 'SqlFloat', ...emitted.flatMap((group) => group.results.flatMap((result) => result.helpers))], packageName)}
func checkTextRaw(raw any) (SqlText, bool) {
  switch value := raw.(type) {
  case nil: return SqlText{}, true
  case SqlText: return value, true
  case string: return SqlText{Value: value, Valid: true}, true
  case *string:
    if value == nil { return SqlText{}, true }
    return SqlText{Value: *value, Valid: true}, true
  case interface { SQLValid() bool; SQLValue() any }:
    if !value.SQLValid() { return SqlText{}, true }
    return checkTextRaw(value.SQLValue())
  }
  return SqlText{}, false
}
func checkTextKnown(row map[string]any, name string) bool {
  raw, ok := row[name]
  if !ok { return false }
  _, known := checkTextRaw(raw)
  return known
}
func checkTextValue(row map[string]any, name string) SqlText {
  value, _ := checkTextRaw(row[name])
  return value
}
func checkInputText(row map[string]any, name string) EvalValue[SqlText] {
  if !checkTextKnown(row, name) { return EvalValue[SqlText]{} }
  return EvalValue[SqlText]{Certain: true, Value: checkTextValue(row, name)}
}
func checkIntegerRaw(raw any) (SqlInteger, bool) {
  switch value := raw.(type) {
  case nil: return SqlInteger{}, true
  case SqlInteger: return value, true
  case int: return SqlInteger{Value: int64(value), Valid: true}, true
  case int16: return SqlInteger{Value: int64(value), Valid: true}, true
  case int32: return SqlInteger{Value: int64(value), Valid: true}, true
  case int64: return SqlInteger{Value: value, Valid: true}, true
  case *int:
    if value == nil { return SqlInteger{}, true }
    return checkIntegerRaw(*value)
  case *int16:
    if value == nil { return SqlInteger{}, true }
    return checkIntegerRaw(*value)
  case *int32:
    if value == nil { return SqlInteger{}, true }
    return checkIntegerRaw(*value)
  case *int64:
    if value == nil { return SqlInteger{}, true }
    return checkIntegerRaw(*value)
  case interface { SQLValid() bool; SQLValue() any }:
    if !value.SQLValid() { return SqlInteger{}, true }
    return checkIntegerRaw(value.SQLValue())
  }
  return SqlInteger{}, false
}
func checkInputInteger(row map[string]any, name string) EvalValue[SqlInteger] {
  raw, ok := row[name]
  if !ok { return EvalValue[SqlInteger]{} }
  value, known := checkIntegerRaw(raw)
  return EvalValue[SqlInteger]{Certain: known, Value: value}
}
func checkBooleanRaw(raw any) (SqlBoolean, bool) {
  switch value := raw.(type) {
  case nil: return SqlBoolean{}, true
  case SqlBoolean: return value, true
  case bool: return SqlBoolean{Value: value, Valid: true}, true
  case *bool:
    if value == nil { return SqlBoolean{}, true }
    return checkBooleanRaw(*value)
  case interface { SQLValid() bool; SQLValue() any }:
    if !value.SQLValid() { return SqlBoolean{}, true }
    return checkBooleanRaw(value.SQLValue())
  }
  return SqlBoolean{}, false
}
func checkInputBoolean(row map[string]any, name string) EvalValue[SqlBoolean] {
  raw, ok := row[name]
  if !ok { return EvalValue[SqlBoolean]{} }
  value, known := checkBooleanRaw(raw)
  return EvalValue[SqlBoolean]{Certain: known, Value: value}
}
func checkFloatRaw(raw any) (SqlFloat, bool) {
  switch value := raw.(type) {
  case nil: return SqlFloat{}, true
  case SqlFloat: return value, true
  case float32: return SqlFloat{Value: float64(value), Valid: true}, true
  case float64: return SqlFloat{Value: value, Valid: true}, true
  case *float32:
    if value == nil { return SqlFloat{}, true }
    return checkFloatRaw(*value)
  case *float64:
    if value == nil { return SqlFloat{}, true }
    return checkFloatRaw(*value)
  case interface { SQLValid() bool; SQLValue() any }:
    if !value.SQLValid() { return SqlFloat{}, true }
    return checkFloatRaw(value.SQLValue())
  }
  return SqlFloat{}, false
}
func checkInputFloat(row map[string]any, name string) EvalValue[SqlFloat] {
  raw, ok := row[name]
  if !ok { return EvalValue[SqlFloat]{} }
  value, known := checkFloatRaw(raw)
  return EvalValue[SqlFloat]{Certain: known, Value: value}
}

type CheckViolationError struct { Owner, Constraint string }
func (e *CheckViolationError) Error() string {
  return "new row violates check constraint " + e.Constraint
}
func (e *CheckViolationError) SQLState() string { return "23514" }

type CheckEvaluationError struct { Owner, Constraint, State string }
func (e *CheckEvaluationError) Error() string {
  return "check constraint " + e.Constraint + " evaluation failed: " + e.State
}
func (e *CheckEvaluationError) SQLState() string { return e.State }

func ValidateCheckInputs(input map[string]any, evaluate func(map[string]any) []CheckEvaluation) error {
  for _, check := range evaluate(input) {
    if !check.Result.Certain { continue }
    value := check.Result.Value
    if value.Error != "" {
      return &CheckEvaluationError{Owner: check.Owner, Constraint: check.Constraint, State: value.Error}
    }
    if value.Valid && !value.Value {
      return &CheckViolationError{Owner: check.Owner, Constraint: check.Constraint}
    }
  }
  return nil
}`,
    declarations: [
      go.type(
        'CheckEvaluation',
        go.struct([
          { names: ['Owner'], type: go.ident('string') },
          { names: ['Constraint'], type: go.ident('string') },
          { names: ['Result'], type: go.ident('EvalBool') },
        ]),
      ),
      ...emitted.map(({ name, kind, checks, results }) =>
        go.function(
          `Evaluate${goName(name)}${kind === 'domain' ? 'DomainChecks' : 'Checks'}`,
          [{ names: ['row'], type: go.map(go.ident('string'), go.any()) }],
          [{ type: go.slice(resultType) }],
          [
            go.return(
              go.composite(
                go.slice(resultType),
                results.map((result, index) =>
                  go.composite(resultType, [
                    go.keyValue('Owner', go.string(checks[index]!.owner)),
                    go.keyValue('Constraint', go.string(checks[index]!.plan.name)),
                    go.keyValue('Result', result.value.expression),
                  ]),
                ),
              ),
            ),
          ],
        ),
      ),
    ],
  })
}
