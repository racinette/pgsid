pub fn sql__pg_catalog__poly_npoints__qi4n(input: PolygonValue) -> Int4Value {
    if let PolygonValue::Error(error) = input {
        return Int4Value::Error(error);
    };
    if let PolygonValue::Null = input {
        return Int4Value::Null;
    };
    if let PolygonValue::Value(value) = input {
        return make_int4_value(value.points.len() as i32);
    };
    Int4Value::Unknown
}
pub fn sql__pg_catalog__npoints__yk02(input: PolygonValue) -> Int4Value {
    sql__pg_catalog__poly_npoints__qi4n(input)
}
pub fn sql__pg_catalog__poly_send__38c4(input: PolygonValue) -> ByteaValue {
    if let PolygonValue::Error(error) = input {
        return ByteaValue::Error(error);
    };
    if let PolygonValue::Null = input {
        return ByteaValue::Null;
    };
    if let PolygonValue::Value(value) = input {
        let maximum = usize::try_from((BYTEA_MAX_LENGTH - 4) / 16).unwrap_or(0);
        if value.points.len() > maximum {
            return ByteaValue::Error(make_sql_error(BYTEA_ALLOCATION_ERROR));
        };
        let encoded_count = binary_send_bits(make_int8_value(value.points.len() as i32 as i64), 4);
        let mut output = String::new();
        if let ByteaValue::Value(count) = encoded_count {
            output.push_str(count.as_str());
        };
        let mut index: usize = 0;
        while index < value.points.len() {
            let encoded = sql__pg_catalog__point_send__kuoa(PointValue::Value(value.points[index]));
            if let ByteaValue::Error(error) = encoded {
                return ByteaValue::Error(error);
            };
            if let ByteaValue::Unspecified(_) = encoded {
                return ByteaValue::Unspecified(4 + (value.points.len() as i32) * 16);
            };
            if encoded == ByteaValue::Unknown || encoded == ByteaValue::Null {
                return ByteaValue::Unknown;
            };
            if let ByteaValue::Value(bytes) = encoded {
                output.push_str(bytes.as_str());
            };
            index += 1;
        }
        return ByteaValue::Value(output);
    };
    ByteaValue::Unknown
}
pub fn sql__pg_catalog__poly_same__7cvi(left: PolygonValue, right: PolygonValue) -> BoolValue {
    if let PolygonValue::Error(error) = left {
        return BoolValue::Error(error);
    };
    if let PolygonValue::Error(error) = right {
        return BoolValue::Error(error);
    };
    if let PolygonValue::Unknown = left {
        return BoolValue::Unknown;
    };
    if let PolygonValue::Unknown = right {
        return BoolValue::Unknown;
    };
    if let PolygonValue::Null = left {
        return BoolValue::Null;
    };
    if let PolygonValue::Null = right {
        return BoolValue::Null;
    };
    if let PolygonValue::Value(a) = left {
        if let PolygonValue::Value(b) = right {
            if a.points.len() != b.points.len() {
                return make_bool_value(false);
            };
            if a.points.len() == 0 {
                return BoolValue::Unknown;
            };
            let mut start: usize = 0;
            while start < b.points.len() {
                if point_same_value(a.points[0], b.points[start]) {
                    let mut forward = true;
                    let mut backward = true;
                    let mut index: usize = 1;
                    while index < a.points.len() {
                        let mut next = start + index;
                        if next >= b.points.len() {
                            next = next - b.points.len();
                        };
                        let mut previous = start;
                        if start >= index {
                            previous = start - index;
                        } else {
                            previous = b.points.len() - (index - start);
                        };
                        if point_same_value(a.points[index], b.points[next]) == false {
                            forward = false;
                        };
                        if point_same_value(a.points[index], b.points[previous]) == false {
                            backward = false;
                        };
                        index += 1;
                    }
                    if forward || backward {
                        return make_bool_value(true);
                    };
                };
                start += 1;
            }
            return make_bool_value(false);
        };
    };
    BoolValue::Unknown
}
pub fn sql__pg_catalog__path__jw9h(input: PolygonValue) -> PathValue {
    if let PolygonValue::Error(error) = input {
        return PathValue::Error(error);
    };
    if let PolygonValue::Null = input {
        return PathValue::Null;
    };
    if let PolygonValue::Value(value) = input {
        return make_path_value(PathPayload {
            closed: true,
            points: value.points,
        });
    };
    PathValue::Unknown
}
pub fn sql__pg_catalog__polygon__ddxi(input: PathValue) -> PolygonValue {
    if let PathValue::Error(error) = input {
        return PolygonValue::Error(error);
    };
    if let PathValue::Null = input {
        return PolygonValue::Null;
    };
    if let PathValue::Value(value) = input {
        if value.closed == false {
            return PolygonValue::Error(make_sql_error(SQLSTATE_INVALID_PARAMETER_VALUE));
        };
        return make_polygon_points(PolygonPayload {
            points: value.points,
            bounds: BoxValue::Unknown,
        });
    };
    PolygonValue::Unknown
}
pub fn sql__pg_catalog__box__j3b7(input: PolygonValue) -> BoxValue {
    if let PolygonValue::Error(error) = input {
        return BoxValue::Error(error);
    };
    if let PolygonValue::Null = input {
        return BoxValue::Null;
    };
    if let PolygonValue::Value(value) = input {
        return value.bounds;
    };
    BoxValue::Unknown
}
fn polygon_box_corner(value: BoxPayload, high_x: bool, high_y: bool) -> PointPayload {
    let mut x = value.low_x;
    let mut y = value.low_y;
    if high_x {
        x = value.high_x;
    };
    if high_y {
        y = value.high_y;
    };
    let known = value.wire_known
        || (float8_number(x) == float8_number(x) && float8_number(y) == float8_number(y));
    PointPayload {
        x,
        y,
        wire_known: known,
    }
}
pub fn sql__pg_catalog__polygon__6ij1(input: BoxValue) -> PolygonValue {
    if let BoxValue::Error(error) = input {
        return PolygonValue::Error(error);
    };
    if input == BoxValue::Null {
        return PolygonValue::Null;
    };
    if let BoxValue::Value(value) = input {
        let mut points: Vec<PointPayload> = Vec::new();
        points.push(polygon_box_corner(value, false, false));
        points.push(polygon_box_corner(value, false, true));
        points.push(polygon_box_corner(value, true, true));
        points.push(polygon_box_corner(value, true, false));
        let bounds = box_from_points(box_endpoint(input, false), box_endpoint(input, true), false);
        return make_polygon_value(PolygonPayload { points, bounds });
    };
    PolygonValue::Unknown
}
pub fn sql__pg_catalog__pt_contained_poly__c1l4(
    point: PointValue,
    input: PolygonValue,
) -> BoolValue {
    if let PointValue::Error(error) = point {
        return BoolValue::Error(error);
    };
    sql__pg_catalog__on_ppath__8fo6(point, sql__pg_catalog__path__jw9h(input))
}
pub fn sql__pg_catalog__poly_contain_pt__jvrw(input: PolygonValue, point: PointValue) -> BoolValue {
    if let PolygonValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    sql__pg_catalog__pt_contained_poly__c1l4(point, input)
}
