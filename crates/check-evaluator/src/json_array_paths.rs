#[derive(Clone, Copy)]
struct JsonArrayPathNode {
    kind: i32,
    start: usize,
    end: usize,
    child: usize,
    next: usize,
    key_start: usize,
    key_end: usize,
}
#[derive(Clone, Copy)]
struct JsonArrayPathFrame {
    node: usize,
    tail: usize,
    state: i32,
    key_start: usize,
    key_end: usize,
}
#[derive(Clone)]
struct JsonArrayPathDocument {
    characters: Vec<char>,
    names: Vec<char>,
    nodes: Vec<JsonArrayPathNode>,
    root: usize,
    state: i32,
    error: SqlError,
}
#[derive(Clone)]
struct JsonArrayPathCandidates {
    nodes: Vec<usize>,
    state: i32,
}

pub(crate) fn json_array_path_state(input: ArrayValue) -> Int4Value {
    if let ArrayValue::Error(error) = input {
        return Int4Value::Error(error);
    };
    if let ArrayValue::Null = input {
        return Int4Value::Null;
    };
    if let ArrayValue::Value(value) = input {
        if value.element_type != "pg_catalog.text" || value.element_kind != 8 {
            return Int4Value::Unknown;
        };
        let mut position: usize = 0;
        while position < value.elements.len() {
            let element = value.elements[position].clone();
            if let ArrayElement::Null = element {
                return Int4Value::Null;
            };
            position += 1;
        }
        return make_int4_value(value.elements.len() as i32);
    };
    Int4Value::Unknown
}

pub(crate) fn json_array_path_index(input: &str) -> Int4Value {
    let characters: Vec<char> = input.chars().collect();
    let mut position: usize = 0;
    while position < characters.len() {
        let ch = characters[position];
        if ch != ' ' && ch != '\t' && ch != '\n' && ch != '\r' && ch != '\x0b' && ch != '\x0c' {
            break;
        };
        position += 1;
    }
    let mut negative = false;
    if position < characters.len() {
        if characters[position] == '-' {
            negative = true;
            position += 1;
        } else if characters[position] == '+' {
            position += 1;
        };
    };
    let start = position;
    let mut magnitude: i64 = 0i64;
    let mut limit: i64 = 2147483647i64;
    if negative {
        limit = 2147483648i64;
    };
    while position < characters.len() {
        let digit = characters[position] as i32 - 48;
        if digit < 0 || digit > 9 || magnitude > (limit - (digit as i64)) / 10i64 {
            return Int4Value::Null;
        };
        magnitude = magnitude * 10i64 + (digit as i64);
        position += 1;
    }
    if position == start {
        return Int4Value::Null;
    };
    if negative {
        magnitude = 0i64 - magnitude;
    };
    make_int4_value(magnitude as i32)
}

fn json_array_path_empty(state: i32, error: SqlError) -> JsonArrayPathDocument {
    let characters: Vec<char> = Vec::new();
    let names: Vec<char> = Vec::new();
    let nodes: Vec<JsonArrayPathNode> = Vec::new();
    JsonArrayPathDocument {
        characters: characters,
        names: names,
        nodes: nodes,
        root: 0,
        state: state,
        error: error,
    }
}

fn json_array_path_node_child(node: JsonArrayPathNode, value: usize) -> JsonArrayPathNode {
    JsonArrayPathNode {
        kind: node.kind,
        start: node.start,
        end: node.end,
        child: value,
        next: node.next,
        key_start: node.key_start,
        key_end: node.key_end,
    }
}

fn json_array_path_node_next(node: JsonArrayPathNode, value: usize) -> JsonArrayPathNode {
    JsonArrayPathNode {
        kind: node.kind,
        start: node.start,
        end: node.end,
        child: node.child,
        next: value,
        key_start: node.key_start,
        key_end: node.key_end,
    }
}

fn json_array_path_node_end(node: JsonArrayPathNode, value: usize) -> JsonArrayPathNode {
    JsonArrayPathNode {
        kind: node.kind,
        start: node.start,
        end: value,
        child: node.child,
        next: node.next,
        key_start: node.key_start,
        key_end: node.key_end,
    }
}

