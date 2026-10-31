fn bytea_integer_value(input: ByteaValue, width: i32) -> Int8Value {
    let mut unresolved_flavor: i32 = 0;
    if let ByteaValue::Unknown = input { unresolved_flavor = 1; };
    if let ByteaValue::Unimplemented = input { unresolved_flavor = 2; };
    if let ByteaValue::Error(error) = input {
        return Int8Value::Error(error);
    }
    let mut condition_flavor_8_4: i32 = unresolved_flavor; if let ByteaValue::Unknown = input { if condition_flavor_8_4 < 1 { condition_flavor_8_4 = 1; }; }; if let ByteaValue::Unimplemented = input { condition_flavor_8_4 = 2; }; if (input == ByteaValue::Unknown || input == ByteaValue::Unimplemented) {
        return int8_unresolved(condition_flavor_8_4);
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
    int8_unresolved(unresolved_flavor)
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
    let mut unresolved_flavor: i32 = 0;
    if let ByteaValue::Unknown = input { unresolved_flavor = 1; };
    if let ByteaValue::Unimplemented = input { unresolved_flavor = 2; };
    let result = bytea_integer_value(input, 2);
    if let Int8Value::Error(error) = result {
        return Int2Value::Error(error);
    }
    let mut condition_flavor_69_4: i32 = unresolved_flavor; if let Int8Value::Unknown = result { if condition_flavor_69_4 < 1 { condition_flavor_69_4 = 1; }; }; if let Int8Value::Unimplemented = result { condition_flavor_69_4 = 2; }; if (result == Int8Value::Unknown || result == Int8Value::Unimplemented) {
        return int2_unresolved(condition_flavor_69_4);
    }
    if result == Int8Value::Null {
        return Int2Value::Null;
    }
    if let Int8Value::Value(value) = result {
        let narrowed = value as i32;
        return Int2Value::Value(narrowed);
    }
    int2_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__int4__lvgc(input: ByteaValue) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let ByteaValue::Unknown = input { unresolved_flavor = 1; };
    if let ByteaValue::Unimplemented = input { unresolved_flavor = 2; };
    let result = bytea_integer_value(input, 4);
    if let Int8Value::Error(error) = result {
        return Int4Value::Error(error);
    }
    let mut condition_flavor_90_4: i32 = unresolved_flavor; if let Int8Value::Unknown = result { if condition_flavor_90_4 < 1 { condition_flavor_90_4 = 1; }; }; if let Int8Value::Unimplemented = result { condition_flavor_90_4 = 2; }; if (result == Int8Value::Unknown || result == Int8Value::Unimplemented) {
        return int4_unresolved(condition_flavor_90_4);
    }
    if result == Int8Value::Null {
        return Int4Value::Null;
    }
    if let Int8Value::Value(value) = result {
        let narrowed = value as i32;
        return Int4Value::Value(narrowed);
    }
    int4_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__int8__ih14(input: ByteaValue) -> Int8Value {
    bytea_integer_value(input, 8)
}

pub fn sql__pg_catalog__int2send__5wzj(input: Int2Value) -> ByteaValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int2Value::Unknown = input { unresolved_flavor = 1; };
    if let Int2Value::Unimplemented = input { unresolved_flavor = 2; };
    if let Int2Value::Error(error) = input {
        return ByteaValue::Error(error);
    }
    let mut condition_flavor_114_4: i32 = unresolved_flavor; if let Int2Value::Unknown = input { if condition_flavor_114_4 < 1 { condition_flavor_114_4 = 1; }; }; if let Int2Value::Unimplemented = input { condition_flavor_114_4 = 2; }; if (input == Int2Value::Unknown || input == Int2Value::Unimplemented) {
        return bytea_unresolved(condition_flavor_114_4);
    }
    if input == Int2Value::Null {
        return ByteaValue::Null;
    }
    if let Int2Value::Value(value) = input {
        let wide_value = value as i64;
        let output = bytea_integer_send(wide_value, 2);
        return ByteaValue::Value(output);
    }
    bytea_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__bytea__mcxl(input: Int2Value) -> ByteaValue {
    sql__pg_catalog__int2send__5wzj(input)
}

pub fn sql__pg_catalog__int4send__fjzt(input: Int4Value) -> ByteaValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int4Value::Unknown = input { unresolved_flavor = 1; };
    if let Int4Value::Unimplemented = input { unresolved_flavor = 2; };
    if let Int4Value::Error(error) = input {
        return ByteaValue::Error(error);
    }
    let mut condition_flavor_139_4: i32 = unresolved_flavor; if let Int4Value::Unknown = input { if condition_flavor_139_4 < 1 { condition_flavor_139_4 = 1; }; }; if let Int4Value::Unimplemented = input { condition_flavor_139_4 = 2; }; if (input == Int4Value::Unknown || input == Int4Value::Unimplemented) {
        return bytea_unresolved(condition_flavor_139_4);
    }
    if input == Int4Value::Null {
        return ByteaValue::Null;
    }
    if let Int4Value::Value(value) = input {
        let wide_value = value as i64;
        let output = bytea_integer_send(wide_value, 4);
        return ByteaValue::Value(output);
    }
    bytea_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__bytea__4poi(input: Int4Value) -> ByteaValue {
    sql__pg_catalog__int4send__fjzt(input)
}

pub fn sql__pg_catalog__int8send__pjz0(input: Int8Value) -> ByteaValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int8Value::Unknown = input { unresolved_flavor = 1; };
    if let Int8Value::Unimplemented = input { unresolved_flavor = 2; };
    if let Int8Value::Error(error) = input {
        return ByteaValue::Error(error);
    }
    let mut condition_flavor_164_4: i32 = unresolved_flavor; if let Int8Value::Unknown = input { if condition_flavor_164_4 < 1 { condition_flavor_164_4 = 1; }; }; if let Int8Value::Unimplemented = input { condition_flavor_164_4 = 2; }; if (input == Int8Value::Unknown || input == Int8Value::Unimplemented) {
        return bytea_unresolved(condition_flavor_164_4);
    }
    if input == Int8Value::Null {
        return ByteaValue::Null;
    }
    if let Int8Value::Value(value) = input {
        let wide_value = value;
        let output = bytea_integer_send(wide_value, 8);
        return ByteaValue::Value(output);
    }
    bytea_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__bytea__0om8(input: Int8Value) -> ByteaValue {
    sql__pg_catalog__int8send__pjz0(input)
}

pub fn sql__pg_catalog__date_send__i2tv(input: DateValue) -> ByteaValue {
    let mut unresolved_flavor: i32 = 0;
    if let DateValue::Unknown = input { unresolved_flavor = 1; };
    if let DateValue::Unimplemented = input { unresolved_flavor = 2; };
    if let DateValue::Error(error) = input {
        return ByteaValue::Error(error);
    }
    let mut condition_flavor_189_4: i32 = unresolved_flavor; if let DateValue::Unknown = input { if condition_flavor_189_4 < 1 { condition_flavor_189_4 = 1; }; }; if let DateValue::Unimplemented = input { condition_flavor_189_4 = 2; }; if (input == DateValue::Unknown || input == DateValue::Unimplemented) {
        return bytea_unresolved(condition_flavor_189_4);
    }
    if input == DateValue::Null {
        return ByteaValue::Null;
    }
    if let DateValue::Value(value) = input {
        let wide_value = value as i64;
        let output = bytea_integer_send(wide_value, 4);
        return ByteaValue::Value(output);
    }
    bytea_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__timestamp_send__3syx(input: TimestampValue) -> ByteaValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestampValue::Unknown = input { unresolved_flavor = 1; };
    if let TimestampValue::Unimplemented = input { unresolved_flavor = 2; };
    if let TimestampValue::Error(error) = input {
        return ByteaValue::Error(error);
    }
    let mut condition_flavor_210_4: i32 = unresolved_flavor; if let TimestampValue::Unknown = input { if condition_flavor_210_4 < 1 { condition_flavor_210_4 = 1; }; }; if let TimestampValue::Unimplemented = input { condition_flavor_210_4 = 2; }; if (input == TimestampValue::Unknown || input == TimestampValue::Unimplemented) {
        return bytea_unresolved(condition_flavor_210_4);
    }
    if input == TimestampValue::Null {
        return ByteaValue::Null;
    }
    if let TimestampValue::Value(value) = input {
        let wide_value = value;
        let output = bytea_integer_send(wide_value, 8);
        return ByteaValue::Value(output);
    }
    bytea_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__timestamptz_send__jyu1(input: TimestamptzValue) -> ByteaValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestamptzValue::Unknown = input { unresolved_flavor = 1; };
    if let TimestamptzValue::Unimplemented = input { unresolved_flavor = 2; };
    if let TimestamptzValue::Error(error) = input {
        return ByteaValue::Error(error);
    }
    let mut condition_flavor_231_4: i32 = unresolved_flavor; if let TimestamptzValue::Unknown = input { if condition_flavor_231_4 < 1 { condition_flavor_231_4 = 1; }; }; if let TimestamptzValue::Unimplemented = input { condition_flavor_231_4 = 2; }; if (input == TimestamptzValue::Unknown || input == TimestamptzValue::Unimplemented) {
        return bytea_unresolved(condition_flavor_231_4);
    }
    if input == TimestamptzValue::Null {
        return ByteaValue::Null;
    }
    if let TimestamptzValue::Value(value) = input {
        let wide_value = value;
        let output = bytea_integer_send(wide_value, 8);
        return ByteaValue::Value(output);
    }
    bytea_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__boolsend__oo82(input: BoolValue) -> ByteaValue {
    let mut unresolved_flavor: i32 = 0;
    if let BoolValue::Unknown = input { unresolved_flavor = 1; };
    if let BoolValue::Unimplemented = input { unresolved_flavor = 2; };
    if let BoolValue::Error(error) = input {
        return ByteaValue::Error(error);
    }
    let mut condition_flavor_252_4: i32 = unresolved_flavor; if let BoolValue::Unknown = input { if condition_flavor_252_4 < 1 { condition_flavor_252_4 = 1; }; }; if let BoolValue::Unimplemented = input { condition_flavor_252_4 = 2; }; if (input == BoolValue::Unknown || input == BoolValue::Unimplemented) {
        return bytea_unresolved(condition_flavor_252_4);
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
    bytea_unresolved(unresolved_flavor)
}
