fn timezone_extract_offset_field(unit: &str) -> i32 {
    if temporal_unit_code(unit) != -1 {
        return 0;
    };
    let chars: Vec<char> = unit.chars().collect();
    let mut key = String::new();
    let mut index: usize = 0;
    while index < chars.len() && index < 10 {
        key.push(chars[index].to_ascii_lowercase());
        index += 1;
    }
    if key.as_str() == "timezone" {
        return 1;
    };
    if key.as_str() == "timezone_h" {
        return 2;
    };
    if key.as_str() == "timezone_m" {
        return 3;
    };
    0
}

fn timezone_extract_number(
    units: TextValue,
    input: TimestamptzValue,
    session: &str,
    limit: i32,
    utf8: bool,
) -> NumericValue {
    if let TextValue::Error(error) = units {
        return NumericValue::Error(error);
    };
    if let TimestamptzValue::Error(error) = input {
        return NumericValue::Error(error);
    };
    if units == TextValue::Unknown || input == TimestamptzValue::Unknown {
        return NumericValue::Unknown;
    };
    if units == TextValue::Null || input == TimestamptzValue::Null {
        return NumericValue::Null;
    };
    let clipped = name_from_text_context(units, limit, utf8);
    if let TextValue::Value(unit) = clipped {
        if let TimestamptzValue::Value(value) = input {
            let code = temporal_extract_code(unit.as_str());
            let offset_field = timezone_extract_offset_field(unit.as_str());
            if code == 19
                || value == -9223372036854775808i64
                || value == 9223372036854775807i64
                || (code <= 0 && offset_field == 0)
            {
                return temporal_extract_timestamp_value(value, unit.as_str(), true);
            };
            let profile = session_timezone_profile(session, value, false);
            if profile.valid == false {
                return NumericValue::Unknown;
            };
            let mut seconds = profile.seconds;
            if offset_field > 0 {
                if offset_field == 2 {
                    seconds = seconds / 3600;
                } else if offset_field == 3 {
                    seconds = (seconds / 60) % 60;
                };
                return NumericValue::Value(text_signed_number(seconds as i64));
            };
            let projected = value + (seconds as i64) * 1000000i64;
            return temporal_extract_timestamp_value(projected, unit.as_str(), true);
        };
    };
    NumericValue::Unknown
}

pub fn sql__pg_catalog__extract__yxyk(
    units: TextValue,
    input: TimestamptzValue,
    session: &str,
    limit: i32,
    utf8: bool,
) -> NumericValue {
    timezone_extract_number(units, input, session, limit, utf8)
}

pub fn sql__pg_catalog__date_part__jhr8(
    units: TextValue,
    input: TimestamptzValue,
    session: &str,
    limit: i32,
    utf8: bool,
) -> Float8Value {
    let number = timezone_extract_number(units.clone(), input, session, limit, utf8);
    let clipped = name_from_text_context(units, limit, utf8);
    if let TextValue::Value(unit) = clipped {
        if let TimestamptzValue::Value(value) = input {
            let code = temporal_extract_code(unit.as_str());
            if (code == 2 || code == 3 || code == 14)
                && value != -9223372036854775808i64
                && value != 9223372036854775807i64
            {
                let profile = session_timezone_profile(session, value, false);
                if profile.valid == false {
                    return Float8Value::Unknown;
                };
                return temporal_timestamp_legacy_value(
                    number,
                    unit.as_str(),
                    value + (profile.seconds as i64) * 1000000i64,
                );
            };
            return temporal_timestamp_legacy_value(number, unit.as_str(), value);
        };
    };
    sql__pg_catalog__float8__bkfn(number)
}
