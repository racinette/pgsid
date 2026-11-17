pub fn sql__pg_catalog__numeric__879l(input: NumericValue, modifier: Int4Value) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let Int4Value::Unknown = modifier { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = modifier { unresolved_flavor = 2; };
    if let NumericValue::Error(error) = input {
        return NumericValue::Error(error);
    }
    if let Int4Value::Error(error) = modifier {
        return NumericValue::Error(error);
    }
    let mut numeric_unknown_input_1 = false; if let NumericValue::Unknown = input { numeric_unknown_input_1 = true; }; let mut numeric_unimplemented_input_2 = false; if let NumericValue::Unimplemented = input { numeric_unimplemented_input_2 = true; };
    let mut condition_flavor_13_4: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_13_4 < 1 { condition_flavor_13_4 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_13_4 = 2; }; if let Int4Value::Unknown = modifier { if condition_flavor_13_4 < 1 { condition_flavor_13_4 = 1; }; }; if let Int4Value::Unimplemented = modifier { condition_flavor_13_4 = 2; }; if (numeric_unknown_input_1 || numeric_unimplemented_input_2) || (modifier == Int4Value::Unknown || modifier == Int4Value::Unimplemented) {
        return numeric_unresolved(condition_flavor_13_4);
    }
    let mut numeric_null_input_3 = false; if let NumericValue::Null = input { numeric_null_input_3 = true; };
    if numeric_null_input_3 || modifier == Int4Value::Null {
        return NumericValue::Null;
    }
    // PostgreSQL's apply_typmod: round to the scale, then reject more integer digits than the
    // precision leaves room for.
    if let NumericValue::Value(value) = input {
        if let Int4Value::Value(typmod) = modifier {
            let kind = numeric_var_kind(&value);
            if typmod < 4 || kind == 3 {
                return NumericValue::Value(value);
            }
            if kind != 1 {
                return NumericValue::Error(make_sql_error(NUMERIC_SUPPORT_RANGE_ERROR));
            }
            let packed = typmod - 4;
            let precision = packed / 65536;
            let mut scale = packed % 2048;
            if scale >= 1024 {
                scale = scale - 2048;
            }
            let maxdigits = precision - scale;
            let rounded = numeric_var_round(value, scale);
            let count = numeric_var_count(&rounded);
            if count > 0 {
                let mut ddigits = (rounded.weight + 1) * NUMERIC_VAR_DEC_DIGITS;
                if ddigits > maxdigits {
                    let mut i: i32 = 0;
                    while i < count {
                        let dig = numeric_var_digit(&rounded, i);
                        if dig != 0 {
                            if dig < 10 {
                                ddigits = ddigits - 3;
                            } else if dig < 100 {
                                ddigits = ddigits - 2;
                            } else if dig < 1000 {
                                ddigits = ddigits - 1;
                            };
                            if ddigits > maxdigits {
                                return NumericValue::Error(make_sql_error(
                                    NUMERIC_SUPPORT_RANGE_ERROR,
                                ));
                            }
                            i = count;
                        } else {
                            ddigits = ddigits - NUMERIC_VAR_DEC_DIGITS;
                        };
                        i = i + 1;
                    }
                }
            }
            let mut result_scale = scale;
            if result_scale < 0 {
                result_scale = 0;
            }
            return numeric_var_result(numeric_var_rescaled(rounded, result_scale));
        }
    }
    numeric_unresolved(unresolved_flavor)
}
