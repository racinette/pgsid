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
    if let PointValue::Error(error) = left {
        return BoolValue::Error(error);
    };
    if let PointValue::Error(error) = right {
        return BoolValue::Error(error);
    };
    if left == PointValue::Unknown || right == PointValue::Unknown {
        return BoolValue::Unknown;
    };
    if left == PointValue::Null || right == PointValue::Null {
        return BoolValue::Null;
    };
    if let PointValue::Value(a) = left {
        if let PointValue::Value(b) = right {
            return make_bool_value(point_same_value(a, b) != negate);
        };
    };
    BoolValue::Unknown
}
pub fn sql__pg_catalog__point_eq__5be0(left: PointValue, right: PointValue) -> BoolValue {
    point_same(left, right, false)
}
pub fn sql__pg_catalog__point_ne__jppg(left: PointValue, right: PointValue) -> BoolValue {
    point_same(left, right, true)
}
pub fn sql__pg_catalog__point__db27(x: Float8Value, y: Float8Value) -> PointValue {
    if let Float8Value::Error(error) = x {
        return PointValue::Error(error);
    };
    if let Float8Value::Error(error) = y {
        return PointValue::Error(error);
    };
    if x == Float8Value::Unknown || y == Float8Value::Unknown {
        return PointValue::Unknown;
    };
    if x == Float8Value::Null || y == Float8Value::Null {
        return PointValue::Null;
    };
    if let Float8Value::Value(x_bits) = x {
        if let Float8Value::Value(y_bits) = y {
            return make_point_bits(x_bits, y_bits);
        };
    };
    PointValue::Unknown
}
pub fn sql__pg_catalog__point_send__kuoa(input: PointValue) -> ByteaValue {
    if let PointValue::Error(error) = input {
        return ByteaValue::Error(error);
    };
    if input == PointValue::Null {
        return ByteaValue::Null;
    };
    if let PointValue::Value(point) = input {
        let x = binary_send_bits(Int8Value::Value(point.x), 8);
        let y = binary_send_bits(Int8Value::Value(point.y), 8);
        return sql__pg_catalog__byteacat__zitv(x, y);
    };
    ByteaValue::Unknown
}
