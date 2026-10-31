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
    let unresolved_flavor: i32 = 0;
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
        TimestampValue::Value(base),
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
    bool_unresolved(unresolved_flavor)
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
    let mut unresolved_flavor: i32 = 0;
    if let IntervalValue::Unknown = value { unresolved_flavor = 1; };
    if let IntervalValue::Unknown = base { unresolved_flavor = 1; };
    if let IntervalValue::Unknown = offset { unresolved_flavor = 1; };
    if let BoolValue::Unknown = subtract { unresolved_flavor = 1; };
    if let BoolValue::Unknown = less { unresolved_flavor = 1; };
    if let IntervalValue::Unimplemented = value { unresolved_flavor = 2; };
    if let IntervalValue::Unimplemented = base { unresolved_flavor = 2; };
    if let IntervalValue::Unimplemented = offset { unresolved_flavor = 2; };
    if let BoolValue::Unimplemented = subtract { unresolved_flavor = 2; };
    if let BoolValue::Unimplemented = less { unresolved_flavor = 2; };
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
    let mut condition_flavor_144_4: i32 = unresolved_flavor; if let IntervalValue::Unknown = value { if condition_flavor_144_4 < 1 { condition_flavor_144_4 = 1; }; }; if let IntervalValue::Unimplemented = value { condition_flavor_144_4 = 2; }; if let IntervalValue::Unknown = base { if condition_flavor_144_4 < 1 { condition_flavor_144_4 = 1; }; }; if let IntervalValue::Unimplemented = base { condition_flavor_144_4 = 2; }; if let IntervalValue::Unknown = offset { if condition_flavor_144_4 < 1 { condition_flavor_144_4 = 1; }; }; if let IntervalValue::Unimplemented = offset { condition_flavor_144_4 = 2; }; if let BoolValue::Unknown = subtract { if condition_flavor_144_4 < 1 { condition_flavor_144_4 = 1; }; }; if let BoolValue::Unimplemented = subtract { condition_flavor_144_4 = 2; }; if let BoolValue::Unknown = less { if condition_flavor_144_4 < 1 { condition_flavor_144_4 = 1; }; }; if let BoolValue::Unimplemented = less { condition_flavor_144_4 = 2; }; if (value == IntervalValue::Unknown || value == IntervalValue::Unimplemented)
        || (base == IntervalValue::Unknown || base == IntervalValue::Unimplemented)
        || (offset == IntervalValue::Unknown || offset == IntervalValue::Unimplemented)
        || (subtract == BoolValue::Unknown || subtract == BoolValue::Unimplemented)
        || (less == BoolValue::Unknown || less == BoolValue::Unimplemented)
    {
        return bool_unresolved(condition_flavor_144_4);
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
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__in_range__bs2r(
    value: TimeValue,
    base: TimeValue,
    offset: IntervalValue,
    subtract: BoolValue,
    less: BoolValue,
) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimeValue::Unknown = value { unresolved_flavor = 1; };
    if let TimeValue::Unknown = base { unresolved_flavor = 1; };
    if let IntervalValue::Unknown = offset { unresolved_flavor = 1; };
    if let BoolValue::Unknown = subtract { unresolved_flavor = 1; };
    if let BoolValue::Unknown = less { unresolved_flavor = 1; };
    if let TimeValue::Unimplemented = value { unresolved_flavor = 2; };
    if let TimeValue::Unimplemented = base { unresolved_flavor = 2; };
    if let IntervalValue::Unimplemented = offset { unresolved_flavor = 2; };
    if let BoolValue::Unimplemented = subtract { unresolved_flavor = 2; };
    if let BoolValue::Unimplemented = less { unresolved_flavor = 2; };
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
    let mut condition_flavor_209_4: i32 = unresolved_flavor; if let TimeValue::Unknown = value { if condition_flavor_209_4 < 1 { condition_flavor_209_4 = 1; }; }; if let TimeValue::Unimplemented = value { condition_flavor_209_4 = 2; }; if let TimeValue::Unknown = base { if condition_flavor_209_4 < 1 { condition_flavor_209_4 = 1; }; }; if let TimeValue::Unimplemented = base { condition_flavor_209_4 = 2; }; if let IntervalValue::Unknown = offset { if condition_flavor_209_4 < 1 { condition_flavor_209_4 = 1; }; }; if let IntervalValue::Unimplemented = offset { condition_flavor_209_4 = 2; }; if let BoolValue::Unknown = subtract { if condition_flavor_209_4 < 1 { condition_flavor_209_4 = 1; }; }; if let BoolValue::Unimplemented = subtract { condition_flavor_209_4 = 2; }; if let BoolValue::Unknown = less { if condition_flavor_209_4 < 1 { condition_flavor_209_4 = 1; }; }; if let BoolValue::Unimplemented = less { condition_flavor_209_4 = 2; }; if (value == TimeValue::Unknown || value == TimeValue::Unimplemented)
        || (base == TimeValue::Unknown || base == TimeValue::Unimplemented)
        || (offset == IntervalValue::Unknown || offset == IntervalValue::Unimplemented)
        || (subtract == BoolValue::Unknown || subtract == BoolValue::Unimplemented)
        || (less == BoolValue::Unknown || less == BoolValue::Unimplemented)
    {
        return bool_unresolved(condition_flavor_209_4);
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
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__in_range__fn2k(
    value: TimestampValue,
    base: TimestampValue,
    offset: IntervalValue,
    subtract: BoolValue,
    less: BoolValue,
) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestampValue::Unknown = value { unresolved_flavor = 1; };
    if let TimestampValue::Unknown = base { unresolved_flavor = 1; };
    if let IntervalValue::Unknown = offset { unresolved_flavor = 1; };
    if let BoolValue::Unknown = subtract { unresolved_flavor = 1; };
    if let BoolValue::Unknown = less { unresolved_flavor = 1; };
    if let TimestampValue::Unimplemented = value { unresolved_flavor = 2; };
    if let TimestampValue::Unimplemented = base { unresolved_flavor = 2; };
    if let IntervalValue::Unimplemented = offset { unresolved_flavor = 2; };
    if let BoolValue::Unimplemented = subtract { unresolved_flavor = 2; };
    if let BoolValue::Unimplemented = less { unresolved_flavor = 2; };
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
    let mut condition_flavor_280_4: i32 = unresolved_flavor; if let TimestampValue::Unknown = value { if condition_flavor_280_4 < 1 { condition_flavor_280_4 = 1; }; }; if let TimestampValue::Unimplemented = value { condition_flavor_280_4 = 2; }; if let TimestampValue::Unknown = base { if condition_flavor_280_4 < 1 { condition_flavor_280_4 = 1; }; }; if let TimestampValue::Unimplemented = base { condition_flavor_280_4 = 2; }; if let IntervalValue::Unknown = offset { if condition_flavor_280_4 < 1 { condition_flavor_280_4 = 1; }; }; if let IntervalValue::Unimplemented = offset { condition_flavor_280_4 = 2; }; if let BoolValue::Unknown = subtract { if condition_flavor_280_4 < 1 { condition_flavor_280_4 = 1; }; }; if let BoolValue::Unimplemented = subtract { condition_flavor_280_4 = 2; }; if let BoolValue::Unknown = less { if condition_flavor_280_4 < 1 { condition_flavor_280_4 = 1; }; }; if let BoolValue::Unimplemented = less { condition_flavor_280_4 = 2; }; if (value == TimestampValue::Unknown || value == TimestampValue::Unimplemented)
        || (base == TimestampValue::Unknown || base == TimestampValue::Unimplemented)
        || (offset == IntervalValue::Unknown || offset == IntervalValue::Unimplemented)
        || (subtract == BoolValue::Unknown || subtract == BoolValue::Unimplemented)
        || (less == BoolValue::Unknown || less == BoolValue::Unimplemented)
    {
        return bool_unresolved(condition_flavor_280_4);
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
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__in_range__4yq8(
    value: DateValue,
    base: DateValue,
    offset: IntervalValue,
    subtract: BoolValue,
    less: BoolValue,
) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let DateValue::Unknown = value { unresolved_flavor = 1; };
    if let DateValue::Unknown = base { unresolved_flavor = 1; };
    if let IntervalValue::Unknown = offset { unresolved_flavor = 1; };
    if let BoolValue::Unknown = subtract { unresolved_flavor = 1; };
    if let BoolValue::Unknown = less { unresolved_flavor = 1; };
    if let DateValue::Unimplemented = value { unresolved_flavor = 2; };
    if let DateValue::Unimplemented = base { unresolved_flavor = 2; };
    if let IntervalValue::Unimplemented = offset { unresolved_flavor = 2; };
    if let BoolValue::Unimplemented = subtract { unresolved_flavor = 2; };
    if let BoolValue::Unimplemented = less { unresolved_flavor = 2; };
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
    let mut condition_flavor_345_4: i32 = unresolved_flavor; if let DateValue::Unknown = value { if condition_flavor_345_4 < 1 { condition_flavor_345_4 = 1; }; }; if let DateValue::Unimplemented = value { condition_flavor_345_4 = 2; }; if let DateValue::Unknown = base { if condition_flavor_345_4 < 1 { condition_flavor_345_4 = 1; }; }; if let DateValue::Unimplemented = base { condition_flavor_345_4 = 2; }; if let IntervalValue::Unknown = offset { if condition_flavor_345_4 < 1 { condition_flavor_345_4 = 1; }; }; if let IntervalValue::Unimplemented = offset { condition_flavor_345_4 = 2; }; if let BoolValue::Unknown = subtract { if condition_flavor_345_4 < 1 { condition_flavor_345_4 = 1; }; }; if let BoolValue::Unimplemented = subtract { condition_flavor_345_4 = 2; }; if let BoolValue::Unknown = less { if condition_flavor_345_4 < 1 { condition_flavor_345_4 = 1; }; }; if let BoolValue::Unimplemented = less { condition_flavor_345_4 = 2; }; if (value == DateValue::Unknown || value == DateValue::Unimplemented)
        || (base == DateValue::Unknown || base == DateValue::Unimplemented)
        || (offset == IntervalValue::Unknown || offset == IntervalValue::Unimplemented)
        || (subtract == BoolValue::Unknown || subtract == BoolValue::Unimplemented)
        || (less == BoolValue::Unknown || less == BoolValue::Unimplemented)
    {
        return bool_unresolved(condition_flavor_345_4);
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
    let mut unresolved_flavor: i32 = 0;
    if let TimetzValue::Unknown = value { unresolved_flavor = 1; };
    if let TimetzValue::Unknown = base { unresolved_flavor = 1; };
    if let IntervalValue::Unknown = offset { unresolved_flavor = 1; };
    if let BoolValue::Unknown = subtract { unresolved_flavor = 1; };
    if let BoolValue::Unknown = less { unresolved_flavor = 1; };
    if let TimetzValue::Unimplemented = value { unresolved_flavor = 2; };
    if let TimetzValue::Unimplemented = base { unresolved_flavor = 2; };
    if let IntervalValue::Unimplemented = offset { unresolved_flavor = 2; };
    if let BoolValue::Unimplemented = subtract { unresolved_flavor = 2; };
    if let BoolValue::Unimplemented = less { unresolved_flavor = 2; };
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
    let mut condition_flavor_399_4: i32 = unresolved_flavor; if let TimetzValue::Unknown = value { if condition_flavor_399_4 < 1 { condition_flavor_399_4 = 1; }; }; if let TimetzValue::Unimplemented = value { condition_flavor_399_4 = 2; }; if let TimetzValue::Unknown = base { if condition_flavor_399_4 < 1 { condition_flavor_399_4 = 1; }; }; if let TimetzValue::Unimplemented = base { condition_flavor_399_4 = 2; }; if let IntervalValue::Unknown = offset { if condition_flavor_399_4 < 1 { condition_flavor_399_4 = 1; }; }; if let IntervalValue::Unimplemented = offset { condition_flavor_399_4 = 2; }; if let BoolValue::Unknown = subtract { if condition_flavor_399_4 < 1 { condition_flavor_399_4 = 1; }; }; if let BoolValue::Unimplemented = subtract { condition_flavor_399_4 = 2; }; if let BoolValue::Unknown = less { if condition_flavor_399_4 < 1 { condition_flavor_399_4 = 1; }; }; if let BoolValue::Unimplemented = less { condition_flavor_399_4 = 2; }; if (value == TimetzValue::Unknown || value == TimetzValue::Unimplemented)
        || (base == TimetzValue::Unknown || base == TimetzValue::Unimplemented)
        || (offset == IntervalValue::Unknown || offset == IntervalValue::Unimplemented)
        || (subtract == BoolValue::Unknown || subtract == BoolValue::Unimplemented)
        || (less == BoolValue::Unknown || less == BoolValue::Unimplemented)
    {
        return bool_unresolved(condition_flavor_399_4);
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
    bool_unresolved(unresolved_flavor)
}
