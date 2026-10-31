const CIRCLE_POLYGON_ZERO_RADIUS: u32 = 466560;
const CIRCLE_POLYGON_POINT_LIMIT: u32 = 8584704;

fn circle_polygon_vertex(
    value: CirclePayload,
    radius: Float8Value,
    cosine: f64,
    sine: f64,
) -> PointValue {
    let center = PointPayload {
        x: value.x,
        y: value.y,
        wire_known: value.wire_known,
    };
    point_arithmetic_result(
        sql__pg_catalog__float8mi__r1nu(
            line_origin_coordinate(center, false),
            sql__pg_catalog__float8mul__d3nd(radius, make_float8_value(cosine)),
        ),
        sql__pg_catalog__float8pl__g3ou(
            line_origin_coordinate(center, true),
            sql__pg_catalog__float8mul__d3nd(radius, make_float8_value(sine)),
        ),
    )
}

pub fn sql__pg_catalog__polygon__9juc(
    count: Int4Value,
    input: CircleValue,
    fdlibm: bool,
) -> PolygonValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int4Value::Unknown = count { unresolved_flavor = 1; };
    if let CircleValue::Unknown = input { unresolved_flavor = 1; };
    if let Int4Value::Unimplemented = count { unresolved_flavor = 2; };
    if let CircleValue::Unimplemented = input { unresolved_flavor = 2; };
    if let Int4Value::Error(error) = count {
        return PolygonValue::Error(error);
    };
    if let CircleValue::Error(error) = input {
        return PolygonValue::Error(error);
    };
    let mut condition_flavor_43_4: i32 = unresolved_flavor; if let Int4Value::Unknown = count { if condition_flavor_43_4 < 1 { condition_flavor_43_4 = 1; }; }; if let Int4Value::Unimplemented = count { condition_flavor_43_4 = 2; }; if let CircleValue::Unknown = input { if condition_flavor_43_4 < 1 { condition_flavor_43_4 = 1; }; }; if let CircleValue::Unimplemented = input { condition_flavor_43_4 = 2; }; if (count == Int4Value::Unknown || count == Int4Value::Unimplemented) || (input == CircleValue::Unknown || input == CircleValue::Unimplemented) {
        return polygon_unresolved(condition_flavor_43_4);
    };
    if count == Int4Value::Null || input == CircleValue::Null {
        return PolygonValue::Null;
    };
    if let Int4Value::Value(n) = count {
        if let CircleValue::Value(value) = input {
            if float8_number(value.radius).abs() <= 0.000001f64 {
                return PolygonValue::Error(make_sql_error(CIRCLE_POLYGON_ZERO_RADIUS));
            };
            if n < 2 {
                return PolygonValue::Error(make_sql_error(SQLSTATE_INVALID_PARAMETER_VALUE));
            };
            if n > 134217725 {
                return PolygonValue::Error(make_sql_error(CIRCLE_POLYGON_POINT_LIMIT));
            };
            let radius = circle_radius_value(input);
            let first = circle_polygon_vertex(value, radius, 1.0f64, 0.0f64);
            if let PointValue::Error(error) = first {
                return PolygonValue::Error(error);
            };
            let mut condition_flavor_65_12: i32 = unresolved_flavor; if let PointValue::Unknown = first { if condition_flavor_65_12 < 1 { condition_flavor_65_12 = 1; }; }; if let PointValue::Unimplemented = first { condition_flavor_65_12 = 2; }; if (first == PointValue::Unknown || first == PointValue::Unimplemented) || first == PointValue::Null {
                return polygon_unresolved(condition_flavor_65_12);
            };
            if fdlibm == false {
                return polygon_unresolved(unresolved_flavor);
            };
            let mut points: Vec<PointPayload> = Vec::new();
            if let PointValue::Value(point) = first {
                points.push(point);
            };
            let step = 6.283185307179586f64 / (n as f64);
            let mut index: i32 = 1;
            while index < n {
                let angle = step * (index as f64);
                let point = circle_polygon_vertex(
                    value,
                    radius,
                    circle_trigonometry(angle, true),
                    circle_trigonometry(angle, false),
                );
                if let PointValue::Error(error) = point {
                    return PolygonValue::Error(error);
                };
                let mut condition_flavor_88_16: i32 = unresolved_flavor; if let PointValue::Unknown = point { if condition_flavor_88_16 < 1 { condition_flavor_88_16 = 1; }; }; if let PointValue::Unimplemented = point { condition_flavor_88_16 = 2; }; if (point == PointValue::Unknown || point == PointValue::Unimplemented) || point == PointValue::Null {
                    return polygon_unresolved(condition_flavor_88_16);
                };
                if let PointValue::Value(payload) = point {
                    points.push(payload);
                };
                index = index + 1;
            }
            return make_polygon_points(PolygonPayload {
                points,
                bounds: BoxValue::Unknown,
            });
        };
    };
    polygon_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__polygon__h16h(input: CircleValue, fdlibm: bool) -> PolygonValue {
    sql__pg_catalog__polygon__9juc(make_int4_value(12), input, fdlibm)
}
