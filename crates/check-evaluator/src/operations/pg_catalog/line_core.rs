fn line_equal_product(left: i64, right: i64, ratio: Float8Value) -> BoolValue {
    let product = sql__pg_catalog__float8mul__d3nd(ratio, make_float8_bits(right));
    if let Float8Value::Error(error) = product {
        return BoolValue::Error(error);
    };
    let known_product = float8_semantic(product);
    if let Float8Value::Value(bits) = known_product {
        return make_bool_value(geometric_coordinate_equal(float8_number(left), float8_number(bits)));
    };
    BoolValue::Unknown
}
pub fn sql__pg_catalog__line_eq__k687(left: LineValue, right: LineValue) -> BoolValue {
    if let LineValue::Error(error) = left {
        return BoolValue::Error(error);
    };
    if let LineValue::Error(error) = right {
        return BoolValue::Error(error);
    };
    if left == LineValue::Unknown || right == LineValue::Unknown {
        return BoolValue::Unknown;
    };
    if left == LineValue::Null || right == LineValue::Null {
        return BoolValue::Null;
    };
    if let LineValue::Value(a) = left {
        if let LineValue::Value(b) = right {
            let aa = float8_number(a.a);
            let ab = float8_number(a.b);
            let ac = float8_number(a.c);
            let ba = float8_number(b.a);
            let bb = float8_number(b.b);
            let bc = float8_number(b.c);
            if aa != aa || ab != ab || ac != ac || ba != ba || bb != bb || bc != bc {
                return make_bool_value(
                    (aa == ba || (aa != aa && ba != ba))
                        && (ab == bb || (ab != ab && bb != bb))
                        && (ac == bc || (ac != ac && bc != bc)),
                );
            };
            let mut ratio = make_float8_value(1.0f64);
            if geometric_coordinate_equal(ba, 0.0f64) == false {
                ratio = sql__pg_catalog__float8div__kumj(make_float8_bits(a.a), make_float8_bits(b.a));
            } else if geometric_coordinate_equal(bb, 0.0f64) == false {
                ratio = sql__pg_catalog__float8div__kumj(make_float8_bits(a.b), make_float8_bits(b.b));
            } else if geometric_coordinate_equal(bc, 0.0f64) == false {
                ratio = sql__pg_catalog__float8div__kumj(make_float8_bits(a.c), make_float8_bits(b.c));
            };
            if let Float8Value::Error(error) = ratio {
                return BoolValue::Error(error);
            };
            let first = line_equal_product(a.a, b.a, ratio);
            if first != BoolValue::Value(true) {
                return first;
            };
            let second = line_equal_product(a.b, b.b, ratio);
            if second != BoolValue::Value(true) {
                return second;
            };
            return line_equal_product(a.c, b.c, ratio);
        };
    };
    BoolValue::Unknown
}
fn line_orientation(input: LineValue, vertical: bool) -> BoolValue {
    if let LineValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if input == LineValue::Null {
        return BoolValue::Null;
    };
    if let LineValue::Value(value) = input {
        let mut coefficient = value.a;
        if vertical {
            coefficient = value.b;
        };
        return make_bool_value(geometric_coordinate_equal(float8_number(coefficient), 0.0f64));
    };
    BoolValue::Unknown
}
pub fn sql__pg_catalog__line_horizontal__swlw(input: LineValue) -> BoolValue {
    line_orientation(input, false)
}
pub fn sql__pg_catalog__ishorizontal__xhol(input: LineValue) -> BoolValue {
    line_orientation(input, false)
}
pub fn sql__pg_catalog__line_vertical__sa4t(input: LineValue) -> BoolValue {
    line_orientation(input, true)
}
pub fn sql__pg_catalog__isvertical__x62g(input: LineValue) -> BoolValue {
    line_orientation(input, true)
}
pub fn sql__pg_catalog__line_send__b5ct(input: LineValue) -> ByteaValue {
    if let LineValue::Error(error) = input {
        return ByteaValue::Error(error);
    };
    if input == LineValue::Null {
        return ByteaValue::Null;
    };
    if let LineValue::Value(value) = input {
        if value.wire_known == false {
            return ByteaValue::Unspecified(24);
        };
        let first = binary_send_bits(Int8Value::Value(value.a), 8);
        let second = binary_send_bits(Int8Value::Value(value.b), 8);
        let third = binary_send_bits(Int8Value::Value(value.c), 8);
        return sql__pg_catalog__byteacat__zitv(sql__pg_catalog__byteacat__zitv(first, second), third);
    };
    ByteaValue::Unknown
}
