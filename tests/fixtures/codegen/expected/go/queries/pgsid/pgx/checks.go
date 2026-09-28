package pgsidpgx

import "strconv"

type SqlText struct {
	Value string
	Valid bool
	Error string
}
type SqlInteger struct {
	Value int64
	Valid bool
	Error string
}
type SqlBoolean struct {
	Value bool
	Valid bool
	Error string
}
type SqlFloat struct {
	Value float64
	Valid bool
	Error string
}
type EvalValue[T any] struct {
	Certain bool
	Value   T
}

func sqlIntegerInput(value string, bits int) SqlInteger {
	integer, err := strconv.ParseInt(value, 10, bits)
	if err != nil {
		return SqlInteger{Error: "22003"}
	}
	return SqlInteger{Value: integer, Valid: true}
}
func int4Input(value string) SqlInteger {
	return sqlIntegerInput(value, 32)
}
func sqlIntegerCompare(left, right SqlInteger) SqlInteger {
	if left.Error != "" {
		return left
	}
	if right.Error != "" {
		return right
	}
	if !left.Valid || !right.Valid {
		return SqlInteger{}
	}
	var order int64
	if left.Value < right.Value {
		order = -1
	} else if left.Value > right.Value {
		order = 1
	}
	return SqlInteger{Value: order, Valid: true}
}
func sqlComparisonResult(order SqlInteger, result bool) SqlBoolean {
	return SqlBoolean{Value: result, Valid: order.Valid, Error: order.Error}
}
func integerGt(left, right SqlInteger) SqlBoolean {
	order := sqlIntegerCompare(left, right)
	return sqlComparisonResult(order, order.Value > 0)
}

type EvalBool = EvalValue[SqlBoolean]

func evalBoolFromValue(value EvalValue[SqlBoolean]) EvalBool {
	return EvalBool{Certain: value.Certain, Value: value.Value}
}
func checkTextRaw(raw any) (SqlText, bool) {
	switch value := raw.(type) {
	case nil:
		return SqlText{}, true
	case SqlText:
		return value, true
	case string:
		return SqlText{Value: value, Valid: true}, true
	case *string:
		if value == nil {
			return SqlText{}, true
		}
		return SqlText{Value: *value, Valid: true}, true
	case interface {
		SQLValid() bool
		SQLValue() any
	}:
		if !value.SQLValid() {
			return SqlText{}, true
		}
		return checkTextRaw(value.SQLValue())
	}
	return SqlText{}, false
}
func checkTextKnown(row map[string]any, name string) bool {
	raw, ok := row[name]
	if !ok {
		return false
	}
	_, known := checkTextRaw(raw)
	return known
}
func checkTextValue(row map[string]any, name string) SqlText {
	value, _ := checkTextRaw(row[name])
	return value
}
func checkInputText(row map[string]any, name string) EvalValue[SqlText] {
	if !checkTextKnown(row, name) {
		return EvalValue[SqlText]{}
	}
	return EvalValue[SqlText]{Certain: true, Value: checkTextValue(row, name)}
}
func checkIntegerRaw(raw any) (SqlInteger, bool) {
	switch value := raw.(type) {
	case nil:
		return SqlInteger{}, true
	case SqlInteger:
		return value, true
	case int:
		return SqlInteger{Value: int64(value), Valid: true}, true
	case int16:
		return SqlInteger{Value: int64(value), Valid: true}, true
	case int32:
		return SqlInteger{Value: int64(value), Valid: true}, true
	case int64:
		return SqlInteger{Value: value, Valid: true}, true
	case *int:
		if value == nil {
			return SqlInteger{}, true
		}
		return checkIntegerRaw(*value)
	case *int16:
		if value == nil {
			return SqlInteger{}, true
		}
		return checkIntegerRaw(*value)
	case *int32:
		if value == nil {
			return SqlInteger{}, true
		}
		return checkIntegerRaw(*value)
	case *int64:
		if value == nil {
			return SqlInteger{}, true
		}
		return checkIntegerRaw(*value)
	case interface {
		SQLValid() bool
		SQLValue() any
	}:
		if !value.SQLValid() {
			return SqlInteger{}, true
		}
		return checkIntegerRaw(value.SQLValue())
	}
	return SqlInteger{}, false
}
func checkInputInteger(row map[string]any, name string) EvalValue[SqlInteger] {
	raw, ok := row[name]
	if !ok {
		return EvalValue[SqlInteger]{}
	}
	value, known := checkIntegerRaw(raw)
	return EvalValue[SqlInteger]{Certain: known, Value: value}
}
func checkBooleanRaw(raw any) (SqlBoolean, bool) {
	switch value := raw.(type) {
	case nil:
		return SqlBoolean{}, true
	case SqlBoolean:
		return value, true
	case bool:
		return SqlBoolean{Value: value, Valid: true}, true
	case *bool:
		if value == nil {
			return SqlBoolean{}, true
		}
		return checkBooleanRaw(*value)
	case interface {
		SQLValid() bool
		SQLValue() any
	}:
		if !value.SQLValid() {
			return SqlBoolean{}, true
		}
		return checkBooleanRaw(value.SQLValue())
	}
	return SqlBoolean{}, false
}
func checkInputBoolean(row map[string]any, name string) EvalValue[SqlBoolean] {
	raw, ok := row[name]
	if !ok {
		return EvalValue[SqlBoolean]{}
	}
	value, known := checkBooleanRaw(raw)
	return EvalValue[SqlBoolean]{Certain: known, Value: value}
}
func checkFloatRaw(raw any) (SqlFloat, bool) {
	switch value := raw.(type) {
	case nil:
		return SqlFloat{}, true
	case SqlFloat:
		return value, true
	case float32:
		return SqlFloat{Value: float64(value), Valid: true}, true
	case float64:
		return SqlFloat{Value: value, Valid: true}, true
	case *float32:
		if value == nil {
			return SqlFloat{}, true
		}
		return checkFloatRaw(*value)
	case *float64:
		if value == nil {
			return SqlFloat{}, true
		}
		return checkFloatRaw(*value)
	case interface {
		SQLValid() bool
		SQLValue() any
	}:
		if !value.SQLValid() {
			return SqlFloat{}, true
		}
		return checkFloatRaw(value.SQLValue())
	}
	return SqlFloat{}, false
}
func checkInputFloat(row map[string]any, name string) EvalValue[SqlFloat] {
	raw, ok := row[name]
	if !ok {
		return EvalValue[SqlFloat]{}
	}
	value, known := checkFloatRaw(raw)
	return EvalValue[SqlFloat]{Certain: known, Value: value}
}

