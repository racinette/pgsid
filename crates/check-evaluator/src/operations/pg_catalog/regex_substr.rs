fn regex_substring_value(
    subject: TextValue,
    pattern: TextValue,
    starting: Int4Value,
    occurrence: Int4Value,
    flags: TextValue,
    subexpression: Int4Value,
) -> TextValue {
    if let TextValue::Error(error) = subject {
        return TextValue::Error(error);
    }
    if let TextValue::Error(error) = pattern {
        return TextValue::Error(error);
    }
    if let Int4Value::Error(error) = starting {
        return TextValue::Error(error);
    }
    if let Int4Value::Error(error) = occurrence {
        return TextValue::Error(error);
    }
    if let TextValue::Error(error) = flags {
        return TextValue::Error(error);
    }
    if let Int4Value::Error(error) = subexpression {
        return TextValue::Error(error);
    }
    if subject == TextValue::Unknown
        || pattern == TextValue::Unknown
        || starting == Int4Value::Unknown
        || occurrence == Int4Value::Unknown
        || flags == TextValue::Unknown
        || subexpression == Int4Value::Unknown
    {
        return TextValue::Unknown;
    }
    if subject == TextValue::Null
        || pattern == TextValue::Null
        || starting == Int4Value::Null
        || occurrence == Int4Value::Null
        || flags == TextValue::Null
        || subexpression == Int4Value::Null
    {
        return TextValue::Null;
    }
    if let TextValue::Value(subject_value) = subject {
        if let TextValue::Value(pattern_value) = pattern {
            if let Int4Value::Value(starting_value) = starting {
                if let Int4Value::Value(occurrence_value) = occurrence {
                    if let TextValue::Value(flags_value) = flags {
                        if let Int4Value::Value(subexpression_value) = subexpression {
                            if starting_value <= 0
                                || occurrence_value <= 0
                                || subexpression_value < 0
                            {
                                return TextValue::Error(make_sql_error(REGEX_PARAMETER_ERROR));
                            }
                            let configuration = parse_regex_flags(flags_value.as_str());
                            if configuration.valid == false || configuration.global {
                                return TextValue::Error(make_sql_error(REGEX_PARAMETER_ERROR));
                            }
                            let from: usize = usize::try_from(starting_value - 1).unwrap_or(0);
                            let mut subexpression_index: usize =
                                usize::try_from(subexpression_value).unwrap_or(0);
                            let result = captures_all(
                                pattern_value.as_str(),
                                subject_value.as_str(),
                                from,
                                configuration.options,
                            );
                            if let CaptureListOutcome::InvalidPattern = result {
                                return TextValue::Error(make_sql_error(SQLSTATE_INVALID_REGEX));
                            }
                            if let CaptureListOutcome::Matches(batch) = result {
                                if batch.groups_per_match == 1 && subexpression_index == 1 {
                                    subexpression_index = 0;
                                }
                                if batch.groups_per_match == 0
                                    || subexpression_index >= batch.groups_per_match
                                {
                                    return TextValue::Null;
                                }
                                let group_width: i32 = batch.groups_per_match as i32;
                                let group_count: i32 = batch.groups.len() as i32;
                                let matches: i32 = group_count / group_width;
                                if occurrence_value > matches {
                                    return TextValue::Null;
                                }
                                let selected_group: i32 = subexpression_index as i32;
                                let slot: i32 =
                                    (occurrence_value - 1) * group_width + selected_group;
                                let offset: usize = usize::try_from(slot).unwrap_or(0);
                                let span = batch.groups[offset];
                                if span.matched == false {
                                    return TextValue::Null;
                                }
                                let characters: Vec<char> = subject_value.chars().collect();
                                let mut output = String::new();
                                let mut index = span.start;
                                while index < span.end {
                                    output.push(characters[index]);
                                    index += 1;
                                }
                                return TextValue::Value(output);
                            }
                        }
                    }
                }
            }
        }
    }
    TextValue::Unknown
}

pub fn sql__pg_catalog__regexp_substr__8n0p(subject: TextValue, pattern: TextValue) -> TextValue {
    regex_substring_value(
        subject,
        pattern,
        make_int4_value(1),
        make_int4_value(1),
        make_text_value(""),
        make_int4_value(0),
    )
}

pub fn sql__pg_catalog__regexp_substr__kezj(
    subject: TextValue,
    pattern: TextValue,
    starting: Int4Value,
) -> TextValue {
    regex_substring_value(
        subject,
        pattern,
        starting,
        make_int4_value(1),
        make_text_value(""),
        make_int4_value(0),
    )
}

pub fn sql__pg_catalog__regexp_substr__4p8m(
    subject: TextValue,
    pattern: TextValue,
    starting: Int4Value,
    occurrence: Int4Value,
) -> TextValue {
    regex_substring_value(
        subject,
        pattern,
        starting,
        occurrence,
        make_text_value(""),
        make_int4_value(0),
    )
}

pub fn sql__pg_catalog__regexp_substr__0t4k(
    subject: TextValue,
    pattern: TextValue,
    starting: Int4Value,
    occurrence: Int4Value,
    flags: TextValue,
) -> TextValue {
    regex_substring_value(
        subject,
        pattern,
        starting,
        occurrence,
        flags,
        make_int4_value(0),
    )
}

pub fn sql__pg_catalog__regexp_substr__gfrh(
    subject: TextValue,
    pattern: TextValue,
    starting: Int4Value,
    occurrence: Int4Value,
    flags: TextValue,
    subexpression: Int4Value,
) -> TextValue {
    regex_substring_value(subject, pattern, starting, occurrence, flags, subexpression)
}
