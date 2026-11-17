const NUMERIC_INTEGER_RANGE_ERROR: u32 = 3452547;
const NUMERIC_INTEGER_SPECIAL_ERROR: u32 = 466560;

fn numeric_integer_value(input: NumericValue) -> Int8Value {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
    if let NumericValue::Error(error) = input {
        return Int8Value::Error(error);
    }
    let mut numeric_unknown_input_1 = false; if let NumericValue::Unknown = input { numeric_unknown_input_1 = true; }; let mut numeric_unimplemented_input_2 = false; if let NumericValue::Unimplemented = input { numeric_unimplemented_input_2 = true; };
    let mut condition_flavor_11_4: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_11_4 < 1 { condition_flavor_11_4 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_11_4 = 2; }; if numeric_unknown_input_1 || numeric_unimplemented_input_2 {
        return int8_unresolved(condition_flavor_11_4);
    }
    let mut numeric_null_input_3 = false; if let NumericValue::Null = input { numeric_null_input_3 = true; };
    if numeric_null_input_3 {
        return Int8Value::Null;
    }
    // PostgreSQL's numericvar_to_int64: round to an integer, then accumulate the NBASE digits
    // negatively so that the most negative value fits.
    if let NumericValue::Value(value) = input {
        if numeric_var_kind(&value) != 1 {
            return Int8Value::Error(make_sql_error(NUMERIC_INTEGER_SPECIAL_ERROR));
        }
        let negative = numeric_var_signum(&value) < 0;
        let rounded = numeric_var_strip(numeric_var_round(value, 0));
        let count = numeric_var_count(&rounded);
        if count == 0 {
            return Int8Value::Value(0i64);
        }
        if rounded.weight > 4 {
            return Int8Value::Error(make_sql_error(NUMERIC_INTEGER_RANGE_ERROR));
        }
        let mut result: i64 = 0i64;
        let mut i: i32 = 0;
        while i <= rounded.weight {
            let digit = numeric_var_digit(&rounded, i) as i64;
            if result < -922337203685477i64 || (result == -922337203685477i64 && digit > 5808i64) {
                return Int8Value::Error(make_sql_error(NUMERIC_INTEGER_RANGE_ERROR));
            }
            result = result * 10000i64 - digit;
            i = i + 1;
        }
        if negative {
            return Int8Value::Value(result);
        }
        if result == -9223372036854775808i64 {
            return Int8Value::Error(make_sql_error(NUMERIC_INTEGER_RANGE_ERROR));
        }
        return Int8Value::Value(0i64 - result);
    }
    int8_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__int2__zpjn(input: NumericValue) -> Int2Value {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
    let converted = numeric_integer_value(input);
    if let Int8Value::Error(error) = converted {
        return Int2Value::Error(error);
    }
    let mut condition_flavor_79_4: i32 = unresolved_flavor; if let Int8Value::Unknown = converted { if condition_flavor_79_4 < 1 { condition_flavor_79_4 = 1; }; }; if let Int8Value::Unimplemented = converted { condition_flavor_79_4 = 2; }; if converted == Int8Value::Unknown || converted == Int8Value::Unimplemented {
        return int2_unresolved(condition_flavor_79_4);
    }
    if converted == Int8Value::Null {
        return Int2Value::Null;
    }
    if let Int8Value::Value(value) = converted {
        if value < -32768i64 || value > 32767i64 {
            return Int2Value::Error(make_sql_error(NUMERIC_INTEGER_RANGE_ERROR));
        }
        return Int2Value::Value(value as i32);
    }
    int2_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__int4__z4rh(input: NumericValue) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
    let converted = numeric_integer_value(input);
    if let Int8Value::Error(error) = converted {
        return Int4Value::Error(error);
    }
    let mut condition_flavor_102_4: i32 = unresolved_flavor; if let Int8Value::Unknown = converted { if condition_flavor_102_4 < 1 { condition_flavor_102_4 = 1; }; }; if let Int8Value::Unimplemented = converted { condition_flavor_102_4 = 2; }; if converted == Int8Value::Unknown || converted == Int8Value::Unimplemented {
        return int4_unresolved(condition_flavor_102_4);
    }
    if converted == Int8Value::Null {
        return Int4Value::Null;
    }
    if let Int8Value::Value(value) = converted {
        if value < -2147483648i64 || value > 2147483647i64 {
            return Int4Value::Error(make_sql_error(NUMERIC_INTEGER_RANGE_ERROR));
        }
        return Int4Value::Value(value as i32);
    }
    int4_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__int8__xy54(input: NumericValue) -> Int8Value {
    numeric_integer_value(input)
}

pub fn sql__pg_catalog__numeric__itt9(input: Int2Value) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int2Value::Unknown = input { unresolved_flavor = 1; };
    if let Int2Value::Unimplemented = input { unresolved_flavor = 2; };
    if let Int2Value::Error(error) = input {
        return NumericValue::Error(error);
    }
    let mut condition_flavor_128_4: i32 = unresolved_flavor; if let Int2Value::Unknown = input { if condition_flavor_128_4 < 1 { condition_flavor_128_4 = 1; }; }; if let Int2Value::Unimplemented = input { condition_flavor_128_4 = 2; }; if input == Int2Value::Unknown || input == Int2Value::Unimplemented {
        return numeric_unresolved(condition_flavor_128_4);
    }
    if input == Int2Value::Null {
        return NumericValue::Null;
    }
    if let Int2Value::Value(value) = input {
        let integer = value as i64;
        return make_numeric_value(text_signed_number(integer).as_str());
    }
    numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__numeric__ncrk(input: Int4Value) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int4Value::Unknown = input { unresolved_flavor = 1; };
    if let Int4Value::Unimplemented = input { unresolved_flavor = 2; };
    if let Int4Value::Error(error) = input {
        return NumericValue::Error(error);
    }
    let mut condition_flavor_148_4: i32 = unresolved_flavor; if let Int4Value::Unknown = input { if condition_flavor_148_4 < 1 { condition_flavor_148_4 = 1; }; }; if let Int4Value::Unimplemented = input { condition_flavor_148_4 = 2; }; if input == Int4Value::Unknown || input == Int4Value::Unimplemented {
        return numeric_unresolved(condition_flavor_148_4);
    }
    if input == Int4Value::Null {
        return NumericValue::Null;
    }
    if let Int4Value::Value(value) = input {
        let integer = value as i64;
        return make_numeric_value(text_signed_number(integer).as_str());
    }
    numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__numeric__11bc(input: Int8Value) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int8Value::Unknown = input { unresolved_flavor = 1; };
    if let Int8Value::Unimplemented = input { unresolved_flavor = 2; };
    if let Int8Value::Error(error) = input {
        return NumericValue::Error(error);
    }
    let mut condition_flavor_168_4: i32 = unresolved_flavor; if let Int8Value::Unknown = input { if condition_flavor_168_4 < 1 { condition_flavor_168_4 = 1; }; }; if let Int8Value::Unimplemented = input { condition_flavor_168_4 = 2; }; if input == Int8Value::Unknown || input == Int8Value::Unimplemented {
        return numeric_unresolved(condition_flavor_168_4);
    }
    if input == Int8Value::Null {
        return NumericValue::Null;
    }
    if let Int8Value::Value(value) = input {
        let integer = value;
        return make_numeric_value(text_signed_number(integer).as_str());
    }
    numeric_unresolved(unresolved_flavor)
}
