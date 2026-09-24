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

func evalBoolRegex(value SqlText, source string, negated bool) EvalBool {
	if value.Error != "" {
		return evalBoolCertain(SqlBoolean{Error: value.Error})
	}
	if !value.Valid {
		return evalBoolCertain(SqlBoolean{})
	}
	matched := regexp.MustCompile(source).MatchString(value.Value)
	return evalBoolCertain(SqlBoolean{Value: matched != negated, Valid: true})
}

func evalBoolRegexUnsupported(value SqlText) EvalBool {
	if value.Error != "" {
		return evalBoolCertain(SqlBoolean{Error: value.Error})
	}
	if !value.Valid {
		return evalBoolCertain(SqlBoolean{})
	}
	return evalBoolUncertain()
}

func evalBoolRegexInvalid(value SqlText) EvalBool {
	if value.Error != "" {
		return evalBoolCertain(SqlBoolean{Error: value.Error})
	}
	if !value.Valid {
		return evalBoolCertain(SqlBoolean{})
	}
	return evalBoolCertain(SqlBoolean{Error: "2201B"})
}

func evalBoolRegexDynamic(value, pattern SqlText, syntax string, caseSensitive, expanded bool, newline string, negated bool) EvalBool {
	if value.Error != "" {
		return evalBoolCertain(SqlBoolean{Error: value.Error})
	}
	if pattern.Error != "" {
		return evalBoolCertain(SqlBoolean{Error: pattern.Error})
	}
	if !value.Valid || !pattern.Valid {
		return evalBoolCertain(SqlBoolean{})
	}
	decision := evalBoolRegexAnalyze(pattern.Value, syntax, caseSensitive, expanded, newline)
	switch decision.Kind {
	case "invalid":
		return evalBoolRegexInvalid(value)
	case "unsupported":
		return evalBoolRegexUnsupported(value)
	case "supported":
		return evalBoolRegex(value, decision.Source, negated)
	default:
		panic("unknown regex analysis decision")
	}
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

func evalBoolRegexpLike(value, pattern, flags SqlText) EvalBool {
	for _, input := range []SqlText{value, pattern, flags} {
		if input.Error != "" {
			return evalBoolCertain(SqlBoolean{Error: input.Error})
		}
	}
	if !value.Valid || !pattern.Valid || !flags.Valid {
		return evalBoolCertain(SqlBoolean{})
	}
	syntax, caseSensitive, expanded, newline, errorCode := regexLikeFlags(flags.Value)
	if errorCode != "" {
		return evalBoolCertain(SqlBoolean{Error: errorCode})
	}
	return evalBoolRegexDynamic(value, pattern, syntax, caseSensitive, expanded, newline, false)
}

func evalRegexCount(value, pattern SqlText, start SqlInteger, flags SqlText, mode, source string) EvalValue[SqlInteger] {
	for _, input := range []SqlText{value, pattern, flags} {
		if input.Error != "" {
			return EvalValue[SqlInteger]{Certain: true, Value: SqlInteger{Error: input.Error}}
		}
	}
	if start.Error != "" {
		return EvalValue[SqlInteger]{Certain: true, Value: SqlInteger{Error: start.Error}}
	}
	if !value.Valid || !pattern.Valid || !start.Valid || !flags.Valid {
		return EvalValue[SqlInteger]{Certain: true}
	}
	if start.Value <= 0 {
		return EvalValue[SqlInteger]{Certain: true, Value: SqlInteger{Error: "22023"}}
	}
	if mode == "invalid-flags" {
		return EvalValue[SqlInteger]{Certain: true, Value: SqlInteger{Error: "22023"}}
	}
	if mode == "invalid" {
		return EvalValue[SqlInteger]{Certain: true, Value: SqlInteger{Error: "2201B"}}
	}
	if mode == "unsupported" {
		return EvalValue[SqlInteger]{}
	}
	if mode != "supported" {
		panic("unknown regex count decision")
	}
	chars := []rune(value.Value)
	if start.Value > int64(len(chars))+1 {
		return EvalValue[SqlInteger]{Certain: true, Value: SqlInteger{Value: 0, Valid: true}}
	}
	if start.Value > 1 && strings.Contains(source, "^") {
		return EvalValue[SqlInteger]{}
	}
	matches := regexp.MustCompile(source).FindAllStringIndex(string(chars[start.Value-1:]), -1)
	return EvalValue[SqlInteger]{Certain: true, Value: SqlInteger{Value: int64(len(matches)), Valid: true}}
}

func evalRegexCountDynamic(value, pattern SqlText, start SqlInteger, flags SqlText, _, _ string) EvalValue[SqlInteger] {
	for _, input := range []SqlText{value, pattern, flags} {
		if input.Error != "" {
			return EvalValue[SqlInteger]{Certain: true, Value: SqlInteger{Error: input.Error}}
		}
	}
	if start.Error != "" {
		return EvalValue[SqlInteger]{Certain: true, Value: SqlInteger{Error: start.Error}}
	}
	if !value.Valid || !pattern.Valid || !start.Valid || !flags.Valid {
		return EvalValue[SqlInteger]{Certain: true}
	}
	if start.Value <= 0 {
		return EvalValue[SqlInteger]{Certain: true, Value: SqlInteger{Error: "22023"}}
	}
	syntax, caseSensitive, expanded, newline, errorCode := regexLikeFlags(flags.Value)
	if errorCode != "" {
		return EvalValue[SqlInteger]{Certain: true, Value: SqlInteger{Error: errorCode}}
	}
	decision := evalBoolRegexAnalyze(pattern.Value, syntax, caseSensitive, expanded, newline)
	return evalRegexCount(value, pattern, start, flags, decision.Kind, decision.Source)
}
