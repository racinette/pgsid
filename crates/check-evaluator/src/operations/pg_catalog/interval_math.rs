const INTERVAL_MATH_DIVISION_ZERO: u32 = 3452582;
pub fn interval_text_precision_context(
    input: TextValue,
    fields: Int4Value,
    modifier: Int4Value,
    style: i32,
) -> IntervalValue {
    if style >= 1 && style <= 4 {
        let parsed = interval_from_text_fields_context(input, fields, style);
        return sql__pg_catalog__interval__drcl(parsed, modifier);
    };
    let ordinary = interval_from_text_fields_context(input.clone(), fields, 1);
    let standard = interval_from_text_fields_context(input, fields, 3);
    let first = sql__pg_catalog__interval__drcl(ordinary, modifier);
    let second = sql__pg_catalog__interval__drcl(standard, modifier);
    interval_input_agreement(first, second)
}

fn interval_math_float(value: i64) -> f64 {
    let text = text_signed_number(value);
    text.as_str().parse::<f64>().unwrap_or(0.0f64)
}
fn interval_math_round(value: f64) -> f64 {
    if value != value || value >= 9007199254740992.0f64 || value <= -9007199254740992.0f64 {
        return value;
    };
    let rounded = float8_integer(make_float8_value(value));
    if let Int8Value::Value(integer) = rounded {
        return interval_math_float(integer);
    };
    value
}
fn interval_math_tsround(value: f64) -> f64 {
    interval_math_round(value * 1000000.0f64) / 1000000.0f64
}
fn interval_scaled(input: IntervalValue, factor: Float8Value, divide: bool) -> IntervalValue {
    if let IntervalValue::Error(error) = input {
        return IntervalValue::Error(error);
    };
    if let Float8Value::Error(error) = factor {
        return IntervalValue::Error(error);
    };
    if input == IntervalValue::Unknown || factor == Float8Value::Unknown {
        return IntervalValue::Unknown;
    };
    if input == IntervalValue::Null || factor == Float8Value::Null {
        return IntervalValue::Null;
    };
    if let IntervalValue::Value(span) = input {
        let known_factor = float8_semantic(factor);
        if let Float8Value::Value(bits) = known_factor {
            let number = float8_number(bits);
            if divide && number == 0.0f64 {
                return IntervalValue::Error(make_sql_error(INTERVAL_MATH_DIVISION_ZERO));
            };
            if number != number {
                return IntervalValue::Error(make_sql_error(CLOCK_RANGE));
            };
            let infinite_factor = number.abs() == float8_number(9218868437227405312i64);
            let special = interval_special(span);
            if special != 0 {
                if (divide && infinite_factor) || (divide == false && number == 0.0f64) {
                    return IntervalValue::Error(make_sql_error(CLOCK_RANGE));
                };
                if number < 0.0f64 {
                    return interval_infinity(0 - special);
                };
                return input;
            };
            if divide == false && infinite_factor {
                let sign = interval_order(span, IntervalPayload { months: 0, days: 0, time: 0i64 });
                if sign == 0 {
                    return IntervalValue::Error(make_sql_error(CLOCK_RANGE));
                };
                if number * (sign as f64) < 0.0f64 {
                    return interval_infinity(-1);
                };
                return interval_infinity(1);
            };
            let mut month_number = (span.months as f64) * number;
            let mut day_number = (span.days as f64) * number;
            let mut time_number = interval_math_float(span.time) * number;
            if divide {
                month_number = (span.months as f64) / number;
                day_number = (span.days as f64) / number;
                time_number = interval_math_float(span.time) / number;
            };
            if month_number != month_number || month_number < -2147483648.0f64 || month_number >= 2147483648.0f64
                || day_number != day_number || day_number < -2147483648.0f64 || day_number >= 2147483648.0f64 {
                return IntervalValue::Error(make_sql_error(CLOCK_RANGE));
            };
            let months = month_number as i32;
            let mut days = (day_number as i32) as i64;
            let month_days = interval_math_tsround((month_number - (months as f64)) * 30.0f64);
            let mut seconds = interval_math_tsround((day_number - ((days as i32) as f64) + month_days - ((month_days as i32) as f64)) * 86400.0f64);
            if seconds.abs() >= 86400.0f64 {
                let carry = (seconds / 86400.0f64) as i32;
                days = days + (carry as i64);
                if days < (-2147483648i64) || days > 2147483647i64 {
                    return IntervalValue::Error(make_sql_error(CLOCK_RANGE));
                };
                seconds = seconds - (carry as f64) * 86400.0f64;
            };
            days = days + ((month_days as i32) as i64);
            if days < (-2147483648i64) || days > 2147483647i64 {
                return IntervalValue::Error(make_sql_error(CLOCK_RANGE));
            };
            let time = interval_math_round(time_number + seconds * 1000000.0f64);
            if time != time || time < -9223372036854775808.0f64 || time >= 9223372036854775808.0f64 {
                return IntervalValue::Error(make_sql_error(CLOCK_RANGE));
            };
            let rounded = float8_integer(make_float8_value(time));
            if let Int8Value::Value(micros) = rounded {
                let result = IntervalPayload { months, days: days as i32, time: micros };
                if interval_special(result) != 0 {
                    return IntervalValue::Error(make_sql_error(CLOCK_RANGE));
                };
                return make_interval_value(result.months, result.days, result.time);
            };
            return IntervalValue::Error(make_sql_error(CLOCK_RANGE));
        };
    };
    IntervalValue::Unknown
}
pub fn sql__pg_catalog__interval_mul__3jtg(input: IntervalValue, factor: Float8Value) -> IntervalValue {
    interval_scaled(input, factor, false)
}
pub fn sql__pg_catalog__interval_div__fazu(input: IntervalValue, factor: Float8Value) -> IntervalValue {
    interval_scaled(input, factor, true)
}
pub fn sql__pg_catalog__mul_d_interval__ugtb(factor: Float8Value, input: IntervalValue) -> IntervalValue {
    if let Float8Value::Error(error) = factor {
        return IntervalValue::Error(error);
    };
    interval_scaled(input, factor, false)
}
fn interval_justified(input: IntervalValue, mode: i32) -> IntervalValue {
    if let IntervalValue::Value(span) = input {
        if interval_special(span) != 0 {
            return input;
        };
        let mut months = span.months as i64;
        let mut days = span.days as i64;
        let mut time = span.time;
        if mode == 2 && ((days > 0i64 && time > 0i64) || (days < 0i64 && time < 0i64)) {
            months = months + days / 30i64;
            days = days % 30i64;
            if months < (-2147483648i64) || months > 2147483647i64 {
                return IntervalValue::Error(make_sql_error(CLOCK_RANGE));
            };
        };
        if mode != 1 {
            days = days + time / 86400000000i64;
            time = time % 86400000000i64;
            if days < (-2147483648i64) || days > 2147483647i64 {
                return IntervalValue::Error(make_sql_error(CLOCK_RANGE));
            };
        };
        if mode != 0 {
            months = months + days / 30i64;
            days = days % 30i64;
            if months < (-2147483648i64) || months > 2147483647i64 {
                return IntervalValue::Error(make_sql_error(CLOCK_RANGE));
            };
            if months > 0i64 && (days < 0i64 || (mode == 2 && days == 0i64 && time < 0i64)) {
                months = months - 1i64;
                days = days + 30i64;
            };
            if months < 0i64 && (days > 0i64 || (mode == 2 && days == 0i64 && time > 0i64)) {
                months = months + 1i64;
                days = days - 30i64;
            };
        };
        if mode != 1 {
            if days > 0i64 && time < 0i64 {
                days = days - 1i64;
                time = time + 86400000000i64;
            };
            if days < 0i64 && time > 0i64 {
                days = days + 1i64;
                time = time - 86400000000i64;
            };
        };
        return make_interval_value(months as i32, days as i32, time);
    };
    input
}
pub fn sql__pg_catalog__justify_hours__kx1s(input: IntervalValue) -> IntervalValue {
    interval_justified(input, 0)
}
pub fn sql__pg_catalog__justify_days__neyk(input: IntervalValue) -> IntervalValue {
    interval_justified(input, 1)
}
pub fn sql__pg_catalog__justify_interval__0aek(input: IntervalValue) -> IntervalValue {
    interval_justified(input, 2)
}