fn parse_json_array_path_document(input: &str, utf8: bool) -> JsonArrayPathDocument {
    let source = JsonSyntaxSource {
        characters: input.chars().collect(),
    };
    let mut nodes: Vec<JsonArrayPathNode> = Vec::new();
    nodes.push(JsonArrayPathNode {
        kind: -1,
        start: 0,
        end: 0,
        child: 0,
        next: 0,
        key_start: 0,
        key_end: 0,
    });
    let mut names: Vec<char> = Vec::new();
    let mut frames: Vec<JsonArrayPathFrame> = Vec::new();
    let mut depth: usize = 0;
    let mut position: usize = 0;
    let mut root: usize = 0;
    while position < source.characters.len() {
        let token = json_read_next_token(&source, position);
        if token.kind == JSON_READ_END {
            break;
        };
        if token.syntax == JSON_SYNTAX_INVALID {
            return json_array_path_empty(-2, make_sql_error(JSON_READ_INVALID_TEXT));
        };
        let mut decoded = TextValue::Null;
        if token.kind == JSON_READ_QUOTE {
            decoded = json_read_decode_string_context(&source, token, utf8);
            if let TextValue::Error(error) = decoded {
                return json_array_path_empty(-2, error);
            };
            if (decoded == TextValue::Unknown || decoded == TextValue::NonNull) {
                return json_array_path_empty(-1, make_sql_error(0));
            };
        };
        let mut key = false;
        if depth > 0 {
            let frame = frames[depth - 1];
            if nodes[frame.node].kind == 6 && frame.state == 0 && token.kind == JSON_READ_QUOTE {
                let begin = names.len();
                if let TextValue::Value(text) = decoded {
                    let characters: Vec<char> = text.chars().collect();
                    let mut index: usize = 0;
                    while index < characters.len() {
                        names.push(characters[index]);
                        index += 1;
                    }
                };
                frames[depth - 1] = JsonArrayPathFrame {
                    node: frame.node,
                    tail: frame.tail,
                    state: 1,
                    key_start: begin,
                    key_end: names.len(),
                };
                key = true;
            };
        };
        if key == false {
            if token.kind == JSON_READ_COLON || token.kind == JSON_READ_COMMA {
                if depth > 0 {
                    let frame = frames[depth - 1];
                    let mut state: i32 = 0;
                    if token.kind == JSON_READ_COLON || nodes[frame.node].kind == 5 {
                        state = 2;
                    };
                    frames[depth - 1] = JsonArrayPathFrame {
                        node: frame.node,
                        tail: frame.tail,
                        state: state,
                        key_start: frame.key_start,
                        key_end: frame.key_end,
                    };
                };
            } else if token.kind == JSON_READ_OBJECT_CLOSE || token.kind == JSON_READ_ARRAY_CLOSE {
                if depth == 0 {
                    return json_array_path_empty(-2, make_sql_error(JSON_READ_INVALID_TEXT));
                };
                let frame = frames[depth - 1];
                nodes[frame.node] = json_array_path_node_end(nodes[frame.node], token.end);
                depth = depth - 1;
            } else {
                let mut kind: i32 = 3;
                if token.kind == JSON_READ_OBJECT_OPEN {
                    kind = 6;
                } else if token.kind == JSON_READ_ARRAY_OPEN {
                    kind = 5;
                } else if token.kind == JSON_READ_QUOTE {
                    kind = 4;
                } else if source.characters[token.start] == 'n' {
                    kind = 0;
                } else if source.characters[token.start] == 't' {
                    kind = 1;
                } else if source.characters[token.start] == 'f' {
                    kind = 2;
                };
                let mut key_start: usize = 0;
                let mut key_end: usize = 0;
                let index = nodes.len();
                if depth > 0 {
                    let frame = frames[depth - 1];
                    key_start = frame.key_start;
                    key_end = frame.key_end;
                    if frame.tail > 0 {
                        nodes[frame.tail] = json_array_path_node_next(nodes[frame.tail], index);
                    } else {
                        nodes[frame.node] = json_array_path_node_child(nodes[frame.node], index);
                    };
                    frames[depth - 1] = JsonArrayPathFrame {
                        node: frame.node,
                        tail: index,
                        state: 3,
                        key_start: frame.key_start,
                        key_end: frame.key_end,
                    };
                } else {
                    root = index;
                };
                nodes.push(JsonArrayPathNode {
                    kind: kind,
                    start: token.start,
                    end: token.end,
                    child: 0,
                    next: 0,
                    key_start: key_start,
                    key_end: key_end,
                });
                if kind == 5 || kind == 6 {
                    let mut state: i32 = 0;
                    if kind == 5 {
                        state = 2;
                    };
                    let frame = JsonArrayPathFrame {
                        node: index,
                        tail: 0,
                        state: state,
                        key_start: 0,
                        key_end: 0,
                    };
                    if depth < frames.len() {
                        frames[depth] = frame;
                    } else {
                        frames.push(frame);
                    };
                    depth += 1;
                };
            };
        };
        position = token.end;
    }
    JsonArrayPathDocument {
        characters: source.characters,
        names: names,
        nodes: nodes,
        root: root,
        state: 1,
        error: make_sql_error(0),
    }
}

