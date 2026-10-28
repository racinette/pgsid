const JSONB_PATH_RANK: u32 = 3452630;
const JSONB_PATH_NULL: u32 = 3452548;
const JSONB_PATH_INDEX: u32 = 3484946;
const JSONB_PATH_PARAMETER: u32 = 3452619;

fn jsonb_bulk_key_matches(
    input: &JsonbPayload,
    node: JsonbNode,
    keys: &ArrayPayload,
    object: bool,
) -> BoolValue {
    if object == false && node.kind != 4 {
        return make_bool_value(false);
    };
    let mut begin = node.text_start;
    let mut end = node.text_end;
    if object {
        begin = node.key_start;
        end = node.key_end;
    };
    let mut uncertain = false;
    let mut index: usize = 0;
    while index < keys.elements.len() {
        let key = array_element_to_text(keys.elements[index].clone());
        if let TextValue::Error(error) = key {
            return BoolValue::Error(error);
        };
        if (key == TextValue::Unknown || key == TextValue::NonNull) {
            uncertain = true;
        };
        if let TextValue::Value(text) = key {
            let characters = JsonbExtractKey {
                characters: text.chars().collect(),
            };
            if jsonb_extract_matches(input, begin, end, &characters) {
                return make_bool_value(true);
            };
        };
        index += 1;
    }
    if uncertain {
        return BoolValue::Unknown;
    };
    make_bool_value(false)
}

pub fn sql__pg_catalog__jsonb_delete__11uh(input: JsonbValue, keys: ArrayValue) -> JsonbValue {
    if let JsonbValue::Error(error) = input {
        return JsonbValue::Error(error);
    };
    if let ArrayValue::Error(error) = keys {
        return JsonbValue::Error(error);
    };
    if let JsonbValue::Null = input {
        return JsonbValue::Null;
    };
    if let ArrayValue::Null = keys {
        return JsonbValue::Null;
    };
    if let JsonbValue::NonNull(facts) = input {
        if let ArrayValue::Value(queries) = keys {
            if queries.element_type != "pg_catalog.text" || queries.element_kind != 8 {
                return JsonbValue::Unknown;
            };
            if queries.dimensions.len() > 1 {
                return JsonbValue::Error(make_sql_error(JSONB_PATH_RANK));
            };
            if facts.kind >= 0 && facts.kind < 5 {
                return JsonbValue::Error(make_sql_error(JSONB_PATH_PARAMETER));
            };
            if facts.kind == 5 || facts.kind == 6 {
                let mut removes = false;
                let mut position: usize = 0;
                while position < queries.elements.len() {
                    let key = queries.elements[position].clone();
                    if let ArrayElement::Error(error) = key {
                        return JsonbValue::Error(error);
                    };
                    let mut is_null = false;
                    if let ArrayElement::Null = key {
                        is_null = true;
                    };
                    if is_null == false {
                        removes = true;
                    };
                    position += 1;
                }
                let mut length = facts.length;
                if removes {
                    length = -1;
                };
                return jsonb_partial_shape(facts.maximum, facts.kind, length);
            };
        };
        return JsonbValue::Unknown;
    };
    if let JsonbValue::Value(value) = input {
        if let ArrayValue::Value(queries) = keys {
            if queries.element_type != "pg_catalog.text" || queries.element_kind != 8 {
                return JsonbValue::Unknown;
            };
            if queries.dimensions.len() > 1 {
                return JsonbValue::Error(make_sql_error(JSONB_PATH_RANK));
            };
            let root = value.nodes[value.root];
            if root.kind < 5 {
                return JsonbValue::Error(make_sql_error(JSONB_PATH_PARAMETER));
            };
            let mut kept: Vec<usize> = Vec::new();
            let mut changed = false;
            let mut child = root.child;
            while child > 0 {
                let node = value.nodes[child];
                let matched = jsonb_bulk_key_matches(&value, node, &queries, root.kind == 6);
                if let BoolValue::Error(error) = matched {
                    return JsonbValue::Error(error);
                };
                if matched == BoolValue::Unknown {
                    return JsonbValue::Unknown;
                };
                if matched == make_bool_value(true) {
                    changed = true;
                } else {
                    kept.push(child);
                };
                child = node.next;
            }
            if changed == false {
                return JsonbValue::Value(value);
            };
            let mut nodes = value.nodes;
            let mut first: usize = 0;
            let mut index: usize = 0;
            while index < kept.len() {
                if index == 0 {
                    first = kept[index];
                };
                let mut next: usize = 0;
                if index + 1 < kept.len() {
                    next = kept[index + 1];
                };
                nodes[kept[index]] = jsonb_edit_link(nodes[kept[index]], next);
                index += 1;
            }
            nodes[value.root] = jsonb_path_child(root, first);
            return jsonb_rebuild(
                JsonbValue::Value(JsonbPayload {
                    characters: value.characters,
                    nodes: nodes,
                    root: value.root,
                }),
                true,
            );
        };
    };
    JsonbValue::Unknown
}

