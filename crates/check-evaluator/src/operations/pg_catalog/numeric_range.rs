fn numeric_range_values(
    value: &str,
    base: &str,
    offset: &str,
    subtract: bool,
    less: bool,
) -> BoolValue {
    let input = numeric_parts(value);
    let center = numeric_parts(base);
    let distance = numeric_parts(offset);
    if input.valid == false || center.valid == false || distance.valid == false {
        return BoolValue::Unknown;
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
    if compared == Int4Value::Unknown {
        return BoolValue::Unknown;
    }
    if let Int4Value::Value(order) = compared {
        if less {
            return BoolValue::Value(order <= 0);
        }
        return BoolValue::Value(order >= 0);
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__in_range__fhht(
    value: NumericValue,
    base: NumericValue,
    offset: NumericValue,
    subtract: BoolValue,
    less: BoolValue,
) -> BoolValue {
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
    if value == NumericValue::Unknown
        || base == NumericValue::Unknown
        || offset == NumericValue::Unknown
        || subtract == BoolValue::Unknown
        || less == BoolValue::Unknown
    {
        return BoolValue::Unknown;
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
    BoolValue::Unknown
}
