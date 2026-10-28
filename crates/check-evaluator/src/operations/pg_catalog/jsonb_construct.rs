const JSONB_BUILD_PARAMETER: u32 = 3452619;

fn jsonb_build_key(input: JsonbInput) -> TextValue {
    if let JsonbInput::Error(error) = input {
        return TextValue::Error(error);
    };
    if let JsonbInput::ScalarUnknown = input {
        return TextValue::Unknown;
    };
    if let JsonbInput::Unknown = input {
        return TextValue::Unknown;
    };
    if let JsonbInput::Boolean(value) = input {
        if value {
            return TextValue::Value("true".to_owned());
        };
        return TextValue::Value("false".to_owned());
    };
    if let JsonbInput::Number(value) = input {
        return TextValue::Value(value);
    };
    if let JsonbInput::Text(value) = input {
        return TextValue::Value(value);
    };
    TextValue::Error(make_sql_error(JSONB_BUILD_PARAMETER))
}

fn jsonb_build_node(node: JsonbNode, next: usize, key_start: usize, key_end: usize) -> JsonbNode {
    JsonbNode {
        kind: node.kind,
        child: node.child,
        next: next,
        key_start: key_start,
        key_end: key_end,
        text_start: node.text_start,
        text_end: node.text_end,
    }
}

fn jsonb_build(input: JsonbArguments, object: bool) -> JsonbValue {
    if let JsonbArguments::Error(error) = input {
        return JsonbValue::Error(error);
    };
    if let JsonbArguments::Null = input {
        return JsonbValue::Null;
    };
    if let JsonbArguments::Values(batch) = input {
        let mut index: usize = 0;
        let mut odd = false;
        let mut partial = false;
        while index < batch.values.len() {
            let argument = batch.values[index].clone();
            if let JsonbInput::Error(error) = argument {
                return JsonbValue::Error(error);
            };
            if let JsonbInput::ScalarUnknown = argument {
                partial = true;
            };
            if let JsonbInput::JsonbNonNull(_maximum) = argument {
                partial = true;
            };
            odd = odd == false;
            index += 1;
        }
        if object && odd {
            return JsonbValue::Error(make_sql_error(JSONB_BUILD_PARAMETER));
        };
        let mut kind: i32 = 5;
        if object {
            kind = 6;
        };
        let mut characters: Vec<char> = Vec::new();
        let mut nodes: Vec<JsonbNode> = Vec::new();
        nodes.push(JsonbNode {
            kind: -1,
            child: 0,
            next: 0,
            key_start: 0,
            key_end: 0,
            text_start: 0,
            text_end: 0,
        });
        nodes.push(JsonbNode {
            kind: kind,
            child: 0,
            next: 0,
            key_start: 0,
            key_end: 0,
            text_start: 0,
            text_end: 0,
        });
        let mut complete = true;
        let mut maximum = 4i64;
        let mut first: usize = 0;
        let mut tail: usize = 0;
        index = 0;
        while index < batch.values.len() {
            if partial {
                maximum = jsonb_partial_add(maximum, 16i64);
            };
            let key_start = characters.len();
            if object {
                let key = jsonb_build_key(batch.values[index].clone());
                if let TextValue::Error(error) = key {
                    return JsonbValue::Error(error);
                };
                if key == TextValue::Unknown || key == TextValue::NonNull {
                    return JsonbValue::Unknown;
                };
                if let TextValue::Value(text) = key {
                    let key_characters: Vec<char> = text.chars().collect();
                    let mut position: usize = 0;
                    while position < key_characters.len() {
                        characters.push(key_characters[position]);
                        if partial {
                            maximum = jsonb_partial_add(maximum, 6i64);
                        };
                        position += 1;
                    }
                };
                index += 1;
            };
            let key_end = characters.len();
            let input = batch.values[index].clone();
            let mut scalar_unknown = false;
            if let JsonbInput::ScalarUnknown = input {
                scalar_unknown = true;
            };
            let mut converted = jsonb_partial_value(jsonb_partial_scalar_bound());
            if scalar_unknown == false {
                converted = sql__pg_catalog__to_jsonb__9y7o(input);
            };
            if let JsonbValue::NonNull(bound) = converted {
                complete = false;
                maximum = jsonb_partial_add(maximum, bound.maximum);
            };
            if let JsonbValue::Null = converted {
                converted = make_jsonb_value("null");
            };
            if let JsonbValue::Error(error) = converted {
                return JsonbValue::Error(error);
            };
            if let JsonbValue::Unknown = converted {
                return JsonbValue::Unknown;
            };
            if let JsonbValue::Value(value) = converted {
                if partial {
                    let bound = jsonb_partial_bound(&value);
                    maximum = jsonb_partial_add(maximum, bound);
                };
                let text_shift = characters.len();
                let node_shift = nodes.len() - 1;
                let root = node_shift + value.root;
                let mut position: usize = 0;
                while position < value.characters.len() {
                    characters.push(value.characters[position]);
                    position += 1;
                }
                position = 1;
                while position < value.nodes.len() {
                    let node = value.nodes[position];
                    let mut child: usize = 0;
                    let mut next: usize = 0;
                    if node.child > 0 {
                        child = node_shift + node.child;
                    };
                    if node.next > 0 {
                        next = node_shift + node.next;
                    };
                    nodes.push(JsonbNode {
                        kind: node.kind,
                        child: child,
                        next: next,
                        key_start: text_shift + node.key_start,
                        key_end: text_shift + node.key_end,
                        text_start: text_shift + node.text_start,
                        text_end: text_shift + node.text_end,
                    });
                    position += 1;
                }
                nodes[root] = jsonb_build_node(nodes[root], 0, key_start, key_end);
                if tail == 0 {
                    first = root;
                } else {
                    let previous = nodes[tail];
                    nodes[tail] =
                        jsonb_build_node(previous, root, previous.key_start, previous.key_end);
                };
                tail = root;
            };
            index += 1;
        }
        if complete == false {
            let mut length = -1;
            if object == false {
                length = batch.values.len() as i32;
            };
            return jsonb_partial_shape(maximum, kind, length);
        };
        nodes[1] = JsonbNode {
            kind: kind,
            child: first,
            next: 0,
            key_start: 0,
            key_end: 0,
            text_start: 0,
            text_end: 0,
        };
        return jsonb_rebuild(
            JsonbValue::Value(JsonbPayload {
                characters: characters,
                nodes: nodes,
                root: 1,
            }),
            true,
        );
    };
    JsonbValue::Unknown
}

pub fn sql__pg_catalog__jsonb_build_array__gfm5(input: JsonbArguments) -> JsonbValue {
    jsonb_build(input, false)
}

pub fn sql__pg_catalog__jsonb_build_array__o9ke() -> JsonbValue {
    make_jsonb_value("[]")
}

pub fn sql__pg_catalog__jsonb_build_object__8qt7(input: JsonbArguments) -> JsonbValue {
    jsonb_build(input, true)
}

pub fn sql__pg_catalog__jsonb_build_object__a8ms() -> JsonbValue {
    make_jsonb_value("{}")
}
