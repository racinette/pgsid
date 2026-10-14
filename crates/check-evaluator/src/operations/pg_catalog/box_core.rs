fn box_from_points(left: PointValue, right: PointValue, keep_ties: bool) -> BoxValue {
    if let PointValue::Error(error) = left {
        return BoxValue::Error(error);
    };
    if let PointValue::Error(error) = right {
        return BoxValue::Error(error);
    };
    if left == PointValue::Unknown || right == PointValue::Unknown {
        return BoxValue::Unknown;
    };
    if left == PointValue::Null || right == PointValue::Null {
        return BoxValue::Null;
    };
    if let PointValue::Value(a) = left {
        if let PointValue::Value(b) = right {
            let mut high_x = b.x;
            let mut low_x = a.x;
            let mut high_y = b.y;
            let mut low_y = a.y;
            let x = float8_compare(make_float8_bits(a.x), make_float8_bits(b.x));
            let y = float8_compare(make_float8_bits(a.y), make_float8_bits(b.y));
            if x == Int4Value::Value(1) || (keep_ties && x == Int4Value::Value(0)) {
                high_x = a.x;
                low_x = b.x;
            };
            if y == Int4Value::Value(1) || (keep_ties && y == Int4Value::Value(0)) {
                high_y = a.y;
                low_y = b.y;
            };
            return BoxValue::Value(BoxPayload {
                high_x,
                high_y,
                low_x,
                low_y,
                wire_known: a.wire_known && b.wire_known,
            });
        };
    };
    BoxValue::Unknown
}
fn box_endpoint(input: BoxValue, low: bool) -> PointValue {
    if let BoxValue::Error(error) = input {
        return PointValue::Error(error);
    };
    if input == BoxValue::Null {
        return PointValue::Null;
    };
    if let BoxValue::Value(value) = input {
        let mut x = value.high_x;
        let mut y = value.high_y;
        if low {
            x = value.low_x;
            y = value.low_y;
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
fn box_scalar(value: BoxPayload, slot: i32) -> Float8Value {
    let mut bits = value.high_x;
    if slot == 1 {
        bits = value.high_y;
    };
    if slot == 2 {
        bits = value.low_x;
    };
    if slot == 3 {
        bits = value.low_y;
    };
    let number = float8_number(bits);
    if value.wire_known == false && number != number {
        return Float8Value::UnspecifiedNan;
    };
    make_float8_bits(bits)
}
fn box_computed_scalar(input: Float8Value) -> Float8Value {
    if let Float8Value::Value(bits) = input {
        let value = float8_number(bits);
        if value != value {
            return Float8Value::UnspecifiedNan;
        };
    };
    input
}
fn box_dimension(input: BoxValue, vertical: bool) -> Float8Value {
    if let BoxValue::Error(error) = input {
        return Float8Value::Error(error);
    };
    if input == BoxValue::Null {
        return Float8Value::Null;
    };
    if let BoxValue::Value(value) = input {
        let mut high = box_scalar(value, 0);
        let mut low = box_scalar(value, 2);
        if vertical {
            high = box_scalar(value, 1);
            low = box_scalar(value, 3);
        };
        return box_computed_scalar(sql__pg_catalog__float8mi__r1nu(high, low));
    };
    Float8Value::Unknown
}
fn box_area_value(input: BoxValue) -> Float8Value {
    box_computed_scalar(sql__pg_catalog__float8mul__d3nd(
        box_dimension(input, false),
        box_dimension(input, true),
    ))
}
fn box_midpoint(input: BoxValue) -> PointValue {
    if let BoxValue::Error(error) = input {
        return PointValue::Error(error);
    };
    if input == BoxValue::Null {
        return PointValue::Null;
    };
    if let BoxValue::Value(value) = input {
        let two = make_float8_value(2.0f64);
        let x = sql__pg_catalog__float8div__kumj(
            sql__pg_catalog__float8pl__g3ou(box_scalar(value, 0), box_scalar(value, 2)),
            two,
        );
        let y = sql__pg_catalog__float8div__kumj(
            sql__pg_catalog__float8pl__g3ou(box_scalar(value, 1), box_scalar(value, 3)),
            two,
        );
        return point_arithmetic_result(x, y);
    };
    PointValue::Unknown
}
fn box_pair_status(left: BoxValue, right: BoxValue) -> BoolValue {
    if let BoxValue::Error(error) = left {
        return BoolValue::Error(error);
    };
    if let BoxValue::Error(error) = right {
        return BoolValue::Error(error);
    };
    if left == BoxValue::Unknown || right == BoxValue::Unknown {
        return BoolValue::Unknown;
    };
    if left == BoxValue::Null || right == BoxValue::Null {
        return BoolValue::Null;
    };
    make_bool_value(true)
}
fn box_same_corners(left: BoxValue, right: BoxValue) -> BoolValue {
    let status = box_pair_status(left, right);
    if status != BoolValue::Value(true) {
        return status;
    };
    let high =
        sql__pg_catalog__point_eq__5be0(box_endpoint(left, false), box_endpoint(right, false));
    if high != BoolValue::Value(true) {
        return high;
    };
    sql__pg_catalog__point_eq__5be0(box_endpoint(left, true), box_endpoint(right, true))
}
fn box_area_relation(left: BoxValue, right: BoxValue, mode: i32) -> BoolValue {
    let status = box_pair_status(left, right);
    if status != BoolValue::Value(true) {
        return status;
    };
    let first = box_area_value(left);
    if let Float8Value::Error(error) = first {
        return BoolValue::Error(error);
    };
    let second = box_area_value(right);
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
            return make_bool_value(x + 0.000001f64 >= y);
        };
    };
    BoolValue::Unknown
}
fn box_binary(input: BoxValue) -> ByteaValue {
    if let BoxValue::Error(error) = input {
        return ByteaValue::Error(error);
    };
    if input == BoxValue::Null {
        return ByteaValue::Null;
    };
    if let BoxValue::Value(value) = input {
        if value.wire_known == false {
            return ByteaValue::Unknown;
        };
        return sql__pg_catalog__byteacat__zitv(
            sql__pg_catalog__point_send__kuoa(box_endpoint(input, false)),
            sql__pg_catalog__point_send__kuoa(box_endpoint(input, true)),
        );
    };
    ByteaValue::Unknown
}
fn box_diagonal_value(input: BoxValue) -> LsegValue {
    sql__pg_catalog__lseg__l9bc(box_endpoint(input, false), box_endpoint(input, true))
}
fn box_centers_distance(left: BoxValue, right: BoxValue) -> Float8Value {
    let status = box_pair_status(left, right);
    if status != BoolValue::Value(true) {
        if let BoolValue::Error(error) = status {
            return Float8Value::Error(error);
        };
        if status == BoolValue::Null {
            return Float8Value::Null;
        };
        return Float8Value::Unknown;
    };
    sql__pg_catalog__point_distance__2haq(box_midpoint(left), box_midpoint(right))
}
pub fn sql__pg_catalog__box_send__gn94(input: BoxValue) -> ByteaValue {
    box_binary(input)
}
pub fn sql__pg_catalog__box__rlrs(point: PointValue) -> BoxValue {
    box_from_points(point, point, false)
}
pub fn sql__pg_catalog__box__3i2n(left: PointValue, right: PointValue) -> BoxValue {
    box_from_points(left, right, false)
}
pub fn sql__pg_catalog__area__5fzg(input: BoxValue) -> Float8Value {
    box_area_value(input)
}
pub fn sql__pg_catalog__width__xgb7(input: BoxValue) -> Float8Value {
    box_dimension(input, false)
}
pub fn sql__pg_catalog__height__4nsp(input: BoxValue) -> Float8Value {
    box_dimension(input, true)
}
pub fn sql__pg_catalog__box_center__8n2v(input: BoxValue) -> PointValue {
    box_midpoint(input)
}
pub fn sql__pg_catalog__point__31a1(input: BoxValue) -> PointValue {
    box_midpoint(input)
}
pub fn sql__pg_catalog__diagonal__cfk4(input: BoxValue) -> LsegValue {
    box_diagonal_value(input)
}
pub fn sql__pg_catalog__lseg__rpcm(input: BoxValue) -> LsegValue {
    box_diagonal_value(input)
}
pub fn sql__pg_catalog__box_same__fim3(left: BoxValue, right: BoxValue) -> BoolValue {
    box_same_corners(left, right)
}
pub fn sql__pg_catalog__box_distance__34ga(left: BoxValue, right: BoxValue) -> Float8Value {
    box_centers_distance(left, right)
}
pub fn sql__pg_catalog__box_eq__q1sg(left: BoxValue, right: BoxValue) -> BoolValue {
    box_area_relation(left, right, 0)
}
pub fn sql__pg_catalog__box_lt__6yu8(left: BoxValue, right: BoxValue) -> BoolValue {
    box_area_relation(left, right, 1)
}
pub fn sql__pg_catalog__box_gt__4z9n(left: BoxValue, right: BoxValue) -> BoolValue {
    box_area_relation(left, right, 2)
}
pub fn sql__pg_catalog__box_le__pi1v(left: BoxValue, right: BoxValue) -> BoolValue {
    box_area_relation(left, right, 3)
}
pub fn sql__pg_catalog__box_ge__etho(left: BoxValue, right: BoxValue) -> BoolValue {
    box_area_relation(left, right, 4)
}
