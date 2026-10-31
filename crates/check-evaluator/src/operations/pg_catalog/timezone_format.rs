pub fn sql__pg_catalog__to_char__ly1v(
    input: TimestamptzValue,
    template: TextValue,
    session: &str,
    locale_c: bool,
    collation_c: bool,
) -> TextValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestamptzValue::Unknown = input { unresolved_flavor = 1; };
    if let TextValue::Unknown = template { unresolved_flavor = 1; };
    if let TextValue::NonNull = template { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TimestamptzValue::Unimplemented = input { unresolved_flavor = 2; };
    if let TextValue::Unimplemented = template { unresolved_flavor = 2; };
    if let TimestamptzValue::Error(error) = input {
        return TextValue::Error(error);
    };
    if let TextValue::Error(error) = template {
        return TextValue::Error(error);
    };
    let mut condition_flavor_19_4: i32 = unresolved_flavor; if let TimestamptzValue::Unknown = input { if condition_flavor_19_4 < 1 { condition_flavor_19_4 = 1; }; }; if let TimestamptzValue::Unimplemented = input { condition_flavor_19_4 = 2; }; if let TextValue::Unknown = template { if condition_flavor_19_4 < 1 { condition_flavor_19_4 = 1; }; }; if let TextValue::Unimplemented = template { condition_flavor_19_4 = 2; }; if (input == TimestamptzValue::Unknown || input == TimestamptzValue::Unimplemented) || (template == TextValue::Unknown || template == TextValue::Unimplemented) {
        return text_unresolved(condition_flavor_19_4);
    };
    if input == TimestamptzValue::Null || template == TextValue::Null {
        return TextValue::Null;
    };
    if let TimestamptzValue::Value(value) = input {
        if value == -9223372036854775808i64 || value == 9223372036854775807i64 {
            return TextValue::Null;
        };
        if let TextValue::Value(format) = template {
            if format.as_str() == "" {
                return TextValue::Null;
            };
            let profile = session_timezone_profile(session, value, false);
            let fields = timestamp_format_payload(
                value,
                profile.seconds,
                profile.label,
                profile.valid,
                locale_c,
                collation_c,
            );
            return timestamp_format_render(&fields, format.as_str());
        };
    };
    text_unresolved(unresolved_flavor)
}
