fn segment_pair_status(left: LsegValue, right: LsegValue) -> BoolValue {
    if let LsegValue::Error(error) = left {
        return BoolValue::Error(error);
    };
    if let LsegValue::Error(error) = right {
        return BoolValue::Error(error);
    };
    if left == LsegValue::Unknown || right == LsegValue::Unknown {
        return BoolValue::Unknown;
    };
    if left == LsegValue::Null || right == LsegValue::Null {
        return BoolValue::Null;
    };
    make_bool_value(true)
}
fn segment_line_status(segment: LsegValue, line: LineValue) -> BoolValue {
    if let LsegValue::Error(error) = segment {
        return BoolValue::Error(error);
    };
    if let LineValue::Error(error) = line {
        return BoolValue::Error(error);
    };
    if segment == LsegValue::Unknown || line == LineValue::Unknown {
        return BoolValue::Unknown;
    };
    if segment == LsegValue::Null || line == LineValue::Null {
        return BoolValue::Null;
    };
    make_bool_value(true)
}
fn segment_point_status(segment: LsegValue, point: PointValue) -> BoolValue {
    if let LsegValue::Error(error) = segment {
        return BoolValue::Error(error);
    };
    if let PointValue::Error(error) = point {
        return BoolValue::Error(error);
    };
    if segment == LsegValue::Unknown || point == PointValue::Unknown {
        return BoolValue::Unknown;
    };
    if segment == LsegValue::Null || point == PointValue::Null {
        return BoolValue::Null;
    };
    make_bool_value(true)
}
fn segment_point_from_status(status: BoolValue) -> PointValue {
    if let BoolValue::Error(error) = status {
        return PointValue::Error(error);
    };
    if status == BoolValue::Null {
        return PointValue::Null;
    };
    PointValue::Unknown
}
fn segment_float_from_status(status: BoolValue) -> Float8Value {
    if let BoolValue::Error(error) = status {
        return Float8Value::Error(error);
    };
    if status == BoolValue::Null {
        return Float8Value::Null;
    };
    Float8Value::Unknown
}
fn segment_raw_relation(left: Float8Value, right: Float8Value, equal: bool) -> BoolValue {
    if let Float8Value::Error(error) = left {
        return BoolValue::Error(error);
    };
    if let Float8Value::Error(error) = right {
        return BoolValue::Error(error);
    };
    if left == Float8Value::Unknown || right == Float8Value::Unknown {
        return BoolValue::Unknown;
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
    BoolValue::Unknown
}
fn segment_contains_point(segment: LsegValue, point: PointValue) -> BoolValue {
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
    BoolValue::Unknown
}
fn segment_promote_line(segment: LsegValue) -> LineValue {
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
    LineValue::Unknown
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
    if intersection == PointValue::Null || intersection == PointValue::Unknown {
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
    if intersection == PointValue::Null || intersection == PointValue::Unknown {
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
    if let PointValue::Error(error) = point {
        return BoolValue::Error(error);
    };
    if point == PointValue::Unknown {
        return BoolValue::Unknown;
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
    if intersection == PointValue::Unknown {
        return segment_closest_from_status(BoolValue::Unknown);
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
        if distance == Float8Value::Unknown {
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
    if intersection == PointValue::Unknown {
        return segment_closest_from_status(BoolValue::Unknown);
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
    let distance = closest.distance;
    if let Float8Value::Error(error) = distance {
        return PointValue::Error(error);
    };
    if distance == Float8Value::Unknown {
        return PointValue::Unknown;
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
    Float8Value::Unknown
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
