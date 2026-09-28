import type { CatalogSnapshot, ColumnInfo, DomainInfo, TableInfo } from '../../../catalog/types.js'
import type { Config, GoTypeImport } from '../../../config/schema.js'
import { catalogCheckGroups } from '../../../sql-semantics/catalog-checks.js'
import { emitEvalBoolExpression } from '../../../sql-semantics/check-expressions.js'
import { portableCheckAtoms } from '../../shared/check-atom-support.js'
import { go, printGoFile, type GoExpression } from '../ast.js'
import { normalizeGoImports } from '../imports.js'
import { goName } from '../names.js'
import {
  addGoNullImport,
  nullableGoType,
  resolveGoColumnType,
  resolveGoPgType,
  storedGoColumnNotNull,
  storedGoDomainNotNull,
  type GoTypeContext,
} from '../type-mapping.js'
import { goEvalBoolBackend } from './check.js'
import { goSqlBackend } from './registry.js'
import { goSqlRuntime } from './runtime.js'

export function renderGoSchemaChecks(
  tables: readonly TableInfo[],
  packageName: string,
  domains: readonly DomainInfo[] = [],
  selectedDomains: readonly DomainInfo[] = domains,
  catalog: CatalogSnapshot,
  config: Config,
  context?: GoTypeContext,
): string {
  const groups = catalogCheckGroups(tables, domains, selectedDomains)
  if (!groups.length) return ''
  const row = go.ident('row')
  const callInput = (helper: string, name: string): GoExpression =>
    go.call(go.ident(helper), [go.selector(row, goName(name))])
  const imports: GoTypeImport[] = [{ path: 'reflect' }]
  const schemaTypes = Boolean(config.sql.codegen?.go?.schema && context)
  const typeConfig: Config =
    !schemaTypes && config.sql.codegen?.go
      ? {
          ...config,
          sql: {
            ...config.sql,
            codegen: {
              ...config.sql.codegen,
              go: { ...config.sql.codegen.go, domains: false },
            },
          },
        }
      : config
  const groupInputs = groups.map((group) => {
    const table =
      group.kind === 'table'
        ? tables.find(
            (item) => item.schema === group.source.schema && item.name === group.source.name,
          )
        : undefined
    const domain =
      group.kind === 'domain'
        ? selectedDomains.find(
            (item) => item.schema === group.source.schema && item.name === group.source.name,
          )
        : undefined
    const columns: readonly ColumnInfo[] = table?.columns ?? []
    const fields = table
      ? columns.map((column) => {
          const resolved = schemaTypes
            ? resolveGoColumnType(table.schema, table.name, column, catalog, config, context)
            : resolveGoPgType(column.typeName, typeConfig, catalog, table.schema, column.typeOid)
          imports.push(...resolved.imports)
          const type = nullableGoType(resolved.type, storedGoColumnNotNull(column, catalog), config)
          addGoNullImport(imports, config, context, type)
          return { names: [goName(column.name)], type: go.index(go.ident('CheckOptional'), type) }
        })
      : domain
        ? (() => {
            const resolved = resolveGoPgType(
              `${domain.schema}.${domain.name}`,
              typeConfig,
              catalog,
              domain.schema,
              domain.oid,
              schemaTypes ? context : undefined,
            )
            imports.push(...resolved.imports)
            const type = nullableGoType(
              resolved.type,
              storedGoDomainNotNull(domain, catalog),
              config,
            )
            addGoNullImport(imports, config, context, type)
            return [{ names: ['Value'], type: go.index(go.ident('CheckOptional'), type) }]
          })()
        : []
    return { ...group, fields, inputType: `${goName(group.name)}CheckInput` }
  })
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
  const emitted = groupInputs.map((group) => ({
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
    imports: normalizeGoImports(imports),
    source: `${goSqlRuntime(['SqlText', 'SqlInteger', 'SqlBoolean', 'SqlFloat', ...emitted.flatMap((group) => group.results.flatMap((result) => result.helpers))], packageName)}
type CheckOptional[T any] struct { V T; Set bool }
func KnownCheckValue[T any](value T) CheckOptional[T] { return CheckOptional[T]{V: value, Set: true} }

func checkPrimitive(raw any) (any, bool) {
  if raw == nil { return nil, true }
  value := reflect.ValueOf(raw)
  for value.Kind() == reflect.Pointer {
    if value.IsNil() { return nil, true }
    value = value.Elem()
  }
  switch value.Kind() {
  case reflect.String: return value.String(), true
  case reflect.Bool: return value.Bool(), true
  case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64: return value.Int(), true
  case reflect.Float32, reflect.Float64: return value.Float(), true
  }
  return nil, false
}
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
  if primitive, ok := checkPrimitive(raw); ok {
    switch value := primitive.(type) {
    case nil: return SqlText{}, true
    case string: return SqlText{Value: value, Valid: true}, true
    }
  }
  return SqlText{}, false
}
func checkTextKnown[T any](field CheckOptional[T]) bool {
  if !field.Set { return false }
  _, known := checkTextRaw(any(field.V))
  return known
}
func checkTextValue[T any](field CheckOptional[T]) SqlText {
  value, _ := checkTextRaw(any(field.V))
  return value
}
func checkInputText[T any](field CheckOptional[T]) EvalValue[SqlText] {
  if !checkTextKnown(field) { return EvalValue[SqlText]{} }
  return EvalValue[SqlText]{Certain: true, Value: checkTextValue(field)}
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
  if primitive, ok := checkPrimitive(raw); ok {
    switch value := primitive.(type) {
    case nil: return SqlInteger{}, true
    case int64: return SqlInteger{Value: value, Valid: true}, true
    }
  }
  return SqlInteger{}, false
}
func checkInputInteger[T any](field CheckOptional[T]) EvalValue[SqlInteger] {
  if !field.Set { return EvalValue[SqlInteger]{} }
  value, known := checkIntegerRaw(any(field.V))
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
  if primitive, ok := checkPrimitive(raw); ok {
    switch value := primitive.(type) {
    case nil: return SqlBoolean{}, true
    case bool: return SqlBoolean{Value: value, Valid: true}, true
    }
  }
  return SqlBoolean{}, false
}
func checkInputBoolean[T any](field CheckOptional[T]) EvalValue[SqlBoolean] {
  if !field.Set { return EvalValue[SqlBoolean]{} }
  value, known := checkBooleanRaw(any(field.V))
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
  if primitive, ok := checkPrimitive(raw); ok {
    switch value := primitive.(type) {
    case nil: return SqlFloat{}, true
    case float64: return SqlFloat{Value: value, Valid: true}, true
    }
  }
  return SqlFloat{}, false
}
func checkInputFloat[T any](field CheckOptional[T]) EvalValue[SqlFloat] {
  if !field.Set { return EvalValue[SqlFloat]{} }
  value, known := checkFloatRaw(any(field.V))
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

func ValidateCheckInputs[T any](input T, evaluate func(T) []CheckEvaluation) error {
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
      ...emitted.map(({ inputType, fields }) => go.type(inputType, go.struct(fields))),
      go.type(
        'CheckEvaluation',
        go.struct([
          { names: ['Owner'], type: go.ident('string') },
          { names: ['Constraint'], type: go.ident('string') },
          { names: ['Result'], type: go.ident('EvalBool') },
        ]),
      ),
      ...emitted.map(({ name, kind, checks, results, inputType }) =>
        go.function(
          `Evaluate${goName(name)}${kind === 'domain' ? 'DomainChecks' : 'Checks'}`,
          [{ names: ['row'], type: go.ident(inputType) }],
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
