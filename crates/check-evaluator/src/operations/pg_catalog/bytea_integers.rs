fn bytea_integer_value(input: ByteaValue, width: i32) -> Int8Value {
    if let ByteaValue::Error(error) = input {
        return Int8Value::Error(error);
    }
    if input == ByteaValue::Unknown {
        return Int8Value::Unknown;
    }
    if input == ByteaValue::Null {
        return Int8Value::Null;
    }
    if let ByteaValue::Value(value) = input {
        let length = bytea_payload_length(value.as_str());
        if length > width {
            return Int8Value::Error(make_sql_error(SQLSTATE_NUMERIC_VALUE_OUT_OF_RANGE));
        }
        let chars: Vec<char> = value.chars().collect();
        let mut index: usize = 0;
        let mut result: i64 = 0i64;
        while index < chars.len() {
            let high = hex_digit(chars[index]);
            let low = hex_digit(chars[index + 1]);
            let mut byte = high * 16 + low;
            if index == 0 && length == width && byte >= 128 {
                byte = byte - 256;
            }
            let wide_byte = byte as i64;
            result = result * 256i64 + wide_byte;
            index = index + 2;
        }
        return Int8Value::Value(result);
    }
    Int8Value::Unknown
}

fn bytea_integer_send(value: i64, width: i32) -> String {
    let mut remaining = value;
    let mut bytes: Vec<HashByte> = Vec::new();
    let mut index: i32 = 0;
    while index < width {
        let mut wide_byte = remaining % 256i64;
        if wide_byte < 0i64 {
            wide_byte = wide_byte + 256i64;
        }
        bytes.push(HashByte { value: wide_byte });
        remaining = (remaining - wide_byte) / 256i64;
        index = index + 1;
    }
    let mut output = String::new();
    let mut position = bytes.len();
    while position > 0 {
        position = position - 1;
        let byte = bytes[position].value as i32;
        output = bytea_append_byte(output, byte);
    }
    output
}

pub fn sql__pg_catalog__int2__hj0w(input: ByteaValue) -> Int2Value {
    let result = bytea_integer_value(input, 2);
    if let Int8Value::Error(error) = result {
        return Int2Value::Error(error);
    }
    if result == Int8Value::Unknown {
        return Int2Value::Unknown;
    }
    if result == Int8Value::Null {
        return Int2Value::Null;
    }
    if let Int8Value::Value(value) = result {
        let narrowed = value as i32;
        return Int2Value::Value(narrowed);
    }
    Int2Value::Unknown
}

pub fn sql__pg_catalog__int4__lvgc(input: ByteaValue) -> Int4Value {
    let result = bytea_integer_value(input, 4);
    if let Int8Value::Error(error) = result {
        return Int4Value::Error(error);
    }
    if result == Int8Value::Unknown {
        return Int4Value::Unknown;
    }
    if result == Int8Value::Null {
        return Int4Value::Null;
    }
    if let Int8Value::Value(value) = result {
        let narrowed = value as i32;
        return Int4Value::Value(narrowed);
    }
    Int4Value::Unknown
}

pub fn sql__pg_catalog__int8__ih14(input: ByteaValue) -> Int8Value {
    bytea_integer_value(input, 8)
}

pub fn sql__pg_catalog__int2send__5wzj(input: Int2Value) -> ByteaValue {
    if let Int2Value::Error(error) = input {
        return ByteaValue::Error(error);
    }
    if input == Int2Value::Unknown {
        return ByteaValue::Unknown;
    }
    if input == Int2Value::Null {
        return ByteaValue::Null;
    }
    if let Int2Value::Value(value) = input {
        let wide_value = value as i64;
        let output = bytea_integer_send(wide_value, 2);
        return ByteaValue::Value(output);
    }
    ByteaValue::Unknown
}

pub fn sql__pg_catalog__bytea__mcxl(input: Int2Value) -> ByteaValue {
    sql__pg_catalog__int2send__5wzj(input)
}

