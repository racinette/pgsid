fn circle_parse(value: &str) -> CircleValue {
    let chars: Vec<char> = value.chars().collect();
    if chars.len() > 4096 {
        return CircleValue::Unknown;
    };
    let source = GeometryInputText { chars };
    let mut index = geometry_input_space(&source, 0);
    let mut depth = 0;
    if index < source.chars.len() && source.chars[index] == '<' {
        depth = 1;
        index += 1;
    } else if index < source.chars.len() && source.chars[index] == '(' {
        let next = geometry_input_space(&source, index + 1);
        if next < source.chars.len() && source.chars[next] == '(' {
            depth = 1;
            index = next;
        };
    };
    let center = geometry_read_point(&source, index);
    let point = center.value;
    if let PointValue::Error(error) = point {
        return CircleValue::Error(error);
    };
    if point == PointValue::Unknown {
        return CircleValue::Unknown;
    };
    index = center.end;
    if index < source.chars.len() && source.chars[index] == ',' {
        index += 1;
    };
    let radius = geometry_read_number(&source, index);
    let scalar = radius.value;
    if let Float8Value::Error(error) = scalar {
        return CircleValue::Error(error);
    };
    if scalar == Float8Value::Unknown {
        return CircleValue::Unknown;
    };
    if let Float8Value::Value(bits) = scalar {
        if float8_number(bits) < 0.0f64 {
            return CircleValue::Error(make_sql_error(FLOAT_INPUT_INVALID));
        };
    };
    index = radius.end;
    if depth == 1 {
        if index >= source.chars.len() || (source.chars[index] != ')' && source.chars[index] != '>')
        {
            return CircleValue::Error(make_sql_error(FLOAT_INPUT_INVALID));
        };
        index = geometry_input_space(&source, index + 1);
    };
    if index != source.chars.len() {
        return CircleValue::Error(make_sql_error(FLOAT_INPUT_INVALID));
    };
    circle_from_center_radius(point, scalar)
}
pub fn circle_from_text(input: TextValue) -> CircleValue {
    if let TextValue::Error(error) = input {
        return CircleValue::Error(error);
    };
    if input == TextValue::Null {
        return CircleValue::Null;
    };
    if let TextValue::Value(value) = input {
        return circle_parse(value.as_str());
    };
    CircleValue::Unknown
}