fn jsonb_path_child(node: JsonbNode, child: usize) -> JsonbNode {
    JsonbNode {
        kind: node.kind,
        child: child,
        next: node.next,
        key_start: node.key_start,
        key_end: node.key_end,
        text_start: node.text_start,
        text_end: node.text_end,
    }
}

fn jsonb_path_splice(
    input: JsonbPayload,
    replacement: JsonbValue,
    parent: usize,
    previous: usize,
    next: usize,
    key: &str,
    remove: bool,
) -> JsonbValue {
    let mut characters = input.characters;
    let mut nodes = input.nodes;
    let mut inserted = next;
    if remove == false {
        let mut ready = false;
        if let JsonbValue::Value(value) = replacement {
            ready = true;
            let key_start = characters.len();
            if nodes[parent].kind == 6 {
                let keys: Vec<char> = key.chars().collect();
                let mut index: usize = 0;
                while index < keys.len() {
                    characters.push(keys[index]);
                    index += 1;
                }
            };
            let key_end = characters.len();
            let text_shift = characters.len();
            let node_shift = nodes.len() - 1;
            inserted = node_shift + value.root;
            let mut position: usize = 0;
            while position < value.characters.len() {
                characters.push(value.characters[position]);
                position += 1;
            }
            position = 1;
            while position < value.nodes.len() {
                let node = value.nodes[position];
                let mut child: usize = 0;
                let mut sibling: usize = 0;
                if node.child > 0 {
                    child = node_shift + node.child;
                };
                if node.next > 0 {
                    sibling = node_shift + node.next;
                };
                nodes.push(JsonbNode {
                    kind: node.kind,
                    child: child,
                    next: sibling,
                    key_start: text_shift + node.key_start,
                    key_end: text_shift + node.key_end,
                    text_start: text_shift + node.text_start,
                    text_end: text_shift + node.text_end,
                });
                position += 1;
            }
            nodes[inserted] = jsonb_build_node(nodes[inserted], next, key_start, key_end);
        };
        if ready == false {
            return JsonbValue::Unknown;
        };
    };
    if previous == 0 {
        nodes[parent] = jsonb_path_child(nodes[parent], inserted);
    } else {
        nodes[previous] = jsonb_edit_link(nodes[previous], inserted);
    };
    jsonb_rebuild(
        JsonbValue::Value(JsonbPayload {
            characters: characters,
            nodes: nodes,
            root: input.root,
        }),
        true,
    )
}

