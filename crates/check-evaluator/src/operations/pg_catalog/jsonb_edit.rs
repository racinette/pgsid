const JSONB_EDIT_PARAMETER: u32 = 3452619;

fn jsonb_edit_link(node: JsonbNode, next: usize) -> JsonbNode {
    JsonbNode {
        kind: node.kind,
        child: node.child,
        next: next,
        key_start: node.key_start,
        key_end: node.key_end,
        text_start: node.text_start,
        text_end: node.text_end,
    }
}

fn jsonb_edit_concat(left: JsonbPayload, right: JsonbPayload) -> JsonbValue {
    let a = left.nodes[left.root];
    let b = right.nodes[right.root];
    if a.kind == b.kind && a.kind >= 5 {
        if a.child == 0 {
            return JsonbValue::Value(right);
        };
        if b.child == 0 {
            return JsonbValue::Value(left);
        };
    };
    let mut characters = left.characters;
    let text_shift = characters.len();
    let mut index: usize = 0;
    while index < right.characters.len() {
        characters.push(right.characters[index]);
        index += 1;
    }
    let mut nodes = left.nodes;
    let node_shift = nodes.len() - 1;
    let second = node_shift + right.root;
    index = 1;
    while index < right.nodes.len() {
        let node = right.nodes[index];
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
        index += 1;
    }
    let mut kind: i32 = 5;
    if a.kind == 6 && b.kind == 6 {
        kind = 6;
    };
    let mut first = left.root;
    let mut last = second;
    if a.kind == 5 || kind == 6 {
        first = a.child;
    } else {
        nodes[first] = jsonb_edit_link(nodes[first], 0);
    };
    if b.kind == 5 || kind == 6 {
        last = nodes[second].child;
    } else {
        nodes[second] = jsonb_edit_link(nodes[second], 0);
    };
    if first == 0 {
        first = last;
    } else {
        let mut tail = first;
        while nodes[tail].next > 0 {
            tail = nodes[tail].next;
        }
        nodes[tail] = jsonb_edit_link(nodes[tail], last);
    };
    let root = nodes.len();
    nodes.push(JsonbNode {
        kind: kind,
        child: first,
        next: 0,
        key_start: 0,
        key_end: 0,
        text_start: 0,
        text_end: 0,
    });
    jsonb_rebuild(
        JsonbValue::Value(JsonbPayload {
            characters: characters,
            nodes: nodes,
            root: root,
        }),
        true,
    )
}

fn jsonb_edit_facts(input: JsonbValue) -> JsonbKnowledge {
    if let JsonbValue::NonNull(facts) = input {
        return facts;
    };
    if let JsonbValue::Value(value) = input {
        let root = value.nodes[value.root];
        let mut length: i32 = 1;
        if root.kind >= 5 {
            length = jsonb_relation_count(&value, root) as i32;
        };
        return JsonbKnowledge {
            maximum: jsonb_partial_bound(&value),
            kind: root.kind,
            length: length,
        };
    };
    JsonbKnowledge {
        maximum: -1i64,
        kind: -1,
        length: -1,
    }
}

fn jsonb_edit_partial_concat(left: JsonbValue, right: JsonbValue) -> JsonbValue {
    let a = jsonb_edit_facts(left.clone());
    let b = jsonb_edit_facts(right.clone());
    if a.kind == b.kind && a.kind >= 5 {
        if a.length == 0 {
            return right;
        };
        if b.length == 0 {
            return left;
        };
    };
    let mut kind: i32 = -1;
    if a.kind >= 0 && b.kind >= 0 {
        kind = 5;
        if a.kind == 6 && b.kind == 6 {
            kind = 6;
        };
    } else if a.kind == 5
        || b.kind == 5
        || (a.kind >= 0 && a.kind < 5)
        || (b.kind >= 0 && b.kind < 5)
    {
        kind = 5;
    };
    let mut length: i32 = -1;
    if kind == 5 {
        let mut first: i32 = -1;
        let mut second: i32 = -1;
        if a.kind >= 0 {
            first = 1;
            if a.kind == 5 {
                first = a.length;
            };
        };
        if b.kind >= 0 {
            second = 1;
            if b.kind == 5 {
                second = b.length;
            };
        };
        if first >= 0 && second >= 0 {
            let count = first as i64 + second as i64;
            if count <= 2147483647i64 {
                length = count as i32;
            };
        };
    };
    let combined = jsonb_partial_add(a.maximum, b.maximum);
    // Allow a new array wrapper, entries and alignment when roots become elements.
    let maximum = jsonb_partial_add(combined, 32i64);
    jsonb_partial_shape(maximum, kind, length)
}

pub fn sql__pg_catalog__jsonb_concat__j7e0(left: JsonbValue, right: JsonbValue) -> JsonbValue {
    if let JsonbValue::Error(error) = left {
        return JsonbValue::Error(error);
    };
    if let JsonbValue::Error(error) = right {
        return JsonbValue::Error(error);
    };
    if let JsonbValue::Unknown = left {
        return JsonbValue::Unknown;
    };
    if let JsonbValue::Unknown = right {
        return JsonbValue::Unknown;
    };
    if let JsonbValue::Null = left {
        return JsonbValue::Null;
    };
    if let JsonbValue::Null = right {
        return JsonbValue::Null;
    };
    let mut partial = false;
    if let JsonbValue::NonNull(_) = left {
        partial = true;
    };
    if let JsonbValue::NonNull(_) = right {
        partial = true;
    };
    if partial {
        return jsonb_edit_partial_concat(left, right);
    };
    if let JsonbValue::Value(a) = left {
        if let JsonbValue::Value(b) = right {
            return jsonb_edit_concat(a, b);
        };
    };
    JsonbValue::Unknown
}

