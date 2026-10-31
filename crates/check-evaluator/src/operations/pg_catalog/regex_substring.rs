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
    // A CHECK runs the inlined body, substring($1, similar_to_escape($2, $3)), so the escape
    // translation runs before the outer strictness check: a NULL subject still raises an
    // invalid escape, while a NULL pattern or escape skips the translation.
    if pattern == TextValue::Null || escape == TextValue::Null {
        return TextValue::Null;
    }
    if (pattern == TextValue::Unknown || pattern == TextValue::NonNull)
        || (escape == TextValue::Unknown || escape == TextValue::NonNull)
    {
        return TextValue::Unknown;
    }
    let translated = sql__pg_catalog__similar_to_escape__9vor(pattern, escape);
    if let TextValue::Error(error) = translated {
        return TextValue::Error(error);
    }
    if subject == TextValue::Null {
        return TextValue::Null;
    }
    if subject == TextValue::Unknown || subject == TextValue::NonNull {
        return TextValue::Unknown;
    }
    sql__pg_catalog__substring__qwhf(subject, translated)
}
