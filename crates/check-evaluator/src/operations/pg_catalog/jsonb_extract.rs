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

// A member or element of a shape is exact unless it holds a hole; the whole value's bound
// still bounds any part of it.
fn jsonb_shape_select(facts: &JsonbKnowledge, index: usize) -> JsonbValue {
    let shape = facts.shape.clone();
    let selected = JsonbPayload {
        characters: shape.characters,
        nodes: shape.nodes,
        root: index,
    };
    if jsonb_shape_exact(&selected, index) {
        return JsonbValue::Value(selected);
    };
    jsonb_partial_tree(facts.maximum, selected)
}

// The ? operator over a shape: 1 when the key is present, 0 when absent, -1 when a hole decides.
fn jsonb_shape_has_key(shape: &JsonbPayload, key: &JsonbExtractKey) -> i32 {
    let root = shape.nodes[shape.root];
    if root.kind == 6 {
        if jsonb_extract_member(shape, key) > 0 {
            return 1;
        };
        return 0;
    };
    if root.kind == 5 {
        let mut result: i32 = 0;
        let mut child = root.child;
        while child > 0 {
            let node = shape.nodes[child];
            if node.kind == 4 && jsonb_extract_matches(shape, node.text_start, node.text_end, key) {
                return 1;
            };
            if node.kind == 7 && jsonb_hole_allows(shape, child, 4) {
                result = -1;
            };
            child = node.next;
        }
        return result;
    };
    if root.kind == 7
        && (jsonb_hole_allows(shape, shape.root, 4)
            || jsonb_hole_allows(shape, shape.root, 5)
            || jsonb_hole_allows(shape, shape.root, 6))
    {
        return -1;
    };
    if root.kind == 4 && jsonb_extract_matches(shape, root.text_start, root.text_end, key) {
        return 1;
    };
    0
}

