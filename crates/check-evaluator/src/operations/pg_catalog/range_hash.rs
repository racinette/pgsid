const RANGE_HASH_UNDEFINED_FUNCTION: u32 = 6822435;

pub fn range_hash_missing32(state: BoolValue, seed: Int8Value) -> Int4Value {
    if let BoolValue::Error(error) = state {
        return Int4Value::Error(error);
    };
    if let Int8Value::Error(error) = seed {
        return Int4Value::Error(error);
    };
    if state == BoolValue::Value(true) || seed == Int8Value::Null {
        return Int4Value::Null;
    };
    if state == BoolValue::Value(false) {
        if let Int8Value::Value(_) = seed {
            return Int4Value::Error(make_sql_error(RANGE_HASH_UNDEFINED_FUNCTION));
        };
    };
    Int4Value::Unknown
}

pub fn range_hash_missing64(state: BoolValue, seed: Int8Value) -> Int8Value {
    sql__pg_catalog__int8__mzac(range_hash_missing32(state, seed))
}

pub fn sql__pg_catalog__hash_range__ov3e(
    input: RangeValue,
    flags: Int4Value,
    lower: Int4Value,
    upper: Int4Value,
) -> Int4Value {
    if let RangeValue::Error(error) = input {
        return Int4Value::Error(error);
    };
    if let RangeValue::Null = input {
        return Int4Value::Null;
    };
    if let Int4Value::Error(error) = flags {
        return Int4Value::Error(error);
    };
    if let RangeValue::Value(value) = input {
        let mut lo = make_int4_value(0);
        let mut hi = make_int4_value(0);
        if value.empty == false {
            let a = value.bounds[0].clone();
            let b = value.bounds[1].clone();
            let mut lower_present = true;
            let mut upper_present = true;
            if let ArrayElement::Null = a {
                lower_present = false;
            };
            if let ArrayElement::Null = b {
                upper_present = false;
            };
            if lower_present {
                lo = lower;
            };
            if upper_present {
                hi = upper;
            };
        };
        if let Int4Value::Error(error) = lo {
            return Int4Value::Error(error);
        };
        if let Int4Value::Value(lhash) = lo {
            if let Int4Value::Error(error) = hi {
                return Int4Value::Error(error);
            };
            if let Int4Value::Value(uhash) = hi {
                if let Int4Value::Value(basis) = flags {
                    let first = array_hash_word_low(basis as i64);
                    let second = array_hash_word_low(lhash as i64);
                    let merged = hash_xor(first, second);
                    let rotated = (merged * 2i64) % 4294967296i64 + merged / 2147483648i64;
                    let last = array_hash_word_low(uhash as i64);
                    return make_int4_value(hash_xor(rotated, last) as i32);
                };
            };
        };
    };
    Int4Value::Unknown
}

pub fn sql__pg_catalog__hash_range_extended__axg0(
    input: RangeValue,
    seed: Int8Value,
    flags: Int8Value,
    lower: Int8Value,
    upper: Int8Value,
) -> Int8Value {
    if let RangeValue::Error(error) = input {
        return Int8Value::Error(error);
    };
    if let Int8Value::Error(error) = seed {
        return Int8Value::Error(error);
    };
    if let RangeValue::Null = input {
        return Int8Value::Null;
    };
    if let Int8Value::Null = seed {
        return Int8Value::Null;
    };
    if let Int8Value::Unknown = seed {
        return Int8Value::Unknown;
    };
    if let Int8Value::Error(error) = flags {
        return Int8Value::Error(error);
    };
    if let RangeValue::Value(value) = input {
        let mut lo = make_int8_value(0i64);
        let mut hi = make_int8_value(0i64);
        if value.empty == false {
            let a = value.bounds[0].clone();
            let b = value.bounds[1].clone();
            let mut lower_present = true;
            let mut upper_present = true;
            if let ArrayElement::Null = a {
                lower_present = false;
            };
            if let ArrayElement::Null = b {
                upper_present = false;
            };
            if lower_present {
                lo = lower;
            };
            if upper_present {
                hi = upper;
            };
        };
        if let Int8Value::Error(error) = lo {
            return Int8Value::Error(error);
        };
        if let Int8Value::Value(_) = lo {
            if let Int8Value::Error(error) = hi {
                return Int8Value::Error(error);
            };
            if let Int8Value::Value(_) = hi {
                let combined = sql__pg_catalog__int8xor__4v56(flags, lo);
                if let Int8Value::Value(word) = combined {
                    let low = array_hash_word_low(word);
                    let high = array_hash_word_low((word - low) / 4294967296i64);
                    let rotated_low = (low * 2i64) % 4294967296i64 + low / 2147483648i64;
                    let mut rotated_high = (high * 2i64) % 4294967296i64 + high / 2147483648i64;
                    if rotated_high >= 2147483648i64 {
                        rotated_high = rotated_high - 4294967296i64;
                    };
                    let rotated = rotated_high * 4294967296i64 + rotated_low;
                    return sql__pg_catalog__int8xor__4v56(make_int8_value(rotated), hi);
                };
            };
        };
    };
    Int8Value::Unknown
}
