#[derive(Clone, Copy)]
struct XmlNodeList {
    count: usize,
    first_kind: i32,
    first_bytes: i64,
    last_kind: i32,
    last_bytes: i64,
}

#[derive(Clone, Copy)]
struct XmlTextState {
    kind: i32,
    bytes: i64,
    valid: bool,
    nodes: XmlNodeList,
}

#[derive(Clone, Copy)]
struct XmlTextScan {
    next: usize,
    state: XmlTextState,
}

fn xml_empty_nodes() -> XmlNodeList {
    XmlNodeList {
        count: 0,
        first_kind: 0,
        first_bytes: 0i64,
        last_kind: 0,
        last_bytes: 0i64,
    }
}

fn xml_new_text() -> XmlTextState {
    XmlTextState {
        kind: 0,
        bytes: 0i64,
        valid: true,
        nodes: xml_empty_nodes(),
    }
}

fn xml_reset_text(input: XmlTextState) -> XmlTextState {
    XmlTextState {
        kind: 0,
        bytes: 0i64,
        valid: input.valid,
        nodes: input.nodes,
    }
}

fn xml_text_event(input: XmlTextState, kind: i32, bytes: i64, root: bool) -> XmlTextState {
    let mut length = bytes;
    let mut valid = input.valid;
    if kind == 1 && input.kind == kind {
        length = length + input.bytes;
        if length > 10000000i64 {
            valid = false;
        }
    }
    let mut nodes = input.nodes;
    if root {
        if nodes.count == 0 {
            nodes = XmlNodeList {
                count: 1,
                first_kind: kind,
                first_bytes: bytes,
                last_kind: kind,
                last_bytes: bytes,
            };
        } else if kind == 1 && nodes.last_kind == kind {
            let total = nodes.last_bytes + bytes;
            let mut first = nodes.first_bytes;
            if nodes.count == 1 {
                first = total;
            }
            nodes = XmlNodeList {
                count: nodes.count,
                first_kind: nodes.first_kind,
                first_bytes: first,
                last_kind: kind,
                last_bytes: total,
            };
        } else {
            let mut count = nodes.count;
            if count < 3 {
                count += 1;
            }
            nodes = XmlNodeList {
                count: count,
                first_kind: nodes.first_kind,
                first_bytes: nodes.first_bytes,
                last_kind: kind,
                last_bytes: bytes,
            };
        };
    }
    XmlTextState {
        kind: kind,
        bytes: length,
        valid: valid,
        nodes: nodes,
    }
}

fn xml_text_entity(input: XmlTextState, nodes: XmlNodeList, root: bool) -> XmlTextState {
    let mut state = input;
    if nodes.count > 0 {
        state = xml_text_event(state, nodes.first_kind, nodes.first_bytes, root);
        if nodes.count > 2 {
            state = xml_text_event(state, 0, 0i64, root);
        }
        if nodes.count > 1 {
            state = xml_text_event(state, nodes.last_kind, nodes.last_bytes, root);
        }
    }
    state
}

fn xml_normalized_octets(source: &XmlSource, start: usize, end: usize) -> i64 {
    let mut position = start;
    let mut bytes: i64 = 0i64;
    while position < end {
        let character = source.characters[position];
        let width = xml_character_octets(character);
        bytes = bytes + width as i64;
        if character == '\r' && position + 1 < end && source.characters[position + 1] == '\n' {
            position += 1;
        }
        position += 1;
    }
    bytes
}

fn xml_text_plain(
    source: &XmlSource,
    start: usize,
    input: XmlTextState,
    root: bool,
) -> XmlTextScan {
    let mut state = input;
    let mut position = start;
    let mut pending: i64 = 0i64;
    let mut slow = false;
    while position < source.characters.len() {
        let character = source.characters[position];
        if character == '<' || character == '&' {
            break;
        }
        if xml_character(character) == false
            || (character == ']' && xml_at(source, position, "]]>"))
        {
            state = XmlTextState {
                kind: state.kind,
                bytes: state.bytes,
                valid: false,
                nodes: state.nodes,
            };
            return XmlTextScan {
                next: position,
                state: state,
            };
        }
        let crlf = character == '\r'
            && position + 1 < source.characters.len()
            && source.characters[position + 1] == '\n';
        if slow == false && (character as i32 >= 128 || character == '\r') {
            if pending > 0i64 {
                state = xml_text_event(state, 1, pending, root);
            }
            pending = 0i64;
            if crlf == false {
                slow = true;
            }
        }
        let width = xml_character_octets(character);
        pending = pending + width as i64;
        if slow && pending >= 300i64 {
            state = xml_text_event(state, 1, pending, root);
            pending = 0i64;
        }
        if state.valid == false {
            return XmlTextScan {
                next: position,
                state: state,
            };
        }
        if crlf {
            position += 1;
        }
        position += 1;
    }
    if pending > 0i64 {
        state = xml_text_event(state, 1, pending, root);
    }
    XmlTextScan {
        next: position,
        state: state,
    }
}
