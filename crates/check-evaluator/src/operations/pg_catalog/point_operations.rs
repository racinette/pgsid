fn point_arithmetic_result(x: Float8Value, y: Float8Value) -> PointValue {
    let result = sql__pg_catalog__point__db27(x, y);
    if let PointValue::Value(value) = result {
        let first = float8_number(value.x);
        let second = float8_number(value.y);
        if first != first || second != second {
            return PointValue::Value(PointPayload {
                x: value.x,
                y: value.y,
                wire_known: false,
            });
        };
    };
    result
}
fn geometric_coordinate_equal(a: f64, b: f64) -> bool {
    a == b || (a - b).abs() <= 0.000001f64
}
fn point_coordinate_relation(left: PointValue, right: PointValue, mode: i32) -> BoolValue {
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
            let mut first = float8_number(a.x);
            let mut second = float8_number(b.x);
            if mode >= 3 {
                first = float8_number(a.y);
                second = float8_number(b.y);
            };
            if mode == 0 || mode == 3 {
                return make_bool_value(first + 0.000001f64 < second);
            };
            if mode == 1 || mode == 4 {
                return make_bool_value(first > second + 0.000001f64);
            };
            return make_bool_value(geometric_coordinate_equal(first, second));
        };
    };
    BoolValue::Unknown
}
pub fn sql__pg_catalog__point_left__ipjy(left: PointValue, right: PointValue) -> BoolValue {
    point_coordinate_relation(left, right, 0)
}
pub fn sql__pg_catalog__point_right__sgly(left: PointValue, right: PointValue) -> BoolValue {
    point_coordinate_relation(left, right, 1)
}
pub fn sql__pg_catalog__point_vert__v6kr(left: PointValue, right: PointValue) -> BoolValue {
    point_coordinate_relation(left, right, 2)
}
pub fn sql__pg_catalog__isvertical__f50i(left: PointValue, right: PointValue) -> BoolValue {
    point_coordinate_relation(left, right, 2)
}
pub fn sql__pg_catalog__point_below__jsjs(left: PointValue, right: PointValue) -> BoolValue {
    point_coordinate_relation(left, right, 3)
}
pub fn sql__pg_catalog__point_above__pdwh(left: PointValue, right: PointValue) -> BoolValue {
    point_coordinate_relation(left, right, 4)
}
pub fn sql__pg_catalog__point_horiz__tsjw(left: PointValue, right: PointValue) -> BoolValue {
    point_coordinate_relation(left, right, 5)
}
pub fn sql__pg_catalog__ishorizontal__kubm(left: PointValue, right: PointValue) -> BoolValue {
    point_coordinate_relation(left, right, 5)
}

fn point_arithmetic(left: PointValue, right: PointValue, mode: i32) -> PointValue {
    if let PointValue::Error(error) = left {
        return PointValue::Error(error);
    };
    if let PointValue::Error(error) = right {
        return PointValue::Error(error);
    };
    if left == PointValue::Unknown || right == PointValue::Unknown {
        return PointValue::Unknown;
    };
    if left == PointValue::Null || right == PointValue::Null {
        return PointValue::Null;
    };
    if let PointValue::Value(a) = left {
        if let PointValue::Value(b) = right {
            let ax = make_float8_bits(a.x);
            let ay = make_float8_bits(a.y);
            let bx = make_float8_bits(b.x);
            let by = make_float8_bits(b.y);
            if mode == 0 {
                return point_arithmetic_result(
                    sql__pg_catalog__float8pl__g3ou(ax, bx),
                    sql__pg_catalog__float8pl__g3ou(ay, by),
                );
            };
            if mode == 1 {
                return point_arithmetic_result(
                    sql__pg_catalog__float8mi__r1nu(ax, bx),
                    sql__pg_catalog__float8mi__r1nu(ay, by),
                );
            };
            let xx = sql__pg_catalog__float8mul__d3nd(ax, bx);
            let yy = sql__pg_catalog__float8mul__d3nd(ay, by);
            let xy = sql__pg_catalog__float8mul__d3nd(ax, by);
            let yx = sql__pg_catalog__float8mul__d3nd(ay, bx);
            if mode == 2 {
                return point_arithmetic_result(
                    sql__pg_catalog__float8mi__r1nu(xx, yy),
                    sql__pg_catalog__float8pl__g3ou(xy, yx),
                );
            };
            let denominator = sql__pg_catalog__float8pl__g3ou(
                sql__pg_catalog__float8mul__d3nd(bx, bx),
                sql__pg_catalog__float8mul__d3nd(by, by),
            );
            if let Float8Value::Error(error) = denominator {
                return PointValue::Error(error);
            };
            let real = sql__pg_catalog__float8div__kumj(
                sql__pg_catalog__float8pl__g3ou(xx, yy),
                denominator,
            );
            let imaginary = sql__pg_catalog__float8div__kumj(
                sql__pg_catalog__float8mi__r1nu(yx, xy),
                denominator,
            );
            return point_arithmetic_result(real, imaginary);
        };
    };
    PointValue::Unknown
}
pub fn sql__pg_catalog__point_add__gn1v(left: PointValue, right: PointValue) -> PointValue {
    point_arithmetic(left, right, 0)
}
pub fn sql__pg_catalog__point_sub__o53k(left: PointValue, right: PointValue) -> PointValue {
    point_arithmetic(left, right, 1)
}
pub fn sql__pg_catalog__point_mul__9izx(left: PointValue, right: PointValue) -> PointValue {
    point_arithmetic(left, right, 2)
}
pub fn sql__pg_catalog__point_div__btbo(left: PointValue, right: PointValue) -> PointValue {
    point_arithmetic(left, right, 3)
}

