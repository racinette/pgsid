#[derive(Clone, Copy)]
struct JsonbArrayFrame {
    node: usize,
    tail: usize,
    dimension: usize,
    count: i32,
}

fn jsonb_array_node(child: usize) -> JsonbNode {
    JsonbNode {
        kind: 5,
        child: child,
        next: 0,
        key_start: 0,
        key_end: 0,
        text_start: 0,
        text_end: 0,
    }
}

pub(crate) fn jsonb_array_input_value(input: JsonbArrayInputPayload) -> JsonbValue {
    let mut dimensions: Vec<ArrayDimension> = Vec::new();
    let mut dimension: usize = 0;
    while dimension < input.dimensions.len() {
        dimensions.push(input.dimensions[dimension]);
        dimension += 1;
    }
    let batch = jsonb_array_input_arguments(input);
    let flat = sql__pg_catalog__jsonb_build_array__gfm5(batch);
    if dimensions.len() < 2 {
        return flat;
    };
    if let JsonbValue::Value(value) = flat {
        let mut nodes = value.nodes;
        let mut leaf = nodes[value.root].child;
        let root = nodes.len();
        nodes.push(jsonb_array_node(0));
        let mut frames: Vec<JsonbArrayFrame> = Vec::new();
        frames.push(JsonbArrayFrame {
            node: root,
            tail: 0,
            dimension: 0,
            count: 0,
        });
        let mut depth: usize = 1;
        while depth > 0 {
            let frame = frames[depth - 1];
            if frame.count == dimensions[frame.dimension].length {
                depth = depth - 1;
            } else {
                let mut child = leaf;
                let container = frame.dimension + 1 < dimensions.len();
                if container {
                    child = nodes.len();
                    nodes.push(jsonb_array_node(0));
                } else {
                    leaf = nodes[child].next;
                    let node = nodes[child];
                    nodes[child] = jsonb_build_node(node, 0, node.key_start, node.key_end);
                };
                if frame.tail == 0 {
                    let node = nodes[frame.node];
                    nodes[frame.node] = JsonbNode {
                        kind: node.kind,
                        child: child,
                        next: node.next,
                        key_start: node.key_start,
                        key_end: node.key_end,
                        text_start: node.text_start,
                        text_end: node.text_end,
                    };
                } else {
                    let node = nodes[frame.tail];
                    nodes[frame.tail] = jsonb_build_node(node, child, node.key_start, node.key_end);
                };
                frames[depth - 1] = JsonbArrayFrame {
                    node: frame.node,
                    tail: child,
                    dimension: frame.dimension,
                    count: frame.count + 1,
                };
                if container {
                    let next = JsonbArrayFrame {
                        node: child,
                        tail: 0,
                        dimension: frame.dimension + 1,
                        count: 0,
                    };
                    if depth < frames.len() {
                        frames[depth] = next;
                    } else {
                        frames.push(next);
                    };
                    depth += 1;
                };
            };
        }
        return jsonb_rebuild(
            JsonbValue::Value(JsonbPayload {
                characters: value.characters,
                nodes: nodes,
                root: root,
            }),
            true,
        );
    };
    flat
}

pub(crate) fn jsonb_array_key_input(input: ArrayValue) -> JsonbInput {
    if let ArrayValue::Error(error) = input {
        return JsonbInput::Error(error);
    };
    if let ArrayValue::Unknown = input {
        return JsonbInput::Unknown;
    };
    if let ArrayValue::Null = input {
        return JsonbInput::Null;
    };
    let marker = make_jsonb_value("[]");
    jsonb_input_from_jsonb(marker)
}

pub(crate) fn jsonb_array_value_input(input: ArrayValue, converted: JsonbValue) -> JsonbInput {
    if let ArrayValue::Error(error) = input {
        return JsonbInput::Error(error);
    };
    if let JsonbValue::Error(error) = converted {
        return JsonbInput::ConvertedError(error);
    };
    jsonb_input_from_jsonb(converted)
}
