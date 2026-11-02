fn polygon_point_distance(point: PointPayload, polygon: &PathPayload) -> Float8Value {
    let unresolved_flavor: i32 = 0;
    if polygon.points.len() == 0 { return float8_unresolved(unresolved_flavor); };
    let inside = closed_path_contains(point, polygon);
    if let BoolValue::Error(error) = inside { return Float8Value::Error(error); };
    if inside == BoolValue::Value(true) { return make_float8_value(0.0f64); };
    if inside != BoolValue::Value(false) { return float8_unresolved(unresolved_flavor); };
    // The closing segment's orientation affects its rounded projection.
    let closing = path_segment(polygon.points[0], polygon.points[polygon.points.len() - 1]);
    let mut distance = sql__pg_catalog__dist_sp__3dia(closing, PointValue::Value(point));
    if let Float8Value::Error(error) = distance { return Float8Value::Error(error); };
    let mut condition_flavor_12_4: i32 = unresolved_flavor; if let Float8Value::Unknown = distance { if condition_flavor_12_4 < 1 { condition_flavor_12_4 = 1; }; }; if let Float8Value::Unimplemented = distance { condition_flavor_12_4 = 2; }; if distance == Float8Value::Unknown || distance == Float8Value::Unimplemented { return float8_unresolved(condition_flavor_12_4); };
    let mut index: usize = 0;
    while index + 1 < polygon.points.len() {
        let edge = path_segment(polygon.points[index], polygon.points[index + 1]);
        let candidate = sql__pg_catalog__dist_sp__3dia(edge, PointValue::Value(point));
        distance = path_min_distance(distance, candidate, false);
        if let Float8Value::Error(error) = distance { return Float8Value::Error(error); };
        let mut condition_flavor_19_8: i32 = unresolved_flavor; if let Float8Value::Unknown = distance { if condition_flavor_19_8 < 1 { condition_flavor_19_8 = 1; }; }; if let Float8Value::Unimplemented = distance { condition_flavor_19_8 = 2; }; if distance == Float8Value::Unknown || distance == Float8Value::Unimplemented { return float8_unresolved(condition_flavor_19_8); };
        index += 1;
    }
    box_computed_scalar(distance)
}

