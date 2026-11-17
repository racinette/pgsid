fn numeric_range_values(
    value: NumericVar,
    base: NumericVar,
    offset: NumericVar,
    subtract: bool,
    less: bool,
) -> BoolValue {
    let unresolved_flavor: i32 = 0;
    let input_kind = numeric_var_kind(&value);
    let center_kind = numeric_var_kind(&base);
    let distance_kind = numeric_var_kind(&offset);
    if distance_kind == 3 || distance_kind == 0 || numeric_var_signum(&offset) < 0 {
        return BoolValue::Error(make_sql_error(INTEGER_INVALID_FRAME_SIZE));
    }
    if input_kind == 3 {
        return BoolValue::Value(center_kind == 3 || less == false);
    }
    if center_kind == 3 {
        return BoolValue::Value(less);
    }
    if distance_kind == 2 {
        if (subtract && center_kind == 2) || (subtract == false && center_kind == 0) {
            return BoolValue::Value(true);
        }
        if subtract {
            return BoolValue::Value(less == false || input_kind == 0);
        }
        return BoolValue::Value(less || input_kind == 2);
    }
    if input_kind == 0 || input_kind == 2 {
        if input_kind == center_kind {
            return BoolValue::Value(true);
        }
        if input_kind == 0 {
            return BoolValue::Value(less);
        }
        return BoolValue::Value(less == false);
    }
    if center_kind == 0 || center_kind == 2 {
        if center_kind == 0 {
            return BoolValue::Value(less == false);
        }
        return BoolValue::Value(less);
    }
    let mut mode: i32 = 0;
    if subtract {
        mode = 1;
    }
    let boundary = numeric_arithmetic(NumericValue::Value(base), NumericValue::Value(offset), mode);
    if let NumericValue::Error(error) = boundary {
        if error.state == NUMERIC_SUPPORT_RANGE_ERROR {
            return BoolValue::Value(less != subtract);
        }
        return BoolValue::Error(error);
    }
    let compared = numeric_compare(NumericValue::Value(value), boundary);
    if let Int4Value::Error(error) = compared {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_63_4: i32 = unresolved_flavor; if let Int4Value::Unknown = compared { if condition_flavor_63_4 < 1 { condition_flavor_63_4 = 1; }; }; if let Int4Value::Unimplemented = compared { condition_flavor_63_4 = 2; }; if compared == Int4Value::Unknown || compared == Int4Value::Unimplemented {
        return bool_unresolved(condition_flavor_63_4);
    }
    if let Int4Value::Value(order) = compared {
        if less {
            return BoolValue::Value(order <= 0);
        }
        return BoolValue::Value(order >= 0);
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__in_range__fhht(
    value: NumericValue,
    base: NumericValue,
    offset: NumericValue,
    subtract: BoolValue,
    less: BoolValue,
) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = value { unresolved_flavor = 1; };
    if let NumericValue::Unknown = base { unresolved_flavor = 1; };
    if let NumericValue::Unknown = offset { unresolved_flavor = 1; };
    if let BoolValue::Unknown = subtract { unresolved_flavor = 1; };
    if let BoolValue::Unknown = less { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = value { unresolved_flavor = 2; };
    if let NumericValue::Unimplemented = base { unresolved_flavor = 2; };
    if let NumericValue::Unimplemented = offset { unresolved_flavor = 2; };
    if let BoolValue::Unimplemented = subtract { unresolved_flavor = 2; };
    if let BoolValue::Unimplemented = less { unresolved_flavor = 2; };
    if let NumericValue::Error(error) = value {
        return BoolValue::Error(error);
    }
    if let NumericValue::Error(error) = base {
        return BoolValue::Error(error);
    }
    if let NumericValue::Error(error) = offset {
        return BoolValue::Error(error);
    }
    if let BoolValue::Error(error) = subtract {
        return BoolValue::Error(error);
    }
    if let BoolValue::Error(error) = less {
        return BoolValue::Error(error);
    }
    let mut numeric_unknown_value_1 = false; if let NumericValue::Unknown = value { numeric_unknown_value_1 = true; }; let mut numeric_unimplemented_value_2 = false; if let NumericValue::Unimplemented = value { numeric_unimplemented_value_2 = true; };
    let mut numeric_unknown_base_3 = false; if let NumericValue::Unknown = base { numeric_unknown_base_3 = true; }; let mut numeric_unimplemented_base_4 = false; if let NumericValue::Unimplemented = base { numeric_unimplemented_base_4 = true; };
    let mut numeric_unknown_offset_5 = false; if let NumericValue::Unknown = offset { numeric_unknown_offset_5 = true; }; let mut numeric_unimplemented_offset_6 = false; if let NumericValue::Unimplemented = offset { numeric_unimplemented_offset_6 = true; };
    let mut condition_flavor_108_4: i32 = unresolved_flavor; if let NumericValue::Unknown = value { if condition_flavor_108_4 < 1 { condition_flavor_108_4 = 1; }; }; if let NumericValue::Unimplemented = value { condition_flavor_108_4 = 2; }; if let NumericValue::Unknown = base { if condition_flavor_108_4 < 1 { condition_flavor_108_4 = 1; }; }; if let NumericValue::Unimplemented = base { condition_flavor_108_4 = 2; }; if let NumericValue::Unknown = offset { if condition_flavor_108_4 < 1 { condition_flavor_108_4 = 1; }; }; if let NumericValue::Unimplemented = offset { condition_flavor_108_4 = 2; }; if let BoolValue::Unknown = subtract { if condition_flavor_108_4 < 1 { condition_flavor_108_4 = 1; }; }; if let BoolValue::Unimplemented = subtract { condition_flavor_108_4 = 2; }; if let BoolValue::Unknown = less { if condition_flavor_108_4 < 1 { condition_flavor_108_4 = 1; }; }; if let BoolValue::Unimplemented = less { condition_flavor_108_4 = 2; }; if (numeric_unknown_value_1 || numeric_unimplemented_value_2)
        || (numeric_unknown_base_3 || numeric_unimplemented_base_4)
        || (numeric_unknown_offset_5 || numeric_unimplemented_offset_6)
        || (subtract == BoolValue::Unknown || subtract == BoolValue::Unimplemented)
        || (less == BoolValue::Unknown || less == BoolValue::Unimplemented)
    {
        return bool_unresolved(condition_flavor_108_4);
    }
    let mut numeric_null_value_7 = false; if let NumericValue::Null = value { numeric_null_value_7 = true; };
    let mut numeric_null_base_8 = false; if let NumericValue::Null = base { numeric_null_base_8 = true; };
    let mut numeric_null_offset_9 = false; if let NumericValue::Null = offset { numeric_null_offset_9 = true; };
    if numeric_null_value_7
        || numeric_null_base_8
        || numeric_null_offset_9
        || subtract == BoolValue::Null
        || less == BoolValue::Null
    {
        return BoolValue::Null;
    }
    if let NumericValue::Value(input) = value {
        if let NumericValue::Value(center) = base {
            if let NumericValue::Value(distance) = offset {
                if let BoolValue::Value(sub) = subtract {
                    if let BoolValue::Value(lower) = less {
                        return numeric_range_values(
                            input,
                            center,
                            distance,
                            sub,
                            lower,
                        );
                    }
                }
            }
        }
    }
    bool_unresolved(unresolved_flavor)
}
