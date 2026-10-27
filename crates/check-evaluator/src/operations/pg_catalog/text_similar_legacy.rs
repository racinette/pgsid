pub fn sql__pg_catalog__similar_escape__1s9l(pattern: TextValue, escape: TextValue) -> TextValue {
    if let TextValue::Error(error) = pattern {
        return TextValue::Error(error);
    };
    if let TextValue::Error(error) = escape {
        return TextValue::Error(error);
    };
    if pattern == TextValue::Null {
        return TextValue::Null;
    };
    if escape == TextValue::Null {
        return sql__pg_catalog__similar_to_escape__7txt(pattern);
    };
    similar_pattern_value(pattern, escape)
}
