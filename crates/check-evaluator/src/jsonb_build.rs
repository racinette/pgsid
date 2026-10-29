fn jsonb_preorder(input: JsonbPayload) -> JsonbPayload {
    let mut links: Vec<usize> = Vec::new();
    let mut position: usize = 0;
    while position < input.nodes.len() {
        links.push(0);
        position += 1;
    }
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
    let mut pending: Vec<JsonbInputVisit> = Vec::new();
    pending.push(JsonbInputVisit {
        node: input.root,
        parent: -1,
    });
    let mut depth: usize = 1;
    while depth > 0 {
        depth = depth - 1;
        let visit = pending[depth];
        let mut node = input.nodes[visit.node];
        if visit.parent < 0 {
            node = jsonb_node_link(node, 0);
        };
        links[visit.node] = nodes.len();
        nodes.push(node);
        if node.next > 0 {
            let sibling = JsonbInputVisit {
                node: node.next,
                parent: visit.parent,
            };
            if depth == pending.len() {
                pending.push(sibling);
            } else {
                pending[depth] = sibling;
            };
            depth += 1;
        };
        if node.child > 0 {
            let child = JsonbInputVisit {
                node: node.child,
                parent: node.kind,
            };
            if depth == pending.len() {
                pending.push(child);
            } else {
                pending[depth] = child;
            };
            depth += 1;
        };
    }
    position = 1;
    while position < nodes.len() {
        let node = nodes[position];
        nodes[position] = JsonbNode {
            kind: node.kind,
            child: links[node.child],
            next: links[node.next],
            key_start: node.key_start,
            key_end: node.key_end,
            text_start: node.text_start,
            text_end: node.text_end,
        };
        position += 1;
    }
    JsonbPayload {
        characters: input.characters,
        nodes: nodes,
        root: 1,
    }
}

pub fn jsonb_rebuild(input: JsonbValue, admission: bool) -> JsonbValue {
    if let JsonbValue::Value(value) = input {
        let normalized = jsonb_normalize_objects(jsonb_preorder(value));
        if admission {
            let admitted = jsonb_storage_admission(&normalized);
            if let BoolValue::Error(error) = admitted {
                return JsonbValue::Error(error);
            };
            if let BoolValue::Unknown = admitted {
                return JsonbValue::Unknown;
            };
        };
        return JsonbValue::Value(normalized);
    };
    input
}

// Orders and deduplicates object members as normalization does, without storage admission:
// a shape with holes has no exact storage size.
pub fn jsonb_normalize_shape(input: JsonbPayload) -> JsonbPayload {
    jsonb_normalize_objects(jsonb_preorder(input))
}

// An edited shape becomes an exact, admitted value once no hole remains.
pub fn jsonb_shape_value(maximum: i64, shape: JsonbPayload) -> JsonbValue {
    let normalized = jsonb_normalize_shape(shape);
    if jsonb_shape_exact(&normalized, normalized.root) {
        return jsonb_rebuild(JsonbValue::Value(normalized), true);
    };
    jsonb_partial_tree(maximum, normalized)
}

pub fn jsonb_from_string(input: TextValue) -> JsonbValue {
    if let TextValue::Error(error) = input {
        return JsonbValue::Error(error);
    };
    if let TextValue::Null = input {
        return JsonbValue::Null;
    };
    if let TextValue::Value(value) = input {
        let characters: Vec<char> = value.chars().collect();
        let mut position: usize = 0;
        while position < characters.len() {
            if characters[position] == '\0' {
                return JsonbValue::Unknown;
            };
            position += 1;
        }
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
            kind: 4,
            child: 0,
            next: 0,
            key_start: 0,
            key_end: 0,
            text_start: 0,
            text_end: characters.len(),
        });
        let result = JsonbValue::Value(JsonbPayload {
            characters: characters,
            nodes: nodes,
            root: 1,
        });
        return jsonb_rebuild(result, true);
    };
    JsonbValue::Unknown
}

pub fn jsonb_detach_subtree(input: JsonbPayload) -> JsonbPayload {
    let compact = jsonb_preorder(input);
    let mut characters: Vec<char> = Vec::new();
    let mut nodes: Vec<JsonbNode> = Vec::new();
    nodes.push(compact.nodes[0]);
    let mut position: usize = 1;
    while position < compact.nodes.len() {
        let node = compact.nodes[position];
        let key_start = characters.len();
        let mut offset = node.key_start;
        while offset < node.key_end {
            characters.push(compact.characters[offset]);
            offset += 1;
        }
        let key_end = characters.len();
        let text_start = characters.len();
        offset = node.text_start;
        while offset < node.text_end {
            characters.push(compact.characters[offset]);
            offset += 1;
        }
        nodes.push(JsonbNode {
            kind: node.kind,
            child: node.child,
            next: node.next,
            key_start: key_start,
            key_end: key_end,
            text_start: text_start,
            text_end: characters.len(),
        });
        position += 1;
    }
    JsonbPayload {
        characters: characters,
        nodes: nodes,
        root: compact.root,
    }
}
