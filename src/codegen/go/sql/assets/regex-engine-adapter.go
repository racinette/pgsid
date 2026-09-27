package pgsidsql

func regexEngineOptions(syntax string, caseSensitive, expanded bool, newline string) RegexOptions {
	options := RegexOptions{CaseSensitive: caseSensitive, Expanded: expanded}
	switch syntax {
	case "basic":
		options.Syntax = Syntax{Kind: SyntaxBasic}
	case "extended":
		options.Syntax = Syntax{Kind: SyntaxExtended}
	case "literal":
		options.Syntax = Syntax{Kind: SyntaxLiteral}
	default:
		options.Syntax = Syntax{Kind: SyntaxAdvanced}
	}
	switch newline {
	case "sensitive":
		options.Newline = NewlineMode{Kind: NewlineModeSensitive}
	case "stop":
		options.Newline = NewlineMode{Kind: NewlineModeStop}
	case "anchors":
		options.Newline = NewlineMode{Kind: NewlineModeAnchors}
	default:
		options.Newline = NewlineMode{Kind: NewlineModeOrdinary}
	}
	return options
}

func evalBoolRegexEngine(value, pattern SqlText, syntax string, caseSensitive, expanded bool, newline string, negated bool) EvalBool {
	if value.Error != "" {
		return evalBoolCertain(SqlBoolean{Error: value.Error})
	}
	if pattern.Error != "" {
		return evalBoolCertain(SqlBoolean{Error: pattern.Error})
	}
	if !value.Valid || !pattern.Valid {
		return evalBoolCertain(SqlBoolean{})
	}
	result := Find(pattern.Value, value.Value, 0, regexEngineOptions(syntax, caseSensitive, expanded, newline))
	switch result.Kind {
	case MatchOutcomeInvalidPattern:
		return evalBoolCertain(SqlBoolean{Error: "2201B"})
	case MatchOutcomeUncertain:
		return evalBoolUncertain()
	case MatchOutcomeFound:
		return evalBoolCertain(SqlBoolean{Value: !negated, Valid: true})
	case MatchOutcomeNoMatch:
		return evalBoolCertain(SqlBoolean{Value: negated, Valid: true})
	default:
		panic("unknown regex match outcome")
	}
}

func evalBoolRegexpLikeEngine(value, pattern, flags SqlText) EvalBool {
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
	return evalBoolRegexEngine(value, pattern, syntax, caseSensitive, expanded, newline, false)
}

func evalRegexCountEngine(value, pattern SqlText, start SqlInteger, flags SqlText) EvalValue[SqlInteger] {
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
	result := Count(pattern.Value, value.Value, int(start.Value-1), regexEngineOptions(syntax, caseSensitive, expanded, newline))
	switch result.Kind {
	case CountOutcomeInvalidPattern:
		return EvalValue[SqlInteger]{Certain: true, Value: SqlInteger{Error: "2201B"}}
	case CountOutcomeUncertain:
		return EvalValue[SqlInteger]{}
	case CountOutcomeCount:
		return EvalValue[SqlInteger]{Certain: true, Value: SqlInteger{Value: int64(result.Count), Valid: true}}
	default:
		panic("unknown regex count outcome")
	}
}
