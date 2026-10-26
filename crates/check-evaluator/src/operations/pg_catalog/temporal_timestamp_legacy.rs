fn temporal_timestamp_legacy_value(number: NumericValue, unit: &str, time: i64) -> Float8Value {
    if let NumericValue::Error(error) = number {
        return Float8Value::Error(error);
    };
    if number == NumericValue::Unknown {
        return Float8Value::Unknown;
    };
    if number == NumericValue::Null {
        return Float8Value::Null;
    };
    if time != (-9223372036854775808i64) && time != 9223372036854775807i64 {
        let code = temporal_extract_code(unit);
        let mut day = time / 86400000000i64;
        let mut clock = time % 86400000000i64;
        if clock < 0i64 {
            day = day - 1i64;
            clock = clock + 86400000000i64;
        };
        let seconds = ((clock / 1000000i64) % 60i64) as i32;
        let fraction = (clock % 1000000i64) as i32;
        if code == 2 {
            return make_float8_value((seconds as f64) * 1000.0f64 + (fraction as f64) / 1000.0f64);
        };
        if code == 3 {
            return make_float8_value((seconds as f64) + (fraction as f64) / 1000000.0f64);
        };
        if code == 14 {
            let elapsed = (clock / 1000000i64) as i32;
            let julian = (day + 2451545i64) as i32;
            let result = (julian as f64)
                + ((elapsed as f64) + (fraction as f64) / 1000000.0f64) / 86400.0f64;
            return make_float8_value(result);
        };
        if code == 19 {
            if time < 9222425352054775807i64 {
                return make_float8_value(
                    interval_math_float(time + 946684800000000i64) / 1000000.0f64,
                );
            };
            return make_float8_value(
                (interval_math_float(time) + 946684800000000.0f64) / 1000000.0f64,
            );
        };
    };
    sql__pg_catalog__float8__bkfn(number)
}

pub fn sql__pg_catalog__date_part__nzwd(units: TextValue, input: TimestampValue) -> Float8Value {
    let number = sql__pg_catalog__extract__f4l3(units.clone(), input);
    if let TextValue::Value(unit) = units {
        if let TimestampValue::Value(time) = input {
            return temporal_timestamp_legacy_value(number, unit.as_str(), time);
        };
    };
    sql__pg_catalog__float8__bkfn(number)
}
