const RECORD_HASH_UNDEFINED: u32 = 6822435;

fn record_hash_state(state: i32, error: SqlError) -> ArrayComparisonPayload {
    let left: Vec<ArrayElement> = Vec::new();
    let right: Vec<ArrayElement> = Vec::new();
    ArrayComparisonPayload {
        left: left,
        right: right,
        limit: 0,
        state: state,
        error: error,
        tail: 0,
        value: 0,
    }
}

pub(crate) fn prepare_record_hash(
    input: CompositeValue,
    seed: Int8Value,
    type_name: &str,
    count: i32,
) -> ArrayComparisonPayload {
    let checked = composite_from_coerced_value(input);
    if let CompositeValue::Error(error) = checked {
        return record_hash_state(-2, error);
    };
    if let Int8Value::Error(error) = seed {
        return record_hash_state(-2, error);
    };
    if let CompositeValue::Null = checked {
        return record_hash_state(0, make_sql_error(0));
    };
    if let Int8Value::Null = seed {
        return record_hash_state(0, make_sql_error(0));
    };
    if let Int8Value::Value(_value) = seed {
        if let CompositeValue::Value(value) = checked {
            let expected = usize::try_from(count).unwrap_or(value.fields.len() + 1);
            if value.type_name.as_str() == type_name && value.fields.len() == expected {
                let right: Vec<ArrayElement> = Vec::new();
                return ArrayComparisonPayload {
                    left: value.fields,
                    right: right,
                    limit: expected,
                    state: 1,
                    error: make_sql_error(0),
                    tail: 0,
                    value: 0,
                };
            };
        };
    };
    record_hash_state(-1, make_sql_error(0))
}

pub(crate) fn record_hash_ready(input: &ArrayComparisonPayload) -> bool {
    input.state == 1
}

pub(crate) fn prepare_record_array_hash(
    input: ArrayValue,
    seed: Int8Value,
    availability: i32,
) -> ArrayComparisonPayload {
    let result = prepare_array_hash(input, seed, true);
    if result.state == 1 && availability != 1 {
        if availability == 0 {
            return record_hash_state(-2, make_sql_error(RECORD_HASH_UNDEFINED));
        };
        return record_hash_state(-1, make_sql_error(0));
    };
    result
}

pub(crate) fn record_hash_initial64(input: &ArrayComparisonPayload) -> Int8Value {
    let initial = array_comparison_initial(input);
    if let Int4Value::Error(error) = initial {
        return Int8Value::Error(error);
    };
    if let Int4Value::Null = initial {
        return Int8Value::Null;
    };
    if let Int4Value::Value(value) = initial {
        return Int8Value::Value(value as i64);
    };
    Int8Value::Unknown
}

pub(crate) fn record_hash_cell32(input: ArrayElement, availability: i32) -> Int4Value {
    if let ArrayElement::Error(error) = input {
        return Int4Value::Error(error);
    };
    if availability == 0 {
        return Int4Value::Error(make_sql_error(RECORD_HASH_UNDEFINED));
    };
    if availability != 1 {
        return Int4Value::Unknown;
    };
    array_hash_cell32(array_element_bitmap(input))
}

pub(crate) fn record_hash_cell64(input: ArrayElement, availability: i32) -> Int8Value {
    let value = record_hash_cell32(input, availability);
    if let Int4Value::Error(error) = value {
        return Int8Value::Error(error);
    };
    if let Int4Value::Value(payload) = value {
        return Int8Value::Value(payload as i64);
    };
    Int8Value::Unknown
}

pub fn sql__pg_catalog__hash_record__5xrm(input: Int4Value) -> Int4Value {
    input
}
pub fn sql__pg_catalog__hash_record_extended__nz67(input: Int8Value) -> Int8Value {
    input
}
