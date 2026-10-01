fn timezone_is_utc(name: &str) -> bool {
    let chars: Vec<char> = name.chars().collect();
    chars.len() == 3
        && chars[0].to_ascii_lowercase() == 'u'
        && chars[1].to_ascii_lowercase() == 't'
        && chars[2].to_ascii_lowercase() == 'c'
}

pub fn sql__pg_catalog__timezone__9nbk(zone: TextValue, value: TimestampValue) -> TimestamptzValue {
    if let TextValue::Error(error) = zone {
        return TimestamptzValue::Error(error);
    }
    if let TimestampValue::Error(error) = value {
        return TimestamptzValue::Error(error);
    }
    if zone == TextValue::Unknown || value == TimestampValue::Unknown {
        return TimestamptzValue::Unknown;
    }
    if zone == TextValue::Null || value == TimestampValue::Null {
        return TimestamptzValue::Null;
    }
    if let TimestampValue::Value(microseconds) = value {
        if microseconds == -9223372036854775808i64 || microseconds == 9223372036854775807i64 {
            return make_timestamptz_value(microseconds);
        }
        if let TextValue::Value(name) = zone {
            if timezone_is_utc(name) {
                return make_timestamptz_value(microseconds);
            }
        }
    }
    TimestamptzValue::Unknown
}

pub fn sql__pg_catalog__timezone__blof(zone: TextValue, value: TimestamptzValue) -> TimestampValue {
    if let TextValue::Error(error) = zone {
        return TimestampValue::Error(error);
    }
    if let TimestamptzValue::Error(error) = value {
        return TimestampValue::Error(error);
    }
    if zone == TextValue::Unknown || value == TimestamptzValue::Unknown {
        return TimestampValue::Unknown;
    }
    if zone == TextValue::Null || value == TimestamptzValue::Null {
        return TimestampValue::Null;
    }
    if let TimestamptzValue::Value(microseconds) = value {
        if microseconds == -9223372036854775808i64 || microseconds == 9223372036854775807i64 {
            return make_timestamp_value(microseconds);
        }
        if let TextValue::Value(name) = zone {
            if timezone_is_utc(name) {
                return make_timestamp_value(microseconds);
            }
        }
    }
    TimestampValue::Unknown
}
