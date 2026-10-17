const INTEGER_ARRAY_STATE_ERROR: u32 = 56966976;

fn integer_array_state_valid(input: &ArrayPayload) -> BoolValue {
    if input.element_kind != 3 || input.element_type.as_str() != "pg_catalog.int8" {
        return BoolValue::Unknown;
    };
    if input.null_bitmap == BoolValue::Value(true)
        || input.dimensions.len() + input.elements.len() != 3
    {
        return BoolValue::Error(make_sql_error(INTEGER_ARRAY_STATE_ERROR));
    };
    if input.null_bitmap == BoolValue::Value(false) {
        return BoolValue::Value(true);
    };
    BoolValue::Unknown
}

fn integer_state_adjust(input: Int8Value, delta: i64) -> Int8Value {
    if let Int8Value::Value(value) = input {
        let maximum = 9223372036854775807i64;
        let minimum = -9223372036854775808i64;
        if delta >= 0i64 {
            let threshold = maximum - delta;
            if value > threshold {
                return make_int8_value(minimum + (value - threshold) - 1i64);
            };
        } else {
            let threshold = minimum - delta;
            if value < threshold {
                return make_int8_value(maximum + (value - threshold) + 1i64);
            };
        };
        return make_int8_value(value + delta);
    };
    input
}

fn integer_state_transition(input: ArrayValue, amount: Int8Value, inverse: bool) -> ArrayValue {
    if let ArrayValue::Error(error) = input {
        return ArrayValue::Error(error);
    };
    if let Int8Value::Error(error) = amount {
        return ArrayValue::Error(error);
    };
    if let ArrayValue::Null = input {
        return ArrayValue::Null;
    };
    if amount == Int8Value::Null {
        return ArrayValue::Null;
    };
    if let ArrayValue::Value(value) = input {
        if let Int8Value::Value(increment) = amount {
            let validity = integer_array_state_valid(&value);
            if let BoolValue::Error(error) = validity {
                return ArrayValue::Error(error);
            };
            if validity != BoolValue::Value(true) || value.elements.len() != 2 {
                return ArrayValue::Unknown;
            };
            let mut step = 1i64;
            let mut delta = increment;
            if inverse {
                step = -1i64;
                delta = 0i64 - increment;
            };
            let count =
                integer_state_adjust(array_element_to_int8(value.elements[0].clone()), step);
            let sum = integer_state_adjust(array_element_to_int8(value.elements[1].clone()), delta);
            let mut elements: Vec<ArrayElement> = Vec::new();
            elements.push(array_element_from_int8(count));
            elements.push(array_element_from_int8(sum));
            return make_array_value(ArrayPayload {
                element_type: value.element_type,
                element_kind: value.element_kind,
                dimensions: value.dimensions,
                elements: elements,
                null_bitmap: BoolValue::Value(false),
            });
        };
    };
    ArrayValue::Unknown
}

pub fn sql__pg_catalog__int2_avg_accum__7nj2(input: ArrayValue, amount: Int2Value) -> ArrayValue {
    integer_state_transition(input, int2_to_int8(amount), false)
}

pub fn sql__pg_catalog__int4_avg_accum__tsby(input: ArrayValue, amount: Int4Value) -> ArrayValue {
    integer_state_transition(input, sql__pg_catalog__int8__mzac(amount), false)
}

pub fn sql__pg_catalog__int2_avg_accum_inv__vtyq(
    input: ArrayValue,
    amount: Int2Value,
) -> ArrayValue {
    integer_state_transition(input, int2_to_int8(amount), true)
}

pub fn sql__pg_catalog__int4_avg_accum_inv__dt0r(
    input: ArrayValue,
    amount: Int4Value,
) -> ArrayValue {
    integer_state_transition(input, sql__pg_catalog__int8__mzac(amount), true)
}

fn integer_state_sum(input: ArrayValue) -> Int8Value {
    if let ArrayValue::Error(error) = input {
        return Int8Value::Error(error);
    };
    if let ArrayValue::Null = input {
        return Int8Value::Null;
    };
    if let ArrayValue::Value(value) = input {
        let validity = integer_array_state_valid(&value);
        if let BoolValue::Error(error) = validity {
            return Int8Value::Error(error);
        };
        if validity != BoolValue::Value(true) {
            return Int8Value::Unknown;
        };
        let count = array_element_to_int8(value.elements[0].clone());
        if count == Int8Value::Value(0i64) {
            return Int8Value::Null;
        };
        if let Int8Value::Value(_) = count {
            if value.elements.len() == 2 {
                return array_element_to_int8(value.elements[1].clone());
            };
        };
    };
    Int8Value::Unknown
}

pub fn sql__pg_catalog__int2int4_sum__8u9i(input: ArrayValue) -> Int8Value {
    integer_state_sum(input)
}

pub fn sql__pg_catalog__int8_avg__pgr2(input: ArrayValue) -> NumericValue {
    let sum = integer_state_sum(input.clone());
    if let Int8Value::Error(error) = sum {
        return NumericValue::Error(error);
    };
    if sum == Int8Value::Null {
        return NumericValue::Null;
    };
    if sum == Int8Value::Unknown {
        return NumericValue::Unknown;
    };
    if let ArrayValue::Value(value) = input {
        let count = array_element_to_int8(value.elements[0].clone());
        let numerator = sql__pg_catalog__numeric__11bc(sum);
        let denominator = sql__pg_catalog__numeric__11bc(count);
        return sql__pg_catalog__numeric_div__pnzm(numerator, denominator);
    };
    NumericValue::Unknown
}
