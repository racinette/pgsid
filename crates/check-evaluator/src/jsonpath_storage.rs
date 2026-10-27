pub fn make_stored_jsonpath_payload(lax: bool, root: i32) -> JsonpathPayload {
    let characters: Vec<char> = Vec::new();
    let mut nodes: Vec<JsonpathNode> = Vec::new();
    nodes.push(JsonpathNode {
        kind: 0,
        next: 0,
        left: 0,
        right: 0,
        text_start: 0,
        text_end: 0,
        first: 0,
        last: 0,
        flags: 0,
    });
    JsonpathPayload {
        characters: characters,
        nodes: nodes,
        root: usize::try_from(root).unwrap_or(0),
        lax: lax,
    }
}

pub fn append_stored_jsonpath_node(
    input: JsonpathPayload,
    kind: i32,
    next: i32,
    left: i32,
    right: i32,
    text: &str,
    first: i32,
    last: i32,
    flags: i32,
) -> JsonpathPayload {
    let mut characters = input.characters;
    let mut nodes = input.nodes;
    let mut root = input.root;
    if next < 0 || left < 0 || right < 0 {
        root = 0;
    };
    let start = characters.len();
    let source: Vec<char> = text.chars().collect();
    let mut index: usize = 0;
    while index < source.len() {
        characters.push(source[index]);
        index += 1;
    }
    nodes.push(JsonpathNode {
        kind: kind,
        next: usize::try_from(next).unwrap_or(0),
        left: usize::try_from(left).unwrap_or(0),
        right: usize::try_from(right).unwrap_or(0),
        text_start: start,
        text_end: characters.len(),
        first: first,
        last: last,
        flags: flags,
    });
    JsonpathPayload {
        characters: characters,
        nodes: nodes,
        root: root,
        lax: input.lax,
    }
}

pub fn make_stored_jsonpath_value(input: JsonpathPayload) -> JsonpathValue {
    jsonpath_from_coerced_value(JsonpathValue::Value(input))
}
