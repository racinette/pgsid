pub fn sql__pg_catalog__json_extract_path__adkn(
    input: JsonValue,
    path: ArrayValue,
    utf8: bool,
) -> JsonValue {
    let selected = json_read_array_path(input, path, false, utf8);
    json_from_coerced_text(selected)
}

pub fn sql__pg_catalog__json_extract_path_text__v3oi(
    input: JsonValue,
    path: ArrayValue,
    utf8: bool,
) -> TextValue {
    json_read_array_path(input, path, true, utf8)
}

fn jsonb_array_path_member(source: &JsonbPayload, root: usize, key: &JsonbExtractKey) -> usize {
    let mut child = source.nodes[root].child;
    while child > 0 {
        let node = source.nodes[child];
        if jsonb_extract_matches(source, node.key_start, node.key_end, key) {
            return child;
        };
        child = node.next;
    }
    0
}

fn jsonb_array_path_select(input: JsonbValue, path: ArrayValue) -> JsonbValue {
    if let JsonbValue::Error(error) = input {
        return JsonbValue::Error(error);
    };
    let state = json_array_path_state(path.clone());
    if let Int4Value::Error(error) = state {
        return JsonbValue::Error(error);
    };
    if let JsonbValue::Null = input {
        return JsonbValue::Null;
    };
    if state == Int4Value::Null {
        return JsonbValue::Null;
    };
    if state == Int4Value::Unknown {
        return JsonbValue::Unknown;
    };
    if let JsonbValue::Value(value) = input {
        if let ArrayValue::Value(keys) = path {
            let mut root = value.root;
            let mut position: usize = 0;
            while position < keys.elements.len() {
                let node = value.nodes[root];
                if (node.kind != 5 && node.kind != 6) || node.child == 0 {
                    return JsonbValue::Null;
                };
                let key = array_element_to_text(keys.elements[position].clone());
                let mut selected: usize = 0;
                let mut known = false;
                if let TextValue::Value(text) = key {
                    known = true;
                    if node.kind == 6 {
                        let characters = JsonbExtractKey {
                            characters: text.chars().collect(),
                        };
                        selected = jsonb_array_path_member(&value, root, &characters);
                    } else {
                        let index = json_array_path_index(text.as_str());
                        if let Int4Value::Value(number) = index {
                            let mut count: i64 = 0i64;
                            let mut child = node.child;
                            while child > 0 {
                                count = count + 1i64;
                                child = value.nodes[child].next;
                            }
                            let mut wanted = number as i64;
                            if wanted < 0i64 {
                                wanted = count + wanted;
                            };
                            let mut offset: i64 = 0i64;
                            child = node.child;
                            while child > 0 {
                                if offset == wanted {
                                    selected = child;
                                    break;
                                };
                                offset = offset + 1i64;
                                child = value.nodes[child].next;
                            }
                        };
                    };
                };
                if known == false {
                    return JsonbValue::Unknown;
                };
                if selected == 0 {
                    return JsonbValue::Null;
                };
                root = selected;
                position += 1;
            }
            return JsonbValue::Value(JsonbPayload {
                characters: value.characters,
                nodes: value.nodes,
                root: root,
            });
        };
    };
    JsonbValue::Unknown
}

pub fn sql__pg_catalog__jsonb_extract_path__6gn0(
    input: JsonbValue,
    path: ArrayValue,
) -> JsonbValue {
    jsonb_array_path_select(input, path)
}

pub fn sql__pg_catalog__jsonb_extract_path_text__w3ff(
    input: JsonbValue,
    path: ArrayValue,
    utf8: bool,
) -> TextValue {
    let selected = jsonb_array_path_select(input, path);
    jsonb_extract_text(selected, utf8)
}

fn jsonb_array_path_exists_key(source: &JsonbPayload, key: &JsonbExtractKey) -> bool {
    let node = source.nodes[source.root];
    if node.kind == 6 {
        return jsonb_extract_member(source, key) > 0;
    };
    if node.kind == 4 {
        return jsonb_extract_matches(source, node.text_start, node.text_end, key);
    };
    if node.kind == 5 {
        let mut child = node.child;
        while child > 0 {
            let element = source.nodes[child];
            if element.kind == 4
                && jsonb_extract_matches(source, element.text_start, element.text_end, key)
            {
                return true;
            };
            child = element.next;
        }
    };
    false
}

fn jsonb_array_path_exists(input: JsonbValue, keys: ArrayValue, all: bool) -> BoolValue {
    if let JsonbValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if let ArrayValue::Error(error) = keys {
        return BoolValue::Error(error);
    };
    if let JsonbValue::Null = input {
        return BoolValue::Null;
    };
    if let ArrayValue::Null = keys {
        return BoolValue::Null;
    };
    if let JsonbValue::Value(value) = input {
        if let ArrayValue::Value(queries) = keys {
            if queries.element_type != "pg_catalog.text" || queries.element_kind != 8 {
                return BoolValue::Unknown;
            };
            let mut uncertain = false;
            let mut position: usize = 0;
            while position < queries.elements.len() {
                let element = queries.elements[position].clone();
                let mut skip = false;
                if let ArrayElement::Null = element {
                    skip = true;
                };
                if skip == false {
                    let key = array_element_to_text(element);
                    let mut known = false;
                    if let TextValue::Value(text) = key {
                        let characters = JsonbExtractKey {
                            characters: text.chars().collect(),
                        };
                        let found = jsonb_array_path_exists_key(&value, &characters);
                        if found != all {
                            return make_bool_value(found);
                        };
                        known = true;
                    };
                    if known == false {
                        uncertain = true;
                    };
                };
                position += 1;
            }
            if uncertain {
                return BoolValue::Unknown;
            };
            return make_bool_value(all);
        };
    };
    BoolValue::Unknown
}

pub fn sql__pg_catalog__jsonb_exists_any__p8z3(input: JsonbValue, keys: ArrayValue) -> BoolValue {
    jsonb_array_path_exists(input, keys, false)
}

pub fn sql__pg_catalog__jsonb_exists_all__x510(input: JsonbValue, keys: ArrayValue) -> BoolValue {
    jsonb_array_path_exists(input, keys, true)
}
