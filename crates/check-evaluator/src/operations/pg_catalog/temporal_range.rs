fn temporal_range_finish(order: Int4Value, less: bool) -> BoolValue {
    if less {
        return value_order_finish(order, 3);
    };
    value_order_finish(order, 5)
}
fn temporal_range_clock_value(
    value: i64,
    value_zone: i32,
    base: i64,
    base_zone: i32,
    offset: i64,
    subtract: bool,
    less: bool,
) -> BoolValue {
    if offset < 0i64 {
        return BoolValue::Error(make_sql_error(INTEGER_INVALID_FRAME_SIZE));
    };
    let mut boundary = base;
    if subtract {
        boundary = base - offset;
    } else {
        if base > 9223372036854775807i64 - offset {
            return make_bool_value(less);
        };
        boundary = base + offset;
    };
    let a = clock_wrapped_add(value, (value_zone as i64) * 1000000i64);
    let b = clock_wrapped_add(boundary, (base_zone as i64) * 1000000i64);
    let mut order = clock_order(a, b);
    if order == 0 {
        order = clock_order(value_zone as i64, base_zone as i64);
    };
    if less {
        return make_bool_value(order <= 0);
    };
    make_bool_value(order >= 0)
}
fn temporal_range_timestamp_value(
    value: i64,
    base: i64,
    offset: IntervalPayload,
    subtract: bool,
    less: bool,
) -> BoolValue {
    let zero = IntervalPayload {
        months: 0,
        days: 0,
        time: 0i64,
    };
    if interval_order(offset, zero) < 0 {
        return BoolValue::Error(make_sql_error(INTEGER_INVALID_FRAME_SIZE));
    };
    if interval_special(offset) > 0
        && ((subtract && base == 9223372036854775807i64)
            || (subtract == false && base == (-9223372036854775808i64)))
    {
        return make_bool_value(true);
    };
    let boundary = interval_calendar_add(
        make_timestamp_value(base),
        make_interval_value(offset.months, offset.days, offset.time),
        subtract,
    );
    if let TimestampValue::Error(error) = boundary {
        return BoolValue::Error(error);
    };
    if let TimestampValue::Value(time) = boundary {
        let order = clock_order(value, time);
        if less {
            return make_bool_value(order <= 0);
        };
        return make_bool_value(order >= 0);
    };
    BoolValue::Unknown
}
fn temporal_range_interval_value(
    value: IntervalPayload,
    base: IntervalPayload,
    offset: IntervalPayload,
    subtract: bool,
    less: bool,
) -> BoolValue {
    let zero = IntervalPayload {
        months: 0,
        days: 0,
        time: 0i64,
    };
    if interval_order(offset, zero) < 0 {
        return BoolValue::Error(make_sql_error(INTEGER_INVALID_FRAME_SIZE));
    };
    let special = interval_special(base);
    if interval_special(offset) > 0
        && ((subtract && special > 0) || (subtract == false && special < 0))
    {
        return make_bool_value(true);
    };
    let boundary = interval_binary_value(
        make_interval_value(base.months, base.days, base.time),
        make_interval_value(offset.months, offset.days, offset.time),
        subtract,
    );
    let order = sql__pg_catalog__interval_cmp__swxt(
        make_interval_value(value.months, value.days, value.time),
        boundary,
    );
    temporal_range_finish(order, less)
}

