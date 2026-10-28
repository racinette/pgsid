package checkrust

import (
	checkruntime "example.com/pgsid-fixture/generated/go/schema/public/checkrust/checkruntime"
	pg_catalog "example.com/pgsid-fixture/generated/go/schema/public/checkrust/pg_catalog"
)

func EvaluateCheckPublicDomainDefaultEventIdFromPublicEventIdEventIdCheckH7azw(inputValue checkruntime.Int8Value) checkruntime.CheckOutcome {
	expressionValidityStart0 := checkruntime.MakeBoolValue(true)
	expressionValidity1 := checkruntime.CheckFromBool(expressionValidityStart0)
	arrayValueNullness2 := checkruntime.Int8IsNull(inputValue)
	arrayValueValidity3 := checkruntime.ArrayValueValidity(arrayValueNullness2, true)
	expressionValidity1 = checkruntime.ArrayValidityFinish(expressionValidity1, arrayValueValidity3)
	value4 := checkruntime.MakeInt4Value(0)
	strictCallStart6 := checkruntime.MakeBoolValue(false)
	strictCallNull5 := checkruntime.CheckFromBool(strictCallStart6)
	strictArgumentNull7 := checkruntime.Int8IsNull(inputValue)
	strictArgumentState8 := checkruntime.CheckFromBool(strictArgumentNull7)
	strictCallNull5 = checkruntime.OrFinish(strictCallNull5, strictArgumentState8)
	strictArgumentNull9 := checkruntime.Int4IsNull(value4)
	strictArgumentState10 := checkruntime.CheckFromBool(strictArgumentNull9)
	strictCallNull5 = checkruntime.OrFinish(strictCallNull5, strictArgumentState10)
	strictCall14 := checkruntime.BoolNull()
	if checkruntime.CaseGuardTakes(strictCallNull5) == false {
		value11 := pg_catalog.Int84gtP7f5(inputValue, value4)
		arrayValueNullness12 := checkruntime.BoolIsNull(value11)
		arrayValueValidity13 := checkruntime.ArrayValueValidity(arrayValueNullness12, true)
		expressionValidity1 = checkruntime.ArrayValidityFinish(expressionValidity1, arrayValueValidity13)
		strictCall14 = value11
	}
	arrayValueNullness15 := checkruntime.BoolIsNull(strictCall14)
	arrayValueValidity16 := checkruntime.ArrayValueValidity(arrayValueNullness15, true)
	expressionValidity1 = checkruntime.ArrayValidityFinish(expressionValidity1, arrayValueValidity16)
	scalarResult17 := checkruntime.CheckFromBool(strictCall14)
	validatedExpression18 := scalarResult17
	if checkruntime.CaseGuardStops(expressionValidity1) {
		validatedExpression18 = expressionValidity1
	}
	return validatedExpression18
}
func EvaluateCheckPublicDomainEventIdEventIdCheckHcydw(inputValue checkruntime.Int8Value) checkruntime.CheckOutcome {
	expressionValidityStart0 := checkruntime.MakeBoolValue(true)
	expressionValidity1 := checkruntime.CheckFromBool(expressionValidityStart0)
	arrayValueNullness2 := checkruntime.Int8IsNull(inputValue)
	arrayValueValidity3 := checkruntime.ArrayValueValidity(arrayValueNullness2, true)
	expressionValidity1 = checkruntime.ArrayValidityFinish(expressionValidity1, arrayValueValidity3)
	value4 := checkruntime.MakeInt4Value(0)
	strictCallStart6 := checkruntime.MakeBoolValue(false)
	strictCallNull5 := checkruntime.CheckFromBool(strictCallStart6)
	strictArgumentNull7 := checkruntime.Int8IsNull(inputValue)
	strictArgumentState8 := checkruntime.CheckFromBool(strictArgumentNull7)
	strictCallNull5 = checkruntime.OrFinish(strictCallNull5, strictArgumentState8)
	strictArgumentNull9 := checkruntime.Int4IsNull(value4)
	strictArgumentState10 := checkruntime.CheckFromBool(strictArgumentNull9)
	strictCallNull5 = checkruntime.OrFinish(strictCallNull5, strictArgumentState10)
	strictCall14 := checkruntime.BoolNull()
	if checkruntime.CaseGuardTakes(strictCallNull5) == false {
		value11 := pg_catalog.Int84gtP7f5(inputValue, value4)
		arrayValueNullness12 := checkruntime.BoolIsNull(value11)
		arrayValueValidity13 := checkruntime.ArrayValueValidity(arrayValueNullness12, true)
		expressionValidity1 = checkruntime.ArrayValidityFinish(expressionValidity1, arrayValueValidity13)
		strictCall14 = value11
	}
	arrayValueNullness15 := checkruntime.BoolIsNull(strictCall14)
	arrayValueValidity16 := checkruntime.ArrayValueValidity(arrayValueNullness15, true)
	expressionValidity1 = checkruntime.ArrayValidityFinish(expressionValidity1, arrayValueValidity16)
	scalarResult17 := checkruntime.CheckFromBool(strictCall14)
	validatedExpression18 := scalarResult17
	if checkruntime.CaseGuardStops(expressionValidity1) {
		validatedExpression18 = expressionValidity1
	}
	return validatedExpression18
}
