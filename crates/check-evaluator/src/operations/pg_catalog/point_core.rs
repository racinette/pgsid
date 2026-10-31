fn point_same_value(left: PointPayload, right: PointPayload) -> bool {
    let x = float8_number(left.x);
    let y = float8_number(left.y);
    let other_x = float8_number(right.x);
    let other_y = float8_number(right.y);
    if x != x || y != y || other_x != other_x || other_y != other_y {
        return (x == other_x || (x != x && other_x != other_x))
            && (y == other_y || (y != y && other_y != other_y));
    };
    (x == other_x || (x - other_x).abs() <= 0.000001f64)
        && (y == other_y || (y - other_y).abs() <= 0.000001f64)
}
fn point_same(left: PointValue, right: PointValue, negate: bool) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let PointValue::Unknown = left { unresolved_flavor = 1; };
    if let PointValue::Unknown = right { unresolved_flavor = 1; };
    if let PointValue::Unimplemented = left { unresolved_flavor = 2; };
    if let PointValue::Unimplemented = right { unresolved_flavor = 2; };
    if let PointValue::Error(error) = left {
        return BoolValue::Error(error);
    };
    if let PointValue::Error(error) = right {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_25_4: i32 = unresolved_flavor; if let PointValue::Unknown = left { if condition_flavor_25_4 < 1 { condition_flavor_25_4 = 1; }; }; if let PointValue::Unimplemented = left { condition_flavor_25_4 = 2; }; if let PointValue::Unknown = right { if condition_flavor_25_4 < 1 { condition_flavor_25_4 = 1; }; }; if let PointValue::Unimplemented = right { condition_flavor_25_4 = 2; }; if (left == PointValue::Unknown || left == PointValue::Unimplemented) || (right == PointValue::Unknown || right == PointValue::Unimplemented) {
        return bool_unresolved(condition_flavor_25_4);
    };
    if left == PointValue::Null || right == PointValue::Null {
        return BoolValue::Null;
    };
    if let PointValue::Value(a) = left {
        if let PointValue::Value(b) = right {
            return make_bool_value(point_same_value(a, b) != negate);
        };
    };
    bool_unresolved(unresolved_flavor)
}
pub fn sql__pg_catalog__point_eq__5be0(left: PointValue, right: PointValue) -> BoolValue {
    point_same(left, right, false)
}
pub fn sql__pg_catalog__point_ne__jppg(left: PointValue, right: PointValue) -> BoolValue {
    point_same(left, right, true)
}
pub fn sql__pg_catalog__point__db27(x: Float8Value, y: Float8Value) -> PointValue {
    let mut unresolved_flavor: i32 = 0;
    if let Float8Value::Unknown = x { unresolved_flavor = 1; };
    if let Float8Value::Unknown = y { unresolved_flavor = 1; };
    if let Float8Value::Unimplemented = x { unresolved_flavor = 2; };
    if let Float8Value::Unimplemented = y { unresolved_flavor = 2; };
    if let Float8Value::Error(error) = x {
        return PointValue::Error(error);
    };
    if let Float8Value::Error(error) = y {
        return PointValue::Error(error);
    };
    let mut condition_flavor_56_4: i32 = unresolved_flavor; if let Float8Value::Unknown = x { if condition_flavor_56_4 < 1 { condition_flavor_56_4 = 1; }; }; if let Float8Value::Unimplemented = x { condition_flavor_56_4 = 2; }; if let Float8Value::Unknown = y { if condition_flavor_56_4 < 1 { condition_flavor_56_4 = 1; }; }; if let Float8Value::Unimplemented = y { condition_flavor_56_4 = 2; }; if (x == Float8Value::Unknown || x == Float8Value::Unimplemented) || (y == Float8Value::Unknown || y == Float8Value::Unimplemented) {
        return point_unresolved(condition_flavor_56_4);
    };
    if x == Float8Value::Null || y == Float8Value::Null {
        return PointValue::Null;
    };
    let known_x = float8_semantic(x);
    let known_y = float8_semantic(y);
    if let Float8Value::Value(x_bits) = known_x {
        if let Float8Value::Value(y_bits) = known_y {
            let precise = x != Float8Value::UnspecifiedNan && y != Float8Value::UnspecifiedNan;
            return PointValue::Value(PointPayload { x: x_bits, y: y_bits, wire_known: precise });
        };
    };
    let mut local_flavor_70_4: i32 = unresolved_flavor; if let Float8Value::Unknown = known_y { if local_flavor_70_4 < 1 { local_flavor_70_4 = 1; }; }; if let Float8Value::Unimplemented = known_y { local_flavor_70_4 = 2; }; if let Float8Value::Unknown = known_x { if local_flavor_70_4 < 1 { local_flavor_70_4 = 1; }; }; if let Float8Value::Unimplemented = known_x { local_flavor_70_4 = 2; }; point_unresolved(local_flavor_70_4)
}
pub fn sql__pg_catalog__point_send__kuoa(input: PointValue) -> ByteaValue {
    let mut unresolved_flavor: i32 = 0;
    if let PointValue::Unknown = input { unresolved_flavor = 1; };
    if let PointValue::Unimplemented = input { unresolved_flavor = 2; };
    if let PointValue::Error(error) = input {
        return ByteaValue::Error(error);
    };
    if input == PointValue::Null {
        return ByteaValue::Null;
    };
    if let PointValue::Value(point) = input {
        if point.wire_known == false {
            return ByteaValue::Unspecified(16);
        };
        let x = binary_send_bits(Int8Value::Value(point.x), 8);
        let y = binary_send_bits(Int8Value::Value(point.y), 8);
        return sql__pg_catalog__byteacat__zitv(x, y);
    };
    bytea_unresolved(unresolved_flavor)
}
