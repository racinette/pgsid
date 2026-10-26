pub fn sql__pg_catalog__to_char__ly1v(
    input: TimestamptzValue,
    template: TextValue,
    session: &str,
    locale_c: bool,
    collation_c: bool,
) -> TextValue {
    if let TimestamptzValue::Error(error) = input {
        return TextValue::Error(error);
    };
    if let TextValue::Error(error) = template {
        return TextValue::Error(error);
    };
    if input == TimestamptzValue::Unknown || template == TextValue::Unknown {
        return TextValue::Unknown;
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
    TextValue::Unknown
}
