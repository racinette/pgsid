fn circle_fuzzy_relation(left: Float8Value, right: Float8Value, mode: i32) -> BoolValue {
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
    let mut condition_flavor_13_4: i32 = unresolved_flavor; if let Float8Value::Unknown = left { if condition_flavor_13_4 < 1 { condition_flavor_13_4 = 1; }; }; if let Float8Value::Unimplemented = left { condition_flavor_13_4 = 2; }; if let Float8Value::Unknown = right { if condition_flavor_13_4 < 1 { condition_flavor_13_4 = 1; }; }; if let Float8Value::Unimplemented = right { condition_flavor_13_4 = 2; }; if (left == Float8Value::Unknown || left == Float8Value::Unimplemented) || (right == Float8Value::Unknown || right == Float8Value::Unimplemented) {
        return bool_unresolved(condition_flavor_13_4);
    };
    if left == Float8Value::Null || right == Float8Value::Null {
        return BoolValue::Null;
    };
    let first = float8_semantic(left);
    let second = float8_semantic(right);
    if let Float8Value::Value(a) = first {
        if let Float8Value::Value(b) = second {
            let x = float8_number(a);
            let y = float8_number(b);
            if mode == 0 {
                return make_bool_value(x + 0.000001f64 < y);
            };
            if mode == 1 {
                return make_bool_value(x > y + 0.000001f64);
            };
            if mode == 2 {
                return make_bool_value(x <= y + 0.000001f64);
            };
            if mode == 3 {
                return make_bool_value(x + 0.000001f64 >= y);
            };
            return make_bool_value(x <= y);
        };
    };
    let mut local_flavor_40_4: i32 = unresolved_flavor; if let Float8Value::Unknown = second { if local_flavor_40_4 < 1 { local_flavor_40_4 = 1; }; }; if let Float8Value::Unimplemented = second { local_flavor_40_4 = 2; }; if let Float8Value::Unknown = first { if local_flavor_40_4 < 1 { local_flavor_40_4 = 1; }; }; if let Float8Value::Unimplemented = first { local_flavor_40_4 = 2; }; bool_unresolved(local_flavor_40_4)
}
fn circle_edge(input: CircleValue, vertical: bool, low: bool) -> Float8Value {
    let mut unresolved_flavor: i32 = 0;
    if let CircleValue::Unknown = input { unresolved_flavor = 1; };
    if let CircleValue::Unimplemented = input { unresolved_flavor = 2; };
    let center = circle_center_value(input);
    if let PointValue::Error(error) = center {
        return Float8Value::Error(error);
    };
    if center == PointValue::Null {
        return Float8Value::Null;
    };
    if let PointValue::Value(point) = center {
        let coordinate = line_origin_coordinate(point, vertical);
        let radius = circle_radius_value(input);
        if low {
            return sql__pg_catalog__float8mi__r1nu(coordinate, radius);
        };
        return sql__pg_catalog__float8pl__g3ou(coordinate, radius);
    };
    let mut local_flavor_61_4: i32 = unresolved_flavor; if let PointValue::Unknown = center { if local_flavor_61_4 < 1 { local_flavor_61_4 = 1; }; }; if let PointValue::Unimplemented = center { local_flavor_61_4 = 2; }; float8_unresolved(local_flavor_61_4)
}
fn circle_position_relation(
    left: CircleValue,
    right: CircleValue,
    vertical: bool,
    mode: i32,
) -> BoolValue {
    let status = circle_pair_status(left, right);
    if status != BoolValue::Value(true) {
        return status;
    };
    if mode == 0 {
        return circle_fuzzy_relation(
            circle_edge(left, vertical, false),
            circle_edge(right, vertical, true),
            0,
        );
    };
    if mode == 1 {
        return circle_fuzzy_relation(
            circle_edge(left, vertical, true),
            circle_edge(right, vertical, false),
            1,
        );
    };
    if mode == 2 {
        return circle_fuzzy_relation(
            circle_edge(left, vertical, false),
            circle_edge(right, vertical, false),
            2,
        );
    };
    circle_fuzzy_relation(
        circle_edge(left, vertical, true),
        circle_edge(right, vertical, true),
        3,
    )
}
fn circle_topology_relation(left: CircleValue, right: CircleValue, mode: i32) -> BoolValue {
    let status = circle_pair_status(left, right);
    if status != BoolValue::Value(true) {
        return status;
    };
    let distance = sql__pg_catalog__point_distance__2haq(
        circle_center_value(left),
        circle_center_value(right),
    );
    let first = circle_radius_value(left);
    let second = circle_radius_value(right);
    let mut bound = Float8Value::Unknown;
    if mode == 0 {
        bound = sql__pg_catalog__float8pl__g3ou(first, second);
    } else if mode == 1 {
        bound = sql__pg_catalog__float8mi__r1nu(first, second);
    } else {
        bound = sql__pg_catalog__float8mi__r1nu(second, first);
    };
    circle_fuzzy_relation(distance, bound, 2)
}
fn circle_clamp_distance(input: Float8Value) -> Float8Value {
    let value = float8_semantic(input);
    if let Float8Value::Value(bits) = value {
        if float8_number(bits) < 0.0f64 {
            return make_float8_bits(0i64);
        };
    };
    box_computed_scalar(input)
}
fn circle_distance_value(left: CircleValue, right: CircleValue) -> Float8Value {
    let mut unresolved_flavor: i32 = 0;
    if let CircleValue::Unknown = left { unresolved_flavor = 1; };
    if let CircleValue::Unknown = right { unresolved_flavor = 1; };
    if let CircleValue::Unimplemented = left { unresolved_flavor = 2; };
    if let CircleValue::Unimplemented = right { unresolved_flavor = 2; };
    let status = circle_pair_status(left, right);
    if let BoolValue::Error(error) = status {
        return Float8Value::Error(error);
    };
    let mut condition_flavor_140_4: i32 = unresolved_flavor; if let BoolValue::Unknown = status { if condition_flavor_140_4 < 1 { condition_flavor_140_4 = 1; }; }; if let BoolValue::Unimplemented = status { condition_flavor_140_4 = 2; }; if status == BoolValue::Unknown || status == BoolValue::Unimplemented {
        return float8_unresolved(condition_flavor_140_4);
    };
    if status == BoolValue::Null {
        return Float8Value::Null;
    };
    let distance = sql__pg_catalog__point_distance__2haq(
        circle_center_value(left),
        circle_center_value(right),
    );
    let radii =
        sql__pg_catalog__float8pl__g3ou(circle_radius_value(left), circle_radius_value(right));
    circle_clamp_distance(sql__pg_catalog__float8mi__r1nu(distance, radii))
}
fn circle_point_status(input: CircleValue, point: PointValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let CircleValue::Unknown = input { unresolved_flavor = 1; };
    if let PointValue::Unknown = point { unresolved_flavor = 1; };
    if let CircleValue::Unimplemented = input { unresolved_flavor = 2; };
    if let PointValue::Unimplemented = point { unresolved_flavor = 2; };
    if let CircleValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if let PointValue::Error(error) = point {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_166_4: i32 = unresolved_flavor; if let CircleValue::Unknown = input { if condition_flavor_166_4 < 1 { condition_flavor_166_4 = 1; }; }; if let CircleValue::Unimplemented = input { condition_flavor_166_4 = 2; }; if let PointValue::Unknown = point { if condition_flavor_166_4 < 1 { condition_flavor_166_4 = 1; }; }; if let PointValue::Unimplemented = point { condition_flavor_166_4 = 2; }; if (input == CircleValue::Unknown || input == CircleValue::Unimplemented) || (point == PointValue::Unknown || point == PointValue::Unimplemented) {
        return bool_unresolved(condition_flavor_166_4);
    };
    if input == CircleValue::Null || point == PointValue::Null {
        return BoolValue::Null;
    };
    make_bool_value(true)
}
fn circle_has_point(input: CircleValue, point: PointValue) -> BoolValue {
    let status = circle_point_status(input, point);
    if status != BoolValue::Value(true) {
        return status;
    };
    circle_fuzzy_relation(
        sql__pg_catalog__point_distance__2haq(circle_center_value(input), point),
        circle_radius_value(input),
        4,
    )
}
fn circle_point_distance(input: CircleValue, point: PointValue) -> Float8Value {
    let mut unresolved_flavor: i32 = 0;
    if let CircleValue::Unknown = input { unresolved_flavor = 1; };
    if let PointValue::Unknown = point { unresolved_flavor = 1; };
    if let CircleValue::Unimplemented = input { unresolved_flavor = 2; };
    if let PointValue::Unimplemented = point { unresolved_flavor = 2; };
    let status = circle_point_status(input, point);
    if let BoolValue::Error(error) = status {
        return Float8Value::Error(error);
    };
    let mut condition_flavor_195_4: i32 = unresolved_flavor; if let BoolValue::Unknown = status { if condition_flavor_195_4 < 1 { condition_flavor_195_4 = 1; }; }; if let BoolValue::Unimplemented = status { condition_flavor_195_4 = 2; }; if status == BoolValue::Unknown || status == BoolValue::Unimplemented {
        return float8_unresolved(condition_flavor_195_4);
    };
    if status == BoolValue::Null {
        return Float8Value::Null;
    };
    let distance = sql__pg_catalog__point_distance__2haq(point, circle_center_value(input));
    circle_clamp_distance(sql__pg_catalog__float8mi__r1nu(
        distance,
        circle_radius_value(input),
    ))
}
fn circle_arithmetic(input: CircleValue, point: PointValue, mode: i32) -> CircleValue {
    let mut unresolved_flavor: i32 = 0;
    if let CircleValue::Unknown = input { unresolved_flavor = 1; };
    if let PointValue::Unknown = point { unresolved_flavor = 1; };
    if let CircleValue::Unimplemented = input { unresolved_flavor = 2; };
    if let PointValue::Unimplemented = point { unresolved_flavor = 2; };
    let status = circle_point_status(input, point);
    if let BoolValue::Error(error) = status {
        return CircleValue::Error(error);
    };
    let mut condition_flavor_217_4: i32 = unresolved_flavor; if let BoolValue::Unknown = status { if condition_flavor_217_4 < 1 { condition_flavor_217_4 = 1; }; }; if let BoolValue::Unimplemented = status { condition_flavor_217_4 = 2; }; if status == BoolValue::Unknown || status == BoolValue::Unimplemented {
        return circle_unresolved(condition_flavor_217_4);
    };
    if status == BoolValue::Null {
        return CircleValue::Null;
    };
    let center = point_arithmetic(circle_center_value(input), point, mode);
    if let PointValue::Error(error) = center {
        return CircleValue::Error(error);
    };
    let mut radius = circle_radius_value(input);
    if mode >= 2 {
        if let PointValue::Value(value) = point {
            let scale = geometric_hypot(
                line_origin_coordinate(value, false),
                line_origin_coordinate(value, true),
            );
            if mode == 2 {
                radius = box_computed_scalar(sql__pg_catalog__float8mul__d3nd(radius, scale));
            } else {
                radius = box_computed_scalar(sql__pg_catalog__float8div__kumj(radius, scale));
            };
        };
    };
    circle_from_center_radius(center, radius)
}

pub fn sql__pg_catalog__circle_above__53i1(left: CircleValue, right: CircleValue) -> BoolValue {
    circle_position_relation(left, right, true, 1)
}

pub fn sql__pg_catalog__circle_add_pt__3scx(input: CircleValue, point: PointValue) -> CircleValue {
    circle_arithmetic(input, point, 0)
}

pub fn sql__pg_catalog__circle_below__tgcg(left: CircleValue, right: CircleValue) -> BoolValue {
    circle_position_relation(left, right, true, 0)
}

pub fn sql__pg_catalog__circle_contain__oo7s(left: CircleValue, right: CircleValue) -> BoolValue {
    circle_topology_relation(left, right, 1)
}

pub fn sql__pg_catalog__circle_contain_pt__ieqn(
    input: CircleValue,
    point: PointValue,
) -> BoolValue {
    circle_has_point(input, point)
}

pub fn sql__pg_catalog__circle_contained__wr7j(left: CircleValue, right: CircleValue) -> BoolValue {
    circle_topology_relation(left, right, 2)
}

pub fn sql__pg_catalog__circle_distance__dakp(
    left: CircleValue,
    right: CircleValue,
) -> Float8Value {
    circle_distance_value(left, right)
}

pub fn sql__pg_catalog__circle_div_pt__tdhp(input: CircleValue, point: PointValue) -> CircleValue {
    circle_arithmetic(input, point, 3)
}

pub fn sql__pg_catalog__circle_left__0eka(left: CircleValue, right: CircleValue) -> BoolValue {
    circle_position_relation(left, right, false, 0)
}

pub fn sql__pg_catalog__circle_mul_pt__94zs(input: CircleValue, point: PointValue) -> CircleValue {
    circle_arithmetic(input, point, 2)
}

pub fn sql__pg_catalog__circle_overabove__dgkn(left: CircleValue, right: CircleValue) -> BoolValue {
    circle_position_relation(left, right, true, 3)
}

pub fn sql__pg_catalog__circle_overbelow__z9t3(left: CircleValue, right: CircleValue) -> BoolValue {
    circle_position_relation(left, right, true, 2)
}

pub fn sql__pg_catalog__circle_overlap__8jgl(left: CircleValue, right: CircleValue) -> BoolValue {
    circle_topology_relation(left, right, 0)
}

pub fn sql__pg_catalog__circle_overleft__lqah(left: CircleValue, right: CircleValue) -> BoolValue {
    circle_position_relation(left, right, false, 2)
}

pub fn sql__pg_catalog__circle_overright__yb2p(left: CircleValue, right: CircleValue) -> BoolValue {
    circle_position_relation(left, right, false, 3)
}

pub fn sql__pg_catalog__circle_right__oxzc(left: CircleValue, right: CircleValue) -> BoolValue {
    circle_position_relation(left, right, false, 1)
}

pub fn sql__pg_catalog__circle_sub_pt__eqne(input: CircleValue, point: PointValue) -> CircleValue {
    circle_arithmetic(input, point, 1)
}

pub fn sql__pg_catalog__dist_cpoint__5ejq(input: CircleValue, point: PointValue) -> Float8Value {
    circle_point_distance(input, point)
}

pub fn sql__pg_catalog__dist_pc__eedo(point: PointValue, input: CircleValue) -> Float8Value {
    if let PointValue::Error(error) = point {
        return Float8Value::Error(error);
    };
    circle_point_distance(input, point)
}

pub fn sql__pg_catalog__pt_contained_circle__llnp(
    point: PointValue,
    input: CircleValue,
) -> BoolValue {
    if let PointValue::Error(error) = point {
        return BoolValue::Error(error);
    };
    circle_has_point(input, point)
}