fn json_array_path_key_matches(
    source: &JsonArrayPathDocument,
    node: JsonArrayPathNode,
    key: &JsonSyntaxSource,
) -> bool {
    if node.key_end - node.key_start != key.characters.len() {
        return false;
    };
    let mut position: usize = 0;
    while position < key.characters.len() {
        if source.names[node.key_start + position] != key.characters[position] {
            return false;
        };
        position += 1;
    }
    true
}

fn json_array_path_next(
    source: &JsonArrayPathDocument,
    current: JsonArrayPathCandidates,
    key: TextValue,
) -> JsonArrayPathCandidates {
    let mut output: Vec<usize> = Vec::new();
    if let TextValue::Value(text) = key {
        let characters = JsonSyntaxSource {
            characters: text.chars().collect(),
        };
        let index = json_array_path_index(text.as_str());
        let mut position: usize = 0;
        while position < current.nodes.len() {
            let node = source.nodes[current.nodes[position]];
            if node.kind == 6 {
                let mut child = node.child;
                while child > 0 {
                    let field = source.nodes[child];
                    if json_array_path_key_matches(source, field, &characters) {
                        output.push(child);
                    };
                    child = field.next;
                }
            } else if node.kind == 5 {
                if let Int4Value::Value(number) = index {
                    let mut count: i64 = 0i64;
                    let mut child = node.child;
                    while child > 0 {
                        count = count + 1i64;
                        child = source.nodes[child].next;
                    }
                    let mut wanted = number as i64;
                    if wanted < 0i64 {
                        wanted = count + wanted;
                    };
                    let mut offset: i64 = 0i64;
                    child = node.child;
                    while child > 0 {
                        if offset == wanted {
                            output.push(child);
                            break;
                        };
                        offset = offset + 1i64;
                        child = source.nodes[child].next;
                    }
                };
            };
            position += 1;
        }
        return JsonArrayPathCandidates {
            nodes: output,
            state: 1,
        };
    };
    let mut position: usize = 0;
    while position < current.nodes.len() {
        let node = source.nodes[current.nodes[position]];
        if (node.kind == 5 || node.kind == 6) && node.child > 0 {
            return JsonArrayPathCandidates {
                nodes: output,
                state: -1,
            };
        };
        position += 1;
    }
    JsonArrayPathCandidates {
        nodes: output,
        state: 1,
    }
}

pub(crate) fn json_read_array_path(
    input: JsonValue,
    path: ArrayValue,
    as_text: bool,
    utf8: bool,
) -> TextValue {
    if let JsonValue::Error(error) = input {
        return TextValue::Error(error);
    };
    let path_state = json_array_path_state(path.clone());
    if let Int4Value::Error(error) = path_state {
        return TextValue::Error(error);
    };
    if let JsonValue::Null = input {
        return TextValue::Null;
    };
    if path_state == Int4Value::Null {
        return TextValue::Null;
    };
    if path_state == Int4Value::Unknown {
        return TextValue::Unknown;
    };
    if let JsonValue::Value(value) = input {
        if let ArrayValue::Value(keys) = path {
            let mut uncertain = false;
            let mut index: usize = 0;
            while index < keys.elements.len() {
                let key = keys.elements[index].clone();
                if let ArrayElement::Unknown = key {
                    uncertain = true;
                };
                index += 1;
            }
            let document = parse_json_array_path_document(value.source.as_str(), utf8);
            if document.state == -2 {
                if uncertain {
                    return TextValue::Unknown;
                };
                return TextValue::Error(document.error);
            };
            if document.state != 1 || document.root == 0 {
                return TextValue::Unknown;
            };
            let mut initial: Vec<usize> = Vec::new();
            initial.push(document.root);
            let mut candidates = JsonArrayPathCandidates {
                nodes: initial,
                state: 1,
            };
            index = 0;
            while index < keys.elements.len() {
                let key = array_element_to_text(keys.elements[index].clone());
                candidates = json_array_path_next(&document, candidates, key);
                if candidates.state != 1 {
                    return TextValue::Unknown;
                };
                if candidates.nodes.len() == 0 {
                    return TextValue::Null;
                };
                index += 1;
            }
            let selected = candidates.nodes[candidates.nodes.len() - 1];
            let node = document.nodes[selected];
            let source = JsonSyntaxSource {
                characters: document.characters,
            };
            if as_text && node.kind == 0 {
                return TextValue::Null;
            };
            if as_text && node.kind == 4 {
                let token = json_read_next_token(&source, node.start);
                return json_read_decode_string_context(&source, token, utf8);
            };
            if keys.elements.len() == 0 && node.kind < 5 {
                return json_read_slice(&source, 0, node.end);
            };
            return json_read_slice(&source, node.start, node.end);
        };
    };
    TextValue::Unknown
}
