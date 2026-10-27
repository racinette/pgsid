fn integer_scalar_sum(state: Int8Value, input: Int8Value) -> Int8Value {
    if let Int8Value::Error(error) = state {
        return Int8Value::Error(error);
    };
    if let Int8Value::Error(error) = input {
        return Int8Value::Error(error);
    };
    if input == Int8Value::Null {
        return state;
    };
    if state == Int8Value::Null {
        return input;
    };
    if let Int8Value::Value(value) = input {
        return integer_state_adjust(state, value);
    };
    Int8Value::Unknown
}

pub fn sql__pg_catalog__int2_sum__3feg(state: Int8Value, input: Int2Value) -> Int8Value {
    integer_scalar_sum(state, int2_to_int8(input))
}

pub fn sql__pg_catalog__int4_sum__vfwt(state: Int8Value, input: Int4Value) -> Int8Value {
    integer_scalar_sum(state, sql__pg_catalog__int8__mzac(input))
}

pub fn sql__pg_catalog__int8_sum__cqr6(state: NumericValue, input: Int8Value) -> NumericValue {
    if let NumericValue::Error(error) = state {
        return NumericValue::Error(error);
    };
    if let Int8Value::Error(error) = input {
        return NumericValue::Error(error);
    };
    if input == Int8Value::Null {
        return state;
    };
    let amount = sql__pg_catalog__numeric__11bc(input);
    if state == NumericValue::Null {
        return amount;
    };
    let copy = state.clone();
    if let NumericValue::Value(text) = copy {
        let parts = numeric_parts(text.as_str());
        if parts.valid && parts.special == 0 {
            return make_numeric_value("-Infinity");
        };
        if parts.valid && parts.special == 2 {
            return make_numeric_value("Infinity");
        };
        if parts.valid && parts.special == 3 {
            return make_numeric_value("NaN");
        };
    };
    sql__pg_catalog__numeric_add__o3d7(state, amount)
}