type CheckViolationError struct{ Owner, Constraint string }

func (e *CheckViolationError) Error() string {
	return "new row violates check constraint " + e.Constraint
}
func (e *CheckViolationError) SQLState() string {
	return "23514"
}

type CheckEvaluationError struct{ Owner, Constraint, State string }

func (e *CheckEvaluationError) Error() string {
	return "check constraint " + e.Constraint + " evaluation failed: " + e.State
}
func (e *CheckEvaluationError) SQLState() string {
	return e.State
}
func ValidateCheckInputs(input map[string]any, evaluate func(map[string]any) []CheckEvaluation) error {
	for _, check := range evaluate(input) {
		if !check.Result.Certain {
			continue
		}
		value := check.Result.Value
		if value.Error != "" {
			return &CheckEvaluationError{Owner: check.Owner, Constraint: check.Constraint, State: value.Error}
		}
		if value.Valid && !value.Value {
			return &CheckViolationError{Owner: check.Owner, Constraint: check.Constraint}
		}
	}
	return nil
}

type CheckEvaluation struct {
	Owner      string
	Constraint string
	Result     EvalBool
}

func EvaluatePublicDefaultEventIdDomainChecks(row map[string]any) []CheckEvaluation {
	return []CheckEvaluation{CheckEvaluation{Owner: "public.event_id", Constraint: "event_id_check", Result: evalBoolFromValue(func() EvalValue[SqlBoolean] {
		argument0 := checkInputInteger(row, "value")
		argument1 := int4Input("0")
		if argument0.Certain && argument0.Value.Error != "" {
			return EvalValue[SqlBoolean]{Certain: true, Value: SqlBoolean{Error: argument0.Value.Error}}
		}
		if argument1.Error != "" {
			return EvalValue[SqlBoolean]{Certain: true, Value: SqlBoolean{Error: argument1.Error}}
		}
		if !argument0.Certain {
			return EvalValue[SqlBoolean]{}
		}
		return EvalValue[SqlBoolean]{Certain: true, Value: integerGt(argument0.Value, argument1)}
	}())}}
}
func EvaluatePublicEventIdDomainChecks(row map[string]any) []CheckEvaluation {
	return []CheckEvaluation{CheckEvaluation{Owner: "public.event_id", Constraint: "event_id_check", Result: evalBoolFromValue(func() EvalValue[SqlBoolean] {
		argument0 := checkInputInteger(row, "value")
		argument1 := int4Input("0")
		if argument0.Certain && argument0.Value.Error != "" {
			return EvalValue[SqlBoolean]{Certain: true, Value: SqlBoolean{Error: argument0.Value.Error}}
		}
		if argument1.Error != "" {
			return EvalValue[SqlBoolean]{Certain: true, Value: SqlBoolean{Error: argument1.Error}}
		}
		if !argument0.Certain {
			return EvalValue[SqlBoolean]{}
		}
		return EvalValue[SqlBoolean]{Certain: true, Value: integerGt(argument0.Value, argument1)}
	}())}}
}
