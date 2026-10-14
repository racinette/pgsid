pub fn box_from_text(input: TextValue) -> BoxValue {
    if let TextValue::Error(error) = input {
        return BoxValue::Error(error);
    };
    if input == TextValue::Null {
        return BoxValue::Null;
    };
    if let TextValue::Value(value) = input {
        let chars: Vec<char> = value.chars().collect();
        if chars.len() > 4096 {
            return BoxValue::Unknown;
        };
        let source = GeometryInputText { chars };
        let index = geometry_input_space(&source, 0);
        if index < source.chars.len() && source.chars[index] == '[' {
            return BoxValue::Error(make_sql_error(FLOAT_INPUT_INVALID));
        };
        let pair = geometry_read_pair(&source, index);
        return box_from_points(pair.first, pair.second, true);
    };
    BoxValue::Unknown
}
