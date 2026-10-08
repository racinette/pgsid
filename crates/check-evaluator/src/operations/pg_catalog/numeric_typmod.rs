pub fn sql__pg_catalog__numeric__879l(input: NumericValue, modifier: Int4Value) -> NumericValue {
    if let NumericValue::Error(error) = input {
        return NumericValue::Error(error);
    }
    if let Int4Value::Error(error) = modifier {
        return NumericValue::Error(error);
    }
    if input == NumericValue::Unknown || modifier == Int4Value::Unknown {
        return NumericValue::Unknown;
    }
    if input == NumericValue::Null || modifier == Int4Value::Null {
        return NumericValue::Null;
    }
    if let NumericValue::Value(value) = input {
        let work = numeric_work_from_value(value.as_str());
        if work.valid == false {
            return NumericValue::Unknown;
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
    NumericValue::Unknown
}
