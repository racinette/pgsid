fn temporal_decimal_parts(whole: i64, fraction: i64, scale: i32, negative_zero: bool) -> String {
    let mut output = String::new();
    if negative_zero {
        output.push('-');
    }
    let integer = text_signed_number(whole);
    output.push_str(integer.as_str());
    if scale > 0 {
        output.push('.');
        let mut divisor: i64 = 1i64;
        let mut index: i32 = 1;
        while index < scale {
            divisor = divisor * 10i64;
            index = index + 1;
        }
        let mut remaining = fraction;
        while divisor > 0i64 {
            let digit = remaining / divisor;
            let code = digit as i32;
            let character = char::from_u32((code + 48) as u32).unwrap_or('0');
            output.push(character);
            remaining = remaining % divisor;
            divisor = divisor / 10i64;
        }
    }
    output
}

fn temporal_scaled_number(value: i64, scale: i32) -> NumericValue {
    let mut divisor: i64 = 1i64;
    let mut index: i32 = 0;
    while index < scale {
        divisor = divisor * 10i64;
        index = index + 1;
    }
    let whole = value / divisor;
    let mut fraction = value % divisor;
    if fraction < 0i64 {
        fraction = 0i64 - fraction;
    }
    NumericValue::Value(temporal_decimal_parts(
        whole,
        fraction,
        scale,
        value < 0i64 && whole == 0i64,
    ))
}

fn temporal_timestamp_epoch(value: i64) -> NumericValue {
    let mut whole = value / 1000000i64 + 946684800i64;
    let mut fraction = value % 1000000i64;
    if fraction < 0i64 {
        whole = whole - 1i64;
        fraction = fraction + 1000000i64;
    }
    if value >= 9222425352054775807i64 {
        fraction = ((fraction + 50i64) / 100i64) * 100i64;
        if fraction == 1000000i64 {
            whole = whole + 1i64;
            fraction = 0i64;
        }
    }
    let negative = whole < 0i64;
    if negative && fraction != 0i64 {
        whole = whole + 1i64;
        fraction = 1000000i64 - fraction;
    }
    NumericValue::Value(temporal_decimal_parts(
        whole,
        fraction,
        6,
        negative && whole == 0i64,
    ))
}

fn temporal_timestamp_julian(julian: i64, clock: i64) -> NumericValue {
    let mut weight: i32 = 0;
    let mut first = clock;
    if clock >= 100000000i64 {
        weight = 2;
        first = clock / 100000000i64;
    } else if clock >= 10000i64 {
        weight = 1;
        first = clock / 10000i64;
    }
    let mut quotient_weight = weight - 2;
    if first <= 864i64 {
        quotient_weight = quotient_weight - 1;
    }
    let scale = 16 - quotient_weight * 4;
    let denominator: i64 = 86400000000i64;
    let mut remainder = clock;
    let mut fraction: Vec<char> = Vec::new();
    let mut index: i32 = 0;
    while index < scale {
        remainder = remainder * 10i64;
        let digit = (remainder / denominator) as i32;
        fraction.push(char::from_u32((digit + 48) as u32).unwrap_or('0'));
        remainder = remainder % denominator;
        index = index + 1;
    }
    let mut carry = remainder * 2i64 >= denominator;
    let mut cursor = fraction.len();
    while carry && cursor > 0 {
        cursor = cursor - 1;
        let code = fraction[cursor] as i32;
        if code == 57 {
            fraction[cursor] = '0';
        } else {
            fraction[cursor] = char::from_u32((code + 1) as u32).unwrap_or('0');
            carry = false;
        };
    }
    let mut whole = julian;
    if carry {
        whole = whole + 1i64;
    }
    let mut output = text_signed_number(whole);
    output.push('.');
    cursor = 0;
    while cursor < fraction.len() {
        output.push(fraction[cursor]);
        cursor += 1;
    }
    NumericValue::Value(output)
}

fn temporal_extract_timestamp(value: i64, unit: &str) -> NumericValue {
    let code = temporal_extract_code(unit);
    if code == 0 || code == -2 {
        return NumericValue::Error(make_sql_error(TEMPORAL_FIELD_UNIT_ERROR));
    }
    if value == -9223372036854775808i64 || value == 9223372036854775807i64 {
        if (code >= 1 && code <= 9)
            || code == 16
            || code == 17
            || code == 18
            || temporal_unit_code(unit) == -1
        {
            return NumericValue::Null;
        }
        if code >= 10 && code <= 19 {
            if value < 0i64 {
                return NumericValue::Value("-Infinity".to_owned());
            }
            return NumericValue::Value("Infinity".to_owned());
        }
        return NumericValue::Error(make_sql_error(TEMPORAL_FIELD_UNSUPPORTED_ERROR));
    }
    if code == -1 {
        return NumericValue::Error(make_sql_error(TEMPORAL_FIELD_UNSUPPORTED_ERROR));
    }
    let mut day = value / 86400000000i64;
    let mut clock = value % 86400000000i64;
    if clock < 0i64 {
        day = day - 1i64;
        clock = clock + 86400000000i64;
    }
    if code == 1 {
        return NumericValue::Value(text_signed_number(clock % 60000000i64));
    }
    if code == 2 {
        return temporal_scaled_number(clock % 60000000i64, 3);
    }
    if code == 3 {
        return temporal_scaled_number(clock % 60000000i64, 6);
    }
    if code == 4 {
        return NumericValue::Value(text_signed_number(clock / 60000000i64 % 60i64));
    }
    if code == 5 {
        return NumericValue::Value(text_signed_number(clock / 3600000000i64));
    }
    if code == 14 {
        return temporal_timestamp_julian(day + 2451545i64, clock);
    }
    if code == 19 {
        return temporal_timestamp_epoch(value);
    }
    temporal_extract_date(day as i32, code)
}

pub fn sql__pg_catalog__extract__f4l3(units: TextValue, input: TimestampValue) -> NumericValue {
    if let TextValue::Error(error) = units {
        return NumericValue::Error(error);
    }
    if let TimestampValue::Error(error) = input {
        return NumericValue::Error(error);
    }
    if units == TextValue::Unknown || input == TimestampValue::Unknown {
        return NumericValue::Unknown;
    }
    if units == TextValue::Null || input == TimestampValue::Null {
        return NumericValue::Null;
    }
    if let TextValue::Value(unit) = units {
        if let TimestampValue::Value(value) = input {
            return temporal_extract_timestamp(value, unit.as_str());
        }
    }
    NumericValue::Unknown
}
