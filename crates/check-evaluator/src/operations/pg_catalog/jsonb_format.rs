fn jsonb_format_child(node: JsonbNode, child: usize) -> JsonbNode {
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

fn jsonb_format_strip(input: JsonbPayload, arrays: bool) -> JsonbValue {
    if input.nodes[input.root].kind < 5 {
        return JsonbValue::Value(input);
    };
    let mut nodes = input.nodes;
    let mut pending: Vec<usize> = Vec::new();
    pending.push(input.root);
    let mut depth: usize = 1;
    let mut changed = false;
    while depth > 0 {
        depth = depth - 1;
        let parent = pending[depth];
        let container = nodes[parent];
        let mut child = container.child;
        let mut first: usize = 0;
        let mut last: usize = 0;
        while child > 0 {
            let node = nodes[child];
            if node.kind == 0 && (container.kind == 6 || arrays) {
                changed = true;
            } else {
                if first == 0 {
                    first = child;
                };
                if last > 0 {
                    nodes[last] = jsonb_edit_link(nodes[last], child);
                };
                last = child;
                if node.kind >= 5 {
                    if depth == pending.len() {
                        pending.push(child);
                    } else {
                        pending[depth] = child;
                    };
                    depth += 1;
                };
            };
            child = node.next;
        }
        if last > 0 {
            nodes[last] = jsonb_edit_link(nodes[last], 0);
        };
        nodes[parent] = jsonb_format_child(container, first);
    }
    let result = JsonbValue::Value(JsonbPayload {
        characters: input.characters,
        nodes: nodes,
        root: input.root,
    });
    if changed {
        return jsonb_rebuild(result, false);
    };
    result
}

pub fn sql__pg_catalog__jsonb_strip_nulls__ruwp(
    input: JsonbValue,
    arrays: BoolValue,
) -> JsonbValue {
    let mut unresolved_flavor: i32 = 0;
    if let JsonbValue::Unknown = input { unresolved_flavor = 1; };
    if let BoolValue::Unknown = arrays { unresolved_flavor = 1; };
    if let JsonbValue::Unimplemented = input { unresolved_flavor = 2; };
    if let BoolValue::Unimplemented = arrays { unresolved_flavor = 2; };
    if let JsonbValue::Error(error) = input {
        return JsonbValue::Error(error);
    };
    if let BoolValue::Error(error) = arrays {
        return JsonbValue::Error(error);
    };
    let mut condition_flavor_83_4: i32 = unresolved_flavor; if let JsonbValue::Unknown = input { if condition_flavor_83_4 < 1 { condition_flavor_83_4 = 1; }; }; if let JsonbValue::Unknown = input {
        return jsonb_unresolved(condition_flavor_83_4);
    }; let mut condition_flavor_85_7: i32 = unresolved_flavor; if let JsonbValue::Unimplemented = input { condition_flavor_85_7 = 2; }; if let JsonbValue::Unimplemented = input {
        return jsonb_unresolved(condition_flavor_85_7);
    };
    let mut condition_flavor_88_4: i32 = unresolved_flavor; if let BoolValue::Unknown = arrays { if condition_flavor_88_4 < 1 { condition_flavor_88_4 = 1; }; }; if let BoolValue::Unimplemented = arrays { condition_flavor_88_4 = 2; }; if (arrays == BoolValue::Unknown || arrays == BoolValue::Unimplemented) {
        return jsonb_unresolved(condition_flavor_88_4);
    };
    if let JsonbValue::Null = input {
        return JsonbValue::Null;
    };
    if arrays == BoolValue::Null {
        return JsonbValue::Null;
    };
    if let JsonbValue::NonNull(facts) = input {
        let mut length = facts.length;
        if arrays == BoolValue::Value(true) && facts.kind == 5 && length != 0 {
            length = -1;
        };
        return jsonb_partial_shape(facts.maximum, facts.kind, length);
    };
    if let JsonbValue::Value(value) = input {
        if let BoolValue::Value(remove) = arrays {
            return jsonb_format_strip(value, remove);
        };
    };
    jsonb_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__jsonb_pretty__gz4i(input: JsonbValue, utf8: bool) -> TextValue {
    jsonb_pretty_context(input, utf8)
}
