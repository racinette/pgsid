pub fn sql__pg_catalog__poly_npoints__qi4n(input: PolygonValue) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let PolygonValue::Unknown = input { unresolved_flavor = 1; };
    if let PolygonValue::Unimplemented = input { unresolved_flavor = 2; };
    if let PolygonValue::Error(error) = input {
        return Int4Value::Error(error);
    };
    if let PolygonValue::Null = input {
        return Int4Value::Null;
    };
    if let PolygonValue::Value(value) = input {
        return make_int4_value(value.points.len() as i32);
    };
    int4_unresolved(unresolved_flavor)
}
pub fn sql__pg_catalog__npoints__yk02(input: PolygonValue) -> Int4Value {
    sql__pg_catalog__poly_npoints__qi4n(input)
}
pub fn sql__pg_catalog__poly_send__38c4(input: PolygonValue) -> ByteaValue {
    let mut unresolved_flavor: i32 = 0;
    if let PolygonValue::Unknown = input { unresolved_flavor = 1; };
    if let PolygonValue::Unimplemented = input { unresolved_flavor = 2; };
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
            let mut condition_flavor_48_12: i32 = unresolved_flavor; if let ByteaValue::Unknown = encoded { if condition_flavor_48_12 < 1 { condition_flavor_48_12 = 1; }; }; if let ByteaValue::Unimplemented = encoded { condition_flavor_48_12 = 2; }; if (encoded == ByteaValue::Unknown || encoded == ByteaValue::Unimplemented) || encoded == ByteaValue::Null {
                return bytea_unresolved(condition_flavor_48_12);
            };
            if let ByteaValue::Value(bytes) = encoded {
                output.push_str(bytes.as_str());
            };
            index += 1;
        }
        return ByteaValue::Value(output);
    };
    bytea_unresolved(unresolved_flavor)
}
pub fn sql__pg_catalog__poly_same__7cvi(left: PolygonValue, right: PolygonValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let PolygonValue::Unknown = left { unresolved_flavor = 1; };
    if let PolygonValue::Unknown = right { unresolved_flavor = 1; };
    if let PolygonValue::Unimplemented = left { unresolved_flavor = 2; };
    if let PolygonValue::Unimplemented = right { unresolved_flavor = 2; };
    if let PolygonValue::Error(error) = left {
        return BoolValue::Error(error);
    };
    if let PolygonValue::Error(error) = right {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_72_4: i32 = unresolved_flavor; if let PolygonValue::Unknown = left { if condition_flavor_72_4 < 1 { condition_flavor_72_4 = 1; }; }; if let PolygonValue::Unknown = left {
        return bool_unresolved(condition_flavor_72_4);
    }; let mut condition_flavor_74_7: i32 = unresolved_flavor; if let PolygonValue::Unimplemented = left { condition_flavor_74_7 = 2; }; if let PolygonValue::Unimplemented = left {
        return bool_unresolved(condition_flavor_74_7);
    };
    let mut condition_flavor_77_4: i32 = unresolved_flavor; if let PolygonValue::Unknown = right { if condition_flavor_77_4 < 1 { condition_flavor_77_4 = 1; }; }; if let PolygonValue::Unknown = right {
        return bool_unresolved(condition_flavor_77_4);
    }; let mut condition_flavor_79_7: i32 = unresolved_flavor; if let PolygonValue::Unimplemented = right { condition_flavor_79_7 = 2; }; if let PolygonValue::Unimplemented = right {
        return bool_unresolved(condition_flavor_79_7);
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
                return bool_unresolved(unresolved_flavor);
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
    bool_unresolved(unresolved_flavor)
}
pub fn sql__pg_catalog__path__jw9h(input: PolygonValue) -> PathValue {
    let mut unresolved_flavor: i32 = 0;
    if let PolygonValue::Unknown = input { unresolved_flavor = 1; };
    if let PolygonValue::Unimplemented = input { unresolved_flavor = 2; };
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
    path_unresolved(unresolved_flavor)
}
pub fn sql__pg_catalog__polygon__ddxi(input: PathValue) -> PolygonValue {
    let mut unresolved_flavor: i32 = 0;
    if let PathValue::Unknown = input { unresolved_flavor = 1; };
    if let PathValue::Unimplemented = input { unresolved_flavor = 2; };
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
    polygon_unresolved(unresolved_flavor)
}
pub fn sql__pg_catalog__box__j3b7(input: PolygonValue) -> BoxValue {
    let mut unresolved_flavor: i32 = 0;
    if let PolygonValue::Unknown = input { unresolved_flavor = 1; };
    if let PolygonValue::Unimplemented = input { unresolved_flavor = 2; };
    if let PolygonValue::Error(error) = input {
        return BoxValue::Error(error);
    };
    if let PolygonValue::Null = input {
        return BoxValue::Null;
    };
    if let PolygonValue::Value(value) = input {
        return value.bounds;
    };
    box_unresolved(unresolved_flavor)
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
    let mut unresolved_flavor: i32 = 0;
    if let BoxValue::Unknown = input { unresolved_flavor = 1; };
    if let BoxValue::NonNull = input { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let BoxValue::Unimplemented = input { unresolved_flavor = 2; };
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
    polygon_unresolved(unresolved_flavor)
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
