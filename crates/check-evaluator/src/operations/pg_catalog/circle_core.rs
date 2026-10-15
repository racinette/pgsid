fn circle_from_center_radius(center: PointValue, radius: Float8Value) -> CircleValue {
    if let PointValue::Error(error) = center {
        return CircleValue::Error(error);
    };
    if let Float8Value::Error(error) = radius {
        return CircleValue::Error(error);
    };
    if center == PointValue::Unknown || radius == Float8Value::Unknown {
        return CircleValue::Unknown;
    };
    if center == PointValue::Null || radius == Float8Value::Null {
        return CircleValue::Null;
    };
    let semantic = float8_semantic(radius);
    if let PointValue::Value(point) = center {
        if let Float8Value::Value(bits) = semantic {
            return CircleValue::Value(CirclePayload {
                x: point.x,
                y: point.y,
                radius: bits,
                wire_known: point.wire_known && radius != Float8Value::UnspecifiedNan,
            });
        };
    };
    CircleValue::Unknown
}
fn circle_center_value(input: CircleValue) -> PointValue {
    if let CircleValue::Error(error) = input {
        return PointValue::Error(error);
    };
    if input == CircleValue::Null {
        return PointValue::Null;
    };
    if let CircleValue::Value(value) = input {
        return PointValue::Value(PointPayload {
            x: value.x,
            y: value.y,
            wire_known: value.wire_known
                || (float8_number(value.x) == float8_number(value.x)
                    && float8_number(value.y) == float8_number(value.y)),
        });
    };
    PointValue::Unknown
}
fn circle_radius_value(input: CircleValue) -> Float8Value {
    if let CircleValue::Error(error) = input {
        return Float8Value::Error(error);
    };
    if input == CircleValue::Null {
        return Float8Value::Null;
    };
    if let CircleValue::Value(value) = input {
        let number = float8_number(value.radius);
        if value.wire_known == false && number != number {
            return Float8Value::UnspecifiedNan;
        };
        return make_float8_bits(value.radius);
    };
    Float8Value::Unknown
}
fn circle_area_value(input: CircleValue) -> Float8Value {
    let radius = circle_radius_value(input);
    box_computed_scalar(sql__pg_catalog__float8mul__d3nd(
        sql__pg_catalog__float8mul__d3nd(radius, radius),
        make_float8_value(3.141592653589793f64),
    ))
}
fn circle_pair_status(left: CircleValue, right: CircleValue) -> BoolValue {
    if let CircleValue::Error(error) = left {
        return BoolValue::Error(error);
    };
    if let CircleValue::Error(error) = right {
        return BoolValue::Error(error);
    };
    if left == CircleValue::Unknown || right == CircleValue::Unknown {
        return BoolValue::Unknown;
    };
    if left == CircleValue::Null || right == CircleValue::Null {
        return BoolValue::Null;
    };
    make_bool_value(true)
}
fn circle_area_relation(left: CircleValue, right: CircleValue, mode: i32) -> BoolValue {
    let status = circle_pair_status(left, right);
    if status != BoolValue::Value(true) {
        return status;
    };
    let first = circle_area_value(left);
    if let Float8Value::Error(error) = first {
        return BoolValue::Error(error);
    };
    let second = circle_area_value(right);
    if let Float8Value::Error(error) = second {
        return BoolValue::Error(error);
    };
    let a = float8_semantic(first);
    let b = float8_semantic(second);
    if let Float8Value::Value(aa) = a {
        if let Float8Value::Value(bb) = b {
            let x = float8_number(aa);
            let y = float8_number(bb);
            if mode == 0 {
                return make_bool_value(geometric_coordinate_equal(x, y));
            };
            if mode == 1 {
                return make_bool_value(x + 0.000001f64 < y);
            };
            if mode == 2 {
                return make_bool_value(x > y + 0.000001f64);
            };
            if mode == 3 {
                return make_bool_value(x <= y + 0.000001f64);
            };
            if mode == 4 {
                return make_bool_value(x + 0.000001f64 >= y);
            };
            return make_bool_value(x != y && (x - y).abs() > 0.000001f64);
        };
    };
    BoolValue::Unknown
}
fn circle_same_value(left: CircleValue, right: CircleValue) -> BoolValue {
    let status = circle_pair_status(left, right);
    if status != BoolValue::Value(true) {
        return status;
    };
    let a = float8_semantic(circle_radius_value(left));
    let b = float8_semantic(circle_radius_value(right));
    if let Float8Value::Value(aa) = a {
        if let Float8Value::Value(bb) = b {
            let x = float8_number(aa);
            let y = float8_number(bb);
            if (x != x && y != y) || geometric_coordinate_equal(x, y) {
                return sql__pg_catalog__point_eq__5be0(
                    circle_center_value(left),
                    circle_center_value(right),
                );
            };
            return make_bool_value(false);
        };
    };
    BoolValue::Unknown
}
fn circle_binary(input: CircleValue) -> ByteaValue {
    if let CircleValue::Error(error) = input {
        return ByteaValue::Error(error);
    };
    if input == CircleValue::Null {
        return ByteaValue::Null;
    };
    if let CircleValue::Value(value) = input {
        if value.wire_known == false {
            return ByteaValue::Unspecified(24);
        };
        return sql__pg_catalog__byteacat__zitv(
            sql__pg_catalog__point_send__kuoa(circle_center_value(input)),
            sql__pg_catalog__float8send__3bqt(circle_radius_value(input)),
        );
    };
    ByteaValue::Unknown
}
fn circle_inscribed_box(input: CircleValue) -> BoxValue {
    if let CircleValue::Error(error) = input {
        return BoxValue::Error(error);
    };
    if input == CircleValue::Null {
        return BoxValue::Null;
    };
    if let CircleValue::Value(_) = input {
        let center = circle_center_value(input);
        if let PointValue::Value(point) = center {
            let delta = sql__pg_catalog__float8div__kumj(
                circle_radius_value(input),
                make_float8_value(1.4142135623730951f64),
            );
            let x = line_origin_coordinate(point, false);
            let y = line_origin_coordinate(point, true);
            return box_from_scalars(
                box_computed_scalar(sql__pg_catalog__float8pl__g3ou(x, delta)),
                box_computed_scalar(sql__pg_catalog__float8pl__g3ou(y, delta)),
                box_computed_scalar(sql__pg_catalog__float8mi__r1nu(x, delta)),
                box_computed_scalar(sql__pg_catalog__float8mi__r1nu(y, delta)),
            );
        };
    };
    BoxValue::Unknown
}
fn circle_from_box(input: BoxValue) -> CircleValue {
    let center = box_midpoint(input);
    let radius = sql__pg_catalog__point_distance__2haq(center, box_endpoint(input, false));
    circle_from_center_radius(center, radius)
}

