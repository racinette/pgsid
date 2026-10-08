fn regex_replacement_text(replacement: &str, subject: &str, groups: Vec<CaptureSpan>) -> String {
    let characters: Vec<char> = replacement.chars().collect();
    let source: Vec<char> = subject.chars().collect();
    let mut output = String::new();
    let mut index: usize = 0;
    while index < characters.len() {
        let character = characters[index];
        index += 1;
        if character != '\\' || index >= characters.len() {
            output.push(character);
        } else {
            let escaped = characters[index];
            let code: i32 = escaped as i32;
            let mut group: usize = 0;
            let mut reference = false;
            if code >= 49 && code <= 57 {
                group = usize::try_from(code - 48).unwrap_or(0);
                reference = true;
            } else if escaped == '&' {
                reference = true;
            } else if escaped == '\\' {
                output.push('\\');
            } else {
                output.push('\\');
                output.push(escaped);
            }
            if reference && group < groups.len() {
                let span = groups[group];
                if span.matched {
                    let mut position = span.start;
                    while position < span.end {
                        output.push(source[position]);
                        position += 1;
                    }
                }
            }
            index += 1;
        };
    }
    output
}

fn regex_replace_value(
    subject: TextValue,
    pattern: TextValue,
    replacement: TextValue,
    starting: Int4Value,
    occurrence: Int4Value,
    flags: TextValue,
    infer_occurrence: bool,
) -> TextValue {
    if let TextValue::Error(error) = subject {
        return TextValue::Error(error);
    }
    if let TextValue::Error(error) = pattern {
        return TextValue::Error(error);
    }
    if let TextValue::Error(error) = replacement {
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
    if subject == TextValue::Unknown
        || pattern == TextValue::Unknown
        || replacement == TextValue::Unknown
        || starting == Int4Value::Unknown
        || occurrence == Int4Value::Unknown
        || flags == TextValue::Unknown
    {
        return TextValue::Unknown;
    }
    if subject == TextValue::Null
        || pattern == TextValue::Null
        || replacement == TextValue::Null
        || starting == Int4Value::Null
        || occurrence == Int4Value::Null
        || flags == TextValue::Null
    {
        return TextValue::Null;
    }
    if let TextValue::Value(subject_value) = subject {
        if let TextValue::Value(pattern_value) = pattern {
            if let TextValue::Value(replacement_value) = replacement {
                if let Int4Value::Value(starting_value) = starting {
                    if let Int4Value::Value(occurrence_value) = occurrence {
                        if let TextValue::Value(flags_value) = flags {
                            if starting_value <= 0 || occurrence_value < 0 {
                                return TextValue::Error(make_sql_error(REGEX_PARAMETER_ERROR));
                            }
                            let configuration = parse_regex_flags(flags_value.as_str());
                            if configuration.valid == false {
                                return TextValue::Error(make_sql_error(REGEX_PARAMETER_ERROR));
                            }
                            let mut selected = occurrence_value;
                            if infer_occurrence && configuration.global {
                                selected = 0;
                            }
                            let compilation =
                                compile(pattern_value.as_str(), configuration.options);
                            if let CompileOutcome::InvalidPattern = compilation {
                                return TextValue::Error(make_sql_error(SQLSTATE_INVALID_REGEX));
                            }
                            if let CompileOutcome::Compiled(program) = compilation {
                                let characters: Vec<char> = subject_value.chars().collect();
                                let mut output = String::new();
                                let mut copied: usize = 0;
                                let mut from: usize =
                                    usize::try_from(starting_value - 1).unwrap_or(0);
                                let mut matches: i32 = 0;
                                while from <= characters.len() {
                                    let found =
                                        captures_compiled(&program, subject_value.as_str(), from);
                                    if let CaptureOutcome::InvalidPattern = found {
                                        return TextValue::Error(make_sql_error(
                                            SQLSTATE_INVALID_REGEX,
                                        ));
                                    }
                                    if let CaptureOutcome::Uncertain = found {
                                        return TextValue::Unknown;
                                    }
                                    if let CaptureOutcome::NoMatch = found {
                                        break;
                                    }
                                    if let CaptureOutcome::Found(groups) = found {
                                        if groups.len() == 0 || matches == 2147483647 {
                                            return TextValue::Unknown;
                                        }
                                        let whole = groups[0];
                                        if whole.matched == false {
                                            return TextValue::Unknown;
                                        }
                                        matches = matches + 1;
                                        if selected == 0 || selected == matches {
                                            while copied < whole.start {
                                                output.push(characters[copied]);
                                                copied += 1;
                                            }
                                            let expanded = regex_replacement_text(
                                                replacement_value.as_str(),
                                                subject_value.as_str(),
                                                groups,
                                            );
                                            output.push_str(expanded.as_str());
                                            copied = whole.end;
                                            if selected > 0 {
                                                break;
                                            }
                                        }
                                        from = whole.end;
                                        if whole.start == whole.end {
                                            if from >= characters.len() {
                                                break;
                                            }
                                            from += 1;
                                        }
                                    }
                                }
                                while copied < characters.len() {
                                    output.push(characters[copied]);
                                    copied += 1;
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

pub fn sql__pg_catalog__regexp_replace__q5ba(
    subject: TextValue,
    pattern: TextValue,
    replacement: TextValue,
) -> TextValue {
    regex_replace_value(
        subject,
        pattern,
        replacement,
        make_int4_value(1),
        make_int4_value(1),
        make_text_value(""),
        true,
    )
}

pub fn sql__pg_catalog__regexp_replace__7z9g(
    subject: TextValue,
    pattern: TextValue,
    replacement: TextValue,
    starting: Int4Value,
) -> TextValue {
    regex_replace_value(
        subject,
        pattern,
        replacement,
        starting,
        make_int4_value(1),
        make_text_value(""),
        true,
    )
}

pub fn sql__pg_catalog__regexp_replace__ohuj(
    subject: TextValue,
    pattern: TextValue,
    replacement: TextValue,
    starting: Int4Value,
    occurrence: Int4Value,
) -> TextValue {
    regex_replace_value(
        subject,
        pattern,
        replacement,
        starting,
        occurrence,
        make_text_value(""),
        false,
    )
}

pub fn sql__pg_catalog__regexp_replace__j9on(
    subject: TextValue,
    pattern: TextValue,
    replacement: TextValue,
    starting: Int4Value,
    occurrence: Int4Value,
    flags: TextValue,
) -> TextValue {
    regex_replace_value(
        subject,
        pattern,
        replacement,
        starting,
        occurrence,
        flags,
        false,
    )
}

pub fn sql__pg_catalog__regexp_replace__3spp(
    subject: TextValue,
    pattern: TextValue,
    replacement: TextValue,
    flags: TextValue,
) -> TextValue {
    regex_replace_value(
        subject,
        pattern,
        replacement,
        make_int4_value(1),
        make_int4_value(1),
        flags,
        true,
    )
}
