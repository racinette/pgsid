fn bit_integer_encode(input: i64, requested: i32) -> String {
    let mut width: i32 = requested;
    if width <= 0 || width > BIT_MAX_LENGTH {
        width = 1;
    }
    let mut remaining: i64 = input;
    let mut reversed = String::new();
    let mut count: i32 = 0;
    while count < width {
        let odd = remaining % 2i64 != 0i64;
        if odd {
            reversed.push('1');
        } else {
            reversed.push('0');
        }
        let negative = remaining < 0i64;
        remaining = remaining / 2i64;
        if negative && odd {
            remaining = remaining - 1i64;
        }
        count = count + 1;
    }
    let chars: Vec<char> = reversed.chars().collect();
    let mut index: usize = chars.len();
    let mut output = String::new();
    while index > 0 {
        index = index - 1;
        output.push(chars[index]);
    }
    output
}

fn bit_integer_decode(input: &str, signed_width: usize) -> i64 {
    let chars: Vec<char> = input.chars().collect();
    let mut result: i64 = 0i64;
    let mut index: usize = 0;
    if chars.len() == signed_width {
        if chars[0] == '1' {
            result = -1i64;
        }
        index = 1;
    }
    while index < chars.len() {
        result = result * 2i64;
        if chars[index] == '1' {
            result = result + 1i64;
        }
        index += 1;
    }
    result
}

pub fn sql__pg_catalog__bit__m5gi(input: Int4Value, width: Int4Value) -> BitValue {
    if let Int4Value::Error(error) = input {
        return BitValue::Error(error);
    }
    if let Int4Value::Error(error) = width {
        return BitValue::Error(error);
    }
    if input == Int4Value::Unknown || width == Int4Value::Unknown {
        return BitValue::Unknown;
    }
    if input == Int4Value::Null || width == Int4Value::Null {
        return BitValue::Null;
    }
    if let Int4Value::Value(value) = input {
        if let Int4Value::Value(length) = width {
            let widened: i64 = value as i64;
            return BitValue::Value(bit_integer_encode(widened, length));
        }
    }
    BitValue::Unknown
}

pub fn sql__pg_catalog__bit__1ahy(input: Int8Value, width: Int4Value) -> BitValue {
    if let Int8Value::Error(error) = input {
        return BitValue::Error(error);
    }
    if let Int4Value::Error(error) = width {
        return BitValue::Error(error);
    }
    if input == Int8Value::Unknown || width == Int4Value::Unknown {
        return BitValue::Unknown;
    }
    if input == Int8Value::Null || width == Int4Value::Null {
        return BitValue::Null;
    }
    if let Int8Value::Value(value) = input {
        if let Int4Value::Value(length) = width {
            return BitValue::Value(bit_integer_encode(value, length));
        }
    }
    BitValue::Unknown
}

pub fn sql__pg_catalog__int4__lp2l(input: BitValue) -> Int4Value {
    if let BitValue::Error(error) = input {
        return Int4Value::Error(error);
    }
    if input == BitValue::Unknown {
        return Int4Value::Unknown;
    }
    if input == BitValue::Null {
        return Int4Value::Null;
    }
    if let BitValue::Value(value) = input {
        if bit_payload_length(value.as_str()) > 32 {
            return Int4Value::Error(make_sql_error(SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE));
        }
        let result: i64 = bit_integer_decode(value.as_str(), 32);
        return Int4Value::Value(result as i32);
    }
    Int4Value::Unknown
}

pub fn sql__pg_catalog__int8__09r6(input: BitValue) -> Int8Value {
    if let BitValue::Error(error) = input {
        return Int8Value::Error(error);
    }
    if input == BitValue::Unknown {
        return Int8Value::Unknown;
    }
    if input == BitValue::Null {
        return Int8Value::Null;
    }
    if let BitValue::Value(value) = input {
        if bit_payload_length(value.as_str()) > 64 {
            return Int8Value::Error(make_sql_error(SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE));
        }
        return Int8Value::Value(bit_integer_decode(value.as_str(), 64));
    }
    Int8Value::Unknown
}
