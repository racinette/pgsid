fn jsonpath_regex_literal(pattern: &str, flags: i32, c_collation: bool) -> BoolValue {
    let quoted = flags >= 16;
    if quoted == false && c_collation == false {
        return BoolValue::Unknown;
    };
    let result = compile(pattern, jsonpath_regex_options(flags));
    if let CompileOutcome::InvalidPattern = result {
        return BoolValue::Error(make_sql_error(SQLSTATE_INVALID_REGEX));
    };
    if let CompileOutcome::Compiled(_) = result {
        return BoolValue::Value(true);
    };
    BoolValue::Unknown
}

pub fn jsonpath_from_text(input: TextValue, c_collation: bool, utf8: bool) -> JsonpathValue {
    if let TextValue::Error(error) = input {
        return JsonpathValue::Error(error);
    };
    if let TextValue::Null = input {
        return JsonpathValue::Null;
    };
    if let TextValue::Value(value) = input {
        let tree = jsonpath_parse(value.as_str());
        if utf8 == false {
            let mut position: usize = 0;
            while position < tree.source.len() {
                if tree.source[position] as i32 > 127 {
                    return JsonpathValue::Unknown;
                };
                position += 1;
            }
            position = 0;
            while position < tree.text.len() {
                if tree.text[position] as i32 > 127 {
                    return JsonpathValue::Unknown;
                };
                position += 1;
            }
        };
        let mut index: usize = 0;
        while index < tree.validation.len() {
            let node = tree.nodes[tree.validation[index]];
            let mut literal = String::new();
            let mut position = node.text_start;
            while position < node.text_end {
                if node.kind == JSONPATH_NODE_NUMBER {
                    literal.push(tree.source[position]);
                } else {
                    literal.push(tree.text[position]);
                };
                position += 1;
            }
            if node.kind == JSONPATH_NODE_NUMBER {
                let result = jsonpath_numeric_literal(literal.as_str());
                if let TextValue::Error(error) = result {
                    return JsonpathValue::Error(error);
                };
                if let TextValue::Unknown = result {
                    return JsonpathValue::Unknown;
                };
            } else {
                let result = jsonpath_regex_literal(literal.as_str(), node.flags, c_collation);
                if let BoolValue::Error(error) = result {
                    return JsonpathValue::Error(error);
                };
                if let BoolValue::Unknown = result {
                    return JsonpathValue::Unknown;
                };
            };
            index += 1;
        }
        return jsonpath_value_from_tree(tree);
    };
    JsonpathValue::Unknown
}

pub fn jsonpath_from_text_utf8(input: TextValue, c_collation: bool) -> JsonpathValue {
    jsonpath_from_text(input, c_collation, true)
}

pub fn jsonpath_validate_utf8(input: TextValue, c_collation: bool) -> BoolValue {
    let result = jsonpath_from_text_utf8(input, c_collation);
    if let JsonpathValue::Error(error) = result {
        return BoolValue::Error(error);
    };
    if let JsonpathValue::Null = result {
        return BoolValue::Null;
    };
    if let JsonpathValue::Value(_) = result {
        return BoolValue::Value(true);
    };
    BoolValue::Unknown
}

fn jsonpath_regex_options(flags: i32) -> RegexOptions {
    let quoted = flags >= 16;
    let mut syntax = Syntax::Advanced;
    let mut newline = NewlineMode::Stop;
    if quoted {
        syntax = Syntax::Literal;
        newline = NewlineMode::Ordinary;
    } else {
        let dotall = (flags / 2) % 2 == 1;
        let multiline = (flags / 4) % 2 == 1;
        if dotall && multiline {
            newline = NewlineMode::Anchors;
        } else if dotall {
            newline = NewlineMode::Ordinary;
        } else if multiline {
            newline = NewlineMode::Sensitive;
        };
    };
    RegexOptions {
        syntax: syntax,
        case_sensitive: flags % 2 == 0,
        expanded: false,
        newline: newline,
    }
}
