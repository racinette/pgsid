pub(crate) fn multirange_binary_payload(input: MultirangeValue) -> MultirangePayload {
    if let MultirangeValue::Value(payload) = input {
        return payload;
    };
    let ranges: Vec<RangeValue> = Vec::new();
    MultirangePayload {
        type_name: String::new(),
        range_type: String::new(),
        element_type: String::new(),
        element_kind: 0,
        support: range_unknown_support(),
        ranges: ranges,
    }
}

pub(crate) fn multirange_binary_count(input: &MultirangePayload) -> Int4Value {
    if input.type_name.as_str() == "" || input.ranges.len() > 2147483647 {
        return Int4Value::Unknown;
    };
    Int4Value::Value(input.ranges.len() as i32)
}

pub(crate) fn multirange_binary_member(input: &MultirangePayload, index: Int4Value) -> RangeValue {
    if let Int4Value::Value(offset) = index {
        let position = usize::try_from(offset).unwrap_or(input.ranges.len());
        if position < input.ranges.len() {
            return input.ranges[position].clone();
        };
    };
    RangeValue::Unknown
}

pub(crate) fn multirange_binary_initial32(
    state: BoolValue,
    count: Int4Value,
    seed: Int8Value,
) -> Int4Value {
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
        if let Int4Value::Value(_) = count {
            if let Int8Value::Value(_) = seed {
                return Int4Value::Value(1);
            };
        };
    };
    Int4Value::Unknown
}

pub(crate) fn multirange_binary_initial64(
    state: BoolValue,
    count: Int4Value,
    seed: Int8Value,
) -> Int8Value {
    sql__pg_catalog__int8__mzac(multirange_binary_initial32(state, count, seed))
}

pub(crate) fn multirange_binary_initial_send(state: BoolValue, count: Int4Value) -> ByteaValue {
    let initial = multirange_binary_initial32(state, count, Int8Value::Value(0i64));
    if initial == Int4Value::Value(1) {
        return sql__pg_catalog__int4send__fjzt(count);
    };
    sql__pg_catalog__int4send__fjzt(initial)
}

fn multirange_binary_has_member(count: Int4Value, index: Int4Value) -> bool {
    if let Int4Value::Value(length) = count {
        if let Int4Value::Value(offset) = index {
            return offset >= 0 && offset < length;
        };
    };
    false
}

pub(crate) fn multirange_binary_continues32(
    count: Int4Value,
    index: Int4Value,
    first: Int4Value,
    second: Int4Value,
) -> bool {
    if let Int4Value::Value(_) = first {
        if let Int4Value::Value(_) = second {
            return multirange_binary_has_member(count, index);
        };
    };
    false
}

pub(crate) fn multirange_binary_continues64(
    count: Int4Value,
    index: Int4Value,
    first: Int8Value,
    second: Int8Value,
) -> bool {
    if let Int8Value::Value(_) = first {
        if let Int8Value::Value(_) = second {
            return multirange_binary_has_member(count, index);
        };
    };
    false
}

pub(crate) fn multirange_binary_continues_send(
    count: Int4Value,
    index: Int4Value,
    output: ByteaValue,
) -> bool {
    if let ByteaValue::Value(_) = output {
        return multirange_binary_has_member(count, index);
    };
    if let ByteaValue::Unspecified(_) = output {
        return multirange_binary_has_member(count, index);
    };
    false
}

pub(crate) fn multirange_binary_append(output: ByteaValue, member: ByteaValue) -> ByteaValue {
    range_binary_append(output, member)
}

pub fn sql__pg_catalog__multirange_send__awvx(input: ByteaValue) -> ByteaValue {
    input
}

pub fn sql__pg_catalog__hash_multirange__603b(input: Int4Value) -> Int4Value {
    input
}

pub fn sql__pg_catalog__hash_multirange_extended__coup(input: Int8Value) -> Int8Value {
    input
}
