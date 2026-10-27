fn jsonpath_temporal_session_finish(
    kind: i32,
    value: i64,
    zone: i32,
    precision: i32,
) -> JsonpathTemporalValue {
    let mut result = value;
    if precision != -1 {
        if precision < 0 {
            return jsonpath_temporal_state(0, 0i64, 0, JSONPATH_EXEC_PARAMETER, false, true);
        };
        let mut digits = precision;
        if digits > 6 {
            digits = 6;
        };
        if kind == 2 || kind == 3 {
            let scaled = clock_scale_value(TimeValue::Value(value), Int4Value::Value(digits));
            if let TimeValue::Error(error) = scaled {
                return jsonpath_temporal_state(0, 0i64, 0, error.state, false, true);
            };
            if let TimeValue::Value(number) = scaled {
                result = number;
            };
        } else {
            let scaled = temporal_adjust_precision(value, digits);
            if let Int8Value::Error(error) = scaled {
                return jsonpath_temporal_state(0, 0i64, 0, error.state, false, true);
            };
            if let Int8Value::Value(number) = scaled {
                result = number;
            };
        };
    };
    jsonpath_temporal_state(kind, result, zone, 0, false, false)
}

fn jsonpath_temporal_convert_session(
    input: TextValue,
    method: i32,
    precision: i32,
    use_timezone: bool,
    session: &str,
) -> JsonpathTemporalValue {
    let prior = jsonpath_temporal_convert_mode(input.clone(), method, precision, use_timezone);
    if prior.unknown == false || session == "" {
        return prior;
    };
    let parsed = jsonpath_temporal_decode(input);
    if parsed.unknown || parsed.error > 0 || parsed.kind < 0 {
        return prior;
    };
    if method == 104 && parsed.kind == 5 {
        let converted = sql__pg_catalog__date__h28y(TimestamptzValue::Value(parsed.value), session);
        if let DateValue::Error(error) = converted {
            return jsonpath_temporal_state(0, 0i64, 0, error.state, false, true);
        };
        if let DateValue::Value(day) = converted {
            return jsonpath_temporal_state(1, day as i64, 0, 0, false, false);
        };
    };
    if method == 109 && parsed.kind == 5 {
        let converted = sql__pg_catalog__time__az0x(TimestamptzValue::Value(parsed.value), session);
        if let TimeValue::Error(error) = converted {
            return jsonpath_temporal_state(0, 0i64, 0, error.state, false, true);
        };
        if let TimeValue::Value(clock) = converted {
            return jsonpath_temporal_session_finish(2, clock, 0, precision);
        };
    };
    if method == 126 {
        let mut converted = TimetzValue::Unknown;
        if parsed.kind == 2 {
            converted = sql__pg_catalog__timetz__qcb2(TimeValue::Value(parsed.value), session);
        };
        if parsed.kind == 5 {
            converted =
                sql__pg_catalog__timetz__sqdw(TimestamptzValue::Value(parsed.value), session);
        };
        if let TimetzValue::Error(error) = converted {
            return jsonpath_temporal_state(0, 0i64, 0, error.state, false, true);
        };
        if let TimetzValue::Value(payload) = converted {
            return jsonpath_temporal_session_finish(3, payload.time, payload.zone, precision);
        };
    };
    if method == 130 && parsed.kind == 5 {
        let converted =
            sql__pg_catalog__timestamp__i0gp(TimestamptzValue::Value(parsed.value), session);
        if let TimestampValue::Error(error) = converted {
            return jsonpath_temporal_state(0, 0i64, 0, error.state, false, true);
        };
        if let TimestampValue::Value(local) = converted {
            return jsonpath_temporal_session_finish(4, local, 0, precision);
        };
    };
    if method == 132 {
        let mut local = parsed.value;
        if parsed.kind == 1 {
            let promoted = sql__pg_catalog__timestamp__swxj(DateValue::Value(parsed.value as i32));
            if let TimestampValue::Error(error) = promoted {
                return jsonpath_temporal_state(0, 0i64, 0, error.state, false, true);
            };
            if let TimestampValue::Value(value) = promoted {
                local = value;
            };
        };
        let profile = session_timezone_profile(session, local, true);
        let converted = sql__pg_catalog__timestamptz__m17a(TimestampValue::Value(local), session);
        if let TimestamptzValue::Error(error) = converted {
            return jsonpath_temporal_state(0, 0i64, 0, error.state, false, true);
        };
        if profile.valid {
            if let TimestamptzValue::Value(value) = converted {
                return jsonpath_temporal_session_finish(5, value, 0 - profile.seconds, precision);
            };
        };
    };
    prior
}

fn jsonpath_temporal_compare_session(
    left: JsonpathTemporalValue,
    right: JsonpathTemporalValue,
    use_timezone: bool,
    session: &str,
) -> Int4Value {
    let prior = jsonpath_temporal_compare_mode(left, right, use_timezone);
    if prior != Int4Value::Unknown {
        return prior;
    };
    if left.kind == 1 && right.kind == 5 {
        return sql__pg_catalog__date_cmp_timestamptz__k3m9(
            DateValue::Value(left.value as i32),
            TimestamptzValue::Value(right.value),
            session,
        );
    };
    if left.kind == 4 && right.kind == 5 {
        return sql__pg_catalog__timestamp_cmp_timestamptz__bj5c(
            TimestampValue::Value(left.value),
            TimestamptzValue::Value(right.value),
            session,
        );
    };
    if left.kind == 5 && (right.kind == 1 || right.kind == 4) {
        let compared = jsonpath_temporal_compare_session(right, left, use_timezone, session);
        if let Int4Value::Value(value) = compared {
            return make_int4_value(0 - value);
        };
        return compared;
    };
    let mut first = TimetzValue::Unknown;
    let mut second = TimetzValue::Unknown;
    if left.kind == 2 && right.kind == 3 {
        first = sql__pg_catalog__timetz__qcb2(TimeValue::Value(left.value), session);
        second = make_timetz_value(right.value, right.zone);
    };
    if left.kind == 3 && right.kind == 2 {
        first = make_timetz_value(left.value, left.zone);
        second = sql__pg_catalog__timetz__qcb2(TimeValue::Value(right.value), session);
    };
    sql__pg_catalog__timetz_cmp__wy50(first, second)
}
