package checkrust

import (
	checkruntime "example.com/pgsid-fixture/generated/go/schema/public/checkrust/checkruntime"
	pg_catalog "example.com/pgsid-fixture/generated/go/schema/public/checkrust/pg_catalog"
)

func EvaluateCheckPublicDomainDefaultEventIdFromPublicEventIdEventIdCheckH7azw(inputValue checkruntime.Int8Value) checkruntime.CheckOutcome {
	value0 := checkruntime.MakeInt4Value(0)
	value1 := pg_catalog.Int84gtP7f5(inputValue, value0)
	scalarResult2 := checkruntime.CheckFromBool(value1)
	return scalarResult2
}
func EvaluateCheckPublicDomainEventIdEventIdCheckHcydw(inputValue checkruntime.Int8Value) checkruntime.CheckOutcome {
	value0 := checkruntime.MakeInt4Value(0)
	value1 := pg_catalog.Int84gtP7f5(inputValue, value0)
	scalarResult2 := checkruntime.CheckFromBool(value1)
	return scalarResult2
}
