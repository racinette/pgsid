fn path_parse(value: &str) -> PathValue {
    let chars: Vec<char> = value.chars().collect();
    if chars.len() > 4096 {
        return PathValue::Unknown;
    };
    let source = GeometryInputText { chars: chars };
    let mut commas: i32 = 0;
    let mut last_paren: usize = 0;
    let mut scan: usize = 0;
    while scan < source.chars.len() {
        if source.chars[scan] == ',' {
            commas = commas + 1;
        };
        if source.chars[scan] == '(' {
            last_paren = scan;
        };
        scan += 1;
    }
    if commas % 2 == 0 {
        return PathValue::Error(make_sql_error(FLOAT_INPUT_INVALID));
    };
    let count = (commas + 1) / 2;
    let mut index = geometry_input_space(&source, 0);
    let mut outer = false;
    if index < source.chars.len() && source.chars[index] == '(' && last_paren == index {
        outer = true;
        index = geometry_input_space(&source, index + 1);
    };
    let mut open = false;
    let mut depth = 0;
    if index < source.chars.len() && source.chars[index] == '[' {
        open = true;
        depth = 1;
        index += 1;
    } else if index < source.chars.len() && source.chars[index] == '(' {
        let next = geometry_input_space(&source, index + 1);
        if next < source.chars.len() && source.chars[next] == '(' {
            depth = 1;
            index = next;
        } else if last_paren == index {
            depth = 1;
            index = next;
        };
    };
    let mut points: Vec<PointPayload> = Vec::new();
    let mut number: i32 = 0;
    while number < count {
        let parsed = geometry_read_point(&source, index);
        let point = parsed.value;
        if let PointValue::Error(error) = point {
            return PathValue::Error(error);
        };
        if point == PointValue::Unknown {
            return PathValue::Unknown;
        };
        if let PointValue::Value(payload) = point {
            points.push(payload);
        };
        index = parsed.end;
        if index < source.chars.len() && source.chars[index] == ',' {
            index += 1;
        };
        number = number + 1;
    }
    if depth == 1 {
        if index >= source.chars.len()
            || (source.chars[index] != ')' && (open == false || source.chars[index] != ']'))
        {
            return PathValue::Error(make_sql_error(FLOAT_INPUT_INVALID));
        };
        index = geometry_input_space(&source, index + 1);
    };
    if outer {
        if index >= source.chars.len() || source.chars[index] != ')' {
            return PathValue::Error(make_sql_error(FLOAT_INPUT_INVALID));
        };
        index = geometry_input_space(&source, index + 1);
    };
    if index != source.chars.len() {
        return PathValue::Error(make_sql_error(FLOAT_INPUT_INVALID));
    };
    make_path_value(PathPayload {
        closed: open == false,
        points: points,
    })
}
pub fn path_from_text(input: TextValue) -> PathValue {
    if let TextValue::Error(error) = input {
        return PathValue::Error(error);
    };
    if input == TextValue::Null {
        return PathValue::Null;
    };
    if let TextValue::Value(value) = input {
        return path_parse(value.as_str());
    };
    PathValue::Unknown
}