pub fn sql__pg_catalog__circle_send__ff2a(input: CircleValue) -> ByteaValue {
    circle_binary(input)
}

pub fn sql__pg_catalog__area__73c3(input: CircleValue) -> Float8Value {
    circle_area_value(input)
}

pub fn sql__pg_catalog__box__pdgq(input: CircleValue) -> BoxValue {
    circle_inscribed_box(input)
}

pub fn sql__pg_catalog__center__rr17(input: CircleValue) -> PointValue {
    circle_center_value(input)
}

pub fn sql__pg_catalog__circle__7fah(input: BoxValue) -> CircleValue {
    circle_from_box(input)
}

pub fn sql__pg_catalog__circle__e6o0(center: PointValue, radius: Float8Value) -> CircleValue {
    circle_from_center_radius(center, radius)
}

pub fn sql__pg_catalog__circle_center__48y8(input: CircleValue) -> PointValue {
    circle_center_value(input)
}

pub fn sql__pg_catalog__circle_eq__wkhc(left: CircleValue, right: CircleValue) -> BoolValue {
    circle_area_relation(left, right, 0)
}

pub fn sql__pg_catalog__circle_ge__66rr(left: CircleValue, right: CircleValue) -> BoolValue {
    circle_area_relation(left, right, 4)
}

pub fn sql__pg_catalog__circle_gt__p2vj(left: CircleValue, right: CircleValue) -> BoolValue {
    circle_area_relation(left, right, 2)
}

pub fn sql__pg_catalog__circle_le__1z8z(left: CircleValue, right: CircleValue) -> BoolValue {
    circle_area_relation(left, right, 3)
}

pub fn sql__pg_catalog__circle_lt__kxb1(left: CircleValue, right: CircleValue) -> BoolValue {
    circle_area_relation(left, right, 1)
}

pub fn sql__pg_catalog__circle_ne__ofb9(left: CircleValue, right: CircleValue) -> BoolValue {
    circle_area_relation(left, right, 5)
}

pub fn sql__pg_catalog__circle_same__1h7o(left: CircleValue, right: CircleValue) -> BoolValue {
    circle_same_value(left, right)
}

pub fn sql__pg_catalog__diameter__e50j(input: CircleValue) -> Float8Value {
    box_computed_scalar(sql__pg_catalog__float8mul__d3nd(
        circle_radius_value(input),
        make_float8_value(2.0f64),
    ))
}

pub fn sql__pg_catalog__point__89o1(input: CircleValue) -> PointValue {
    circle_center_value(input)
}

pub fn sql__pg_catalog__radius__0qp3(input: CircleValue) -> Float8Value {
    circle_radius_value(input)
}
