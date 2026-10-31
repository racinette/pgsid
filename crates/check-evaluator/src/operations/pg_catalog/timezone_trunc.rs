fn timezone_truncate_value(zone: &str, value: i64, code: i32) -> TimestamptzValue {
    let unresolved_flavor: i32 = 0;
    let infinite = value == -9223372036854775808i64 || value == 9223372036854775807i64;
    let mut probe = value;
    if infinite {
        probe = 0i64;
    }
    let profile = session_timezone_profile(zone, probe, false);
    if profile.valid == false {
        return timestamptz_unresolved(unresolved_flavor);
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
                return timestamptz_unresolved(unresolved_flavor);
            };
            final_offset = adjusted.seconds as i64;
        }
        return make_timestamptz_value(result - final_offset * 1000000i64);
    }
    timestamptz_unresolved(unresolved_flavor)
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
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = units { unresolved_flavor = 1; };
    if let TimestamptzValue::Unknown = input { unresolved_flavor = 1; };
    if let TextValue::Unknown = zone { unresolved_flavor = 1; };
    if let TextValue::Unimplemented = units { unresolved_flavor = 2; };
    if let TimestamptzValue::Unimplemented = input { unresolved_flavor = 2; };
    if let TextValue::Unimplemented = zone { unresolved_flavor = 2; };
    if let TextValue::Error(error) = units {
        return TimestamptzValue::Error(error);
    }
    if let TimestamptzValue::Error(error) = input {
        return TimestamptzValue::Error(error);
    }
    if let TextValue::Error(error) = zone {
        return TimestamptzValue::Error(error);
    }
    let mut condition_flavor_66_4: i32 = unresolved_flavor; if let TextValue::Unknown = units { if condition_flavor_66_4 < 1 { condition_flavor_66_4 = 1; }; }; if let TextValue::Unimplemented = units { condition_flavor_66_4 = 2; }; if let TimestamptzValue::Unknown = input { if condition_flavor_66_4 < 1 { condition_flavor_66_4 = 1; }; }; if let TimestamptzValue::Unimplemented = input { condition_flavor_66_4 = 2; }; if let TextValue::Unknown = zone { if condition_flavor_66_4 < 1 { condition_flavor_66_4 = 1; }; }; if let TextValue::Unimplemented = zone { condition_flavor_66_4 = 2; }; if (units == TextValue::Unknown || units == TextValue::Unimplemented)
        || (input == TimestamptzValue::Unknown || input == TimestamptzValue::Unimplemented)
        || (zone == TextValue::Unknown || zone == TextValue::Unimplemented)
    {
        return timestamptz_unresolved(condition_flavor_66_4);
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
    timestamptz_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__date_trunc__7d7s(
    units: TextValue,
    input: TimestamptzValue,
    session: &str,
    limit: i32,
    utf8: bool,
) -> TimestamptzValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = units { unresolved_flavor = 1; };
    if let TimestamptzValue::Unknown = input { unresolved_flavor = 1; };
    if let TextValue::Unimplemented = units { unresolved_flavor = 2; };
    if let TimestamptzValue::Unimplemented = input { unresolved_flavor = 2; };
    if let TextValue::Error(error) = units {
        return TimestamptzValue::Error(error);
    };
    if let TimestamptzValue::Error(error) = input {
        return TimestamptzValue::Error(error);
    };
    let mut condition_flavor_112_4: i32 = unresolved_flavor; if let TextValue::Unknown = units { if condition_flavor_112_4 < 1 { condition_flavor_112_4 = 1; }; }; if let TextValue::Unimplemented = units { condition_flavor_112_4 = 2; }; if let TimestamptzValue::Unknown = input { if condition_flavor_112_4 < 1 { condition_flavor_112_4 = 1; }; }; if let TimestamptzValue::Unimplemented = input { condition_flavor_112_4 = 2; }; if (units == TextValue::Unknown || units == TextValue::Unimplemented) || (input == TimestamptzValue::Unknown || input == TimestamptzValue::Unimplemented) {
        return timestamptz_unresolved(condition_flavor_112_4);
    };
    if units == TextValue::Null || input == TimestamptzValue::Null {
        return TimestamptzValue::Null;
    };
    let clipped = name_from_text_context(units, limit, utf8);
    if let TextValue::Value(unit) = clipped {
        let code = temporal_unit_code(unit.as_str());
        if code <= 0 {
            if code == -1 {
                return TimestamptzValue::Error(make_sql_error(TEMPORAL_FIELD_UNSUPPORTED_ERROR));
            };
            return TimestamptzValue::Error(make_sql_error(TEMPORAL_FIELD_UNIT_ERROR));
        };
        if let TimestamptzValue::Value(value) = input {
            if value == -9223372036854775808i64 || value == 9223372036854775807i64 {
                return input;
            };
            if code <= 3 && value == 9223371331200000000i64 {
                return TimestamptzValue::Error(make_sql_error(CLOCK_RANGE));
            };
            let margin = 2147483648i64 * 1000000i64;
            // Every signed 32-bit offset keeps this local timestamp inside the finite input range.
            if code <= 3
                && value >= -211813488000000000i64 + margin
                && value < 9223371331200000000i64 - margin
            {
                let truncated = temporal_truncate_timestamp(value, code, false);
                if let TimestampValue::Value(result) = truncated {
                    return make_timestamptz_value(result);
                };
            };
            return timezone_truncate_value(session, value, code);
        };
    };
    timestamptz_unresolved(unresolved_flavor)
}
