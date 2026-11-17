const NUMERIC_BUCKET_INVALID_ARGUMENT: u32 = 3452596;

fn numeric_bucket_order(left: &NumericVar, right: &NumericVar) -> i32 {
    let kind = numeric_var_kind(left);
    if kind == 0 {
        return -1;
    }
    if kind == 2 {
        return 1;
    }
    numeric_var_cmp(left, right)
}

fn numeric_bucket(
    operand_var: NumericVar,
    bound1_var: NumericVar,
    bound2_var: NumericVar,
    count: i32,
) -> Int4Value {
    let unresolved_flavor: i32 = 0;
    if count <= 0
        || numeric_var_kind(&operand_var) == 3
        || numeric_var_kind(&bound1_var) != 1
        || numeric_var_kind(&bound2_var) != 1
    {
        return Int4Value::Error(make_sql_error(NUMERIC_BUCKET_INVALID_ARGUMENT));
    }
    let direction = numeric_bucket_order(&bound1_var, &bound2_var);
    if direction == 0 {
        return Int4Value::Error(make_sql_error(NUMERIC_BUCKET_INVALID_ARGUMENT));
    }
    let start = numeric_bucket_order(&operand_var, &bound1_var);
    let end = numeric_bucket_order(&operand_var, &bound2_var);
    if (direction < 0 && start < 0) || (direction > 0 && start > 0) {
        return Int4Value::Value(0);
    }
    if (direction < 0 && end >= 0) || (direction > 0 && end <= 0) {
        if count == 2147483647 {
            return Int4Value::Error(make_sql_error(NUMERIC_SUPPORT_RANGE_ERROR));
        }
        return Int4Value::Value(count + 1);
    }
    // PostgreSQL's compute_bucket: ((operand - bound1) * count) / (bound2 - bound1), truncated.
    let distance = numeric_var_sub(&operand_var, &bound1_var);
    let span = numeric_var_sub(&bound2_var, &bound1_var);
    let count_var = numeric_var_from_i64(count as i64);
    let scaled = numeric_var_mul(&distance, &count_var, distance.dscale + count_var.dscale);
    let quotient = numeric_var_div(&scaled, &span, 0, false, true);
    let integer = numeric_integer_value(numeric_var_result(quotient));
    if let Int8Value::Error(error) = integer {
        return Int4Value::Error(error);
    }
    if let Int8Value::Value(number) = integer {
        if number < 0i64 || number >= 2147483647i64 {
            return Int4Value::Error(make_sql_error(NUMERIC_SUPPORT_RANGE_ERROR));
        }
        let bucket = number as i32;
        return Int4Value::Value(bucket + 1);
    }
    let mut local_flavor_65_4: i32 = unresolved_flavor; if let Int8Value::Unknown = integer { if local_flavor_65_4 < 1 { local_flavor_65_4 = 1; }; }; if let Int8Value::Unimplemented = integer { local_flavor_65_4 = 2; }; int4_unresolved(local_flavor_65_4)
}

pub fn sql__pg_catalog__width_bucket__mx75(
    value: NumericValue,
    lower: NumericValue,
    upper: NumericValue,
    count: Int4Value,
) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = value { unresolved_flavor = 1; };
    if let NumericValue::Unknown = lower { unresolved_flavor = 1; };
    if let NumericValue::Unknown = upper { unresolved_flavor = 1; };
    if let Int4Value::Unknown = count { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = value { unresolved_flavor = 2; };
    if let NumericValue::Unimplemented = lower { unresolved_flavor = 2; };
    if let NumericValue::Unimplemented = upper { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = count { unresolved_flavor = 2; };
    if let NumericValue::Error(error) = value {
        return Int4Value::Error(error);
    }
    if let NumericValue::Error(error) = lower {
        return Int4Value::Error(error);
    }
    if let NumericValue::Error(error) = upper {
        return Int4Value::Error(error);
    }
    if let Int4Value::Error(error) = count {
        return Int4Value::Error(error);
    }
    let mut numeric_unknown_value_1 = false; if let NumericValue::Unknown = value { numeric_unknown_value_1 = true; }; let mut numeric_unimplemented_value_2 = false; if let NumericValue::Unimplemented = value { numeric_unimplemented_value_2 = true; };
    let mut numeric_unknown_lower_3 = false; if let NumericValue::Unknown = lower { numeric_unknown_lower_3 = true; }; let mut numeric_unimplemented_lower_4 = false; if let NumericValue::Unimplemented = lower { numeric_unimplemented_lower_4 = true; };
    let mut numeric_unknown_upper_5 = false; if let NumericValue::Unknown = upper { numeric_unknown_upper_5 = true; }; let mut numeric_unimplemented_upper_6 = false; if let NumericValue::Unimplemented = upper { numeric_unimplemented_upper_6 = true; };
    let mut condition_flavor_95_4: i32 = unresolved_flavor; if let NumericValue::Unknown = value { if condition_flavor_95_4 < 1 { condition_flavor_95_4 = 1; }; }; if let NumericValue::Unimplemented = value { condition_flavor_95_4 = 2; }; if let NumericValue::Unknown = lower { if condition_flavor_95_4 < 1 { condition_flavor_95_4 = 1; }; }; if let NumericValue::Unimplemented = lower { condition_flavor_95_4 = 2; }; if let NumericValue::Unknown = upper { if condition_flavor_95_4 < 1 { condition_flavor_95_4 = 1; }; }; if let NumericValue::Unimplemented = upper { condition_flavor_95_4 = 2; }; if let Int4Value::Unknown = count { if condition_flavor_95_4 < 1 { condition_flavor_95_4 = 1; }; }; if let Int4Value::Unimplemented = count { condition_flavor_95_4 = 2; }; if (numeric_unknown_value_1 || numeric_unimplemented_value_2)
        || (numeric_unknown_lower_3 || numeric_unimplemented_lower_4)
        || (numeric_unknown_upper_5 || numeric_unimplemented_upper_6)
        || (count == Int4Value::Unknown || count == Int4Value::Unimplemented)
    {
        return int4_unresolved(condition_flavor_95_4);
    }
    let mut numeric_null_value_7 = false; if let NumericValue::Null = value { numeric_null_value_7 = true; };
    let mut numeric_null_lower_8 = false; if let NumericValue::Null = lower { numeric_null_lower_8 = true; };
    let mut numeric_null_upper_9 = false; if let NumericValue::Null = upper { numeric_null_upper_9 = true; };
    if numeric_null_value_7
        || numeric_null_lower_8
        || numeric_null_upper_9
        || count == Int4Value::Null
    {
        return Int4Value::Null;
    }
    if let NumericValue::Value(input) = value {
        if let NumericValue::Value(first) = lower {
            if let NumericValue::Value(last) = upper {
                if let Int4Value::Value(buckets) = count {
                    return numeric_bucket(input, first, last, buckets);
                }
            }
        }
    }
    int4_unresolved(unresolved_flavor)
}
