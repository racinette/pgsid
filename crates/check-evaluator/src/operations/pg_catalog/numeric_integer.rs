const NUMERIC_INTEGER_RANGE_ERROR: u32 = 3452547;
const NUMERIC_INTEGER_SPECIAL_ERROR: u32 = 466560;

fn numeric_integer_value(input: NumericValue) -> Int8Value {
    if let NumericValue::Error(error) = input {
        return Int8Value::Error(error);
    }
    if input == NumericValue::Unknown {
        return Int8Value::Unknown;
    }
    if input == NumericValue::Null {
        return Int8Value::Null;
    }
    if let NumericValue::Value(text) = input {
        let work = numeric_work_from_value(text.as_str());
        if work.valid == false {
            return Int8Value::Unknown;
        }
        if work.special != 1 {
            return Int8Value::Error(make_sql_error(NUMERIC_INTEGER_SPECIAL_ERROR));
        }
        if work.sign != 0 && work.weight > 18 {
            return Int8Value::Error(make_sql_error(NUMERIC_INTEGER_RANGE_ERROR));
        }
        let rounded = numeric_work_round(work, 0, 1);
        if let NumericValue::Error(error) = rounded {
            return Int8Value::Error(error);
        }
        if let NumericValue::Value(value) = rounded {
            let parts = numeric_parts(value.as_str());
            if parts.sign == 0 {
                return Int8Value::Value(0i64);
            }
            if parts.weight > 18 {
                return Int8Value::Error(make_sql_error(NUMERIC_INTEGER_RANGE_ERROR));
            }
            let characters: Vec<char> = value.chars().collect();
            let mut result: i64 = 0i64;
            let mut index = parts.first;
            let mut position: i32 = 0;
            while position <= parts.weight {
                let mut digit: i64 = 0i64;
                if index < parts.end {
                    digit = numeric_wire_decimal_digit(characters[index]) as i64;
                    index += 1;
                }

                if result < -922337203685477580i64
                    || (result == -922337203685477580i64 && digit > 8i64)
                {
                    return Int8Value::Error(make_sql_error(NUMERIC_INTEGER_RANGE_ERROR));
                }
                result = result * 10i64 - digit;
                position = position + 1;
            }
            if parts.sign < 0 {
                return Int8Value::Value(result);
            }
            if result == -9223372036854775808i64 {
                return Int8Value::Error(make_sql_error(NUMERIC_INTEGER_RANGE_ERROR));
            }
            return Int8Value::Value(0i64 - result);
        }
    }
    Int8Value::Unknown
}

pub fn sql__pg_catalog__int2__zpjn(input: NumericValue) -> Int2Value {
    let converted = numeric_integer_value(input);
    if let Int8Value::Error(error) = converted {
        return Int2Value::Error(error);
    }
    if converted == Int8Value::Unknown {
        return Int2Value::Unknown;
    }
    if converted == Int8Value::Null {
        return Int2Value::Null;
    }
    if let Int8Value::Value(value) = converted {
        if value < -32768i64 || value > 32767i64 {
            return Int2Value::Error(make_sql_error(NUMERIC_INTEGER_RANGE_ERROR));
        }
        return Int2Value::Value(value as i32);
    }
    Int2Value::Unknown
}

pub fn sql__pg_catalog__int4__z4rh(input: NumericValue) -> Int4Value {
    let converted = numeric_integer_value(input);
    if let Int8Value::Error(error) = converted {
        return Int4Value::Error(error);
    }
    if converted == Int8Value::Unknown {
        return Int4Value::Unknown;
    }
    if converted == Int8Value::Null {
        return Int4Value::Null;
    }
    if let Int8Value::Value(value) = converted {
        if value < -2147483648i64 || value > 2147483647i64 {
            return Int4Value::Error(make_sql_error(NUMERIC_INTEGER_RANGE_ERROR));
        }
        return Int4Value::Value(value as i32);
    }
    Int4Value::Unknown
}

pub fn sql__pg_catalog__int8__xy54(input: NumericValue) -> Int8Value {
    numeric_integer_value(input)
}

pub fn sql__pg_catalog__numeric__itt9(input: Int2Value) -> NumericValue {
    if let Int2Value::Error(error) = input {
        return NumericValue::Error(error);
    }
    if input == Int2Value::Unknown {
        return NumericValue::Unknown;
    }
    if input == Int2Value::Null {
        return NumericValue::Null;
    }
    if let Int2Value::Value(value) = input {
        let integer = value as i64;
        return NumericValue::Value(text_signed_number(integer));
    }
    NumericValue::Unknown
}

pub fn sql__pg_catalog__numeric__ncrk(input: Int4Value) -> NumericValue {
    if let Int4Value::Error(error) = input {
        return NumericValue::Error(error);
    }
    if input == Int4Value::Unknown {
        return NumericValue::Unknown;
    }
    if input == Int4Value::Null {
        return NumericValue::Null;
    }
    if let Int4Value::Value(value) = input {
        let integer = value as i64;
        return NumericValue::Value(text_signed_number(integer));
    }
    NumericValue::Unknown
}

pub fn sql__pg_catalog__numeric__11bc(input: Int8Value) -> NumericValue {
    if let Int8Value::Error(error) = input {
        return NumericValue::Error(error);
    }
    if input == Int8Value::Unknown {
        return NumericValue::Unknown;
    }
    if input == Int8Value::Null {
        return NumericValue::Null;
    }
    if let Int8Value::Value(value) = input {
        let integer = value;
        return NumericValue::Value(text_signed_number(integer));
    }
    NumericValue::Unknown
}
