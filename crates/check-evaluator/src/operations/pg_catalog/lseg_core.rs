fn lseg_endpoint(input: LsegValue, second: bool) -> PointValue {
    if let LsegValue::Error(error) = input {
        return PointValue::Error(error);
    };
    if input == LsegValue::Null {
        return PointValue::Null;
    };
    if let LsegValue::Value(value) = input {
        let mut x = value.x1;
        let mut y = value.y1;
        if second {
            x = value.x2;
            y = value.y2;
        };
        return PointValue::Value(PointPayload {
            x,
            y,
            wire_known: value.wire_known
                || (float8_number(x) == float8_number(x) && float8_number(y) == float8_number(y)),
        });
    };
    PointValue::Unknown
}
pub fn sql__pg_catalog__lseg__l9bc(left: PointValue, right: PointValue) -> LsegValue {
    if let PointValue::Error(error) = left {
        return LsegValue::Error(error);
    };
    if let PointValue::Error(error) = right {
        return LsegValue::Error(error);
    };
    if left == PointValue::Unknown || right == PointValue::Unknown {
        return LsegValue::Unknown;
    };
    if left == PointValue::Null || right == PointValue::Null {
        return LsegValue::Null;
    };
    if let PointValue::Value(a) = left {
        if let PointValue::Value(b) = right {
            return LsegValue::Value(LsegPayload {
                x1: a.x,
                y1: a.y,
                x2: b.x,
                y2: b.y,
                wire_known: a.wire_known && b.wire_known,
            });
        };
    };
    LsegValue::Unknown
}
pub fn sql__pg_catalog__lseg_send__kc2a(input: LsegValue) -> ByteaValue {
    if let LsegValue::Error(error) = input {
        return ByteaValue::Error(error);
    };
    if input == LsegValue::Null {
        return ByteaValue::Null;
    };
    if let LsegValue::Value(value) = input {
        if value.wire_known == false {
            return ByteaValue::Unknown;
        };
        let first = sql__pg_catalog__point_send__kuoa(lseg_endpoint(input, false));
        let second = sql__pg_catalog__point_send__kuoa(lseg_endpoint(input, true));
        return sql__pg_catalog__byteacat__zitv(first, second);
    };
    ByteaValue::Unknown
}
fn lseg_equal(left: LsegValue, right: LsegValue, different: bool) -> BoolValue {
    if let LsegValue::Error(error) = left {
        return BoolValue::Error(error);
    };
    if let LsegValue::Error(error) = right {
        return BoolValue::Error(error);
    };
    if left == LsegValue::Unknown || right == LsegValue::Unknown {
        return BoolValue::Unknown;
    };
    if left == LsegValue::Null || right == LsegValue::Null {
        return BoolValue::Null;
    };
    let first =
        sql__pg_catalog__point_eq__5be0(lseg_endpoint(left, false), lseg_endpoint(right, false));
    if first == BoolValue::Value(false) {
        return make_bool_value(different);
    };
    let second =
        sql__pg_catalog__point_eq__5be0(lseg_endpoint(left, true), lseg_endpoint(right, true));
    if let BoolValue::Value(value) = second {
        return make_bool_value(value != different);
    };
    second
}
fn lseg_length_value(input: LsegValue) -> Float8Value {
    sql__pg_catalog__point_distance__2haq(lseg_endpoint(input, false), lseg_endpoint(input, true))
}
fn lseg_length_relation(left: LsegValue, right: LsegValue, mode: i32) -> BoolValue {
    if let LsegValue::Error(error) = left {
        return BoolValue::Error(error);
    };
    if let LsegValue::Error(error) = right {
        return BoolValue::Error(error);
    };
    if left == LsegValue::Unknown || right == LsegValue::Unknown {
        return BoolValue::Unknown;
    };
    if left == LsegValue::Null || right == LsegValue::Null {
        return BoolValue::Null;
    };
    let first = lseg_length_value(left);
    if let Float8Value::Error(error) = first {
        return BoolValue::Error(error);
    };
    let second = lseg_length_value(right);
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
                return make_bool_value(x + 0.000001f64 < y);
            };
            if mode == 1 {
                return make_bool_value(x <= y + 0.000001f64);
            };
            if mode == 2 {
                return make_bool_value(x > y + 0.000001f64);
            };
            return make_bool_value(x + 0.000001f64 >= y);
        };
    };
    BoolValue::Unknown
}
fn lseg_midpoint(input: LsegValue) -> PointValue {
    if let LsegValue::Error(error) = input {
        return PointValue::Error(error);
    };
    if input == LsegValue::Null {
        return PointValue::Null;
    };
    if let LsegValue::Value(value) = input {
        let two = make_float8_value(2.0f64);
        let x = sql__pg_catalog__float8div__kumj(
            sql__pg_catalog__float8pl__g3ou(make_float8_bits(value.x1), make_float8_bits(value.x2)),
            two,
        );
        let y = sql__pg_catalog__float8div__kumj(
            sql__pg_catalog__float8pl__g3ou(make_float8_bits(value.y1), make_float8_bits(value.y2)),
            two,
        );
        return point_arithmetic_result(x, y);
    };
    PointValue::Unknown
}
fn lseg_orientation(input: LsegValue, vertical: bool) -> BoolValue {
    if vertical {
        return sql__pg_catalog__point_vert__v6kr(
            lseg_endpoint(input, false),
            lseg_endpoint(input, true),
        );
    };
    sql__pg_catalog__point_horiz__tsjw(lseg_endpoint(input, false), lseg_endpoint(input, true))
}
fn lseg_slope(input: LsegValue, inverse: bool) -> Float8Value {
    if inverse == false {
        return sql__pg_catalog__slope__xxph(
            lseg_endpoint(input, false),
            lseg_endpoint(input, true),
        );
    };
    if let LsegValue::Error(error) = input {
        return Float8Value::Error(error);
    };
    if input == LsegValue::Null {
        return Float8Value::Null;
    };
    if let LsegValue::Value(value) = input {
        if geometric_coordinate_equal(float8_number(value.x1), float8_number(value.x2)) {
            return make_float8_bits(0i64);
        };
        if geometric_coordinate_equal(float8_number(value.y1), float8_number(value.y2)) {
            return make_float8_bits(9218868437227405312i64);
        };
        let x =
            sql__pg_catalog__float8mi__r1nu(make_float8_bits(value.x1), make_float8_bits(value.x2));
        let y =
            sql__pg_catalog__float8mi__r1nu(make_float8_bits(value.y2), make_float8_bits(value.y1));
        return sql__pg_catalog__float8div__kumj(x, y);
    };
    Float8Value::Unknown
}
fn lseg_direction_relation(left: LsegValue, right: LsegValue, perpendicular: bool) -> BoolValue {
    if let LsegValue::Error(error) = left {
        return BoolValue::Error(error);
    };
    if let LsegValue::Error(error) = right {
        return BoolValue::Error(error);
    };
    if left == LsegValue::Unknown || right == LsegValue::Unknown {
        return BoolValue::Unknown;
    };
    if left == LsegValue::Null || right == LsegValue::Null {
        return BoolValue::Null;
    };
    let first = lseg_slope(left, false);
    if let Float8Value::Error(error) = first {
        return BoolValue::Error(error);
    };
    let second = lseg_slope(right, perpendicular);
    if let Float8Value::Error(error) = second {
        return BoolValue::Error(error);
    };
    let a = float8_semantic(first);
    let b = float8_semantic(second);
    if let Float8Value::Value(aa) = a {
        if let Float8Value::Value(bb) = b {
            return make_bool_value(geometric_coordinate_equal(
                float8_number(aa),
                float8_number(bb),
            ));
        };
    };
    BoolValue::Unknown
}
pub fn sql__pg_catalog__lseg_eq__n70t(left: LsegValue, right: LsegValue) -> BoolValue {
    lseg_equal(left, right, false)
}
pub fn sql__pg_catalog__lseg_ne__92bg(left: LsegValue, right: LsegValue) -> BoolValue {
    lseg_equal(left, right, true)
}
pub fn sql__pg_catalog__lseg_lt__0qau(left: LsegValue, right: LsegValue) -> BoolValue {
    lseg_length_relation(left, right, 0)
}
pub fn sql__pg_catalog__lseg_le__9ys9(left: LsegValue, right: LsegValue) -> BoolValue {
    lseg_length_relation(left, right, 1)
}
pub fn sql__pg_catalog__lseg_gt__3lw7(left: LsegValue, right: LsegValue) -> BoolValue {
    lseg_length_relation(left, right, 2)
}
pub fn sql__pg_catalog__lseg_ge__01d3(left: LsegValue, right: LsegValue) -> BoolValue {
    lseg_length_relation(left, right, 3)
}
pub fn sql__pg_catalog__lseg_length__giky(input: LsegValue) -> Float8Value {
    lseg_length_value(input)
}
pub fn sql__pg_catalog__length__x073(input: LsegValue) -> Float8Value {
    lseg_length_value(input)
}
pub fn sql__pg_catalog__lseg_center__bvk0(input: LsegValue) -> PointValue {
    lseg_midpoint(input)
}
pub fn sql__pg_catalog__point__2g95(input: LsegValue) -> PointValue {
    lseg_midpoint(input)
}
pub fn sql__pg_catalog__lseg_horizontal__zy1e(input: LsegValue) -> BoolValue {
    lseg_orientation(input, false)
}
pub fn sql__pg_catalog__ishorizontal__7dxs(input: LsegValue) -> BoolValue {
    lseg_orientation(input, false)
}
pub fn sql__pg_catalog__lseg_vertical__jrht(input: LsegValue) -> BoolValue {
    lseg_orientation(input, true)
}
pub fn sql__pg_catalog__isvertical__9238(input: LsegValue) -> BoolValue {
    lseg_orientation(input, true)
}
pub fn sql__pg_catalog__lseg_parallel__8wqn(left: LsegValue, right: LsegValue) -> BoolValue {
    lseg_direction_relation(left, right, false)
}
pub fn sql__pg_catalog__isparallel__r9lg(left: LsegValue, right: LsegValue) -> BoolValue {
    lseg_direction_relation(left, right, false)
}
pub fn sql__pg_catalog__lseg_perp__roic(left: LsegValue, right: LsegValue) -> BoolValue {
    lseg_direction_relation(left, right, true)
}
pub fn sql__pg_catalog__isperp__gnoe(left: LsegValue, right: LsegValue) -> BoolValue {
    lseg_direction_relation(left, right, true)
}