pub fn sql__pg_catalog__in_range__f2o9(
    value: IntervalValue,
    base: IntervalValue,
    offset: IntervalValue,
    subtract: BoolValue,
    less: BoolValue,
) -> BoolValue {
    if let IntervalValue::Error(error) = value {
        return BoolValue::Error(error);
    };
    if let IntervalValue::Error(error) = base {
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
    if value == IntervalValue::Unknown
        || base == IntervalValue::Unknown
        || offset == IntervalValue::Unknown
        || subtract == BoolValue::Unknown
        || less == BoolValue::Unknown
    {
        return BoolValue::Unknown;
    };
    if value == IntervalValue::Null
        || base == IntervalValue::Null
        || offset == IntervalValue::Null
        || subtract == BoolValue::Null
        || less == BoolValue::Null
    {
        return BoolValue::Null;
    };
    if let IntervalValue::Value(input) = value {
        if let IntervalValue::Value(center) = base {
            if let IntervalValue::Value(distance) = offset {
                if let BoolValue::Value(backward) = subtract {
                    if let BoolValue::Value(lower) = less {
                        return temporal_range_interval_value(
                            input, center, distance, backward, lower,
                        );
                    };
                };
            };
        };
    };
    BoolValue::Unknown
}

pub fn sql__pg_catalog__in_range__bs2r(
    value: TimeValue,
    base: TimeValue,
    offset: IntervalValue,
    subtract: BoolValue,
    less: BoolValue,
) -> BoolValue {
    if let TimeValue::Error(error) = value {
        return BoolValue::Error(error);
    };
    if let TimeValue::Error(error) = base {
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
    if value == TimeValue::Unknown
        || base == TimeValue::Unknown
        || offset == IntervalValue::Unknown
        || subtract == BoolValue::Unknown
        || less == BoolValue::Unknown
    {
        return BoolValue::Unknown;
    };
    if value == TimeValue::Null
        || base == TimeValue::Null
        || offset == IntervalValue::Null
        || subtract == BoolValue::Null
        || less == BoolValue::Null
    {
        return BoolValue::Null;
    };
    if let TimeValue::Value(input) = value {
        if let TimeValue::Value(center) = base {
            if let IntervalValue::Value(distance) = offset {
                if let BoolValue::Value(backward) = subtract {
                    if let BoolValue::Value(lower) = less {
                        return temporal_range_clock_value(
                            input,
                            0,
                            center,
                            0,
                            distance.time,
                            backward,
                            lower,
                        );
                    };
                };
            };
        };
    };
    BoolValue::Unknown
}

pub fn sql__pg_catalog__in_range__fn2k(
    value: TimestampValue,
    base: TimestampValue,
    offset: IntervalValue,
    subtract: BoolValue,
    less: BoolValue,
) -> BoolValue {
    if let TimestampValue::Error(error) = value {
        return BoolValue::Error(error);
    };
    if let TimestampValue::Error(error) = base {
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
    if value == TimestampValue::Unknown
        || base == TimestampValue::Unknown
        || offset == IntervalValue::Unknown
        || subtract == BoolValue::Unknown
        || less == BoolValue::Unknown
    {
        return BoolValue::Unknown;
    };
    if value == TimestampValue::Null
        || base == TimestampValue::Null
        || offset == IntervalValue::Null
        || subtract == BoolValue::Null
        || less == BoolValue::Null
    {
        return BoolValue::Null;
    };
    if let TimestampValue::Value(input) = value {
        if let TimestampValue::Value(center) = base {
            if let IntervalValue::Value(distance) = offset {
                if let BoolValue::Value(backward) = subtract {
                    if let BoolValue::Value(lower) = less {
                        return temporal_range_timestamp_value(
                            input, center, distance, backward, lower,
                        );
                    };
                };
            };
        };
    };
    BoolValue::Unknown
}

pub fn sql__pg_catalog__in_range__4yq8(
    value: DateValue,
    base: DateValue,
    offset: IntervalValue,
    subtract: BoolValue,
    less: BoolValue,
) -> BoolValue {
    if let DateValue::Error(error) = value {
        return BoolValue::Error(error);
    };
    if let DateValue::Error(error) = base {
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
    if value == DateValue::Unknown
        || base == DateValue::Unknown
        || offset == IntervalValue::Unknown
        || subtract == BoolValue::Unknown
        || less == BoolValue::Unknown
    {
        return BoolValue::Unknown;
    };
    if value == DateValue::Null
        || base == DateValue::Null
        || offset == IntervalValue::Null
        || subtract == BoolValue::Null
        || less == BoolValue::Null
    {
        return BoolValue::Null;
    };
    let value_time = sql__pg_catalog__timestamp__swxj(value);
    let base_time = sql__pg_catalog__timestamp__swxj(base);
    sql__pg_catalog__in_range__fn2k(value_time, base_time, offset, subtract, less)
}

pub fn sql__pg_catalog__in_range__6ce3(
    value: TimetzValue,
    base: TimetzValue,
    offset: IntervalValue,
    subtract: BoolValue,
    less: BoolValue,
) -> BoolValue {
    if let TimetzValue::Error(error) = value {
        return BoolValue::Error(error);
    };
    if let TimetzValue::Error(error) = base {
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
    if value == TimetzValue::Unknown
        || base == TimetzValue::Unknown
        || offset == IntervalValue::Unknown
        || subtract == BoolValue::Unknown
        || less == BoolValue::Unknown
    {
        return BoolValue::Unknown;
    };
    if value == TimetzValue::Null
        || base == TimetzValue::Null
        || offset == IntervalValue::Null
        || subtract == BoolValue::Null
        || less == BoolValue::Null
    {
        return BoolValue::Null;
    };
    if let TimetzValue::Value(input) = value {
        if let TimetzValue::Value(center) = base {
            if let IntervalValue::Value(distance) = offset {
                if let BoolValue::Value(backward) = subtract {
                    if let BoolValue::Value(lower) = less {
                        return temporal_range_clock_value(
                            input.time,
                            input.zone,
                            center.time,
                            center.zone,
                            distance.time,
                            backward,
                            lower,
                        );
                    };
                };
            };
        };
    };
    BoolValue::Unknown
}
