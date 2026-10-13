#[derive(Clone, Copy)]
struct ClockFieldInput {
    value: IntervalValue,
    zone: i32,
    family: i32,
}
fn clock_fields_time(input: TimeValue) -> ClockFieldInput {
    let mut value = IntervalValue::Unknown;
    if let TimeValue::Error(error) = input {
        value = IntervalValue::Error(error);
    };
    if input == TimeValue::Null {
        value = IntervalValue::Null;
    };
    if let TimeValue::Value(time) = input {
        value = make_interval_value(0, 0, time);
    };
    return ClockFieldInput {
        value,
        zone: 0,
        family: 1,
    };
}
fn clock_fields_timetz(input: TimetzValue) -> ClockFieldInput {
    let mut value = IntervalValue::Unknown;
    let mut zone: i32 = 0;
    if let TimetzValue::Error(error) = input {
        value = IntervalValue::Error(error);
    };
    if input == TimetzValue::Null {
        value = IntervalValue::Null;
    };
    if let TimetzValue::Value(time) = input {
        value = make_interval_value(0, 0, time.time);
        zone = time.zone;
    };
    return ClockFieldInput {
        value,
        zone,
        family: 2,
    };
}
fn clock_fields_code(unit: &str) -> i32 {
    let code = temporal_extract_code(unit);
    if code == -2 {
        return 0;
    };
    if code != -1 && code != 0 {
        return code;
    };
    let letters: Vec<char> = unit.chars().collect();
    let mut key = String::new();
    let mut index: usize = 0;
    while index < letters.len() && index < 10 {
        key.push(letters[index].to_ascii_lowercase());
        index += 1;
    }
    if key == "timezone" {
        return 20;
    };
    if key == "timezone_h" {
        return 21;
    };
    if key == "timezone_m" {
        return 22;
    };
    if code == -1 {
        return 90;
    };
    0
}
fn clock_fields_component(span: IntervalPayload, zone: i32, family: i32, code: i32) -> Int8Value {
    if code <= 0 || code == 90 {
        return Int8Value::Error(make_sql_error(TEMPORAL_FIELD_UNIT_ERROR));
    };
    if code == 1 || code == 2 || code == 3 {
        return make_int8_value(span.time % 60000000i64);
    };
    if code == 4 {
        return make_int8_value((span.time / 60000000i64) % 60i64);
    };
    if code == 5 {
        return make_int8_value(span.time / 3600000000i64);
    };
    if family == 2 {
        let offset = fixed_zone_wrapped_seconds(0i64 - (zone as i64)) as i64;
        if code == 20 {
            return make_int8_value(offset);
        };
        if code == 21 {
            return make_int8_value(offset / 3600i64);
        };
        if code == 22 {
            return make_int8_value((offset / 60i64) % 60i64);
        };
    };
    if family == 3 {
        let months = span.months as i64;
        let years = months / 12i64;
        if code == 6 {
            return make_int8_value(span.days as i64);
        };
        if code == 7 {
            return make_int8_value((span.days as i64) / 7i64);
        };
        if code == 8 {
            return make_int8_value(months % 12i64);
        };
        if code == 9 {
            if months == (-2147483648i64) {
                return make_int8_value(1i64);
            };
            if months < 0i64 {
                return make_int8_value(0i64 - (((0i64 - months) % 12i64) / 3i64 + 1i64));
            };
            return make_int8_value((months % 12i64) / 3i64 + 1i64);
        };
        if code == 10 {
            return make_int8_value(years);
        };
        if code == 11 {
            return make_int8_value(years / 10i64);
        };
        if code == 12 {
            return make_int8_value(years / 100i64);
        };
        if code == 13 {
            return make_int8_value(years / 1000i64);
        };
    };
    Int8Value::Error(make_sql_error(TEMPORAL_FIELD_UNSUPPORTED_ERROR))
}
fn clock_fields_numeric_value(
    span: IntervalPayload,
    zone: i32,
    family: i32,
    code: i32,
) -> NumericValue {
    if code <= 0 {
        return NumericValue::Error(make_sql_error(TEMPORAL_FIELD_UNIT_ERROR));
    };
    if family == 3 {
        let special = interval_special(span);
        if special != 0 {
            if code == 1
                || code == 2
                || code == 3
                || code == 4
                || code == 7
                || code == 8
                || code == 9
            {
                return NumericValue::Null;
            };
            if code == 5
                || code == 6
                || code == 10
                || code == 11
                || code == 12
                || code == 13
                || code == 19
            {
                if special < 0 {
                    return make_numeric_value("-Infinity");
                };
                return make_numeric_value("Infinity");
            };
            return NumericValue::Error(make_sql_error(TEMPORAL_FIELD_UNSUPPORTED_ERROR));
        };
    };
    if code == 19 {
        if family == 1 {
            return temporal_scaled_number(span.time, 6);
        };
        if family == 2 {
            return temporal_scaled_number(span.time + (zone as i64) * 1000000i64, 6);
        };
        let years = (span.months as i64) / 12i64;
        let months = (span.months as i64) % 12i64;
        let seconds = (1461i64 * years + 120i64 * months + 4i64 * (span.days as i64)) * 21600i64;
        let whole = NumericValue::Value(text_signed_number(seconds));
        let clock = temporal_scaled_number(span.time, 6);
        return sql__pg_catalog__numeric_add__o3d7(clock, whole);
    };
    let component = clock_fields_component(span, zone, family, code);
    if let Int8Value::Error(error) = component {
        return NumericValue::Error(error);
    };
    if let Int8Value::Value(number) = component {
        let mut scale: i32 = 0;
        if code == 2 {
            scale = 3;
        };
        if code == 3 {
            scale = 6;
        };
        return temporal_scaled_number(number, scale);
    };
    NumericValue::Unknown
}
fn clock_fields_numeric(units: TextValue, input: ClockFieldInput) -> NumericValue {
    if let TextValue::Error(error) = units {
        return NumericValue::Error(error);
    };
    let interval_value = input.value;
    if let IntervalValue::Error(error) = interval_value {
        return NumericValue::Error(error);
    };
    if units == TextValue::Unknown || input.value == IntervalValue::Unknown {
        return NumericValue::Unknown;
    };
    if units == TextValue::Null || input.value == IntervalValue::Null {
        return NumericValue::Null;
    };
    if let TextValue::Value(unit) = units {
        if let IntervalValue::Value(span) = interval_value {
            return clock_fields_numeric_value(
                span,
                input.zone,
                input.family,
                clock_fields_code(unit.as_str()),
            );
        };
    };
    NumericValue::Unknown
}
fn clock_fields_legacy(units: TextValue, input: ClockFieldInput) -> Float8Value {
    let interval_value = input.value;
    let number = clock_fields_numeric(units.clone(), input);
    if let NumericValue::Error(error) = number {
        return Float8Value::Error(error);
    };
    if number == NumericValue::Unknown {
        return Float8Value::Unknown;
    };
    if number == NumericValue::Null {
        return Float8Value::Null;
    };
    if let TextValue::Value(unit) = units {
        if let IntervalValue::Value(span) = interval_value {
            let code = clock_fields_code(unit.as_str());
            if input.family != 3 || interval_special(span) == 0 {
                let seconds = ((span.time / 1000000i64) % 60i64) as i32;
                let fraction = (span.time % 1000000i64) as i32;
                if code == 2 {
                    return make_float8_value(
                        (seconds as f64) * 1000.0f64 + (fraction as f64) / 1000.0f64,
                    );
                };
                if code == 3 {
                    return make_float8_value((seconds as f64) + (fraction as f64) / 1000000.0f64);
                };
                if code == 19 {
                    let mut result = interval_math_float(span.time) / 1000000.0f64;
                    if input.family == 2 {
                        result = result + (input.zone as f64);
                    };
                    if input.family == 3 {
                        let years = span.months / 12;
                        let months = span.months % 12;
                        result = result + 31557600.0f64 * (years as f64);
                        result = result + 2592000.0f64 * (months as f64);
                        result = result + 86400.0f64 * (span.days as f64);
                    };
                    return make_float8_value(result);
                };
            };
        };
    };
    sql__pg_catalog__float8__bkfn(number)
}
pub fn sql__pg_catalog__extract__5l0q(units: TextValue, input: TimeValue) -> NumericValue {
    clock_fields_numeric(units, clock_fields_time(input))
}
pub fn sql__pg_catalog__extract__o3bx(units: TextValue, input: TimetzValue) -> NumericValue {
    clock_fields_numeric(units, clock_fields_timetz(input))
}
pub fn sql__pg_catalog__extract__xn2y(units: TextValue, input: IntervalValue) -> NumericValue {
    clock_fields_numeric(
        units,
        ClockFieldInput {
            value: input,
            zone: 0,
            family: 3,
        },
    )
}
pub fn sql__pg_catalog__date_part__jht9(units: TextValue, input: TimeValue) -> Float8Value {
    clock_fields_legacy(units, clock_fields_time(input))
}
pub fn sql__pg_catalog__date_part__yjvq(units: TextValue, input: TimetzValue) -> Float8Value {
    clock_fields_legacy(units, clock_fields_timetz(input))
}
pub fn sql__pg_catalog__date_part__fb3a(units: TextValue, input: IntervalValue) -> Float8Value {
    clock_fields_legacy(
        units,
        ClockFieldInput {
            value: input,
            zone: 0,
            family: 3,
        },
    )
}
