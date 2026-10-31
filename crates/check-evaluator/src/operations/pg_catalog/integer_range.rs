const INTEGER_INVALID_FRAME_SIZE: u32 = 3452583;

fn integer_in_range(
    value: Int8Value,
    base: Int8Value,
    offset: Int8Value,
    subtract: BoolValue,
    less: BoolValue,
) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int8Value::Unknown = value { unresolved_flavor = 1; };
    if let Int8Value::Unknown = base { unresolved_flavor = 1; };
    if let Int8Value::Unknown = offset { unresolved_flavor = 1; };
    if let BoolValue::Unknown = subtract { unresolved_flavor = 1; };
    if let BoolValue::Unknown = less { unresolved_flavor = 1; };
    if let Int8Value::Unimplemented = value { unresolved_flavor = 2; };
    if let Int8Value::Unimplemented = base { unresolved_flavor = 2; };
    if let Int8Value::Unimplemented = offset { unresolved_flavor = 2; };
    if let BoolValue::Unimplemented = subtract { unresolved_flavor = 2; };
    if let BoolValue::Unimplemented = less { unresolved_flavor = 2; };
    if let Int8Value::Error(error) = value {
        return BoolValue::Error(error);
    }
    if let Int8Value::Error(error) = base {
        return BoolValue::Error(error);
    }
    if let Int8Value::Error(error) = offset {
        return BoolValue::Error(error);
    }
    if let BoolValue::Error(error) = subtract {
        return BoolValue::Error(error);
    }
    if let BoolValue::Error(error) = less {
        return BoolValue::Error(error);
    }
    if value == Int8Value::Null
        || base == Int8Value::Null
        || offset == Int8Value::Null
        || subtract == BoolValue::Null
        || less == BoolValue::Null
    {
        return BoolValue::Null;
    }
    let mut condition_flavor_44_4: i32 = unresolved_flavor; if let Int8Value::Unknown = value { if condition_flavor_44_4 < 1 { condition_flavor_44_4 = 1; }; }; if let Int8Value::Unimplemented = value { condition_flavor_44_4 = 2; }; if let Int8Value::Unknown = base { if condition_flavor_44_4 < 1 { condition_flavor_44_4 = 1; }; }; if let Int8Value::Unimplemented = base { condition_flavor_44_4 = 2; }; if let Int8Value::Unknown = offset { if condition_flavor_44_4 < 1 { condition_flavor_44_4 = 1; }; }; if let Int8Value::Unimplemented = offset { condition_flavor_44_4 = 2; }; if let BoolValue::Unknown = subtract { if condition_flavor_44_4 < 1 { condition_flavor_44_4 = 1; }; }; if let BoolValue::Unimplemented = subtract { condition_flavor_44_4 = 2; }; if let BoolValue::Unknown = less { if condition_flavor_44_4 < 1 { condition_flavor_44_4 = 1; }; }; if let BoolValue::Unimplemented = less { condition_flavor_44_4 = 2; }; if (value == Int8Value::Unknown || value == Int8Value::Unimplemented)
        || (base == Int8Value::Unknown || base == Int8Value::Unimplemented)
        || (offset == Int8Value::Unknown || offset == Int8Value::Unimplemented)
        || (subtract == BoolValue::Unknown || subtract == BoolValue::Unimplemented)
        || (less == BoolValue::Unknown || less == BoolValue::Unimplemented)
    {
        return bool_unresolved(condition_flavor_44_4);
    }
    if let Int8Value::Value(input) = value {
        if let Int8Value::Value(center) = base {
            if let Int8Value::Value(distance) = offset {
                if let BoolValue::Value(sub) = subtract {
                    if let BoolValue::Value(lower) = less {
                        if distance < 0i64 {
                            return BoolValue::Error(make_sql_error(INTEGER_INVALID_FRAME_SIZE));
                        }
                        if sub && center < -9223372036854775808i64 + distance {
                            return BoolValue::Value(lower == false);
                        }
                        if sub == false && center > 9223372036854775807i64 - distance {
                            return BoolValue::Value(lower);
                        }
                        let mut delta = distance;
                        if sub {
                            delta = 0i64 - distance;
                        }
                        let boundary = center + delta;
                        if lower {
                            return BoolValue::Value(input <= boundary);
                        }
                        return BoolValue::Value(input >= boundary);
                    }
                }
            }
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__in_range__l5vd(
    value: Int8Value,
    base: Int8Value,
    offset: Int8Value,
    subtract: BoolValue,
    less: BoolValue,
) -> BoolValue {
    let value_wide = value;
    let base_wide = base;
    let offset_wide = offset;
    integer_in_range(value_wide, base_wide, offset_wide, subtract, less)
}

pub fn sql__pg_catalog__in_range__el6v(
    value: Int4Value,
    base: Int4Value,
    offset: Int8Value,
    subtract: BoolValue,
    less: BoolValue,
) -> BoolValue {
    let value_wide = sql__pg_catalog__int8__mzac(value);
    let base_wide = sql__pg_catalog__int8__mzac(base);
    let offset_wide = offset;
    integer_in_range(value_wide, base_wide, offset_wide, subtract, less)
}

pub fn sql__pg_catalog__in_range__o7dg(
    value: Int4Value,
    base: Int4Value,
    offset: Int4Value,
    subtract: BoolValue,
    less: BoolValue,
) -> BoolValue {
    let value_wide = sql__pg_catalog__int8__mzac(value);
    let base_wide = sql__pg_catalog__int8__mzac(base);
    let offset_wide = sql__pg_catalog__int8__mzac(offset);
    integer_in_range(value_wide, base_wide, offset_wide, subtract, less)
}

pub fn sql__pg_catalog__in_range__mzmm(
    value: Int4Value,
    base: Int4Value,
    offset: Int2Value,
    subtract: BoolValue,
    less: BoolValue,
) -> BoolValue {
    let value_wide = sql__pg_catalog__int8__mzac(value);
    let base_wide = sql__pg_catalog__int8__mzac(base);
    let offset_wide = sql__pg_catalog__int8__sxtp(offset);
    integer_in_range(value_wide, base_wide, offset_wide, subtract, less)
}

pub fn sql__pg_catalog__in_range__c3nd(
    value: Int2Value,
    base: Int2Value,
    offset: Int8Value,
    subtract: BoolValue,
    less: BoolValue,
) -> BoolValue {
    let value_wide = sql__pg_catalog__int8__sxtp(value);
    let base_wide = sql__pg_catalog__int8__sxtp(base);
    let offset_wide = offset;
    integer_in_range(value_wide, base_wide, offset_wide, subtract, less)
}

pub fn sql__pg_catalog__in_range__vdmm(
    value: Int2Value,
    base: Int2Value,
    offset: Int4Value,
    subtract: BoolValue,
    less: BoolValue,
) -> BoolValue {
    let value_wide = sql__pg_catalog__int8__sxtp(value);
    let base_wide = sql__pg_catalog__int8__sxtp(base);
    let offset_wide = sql__pg_catalog__int8__mzac(offset);
    integer_in_range(value_wide, base_wide, offset_wide, subtract, less)
}

pub fn sql__pg_catalog__in_range__gcyn(
    value: Int2Value,
    base: Int2Value,
    offset: Int2Value,
    subtract: BoolValue,
    less: BoolValue,
) -> BoolValue {
    let value_wide = sql__pg_catalog__int8__sxtp(value);
    let base_wide = sql__pg_catalog__int8__sxtp(base);
    let offset_wide = sql__pg_catalog__int8__sxtp(offset);
    integer_in_range(value_wide, base_wide, offset_wide, subtract, less)
}
