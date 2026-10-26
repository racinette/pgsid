pub fn sql__pg_catalog__in_range__o9l2(
    value: TimestamptzValue,
    base: TimestamptzValue,
    offset: IntervalValue,
    subtract: BoolValue,
    less: BoolValue,
    session: &str,
) -> BoolValue {
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
    if value == TimestamptzValue::Unknown
        || base == TimestamptzValue::Unknown
        || offset == IntervalValue::Unknown
        || subtract == BoolValue::Unknown
        || less == BoolValue::Unknown
    {
        return BoolValue::Unknown;
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
                        if let TimestamptzValue::Value(point) = boundary {
                            if lower {
                                return make_bool_value(input <= point);
                            };
                            return make_bool_value(input >= point);
                        };
                    };
                };
            };
        };
    };
    BoolValue::Unknown
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
