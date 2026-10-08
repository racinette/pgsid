fn regex_count_value(
    subject: TextValue,
    pattern: TextValue,
    starting: Int4Value,
    flags: TextValue,
) -> Int4Value {
    if let TextValue::Error(error) = subject {
        return Int4Value::Error(error);
    }
    if let TextValue::Error(error) = pattern {
        return Int4Value::Error(error);
    }
    if let Int4Value::Error(error) = starting {
        return Int4Value::Error(error);
    }
    if let TextValue::Error(error) = flags {
        return Int4Value::Error(error);
    }
    if subject == TextValue::Unknown
        || pattern == TextValue::Unknown
        || starting == Int4Value::Unknown
        || flags == TextValue::Unknown
    {
        return Int4Value::Unknown;
    }
    if subject == TextValue::Null
        || pattern == TextValue::Null
        || starting == Int4Value::Null
        || flags == TextValue::Null
    {
        return Int4Value::Null;
    }
    if let TextValue::Value(subject_value) = subject {
        if let TextValue::Value(pattern_value) = pattern {
            if let Int4Value::Value(starting_value) = starting {
                if let TextValue::Value(flags_value) = flags {
                    if starting_value <= 0 {
                        return Int4Value::Error(make_sql_error(REGEX_PARAMETER_ERROR));
                    }
                    let configuration = parse_regex_flags(flags_value.as_str());
                    if configuration.valid == false || configuration.global {
                        return Int4Value::Error(make_sql_error(REGEX_PARAMETER_ERROR));
                    }
                    let from: usize = usize::try_from(starting_value - 1).unwrap_or(0);
                    let result = count(
                        pattern_value.as_str(),
                        subject_value.as_str(),
                        from,
                        configuration.options,
                    );
                    if let CountOutcome::InvalidPattern = result {
                        return Int4Value::Error(make_sql_error(SQLSTATE_INVALID_REGEX));
                    }
                    if let CountOutcome::Count(value) = result {
                        if value > 2147483647 {
                            return Int4Value::Unknown;
                        }
                        let matches: i32 = value as i32;
                        return Int4Value::Value(matches);
                    }
                }
            }
        }
    }
    Int4Value::Unknown
}

pub fn sql__pg_catalog__regexp_count__qve5(subject: TextValue, pattern: TextValue) -> Int4Value {
    regex_count_value(subject, pattern, make_int4_value(1), make_text_value(""))
}

pub fn sql__pg_catalog__regexp_count__42sy(
    subject: TextValue,
    pattern: TextValue,
    starting: Int4Value,
) -> Int4Value {
    regex_count_value(subject, pattern, starting, make_text_value(""))
}

pub fn sql__pg_catalog__regexp_count__lcbk(
    subject: TextValue,
    pattern: TextValue,
    starting: Int4Value,
    flags: TextValue,
) -> Int4Value {
    regex_count_value(subject, pattern, starting, flags)
}
