fn timezone_truncate_value(zone: &str, value: i64, code: i32) -> TimestamptzValue {
    let infinite = value == -9223372036854775808i64 || value == 9223372036854775807i64;
    let mut probe = value;
    if infinite {
        probe = 0i64;
    }
    let offset = timezone_offset(zone, probe, false);
    if let Int4Value::Error(error) = offset {
        return TimestamptzValue::Error(error);
    }
    if offset == Int4Value::Unknown {
        return TimestamptzValue::Unknown;
    }
    if code <= 0 {
        if code == -1 {
            return TimestamptzValue::Error(make_sql_error(TEMPORAL_FIELD_UNSUPPORTED_ERROR));
        }
        return TimestamptzValue::Error(make_sql_error(TEMPORAL_FIELD_UNIT_ERROR));
    }
    if infinite {
        return TimestamptzValue::Value(value);
    }
    if let Int4Value::Value(seconds) = offset {
        let original_offset = seconds as i64;
        let local = value + original_offset * 1000000i64;
        let truncated = temporal_truncate_timestamp(local, code);
        if let TimestampValue::Error(error) = truncated {
            return TimestamptzValue::Error(error);
        }
        if let TimestampValue::Value(result) = truncated {
            let mut final_offset = original_offset;
            if code >= 6 {
                let adjusted = timezone_offset(zone, result, true);
                if let Int4Value::Error(error) = adjusted {
                    return TimestamptzValue::Error(error);
                }
                if adjusted == Int4Value::Unknown {
                    return TimestamptzValue::Unknown;
                }
                if adjusted == Int4Value::Null {
                    return TimestamptzValue::Unknown;
                }
                if let Int4Value::Value(seconds) = adjusted {
                    final_offset = seconds as i64;
                }
            }
            return make_timestamptz_value(result - final_offset * 1000000i64);
        }
    }
    TimestamptzValue::Unknown
}

pub fn sql__pg_catalog__date_trunc__6323(
    units: TextValue,
    input: TimestamptzValue,
    zone: TextValue,
) -> TimestamptzValue {
    if let TextValue::Error(error) = units {
        return TimestamptzValue::Error(error);
    }
    if let TimestamptzValue::Error(error) = input {
        return TimestamptzValue::Error(error);
    }
    if let TextValue::Error(error) = zone {
        return TimestamptzValue::Error(error);
    }
    if units == TextValue::Unknown
        || input == TimestamptzValue::Unknown
        || zone == TextValue::Unknown
    {
        return TimestamptzValue::Unknown;
    }
    if units == TextValue::Null || input == TimestamptzValue::Null || zone == TextValue::Null {
        return TimestamptzValue::Null;
    }
    if let TextValue::Value(unit) = units {
        if let TimestamptzValue::Value(value) = input {
            if let TextValue::Value(name) = zone {
                return timezone_truncate_value(
                    name.as_str(),
                    value,
                    temporal_unit_code(unit.as_str()),
                );
            }
        }
    }
    TimestamptzValue::Unknown
}