fn geometric_hypot(first: Float8Value, second: Float8Value) -> Float8Value {
    if let Float8Value::Error(error) = first {
        return Float8Value::Error(error);
    };
    if let Float8Value::Error(error) = second {
        return Float8Value::Error(error);
    };
    if first == Float8Value::Unknown || second == Float8Value::Unknown {
        return Float8Value::Unknown;
    };
    if first == Float8Value::Null || second == Float8Value::Null {
        return Float8Value::Null;
    };
    if let Float8Value::Value(a) = first {
        if let Float8Value::Value(b) = second {
            let mut x = float8_number(a).abs();
            let mut y = float8_number(b).abs();
            let infinity = 1.0f64 / 0.0f64;
            if x == infinity || y == infinity {
                return make_float8_bits(9218868437227405312i64);
            };
            if x != x || y != y {
                return make_float8_bits(9221120237041090560i64);
            };
            if x < y {
                let saved = x;
                x = y;
                y = saved;
            };
            if y == 0.0f64 {
                return make_float8_value(x);
            };
            let ratio = y / x;
            let squared = ratio * ratio;
            let root = (1.0f64 + squared).sqrt();
            let result = x * root;
            if result == infinity || result == 0.0f64 {
                return Float8Value::Error(make_sql_error(FLOAT_CORE_RANGE));
            };
            return make_float8_value(result);
        };
    };
    Float8Value::Unknown
}
fn point_measurement(left: PointValue, right: PointValue, slope: bool) -> Float8Value {
    if let PointValue::Error(error) = left {
        return Float8Value::Error(error);
    };
    if let PointValue::Error(error) = right {
        return Float8Value::Error(error);
    };
    if left == PointValue::Unknown || right == PointValue::Unknown {
        return Float8Value::Unknown;
    };
    if left == PointValue::Null || right == PointValue::Null {
        return Float8Value::Null;
    };
    if let PointValue::Value(a) = left {
        if let PointValue::Value(b) = right {
            if slope {
                if geometric_coordinate_equal(float8_number(a.x), float8_number(b.x)) {
                    return make_float8_bits(9218868437227405312i64);
                };
                if geometric_coordinate_equal(float8_number(a.y), float8_number(b.y)) {
                    return make_float8_bits(0i64);
                };
            };
            let x = sql__pg_catalog__float8mi__r1nu(make_float8_bits(a.x), make_float8_bits(b.x));
            let y = sql__pg_catalog__float8mi__r1nu(make_float8_bits(a.y), make_float8_bits(b.y));
            if slope {
                let result = sql__pg_catalog__float8div__kumj(y, x);
                if let Float8Value::Value(bits) = result {
                    let value = float8_number(bits);
                    if value != value {
                        return Float8Value::Unknown;
                    };
                };
                return result;
            };
            return geometric_hypot(x, y);
        };
    };
    Float8Value::Unknown
}
pub fn sql__pg_catalog__point_distance__2haq(left: PointValue, right: PointValue) -> Float8Value {
    point_measurement(left, right, false)
}
pub fn sql__pg_catalog__slope__xxph(left: PointValue, right: PointValue) -> Float8Value {
    point_measurement(left, right, true)
}
