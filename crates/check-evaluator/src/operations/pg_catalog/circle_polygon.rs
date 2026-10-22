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
    if let Int4Value::Error(error) = count {
        return PolygonValue::Error(error);
    };
    if let CircleValue::Error(error) = input {
        return PolygonValue::Error(error);
    };
    if count == Int4Value::Unknown || input == CircleValue::Unknown {
        return PolygonValue::Unknown;
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
            if first == PointValue::Unknown || first == PointValue::Null {
                return PolygonValue::Unknown;
            };
            if fdlibm == false {
                return PolygonValue::Unknown;
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
                if point == PointValue::Unknown || point == PointValue::Null {
                    return PolygonValue::Unknown;
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
    PolygonValue::Unknown
}

pub fn sql__pg_catalog__polygon__h16h(input: CircleValue, fdlibm: bool) -> PolygonValue {
    sql__pg_catalog__polygon__9juc(make_int4_value(12), input, fdlibm)
}
