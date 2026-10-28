const JSONB_EXTRACT_PARAMETER: u32 = 3452619;

#[derive(Clone)]
struct JsonbExtractKey {
    characters: Vec<char>,
}

fn jsonb_extract_matches(
    source: &JsonbPayload,
    begin: usize,
    end: usize,
    key: &JsonbExtractKey,
) -> bool {
    if end - begin != key.characters.len() {
        return false;
    };
    let mut index: usize = 0;
    while index < key.characters.len() {
        if source.characters[begin + index] != key.characters[index] {
            return false;
        };
        index += 1;
    }
    true
}

fn jsonb_extract_member(source: &JsonbPayload, key: &JsonbExtractKey) -> usize {
    let root = source.nodes[source.root];
    if root.kind != 6 {
        return 0;
    };
    let mut child = root.child;
    while child > 0 {
        let node = source.nodes[child];
        if jsonb_extract_matches(source, node.key_start, node.key_end, key) {
            return child;
        };
        child = node.next;
    }
    0
}

fn jsonb_extract_text(input: JsonbValue, utf8: bool) -> TextValue {
    if let JsonbValue::Error(error) = input {
        return TextValue::Error(error);
    };
    if let JsonbValue::Null = input {
        return TextValue::Null;
    };
    if let JsonbValue::NonNull(facts) = input {
        if facts.kind == 0 {
            return TextValue::Null;
        };
        if facts.kind > 0 {
            return TextValue::NonNull;
        };
        return TextValue::Unknown;
    };
    if let JsonbValue::Value(value) = input {
        let node = value.nodes[value.root];
        if node.kind == 0 {
            return TextValue::Null;
        };
        if node.kind == 4 {
            let mut text = String::new();
            let mut position = node.text_start;
            while position < node.text_end {
                text.push(value.characters[position]);
                position += 1;
            }
            return TextValue::Value(text);
        };
        return jsonb_text_context(JsonbValue::Value(value), utf8);
    };
    TextValue::Unknown
}

pub fn sql__pg_catalog__jsonb_object_field__4uf3(input: JsonbValue, key: TextValue) -> JsonbValue {
    if let JsonbValue::Error(error) = input {
        return JsonbValue::Error(error);
    };
    if let TextValue::Error(error) = key {
        return JsonbValue::Error(error);
    };
    if let JsonbValue::Unknown = input {
        return JsonbValue::Unknown;
    };
    if key == TextValue::Unknown || key == TextValue::NonNull {
        return JsonbValue::Unknown;
    };
    if let JsonbValue::NonNull(facts) = input {
        if key == TextValue::Null || (facts.kind >= 0 && facts.kind != 6) {
            return JsonbValue::Null;
        };
        return JsonbValue::Unknown;
    };
    if let JsonbValue::Value(value) = input {
        if let TextValue::Value(text) = key {
            let characters = JsonbExtractKey {
                characters: text.chars().collect(),
            };
            let selected = jsonb_extract_member(&value, &characters);
            if selected > 0 {
                return JsonbValue::Value(JsonbPayload {
                    characters: value.characters,
                    nodes: value.nodes,
                    root: selected,
                });
            };
        };
    };
    JsonbValue::Null
}

pub fn sql__pg_catalog__jsonb_object_field_text__jpuz(
    input: JsonbValue,
    key: TextValue,
    utf8: bool,
) -> TextValue {
    let selected = sql__pg_catalog__jsonb_object_field__4uf3(input, key);
    jsonb_extract_text(selected, utf8)
}