const INTERVAL_MATH_PARAMETER: u32 = 3452619;
const INTERVAL_MATH_INTERNAL: u32 = 56966976;
pub fn sql__pg_catalog__interval__drcl(input: IntervalValue, modifier: Int4Value) -> IntervalValue {
    if let IntervalValue::Error(error) = input {
        return IntervalValue::Error(error);
    };
    if let Int4Value::Error(error) = modifier {
        return IntervalValue::Error(error);
    };
    if input == IntervalValue::Unknown || modifier == Int4Value::Unknown {
        return IntervalValue::Unknown;
    };
    if input == IntervalValue::Null || modifier == Int4Value::Null {
        return IntervalValue::Null;
    };
    if let IntervalValue::Value(span) = input {
        if let Int4Value::Value(typmod) = modifier {
            if interval_special(span) != 0 || typmod < 0 {
                return input;
            };
            let field_mask = typmod / 65536;
            let precision = typmod % 65536;
            let mut months = span.months;
            let mut days = span.days;
            let mut time = span.time;
            if field_mask == 4 {
                months = (months / 12) * 12;
                days = 0;
                time = 0i64;
            } else {
                if field_mask == 2 || field_mask == 6 {
                    days = 0;
                    time = 0i64;
                } else {
                    if field_mask == 8 {
                        time = 0i64;
                    } else {
                        if field_mask == 1024 || field_mask == 1032 {
                            time = (time / 3600000000i64) * 3600000000i64;
                        } else {
                            if field_mask == 2048 || field_mask == 3080 || field_mask == 3072 {
                                time = (time / 60000000i64) * 60000000i64;
                            } else {
                                if field_mask != 32767 && field_mask != 4096 && field_mask != 7176 && field_mask != 7168 && field_mask != 6144 {
                                    return IntervalValue::Error(make_sql_error(INTERVAL_MATH_INTERNAL));
                                };
                            };
                        };
                    };
                };
            };
            if precision != 65535 {
                if precision > 6 {
                    return IntervalValue::Error(make_sql_error(INTERVAL_MATH_PARAMETER));
                };
                let mut scale = 1i64;
                let mut digits: i32 = 6;
                while digits > precision {
                    scale = scale * 10i64;
                    digits = digits - 1;
                };
                let offset = scale / 2i64;
                if time >= 0i64 {
                    if time > 9223372036854775807i64 - offset {
                        return IntervalValue::Error(make_sql_error(CLOCK_RANGE));
                    };
                    time = time + offset;
                } else {
                    if time < (-9223372036854775808i64) + offset {
                        return IntervalValue::Error(make_sql_error(CLOCK_RANGE));
                    };
                    time = time - offset;
                };
                time = time - time % scale;
            };
            return make_interval_value(months, days, time);
        };
    };
    IntervalValue::Unknown
}
pub fn sql__pg_catalog__make_interval__nlc1(
    years: Int4Value, months: Int4Value, weeks: Int4Value, days: Int4Value,
    hours: Int4Value, minutes: Int4Value, seconds: Float8Value,
) -> IntervalValue {
    if let Int4Value::Error(error) = years { return IntervalValue::Error(error); }
    if let Int4Value::Error(error) = months { return IntervalValue::Error(error); }
    if let Int4Value::Error(error) = weeks { return IntervalValue::Error(error); }
    if let Int4Value::Error(error) = days { return IntervalValue::Error(error); }
    if let Int4Value::Error(error) = hours { return IntervalValue::Error(error); }
    if let Int4Value::Error(error) = minutes { return IntervalValue::Error(error); }
    if let Float8Value::Error(error) = seconds { return IntervalValue::Error(error); }
    if years == Int4Value::Unknown || months == Int4Value::Unknown || weeks == Int4Value::Unknown
        || days == Int4Value::Unknown || hours == Int4Value::Unknown || minutes == Int4Value::Unknown
        || seconds == Float8Value::Unknown { return IntervalValue::Unknown; }
    if years == Int4Value::Null || months == Int4Value::Null || weeks == Int4Value::Null
        || days == Int4Value::Null || hours == Int4Value::Null || minutes == Int4Value::Null
        || seconds == Float8Value::Null { return IntervalValue::Null; }
    let mut y: i32 = 0;
    let mut mon: i32 = 0;
    let mut w: i32 = 0;
    let mut d: i32 = 0;
    let mut h: i32 = 0;
    let mut min: i32 = 0;
    let mut sec = 0.0f64;
    if let Int4Value::Value(n) = years { y = n; }
    if let Int4Value::Value(n) = months { mon = n; }
    if let Int4Value::Value(n) = weeks { w = n; }
    if let Int4Value::Value(n) = days { d = n; }
    if let Int4Value::Value(n) = hours { h = n; }
    if let Int4Value::Value(n) = minutes { min = n; }
    let known_seconds = float8_semantic(seconds);
    if let Float8Value::Value(bits) = known_seconds { sec = float8_number(bits); }
    if sec != sec || sec.abs() == float8_number(9218868437227405312i64) {
        return IntervalValue::Error(make_sql_error(CLOCK_RANGE));
    };
    let mut result_months = (y as i64) * 12i64;
    let mut result_days = (w as i64) * 7i64;
    if result_months < (-2147483648i64) || result_months > 2147483647i64
        || result_days < (-2147483648i64) || result_days > 2147483647i64 {
        return IntervalValue::Error(make_sql_error(CLOCK_RANGE));
    };
    result_months = result_months + (mon as i64);
    result_days = result_days + (d as i64);
    if result_months < (-2147483648i64) || result_months > 2147483647i64
        || result_days < (-2147483648i64) || result_days > 2147483647i64 {
        return IntervalValue::Error(make_sql_error(CLOCK_RANGE));
    };
    let base_time = (h as i64) * 3600000000i64 + (min as i64) * 60000000i64;
    let scaled = sql__pg_catalog__float8mul__d3nd(seconds, make_float8_value(1000000.0f64));
    if let Float8Value::Error(error) = scaled { return IntervalValue::Error(error); }
    if let Float8Value::Value(bits) = scaled {
        let rounded = float8_integer(make_float8_bits(bits));
        if let Int8Value::Value(micros) = rounded {
            if (micros > 0i64 && base_time > 9223372036854775807i64 - micros)
                || (micros < 0i64 && base_time < (-9223372036854775808i64) - micros) {
                return IntervalValue::Error(make_sql_error(CLOCK_RANGE));
            };
            let result = IntervalPayload { months: result_months as i32, days: result_days as i32, time: base_time + micros };
            if interval_special(result) != 0 { return IntervalValue::Error(make_sql_error(CLOCK_RANGE)); }
            return make_interval_value(result.months, result.days, result.time);
        };
    };
    IntervalValue::Error(make_sql_error(CLOCK_RANGE))
}