pub fn sql__pg_catalog__dist_ppoly__r23k(point: PointValue, input: PolygonValue) -> Float8Value {
    let mut unresolved_flavor: i32 = 0;
    if let PointValue::Unknown = point { unresolved_flavor = 1; };
    if let PolygonValue::Unknown = input { unresolved_flavor = 1; };
    if let PointValue::Unimplemented = point { unresolved_flavor = 2; };
    if let PolygonValue::Unimplemented = input { unresolved_flavor = 2; };
    if let PointValue::Error(error) = point { return Float8Value::Error(error); };
    if let PolygonValue::Error(error) = input { return Float8Value::Error(error); };
    let mut condition_flavor_33_4: i32 = unresolved_flavor; if let PointValue::Unknown = point { if condition_flavor_33_4 < 1 { condition_flavor_33_4 = 1; }; }; if let PointValue::Unimplemented = point { condition_flavor_33_4 = 2; }; if point == PointValue::Unknown || point == PointValue::Unimplemented { return float8_unresolved(condition_flavor_33_4); };
    let mut condition_flavor_34_4: i32 = unresolved_flavor; if let PolygonValue::Unknown = input { if condition_flavor_34_4 < 1 { condition_flavor_34_4 = 1; }; }; if let PolygonValue::Unknown = input { return float8_unresolved(condition_flavor_34_4); }; let mut condition_flavor_34_91: i32 = unresolved_flavor; if let PolygonValue::Unimplemented = input { condition_flavor_34_91 = 2; }; if let PolygonValue::Unimplemented = input { return float8_unresolved(condition_flavor_34_91); };
    if point == PointValue::Null { return Float8Value::Null; };
    if let PolygonValue::Null = input { return Float8Value::Null; };
    if let PointValue::Value(position) = point {
        if let PolygonValue::Value(value) = input {
            let path = PathPayload { closed: true, points: value.points };
            return polygon_point_distance(position, &path);
        };
    };
    float8_unresolved(unresolved_flavor)
}
pub fn sql__pg_catalog__dist_polyp__7ghe(input: PolygonValue, point: PointValue) -> Float8Value {
    if let PolygonValue::Error(error) = input { return Float8Value::Error(error); };
    sql__pg_catalog__dist_ppoly__r23k(point, input)
}
pub fn sql__pg_catalog__dist_cpoly__8q0w(input: CircleValue, polygon: PolygonValue) -> Float8Value {
    let mut unresolved_flavor: i32 = 0;
    if let CircleValue::Unknown = input { unresolved_flavor = 1; };
    if let PolygonValue::Unknown = polygon { unresolved_flavor = 1; };
    if let CircleValue::Unimplemented = input { unresolved_flavor = 2; };
    if let PolygonValue::Unimplemented = polygon { unresolved_flavor = 2; };
    if let CircleValue::Error(error) = input { return Float8Value::Error(error); };
    if let PolygonValue::Error(error) = polygon { return Float8Value::Error(error); };
    let mut condition_flavor_57_4: i32 = unresolved_flavor; if let CircleValue::Unknown = input { if condition_flavor_57_4 < 1 { condition_flavor_57_4 = 1; }; }; if let CircleValue::Unimplemented = input { condition_flavor_57_4 = 2; }; if input == CircleValue::Unknown || input == CircleValue::Unimplemented { return float8_unresolved(condition_flavor_57_4); };
    let mut condition_flavor_58_4: i32 = unresolved_flavor; if let PolygonValue::Unknown = polygon { if condition_flavor_58_4 < 1 { condition_flavor_58_4 = 1; }; }; if let PolygonValue::Unknown = polygon { return float8_unresolved(condition_flavor_58_4); }; let mut condition_flavor_58_93: i32 = unresolved_flavor; if let PolygonValue::Unimplemented = polygon { condition_flavor_58_93 = 2; }; if let PolygonValue::Unimplemented = polygon { return float8_unresolved(condition_flavor_58_93); };
    if input == CircleValue::Null { return Float8Value::Null; };
    if let PolygonValue::Null = polygon { return Float8Value::Null; };
    let distance = sql__pg_catalog__dist_ppoly__r23k(circle_center_value(input), polygon);
    circle_clamp_distance(sql__pg_catalog__float8mi__r1nu(distance, circle_radius_value(input)))
}
pub fn sql__pg_catalog__dist_polyc__4bju(polygon: PolygonValue, input: CircleValue) -> Float8Value {
    if let PolygonValue::Error(error) = polygon { return Float8Value::Error(error); };
    sql__pg_catalog__dist_cpoly__8q0w(input, polygon)
}
pub fn sql__pg_catalog__poly_distance__hh70(left: PolygonValue, right: PolygonValue) -> Float8Value {
    let mut unresolved_flavor: i32 = 0;
    if let PolygonValue::Unknown = left { unresolved_flavor = 1; };
    if let PolygonValue::Unknown = right { unresolved_flavor = 1; };
    if let PolygonValue::Unimplemented = left { unresolved_flavor = 2; };
    if let PolygonValue::Unimplemented = right { unresolved_flavor = 2; };
    if let PolygonValue::Error(error) = left { return Float8Value::Error(error); };
    if let PolygonValue::Error(error) = right { return Float8Value::Error(error); };
    let mut condition_flavor_76_4: i32 = unresolved_flavor; if let PolygonValue::Unknown = left { if condition_flavor_76_4 < 1 { condition_flavor_76_4 = 1; }; }; if let PolygonValue::Unknown = left { return float8_unresolved(condition_flavor_76_4); }; let mut condition_flavor_76_90: i32 = unresolved_flavor; if let PolygonValue::Unimplemented = left { condition_flavor_76_90 = 2; }; if let PolygonValue::Unimplemented = left { return float8_unresolved(condition_flavor_76_90); };
    let mut condition_flavor_77_4: i32 = unresolved_flavor; if let PolygonValue::Unknown = right { if condition_flavor_77_4 < 1 { condition_flavor_77_4 = 1; }; }; if let PolygonValue::Unknown = right { return float8_unresolved(condition_flavor_77_4); }; let mut condition_flavor_77_91: i32 = unresolved_flavor; if let PolygonValue::Unimplemented = right { condition_flavor_77_91 = 2; }; if let PolygonValue::Unimplemented = right { return float8_unresolved(condition_flavor_77_91); };
    if let PolygonValue::Null = left { return Float8Value::Null; };
    if let PolygonValue::Null = right { return Float8Value::Null; };
    if let PolygonValue::Value(a) = left {
        if let PolygonValue::Value(b) = right {
            let a_bounds = a.bounds;
            let b_bounds = b.bounds;
            let a_path = PathPayload { closed: true, points: a.points };
            let b_path = PathPayload { closed: true, points: b.points };
            let overlap = polygon_paths_overlap(&a_path, &b_path, a_bounds, b_bounds);
            if let BoolValue::Error(error) = overlap { return Float8Value::Error(error); };
            if overlap == BoolValue::Value(true) { return make_float8_value(0.0f64); };
            if overlap != BoolValue::Value(false) { return float8_unresolved(unresolved_flavor); };
            return sql__pg_catalog__path_distance__3309(PathValue::Value(a_path), PathValue::Value(b_path));
        };
    };
    float8_unresolved(unresolved_flavor)
}
