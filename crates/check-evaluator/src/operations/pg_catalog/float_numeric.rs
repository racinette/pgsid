fn float_numeric_decimal(input: Float8Value, precision: usize) -> NumericValue {
    if let Float8Value::Error(error) = input {
        return NumericValue::Error(error);
    }
    if input == Float8Value::Null {
        return NumericValue::Null;
    }
    if let Float8Value::Value(bits) = input {
        let value = float8_number(bits);
        if value != value {
            return make_numeric_value("NaN");
        }
        let infinity = 1.0f64 / 0.0f64;
        if value == infinity {
            return make_numeric_value("Infinity");
        }
        if value == 0.0f64 - infinity {
            return make_numeric_value("-Infinity");
        }
        let exact = float_exact_decimal(value.abs());
        let digits: Vec<char> = exact.digits.chars().collect();
        let mut mode: i32 = 1;
        if digits.len() > precision && digits[precision] == '5' {
            let mut tie = true;
            let mut index = precision + 1;
            while index < digits.len() {
                if digits[index] != '0' {
                    tie = false;
                }
                index += 1;
            }
            if tie && numeric_wire_decimal_digit(digits[precision - 1]) % 2 == 0 {
                mode = 0;
            }
        }
        let scale = precision as i32 - 1 - exact.weight;
        let rounded = numeric_work_rounded(exact, scale, mode);
        let mut sign = rounded.sign;
        if value < 0.0f64 {
            sign = 0 - sign;
        }
        let minimum_scale = numeric_work_min_scale(rounded.clone());
        let result = NumericWork {
            valid: rounded.valid,
            special: rounded.special,
            sign: sign,
            weight: rounded.weight,
            scale: minimum_scale,
            digits: rounded.digits,
        };
        return NumericValue::Value(numeric_work_text(result));
    }
    NumericValue::Unknown
}

fn float_numeric_text(input: NumericValue) -> TextValue {
    if let NumericValue::Error(error) = input {
        return TextValue::Error(error);
    }
    if input == NumericValue::Null {
        return TextValue::Null;
    }
    if let NumericValue::Value(text) = input {
        let work = numeric_work_from_value(text.as_str());
        if work.valid {
            return TextValue::Value(numeric_work_text(work));
        }
    }
    TextValue::Unknown
}

pub fn sql__pg_catalog__float4__90ur(input: NumericValue) -> Float4Value {
    float4_from_text(float_numeric_text(input))
}

pub fn sql__pg_catalog__float8__bkfn(input: NumericValue) -> Float8Value {
    float8_from_text(float_numeric_text(input))
}

pub fn sql__pg_catalog__numeric__7rfd(input: Float4Value) -> NumericValue {
    float_numeric_decimal(float4_widen(input), 6)
}

pub fn sql__pg_catalog__numeric__ev2s(input: Float8Value) -> NumericValue {
    float_numeric_decimal(input, 15)
}
