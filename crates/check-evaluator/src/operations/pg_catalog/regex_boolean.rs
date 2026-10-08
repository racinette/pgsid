fn regex_boolean(
    subject: TextValue,
    pattern: TextValue,
    flags: TextValue,
    negate: bool,
) -> BoolValue {
    if let TextValue::Error(error) = subject {
        return BoolValue::Error(error);
    }
    if let TextValue::Error(error) = pattern {
        return BoolValue::Error(error);
    }
    if let TextValue::Error(error) = flags {
        return BoolValue::Error(error);
    }
    if subject == TextValue::Unknown || pattern == TextValue::Unknown || flags == TextValue::Unknown
    {
        return BoolValue::Unknown;
    }
    if subject == TextValue::Null || pattern == TextValue::Null || flags == TextValue::Null {
        return BoolValue::Null;
    }
    if let TextValue::Value(subject_value) = subject {
        if let TextValue::Value(pattern_value) = pattern {
            if let TextValue::Value(flags_value) = flags {
                let configuration = parse_regex_flags(flags_value.as_str());
                if configuration.valid == false || configuration.global {
                    return BoolValue::Error(make_sql_error(REGEX_PARAMETER_ERROR));
                }
                let result = find(
                    pattern_value.as_str(),
                    subject_value.as_str(),
                    0,
                    configuration.options,
                );
                if result == MatchOutcome::InvalidPattern {
                    return BoolValue::Error(make_sql_error(SQLSTATE_INVALID_REGEX));
                }
                if result == MatchOutcome::Uncertain {
                    return BoolValue::Unknown;
                }
                return BoolValue::Value((result != MatchOutcome::NoMatch) != negate);
            }
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__bpcharicregexeq__9nfg(subject: TextValue, pattern: TextValue) -> BoolValue {
    regex_boolean(subject, pattern, make_text_value("i"), false)
}

pub fn sql__pg_catalog__bpcharicregexne__7eml(subject: TextValue, pattern: TextValue) -> BoolValue {
    regex_boolean(subject, pattern, make_text_value("i"), true)
}

pub fn sql__pg_catalog__bpcharregexeq__47kg(subject: TextValue, pattern: TextValue) -> BoolValue {
    regex_boolean(subject, pattern, make_text_value(""), false)
}

pub fn sql__pg_catalog__bpcharregexne__w9ql(subject: TextValue, pattern: TextValue) -> BoolValue {
    regex_boolean(subject, pattern, make_text_value(""), true)
}

pub fn sql__pg_catalog__regexp_like__k08m(subject: TextValue, pattern: TextValue) -> BoolValue {
    regex_boolean(subject, pattern, make_text_value(""), false)
}

pub fn sql__pg_catalog__regexp_like__e0p7(
    subject: TextValue,
    pattern: TextValue,
    flags: TextValue,
) -> BoolValue {
    regex_boolean(subject, pattern, flags, false)
}

pub fn sql__pg_catalog__texticregexeq__adni(subject: TextValue, pattern: TextValue) -> BoolValue {
    regex_boolean(subject, pattern, make_text_value("i"), false)
}

pub fn sql__pg_catalog__texticregexne__qddm(subject: TextValue, pattern: TextValue) -> BoolValue {
    regex_boolean(subject, pattern, make_text_value("i"), true)
}

pub fn sql__pg_catalog__textregexeq__u1ia(subject: TextValue, pattern: TextValue) -> BoolValue {
    regex_boolean(subject, pattern, make_text_value(""), false)
}

pub fn sql__pg_catalog__textregexne__aatj(subject: TextValue, pattern: TextValue) -> BoolValue {
    regex_boolean(subject, pattern, make_text_value(""), true)
}
