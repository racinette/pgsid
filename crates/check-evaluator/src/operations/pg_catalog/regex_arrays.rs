struct RegexArraySource {
    characters: Vec<char>,
}

fn regex_array_field(source: &RegexArraySource, start: usize, end: usize) -> ArrayElement {
    let mut text = String::new();
    let mut position = start;
    while position < end {
        text.push(source.characters[position]);
        position += 1;
    }
    array_element_from_text(TextValue::Value(text))
}

fn regex_array_value(
    subject: TextValue,
    pattern: TextValue,
    flags: TextValue,
    split: bool,
    c_collation: bool,
) -> ArrayValue {
    if let TextValue::Error(error) = subject {
        return ArrayValue::Error(error);
    };
    if let TextValue::Error(error) = pattern {
        return ArrayValue::Error(error);
    };
    if let TextValue::Error(error) = flags {
        return ArrayValue::Error(error);
    };
    if subject == TextValue::Null || pattern == TextValue::Null || flags == TextValue::Null {
        return ArrayValue::Null;
    };
    if let TextValue::Value(source) = subject {
        if let TextValue::Value(expression) = pattern {
            if let TextValue::Value(options) = flags {
                let configuration = parse_regex_flags(options.as_str());
                if configuration.valid == false || configuration.global {
                    return ArrayValue::Error(make_sql_error(REGEX_PARAMETER_ERROR));
                };
                if c_collation == false {
                    return ArrayValue::Unknown;
                };
                let characters = RegexArraySource {
                    characters: source.chars().collect(),
                };
                let mut output = make_array_arguments("pg_catalog.text", 8);
                let mut count: i32 = 0;
                if split {
                    let result = find_all(
                        expression.as_str(),
                        source.as_str(),
                        0,
                        configuration.options,
                    );
                    if let MatchListOutcome::InvalidPattern = result {
                        return ArrayValue::Error(make_sql_error(SQLSTATE_INVALID_REGEX));
                    };
                    if let MatchListOutcome::Matches(matches) = result {
                        let mut previous_end: usize = 0;
                        let mut field_start: usize = 0;
                        let mut position: usize = 0;
                        while position < matches.len() {
                            let span = matches[position];
                            if span.start < characters.characters.len() && span.end > previous_end {
                                let field = regex_array_field(&characters, field_start, span.start);
                                output = append_array_argument(output, field);
                                count = count + 1;
                                field_start = span.end;
                            };
                            previous_end = span.end;
                            position += 1;
                        }
                        let last = regex_array_field(
                            &characters,
                            field_start,
                            characters.characters.len(),
                        );
                        output = append_array_argument(output, last);
                        return array_string_finish(output, count + 1);
                    };
                } else {
                    let result = captures(
                        expression.as_str(),
                        source.as_str(),
                        0,
                        configuration.options,
                    );
                    if let CaptureOutcome::InvalidPattern = result {
                        return ArrayValue::Error(make_sql_error(SQLSTATE_INVALID_REGEX));
                    };
                    if let CaptureOutcome::NoMatch = result {
                        return ArrayValue::Null;
                    };
                    if let CaptureOutcome::Found(groups) = result {
                        let mut position: usize = 0;
                        if groups.len() > 1 {
                            position = 1;
                        };
                        while position < groups.len() {
                            let span = groups[position];
                            let mut field = ArrayElement::Null;
                            if span.matched {
                                field = regex_array_field(&characters, span.start, span.end);
                            };
                            output = append_array_argument(output, field);
                            count = count + 1;
                            position += 1;
                        }
                        return array_string_finish(output, count);
                    };
                };
            };
        };
    };
    ArrayValue::Unknown
}

pub fn sql__pg_catalog__regexp_match__v82p(
    subject: TextValue,
    pattern: TextValue,
    c_collation: bool,
) -> ArrayValue {
    regex_array_value(subject, pattern, make_text_value(""), false, c_collation)
}

pub fn sql__pg_catalog__regexp_match__816h(
    subject: TextValue,
    pattern: TextValue,
    flags: TextValue,
    c_collation: bool,
) -> ArrayValue {
    regex_array_value(subject, pattern, flags, false, c_collation)
}

pub fn sql__pg_catalog__regexp_split_to_array__b4o9(
    subject: TextValue,
    pattern: TextValue,
    c_collation: bool,
) -> ArrayValue {
    regex_array_value(subject, pattern, make_text_value(""), true, c_collation)
}

pub fn sql__pg_catalog__regexp_split_to_array__pmgu(
    subject: TextValue,
    pattern: TextValue,
    flags: TextValue,
    c_collation: bool,
) -> ArrayValue {
    regex_array_value(subject, pattern, flags, true, c_collation)
}