fn jsonb_edit_remove(
    input: JsonbPayload,
    key: &JsonbExtractKey,
    selected: i64,
    by_index: bool,
) -> JsonbValue {
    let root = input.nodes[input.root];
    let mut kept: Vec<usize> = Vec::new();
    let mut child = root.child;
    let mut index: i64 = 0i64;
    let mut changed = false;
    while child > 0 {
        let node = input.nodes[child];
        let mut remove = by_index && index == selected;
        if by_index == false {
            if root.kind == 6 {
                remove = jsonb_extract_matches(&input, node.key_start, node.key_end, key);
            } else if node.kind == 4 {
                remove = jsonb_extract_matches(&input, node.text_start, node.text_end, key);
            };
        };
        if remove {
            changed = true;
        } else {
            kept.push(child);
        };
        child = node.next;
        index = index + 1i64;
    }
    if changed == false {
        return JsonbValue::Value(input);
    };
    let mut nodes = input.nodes;
    let mut first: usize = 0;
    let mut position: usize = 0;
    while position < kept.len() {
        let current = kept[position];
        if position == 0 {
            first = current;
        };
        let mut next: usize = 0;
        if position + 1 < kept.len() {
            next = kept[position + 1];
        };
        nodes[current] = jsonb_edit_link(nodes[current], next);
        position += 1;
    }
    nodes[input.root] = JsonbNode {
        kind: root.kind,
        child: first,
        next: 0,
        key_start: root.key_start,
        key_end: root.key_end,
        text_start: root.text_start,
        text_end: root.text_end,
    };
    jsonb_rebuild(
        JsonbValue::Value(JsonbPayload {
            characters: input.characters,
            nodes: nodes,
            root: input.root,
        }),
        false,
    )
}

pub fn sql__pg_catalog__jsonb_delete__cow2(input: JsonbValue, key: TextValue) -> JsonbValue {
    if let JsonbValue::Error(error) = input {
        return JsonbValue::Error(error);
    };
    if let TextValue::Error(error) = key {
        return JsonbValue::Error(error);
    };
    if let JsonbValue::Unknown = input {
        return JsonbValue::Unknown;
    };
    if key == TextValue::Unknown {
        return JsonbValue::Unknown;
    };
    if let JsonbValue::Null = input {
        return JsonbValue::Null;
    };
    if let TextValue::Null = key {
        return JsonbValue::Null;
    };
    if let JsonbValue::NonNull(facts) = input {
        if facts.kind >= 0 && facts.kind < 5 {
            return JsonbValue::Error(make_sql_error(JSONB_EDIT_PARAMETER));
        };
        if facts.kind == 5 || facts.kind == 6 {
            return jsonb_partial_shape(facts.maximum, facts.kind, -1);
        };
        return JsonbValue::Unknown;
    };
    if let JsonbValue::Value(value) = input {
        if value.nodes[value.root].kind < 5 {
            return JsonbValue::Error(make_sql_error(JSONB_EDIT_PARAMETER));
        };
        if let TextValue::Value(text) = key {
            let characters = JsonbExtractKey {
                characters: text.chars().collect(),
            };
            return jsonb_edit_remove(value, &characters, 0i64, false);
        };
    };
    JsonbValue::Unknown
}

pub fn sql__pg_catalog__jsonb_delete__btgy(input: JsonbValue, index: Int4Value) -> JsonbValue {
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
    if let JsonbValue::Null = input {
        return JsonbValue::Null;
    };
    if let Int4Value::Null = index {
        return JsonbValue::Null;
    };
    if let JsonbValue::NonNull(facts) = input {
        if facts.kind >= 0 && facts.kind != 5 {
            return JsonbValue::Error(make_sql_error(JSONB_EDIT_PARAMETER));
        };
        if facts.kind == 5 {
            if let Int4Value::Value(position) = index {
                let mut length = facts.length;
                if length >= 0 {
                    let mut selected = position as i64;
                    if selected < 0i64 {
                        selected = selected + length as i64;
                    };
                    if selected >= 0i64 && selected < length as i64 {
                        length = length - 1;
                    };
                    if length == 0 {
                        return make_jsonb_value("[]");
                    };
                };
                return jsonb_partial_shape(facts.maximum, 5, length);
            };
        };
        return JsonbValue::Unknown;
    };
    if let JsonbValue::Value(value) = input {
        let root = value.nodes[value.root];
        if root.kind != 5 {
            return JsonbValue::Error(make_sql_error(JSONB_EDIT_PARAMETER));
        };
        if let Int4Value::Value(position) = index {
            let mut selected = position as i64;
            if position < 0 {
                let count = jsonb_relation_count(&value, root) as i32;
                let length = count as i64;
                selected = length + selected;
            };
            let empty: Vec<char> = Vec::new();
            let key = JsonbExtractKey { characters: empty };
            return jsonb_edit_remove(value, &key, selected, true);
        };
    };
    JsonbValue::Unknown
}