pub fn sql__pg_catalog__jsonb_array_element__08oi(
    input: JsonbValue,
    index: Int4Value,
) -> JsonbValue {
    if let JsonbValue::Error(error) = input {
        return JsonbValue::Error(error);
    };
    if let Int4Value::Error(error) = index {
        return JsonbValue::Error(error);
    };
    if let JsonbValue::Unknown = input {
        return JsonbValue::Unknown;
    };
    if let Int4Value::Unknown = index {
        return JsonbValue::Unknown;
    };
    if let JsonbValue::NonNull(facts) = input {
        if index == Int4Value::Null {
            return JsonbValue::Null;
        };
        if let Int4Value::Value(position) = index {
            if facts.kind == 6 {
                return JsonbValue::Null;
            };
            if facts.kind == 5 && facts.length >= 0 {
                let mut offset = position as i64;
                if offset < 0i64 {
                    offset = offset + facts.length as i64;
                };
                if offset < 0i64 || offset >= facts.length as i64 {
                    return JsonbValue::Null;
                };
                return jsonb_partial_value(facts.maximum);
            };
        };
        return JsonbValue::Unknown;
    };
    if let JsonbValue::Value(value) = input {
        if let Int4Value::Value(position) = index {
            let root = value.nodes[value.root];
            if root.kind < 5 {
                if position == 0 || position == -1 {
                    return JsonbValue::Value(value);
                };
                return JsonbValue::Null;
            };
            if root.kind != 5 {
                return JsonbValue::Null;
            };
            let mut offset = position as i64;
            if offset < 0i64 {
                let mut count: i64 = 0i64;
                let mut child = root.child;
                while child > 0 {
                    count = count + 1i64;
                    child = value.nodes[child].next;
                }
                offset = offset + count;
            };
            if offset < 0i64 {
                return JsonbValue::Null;
            };
            let mut selected = root.child;
            while selected > 0 && offset > 0i64 {
                selected = value.nodes[selected].next;
                offset = offset - 1i64;
            }
            if selected > 0 {
                return JsonbValue::Value(JsonbPayload {
                    characters: value.characters,
                    nodes: value.nodes,
                    root: selected,
                });
            };
        };
    };
    JsonbValue::Null
}

pub fn sql__pg_catalog__jsonb_array_element_text__83ql(
    input: JsonbValue,
    index: Int4Value,
    utf8: bool,
) -> TextValue {
    let selected = sql__pg_catalog__jsonb_array_element__08oi(input, index);
    jsonb_extract_text(selected, utf8)
}

pub fn sql__pg_catalog__jsonb_array_length__1gng(input: JsonbValue) -> Int4Value {
    if let JsonbValue::Error(error) = input {
        return Int4Value::Error(error);
    };
    if let JsonbValue::Null = input {
        return Int4Value::Null;
    };
    if let JsonbValue::NonNull(facts) = input {
        if facts.kind >= 0 && facts.kind != 5 {
            return Int4Value::Error(make_sql_error(JSONB_EXTRACT_PARAMETER));
        };
        if facts.kind == 5 && facts.length >= 0 {
            return Int4Value::Value(facts.length);
        };
        return Int4Value::Unknown;
    };
    if let JsonbValue::Value(value) = input {
        let root = value.nodes[value.root];
        if root.kind != 5 {
            return Int4Value::Error(make_sql_error(JSONB_EXTRACT_PARAMETER));
        };
        let mut count: i32 = 0;
        let mut child = root.child;
        while child > 0 {
            count = count + 1;
            child = value.nodes[child].next;
        }
        return Int4Value::Value(count);
    };
    Int4Value::Unknown
}

pub fn sql__pg_catalog__jsonb_exists__f8f8(input: JsonbValue, key: TextValue) -> BoolValue {
    if let JsonbValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if let TextValue::Error(error) = key {
        return BoolValue::Error(error);
    };
    if let JsonbValue::Unknown = input {
        return BoolValue::Unknown;
    };
    if key == TextValue::Unknown || key == TextValue::NonNull {
        return BoolValue::Unknown;
    };
    if let JsonbValue::NonNull(_facts) = input {
        if key == TextValue::Null {
            return BoolValue::Null;
        };
        return BoolValue::Unknown;
    };
    if let JsonbValue::Value(value) = input {
        if let TextValue::Value(text) = key {
            let characters = JsonbExtractKey {
                characters: text.chars().collect(),
            };
            let root = value.nodes[value.root];
            if root.kind == 6 {
                return BoolValue::Value(jsonb_extract_member(&value, &characters) > 0);
            };
            if root.kind == 4 {
                return BoolValue::Value(jsonb_extract_matches(
                    &value,
                    root.text_start,
                    root.text_end,
                    &characters,
                ));
            };
            if root.kind == 5 {
                let mut child = root.child;
                while child > 0 {
                    let node = value.nodes[child];
                    if node.kind == 4
                        && jsonb_extract_matches(
                            &value,
                            node.text_start,
                            node.text_end,
                            &characters,
                        )
                    {
                        return BoolValue::Value(true);
                    };
                    child = node.next;
                }
            };
            return BoolValue::Value(false);
        };
    };
    BoolValue::Null
}
