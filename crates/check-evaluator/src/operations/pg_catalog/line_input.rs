const LINE_POINTS_ARGUMENT: u32 = 3452619;

fn line_from_scalars(first: Float8Value, second: Float8Value, third: Float8Value) -> LineValue {
    let mut unresolved_flavor: i32 = 0;
    if let Float8Value::Unknown = first { unresolved_flavor = 1; };
    if let Float8Value::UnspecifiedNan = first { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let Float8Value::Unknown = second { unresolved_flavor = 1; };
    if let Float8Value::UnspecifiedNan = second { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let Float8Value::Unknown = third { unresolved_flavor = 1; };
    if let Float8Value::UnspecifiedNan = third { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let Float8Value::Unimplemented = first { unresolved_flavor = 2; };
    if let Float8Value::Unimplemented = second { unresolved_flavor = 2; };
    if let Float8Value::Unimplemented = third { unresolved_flavor = 2; };
    if let Float8Value::Error(error) = first {
        return LineValue::Error(error);
    };
    if let Float8Value::Error(error) = second {
        return LineValue::Error(error);
    };
    if let Float8Value::Error(error) = third {
        return LineValue::Error(error);
    };
    let mut condition_flavor_20_4: i32 = unresolved_flavor; if let Float8Value::Unknown = first { if condition_flavor_20_4 < 1 { condition_flavor_20_4 = 1; }; }; if let Float8Value::Unimplemented = first { condition_flavor_20_4 = 2; }; if let Float8Value::Unknown = second { if condition_flavor_20_4 < 1 { condition_flavor_20_4 = 1; }; }; if let Float8Value::Unimplemented = second { condition_flavor_20_4 = 2; }; if let Float8Value::Unknown = third { if condition_flavor_20_4 < 1 { condition_flavor_20_4 = 1; }; }; if let Float8Value::Unimplemented = third { condition_flavor_20_4 = 2; }; if (first == Float8Value::Unknown || first == Float8Value::Unimplemented)
        || (second == Float8Value::Unknown || second == Float8Value::Unimplemented)
        || (third == Float8Value::Unknown || third == Float8Value::Unimplemented)
    {
        return line_unresolved(condition_flavor_20_4);
    };
    if first == Float8Value::Null || second == Float8Value::Null || third == Float8Value::Null {
        return LineValue::Null;
    };
    let a = float8_semantic(first);
    let b = float8_semantic(second);
    let c = float8_semantic(third);
    if let Float8Value::Value(a_bits) = a {
        if let Float8Value::Value(b_bits) = b {
            if let Float8Value::Value(c_bits) = c {
                let raw = make_line_bits(a_bits, b_bits, c_bits);
                if let LineValue::Value(payload) = raw {
                    let precise = first != Float8Value::UnspecifiedNan
                        && second != Float8Value::UnspecifiedNan
                        && third != Float8Value::UnspecifiedNan;
                    return LineValue::Value(LinePayload {
                        a: payload.a,
                        b: payload.b,
                        c: payload.c,
                        wire_known: precise,
                    });
                };
            };
        };
    };
    let mut local_flavor_50_4: i32 = unresolved_flavor; if let Float8Value::Unknown = c { if local_flavor_50_4 < 1 { local_flavor_50_4 = 1; }; }; if let Float8Value::Unimplemented = c { local_flavor_50_4 = 2; }; if let Float8Value::Unknown = b { if local_flavor_50_4 < 1 { local_flavor_50_4 = 1; }; }; if let Float8Value::Unimplemented = b { local_flavor_50_4 = 2; }; if let Float8Value::Unknown = a { if local_flavor_50_4 < 1 { local_flavor_50_4 = 1; }; }; if let Float8Value::Unimplemented = a { local_flavor_50_4 = 2; }; line_unresolved(local_flavor_50_4)
}
fn line_origin_coordinate(point: PointPayload, horizontal: bool) -> Float8Value {
    let mut bits = point.x;
    if horizontal {
        bits = point.y;
    };
    let number = float8_number(bits);
    if point.wire_known == false && number != number {
        return Float8Value::UnspecifiedNan;
    };
    make_float8_bits(bits)
}
fn line_from_origin_slope(origin: PointPayload, gradient: Float8Value) -> LineValue {
    let mut unresolved_flavor: i32 = 0;
    if let Float8Value::Unknown = gradient { unresolved_flavor = 1; };
    if let Float8Value::UnspecifiedNan = gradient { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let Float8Value::Unimplemented = gradient { unresolved_flavor = 2; };
    if let Float8Value::Error(error) = gradient {
        return LineValue::Error(error);
    };
    let known = float8_semantic(gradient);
    if let Float8Value::Value(bits) = known {
        let slope = float8_number(bits);
        let infinity = 1.0f64 / 0.0f64;
        if slope.abs() == infinity {
            return line_from_scalars(
                make_float8_value(-1.0f64),
                make_float8_bits(0i64),
                line_origin_coordinate(origin, false),
            );
        };
        if slope == 0.0f64 {
            return line_from_scalars(
                make_float8_bits(0i64),
                make_float8_value(-1.0f64),
                line_origin_coordinate(origin, true),
            );
        };
        let product =
            sql__pg_catalog__float8mul__d3nd(gradient, line_origin_coordinate(origin, false));
        let mut intercept =
            sql__pg_catalog__float8mi__r1nu(line_origin_coordinate(origin, true), product);
        if let Float8Value::Value(value) = intercept {
            if float8_number(value) == 0.0f64 {
                intercept = make_float8_bits(0i64);
            };
        };
        return line_from_scalars(gradient, make_float8_value(-1.0f64), intercept);
    };
    let mut local_flavor_99_4: i32 = unresolved_flavor; if let Float8Value::Unknown = known { if local_flavor_99_4 < 1 { local_flavor_99_4 = 1; }; }; if let Float8Value::Unimplemented = known { local_flavor_99_4 = 2; }; line_unresolved(local_flavor_99_4)
}
fn line_from_points(left: PointValue, right: PointValue, invalid: u32) -> LineValue {
    let mut unresolved_flavor: i32 = 0;
    if let PointValue::Unknown = left { unresolved_flavor = 1; };
    if let PointValue::Unknown = right { unresolved_flavor = 1; };
    if let PointValue::Unimplemented = left { unresolved_flavor = 2; };
    if let PointValue::Unimplemented = right { unresolved_flavor = 2; };
    if let PointValue::Error(error) = left {
        return LineValue::Error(error);
    };
    if let PointValue::Error(error) = right {
        return LineValue::Error(error);
    };
    let mut condition_flavor_113_4: i32 = unresolved_flavor; if let PointValue::Unknown = left { if condition_flavor_113_4 < 1 { condition_flavor_113_4 = 1; }; }; if let PointValue::Unimplemented = left { condition_flavor_113_4 = 2; }; if let PointValue::Unknown = right { if condition_flavor_113_4 < 1 { condition_flavor_113_4 = 1; }; }; if let PointValue::Unimplemented = right { condition_flavor_113_4 = 2; }; if (left == PointValue::Unknown || left == PointValue::Unimplemented) || (right == PointValue::Unknown || right == PointValue::Unimplemented) {
        return line_unresolved(condition_flavor_113_4);
    };
    if left == PointValue::Null || right == PointValue::Null {
        return LineValue::Null;
    };
    if let PointValue::Value(first) = left {
        if let PointValue::Value(second) = right {
            if point_same_value(first, second) {
                return LineValue::Error(make_sql_error(invalid));
            };
            return line_from_origin_slope(first, sql__pg_catalog__slope__xxph(left, right));
        };
    };
    line_unresolved(unresolved_flavor)
}
pub fn sql__pg_catalog__line__qygi(left: PointValue, right: PointValue) -> LineValue {
    line_from_points(left, right, LINE_POINTS_ARGUMENT)
}

#[derive(Clone, Copy)]
struct GeometryInputPoint {
    value: PointValue,
    end: usize,
}
fn geometry_read_point(source: &GeometryInputText, begin: usize) -> GeometryInputPoint {
    let mut index = geometry_input_space(source, begin);
    let mut delimited = false;
    if index < source.chars.len() && source.chars[index] == '(' {
        delimited = true;
        index += 1;
    };
    let first = geometry_read_number(source, index);
    let first_value = first.value;
    if let Float8Value::Error(error) = first_value {
        return GeometryInputPoint {
            value: PointValue::Error(error),
            end: first.end,
        };
    };
    if (first_value == Float8Value::Unknown || first_value == Float8Value::Unimplemented) {
        return GeometryInputPoint {
            value: PointValue::Unknown,
            end: first.end,
        };
    };
    index = first.end;
    if index >= source.chars.len() || source.chars[index] != ',' {
        return GeometryInputPoint {
            value: PointValue::Error(make_sql_error(FLOAT_INPUT_INVALID)),
            end: index,
        };
    };
    let second = geometry_read_number(source, index + 1);
    let second_value = second.value;
    if let Float8Value::Error(error) = second_value {
        return GeometryInputPoint {
            value: PointValue::Error(error),
            end: second.end,
        };
    };
    if (second_value == Float8Value::Unknown || second_value == Float8Value::Unimplemented) {
        return GeometryInputPoint {
            value: PointValue::Unknown,
            end: second.end,
        };
    };
    index = second.end;
    if delimited {
        if index >= source.chars.len() || source.chars[index] != ')' {
            return GeometryInputPoint {
                value: PointValue::Error(make_sql_error(FLOAT_INPUT_INVALID)),
                end: index,
            };
        };
        index = geometry_input_space(source, index + 1);
    };
    GeometryInputPoint {
        value: sql__pg_catalog__point__db27(first_value, second_value),
        end: index,
    }
}
fn line_parse_coefficients(source: &GeometryInputText, begin: usize) -> LineValue {
    let unresolved_flavor: i32 = 0;
    let mut index = begin;
    let mut first = Float8Value::Unknown;
    let mut second = Float8Value::Unknown;
    let mut third = Float8Value::Unknown;
    let mut count = 0;
    while count < 3 {
        let number = geometry_read_number(source, index);
        let number_value = number.value;
        if let Float8Value::Error(error) = number_value {
            return LineValue::Error(error);
        };
        let mut condition_flavor_208_8: i32 = unresolved_flavor; if let Float8Value::Unknown = number_value { if condition_flavor_208_8 < 1 { condition_flavor_208_8 = 1; }; }; if let Float8Value::Unimplemented = number_value { condition_flavor_208_8 = 2; }; if (number_value == Float8Value::Unknown || number_value == Float8Value::Unimplemented) {
            return line_unresolved(condition_flavor_208_8);
        };
        if count == 0 {
            first = number_value;
        } else if count == 1 {
            second = number_value;
        } else {
            third = number_value;
        };
        count += 1;
        index = number.end;
        let mut delimiter = ',';
        if count == 3 {
            delimiter = '}';
        };
        if index >= source.chars.len() || source.chars[index] != delimiter {
            return LineValue::Error(make_sql_error(FLOAT_INPUT_INVALID));
        };
        index += 1;
    }
    index = geometry_input_space(source, index);
    if index != source.chars.len() {
        return LineValue::Error(make_sql_error(FLOAT_INPUT_INVALID));
    };
    let result = line_from_scalars(first, second, third);
    if (result == LineValue::Unknown || result == LineValue::Unimplemented) {
        return LineValue::Error(make_sql_error(FLOAT_INPUT_INVALID));
    };
    result
}
fn line_parse(value: &str) -> LineValue {
    let unresolved_flavor: i32 = 0;
    let chars: Vec<char> = value.chars().collect();
    if chars.len() > 4096 {
        return line_unresolved(unresolved_flavor);
    };
    let source = GeometryInputText { chars: chars };
    let mut index = geometry_input_space(&source, 0);
    if index < source.chars.len() && source.chars[index] == '{' {
        return line_parse_coefficients(&source, index + 1);
    };
    let pair = geometry_read_pair(&source, index);
    line_from_points(pair.first, pair.second, FLOAT_INPUT_INVALID)
}
#[derive(Clone, Copy)]
struct GeometryInputPair {
    first: PointValue,
    second: PointValue,
}
fn geometry_pair_failure(value: PointValue) -> GeometryInputPair {
    GeometryInputPair {
        first: value,
        second: PointValue::Unknown,
    }
}
fn geometry_read_pair(source: &GeometryInputText, begin: usize) -> GeometryInputPair {
    let mut index = begin;
    let mut depth = 0;
    let mut open = false;
    if index < source.chars.len() && source.chars[index] == '[' {
        depth = 1;
        open = true;
        index += 1;
    } else if index < source.chars.len() && source.chars[index] == '(' {
        let next = geometry_input_space(source, index + 1);
        let mut later_parenthesis = false;
        let mut scan = index + 1;
        while scan < source.chars.len() {
            if source.chars[scan] == '(' {
                later_parenthesis = true;
            };
            scan += 1;
        }
        if (next < source.chars.len() && source.chars[next] == '(') || later_parenthesis == false {
            depth = 1;
            index = next;
        };
    };
    let first = geometry_read_point(source, index);
    let first_value = first.value;
    if let PointValue::Error(error) = first_value {
        return geometry_pair_failure(PointValue::Error(error));
    };
    if (first_value == PointValue::Unknown || first_value == PointValue::Unimplemented) {
        return geometry_pair_failure(PointValue::Unknown);
    };
    index = first.end;
    if index < source.chars.len() && source.chars[index] == ',' {
        index += 1;
    };
    let second = geometry_read_point(source, index);
    let second_value = second.value;
    if let PointValue::Error(error) = second_value {
        return geometry_pair_failure(PointValue::Error(error));
    };
    if (second_value == PointValue::Unknown || second_value == PointValue::Unimplemented) {
        return geometry_pair_failure(PointValue::Unknown);
    };
    index = second.end;
    if index < source.chars.len() && source.chars[index] == ',' {
        index += 1;
    };
    if depth == 1 {
        if index >= source.chars.len()
            || (source.chars[index] != ')' && (open == false || source.chars[index] != ']'))
        {
            return geometry_pair_failure(PointValue::Error(make_sql_error(FLOAT_INPUT_INVALID)));
        };
        index = geometry_input_space(source, index + 1);
    };
    if index != source.chars.len() {
        return geometry_pair_failure(PointValue::Error(make_sql_error(FLOAT_INPUT_INVALID)));
    };
    GeometryInputPair {
        first: first_value,
        second: second_value,
    }
}
pub fn line_from_text(input: TextValue) -> LineValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = input { unresolved_flavor = 1; };
    if let TextValue::NonNull = input { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TextValue::Unimplemented = input { unresolved_flavor = 2; };
    if let TextValue::Error(error) = input {
        return LineValue::Error(error);
    };
    if input == TextValue::Null {
        return LineValue::Null;
    };
    if let TextValue::Value(value) = input {
        return line_parse(value.as_str());
    };
    line_unresolved(unresolved_flavor)
}
