package pgsidsql

type EvalValue[T any] struct {
	Certain bool
	Value   T
}

type EvalBool = EvalValue[SqlBoolean]

func evalBoolFromValue(value EvalValue[SqlBoolean]) EvalBool {
	return EvalBool{Certain: value.Certain, Value: value.Value}
}

func evalValueFromBool(value EvalBool) EvalValue[SqlBoolean] {
	return EvalValue[SqlBoolean]{Certain: value.Certain, Value: value.Value}
}

func evalBoolCertain(value SqlBoolean) EvalBool { return EvalBool{Certain: true, Value: value} }

func evalBoolUncertain() EvalBool { return EvalBool{} }

func evalBoolNot(value EvalBool) EvalBool {
	if !value.Certain || value.Value.Error != "" || !value.Value.Valid {
		return value
	}
	value.Value.Value = !value.Value.Value
	return value
}

func evalBoolAnd(left, right func() EvalBool) EvalBool {
	a := left()
	if a.Certain && (a.Value.Error != "" || a.Value.Valid && !a.Value.Value) {
		return a
	}
	b := right()
	if b.Certain && (b.Value.Error != "" || b.Value.Valid && !b.Value.Value) {
		return b
	}
	if !a.Certain || !b.Certain {
		return evalBoolUncertain()
	}
	if !a.Value.Valid || !b.Value.Valid {
		return evalBoolCertain(SqlBoolean{})
	}
	return evalBoolCertain(SqlBoolean{Value: true, Valid: true})
}

func evalBoolOr(left, right func() EvalBool) EvalBool {
	a := left()
	if a.Certain && (a.Value.Error != "" || a.Value.Valid && a.Value.Value) {
		return a
	}
	b := right()
	if b.Certain && (b.Value.Error != "" || b.Value.Valid && b.Value.Value) {
		return b
	}
	if !a.Certain || !b.Certain {
		return evalBoolUncertain()
	}
	if !a.Value.Valid || !b.Value.Valid {
		return evalBoolCertain(SqlBoolean{})
	}
	return evalBoolCertain(SqlBoolean{Value: false, Valid: true})
}

func evalBoolCase(otherwise func() EvalBool, conditions, branches []func() EvalBool) EvalBool {
	for index, when := range conditions {
		condition := when()
		if !condition.Certain {
			return evalBoolUncertain()
		}
		if condition.Value.Error != "" {
			return condition
		}
		if condition.Value.Valid && condition.Value.Value {
			return branches[index]()
		}
	}
	return otherwise()
}

func evalBoolTest(value EvalBool, test string, negated bool) EvalBool {
	if !value.Certain || value.Value.Error != "" {
		return value
	}
	result := test == "true" && value.Value.Valid && value.Value.Value ||
		test == "false" && value.Value.Valid && !value.Value.Value ||
		test == "unknown" && !value.Value.Valid
	if negated {
		result = !result
	}
	return evalBoolCertain(SqlBoolean{Value: result, Valid: true})
}

func evalBoolCompare(left, right EvalBool, operation string) EvalBool {
	if left.Certain && left.Value.Error != "" {
		return left
	}
	if right.Certain && right.Value.Error != "" {
		return right
	}
	if !left.Certain || !right.Certain {
		return evalBoolUncertain()
	}
	if !left.Value.Valid || !right.Value.Valid {
		return evalBoolCertain(SqlBoolean{})
	}
	a, b := 0, 0
	if left.Value.Value {
		a = 1
	}
	if right.Value.Value {
		b = 1
	}
	result := operation == "=" && a == b || operation == "<>" && a != b ||
		operation == "<" && a < b || operation == "<=" && a <= b ||
		operation == ">" && a > b || operation == ">=" && a >= b
	return evalBoolCertain(SqlBoolean{Value: result, Valid: true})
}

func regexLikeFlags(flags string) (string, bool, bool, string, string) {
	syntax, caseSensitive, expanded, newline := "advanced", true, false, "ordinary"
	global := false
	for _, flag := range flags {
		switch flag {
		case 'g':
			global = true
		case 'b':
			syntax = "basic"
		case 'c':
			caseSensitive = true
		case 'e':
			syntax = "extended"
		case 'i':
			caseSensitive = false
		case 'm', 'n':
			newline = "sensitive"
		case 'p':
			newline = "stop"
		case 'q':
			syntax = "literal"
		case 's':
			newline = "ordinary"
		case 't':
			expanded = false
		case 'w':
			newline = "anchors"
		case 'x':
			expanded = true
		default:
			return "", false, false, "", "22023"
		}
	}
	if global {
		return "", false, false, "", "22023"
	}
	return syntax, caseSensitive, expanded, newline, ""
}

func evalBoolRegexInvalidFlags(value, pattern SqlText) EvalBool {
	if value.Error != "" {
		return evalBoolCertain(SqlBoolean{Error: value.Error})
	}
	if pattern.Error != "" {
		return evalBoolCertain(SqlBoolean{Error: pattern.Error})
	}
	if !value.Valid || !pattern.Valid {
		return evalBoolCertain(SqlBoolean{})
	}
	return evalBoolCertain(SqlBoolean{Error: "22023"})
}
