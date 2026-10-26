fn timezone_truncate_value(zone: &str, value: i64, code: i32) -> TimestamptzValue {
    let infinite = value == -9223372036854775808i64 || value == 9223372036854775807i64;
    let mut probe = value;
    if infinite {
        probe = 0i64;
    }
    let profile = session_timezone_profile(zone, probe, false);
    if profile.valid == false {
        return TimestamptzValue::Unknown;
    };
    if code <= 0 {
        if code == -1 {
            return TimestamptzValue::Error(make_sql_error(TEMPORAL_FIELD_UNSUPPORTED_ERROR));
        }
        return TimestamptzValue::Error(make_sql_error(TEMPORAL_FIELD_UNIT_ERROR));
    }
    if infinite {
        return TimestamptzValue::Value(value);
    }
    let original_offset = profile.seconds as i64;
    let local = value + original_offset * 1000000i64;
    let truncated = temporal_truncate_timestamp(local, code, true);
    if let TimestampValue::Error(error) = truncated {
        return TimestamptzValue::Error(error);
    }
    if let TimestampValue::Value(result) = truncated {
        let mut final_offset = original_offset;
        if code >= 6 {
            let adjusted = session_timezone_profile(zone, result, true);
            if adjusted.valid == false {
                return TimestamptzValue::Unknown;
            };
            final_offset = adjusted.seconds as i64;
        }
        return make_timestamptz_value(result - final_offset * 1000000i64);
    }
    TimestamptzValue::Unknown
}

pub fn sql__pg_catalog__date_trunc__6323(
    units: TextValue,
    input: TimestamptzValue,
    zone: TextValue,
    session: &str,
    limit: i32,
    utf8: bool,
    default_profile: bool,
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
    if (units == TextValue::Unknown || units == TextValue::NonNull)
        || input == TimestamptzValue::Unknown
        || (zone == TextValue::Unknown || zone == TextValue::NonNull)
    {
        return TimestamptzValue::Unknown;
    }
    if units == TextValue::Null || input == TimestamptzValue::Null || zone == TextValue::Null {
        return TimestamptzValue::Null;
    }
    let selected = timezone_lookup_name(zone, session, limit, utf8, default_profile);
    if let TextValue::Error(error) = selected {
        return TimestamptzValue::Error(error);
    };
    if let TextValue::Value(name) = selected {
        let clipped_unit = name_from_text_context(units, limit, utf8);
        if let TextValue::Value(unit) = clipped_unit {
            if let TimestamptzValue::Value(value) = input {
                return timezone_truncate_value(
                    name.as_str(),
                    value,
                    temporal_unit_code(unit.as_str()),
                );
            };
        };
    };
    TimestamptzValue::Unknown
}
