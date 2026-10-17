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
	value5 := pg_catalog.Int84gtP7f5(inputValue, value4)
	arrayValueNullness6 := checkruntime.BoolIsNull(value5)
	arrayValueValidity7 := checkruntime.ArrayValueValidity(arrayValueNullness6, true)
	expressionValidity1 = checkruntime.ArrayValidityFinish(expressionValidity1, arrayValueValidity7)
	arrayValueNullness8 := checkruntime.BoolIsNull(value5)
	arrayValueValidity9 := checkruntime.ArrayValueValidity(arrayValueNullness8, true)
	expressionValidity1 = checkruntime.ArrayValidityFinish(expressionValidity1, arrayValueValidity9)
	scalarResult10 := checkruntime.CheckFromBool(value5)
	validatedExpression11 := scalarResult10
	if checkruntime.CaseGuardStops(expressionValidity1) {
		validatedExpression11 = expressionValidity1
	}
	return validatedExpression11
}
func EvaluateCheckPublicDomainEventIdEventIdCheckHcydw(inputValue checkruntime.Int8Value) checkruntime.CheckOutcome {
	expressionValidityStart0 := checkruntime.MakeBoolValue(true)
	expressionValidity1 := checkruntime.CheckFromBool(expressionValidityStart0)
	arrayValueNullness2 := checkruntime.Int8IsNull(inputValue)
	arrayValueValidity3 := checkruntime.ArrayValueValidity(arrayValueNullness2, true)
	expressionValidity1 = checkruntime.ArrayValidityFinish(expressionValidity1, arrayValueValidity3)
	value4 := checkruntime.MakeInt4Value(0)
	value5 := pg_catalog.Int84gtP7f5(inputValue, value4)
	arrayValueNullness6 := checkruntime.BoolIsNull(value5)
	arrayValueValidity7 := checkruntime.ArrayValueValidity(arrayValueNullness6, true)
	expressionValidity1 = checkruntime.ArrayValidityFinish(expressionValidity1, arrayValueValidity7)
	arrayValueNullness8 := checkruntime.BoolIsNull(value5)
	arrayValueValidity9 := checkruntime.ArrayValueValidity(arrayValueNullness8, true)
	expressionValidity1 = checkruntime.ArrayValidityFinish(expressionValidity1, arrayValueValidity9)
	scalarResult10 := checkruntime.CheckFromBool(value5)
	validatedExpression11 := scalarResult10
	if checkruntime.CaseGuardStops(expressionValidity1) {
		validatedExpression11 = expressionValidity1
	}
	return validatedExpression11
}
