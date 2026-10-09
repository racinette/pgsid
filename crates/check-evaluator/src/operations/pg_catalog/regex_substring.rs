pub fn sql__pg_catalog__substring__qwhf(subject: TextValue, pattern: TextValue) -> TextValue {
    regex_substring_value(
        subject,
        pattern,
        make_int4_value(1),
        make_int4_value(1),
        make_text_value(""),
        make_int4_value(1),
    )
}

pub fn sql__pg_catalog__substring__knrk(
    subject: TextValue,
    pattern: TextValue,
    escape: TextValue,
) -> TextValue {
    if let TextValue::Error(error) = subject {
        return TextValue::Error(error);
    }
    if let TextValue::Error(error) = pattern {
        return TextValue::Error(error);
    }
    if let TextValue::Error(error) = escape {
        return TextValue::Error(error);
    }
    if subject == TextValue::Unknown
        || pattern == TextValue::Unknown
        || escape == TextValue::Unknown
    {
        return TextValue::Unknown;
    }
    if subject == TextValue::Null || pattern == TextValue::Null || escape == TextValue::Null {
        return TextValue::Null;
    }
    let translated = sql__pg_catalog__similar_to_escape__9vor(pattern, escape);
    sql__pg_catalog__substring__qwhf(subject, translated)
}
