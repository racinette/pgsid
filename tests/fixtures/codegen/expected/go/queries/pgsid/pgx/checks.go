package pgsidpgx

import (
	checkrust "example.com/pgsid-fixture/generated/go/queries/pgsid/pgx/checkrust"
	checkruntime "example.com/pgsid-fixture/generated/go/queries/pgsid/pgx/checkrust/checkruntime"
	public "example.com/pgsid-fixture/generated/go/schema/public"
	"reflect"
	"strconv"
	"strings"
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
type SqlBoolean struct {
	Value bool
	Valid bool
	Error string
}
type EvalBool = EvalValue[SqlBoolean]

func evalBoolCertain(value SqlBoolean) EvalBool {
	return EvalBool{Certain: true, Value: value}
}
func evalBoolUncertain() EvalBool {
	return EvalBool{}
}

type CheckOptional[T any] struct {
	V    T
	Set  bool
	Null bool
}

func KnownCheckValue[T any](value T) CheckOptional[T] {
	return CheckOptional[T]{V: value, Set: true}
}
func NullCheckValue[T any]() CheckOptional[T] {
	return CheckOptional[T]{Set: true, Null: true}
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
	if field.Null {
		return EvalValue[SqlInteger]{Certain: true}
	}
	value, known := checkIntegerRaw(any(field.V))
	return EvalValue[SqlInteger]{Certain: known, Value: value}
}
func checkRustInt8[T any](field CheckOptional[T]) checkruntime.Int8Value {
	value := checkInputInteger(field)
	if !value.Certain {
		return checkruntime.Int8Unknown()
	}
	if value.Value.Error != "" {
		if state, ok := checkRustState(value.Value.Error); ok {
			return checkruntime.Int8Value{Kind: checkruntime.Int8ValueError, Error: state}
		}
		return checkruntime.Int8Unknown()
	}
	if !value.Value.Valid {
		return checkruntime.Int8Null()
	}
	return checkruntime.MakeInt8Value(value.Value.Value)
}
func checkRustState(value string) (checkruntime.SqlError, bool) {
	if len(value) != 5 {
		return checkruntime.SqlError{}, false
	}
	state, error := strconv.ParseUint(value, 36, 32)
	if error != nil {
		return checkruntime.SqlError{}, false
	}
	return checkruntime.MakeSqlError(int(state)), true
}
func checkRustOutcome(value checkruntime.CheckOutcome) EvalBool {
	switch value.Kind {
	case checkruntime.CheckOutcomeTrue:
		return evalBoolCertain(SqlBoolean{Value: true, Valid: true})
	case checkruntime.CheckOutcomeFalse:
		return evalBoolCertain(SqlBoolean{Value: false, Valid: true})
	case checkruntime.CheckOutcomeNull:
		return evalBoolCertain(SqlBoolean{})
	case checkruntime.CheckOutcomeUnknown:
		return evalBoolUncertain()
	case checkruntime.CheckOutcomeError:
		state := strings.ToUpper(strconv.FormatInt(int64(value.Error.State), 36))
		for len(state) < 5 {
			state = "0" + state
		}
		return evalBoolCertain(SqlBoolean{Error: state})
	}
	panic("invalid Rust CHECK outcome")
}

type CheckViolationError struct{ Owner, Constraint string }

func (e *CheckViolationError) Error() string {
	return "new row violates check constraint " + e.Constraint
}
func (e *CheckViolationError) SQLState() string {
	return "23514"
}

type CheckEvaluationError struct{ Owner, Constraint, State, Message string }

func (e *CheckEvaluationError) Error() string {
	return "check constraint " + e.Constraint + " evaluation failed: " + e.Message + " (SQLSTATE " + e.State + ")"
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
			return &CheckEvaluationError{Owner: check.Owner, Constraint: check.Constraint, State: value.Error, Message: check.Message}
		}
		if value.Valid && !value.Value {
			return &CheckViolationError{Owner: check.Owner, Constraint: check.Constraint}
		}
	}
	return nil
}
func checkEvaluation(owner, constraint string, result EvalBool, unknownMessage string) CheckEvaluation {
	evaluation := CheckEvaluation{Owner: owner, Constraint: constraint, Result: result}
	if !result.Certain {
		evaluation.Message = unknownMessage
	}
	if result.Certain && result.Value.Error != "" {
		evaluation.Message = "SQL evaluation failed (SQLSTATE " + result.Value.Error + ")"
		if state, valid := checkRustState(result.Value.Error); valid {
			evaluation.Message = checkruntime.SqlErrorMessage(state).Message
		}
	}
	return evaluation
}

type PublicDefaultEventIdCheckInput struct {
	Value CheckOptional[public.DefaultEventId]
}
type PublicEventIdCheckInput struct {
	Value CheckOptional[public.EventId]
}
type CheckEvaluation struct {
	Owner      string
	Constraint string
	Result     EvalBool
	Message    string
}

func EvaluatePublicDefaultEventIdDomainChecks(row PublicDefaultEventIdCheckInput) []CheckEvaluation {
	return []CheckEvaluation{checkEvaluation("public.event_id", "event_id_check", checkRustOutcome(checkrust.EvaluateCheckPublicDomainDefaultEventIdFromPublicEventIdEventIdCheckH7azw(checkRustInt8(row.Value))), "A required input is unavailable, or its value or an evaluated expression is not supported.")}
}
func EvaluatePublicEventIdDomainChecks(row PublicEventIdCheckInput) []CheckEvaluation {
	return []CheckEvaluation{checkEvaluation("public.event_id", "event_id_check", checkRustOutcome(checkrust.EvaluateCheckPublicDomainEventIdEventIdCheckHcydw(checkRustInt8(row.Value))), "A required input is unavailable, or its value or an evaluated expression is not supported.")}
}
