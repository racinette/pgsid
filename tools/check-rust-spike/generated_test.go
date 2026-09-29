package generated

import (
	"strconv"
	"strings"
	"testing"
)

func TestGeneratedCheck(t *testing.T) {
	open := MakeTextValue("open")
	cases := []struct {
		amount   Int4Value
		email    TextValue
		pattern  TextValue
		status   TextValue
		expected CheckOutcome
	}{
		{MakeInt4Value(-1), MakeTextValue("abc"), MakeTextValue("("), open, CheckOutcome{Kind: CheckOutcomeFalse}},
		{MakeInt4Value(1), MakeTextValue("abc"), MakeTextValue("a"), open, CheckOutcome{Kind: CheckOutcomeTrue}},
		{MakeInt4Value(1), MakeTextValue("abc"), MakeTextValue("z"), open, CheckOutcome{Kind: CheckOutcomeFalse}},
		{MakeInt4Value(1), MakeTextValue("abc"), MakeTextValue("("), open, CheckOutcome{Kind: CheckOutcomeError, Error: SqlError{State: 3452591}}},
		{Int4Unknown(), MakeTextValue("abc"), MakeTextValue("z"), open, CheckOutcome{Kind: CheckOutcomeFalse}},
		{Int4Unknown(), MakeTextValue("abc"), MakeTextValue("a"), open, CheckOutcome{Kind: CheckOutcomeUnknown}},
		{Int4Null(), MakeTextValue("abc"), MakeTextValue("a"), open, CheckOutcome{Kind: CheckOutcomeNull}},
		{MakeInt4Value(1), TextUnknown(), MakeTextValue("a"), open, CheckOutcome{Kind: CheckOutcomeUnknown}},
		{MakeInt4Value(1), TextNull(), MakeTextValue("a"), open, CheckOutcome{Kind: CheckOutcomeNull}},
		{MakeInt4Value(1), MakeTextValue("abc"), TextUnknown(), open, CheckOutcome{Kind: CheckOutcomeUnknown}},
		{Int4Value{Kind: Int4ValueError, Error: SqlError{State: 3452591}}, MakeTextValue("abc"), MakeTextValue("a"), open, CheckOutcome{Kind: CheckOutcomeError, Error: SqlError{State: 3452591}}},
		{MakeInt4Value(-1), TextValue{Kind: TextValueError, Error: SqlError{State: 3452591}}, MakeTextValue("a"), open, CheckOutcome{Kind: CheckOutcomeFalse}},
		{MakeInt4Value(1), MakeTextValue("abc"), MakeTextValue("a"), MakeTextValue("housed"), CheckOutcome{Kind: CheckOutcomeFalse}},
		{MakeInt4Value(1), MakeTextValue("abc"), MakeTextValue("a"), MakeTextValue(""), CheckOutcome{Kind: CheckOutcomeTrue}},
		{MakeInt4Value(1), MakeTextValue("abc"), MakeTextValue("a"), TextNull(), CheckOutcome{Kind: CheckOutcomeNull}},
		{MakeInt4Value(1), MakeTextValue("abc"), MakeTextValue("a"), TextUnknown(), CheckOutcome{Kind: CheckOutcomeUnknown}},
		{MakeInt4Value(1), MakeTextValue("abc"), MakeTextValue("a"), TextValue{Kind: TextValueError, Error: SqlError{State: 3452591}}, CheckOutcome{Kind: CheckOutcomeError, Error: SqlError{State: 3452591}}},
		{MakeInt4Value(-1), MakeTextValue("abc"), MakeTextValue("("), TextValue{Kind: TextValueError, Error: SqlError{State: 3452591}}, CheckOutcome{Kind: CheckOutcomeFalse}},
	}
	for index, item := range cases {
		actual := EvaluateCheck(item.amount, item.email, item.pattern, item.status)
		if actual != item.expected {
			t.Errorf("case %d: got %+v, want %+v", index, actual, item.expected)
		}
	}
}

type checkOptional[T any] struct {
	Value T
	Set   bool
	Null  bool
}

type checkRow struct {
	Amount  checkOptional[int64]
	Email   checkOptional[string]
	Pattern checkOptional[string]
	Status  checkOptional[string]
}

func wrapInt4(field checkOptional[int64]) Int4Value {
	if !field.Set {
		return Int4Unknown()
	}
	if field.Null {
		return Int4Null()
	}
	if field.Value < -2147483648 || field.Value > 2147483647 {
		return Int4Unknown()
	}
	return MakeInt4Value(int(field.Value))
}

func wrapText(field checkOptional[string]) TextValue {
	if !field.Set {
		return TextUnknown()
	}
	if field.Null {
		return TextNull()
	}
	return MakeTextValue(field.Value)
}

func evaluateRow(row checkRow) CheckOutcome {
	return EvaluateCheck(wrapInt4(row.Amount), wrapText(row.Email), wrapText(row.Pattern), wrapText(row.Status))
}

func validateRow(row checkRow) string {
	result := evaluateRow(row)
	switch result.Kind {
	case CheckOutcomeFalse:
		return "23514"
	case CheckOutcomeError:
		state := strings.ToUpper(strconv.FormatInt(int64(result.Error.State), 36))
		return strings.Repeat("0", 5-len(state)) + state
	default:
		return ""
	}
}

func TestRowAdapter(t *testing.T) {
	missing := checkRow{}
	if evaluateRow(missing).Kind != CheckOutcomeUnknown {
		t.Fatal("missing amount should be uncertain")
	}
	bad := checkRow{
		Amount:  checkOptional[int64]{Value: 1, Set: true},
		Email:   checkOptional[string]{Value: "abc", Set: true},
		Pattern: checkOptional[string]{Value: "z", Set: true},
		Status:  checkOptional[string]{Value: "open", Set: true},
	}
	if validateRow(bad) != "23514" {
		t.Fatal("false CHECK did not produce 23514")
	}
	bad.Pattern.Value = "("
	if validateRow(bad) != "2201B" {
		t.Fatal("invalid regex did not produce 2201B")
	}
	bad.Amount.Value = -1
	if validateRow(bad) != "23514" {
		t.Fatal("false left branch did not skip invalid regex")
	}
	bad.Amount.Value = 2147483648
	bad.Pattern.Value = "a"
	if evaluateRow(bad).Kind != CheckOutcomeUnknown {
		t.Fatal("out-of-range int4 input should be uncertain")
	}
}
