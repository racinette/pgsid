fn polygon_circle(input: PolygonValue) -> CircleValue {
    if let PolygonValue::Error(error) = input {
        return CircleValue::Error(error);
    };
    if let PolygonValue::Null = input {
        return CircleValue::Null;
    };
    if let PolygonValue::Value(value) = input {
        if value.points.len() == 0 {
            return CircleValue::Unknown;
        };
        let mut center = sql__pg_catalog__point__db27(
            make_float8_value(0.0f64),
            make_float8_value(0.0f64),
        );
        let mut index: usize = 0;
        while index < value.points.len() {
            center = sql__pg_catalog__point_add__gn1v(center, PointValue::Value(value.points[index]));
            if let PointValue::Error(error) = center {
                return CircleValue::Error(error);
            };
            index += 1;
        }
        let count = make_float8_value(value.points.len() as i32 as f64);
        if let PointValue::Value(point) = center {
            center = point_arithmetic_result(
                sql__pg_catalog__float8div__kumj(line_origin_coordinate(point, false), count),
                sql__pg_catalog__float8div__kumj(line_origin_coordinate(point, true), count),
            );
        };
        if let PointValue::Error(error) = center {
            return CircleValue::Error(error);
        };
        let mut radius = make_float8_value(0.0f64);
        index = 0;
        while index < value.points.len() {
            radius = sql__pg_catalog__float8pl__g3ou(
                radius,
                sql__pg_catalog__point_distance__2haq(PointValue::Value(value.points[index]), center),
            );
            if let Float8Value::Error(error) = radius {
                return CircleValue::Error(error);
            };
            index += 1;
        }
        return circle_from_center_radius(center, sql__pg_catalog__float8div__kumj(radius, count));
    };
    CircleValue::Unknown
}

pub fn sql__pg_catalog__circle__jtgz(input: PolygonValue) -> CircleValue {
    polygon_circle(input)
}

pub fn sql__pg_catalog__poly_center__rocl(input: PolygonValue) -> PointValue {
    circle_center_value(polygon_circle(input))
}

pub fn sql__pg_catalog__point__0ix9(input: PolygonValue) -> PointValue {
    sql__pg_catalog__poly_center__rocl(input)
}
