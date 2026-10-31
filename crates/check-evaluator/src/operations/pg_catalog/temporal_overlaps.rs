#[derive(Clone, Copy)]
struct OverlapPoint {
    present: bool,
    time: i64,
    zone: i32,
}
fn overlap_missing_point() -> OverlapPoint {
    OverlapPoint {
        present: false,
        time: 0i64,
        zone: 0,
    }
}
fn overlap_point_order(left: OverlapPoint, right: OverlapPoint) -> i32 {
    let a = clock_wrapped_add(left.time, (left.zone as i64) * 1000000i64);
    let b = clock_wrapped_add(right.time, (right.zone as i64) * 1000000i64);
    let order = clock_order(a, b);
    if order != 0 {
        return order;
    };
    clock_order(left.zone as i64, right.zone as i64)
}
fn overlap_points(a: OverlapPoint, b: OverlapPoint, c: OverlapPoint, d: OverlapPoint) -> BoolValue {
    let mut first_start = a;
    let mut first_end = b;
    let mut second_start = c;
    let mut second_end = d;
    if first_start.present == false {
        if first_end.present == false {
            return BoolValue::Null;
        };
        first_start = first_end;
        first_end = overlap_missing_point();
    } else {
        if first_end.present && overlap_point_order(first_start, first_end) > 0 {
            let saved = first_start;
            first_start = first_end;
            first_end = saved;
        };
    };
    if second_start.present == false {
        if second_end.present == false {
            return BoolValue::Null;
        };
        second_start = second_end;
        second_end = overlap_missing_point();
    } else {
        if second_end.present && overlap_point_order(second_start, second_end) > 0 {
            let saved = second_start;
            second_start = second_end;
            second_end = saved;
        };
    };
    let order = overlap_point_order(first_start, second_start);
    if order > 0 {
        if second_end.present == false {
            return BoolValue::Null;
        };
        if overlap_point_order(first_start, second_end) < 0 {
            return make_bool_value(true);
        };
        if first_end.present == false {
            return BoolValue::Null;
        };
        return make_bool_value(false);
    };
    if order < 0 {
        if first_end.present == false {
            return BoolValue::Null;
        };
        if overlap_point_order(second_start, first_end) < 0 {
            return make_bool_value(true);
        };
        if second_end.present == false {
            return BoolValue::Null;
        };
        return make_bool_value(false);
    };
    if first_end.present == false || second_end.present == false {
        return BoolValue::Null;
    };
    make_bool_value(true)
}
fn overlap_time_point(input: TimeValue) -> OverlapPoint {
    if let TimeValue::Value(value) = input {
        return OverlapPoint {
            present: true,
            time: value,
            zone: 0,
        };
    };
    overlap_missing_point()
}
fn overlap_timetz_point(input: TimetzValue) -> OverlapPoint {
    if let TimetzValue::Value(value) = input {
        return OverlapPoint {
            present: true,
            time: value.time,
            zone: value.zone,
        };
    };
    overlap_missing_point()
}
fn overlap_timestamp_point(input: TimestampValue) -> OverlapPoint {
    if let TimestampValue::Value(value) = input {
        return OverlapPoint {
            present: true,
            time: value,
            zone: 0,
        };
    };
    overlap_missing_point()
}
fn overlap_timestamptz_point(input: TimestamptzValue) -> OverlapPoint {
    if let TimestamptzValue::Value(value) = input {
        return OverlapPoint {
            present: true,
            time: value,
            zone: 0,
        };
    };
    overlap_missing_point()
}
pub fn sql__pg_catalog__overlaps__twwm(
    a: TimeValue,
    b: IntervalValue,
    c: TimeValue,
    d: IntervalValue,
) -> BoolValue {
    if let TimeValue::Error(error) = a {
        return BoolValue::Error(error);
    };
    if let IntervalValue::Error(error) = b {
        return BoolValue::Error(error);
    };
    if let TimeValue::Error(error) = c {
        return BoolValue::Error(error);
    };
    if let IntervalValue::Error(error) = d {
        return BoolValue::Error(error);
    };
    let first_end = sql__pg_catalog__time_pl_interval__osxy(a, b);
    let second_end = sql__pg_catalog__time_pl_interval__osxy(c, d);
    sql__pg_catalog__overlaps__4anj(a, first_end, c, second_end)
}
pub fn sql__pg_catalog__overlaps__3ghm(
    a: TimeValue,
    b: IntervalValue,
    c: TimeValue,
    d: TimeValue,
) -> BoolValue {
    if let TimeValue::Error(error) = a {
        return BoolValue::Error(error);
    };
    if let IntervalValue::Error(error) = b {
        return BoolValue::Error(error);
    };
    if let TimeValue::Error(error) = c {
        return BoolValue::Error(error);
    };
    if let TimeValue::Error(error) = d {
        return BoolValue::Error(error);
    };
    let first_end = sql__pg_catalog__time_pl_interval__osxy(a, b);
    sql__pg_catalog__overlaps__4anj(a, first_end, c, d)
}
pub fn sql__pg_catalog__overlaps__mibh(
    a: TimeValue,
    b: TimeValue,
    c: TimeValue,
    d: IntervalValue,
) -> BoolValue {
    if let TimeValue::Error(error) = a {
        return BoolValue::Error(error);
    };
    if let TimeValue::Error(error) = b {
        return BoolValue::Error(error);
    };
    if let TimeValue::Error(error) = c {
        return BoolValue::Error(error);
    };
    if let IntervalValue::Error(error) = d {
        return BoolValue::Error(error);
    };
    let second_end = sql__pg_catalog__time_pl_interval__osxy(c, d);
    sql__pg_catalog__overlaps__4anj(a, b, c, second_end)
}
pub fn sql__pg_catalog__overlaps__4anj(
    a: TimeValue,
    b: TimeValue,
    c: TimeValue,
    d: TimeValue,
) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimeValue::Unknown = a { unresolved_flavor = 1; };
    if let TimeValue::Unknown = b { unresolved_flavor = 1; };
    if let TimeValue::Unknown = c { unresolved_flavor = 1; };
    if let TimeValue::Unknown = d { unresolved_flavor = 1; };
    if let TimeValue::Unimplemented = a { unresolved_flavor = 2; };
    if let TimeValue::Unimplemented = b { unresolved_flavor = 2; };
    if let TimeValue::Unimplemented = c { unresolved_flavor = 2; };
    if let TimeValue::Unimplemented = d { unresolved_flavor = 2; };
    if let TimeValue::Error(error) = a {
        return BoolValue::Error(error);
    };
    if let TimeValue::Error(error) = b {
        return BoolValue::Error(error);
    };
    if let TimeValue::Error(error) = c {
        return BoolValue::Error(error);
    };
    if let TimeValue::Error(error) = d {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_215_4: i32 = unresolved_flavor; if let TimeValue::Unknown = a { if condition_flavor_215_4 < 1 { condition_flavor_215_4 = 1; }; }; if let TimeValue::Unimplemented = a { condition_flavor_215_4 = 2; }; if let TimeValue::Unknown = b { if condition_flavor_215_4 < 1 { condition_flavor_215_4 = 1; }; }; if let TimeValue::Unimplemented = b { condition_flavor_215_4 = 2; }; if let TimeValue::Unknown = c { if condition_flavor_215_4 < 1 { condition_flavor_215_4 = 1; }; }; if let TimeValue::Unimplemented = c { condition_flavor_215_4 = 2; }; if let TimeValue::Unknown = d { if condition_flavor_215_4 < 1 { condition_flavor_215_4 = 1; }; }; if let TimeValue::Unimplemented = d { condition_flavor_215_4 = 2; }; if (a == TimeValue::Unknown || a == TimeValue::Unimplemented)
        || (b == TimeValue::Unknown || b == TimeValue::Unimplemented)
        || (c == TimeValue::Unknown || c == TimeValue::Unimplemented)
        || (d == TimeValue::Unknown || d == TimeValue::Unimplemented)
    {
        return bool_unresolved(condition_flavor_215_4);
    };
    let point_a = overlap_time_point(a);
    let point_b = overlap_time_point(b);
    let point_c = overlap_time_point(c);
    let point_d = overlap_time_point(d);
    overlap_points(point_a, point_b, point_c, point_d)
}
pub fn sql__pg_catalog__overlaps__id87(
    a: TimestampValue,
    b: IntervalValue,
    c: TimestampValue,
    d: IntervalValue,
) -> BoolValue {
    if let TimestampValue::Error(error) = a {
        return BoolValue::Error(error);
    };
    if let IntervalValue::Error(error) = b {
        return BoolValue::Error(error);
    };
    if let TimestampValue::Error(error) = c {
        return BoolValue::Error(error);
    };
    if let IntervalValue::Error(error) = d {
        return BoolValue::Error(error);
    };
    let first_end = sql__pg_catalog__timestamp_pl_interval__zi2i(a, b);
    let second_end = sql__pg_catalog__timestamp_pl_interval__zi2i(c, d);
    sql__pg_catalog__overlaps__cdbz(a, first_end, c, second_end)
}
pub fn sql__pg_catalog__overlaps__lgwe(
    a: TimestampValue,
    b: IntervalValue,
    c: TimestampValue,
    d: TimestampValue,
) -> BoolValue {
    if let TimestampValue::Error(error) = a {
        return BoolValue::Error(error);
    };
    if let IntervalValue::Error(error) = b {
        return BoolValue::Error(error);
    };
    if let TimestampValue::Error(error) = c {
        return BoolValue::Error(error);
    };
    if let TimestampValue::Error(error) = d {
        return BoolValue::Error(error);
    };
    let first_end = sql__pg_catalog__timestamp_pl_interval__zi2i(a, b);
    sql__pg_catalog__overlaps__cdbz(a, first_end, c, d)
}
pub fn sql__pg_catalog__overlaps__iwr2(
    a: TimestampValue,
    b: TimestampValue,
    c: TimestampValue,
    d: IntervalValue,
) -> BoolValue {
    if let TimestampValue::Error(error) = a {
        return BoolValue::Error(error);
    };
    if let TimestampValue::Error(error) = b {
        return BoolValue::Error(error);
    };
    if let TimestampValue::Error(error) = c {
        return BoolValue::Error(error);
    };
    if let IntervalValue::Error(error) = d {
        return BoolValue::Error(error);
    };
    let second_end = sql__pg_catalog__timestamp_pl_interval__zi2i(c, d);
    sql__pg_catalog__overlaps__cdbz(a, b, c, second_end)
}
pub fn sql__pg_catalog__overlaps__cdbz(
    a: TimestampValue,
    b: TimestampValue,
    c: TimestampValue,
    d: TimestampValue,
) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestampValue::Unknown = a { unresolved_flavor = 1; };
    if let TimestampValue::Unknown = b { unresolved_flavor = 1; };
    if let TimestampValue::Unknown = c { unresolved_flavor = 1; };
    if let TimestampValue::Unknown = d { unresolved_flavor = 1; };
    if let TimestampValue::Unimplemented = a { unresolved_flavor = 2; };
    if let TimestampValue::Unimplemented = b { unresolved_flavor = 2; };
    if let TimestampValue::Unimplemented = c { unresolved_flavor = 2; };
    if let TimestampValue::Unimplemented = d { unresolved_flavor = 2; };
    if let TimestampValue::Error(error) = a {
        return BoolValue::Error(error);
    };
    if let TimestampValue::Error(error) = b {
        return BoolValue::Error(error);
    };
    if let TimestampValue::Error(error) = c {
        return BoolValue::Error(error);
    };
    if let TimestampValue::Error(error) = d {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_319_4: i32 = unresolved_flavor; if let TimestampValue::Unknown = a { if condition_flavor_319_4 < 1 { condition_flavor_319_4 = 1; }; }; if let TimestampValue::Unimplemented = a { condition_flavor_319_4 = 2; }; if let TimestampValue::Unknown = b { if condition_flavor_319_4 < 1 { condition_flavor_319_4 = 1; }; }; if let TimestampValue::Unimplemented = b { condition_flavor_319_4 = 2; }; if let TimestampValue::Unknown = c { if condition_flavor_319_4 < 1 { condition_flavor_319_4 = 1; }; }; if let TimestampValue::Unimplemented = c { condition_flavor_319_4 = 2; }; if let TimestampValue::Unknown = d { if condition_flavor_319_4 < 1 { condition_flavor_319_4 = 1; }; }; if let TimestampValue::Unimplemented = d { condition_flavor_319_4 = 2; }; if (a == TimestampValue::Unknown || a == TimestampValue::Unimplemented)
        || (b == TimestampValue::Unknown || b == TimestampValue::Unimplemented)
        || (c == TimestampValue::Unknown || c == TimestampValue::Unimplemented)
        || (d == TimestampValue::Unknown || d == TimestampValue::Unimplemented)
    {
        return bool_unresolved(condition_flavor_319_4);
    };
    let point_a = overlap_timestamp_point(a);
    let point_b = overlap_timestamp_point(b);
    let point_c = overlap_timestamp_point(c);
    let point_d = overlap_timestamp_point(d);
    overlap_points(point_a, point_b, point_c, point_d)
}
pub fn sql__pg_catalog__overlaps__xg7p(
    a: TimestamptzValue,
    b: TimestamptzValue,
    c: TimestamptzValue,
    d: TimestamptzValue,
) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestamptzValue::Unknown = a { unresolved_flavor = 1; };
    if let TimestamptzValue::Unknown = b { unresolved_flavor = 1; };
    if let TimestamptzValue::Unknown = c { unresolved_flavor = 1; };
    if let TimestamptzValue::Unknown = d { unresolved_flavor = 1; };
    if let TimestamptzValue::Unimplemented = a { unresolved_flavor = 2; };
    if let TimestamptzValue::Unimplemented = b { unresolved_flavor = 2; };
    if let TimestamptzValue::Unimplemented = c { unresolved_flavor = 2; };
    if let TimestamptzValue::Unimplemented = d { unresolved_flavor = 2; };
    if let TimestamptzValue::Error(error) = a {
        return BoolValue::Error(error);
    };
    if let TimestamptzValue::Error(error) = b {
        return BoolValue::Error(error);
    };
    if let TimestamptzValue::Error(error) = c {
        return BoolValue::Error(error);
    };
    if let TimestamptzValue::Error(error) = d {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_359_4: i32 = unresolved_flavor; if let TimestamptzValue::Unknown = a { if condition_flavor_359_4 < 1 { condition_flavor_359_4 = 1; }; }; if let TimestamptzValue::Unimplemented = a { condition_flavor_359_4 = 2; }; if let TimestamptzValue::Unknown = b { if condition_flavor_359_4 < 1 { condition_flavor_359_4 = 1; }; }; if let TimestamptzValue::Unimplemented = b { condition_flavor_359_4 = 2; }; if let TimestamptzValue::Unknown = c { if condition_flavor_359_4 < 1 { condition_flavor_359_4 = 1; }; }; if let TimestamptzValue::Unimplemented = c { condition_flavor_359_4 = 2; }; if let TimestamptzValue::Unknown = d { if condition_flavor_359_4 < 1 { condition_flavor_359_4 = 1; }; }; if let TimestamptzValue::Unimplemented = d { condition_flavor_359_4 = 2; }; if (a == TimestamptzValue::Unknown || a == TimestamptzValue::Unimplemented)
        || (b == TimestamptzValue::Unknown || b == TimestamptzValue::Unimplemented)
        || (c == TimestamptzValue::Unknown || c == TimestamptzValue::Unimplemented)
        || (d == TimestamptzValue::Unknown || d == TimestamptzValue::Unimplemented)
    {
        return bool_unresolved(condition_flavor_359_4);
    };
    let point_a = overlap_timestamptz_point(a);
    let point_b = overlap_timestamptz_point(b);
    let point_c = overlap_timestamptz_point(c);
    let point_d = overlap_timestamptz_point(d);
    overlap_points(point_a, point_b, point_c, point_d)
}
pub fn sql__pg_catalog__overlaps__o9q5(
    a: TimetzValue,
    b: TimetzValue,
    c: TimetzValue,
    d: TimetzValue,
) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimetzValue::Unknown = a { unresolved_flavor = 1; };
    if let TimetzValue::Unknown = b { unresolved_flavor = 1; };
    if let TimetzValue::Unknown = c { unresolved_flavor = 1; };
    if let TimetzValue::Unknown = d { unresolved_flavor = 1; };
    if let TimetzValue::Unimplemented = a { unresolved_flavor = 2; };
    if let TimetzValue::Unimplemented = b { unresolved_flavor = 2; };
    if let TimetzValue::Unimplemented = c { unresolved_flavor = 2; };
    if let TimetzValue::Unimplemented = d { unresolved_flavor = 2; };
    if let TimetzValue::Error(error) = a {
        return BoolValue::Error(error);
    };
    if let TimetzValue::Error(error) = b {
        return BoolValue::Error(error);
    };
    if let TimetzValue::Error(error) = c {
        return BoolValue::Error(error);
    };
    if let TimetzValue::Error(error) = d {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_399_4: i32 = unresolved_flavor; if let TimetzValue::Unknown = a { if condition_flavor_399_4 < 1 { condition_flavor_399_4 = 1; }; }; if let TimetzValue::Unimplemented = a { condition_flavor_399_4 = 2; }; if let TimetzValue::Unknown = b { if condition_flavor_399_4 < 1 { condition_flavor_399_4 = 1; }; }; if let TimetzValue::Unimplemented = b { condition_flavor_399_4 = 2; }; if let TimetzValue::Unknown = c { if condition_flavor_399_4 < 1 { condition_flavor_399_4 = 1; }; }; if let TimetzValue::Unimplemented = c { condition_flavor_399_4 = 2; }; if let TimetzValue::Unknown = d { if condition_flavor_399_4 < 1 { condition_flavor_399_4 = 1; }; }; if let TimetzValue::Unimplemented = d { condition_flavor_399_4 = 2; }; if (a == TimetzValue::Unknown || a == TimetzValue::Unimplemented)
        || (b == TimetzValue::Unknown || b == TimetzValue::Unimplemented)
        || (c == TimetzValue::Unknown || c == TimetzValue::Unimplemented)
        || (d == TimetzValue::Unknown || d == TimetzValue::Unimplemented)
    {
        return bool_unresolved(condition_flavor_399_4);
    };
    let point_a = overlap_timetz_point(a);
    let point_b = overlap_timetz_point(b);
    let point_c = overlap_timetz_point(c);
    let point_d = overlap_timetz_point(d);
    overlap_points(point_a, point_b, point_c, point_d)
}
