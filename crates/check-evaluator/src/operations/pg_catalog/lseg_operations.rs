fn segment_pair_status(left: LsegValue, right: LsegValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let LsegValue::Unknown = left { unresolved_flavor = 1; };
    if let LsegValue::Unknown = right { unresolved_flavor = 1; };
    if let LsegValue::Unimplemented = left { unresolved_flavor = 2; };
    if let LsegValue::Unimplemented = right { unresolved_flavor = 2; };
    if let LsegValue::Error(error) = left {
        return BoolValue::Error(error);
    };
    if let LsegValue::Error(error) = right {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_13_4: i32 = unresolved_flavor; if let LsegValue::Unknown = left { if condition_flavor_13_4 < 1 { condition_flavor_13_4 = 1; }; }; if let LsegValue::Unimplemented = left { condition_flavor_13_4 = 2; }; if let LsegValue::Unknown = right { if condition_flavor_13_4 < 1 { condition_flavor_13_4 = 1; }; }; if let LsegValue::Unimplemented = right { condition_flavor_13_4 = 2; }; if (left == LsegValue::Unknown || left == LsegValue::Unimplemented) || (right == LsegValue::Unknown || right == LsegValue::Unimplemented) {
        return bool_unresolved(condition_flavor_13_4);
    };
    if left == LsegValue::Null || right == LsegValue::Null {
        return BoolValue::Null;
    };
    make_bool_value(true)
}
fn segment_line_status(segment: LsegValue, line: LineValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let LsegValue::Unknown = segment { unresolved_flavor = 1; };
    if let LineValue::Unknown = line { unresolved_flavor = 1; };
    if let LsegValue::Unimplemented = segment { unresolved_flavor = 2; };
    if let LineValue::Unimplemented = line { unresolved_flavor = 2; };
    if let LsegValue::Error(error) = segment {
        return BoolValue::Error(error);
    };
    if let LineValue::Error(error) = line {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_33_4: i32 = unresolved_flavor; if let LsegValue::Unknown = segment { if condition_flavor_33_4 < 1 { condition_flavor_33_4 = 1; }; }; if let LsegValue::Unimplemented = segment { condition_flavor_33_4 = 2; }; if let LineValue::Unknown = line { if condition_flavor_33_4 < 1 { condition_flavor_33_4 = 1; }; }; if let LineValue::Unimplemented = line { condition_flavor_33_4 = 2; }; if (segment == LsegValue::Unknown || segment == LsegValue::Unimplemented) || (line == LineValue::Unknown || line == LineValue::Unimplemented) {
        return bool_unresolved(condition_flavor_33_4);
    };
    if segment == LsegValue::Null || line == LineValue::Null {
        return BoolValue::Null;
    };
    make_bool_value(true)
}
fn segment_point_status(segment: LsegValue, point: PointValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let LsegValue::Unknown = segment { unresolved_flavor = 1; };
    if let PointValue::Unknown = point { unresolved_flavor = 1; };
    if let LsegValue::Unimplemented = segment { unresolved_flavor = 2; };
    if let PointValue::Unimplemented = point { unresolved_flavor = 2; };
    if let LsegValue::Error(error) = segment {
        return BoolValue::Error(error);
    };
    if let PointValue::Error(error) = point {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_53_4: i32 = unresolved_flavor; if let LsegValue::Unknown = segment { if condition_flavor_53_4 < 1 { condition_flavor_53_4 = 1; }; }; if let LsegValue::Unimplemented = segment { condition_flavor_53_4 = 2; }; if let PointValue::Unknown = point { if condition_flavor_53_4 < 1 { condition_flavor_53_4 = 1; }; }; if let PointValue::Unimplemented = point { condition_flavor_53_4 = 2; }; if (segment == LsegValue::Unknown || segment == LsegValue::Unimplemented) || (point == PointValue::Unknown || point == PointValue::Unimplemented) {
        return bool_unresolved(condition_flavor_53_4);
    };
    if segment == LsegValue::Null || point == PointValue::Null {
        return BoolValue::Null;
    };
    make_bool_value(true)
}
fn segment_point_from_status(status: BoolValue) -> PointValue {
    let mut unresolved_flavor: i32 = 0;
    if let BoolValue::Unknown = status { unresolved_flavor = 1; };
    if let BoolValue::Unimplemented = status { unresolved_flavor = 2; };
    if let BoolValue::Error(error) = status {
        return PointValue::Error(error);
    };
    if status == BoolValue::Null {
        return PointValue::Null;
    };
    point_unresolved(unresolved_flavor)
}
fn segment_float_from_status(status: BoolValue) -> Float8Value {
    let mut unresolved_flavor: i32 = 0;
    if let BoolValue::Unknown = status { unresolved_flavor = 1; };
    if let BoolValue::Unimplemented = status { unresolved_flavor = 2; };
    if let BoolValue::Error(error) = status {
        return Float8Value::Error(error);
    };
    if status == BoolValue::Null {
        return Float8Value::Null;
    };
    float8_unresolved(unresolved_flavor)
}
fn segment_raw_relation(left: Float8Value, right: Float8Value, equal: bool) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Float8Value::Unknown = left { unresolved_flavor = 1; };
    if let Float8Value::UnspecifiedNan = left { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let Float8Value::Unknown = right { unresolved_flavor = 1; };
    if let Float8Value::UnspecifiedNan = right { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let Float8Value::Unimplemented = left { unresolved_flavor = 2; };
    if let Float8Value::Unimplemented = right { unresolved_flavor = 2; };
    if let Float8Value::Error(error) = left {
        return BoolValue::Error(error);
    };
    if let Float8Value::Error(error) = right {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_97_4: i32 = unresolved_flavor; if let Float8Value::Unknown = left { if condition_flavor_97_4 < 1 { condition_flavor_97_4 = 1; }; }; if let Float8Value::Unimplemented = left { condition_flavor_97_4 = 2; }; if let Float8Value::Unknown = right { if condition_flavor_97_4 < 1 { condition_flavor_97_4 = 1; }; }; if let Float8Value::Unimplemented = right { condition_flavor_97_4 = 2; }; if (left == Float8Value::Unknown || left == Float8Value::Unimplemented) || (right == Float8Value::Unknown || right == Float8Value::Unimplemented) {
        return bool_unresolved(condition_flavor_97_4);
    };
    if left == Float8Value::Null || right == Float8Value::Null {
        return BoolValue::Null;
    };
    let first = float8_semantic(left);
    let second = float8_semantic(right);
    if let Float8Value::Value(a) = first {
        if let Float8Value::Value(b) = second {
            if equal {
                return make_bool_value(float8_number(a) == float8_number(b));
            };
            return make_bool_value(float8_number(a) < float8_number(b));
        };
    };
    let mut local_flavor_113_4: i32 = unresolved_flavor; if let Float8Value::Unknown = second { if local_flavor_113_4 < 1 { local_flavor_113_4 = 1; }; }; if let Float8Value::Unimplemented = second { local_flavor_113_4 = 2; }; if let Float8Value::Unknown = first { if local_flavor_113_4 < 1 { local_flavor_113_4 = 1; }; }; if let Float8Value::Unimplemented = first { local_flavor_113_4 = 2; }; bool_unresolved(local_flavor_113_4)
}
fn segment_contains_point(segment: LsegValue, point: PointValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let LsegValue::Unknown = segment { unresolved_flavor = 1; };
    if let PointValue::Unknown = point { unresolved_flavor = 1; };
    if let LsegValue::Unimplemented = segment { unresolved_flavor = 2; };
    if let PointValue::Unimplemented = point { unresolved_flavor = 2; };
    let status = segment_point_status(segment, point);
    if status != BoolValue::Value(true) {
        return status;
    };
    let first = sql__pg_catalog__point_distance__2haq(point, lseg_endpoint(segment, false));
    if let Float8Value::Error(error) = first {
        return BoolValue::Error(error);
    };
    let second = sql__pg_catalog__point_distance__2haq(point, lseg_endpoint(segment, true));
    if let Float8Value::Error(error) = second {
        return BoolValue::Error(error);
    };
    let length = lseg_length_value(segment);
    if let Float8Value::Error(error) = length {
        return BoolValue::Error(error);
    };
    let a = float8_semantic(first);
    let b = float8_semantic(second);
    let c = float8_semantic(length);
    if let Float8Value::Value(x) = a {
        if let Float8Value::Value(y) = b {
            if let Float8Value::Value(z) = c {
                let sum = float8_number(x) + float8_number(y);
                return make_bool_value(geometric_coordinate_equal(sum, float8_number(z)));
            };
        };
    };
    let mut local_flavor_148_4: i32 = unresolved_flavor; if let Float8Value::Unknown = c { if local_flavor_148_4 < 1 { local_flavor_148_4 = 1; }; }; if let Float8Value::Unimplemented = c { local_flavor_148_4 = 2; }; if let Float8Value::Unknown = b { if local_flavor_148_4 < 1 { local_flavor_148_4 = 1; }; }; if let Float8Value::Unimplemented = b { local_flavor_148_4 = 2; }; if let Float8Value::Unknown = a { if local_flavor_148_4 < 1 { local_flavor_148_4 = 1; }; }; if let Float8Value::Unimplemented = a { local_flavor_148_4 = 2; }; if let Float8Value::Unknown = length { if local_flavor_148_4 < 1 { local_flavor_148_4 = 1; }; }; if let Float8Value::Unimplemented = length { local_flavor_148_4 = 2; }; if let Float8Value::Unknown = second { if local_flavor_148_4 < 1 { local_flavor_148_4 = 1; }; }; if let Float8Value::Unimplemented = second { local_flavor_148_4 = 2; }; if let Float8Value::Unknown = first { if local_flavor_148_4 < 1 { local_flavor_148_4 = 1; }; }; if let Float8Value::Unimplemented = first { local_flavor_148_4 = 2; }; if let BoolValue::Unknown = status { if local_flavor_148_4 < 1 { local_flavor_148_4 = 1; }; }; if let BoolValue::Unimplemented = status { local_flavor_148_4 = 2; }; bool_unresolved(local_flavor_148_4)
}
fn segment_promote_line(segment: LsegValue) -> LineValue {
    let mut unresolved_flavor: i32 = 0;
    if let LsegValue::Unknown = segment { unresolved_flavor = 1; };
    if let LsegValue::Unimplemented = segment { unresolved_flavor = 2; };
    if let LsegValue::Error(error) = segment {
        return LineValue::Error(error);
    };
    if segment == LsegValue::Null {
        return LineValue::Null;
    };
    let first = lseg_endpoint(segment, false);
    if let PointValue::Value(origin) = first {
        return line_from_origin_slope(origin, lseg_slope(segment, false));
    };
    let mut local_flavor_164_4: i32 = unresolved_flavor; if let PointValue::Unknown = first { if local_flavor_164_4 < 1 { local_flavor_164_4 = 1; }; }; if let PointValue::Unimplemented = first { local_flavor_164_4 = 2; }; line_unresolved(local_flavor_164_4)
}
fn segment_line_intersection(segment: LsegValue, line: LineValue) -> PointValue {
    let status = segment_line_status(segment, line);
    if status != BoolValue::Value(true) {
        return segment_point_from_status(status);
    };
    let intersection = line_intersection(segment_promote_line(segment), line);
    if let PointValue::Error(error) = intersection {
        return PointValue::Error(error);
    };
    if intersection == PointValue::Null || (intersection == PointValue::Unknown || intersection == PointValue::Unimplemented) {
        return intersection;
    };
    let contains = segment_contains_point(segment, intersection);
    if contains == BoolValue::Value(false) {
        return PointValue::Null;
    };
    if contains != BoolValue::Value(true) {
        return segment_point_from_status(contains);
    };
    let first = lseg_endpoint(segment, false);
    let second = lseg_endpoint(segment, true);
    if sql__pg_catalog__point_eq__5be0(first, intersection) == BoolValue::Value(true) {
        return first;
    };
    if sql__pg_catalog__point_eq__5be0(second, intersection) == BoolValue::Value(true) {
        return second;
    };
    intersection
}
fn segment_intersection(left: LsegValue, right: LsegValue) -> PointValue {
    let status = segment_pair_status(left, right);
    if status != BoolValue::Value(true) {
        return segment_point_from_status(status);
    };
    let intersection = segment_line_intersection(left, segment_promote_line(right));
    if let PointValue::Error(error) = intersection {
        return PointValue::Error(error);
    };
    if intersection == PointValue::Null || (intersection == PointValue::Unknown || intersection == PointValue::Unimplemented) {
        return intersection;
    };
    let contains = segment_contains_point(right, intersection);
    if contains == BoolValue::Value(false) {
        return PointValue::Null;
    };
    if contains != BoolValue::Value(true) {
        return segment_point_from_status(contains);
    };
    intersection
}
fn segment_intersection_result(point: PointValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let PointValue::Unknown = point { unresolved_flavor = 1; };
    if let PointValue::Unimplemented = point { unresolved_flavor = 2; };
    if let PointValue::Error(error) = point {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_223_4: i32 = unresolved_flavor; if let PointValue::Unknown = point { if condition_flavor_223_4 < 1 { condition_flavor_223_4 = 1; }; }; if let PointValue::Unimplemented = point { condition_flavor_223_4 = 2; }; if point == PointValue::Unknown || point == PointValue::Unimplemented {
        return bool_unresolved(condition_flavor_223_4);
    };
    make_bool_value(point != PointValue::Null)
}
#[derive(Clone, Copy)]
struct SegmentClosest {
    point: PointValue,
    distance: Float8Value,
}
fn segment_closest_from_status(status: BoolValue) -> SegmentClosest {
    SegmentClosest {
        point: segment_point_from_status(status),
        distance: segment_float_from_status(status),
    }
}
fn segment_closest_error(distance: Float8Value) -> SegmentClosest {
    if let Float8Value::Error(error) = distance {
        return SegmentClosest {
            point: PointValue::Error(error),
            distance: distance,
        };
    };
    SegmentClosest {
        point: PointValue::Unknown,
        distance: distance,
    }
}
fn segment_project_line(segment: LsegValue, line: LineValue) -> SegmentClosest {
    let status = segment_line_status(segment, line);
    if status != BoolValue::Value(true) {
        return segment_closest_from_status(status);
    };
    let intersection = segment_line_intersection(segment, line);
    if let PointValue::Error(error) = intersection {
        return segment_closest_from_status(BoolValue::Error(error));
    };
    if intersection == PointValue::Unknown || intersection == PointValue::Unimplemented {
        let mut tested_flavor: i32 = 1;
        if intersection == PointValue::Unimplemented {
            tested_flavor = 2;
        };
        return segment_closest_from_status(bool_unresolved(tested_flavor));
    };
    if intersection != PointValue::Null {
        return SegmentClosest {
            point: intersection,
            distance: make_float8_bits(0i64),
        };
    };
    let first = lseg_endpoint(segment, false);
    let second = lseg_endpoint(segment, true);
    let first_projection = line_project_point(first, line);
    let a = first_projection.distance;
    if let Float8Value::Error(error) = a {
        return segment_closest_error(Float8Value::Error(error));
    };
    let second_projection = line_project_point(second, line);
    let b = second_projection.distance;
    if let Float8Value::Error(error) = b {
        return segment_closest_error(Float8Value::Error(error));
    };
    let comparison = segment_raw_relation(a, b, false);
    if comparison == BoolValue::Value(true) {
        return SegmentClosest {
            point: first,
            distance: a,
        };
    };
    if comparison == BoolValue::Value(false) {
        return SegmentClosest {
            point: second,
            distance: b,
        };
    };
    segment_closest_from_status(comparison)
}
fn segment_project_point(segment: LsegValue, point: PointValue) -> SegmentClosest {
    let status = segment_point_status(segment, point);
    if status != BoolValue::Value(true) {
        return segment_closest_from_status(status);
    };
    if let PointValue::Value(origin) = point {
        let perpendicular = line_from_origin_slope(origin, lseg_slope(segment, true));
        let closest = segment_project_line(segment, perpendicular);
        let distance = closest.distance;
        if let Float8Value::Error(error) = distance {
            return segment_closest_error(Float8Value::Error(error));
        };
        if distance == Float8Value::Unknown || distance == Float8Value::Unimplemented {
            return segment_closest_error(distance);
        };
        return SegmentClosest {
            point: closest.point,
            distance: sql__pg_catalog__point_distance__2haq(closest.point, point),
        };
    };
    segment_closest_from_status(BoolValue::Unknown)
}
fn segment_choose_closer(current: SegmentClosest, candidate: SegmentClosest) -> SegmentClosest {
    let comparison = sql__pg_catalog__float8lt__vp07(candidate.distance, current.distance);
    if comparison == BoolValue::Value(true) {
        return candidate;
    };
    if comparison == BoolValue::Value(false) {
        return current;
    };
    segment_closest_from_status(comparison)
}
fn segment_nearest_pair(left: LsegValue, right: LsegValue) -> SegmentClosest {
    let status = segment_pair_status(left, right);
    if status != BoolValue::Value(true) {
        return segment_closest_from_status(status);
    };
    let intersection = segment_intersection(left, right);
    if let PointValue::Error(error) = intersection {
        return segment_closest_from_status(BoolValue::Error(error));
    };
    if intersection == PointValue::Unknown || intersection == PointValue::Unimplemented {
        let mut tested_flavor: i32 = 1;
        if intersection == PointValue::Unimplemented {
            tested_flavor = 2;
        };
        return segment_closest_from_status(bool_unresolved(tested_flavor));
    };
    if intersection != PointValue::Null {
        return SegmentClosest {
            point: intersection,
            distance: make_float8_bits(0i64),
        };
    };
    let first = segment_project_point(left, lseg_endpoint(right, false));
    let first_distance = first.distance;
    if let Float8Value::Error(error) = first_distance {
        return segment_closest_error(Float8Value::Error(error));
    };
    let second = segment_project_point(left, lseg_endpoint(right, true));
    let mut closest = segment_choose_closer(first, second);
    let second_distance = closest.distance;
    if let Float8Value::Error(error) = second_distance {
        return segment_closest_error(Float8Value::Error(error));
    };
    let left_first = lseg_endpoint(left, false);
    let third = segment_project_point(right, left_first);
    closest = segment_choose_closer(
        closest,
        SegmentClosest {
            point: left_first,
            distance: third.distance,
        },
    );
    let third_distance = closest.distance;
    if let Float8Value::Error(error) = third_distance {
        return segment_closest_error(Float8Value::Error(error));
    };
    let left_second = lseg_endpoint(left, true);
    let fourth = segment_project_point(right, left_second);
    segment_choose_closer(
        closest,
        SegmentClosest {
            point: left_second,
            distance: fourth.distance,
        },
    )
}
fn segment_closest_point(closest: SegmentClosest) -> PointValue {
    let unresolved_flavor: i32 = 0;
    let distance = closest.distance;
    if let Float8Value::Error(error) = distance {
        return PointValue::Error(error);
    };
    let mut condition_flavor_386_4: i32 = unresolved_flavor; if let Float8Value::Unknown = distance { if condition_flavor_386_4 < 1 { condition_flavor_386_4 = 1; }; }; if let Float8Value::Unimplemented = distance { condition_flavor_386_4 = 2; }; if distance == Float8Value::Unknown || distance == Float8Value::Unimplemented {
        return point_unresolved(condition_flavor_386_4);
    };
    if distance == Float8Value::Null {
        return PointValue::Null;
    };
    let semantic = float8_semantic(distance);
    if let Float8Value::Value(bits) = semantic {
        let number = float8_number(bits);
        if number != number {
            return PointValue::Null;
        };
    };
    closest.point
}
fn segment_line_slope(input: LineValue) -> Float8Value {
    let mut unresolved_flavor: i32 = 0;
    if let LineValue::Unknown = input { unresolved_flavor = 1; };
    if let LineValue::Unimplemented = input { unresolved_flavor = 2; };
    if let LineValue::Error(error) = input {
        return Float8Value::Error(error);
    };
    if input == LineValue::Null {
        return Float8Value::Null;
    };
    if let LineValue::Value(value) = input {
        if float8_number(value.a).abs() <= 0.000001f64 {
            return make_float8_bits(0i64);
        };
        if float8_number(value.b).abs() <= 0.000001f64 {
            return make_float8_bits(9218868437227405312i64);
        };
        return sql__pg_catalog__float8div__kumj(
            line_coefficient(value, 0),
            sql__pg_catalog__float8um__3uy5(line_coefficient(value, 1)),
        );
    };
    float8_unresolved(unresolved_flavor)
}
pub fn sql__pg_catalog__lseg_interpt__8i53(left: LsegValue, right: LsegValue) -> PointValue {
    segment_intersection(left, right)
}
pub fn sql__pg_catalog__lseg_intersect__ovab(left: LsegValue, right: LsegValue) -> BoolValue {
    let status = segment_pair_status(left, right);
    if status != BoolValue::Value(true) {
        return status;
    };
    segment_intersection_result(segment_intersection(left, right))
}
pub fn sql__pg_catalog__inter_sl__g0cl(segment: LsegValue, line: LineValue) -> BoolValue {
    let status = segment_line_status(segment, line);
    if status != BoolValue::Value(true) {
        return status;
    };
    segment_intersection_result(segment_line_intersection(segment, line))
}
pub fn sql__pg_catalog__on_ps__j4bf(point: PointValue, segment: LsegValue) -> BoolValue {
    if let PointValue::Error(error) = point {
        return BoolValue::Error(error);
    };
    segment_contains_point(segment, point)
}
pub fn sql__pg_catalog__on_sl__l1ny(segment: LsegValue, line: LineValue) -> BoolValue {
    let status = segment_line_status(segment, line);
    if status != BoolValue::Value(true) {
        return status;
    };
    let first = sql__pg_catalog__on_pl__5c6f(lseg_endpoint(segment, false), line);
    if first != BoolValue::Value(true) {
        return first;
    };
    sql__pg_catalog__on_pl__5c6f(lseg_endpoint(segment, true), line)
}
pub fn sql__pg_catalog__dist_sl__rsx7(segment: LsegValue, line: LineValue) -> Float8Value {
    let closest = segment_project_line(segment, line);
    closest.distance
}
pub fn sql__pg_catalog__dist_ls__zpuo(line: LineValue, segment: LsegValue) -> Float8Value {
    if let LineValue::Error(error) = line {
        return Float8Value::Error(error);
    };
    let closest = segment_project_line(segment, line);
    closest.distance
}
pub fn sql__pg_catalog__dist_sp__3dia(segment: LsegValue, point: PointValue) -> Float8Value {
    let closest = segment_project_point(segment, point);
    closest.distance
}
pub fn sql__pg_catalog__dist_ps__elz7(point: PointValue, segment: LsegValue) -> Float8Value {
    if let PointValue::Error(error) = point {
        return Float8Value::Error(error);
    };
    let closest = segment_project_point(segment, point);
    closest.distance
}
pub fn sql__pg_catalog__close_ps__i1gr(point: PointValue, segment: LsegValue) -> PointValue {
    if let PointValue::Error(error) = point {
        return PointValue::Error(error);
    };
    segment_closest_point(segment_project_point(segment, point))
}
pub fn sql__pg_catalog__lseg_distance__dgev(left: LsegValue, right: LsegValue) -> Float8Value {
    let closest = segment_nearest_pair(left, right);
    closest.distance
}
pub fn sql__pg_catalog__close_ls__iz60(line: LineValue, segment: LsegValue) -> PointValue {
    if let LineValue::Error(error) = line {
        return PointValue::Error(error);
    };
    let status = segment_line_status(segment, line);
    if status != BoolValue::Value(true) {
        return segment_point_from_status(status);
    };
    let slopes = segment_raw_relation(lseg_slope(segment, false), segment_line_slope(line), true);
    if slopes == BoolValue::Value(true) {
        return PointValue::Null;
    };
    if slopes != BoolValue::Value(false) {
        return segment_point_from_status(slopes);
    };
    segment_closest_point(segment_project_line(segment, line))
}
pub fn sql__pg_catalog__close_lseg__q411(left: LsegValue, right: LsegValue) -> PointValue {
    let status = segment_pair_status(left, right);
    if status != BoolValue::Value(true) {
        return segment_point_from_status(status);
    };
    let slopes = segment_raw_relation(lseg_slope(left, false), lseg_slope(right, false), true);
    if slopes == BoolValue::Value(true) {
        return PointValue::Null;
    };
    if slopes != BoolValue::Value(false) {
        return segment_point_from_status(slopes);
    };
    segment_closest_point(segment_nearest_pair(right, left))
}