pub fn sql__pg_catalog__int4send__fjzt(input: Int4Value) -> ByteaValue {
    if let Int4Value::Error(error) = input {
        return ByteaValue::Error(error);
    }
    if input == Int4Value::Unknown {
        return ByteaValue::Unknown;
    }
    if input == Int4Value::Null {
        return ByteaValue::Null;
    }
    if let Int4Value::Value(value) = input {
        let wide_value = value as i64;
        let output = bytea_integer_send(wide_value, 4);
        return ByteaValue::Value(output);
    }
    ByteaValue::Unknown
}

pub fn sql__pg_catalog__bytea__4poi(input: Int4Value) -> ByteaValue {
    sql__pg_catalog__int4send__fjzt(input)
}

pub fn sql__pg_catalog__int8send__pjz0(input: Int8Value) -> ByteaValue {
    if let Int8Value::Error(error) = input {
        return ByteaValue::Error(error);
    }
    if input == Int8Value::Unknown {
        return ByteaValue::Unknown;
    }
    if input == Int8Value::Null {
        return ByteaValue::Null;
    }
    if let Int8Value::Value(value) = input {
        let wide_value = value;
        let output = bytea_integer_send(wide_value, 8);
        return ByteaValue::Value(output);
    }
    ByteaValue::Unknown
}

pub fn sql__pg_catalog__bytea__0om8(input: Int8Value) -> ByteaValue {
    sql__pg_catalog__int8send__pjz0(input)
}

pub fn sql__pg_catalog__date_send__i2tv(input: DateValue) -> ByteaValue {
    if let DateValue::Error(error) = input {
        return ByteaValue::Error(error);
    }
    if input == DateValue::Unknown {
        return ByteaValue::Unknown;
    }
    if input == DateValue::Null {
        return ByteaValue::Null;
    }
    if let DateValue::Value(value) = input {
        let wide_value = value as i64;
        let output = bytea_integer_send(wide_value, 4);
        return ByteaValue::Value(output);
    }
    ByteaValue::Unknown
}

pub fn sql__pg_catalog__timestamp_send__3syx(input: TimestampValue) -> ByteaValue {
    if let TimestampValue::Error(error) = input {
        return ByteaValue::Error(error);
    }
    if input == TimestampValue::Unknown {
        return ByteaValue::Unknown;
    }
    if input == TimestampValue::Null {
        return ByteaValue::Null;
    }
    if let TimestampValue::Value(value) = input {
        let wide_value = value;
        let output = bytea_integer_send(wide_value, 8);
        return ByteaValue::Value(output);
    }
    ByteaValue::Unknown
}

pub fn sql__pg_catalog__timestamptz_send__jyu1(input: TimestamptzValue) -> ByteaValue {
    if let TimestamptzValue::Error(error) = input {
        return ByteaValue::Error(error);
    }
    if input == TimestamptzValue::Unknown {
        return ByteaValue::Unknown;
    }
    if input == TimestamptzValue::Null {
        return ByteaValue::Null;
    }
    if let TimestamptzValue::Value(value) = input {
        let wide_value = value;
        let output = bytea_integer_send(wide_value, 8);
        return ByteaValue::Value(output);
    }
    ByteaValue::Unknown
}

pub fn sql__pg_catalog__boolsend__oo82(input: BoolValue) -> ByteaValue {
    if let BoolValue::Error(error) = input {
        return ByteaValue::Error(error);
    }
    if input == BoolValue::Unknown {
        return ByteaValue::Unknown;
    }
    if input == BoolValue::Null {
        return ByteaValue::Null;
    }
    if let BoolValue::Value(value) = input {
        let mut byte: i32 = 0;
        if value {
            byte = 1;
        }
        let output = bytea_append_byte(String::new(), byte);
        return ByteaValue::Value(output);
    }
    ByteaValue::Unknown
}
