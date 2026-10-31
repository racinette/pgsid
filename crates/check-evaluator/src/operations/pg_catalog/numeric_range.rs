fn numeric_range_values(
    value: &str,
    base: &str,
    offset: &str,
    subtract: bool,
    less: bool,
) -> BoolValue {
    let unresolved_flavor: i32 = 0;
    let input = numeric_parts(value);
    let center = numeric_parts(base);
    let distance = numeric_parts(offset);
    if input.valid == false || center.valid == false || distance.valid == false {
        return bool_unresolved(unresolved_flavor);
    }
    if distance.special == 3 || distance.special == 0 || distance.sign < 0 {
        return BoolValue::Error(make_sql_error(INTEGER_INVALID_FRAME_SIZE));
    }
    if input.special == 3 {
        return BoolValue::Value(center.special == 3 || less == false);
    }
    if center.special == 3 {
        return BoolValue::Value(less);
    }
    if distance.special == 2 {
        if (subtract && center.special == 2) || (subtract == false && center.special == 0) {
            return BoolValue::Value(true);
        }
        if subtract {
            return BoolValue::Value(less == false || input.special == 0);
        }
        return BoolValue::Value(less || input.special == 2);
    }
    if input.special == 0 || input.special == 2 {
        if input.special == center.special {
            return BoolValue::Value(true);
        }
        if input.special == 0 {
            return BoolValue::Value(less);
        }
        return BoolValue::Value(less == false);
    }
    if center.special == 0 || center.special == 2 {
        if center.special == 0 {
            return BoolValue::Value(less == false);
        }
        return BoolValue::Value(less);
    }
    let mut mode: i32 = 0;
    if subtract {
        mode = 1;
    }
    let boundary = numeric_arithmetic(make_numeric_value(base), make_numeric_value(offset), mode);
    if let NumericValue::Error(error) = boundary {
        if error.state == NUMERIC_SUPPORT_RANGE_ERROR {
            return BoolValue::Value(less != subtract);
        }
        return BoolValue::Error(error);
    }
    let compared = numeric_compare(make_numeric_value(value), boundary);
    if let Int4Value::Error(error) = compared {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_63_4: i32 = unresolved_flavor; if let Int4Value::Unknown = compared { if condition_flavor_63_4 < 1 { condition_flavor_63_4 = 1; }; }; if let Int4Value::Unimplemented = compared { condition_flavor_63_4 = 2; }; if (compared == Int4Value::Unknown || compared == Int4Value::Unimplemented) {
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
    let mut condition_flavor_108_4: i32 = unresolved_flavor; if let NumericValue::Unknown = value { if condition_flavor_108_4 < 1 { condition_flavor_108_4 = 1; }; }; if let NumericValue::Unimplemented = value { condition_flavor_108_4 = 2; }; if let NumericValue::Unknown = base { if condition_flavor_108_4 < 1 { condition_flavor_108_4 = 1; }; }; if let NumericValue::Unimplemented = base { condition_flavor_108_4 = 2; }; if let NumericValue::Unknown = offset { if condition_flavor_108_4 < 1 { condition_flavor_108_4 = 1; }; }; if let NumericValue::Unimplemented = offset { condition_flavor_108_4 = 2; }; if let BoolValue::Unknown = subtract { if condition_flavor_108_4 < 1 { condition_flavor_108_4 = 1; }; }; if let BoolValue::Unimplemented = subtract { condition_flavor_108_4 = 2; }; if let BoolValue::Unknown = less { if condition_flavor_108_4 < 1 { condition_flavor_108_4 = 1; }; }; if let BoolValue::Unimplemented = less { condition_flavor_108_4 = 2; }; if (value == NumericValue::Unknown || value == NumericValue::Unimplemented)
        || (base == NumericValue::Unknown || base == NumericValue::Unimplemented)
        || (offset == NumericValue::Unknown || offset == NumericValue::Unimplemented)
        || (subtract == BoolValue::Unknown || subtract == BoolValue::Unimplemented)
        || (less == BoolValue::Unknown || less == BoolValue::Unimplemented)
    {
        return bool_unresolved(condition_flavor_108_4);
    }
    if value == NumericValue::Null
        || base == NumericValue::Null
        || offset == NumericValue::Null
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
                            input.as_str(),
                            center.as_str(),
                            distance.as_str(),
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