fn jsonb_path_edit_known(
    input: JsonbPayload,
    path: ArrayPayload,
    replacement: JsonbValue,
    mode: i32,
) -> JsonbValue {
    if path.element_type != "pg_catalog.text" || path.element_kind != 8 {
        return JsonbValue::Unknown;
    };
    if path.dimensions.len() > 1 {
        return JsonbValue::Error(make_sql_error(JSONB_PATH_RANK));
    };
    let root = input.nodes[input.root];
    if root.kind < 5 {
        return JsonbValue::Error(make_sql_error(JSONB_PATH_PARAMETER));
    };
    if (root.child == 0 && mode < 2) || path.elements.len() == 0 {
        return JsonbValue::Value(input);
    };
    let mut parent = input.root;
    let mut position: usize = 0;
    while position < path.elements.len() {
        let element = path.elements[position].clone();
        if let ArrayElement::Null = element {
            return JsonbValue::Error(make_sql_error(JSONB_PATH_NULL));
        };
        let converted = array_element_to_text(element);
        let mut ready = false;
        if let TextValue::Value(key) = converted {
            ready = true;
            let node = input.nodes[parent];
            if node.kind < 5 {
                return JsonbValue::Value(input);
            };
            let mut selected: usize = 0;
            let mut previous: usize = 0;
            let mut next: usize = 0;
            let last = position + 1 == path.elements.len();
            if node.kind == 6 {
                let characters = JsonbExtractKey {
                    characters: key.chars().collect(),
                };
                let mut child = node.child;
                while child > 0 {
                    let field = input.nodes[child];
                    if jsonb_extract_matches(&input, field.key_start, field.key_end, &characters) {
                        selected = child;
                        next = field.next;
                        break;
                    };
                    previous = child;
                    child = field.next;
                }
                if selected > 0 && last && mode >= 3 {
                    return JsonbValue::Error(make_sql_error(JSONB_PATH_PARAMETER));
                };
            } else {
                let parsed = json_array_path_index(key.as_str());
                let mut count: i64 = 0i64;
                let mut child = node.child;
                while child > 0 {
                    count = count + 1i64;
                    child = input.nodes[child].next;
                }
                let mut wanted: i64 = 0i64;
                let mut valid = false;
                if let Int4Value::Value(number) = parsed {
                    valid = true;
                    wanted = number as i64;
                    if wanted < 0i64 {
                        wanted = count + wanted;
                    };
                };
                if valid == false {
                    return JsonbValue::Error(make_sql_error(JSONB_PATH_INDEX));
                };
                if wanted < 0i64 {
                    next = node.child;
                } else {
                    let mut offset: i64 = 0i64;
                    child = node.child;
                    while child > 0 {
                        if offset == wanted {
                            selected = child;
                            next = input.nodes[child].next;
                            break;
                        };
                        previous = child;
                        child = input.nodes[child].next;
                        offset = offset + 1i64;
                    }
                };
                if selected > 0 && last {
                    if mode == 3 {
                        next = selected;
                    } else if mode == 4 {
                        previous = selected;
                    };
                };
            };
            if last {
                if selected == 0 && mode < 2 {
                    return JsonbValue::Value(input);
                };
                return jsonb_path_splice(
                    input,
                    replacement,
                    parent,
                    previous,
                    next,
                    key.as_str(),
                    mode == 0,
                );
            };
            if selected == 0 {
                return JsonbValue::Value(input);
            };
            parent = selected;
        };
        if ready == false {
            return JsonbValue::Unknown;
        };
        position += 1;
    }
    JsonbValue::Value(input)
}

fn jsonb_path_edit(
    input: JsonbValue,
    path: ArrayValue,
    replacement: JsonbValue,
    flag: BoolValue,
    operation: i32,
) -> JsonbValue {
    if let JsonbValue::Error(error) = input {
        return JsonbValue::Error(error);
    };
    if let ArrayValue::Error(error) = path {
        return JsonbValue::Error(error);
    };
    if let JsonbValue::Error(error) = replacement {
        return JsonbValue::Error(error);
    };
    if let BoolValue::Error(error) = flag {
        return JsonbValue::Error(error);
    };
    if let JsonbValue::Null = input {
        return JsonbValue::Null;
    };
    if let ArrayValue::Null = path {
        return JsonbValue::Null;
    };
    if operation > 0 {
        if let JsonbValue::Null = replacement {
            return JsonbValue::Null;
        };
        if flag == BoolValue::Null {
            return JsonbValue::Null;
        };
    };
    if let JsonbValue::Value(value) = input {
        if let ArrayValue::Value(keys) = path {
            if let BoolValue::Value(setting) = flag {
                let mut mode: i32 = 0;
                if operation > 0 {
                    if let JsonbValue::Unknown = replacement {
                        return JsonbValue::Unknown;
                    };
                    mode = 1;
                    if setting {
                        mode = 2;
                    };
                    if operation == 2 {
                        mode = mode + 2;
                    };
                };
                return jsonb_path_edit_known(value, keys, replacement, mode);
            };
        };
    };
    JsonbValue::Unknown
}

