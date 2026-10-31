const SQLSTATE_INVALID_REGEX: u32 = 3452591;

pub fn eval_regex(subject: TextValue, pattern: TextValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = subject { unresolved_flavor = 1; };
    if let TextValue::Unknown = pattern { unresolved_flavor = 1; };
    if let TextValue::Unimplemented = subject { unresolved_flavor = 2; };
    if let TextValue::Unimplemented = pattern { unresolved_flavor = 2; };
    if let TextValue::Error(error) = subject {
        return BoolValue::Error(error);
    }
    if let TextValue::Error(error) = pattern {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_15_4: i32 = unresolved_flavor; if let TextValue::Unknown = subject { if condition_flavor_15_4 < 1 { condition_flavor_15_4 = 1; }; }; if let TextValue::Unimplemented = subject { condition_flavor_15_4 = 2; }; if let TextValue::Unknown = pattern { if condition_flavor_15_4 < 1 { condition_flavor_15_4 = 1; }; }; if let TextValue::Unimplemented = pattern { condition_flavor_15_4 = 2; }; if ((subject == TextValue::Unknown || subject == TextValue::Unimplemented) || subject == TextValue::NonNull) || ((pattern == TextValue::Unknown || pattern == TextValue::Unimplemented) || pattern == TextValue::NonNull) {
        return bool_unresolved(condition_flavor_15_4);
    }
    if subject == TextValue::Null || pattern == TextValue::Null {
        return BoolValue::Null;
    }
    if let TextValue::Value(subject_value) = subject {
        if let TextValue::Value(pattern_value) = pattern {
            let result = find(
                pattern_value.as_str(),
                subject_value.as_str(),
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
                return bool_unresolved(unresolved_flavor);
            }
            if result == MatchOutcome::NoMatch {
                return BoolValue::Value(false);
            }
            return BoolValue::Value(true);
        }
    }
    bool_unresolved(unresolved_flavor)
}
