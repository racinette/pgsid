package public

import (
	"reflect"
	"strconv"
)

type SqlInteger struct {
	Value int64
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

type SqlBoolean struct {
	Value bool
	Valid bool
	Error string
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

type CheckOptional[T any] struct {
	V   T
	Set bool
}

func KnownCheckValue[T any](value T) CheckOptional[T] {
	return CheckOptional[T]{V: value, Set: true}
}
func checkPrimitive(raw any) (any, bool) {
	if raw == nil {
		return nil, true
	}
	value := reflect.ValueOf(raw)
	for value.Kind() == reflect.Pointer {
		if value.IsNil() {
			return nil, true
		}
		value = value.Elem()
	}
	switch value.Kind() {
	case reflect.String:
		return value.String(), true
	case reflect.Bool:
		return value.Bool(), true
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return value.Int(), true
	case reflect.Float32, reflect.Float64:
		return value.Float(), true
	}
	return nil, false
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
	if primitive, ok := checkPrimitive(raw); ok {
		switch value := primitive.(type) {
		case nil:
			return SqlInteger{}, true
		case int64:
			return SqlInteger{Value: value, Valid: true}, true
		}
	}
	return SqlInteger{}, false
}
func checkInputInteger[T any](field CheckOptional[T]) EvalValue[SqlInteger] {
	if !field.Set {
		return EvalValue[SqlInteger]{}
	}
	value, known := checkIntegerRaw(any(field.V))
	return EvalValue[SqlInteger]{Certain: known, Value: value}
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
func ValidateCheckInputs[T any](input T, evaluate func(T) []CheckEvaluation) error {
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

type PublicDefaultEventIdCheckInput struct {
	Value CheckOptional[DefaultEventId]
}
type PublicEventIdCheckInput struct {
	Value CheckOptional[EventId]
}
type CheckEvaluation struct {
	Owner      string
	Constraint string
	Result     EvalBool
}

func EvaluatePublicDefaultEventIdDomainChecks(row PublicDefaultEventIdCheckInput) []CheckEvaluation {
	return []CheckEvaluation{CheckEvaluation{Owner: "public.event_id", Constraint: "event_id_check", Result: evalBoolFromValue(func() EvalValue[SqlBoolean] {
		argument0 := checkInputInteger(row.Value)
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
func EvaluatePublicEventIdDomainChecks(row PublicEventIdCheckInput) []CheckEvaluation {
	return []CheckEvaluation{CheckEvaluation{Owner: "public.event_id", Constraint: "event_id_check", Result: evalBoolFromValue(func() EvalValue[SqlBoolean] {
		argument0 := checkInputInteger(row.Value)
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