pub fn sql__pg_catalog__jsonb_delete_path__1ziq(input: JsonbValue, path: ArrayValue) -> JsonbValue {
    jsonb_path_edit(input, path, JsonbValue::Null, make_bool_value(false), 0)
}

pub fn sql__pg_catalog__jsonb_set__6ysq(
    input: JsonbValue,
    path: ArrayValue,
    replacement: JsonbValue,
    create: BoolValue,
) -> JsonbValue {
    jsonb_path_edit(input, path, replacement, create, 1)
}

pub fn sql__pg_catalog__jsonb_insert__j3iu(
    input: JsonbValue,
    path: ArrayValue,
    replacement: JsonbValue,
    after: BoolValue,
) -> JsonbValue {
    jsonb_path_edit(input, path, replacement, after, 2)
}

pub fn sql__pg_catalog__jsonb_set_lax__lecq(
    input: JsonbValue,
    path: ArrayValue,
    replacement: JsonbValue,
    create: BoolValue,
    treatment: TextValue,
) -> JsonbValue {
    if let JsonbValue::Error(error) = input {
        return JsonbValue::Error(error);
    };
    if let ArrayValue::Error(error) = path {
        return JsonbValue::Error(error);
    };
    if let JsonbValue::Error(error) = replacement {
        return JsonbValue::Error(error);
    };
    if let BoolValue::Error(error) = create {
        return JsonbValue::Error(error);
    };
    if let TextValue::Error(error) = treatment {
        return JsonbValue::Error(error);
    };
    if let JsonbValue::Null = input {
        return JsonbValue::Null;
    };
    if let ArrayValue::Null = path {
        return JsonbValue::Null;
    };
    if create == BoolValue::Null {
        return JsonbValue::Null;
    };
    if let JsonbValue::Unknown = input {
        return JsonbValue::Unknown;
    };
    if let ArrayValue::Unknown = path {
        return JsonbValue::Unknown;
    };
    if create == BoolValue::Unknown {
        return JsonbValue::Unknown;
    };
    if treatment == TextValue::Null {
        return JsonbValue::Error(make_sql_error(JSONB_PATH_PARAMETER));
    };
    if (treatment == TextValue::Unknown || treatment == TextValue::NonNull) {
        return JsonbValue::Unknown;
    };
    if let JsonbValue::Unknown = replacement {
        return JsonbValue::Unknown;
    };
    let mut is_null = false;
    if let JsonbValue::Null = replacement {
        is_null = true;
    };
    if is_null == false {
        return sql__pg_catalog__jsonb_set__6ysq(input, path, replacement, create);
    };
    if let TextValue::Value(policy) = treatment {
        if policy == "raise_exception" {
            return JsonbValue::Error(make_sql_error(JSONB_PATH_NULL));
        };
        if policy == "return_target" {
            return input;
        };
        if policy == "delete_key" {
            return sql__pg_catalog__jsonb_delete_path__1ziq(input, path);
        };
        if policy == "use_json_null" {
            return sql__pg_catalog__jsonb_set__6ysq(input, path, make_jsonb_value("null"), create);
        };
        return JsonbValue::Error(make_sql_error(JSONB_PATH_PARAMETER));
    };
    JsonbValue::Unknown
}
