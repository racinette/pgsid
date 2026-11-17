pub fn sql__pg_catalog__factorial__tah6(input: Int8Value) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int8Value::Unknown = input { unresolved_flavor = 1; };
    if let Int8Value::Unimplemented = input { unresolved_flavor = 2; };
    if let Int8Value::Error(error) = input {
        return NumericValue::Error(error);
    }
    let mut condition_flavor_8_4: i32 = unresolved_flavor; if let Int8Value::Unknown = input { if condition_flavor_8_4 < 1 { condition_flavor_8_4 = 1; }; }; if let Int8Value::Unimplemented = input { condition_flavor_8_4 = 2; }; if input == Int8Value::Unknown || input == Int8Value::Unimplemented {
        return numeric_unresolved(condition_flavor_8_4);
    }
    if input == Int8Value::Null {
        return NumericValue::Null;
    }
    if let Int8Value::Value(value) = input {
        if value < 0i64 || value > 32177i64 {
            return NumericValue::Error(make_sql_error(NUMERIC_SUPPORT_RANGE_ERROR));
        }
        // PostgreSQL's numeric_fac multiplies downwards from the argument.
        let mut result = numeric_var_from_i64(value);
        if value <= 1i64 {
            result = numeric_var_from_i64(1i64);
        }
        let mut factor = value - 1i64;
        while factor > 1i64 {
            let fact = numeric_var_from_i64(factor);
            result = numeric_var_mul(&result, &fact, 0);
            factor = factor - 1i64;
        }
        return numeric_var_result(result);
    }
    numeric_unresolved(unresolved_flavor)
}
