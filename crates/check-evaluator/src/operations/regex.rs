fn eval_regex(subject: TextValue, pattern: TextValue) -> BoolValue {
    if let TextValue::Error(error) = subject {
        return BoolValue::Error(error);
    }
    if let TextValue::Error(error) = pattern {
        return BoolValue::Error(error);
    }
    if subject == TextValue::Unknown || pattern == TextValue::Unknown {
        return BoolValue::Unknown;
    }
    if subject == TextValue::Null || pattern == TextValue::Null {
        return BoolValue::Null;
    }
    if let TextValue::Value(subject_value) = subject {
        if let TextValue::Value(pattern_value) = pattern {
            let result = find(
                pattern_value,
                subject_value,
                0,
                RegexOptions {
                    syntax: Syntax::Advanced,
                    case_sensitive: true,
                    expanded: false,
                    newline: NewlineMode::Ordinary,
                },
            );
            if result == MatchOutcome::InvalidPattern {
                let error = make_sql_error(SQLSTATE_INVALID_REGEX);
                return BoolValue::Error(error);
            }
            if result == MatchOutcome::Uncertain {
                return BoolValue::Unknown;
            }
            if result == MatchOutcome::NoMatch {
                return BoolValue::Value(false);
            }
            return BoolValue::Value(true);
        }
    }
    BoolValue::Unknown
}