fn jsonb_extract_text(input: JsonbValue, utf8: bool) -> TextValue {
    let mut unresolved_flavor: i32 = 0;
    if let JsonbValue::Unknown = input { unresolved_flavor = 1; };
    if let JsonbValue::Unimplemented = input { unresolved_flavor = 2; };
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
        // Partial knowledge of an unknown kind stands for contents that are Unknown.
        return text_unresolved(resolution_context(unresolved_flavor));
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
    text_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__jsonb_object_field__4uf3(input: JsonbValue, key: TextValue) -> JsonbValue {
    let mut unresolved_flavor: i32 = 0;
    if let JsonbValue::Unknown = input { unresolved_flavor = 1; };
    if let TextValue::Unknown = key { unresolved_flavor = 1; };
    if let TextValue::NonNull = key { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let JsonbValue::Unimplemented = input { unresolved_flavor = 2; };
    if let TextValue::Unimplemented = key { unresolved_flavor = 2; };
    if let JsonbValue::Error(error) = input {
        return JsonbValue::Error(error);
    };
    if let TextValue::Error(error) = key {
        return JsonbValue::Error(error);
    };
    let mut condition_flavor_145_4: i32 = unresolved_flavor; if let JsonbValue::Unknown = input { if condition_flavor_145_4 < 1 { condition_flavor_145_4 = 1; }; }; if let JsonbValue::Unknown = input {
        return jsonb_unresolved(condition_flavor_145_4);
    }; let mut condition_flavor_147_7: i32 = unresolved_flavor; if let JsonbValue::Unimplemented = input { condition_flavor_147_7 = 2; }; if let JsonbValue::Unimplemented = input {
        return jsonb_unresolved(condition_flavor_147_7);
    };
    let mut condition_flavor_150_4: i32 = unresolved_flavor; if let TextValue::Unknown = key { if condition_flavor_150_4 < 1 { condition_flavor_150_4 = 1; }; }; if let TextValue::Unimplemented = key { condition_flavor_150_4 = 2; }; if (key == TextValue::Unknown || key == TextValue::Unimplemented) || key == TextValue::NonNull {
        return jsonb_unresolved(condition_flavor_150_4);
    };
    if let JsonbValue::NonNull(facts) = input {
        if key == TextValue::Null || (facts.kind >= 0 && facts.kind != 6) {
            return JsonbValue::Null;
        };
        if jsonb_has_shape(&facts) {
            let root = facts.shape.nodes[facts.shape.root];
            if root.kind == 6 {
                if let TextValue::Value(text) = key {
                    let characters = JsonbExtractKey {
                        characters: text.chars().collect(),
                    };
                    let shape = facts.shape.clone();
                    let member = jsonb_extract_member(&shape, &characters);
                    if member > 0 {
                        return jsonb_shape_select(&facts, member);
                    };
                };
                return JsonbValue::Null;
            };
            if jsonb_root_allows(&facts, 6) == false {
                return JsonbValue::Null;
            };
        };
        return jsonb_unresolved(unresolved_flavor);
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
    let mut unresolved_flavor: i32 = 0;
    if let JsonbValue::Unknown = input { unresolved_flavor = 1; };
    if let Int4Value::Unknown = index { unresolved_flavor = 1; };
    if let JsonbValue::Unimplemented = input { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = index { unresolved_flavor = 2; };
    if let JsonbValue::Error(error) = input {
        return JsonbValue::Error(error);
    };
    if let Int4Value::Error(error) = index {
        return JsonbValue::Error(error);
    };
    let mut condition_flavor_220_4: i32 = unresolved_flavor; if let JsonbValue::Unknown = input { if condition_flavor_220_4 < 1 { condition_flavor_220_4 = 1; }; }; if let JsonbValue::Unknown = input {
        return jsonb_unresolved(condition_flavor_220_4);
    }; let mut condition_flavor_222_7: i32 = unresolved_flavor; if let JsonbValue::Unimplemented = input { condition_flavor_222_7 = 2; }; if let JsonbValue::Unimplemented = input {
        return jsonb_unresolved(condition_flavor_222_7);
    };
    let mut condition_flavor_225_4: i32 = unresolved_flavor; if let Int4Value::Unknown = index { if condition_flavor_225_4 < 1 { condition_flavor_225_4 = 1; }; }; if let Int4Value::Unimplemented = index { condition_flavor_225_4 = 2; }; if index == Int4Value::Unknown || index == Int4Value::Unimplemented {
        return jsonb_unresolved(condition_flavor_225_4);
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
                if jsonb_has_shape(&facts) {
                    let mut selected = facts.shape.nodes[facts.shape.root].child;
                    while selected > 0 && offset > 0i64 {
                        selected = facts.shape.nodes[selected].next;
                        offset = offset - 1i64;
                    }
                    if selected > 0 {
                        return jsonb_shape_select(&facts, selected);
                    };
                };
                return jsonb_partial_value(facts.maximum);
            };
            // A scalar answers indexes 0 and -1 with itself, as for exact values.
            if jsonb_has_shape(&facts) && jsonb_root_allows(&facts, 5) == false {
                if position != 0 && position != -1 {
                    return JsonbValue::Null;
                };
                if jsonb_root_allows(&facts, 6) == false {
                    return JsonbValue::NonNull(facts);
                };
            };
        };
        return jsonb_unresolved(unresolved_flavor);
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
    let mut unresolved_flavor: i32 = 0;
    if let JsonbValue::Unknown = input { unresolved_flavor = 1; };
    if let JsonbValue::Unimplemented = input { unresolved_flavor = 2; };
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
        if jsonb_has_shape(&facts) && jsonb_root_allows(&facts, 5) == false {
            return Int4Value::Error(make_sql_error(JSONB_EXTRACT_PARAMETER));
        };
        return int4_unresolved(unresolved_flavor);
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
    int4_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__jsonb_exists__f8f8(input: JsonbValue, key: TextValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let JsonbValue::Unknown = input { unresolved_flavor = 1; };
    if let TextValue::Unknown = key { unresolved_flavor = 1; };
    if let TextValue::NonNull = key { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let JsonbValue::Unimplemented = input { unresolved_flavor = 2; };
    if let TextValue::Unimplemented = key { unresolved_flavor = 2; };
    if let JsonbValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if let TextValue::Error(error) = key {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_369_4: i32 = unresolved_flavor; if let JsonbValue::Unknown = input { if condition_flavor_369_4 < 1 { condition_flavor_369_4 = 1; }; }; if let JsonbValue::Unknown = input {
        return bool_unresolved(condition_flavor_369_4);
    }; let mut condition_flavor_371_7: i32 = unresolved_flavor; if let JsonbValue::Unimplemented = input { condition_flavor_371_7 = 2; }; if let JsonbValue::Unimplemented = input {
        return bool_unresolved(condition_flavor_371_7);
    };
    let mut condition_flavor_374_4: i32 = unresolved_flavor; if let TextValue::Unknown = key { if condition_flavor_374_4 < 1 { condition_flavor_374_4 = 1; }; }; if let TextValue::Unimplemented = key { condition_flavor_374_4 = 2; }; if (key == TextValue::Unknown || key == TextValue::Unimplemented) || key == TextValue::NonNull {
        return bool_unresolved(condition_flavor_374_4);
    };
    if let JsonbValue::NonNull(facts) = input {
        if key == TextValue::Null {
            return BoolValue::Null;
        };
        if jsonb_has_shape(&facts) {
            if let TextValue::Value(text) = key {
                let characters = JsonbExtractKey {
                    characters: text.chars().collect(),
                };
                let shape = facts.shape.clone();
                let found = jsonb_shape_has_key(&shape, &characters);
                if found >= 0 {
                    return BoolValue::Value(found == 1);
                };
            };
        };
        return bool_unresolved(unresolved_flavor);
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
