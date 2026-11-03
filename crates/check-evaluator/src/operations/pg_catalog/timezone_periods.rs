pub fn sql__pg_catalog__in_range__o9l2(
    value: TimestamptzValue,
    base: TimestamptzValue,
    offset: IntervalValue,
    subtract: BoolValue,
    less: BoolValue,
    session: &str,
) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestamptzValue::Unknown = value { unresolved_flavor = 1; };
    if let TimestamptzValue::Unknown = base { unresolved_flavor = 1; };
    if let IntervalValue::Unknown = offset { unresolved_flavor = 1; };
    if let BoolValue::Unknown = subtract { unresolved_flavor = 1; };
    if let BoolValue::Unknown = less { unresolved_flavor = 1; };
    if let TimestamptzValue::Unimplemented = value { unresolved_flavor = 2; };
    if let TimestamptzValue::Unimplemented = base { unresolved_flavor = 2; };
    if let IntervalValue::Unimplemented = offset { unresolved_flavor = 2; };
    if let BoolValue::Unimplemented = subtract { unresolved_flavor = 2; };
    if let BoolValue::Unimplemented = less { unresolved_flavor = 2; };
    if let TimestamptzValue::Error(error) = value {
        return BoolValue::Error(error);
    };
    if let TimestamptzValue::Error(error) = base {
        return BoolValue::Error(error);
    };
    if let IntervalValue::Error(error) = offset {
        return BoolValue::Error(error);
    };
    if let BoolValue::Error(error) = subtract {
        return BoolValue::Error(error);
    };
    if let BoolValue::Error(error) = less {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_35_4: i32 = unresolved_flavor; if let TimestamptzValue::Unknown = value { if condition_flavor_35_4 < 1 { condition_flavor_35_4 = 1; }; }; if let TimestamptzValue::Unimplemented = value { condition_flavor_35_4 = 2; }; if let TimestamptzValue::Unknown = base { if condition_flavor_35_4 < 1 { condition_flavor_35_4 = 1; }; }; if let TimestamptzValue::Unimplemented = base { condition_flavor_35_4 = 2; }; if let IntervalValue::Unknown = offset { if condition_flavor_35_4 < 1 { condition_flavor_35_4 = 1; }; }; if let IntervalValue::Unimplemented = offset { condition_flavor_35_4 = 2; }; if let BoolValue::Unknown = subtract { if condition_flavor_35_4 < 1 { condition_flavor_35_4 = 1; }; }; if let BoolValue::Unimplemented = subtract { condition_flavor_35_4 = 2; }; if let BoolValue::Unknown = less { if condition_flavor_35_4 < 1 { condition_flavor_35_4 = 1; }; }; if let BoolValue::Unimplemented = less { condition_flavor_35_4 = 2; }; if (value == TimestamptzValue::Unknown || value == TimestamptzValue::Unimplemented)
        || (base == TimestamptzValue::Unknown || base == TimestamptzValue::Unimplemented)
        || (offset == IntervalValue::Unknown || offset == IntervalValue::Unimplemented)
        || (subtract == BoolValue::Unknown || subtract == BoolValue::Unimplemented)
        || (less == BoolValue::Unknown || less == BoolValue::Unimplemented)
    {
        return bool_unresolved(condition_flavor_35_4);
    };
    if value == TimestamptzValue::Null
        || base == TimestamptzValue::Null
        || offset == IntervalValue::Null
        || subtract == BoolValue::Null
        || less == BoolValue::Null
    {
        return BoolValue::Null;
    };
    if let TimestamptzValue::Value(input) = value {
        if let TimestamptzValue::Value(center) = base {
            if let IntervalValue::Value(distance) = offset {
                if let BoolValue::Value(backward) = subtract {
                    if let BoolValue::Value(lower) = less {
                        let zero = IntervalPayload {
                            months: 0,
                            days: 0,
                            time: 0i64,
                        };
                        if interval_order(distance, zero) < 0 {
                            return BoolValue::Error(make_sql_error(INTEGER_INVALID_FRAME_SIZE));
                        };
                        if interval_special(distance) > 0
                            && ((backward && center == 9223372036854775807i64)
                                || (backward == false && center == -9223372036854775808i64))
                        {
                            return make_bool_value(true);
                        };
                        let boundary = timezone_interval_add(base, offset, session, backward);
                        if let TimestamptzValue::Error(error) = boundary {
                            return BoolValue::Error(error);
                        };
                        let mut boundary_flavor: i32 = unresolved_flavor;
                        if let TimestamptzValue::Unknown = boundary { if boundary_flavor < 1 { boundary_flavor = 1; }; };
                        if let TimestamptzValue::Unimplemented = boundary { boundary_flavor = 2; };
                        if let TimestamptzValue::Value(point) = boundary {
                            if lower {
                                return make_bool_value(input <= point);
                            };
                            return make_bool_value(input >= point);
                        };
                        return bool_unresolved(boundary_flavor);
                    };
                };
            };
        };
    };
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__overlaps__4sap(
    a: TimestamptzValue,
    b: IntervalValue,
    c: TimestamptzValue,
    d: IntervalValue,
    session: &str,
) -> BoolValue {
    if let TimestamptzValue::Error(error) = a {
        return BoolValue::Error(error);
    };
    if let IntervalValue::Error(error) = b {
        return BoolValue::Error(error);
    };
    if let TimestamptzValue::Error(error) = c {
        return BoolValue::Error(error);
    };
    if let IntervalValue::Error(error) = d {
        return BoolValue::Error(error);
    };
    let first_end = timezone_interval_add(a, b, session, false);
    let second_end = timezone_interval_add(c, d, session, false);
    sql__pg_catalog__overlaps__xg7p(a, first_end, c, second_end)
}

pub fn sql__pg_catalog__overlaps__5qyz(
    a: TimestamptzValue,
    b: IntervalValue,
    c: TimestamptzValue,
    d: TimestamptzValue,
    session: &str,
) -> BoolValue {
    if let TimestamptzValue::Error(error) = a {
        return BoolValue::Error(error);
    };
    if let IntervalValue::Error(error) = b {
        return BoolValue::Error(error);
    };
    if let TimestamptzValue::Error(error) = c {
        return BoolValue::Error(error);
    };
    if let TimestamptzValue::Error(error) = d {
        return BoolValue::Error(error);
    };
    let first_end = timezone_interval_add(a, b, session, false);
    sql__pg_catalog__overlaps__xg7p(a, first_end, c, d)
}

pub fn sql__pg_catalog__overlaps__kgro(
    a: TimestamptzValue,
    b: TimestamptzValue,
    c: TimestamptzValue,
    d: IntervalValue,
    session: &str,
) -> BoolValue {
    if let TimestamptzValue::Error(error) = a {
        return BoolValue::Error(error);
    };
    if let TimestamptzValue::Error(error) = b {
        return BoolValue::Error(error);
    };
    if let TimestamptzValue::Error(error) = c {
        return BoolValue::Error(error);
    };
    if let IntervalValue::Error(error) = d {
        return BoolValue::Error(error);
    };
    let second_end = timezone_interval_add(c, d, session, false);
    sql__pg_catalog__overlaps__xg7p(a, b, c, second_end)
}
