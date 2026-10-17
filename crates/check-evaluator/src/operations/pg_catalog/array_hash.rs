fn array_hash_word_low(value: i64) -> i64 {
    let mut low = value % 4294967296i64;
    if low < 0i64 {
        low = low + 4294967296i64;
    };
    low
}

pub fn array_hash_cell32(nullness: BoolValue) -> Int4Value {
    if let BoolValue::Error(error) = nullness {
        return Int4Value::Error(error);
    };
    if let BoolValue::Value(value) = nullness {
        if value {
            return Int4Value::Value(0);
        };
        return Int4Value::Value(1);
    };
    Int4Value::Unknown
}

pub fn array_hash_cell64(nullness: BoolValue) -> Int8Value {
    let state = array_hash_cell32(nullness);
    if let Int4Value::Error(error) = state {
        return Int8Value::Error(error);
    };
    if let Int4Value::Value(value) = state {
        return Int8Value::Value(value as i64);
    };
    Int8Value::Unknown
}

pub fn array_hash_requires_scalar32(input: Int4Value) -> bool {
    input == Int4Value::Value(1)
}
pub fn array_hash_requires_scalar64(input: Int8Value) -> bool {
    input == Int8Value::Value(1i64)
}

pub fn array_hash_step32(left: Int4Value, right: Int4Value) -> Int4Value {
    if let Int4Value::Error(error) = left {
        return Int4Value::Error(error);
    };
    if let Int4Value::Error(error) = right {
        return Int4Value::Error(error);
    };
    if let Int4Value::Value(a) = left {
        if let Int4Value::Value(b) = right {
            let first = array_hash_word_low(a as i64);
            let second = array_hash_word_low(b as i64);
            let value = (first * 31i64 + second) % 4294967296i64;
            return Int4Value::Value(value as i32);
        };
    };
    Int4Value::Unknown
}

pub fn array_hash_step64(left: Int8Value, right: Int8Value) -> Int8Value {
    if let Int8Value::Error(error) = left {
        return Int8Value::Error(error);
    };
    if let Int8Value::Error(error) = right {
        return Int8Value::Error(error);
    };
    if let Int8Value::Value(a) = left {
        if let Int8Value::Value(b) = right {
            let low_a = array_hash_word_low(a);
            let low_b = array_hash_word_low(b);
            let high_a = array_hash_word_low((a - low_a) / 4294967296i64);
            let high_b = array_hash_word_low((b - low_b) / 4294967296i64);
            let low_sum = low_a * 31i64 + low_b;
            let mut high = (high_a * 31i64 + high_b + low_sum / 4294967296i64) % 4294967296i64;
            if high >= 2147483648i64 {
                high = high - 4294967296i64;
            };
            let value = high * 4294967296i64 + low_sum % 4294967296i64;
            return Int8Value::Value(value);
        };
    };
    Int8Value::Unknown
}

pub fn array_hash_finish32(first: Int4Value, second: Int4Value) -> Int4Value {
    if let Int4Value::Error(error) = first {
        return Int4Value::Error(error);
    };
    if let Int4Value::Error(error) = second {
        return Int4Value::Error(error);
    };
    if first == second {
        return first;
    };
    Int4Value::Unknown
}

pub fn array_hash_finish64(first: Int8Value, second: Int8Value) -> Int8Value {
    if let Int8Value::Error(error) = first {
        return Int8Value::Error(error);
    };
    if let Int8Value::Error(error) = second {
        return Int8Value::Error(error);
    };
    if first == second {
        return first;
    };
    Int8Value::Unknown
}

pub fn sql__pg_catalog__hash_array__bk1m(input: Int4Value) -> Int4Value {
    input
}
pub fn sql__pg_catalog__hash_array_extended__8jvn(input: Int8Value) -> Int8Value {
    input
}
