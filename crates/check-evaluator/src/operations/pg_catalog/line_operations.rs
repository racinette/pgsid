fn line_coefficient(value: LinePayload, index: i32) -> Float8Value {
    let mut bits = value.a;
    if index == 1 {
        bits = value.b;
    };
    if index == 2 {
        bits = value.c;
    };
    let number = float8_number(bits);
    if value.wire_known == false && number != number {
        return Float8Value::UnspecifiedNan;
    };
    make_float8_bits(bits)
}
fn line_normalize_zero(value: Float8Value) -> Float8Value {
    if let Float8Value::Value(bits) = value {
        if float8_number(bits) == 0.0f64 {
            return make_float8_bits(0i64);
        };
    };
    value
}
fn line_nonvertical_intersection(first: LinePayload, second: LinePayload) -> PointValue {
    let a1 = line_coefficient(first, 0);
    let b1 = line_coefficient(first, 1);
    let c1 = line_coefficient(first, 2);
    let a2 = line_coefficient(second, 0);
    let b2 = line_coefficient(second, 1);
    let c2 = line_coefficient(second, 2);
    let ratio = sql__pg_catalog__float8div__kumj(b2, b1);
    let scaled = sql__pg_catalog__float8mul__d3nd(a1, ratio);
    if let Float8Value::Error(error) = scaled {
        return PointValue::Error(error);
    };
    let comparison = float8_semantic(scaled);
    if let Float8Value::Value(bits) = comparison {
        if geometric_coordinate_equal(float8_number(second.a), float8_number(bits)) {
            return PointValue::Null;
        };
    };
    let numerator = sql__pg_catalog__float8mi__r1nu(
        sql__pg_catalog__float8mul__d3nd(b1, c2),
        sql__pg_catalog__float8mul__d3nd(b2, c1),
    );
    let denominator = sql__pg_catalog__float8mi__r1nu(
        sql__pg_catalog__float8mul__d3nd(a1, b2),
        sql__pg_catalog__float8mul__d3nd(a2, b1),
    );
    let x = sql__pg_catalog__float8div__kumj(numerator, denominator);
    let y = sql__pg_catalog__float8div__kumj(
        sql__pg_catalog__float8um__3uy5(sql__pg_catalog__float8pl__g3ou(
            sql__pg_catalog__float8mul__d3nd(a1, x),
            c1,
        )),
        b1,
    );
    point_arithmetic_result(line_normalize_zero(x), line_normalize_zero(y))
}
fn line_intersection(left: LineValue, right: LineValue) -> PointValue {
    let mut unresolved_flavor: i32 = 0;
    if let LineValue::Unknown = left { unresolved_flavor = 1; };
    if let LineValue::Unknown = right { unresolved_flavor = 1; };
    if let LineValue::Unimplemented = left { unresolved_flavor = 2; };
    if let LineValue::Unimplemented = right { unresolved_flavor = 2; };
    if let LineValue::Error(error) = left {
        return PointValue::Error(error);
    };
    if let LineValue::Error(error) = right {
        return PointValue::Error(error);
    };
    let mut condition_flavor_71_4: i32 = unresolved_flavor; if let LineValue::Unknown = left { if condition_flavor_71_4 < 1 { condition_flavor_71_4 = 1; }; }; if let LineValue::Unimplemented = left { condition_flavor_71_4 = 2; }; if let LineValue::Unknown = right { if condition_flavor_71_4 < 1 { condition_flavor_71_4 = 1; }; }; if let LineValue::Unimplemented = right { condition_flavor_71_4 = 2; }; if (left == LineValue::Unknown || left == LineValue::Unimplemented) || (right == LineValue::Unknown || right == LineValue::Unimplemented) {
        return point_unresolved(condition_flavor_71_4);
    };
    if left == LineValue::Null || right == LineValue::Null {
        return PointValue::Null;
    };
    if let LineValue::Value(first) = left {
        if let LineValue::Value(second) = right {
            if float8_number(first.b).abs() > 0.000001f64
                || float8_number(first.b) != float8_number(first.b)
            {
                return line_nonvertical_intersection(first, second);
            };
            if float8_number(second.b).abs() > 0.000001f64
                || float8_number(second.b) != float8_number(second.b)
            {
                return line_nonvertical_intersection(second, first);
            };
            return PointValue::Null;
        };
    };
    point_unresolved(unresolved_flavor)
}
fn line_intersection_predicate(left: LineValue, right: LineValue, parallel: bool) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let LineValue::Unknown = left { unresolved_flavor = 1; };
    if let LineValue::Unknown = right { unresolved_flavor = 1; };
    if let LineValue::Unimplemented = left { unresolved_flavor = 2; };
    if let LineValue::Unimplemented = right { unresolved_flavor = 2; };
    if let LineValue::Error(error) = left {
        return BoolValue::Error(error);
    };
    if let LineValue::Error(error) = right {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_106_4: i32 = unresolved_flavor; if let LineValue::Unknown = left { if condition_flavor_106_4 < 1 { condition_flavor_106_4 = 1; }; }; if let LineValue::Unimplemented = left { condition_flavor_106_4 = 2; }; if let LineValue::Unknown = right { if condition_flavor_106_4 < 1 { condition_flavor_106_4 = 1; }; }; if let LineValue::Unimplemented = right { condition_flavor_106_4 = 2; }; if (left == LineValue::Unknown || left == LineValue::Unimplemented) || (right == LineValue::Unknown || right == LineValue::Unimplemented) {
        return bool_unresolved(condition_flavor_106_4);
    };
    if left == LineValue::Null || right == LineValue::Null {
        return BoolValue::Null;
    };
    let result = line_intersection(left, right);
    if let PointValue::Error(error) = result {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_116_4: i32 = unresolved_flavor; if let PointValue::Unknown = result { if condition_flavor_116_4 < 1 { condition_flavor_116_4 = 1; }; }; if let PointValue::Unimplemented = result { condition_flavor_116_4 = 2; }; if (result == PointValue::Unknown || result == PointValue::Unimplemented) {
        return bool_unresolved(condition_flavor_116_4);
    };
    make_bool_value((result == PointValue::Null) == parallel)
}
pub fn sql__pg_catalog__line_interpt__t7iz(left: LineValue, right: LineValue) -> PointValue {
    line_intersection(left, right)
}
pub fn sql__pg_catalog__line_intersect__0246(left: LineValue, right: LineValue) -> BoolValue {
    line_intersection_predicate(left, right, false)
}
pub fn sql__pg_catalog__line_parallel__vnb5(left: LineValue, right: LineValue) -> BoolValue {
    line_intersection_predicate(left, right, true)
}
pub fn sql__pg_catalog__isparallel__3lb4(left: LineValue, right: LineValue) -> BoolValue {
    line_intersection_predicate(left, right, true)
}

fn line_perpendicular(left: LineValue, right: LineValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let LineValue::Unknown = left { unresolved_flavor = 1; };
    if let LineValue::Unknown = right { unresolved_flavor = 1; };
    if let LineValue::Unimplemented = left { unresolved_flavor = 2; };
    if let LineValue::Unimplemented = right { unresolved_flavor = 2; };
    if let LineValue::Error(error) = left {
        return BoolValue::Error(error);
    };
    if let LineValue::Error(error) = right {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_146_4: i32 = unresolved_flavor; if let LineValue::Unknown = left { if condition_flavor_146_4 < 1 { condition_flavor_146_4 = 1; }; }; if let LineValue::Unimplemented = left { condition_flavor_146_4 = 2; }; if let LineValue::Unknown = right { if condition_flavor_146_4 < 1 { condition_flavor_146_4 = 1; }; }; if let LineValue::Unimplemented = right { condition_flavor_146_4 = 2; }; if (left == LineValue::Unknown || left == LineValue::Unimplemented) || (right == LineValue::Unknown || right == LineValue::Unimplemented) {
        return bool_unresolved(condition_flavor_146_4);
    };
    if left == LineValue::Null || right == LineValue::Null {
        return BoolValue::Null;
    };
    if let LineValue::Value(first) = left {
        if let LineValue::Value(second) = right {
            if float8_number(first.a).abs() <= 0.000001f64 {
                return make_bool_value(float8_number(second.b).abs() <= 0.000001f64);
            };
            if float8_number(second.a).abs() <= 0.000001f64 {
                return make_bool_value(float8_number(first.b).abs() <= 0.000001f64);
            };
            if float8_number(first.b).abs() <= 0.000001f64 {
                return make_bool_value(float8_number(second.a).abs() <= 0.000001f64);
            };
            if float8_number(second.b).abs() <= 0.000001f64 {
                return make_bool_value(float8_number(first.a).abs() <= 0.000001f64);
            };
            let numerator = sql__pg_catalog__float8mul__d3nd(
                line_coefficient(first, 0),
                line_coefficient(second, 0),
            );
            let denominator = sql__pg_catalog__float8mul__d3nd(
                line_coefficient(first, 1),
                line_coefficient(second, 1),
            );
            let ratio = sql__pg_catalog__float8div__kumj(numerator, denominator);
            if let Float8Value::Error(error) = ratio {
                return BoolValue::Error(error);
            };
            let known = float8_semantic(ratio);
            if let Float8Value::Value(bits) = known {
                return make_bool_value(geometric_coordinate_equal(float8_number(bits), -1.0f64));
            };
        };
    };
    bool_unresolved(unresolved_flavor)
}
pub fn sql__pg_catalog__line_perp__iw13(left: LineValue, right: LineValue) -> BoolValue {
    line_perpendicular(left, right)
}
pub fn sql__pg_catalog__isperp__5z5s(left: LineValue, right: LineValue) -> BoolValue {
    line_perpendicular(left, right)
}
pub fn sql__pg_catalog__line_distance__a9ql(left: LineValue, right: LineValue) -> Float8Value {
    let mut unresolved_flavor: i32 = 0;
    if let LineValue::Unknown = left { unresolved_flavor = 1; };
    if let LineValue::Unknown = right { unresolved_flavor = 1; };
    if let LineValue::Unimplemented = left { unresolved_flavor = 2; };
    if let LineValue::Unimplemented = right { unresolved_flavor = 2; };
    if let LineValue::Error(error) = left {
        return Float8Value::Error(error);
    };
    if let LineValue::Error(error) = right {
        return Float8Value::Error(error);
    };
    let mut condition_flavor_204_4: i32 = unresolved_flavor; if let LineValue::Unknown = left { if condition_flavor_204_4 < 1 { condition_flavor_204_4 = 1; }; }; if let LineValue::Unimplemented = left { condition_flavor_204_4 = 2; }; if let LineValue::Unknown = right { if condition_flavor_204_4 < 1 { condition_flavor_204_4 = 1; }; }; if let LineValue::Unimplemented = right { condition_flavor_204_4 = 2; }; if (left == LineValue::Unknown || left == LineValue::Unimplemented) || (right == LineValue::Unknown || right == LineValue::Unimplemented) {
        return float8_unresolved(condition_flavor_204_4);
    };
    if left == LineValue::Null || right == LineValue::Null {
        return Float8Value::Null;
    };
    let intersection = line_intersection(left, right);
    if let PointValue::Error(error) = intersection {
        return Float8Value::Error(error);
    };
    let mut condition_flavor_214_4: i32 = unresolved_flavor; if let PointValue::Unknown = intersection { if condition_flavor_214_4 < 1 { condition_flavor_214_4 = 1; }; }; if let PointValue::Unimplemented = intersection { condition_flavor_214_4 = 2; }; if (intersection == PointValue::Unknown || intersection == PointValue::Unimplemented) {
        return float8_unresolved(condition_flavor_214_4);
    };
    if intersection != PointValue::Null {
        return make_float8_bits(0i64);
    };
    if let LineValue::Value(first) = left {
        if let LineValue::Value(second) = right {
            let a = float8_number(first.a);
            let b = float8_number(second.a);
            let c = float8_number(first.b);
            let d = float8_number(second.b);
            let mut ratio = make_float8_value(1.0f64);
            if a.abs() > 0.000001f64 && a == a && b.abs() > 0.000001f64 && b == b {
                ratio = sql__pg_catalog__float8div__kumj(
                    line_coefficient(first, 0),
                    line_coefficient(second, 0),
                );
            } else if c.abs() > 0.000001f64 && c == c && d.abs() > 0.000001f64 && d == d {
                ratio = sql__pg_catalog__float8div__kumj(
                    line_coefficient(first, 1),
                    line_coefficient(second, 1),
                );
            };
            let numerator = sql__pg_catalog__float8abs__fq86(sql__pg_catalog__float8mi__r1nu(
                line_coefficient(first, 2),
                sql__pg_catalog__float8mul__d3nd(ratio, line_coefficient(second, 2)),
            ));
            let denominator =
                geometric_hypot(line_coefficient(first, 0), line_coefficient(first, 1));
            let result = sql__pg_catalog__float8div__kumj(numerator, denominator);
            if let Float8Value::Value(bits) = result {
                if float8_number(bits) != float8_number(bits) {
                    return Float8Value::UnspecifiedNan;
                };
            };
            return result;
        };
    };
    float8_unresolved(unresolved_flavor)
}

fn line_inverse_slope(line: LinePayload) -> Float8Value {
    if float8_number(line.a).abs() <= 0.000001f64 {
        return make_float8_bits(9218868437227405312i64);
    };
    if float8_number(line.b).abs() <= 0.000001f64 {
        return make_float8_bits(0i64);
    };
    sql__pg_catalog__float8div__kumj(line_coefficient(line, 1), line_coefficient(line, 0))
}
#[derive(Clone, Copy)]
struct LineProjection {
    point: PointValue,
    distance: Float8Value,
}
fn line_project_point(point: PointValue, line: LineValue) -> LineProjection {
    if let PointValue::Error(error) = point {
        return LineProjection {
            point: PointValue::Error(error),
            distance: Float8Value::Error(error),
        };
    };
    if let LineValue::Error(error) = line {
        return LineProjection {
            point: PointValue::Error(error),
            distance: Float8Value::Error(error),
        };
    };
    if (point == PointValue::Unknown || point == PointValue::Unimplemented) || (line == LineValue::Unknown || line == LineValue::Unimplemented) {
        return LineProjection {
            point: PointValue::Unknown,
            distance: Float8Value::Unknown,
        };
    };
    if point == PointValue::Null || line == LineValue::Null {
        return LineProjection {
            point: PointValue::Null,
            distance: Float8Value::Null,
        };
    };
    if let PointValue::Value(origin) = point {
        if let LineValue::Value(axis) = line {
            let inverse = line_inverse_slope(axis);
            let perpendicular = line_from_origin_slope(origin, inverse);
            let projected = line_intersection(perpendicular, line);
            if let PointValue::Error(error) = projected {
                return LineProjection {
                    point: projected,
                    distance: Float8Value::Error(error),
                };
            };
            if projected == PointValue::Null {
                return LineProjection {
                    point: point,
                    distance: Float8Value::UnspecifiedNan,
                };
            };
            let distance = sql__pg_catalog__point_distance__2haq(projected, point);
            return LineProjection {
                point: projected,
                distance: distance,
            };
        };
    };
    LineProjection {
        point: PointValue::Unknown,
        distance: Float8Value::Unknown,
    }
}
pub fn sql__pg_catalog__dist_pl__6tvm(point: PointValue, line: LineValue) -> Float8Value {
    let projected = line_project_point(point, line);
    projected.distance
}
pub fn sql__pg_catalog__dist_lp__qmpt(line: LineValue, point: PointValue) -> Float8Value {
    if let LineValue::Error(error) = line {
        return Float8Value::Error(error);
    };
    let projected = line_project_point(point, line);
    projected.distance
}
pub fn sql__pg_catalog__close_pl__9f9o(point: PointValue, line: LineValue) -> PointValue {
    let projected = line_project_point(point, line);
    let distance = projected.distance;
    if let Float8Value::Error(error) = distance {
        return PointValue::Error(error);
    };
    if distance == Float8Value::UnspecifiedNan {
        return PointValue::Null;
    };
    if let Float8Value::Value(bits) = distance {
        if float8_number(bits) != float8_number(bits) {
            return PointValue::Null;
        };
    };
    projected.point
}
pub fn sql__pg_catalog__on_pl__5c6f(point: PointValue, line: LineValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let PointValue::Unknown = point { unresolved_flavor = 1; };
    if let LineValue::Unknown = line { unresolved_flavor = 1; };
    if let PointValue::Unimplemented = point { unresolved_flavor = 2; };
    if let LineValue::Unimplemented = line { unresolved_flavor = 2; };
    if let PointValue::Error(error) = point {
        return BoolValue::Error(error);
    };
    if let LineValue::Error(error) = line {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_363_4: i32 = unresolved_flavor; if let PointValue::Unknown = point { if condition_flavor_363_4 < 1 { condition_flavor_363_4 = 1; }; }; if let PointValue::Unimplemented = point { condition_flavor_363_4 = 2; }; if let LineValue::Unknown = line { if condition_flavor_363_4 < 1 { condition_flavor_363_4 = 1; }; }; if let LineValue::Unimplemented = line { condition_flavor_363_4 = 2; }; if (point == PointValue::Unknown || point == PointValue::Unimplemented) || (line == LineValue::Unknown || line == LineValue::Unimplemented) {
        return bool_unresolved(condition_flavor_363_4);
    };
    if point == PointValue::Null || line == LineValue::Null {
        return BoolValue::Null;
    };
    if let PointValue::Value(position) = point {
        if let LineValue::Value(axis) = line {
            let x = sql__pg_catalog__float8mul__d3nd(
                line_coefficient(axis, 0),
                line_origin_coordinate(position, false),
            );
            let y = sql__pg_catalog__float8mul__d3nd(
                line_coefficient(axis, 1),
                line_origin_coordinate(position, true),
            );
            let sum = sql__pg_catalog__float8pl__g3ou(
                sql__pg_catalog__float8pl__g3ou(x, y),
                line_coefficient(axis, 2),
            );
            if let Float8Value::Error(error) = sum {
                return BoolValue::Error(error);
            };
            let known = float8_semantic(sum);
            if let Float8Value::Value(bits) = known {
                return make_bool_value(float8_number(bits).abs() <= 0.000001f64);
            };
        };
    };
    bool_unresolved(unresolved_flavor)
}
