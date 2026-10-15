fn polygon_parse(value: &str) -> PolygonValue {
    let chars: Vec<char> = value.chars().collect();
    if chars.len() > 4096 {
        return PolygonValue::Unknown;
    };
    let source = GeometryInputText { chars };
    let start = geometry_input_space(&source, 0);
    if start < source.chars.len() {
        if source.chars[start] == '[' {
            return PolygonValue::Error(make_sql_error(FLOAT_INPUT_INVALID));
        };
        if source.chars[start] == '(' {
            let next = geometry_input_space(&source, start + 1);
            if next < source.chars.len() && source.chars[next] == '[' {
                return PolygonValue::Error(make_sql_error(FLOAT_INPUT_INVALID));
            };
        };
    };
    let parsed = path_parse(value);
    if let PathValue::Error(error) = parsed {
        return PolygonValue::Error(error);
    };
    if let PathValue::Value(payload) = parsed {
        if payload.closed == false {
            return PolygonValue::Error(make_sql_error(FLOAT_INPUT_INVALID));
        };
        return make_polygon_points(PolygonPayload {
            points: payload.points,
            bounds: BoxValue::Unknown,
        });
    };
    PolygonValue::Unknown
}
pub fn polygon_from_text(input: TextValue) -> PolygonValue {
    if let TextValue::Error(error) = input {
        return PolygonValue::Error(error);
    };
    if input == TextValue::Null {
        return PolygonValue::Null;
    };
    if let TextValue::Value(value) = input {
        return polygon_parse(value.as_str());
    };
    PolygonValue::Unknown
}
