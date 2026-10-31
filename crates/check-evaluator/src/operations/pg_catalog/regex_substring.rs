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
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = subject { unresolved_flavor = 1; };
    if let TextValue::Unknown = pattern { unresolved_flavor = 1; };
    if let TextValue::Unknown = escape { unresolved_flavor = 1; };
    if let TextValue::Unimplemented = subject { unresolved_flavor = 2; };
    if let TextValue::Unimplemented = pattern { unresolved_flavor = 2; };
    if let TextValue::Unimplemented = escape { unresolved_flavor = 2; };
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
    let mut condition_flavor_39_4: i32 = unresolved_flavor; if let TextValue::Unknown = pattern { if condition_flavor_39_4 < 1 { condition_flavor_39_4 = 1; }; }; if let TextValue::Unimplemented = pattern { condition_flavor_39_4 = 2; }; if let TextValue::Unknown = escape { if condition_flavor_39_4 < 1 { condition_flavor_39_4 = 1; }; }; if let TextValue::Unimplemented = escape { condition_flavor_39_4 = 2; }; if ((pattern == TextValue::Unknown || pattern == TextValue::Unimplemented) || pattern == TextValue::NonNull)
        || ((escape == TextValue::Unknown || escape == TextValue::Unimplemented) || escape == TextValue::NonNull)
    {
        return text_unresolved(condition_flavor_39_4);
    }
    let translated = sql__pg_catalog__similar_to_escape__9vor(pattern, escape);
    if let TextValue::Error(error) = translated {
        return TextValue::Error(error);
    }
    if subject == TextValue::Null {
        return TextValue::Null;
    }
    let mut condition_flavor_51_4: i32 = unresolved_flavor; if let TextValue::Unknown = subject { if condition_flavor_51_4 < 1 { condition_flavor_51_4 = 1; }; }; if let TextValue::Unimplemented = subject { condition_flavor_51_4 = 2; }; if (subject == TextValue::Unknown || subject == TextValue::Unimplemented) || subject == TextValue::NonNull {
        return text_unresolved(condition_flavor_51_4);
    }
    sql__pg_catalog__substring__qwhf(subject, translated)
}
