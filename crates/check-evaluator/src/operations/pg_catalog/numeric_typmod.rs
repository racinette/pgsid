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
    let mut condition_flavor_13_4: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_13_4 < 1 { condition_flavor_13_4 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_13_4 = 2; }; if let Int4Value::Unknown = modifier { if condition_flavor_13_4 < 1 { condition_flavor_13_4 = 1; }; }; if let Int4Value::Unimplemented = modifier { condition_flavor_13_4 = 2; }; if (input == NumericValue::Unknown || input == NumericValue::Unimplemented) || (modifier == Int4Value::Unknown || modifier == Int4Value::Unimplemented) {
        return numeric_unresolved(condition_flavor_13_4);
    }
    if input == NumericValue::Null || modifier == Int4Value::Null {
        return NumericValue::Null;
    }
    if let NumericValue::Value(value) = input {
        let work = numeric_work_from_value(value.as_str());
        if work.valid == false {
            return numeric_unresolved(unresolved_flavor);
        }
        if let Int4Value::Value(typmod) = modifier {
            if typmod < 4 || work.special == 3 {
                return NumericValue::Value(value);
            }
            if work.special != 1 {
                return NumericValue::Error(make_sql_error(NUMERIC_SUPPORT_RANGE_ERROR));
            }
            let packed = typmod - 4;
            let precision = packed / 65536;
            let mut scale = packed % 2048;
            if scale >= 1024 {
                scale = scale - 2048;
            }
            let rounded = numeric_work_round(work, scale, 1);
            if let NumericValue::Value(result) = rounded {
                let layout = numeric_parts(result.as_str());
                if layout.sign != 0 && layout.weight + 1 > precision - scale {
                    return NumericValue::Error(make_sql_error(NUMERIC_SUPPORT_RANGE_ERROR));
                }
                return NumericValue::Value(result);
            }
            return rounded;
        }
    }
    numeric_unresolved(unresolved_flavor)
}
