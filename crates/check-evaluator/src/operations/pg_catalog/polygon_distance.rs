fn polygon_point_distance(point: PointPayload, polygon: &PathPayload) -> Float8Value {
    if polygon.points.len() == 0 { return Float8Value::Unknown; };
    let inside = closed_path_contains(point, polygon);
    if let BoolValue::Error(error) = inside { return Float8Value::Error(error); };
    if inside == BoolValue::Value(true) { return make_float8_value(0.0f64); };
    if inside != BoolValue::Value(false) { return Float8Value::Unknown; };
    // The closing segment's orientation affects its rounded projection.
    let closing = path_segment(polygon.points[0], polygon.points[polygon.points.len() - 1]);
    let mut distance = sql__pg_catalog__dist_sp__3dia(closing, PointValue::Value(point));
    if let Float8Value::Error(error) = distance { return Float8Value::Error(error); };
    if distance == Float8Value::Unknown { return Float8Value::Unknown; };
    let mut index: usize = 0;
    while index + 1 < polygon.points.len() {
        let edge = path_segment(polygon.points[index], polygon.points[index + 1]);
        let candidate = sql__pg_catalog__dist_sp__3dia(edge, PointValue::Value(point));
        distance = path_min_distance(distance, candidate, false);
        if let Float8Value::Error(error) = distance { return Float8Value::Error(error); };
        if distance == Float8Value::Unknown { return Float8Value::Unknown; };
        index += 1;
    }
    box_computed_scalar(distance)
}

pub fn sql__pg_catalog__dist_ppoly__r23k(point: PointValue, input: PolygonValue) -> Float8Value {
    if let PointValue::Error(error) = point { return Float8Value::Error(error); };
    if let PolygonValue::Error(error) = input { return Float8Value::Error(error); };
    if point == PointValue::Unknown { return Float8Value::Unknown; };
    if let PolygonValue::Unknown = input { return Float8Value::Unknown; };
    if point == PointValue::Null { return Float8Value::Null; };
    if let PolygonValue::Null = input { return Float8Value::Null; };
    if let PointValue::Value(position) = point {
        if let PolygonValue::Value(value) = input {
            let path = PathPayload { closed: true, points: value.points };
            return polygon_point_distance(position, &path);
        };
    };
    Float8Value::Unknown
}
pub fn sql__pg_catalog__dist_polyp__7ghe(input: PolygonValue, point: PointValue) -> Float8Value {
    if let PolygonValue::Error(error) = input { return Float8Value::Error(error); };
    sql__pg_catalog__dist_ppoly__r23k(point, input)
}
pub fn sql__pg_catalog__dist_cpoly__8q0w(input: CircleValue, polygon: PolygonValue) -> Float8Value {
    if let CircleValue::Error(error) = input { return Float8Value::Error(error); };
    if let PolygonValue::Error(error) = polygon { return Float8Value::Error(error); };
    if input == CircleValue::Unknown { return Float8Value::Unknown; };
    if let PolygonValue::Unknown = polygon { return Float8Value::Unknown; };
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
    if let PolygonValue::Error(error) = left { return Float8Value::Error(error); };
    if let PolygonValue::Error(error) = right { return Float8Value::Error(error); };
    if let PolygonValue::Unknown = left { return Float8Value::Unknown; };
    if let PolygonValue::Unknown = right { return Float8Value::Unknown; };
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
            if overlap != BoolValue::Value(false) { return Float8Value::Unknown; };
            return sql__pg_catalog__path_distance__3309(PathValue::Value(a_path), PathValue::Value(b_path));
        };
    };
    Float8Value::Unknown
}
