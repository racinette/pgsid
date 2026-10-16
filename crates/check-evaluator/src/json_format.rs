pub fn json_quote_string(input: &str) -> String {
    let characters: Vec<char> = input.chars().collect();
    let hex: Vec<char> = "0123456789abcdef".chars().collect();
    let mut output = String::new();
    output.push('"');
    let mut position: usize = 0;
    while position < characters.len() {
        let character = characters[position];
        let code = character as i32;
        if character == '"' {
            output.push_str("\\\"");
        } else if character == '\\' {
            output.push_str("\\\\");
        } else if character == '\u{0008}' {
            output.push_str("\\b");
        } else if character == '\u{000c}' {
            output.push_str("\\f");
        } else if character == '\n' {
            output.push_str("\\n");
        } else if character == '\r' {
            output.push_str("\\r");
        } else if character == '\t' {
            output.push_str("\\t");
        } else if code < 32 {
            output.push_str("\\u00");
            output.push(hex[usize::try_from(code / 16).unwrap_or(0)]);
            output.push(hex[usize::try_from(code % 16).unwrap_or(0)]);
        } else {
            output.push(character);
        };
        position += 1;
    }
    output.push('"');
    output
}

#[derive(Clone, Copy)]
struct JsonStripFrame {
    node: usize,
    child: usize,
    first: bool,
}

pub fn json_strip_nulls_context(input: JsonValue, arrays: BoolValue, utf8: bool) -> JsonValue {
    if let JsonValue::Error(error) = input {
        return JsonValue::Error(error);
    };
    if let BoolValue::Error(error) = arrays {
        return JsonValue::Error(error);
    };
    if let JsonValue::Null = input {
        return JsonValue::Null;
    };
    if arrays == BoolValue::Null {
        return JsonValue::Null;
    };
    if let JsonValue::Value(value) = input {
        if let BoolValue::Value(remove) = arrays {
            let document = parse_json_array_path_document(value.source.as_str(), utf8);
            if document.state == -2 {
                return JsonValue::Error(document.error);
            };
            if document.state != 1 {
                return JsonValue::Unknown;
            };
            let source = JsonSyntaxSource {
                characters: document.characters,
            };
            let mut output = String::new();
            let mut frames: Vec<JsonStripFrame> = Vec::new();
            let mut depth: usize = 0;
            let mut current = document.root;
            let mut visiting = true;
            while visiting || depth > 0 {
                if visiting {
                    let node = document.nodes[current];
                    if node.kind >= 5 {
                        if node.kind == 6 {
                            output.push('{');
                        } else {
                            output.push('[');
                        };
                        let frame = JsonStripFrame {
                            node: current,
                            child: node.child,
                            first: true,
                        };
                        if depth == frames.len() {
                            frames.push(frame);
                        } else {
                            frames[depth] = frame;
                        };
                        depth += 1;
                    } else if node.kind == 4 {
                        let token = json_read_next_token(&source, node.start);
                        let decoded = json_read_decode_string_context(&source, token, utf8);
                        if let TextValue::Error(error) = decoded {
                            return JsonValue::Error(error);
                        };
                        let mut ready = false;
                        if let TextValue::Value(text) = decoded {
                            let quoted = json_quote_string(text.as_str());
                            output.push_str(quoted.as_str());
                            ready = true;
                        };
                        if ready == false {
                            return JsonValue::Unknown;
                        };
                    } else {
                        let mut position = node.start;
                        while position < node.end {
                            output.push(source.characters[position]);
                            position += 1;
                        }
                    };
                    visiting = false;
                } else {
                    let frame = frames[depth - 1];
                    let parent = document.nodes[frame.node];
                    let mut child = frame.child;
                    while child > 0 {
                        let node = document.nodes[child];
                        if node.kind != 0 || (parent.kind != 6 && remove == false) {
                            break;
                        };
                        child = node.next;
                    }
                    if child == 0 {
                        if parent.kind == 6 {
                            output.push('}');
                        } else {
                            output.push(']');
                        };
                        depth = depth - 1;
                    } else {
                        let node = document.nodes[child];
                        if frame.first == false {
                            output.push(',');
                        };
                        if parent.kind == 6 {
                            let mut key = String::new();
                            let mut position = node.key_start;
                            while position < node.key_end {
                                key.push(document.names[position]);
                                position += 1;
                            }
                            let quoted = json_quote_string(key.as_str());
                            output.push_str(quoted.as_str());
                            output.push(':');
                        };
                        frames[depth - 1] = JsonStripFrame {
                            node: frame.node,
                            child: node.next,
                            first: false,
                        };
                        current = child;
                        visiting = true;
                    };
                };
            }
            return make_json_value(output.as_str());
        };
    };
    JsonValue::Unknown
}
