#[derive(Clone, Copy)]
pub struct JsonbNode {
    pub kind: i32,
    pub child: usize,
    pub next: usize,
    pub key_start: usize,
    pub key_end: usize,
    pub text_start: usize,
    pub text_end: usize,
}

#[derive(Clone)]
pub struct JsonbPayload {
    pub characters: Vec<char>,
    pub nodes: Vec<JsonbNode>,
    pub root: usize,
}

#[derive(Clone)]
pub enum JsonbValue {
    Unknown,
    Null,
    Value(JsonbPayload),
    Error(SqlError),
}

#[derive(Clone, Copy)]
struct JsonbFrame {
    state: i32,
    node: usize,
    tail: usize,
    key_start: usize,
    key_end: usize,
}

#[derive(Clone)]
struct JsonbCharacters {
    characters: Vec<char>,
}

const JSONB_NUMERIC_RANGE: u32 = 3452547;

fn jsonb_node_link(node: JsonbNode, next: usize) -> JsonbNode {
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

fn jsonb_node_child(node: JsonbNode, child: usize) -> JsonbNode {
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

fn jsonb_number_text(source: &JsonSyntaxSource, token: JsonReadToken) -> TextValue {
    let following = json_read_next_token(source, token.end);
    if following.start < source.characters.len() && source.characters[following.start] == '"' {
        let decoded = json_read_decode_string(source, following);
        if let TextValue::Error(error) = decoded {
            return TextValue::Error(error);
        };
        if let TextValue::Unknown = decoded {
            return TextValue::Unknown;
        };
    };
    if following.syntax == JSON_SYNTAX_INVALID {
        return TextValue::Error(make_sql_error(JSON_READ_INVALID_TEXT));
    };
    let mut position = token.start;
    let negative = source.characters[position] == '-';
    if negative {
        position += 1;
    };
    let mut digits: Vec<char> = Vec::new();
    let mut before: i32 = 0;
    let mut point = false;
    let mut first: i32 = -1;
    while position < token.end
        && source.characters[position] != 'e'
        && source.characters[position] != 'E'
    {
        let character = source.characters[position];
        if character == '.' {
            point = true;
        } else {
            if first < 0 && character != '0' {
                first = digits.len() as i32;
            };
            digits.push(character);
            if point == false {
                before = before + 1;
            };
        };
        position += 1;
    }
    let mut exponent: i32 = 0;
    if position < token.end {
        position += 1;
        let mut sign: i32 = 1;
        if source.characters[position] == '-' {
            sign = -1;
            position += 1;
        } else if source.characters[position] == '+' {
            position += 1;
        };
        while position < token.end {
            let digit = source.characters[position] as i32 - 48;
            if exponent > 107374182 || (exponent == 107374182 && digit > 3) {
                return TextValue::Error(make_sql_error(JSONB_NUMERIC_RANGE));
            };
            exponent = exponent * 10 + digit;
            position += 1;
        }
        exponent = exponent * sign;
    };
    let count = digits.len() as i32;
    let mut scale = (count - before) as i64 - exponent as i64;
    if scale < 0i64 {
        scale = 0i64;
    };
    let boundary = before as i64 + exponent as i64;
    let weight = boundary - first as i64 - 1i64;
    if scale > 16383i64 || (first >= 0 && weight > 131071i64) {
        return TextValue::Error(make_sql_error(JSONB_NUMERIC_RANGE));
    };
    let mut output = String::new();
    if first >= 0 && negative {
        output.push('-');
    };
    let mut place: i64 = 0i64;
    if first >= 0 && weight > 0i64 {
        place = weight;
    };
    while place >= 0i64 {
        let index = boundary - place - 1i64;
        let mut digit = '0';
        if first >= 0 && index >= 0i64 && index < count as i64 {
            digit = digits[usize::try_from(index as i32).unwrap_or(0)];
        };
        output.push(digit);
        place = place - 1i64;
    }
    if scale > 0i64 {
        output.push('.');
    };
    let mut fraction: i64 = 0i64;
    while fraction < scale {
        let index = boundary + fraction;
        let mut digit = '0';
        if first >= 0 && index >= 0i64 && index < count as i64 {
            digit = digits[usize::try_from(index as i32).unwrap_or(0)];
        };
        output.push(digit);
        fraction = fraction + 1i64;
    }
    let numeric = numeric_parts(output.as_str());
    if numeric.valid == false {
        return TextValue::Error(make_sql_error(JSONB_NUMERIC_RANGE));
    };
    TextValue::Value(output)
}

fn jsonb_key_compare(source: &JsonbCharacters, left: JsonbNode, right: JsonbNode) -> i32 {
    let a = left.key_end - left.key_start;
    let b = right.key_end - right.key_start;
    if a < b {
        return -1;
    };
    if a > b {
        return 1;
    };
    let mut offset: usize = 0;
    while offset < a {
        let x = source.characters[left.key_start + offset] as i32;
        let y = source.characters[right.key_start + offset] as i32;
        if x < y {
            return -1;
        };
        if x > y {
            return 1;
        };
        offset += 1;
    }
    0
}

fn jsonb_normalize_objects(input: JsonbPayload) -> JsonbPayload {
    let source = JsonbCharacters {
        characters: input.characters,
    };
    let mut nodes = input.nodes;
    let mut index: usize = 1;
    while index < nodes.len() {
        let parent = nodes[index];
        if parent.kind == 6 {
            let mut entries: Vec<usize> = Vec::new();
            let mut scratch: Vec<usize> = Vec::new();
            let mut child = parent.child;
            while child > 0 {
                entries.push(child);
                scratch.push(0);
                child = nodes[child].next;
            }
            let mut width: usize = 1;
            while width < entries.len() {
                let mut begin: usize = 0;
                while begin < entries.len() {
                    let mut middle = begin + width;
                    if middle > entries.len() {
                        middle = entries.len();
                    };
                    let mut end = middle + width;
                    if end > entries.len() {
                        end = entries.len();
                    };
                    let mut a = begin;
                    let mut b = middle;
                    let mut out = begin;
                    while out < end {
                        let mut take_left = b == end;
                        if a < middle && b < end {
                            let comparison =
                                jsonb_key_compare(&source, nodes[entries[a]], nodes[entries[b]]);
                            take_left =
                                comparison < 0 || (comparison == 0 && entries[a] > entries[b]);
                        };
                        if a < middle && take_left {
                            scratch[out] = entries[a];
                            a += 1;
                        } else {
                            scratch[out] = entries[b];
                            b += 1;
                        };
                        out += 1;
                    }
                    begin = end;
                }
                let mut out: usize = 0;
                while out < entries.len() {
                    entries[out] = scratch[out];
                    out += 1;
                }
                width = width + width;
            }
            let mut first: usize = 0;
            let mut last: usize = 0;
            let mut out: usize = 0;
            while out < entries.len() {
                let current = entries[out];
                if last == 0 || jsonb_key_compare(&source, nodes[last], nodes[current]) != 0 {
                    if last == 0 {
                        first = current;
                    } else {
                        nodes[last] = jsonb_node_link(nodes[last], current);
                    };
                    last = current;
                };
                out += 1;
            }
            if last > 0 {
                nodes[last] = jsonb_node_link(nodes[last], 0);
            };
            nodes[index] = jsonb_node_child(parent, first);
        };
        index += 1;
    }
    JsonbPayload {
        characters: source.characters,
        nodes: nodes,
        root: input.root,
    }
}

pub fn jsonb_from_text(input: TextValue) -> JsonbValue {
    if let TextValue::Error(error) = input {
        return JsonbValue::Error(error);
    };
    if let TextValue::Null = input {
        return JsonbValue::Null;
    };
    if let TextValue::Value(value) = input {
        let source = JsonSyntaxSource {
            characters: value.chars().collect(),
        };
        let mut characters: Vec<char> = Vec::new();
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
        let mut frames: Vec<JsonbFrame> = Vec::new();
        frames.push(JsonbFrame {
            state: JSON_SYNTAX_ROOT_VALUE,
            node: 0,
            tail: 0,
            key_start: 0,
            key_end: 0,
        });
        let mut depth: usize = 1;
        let mut position: usize = 0;
        let mut root: usize = 0;
        while depth > 0 {
            let token = json_read_next_token(&source, position);
            let mut decoded = TextValue::Null;
            if token.start < source.characters.len() && source.characters[token.start] == '"' {
                decoded = json_read_decode_string(&source, token);
                if let TextValue::Error(error) = decoded {
                    return JsonbValue::Error(error);
                };
                if let TextValue::Unknown = decoded {
                    return JsonbValue::Unknown;
                };
            };
            if token.syntax == JSON_SYNTAX_INVALID {
                return JsonbValue::Error(make_sql_error(JSON_READ_INVALID_TEXT));
            };
            let frame = frames[depth - 1];
            let transition = json_syntax_step(frame.state, token.syntax);
            if transition.action == JSON_SYNTAX_REJECT {
                return JsonbValue::Error(make_sql_error(JSON_READ_INVALID_TEXT));
            };
            if transition.action == JSON_SYNTAX_FINISH {
                let payload = JsonbPayload {
                    characters: characters,
                    nodes: nodes,
                    root: root,
                };
                return JsonbValue::Value(jsonb_normalize_objects(payload));
            };
            let mut key_start = frame.key_start;
            let mut key_end = frame.key_end;
            let mut tail = frame.tail;
            if transition.action == JSON_SYNTAX_CLOSE {
                depth = depth - 1;
            } else {
                if transition.action == JSON_SYNTAX_KEY {
                    key_start = characters.len();
                    if let TextValue::Value(key) = decoded {
                        let content: Vec<char> = key.chars().collect();
                        let mut i: usize = 0;
                        while i < content.len() {
                            characters.push(content[i]);
                            i += 1;
                        }
                    };
                    key_end = characters.len();
                } else if transition.action == JSON_SYNTAX_VALUE
                    || transition.action == JSON_SYNTAX_OPEN_ARRAY
                    || transition.action == JSON_SYNTAX_OPEN_OBJECT
                {
                    if token.syntax == JSON_SYNTAX_NUMBER {
                        decoded = jsonb_number_text(&source, token);
                        if let TextValue::Error(error) = decoded {
                            return JsonbValue::Error(error);
                        };
                        if let TextValue::Unknown = decoded {
                            return JsonbValue::Unknown;
                        };
                    };
                    let text_start = characters.len();
                    if let TextValue::Value(text) = decoded {
                        let content: Vec<char> = text.chars().collect();
                        let mut i: usize = 0;
                        while i < content.len() {
                            characters.push(content[i]);
                            i += 1;
                        }
                    };
                    let current = nodes.len();
                    nodes.push(JsonbNode {
                        kind: json_syntax_root_kind(token.syntax),
                        child: 0,
                        next: 0,
                        key_start: key_start,
                        key_end: key_end,
                        text_start: text_start,
                        text_end: characters.len(),
                    });
                    if frame.node == 0 {
                        root = current;
                    } else if tail == 0 {
                        nodes[frame.node] = jsonb_node_child(nodes[frame.node], current);
                    } else {
                        nodes[tail] = jsonb_node_link(nodes[tail], current);
                    };
                    tail = current;
                };
                frames[depth - 1] = JsonbFrame {
                    state: transition.state,
                    node: frame.node,
                    tail: tail,
                    key_start: key_start,
                    key_end: key_end,
                };
                if transition.action == JSON_SYNTAX_OPEN_ARRAY
                    || transition.action == JSON_SYNTAX_OPEN_OBJECT
                {
                    let mut state = JSON_SYNTAX_ARRAY_FIRST;
                    if transition.action == JSON_SYNTAX_OPEN_OBJECT {
                        state = JSON_SYNTAX_OBJECT_FIRST;
                    };
                    let child = JsonbFrame {
                        state: state,
                        node: tail,
                        tail: 0,
                        key_start: 0,
                        key_end: 0,
                    };
                    if depth < frames.len() {
                        frames[depth] = child;
                    } else {
                        frames.push(child);
                    };
                    depth += 1;
                };
            };
            position = token.end;
        }
    };
    JsonbValue::Unknown
}

pub fn make_jsonb_value(source: &str) -> JsonbValue {
    let parsed = jsonb_from_text(TextValue::Value(source.to_owned()));
    if let JsonbValue::Error(_) = parsed {
        return JsonbValue::Unknown;
    };
    parsed
}

pub fn jsonb_unknown() -> JsonbValue {
    JsonbValue::Unknown
}
pub fn jsonb_null() -> JsonbValue {
    JsonbValue::Null
}
pub fn jsonb_from_case_guard(value: CheckOutcome) -> JsonbValue {
    if let CheckOutcome::Error(error) = value {
        return JsonbValue::Error(error);
    };
    JsonbValue::Unknown
}
pub fn jsonb_is_null(input: JsonbValue) -> BoolValue {
    if let JsonbValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if let JsonbValue::Unknown = input {
        return BoolValue::Unknown;
    };
    if let JsonbValue::Null = input {
        return BoolValue::Value(true);
    };
    BoolValue::Value(false)
}

fn jsonb_quote(source: &JsonbPayload, begin: usize, end: usize) -> String {
    let mut output = String::new();
    output.push('"');
    let hex: Vec<char> = "0123456789abcdef".chars().collect();
    let mut position = begin;
    while position < end {
        let character = source.characters[position];
        let code = character as i32;
        if character == '"' {
            output.push_str("\\\"");
        } else if character == '\\' {
            output.push_str("\\\\");
        } else if character == '\u{0008}' {
            output.push_str("\\b");
        } else if character == '\u{000c}' {
            output.push_str("\\f");
        } else if character == '\n' {
            output.push_str("\\n");
        } else if character == '\r' {
            output.push_str("\\r");
        } else if character == '\t' {
            output.push_str("\\t");
        } else if code < 32 {
            output.push_str("\\u00");
            output.push(hex[usize::try_from(code / 16).unwrap_or(0)]);
            output.push(hex[usize::try_from(code % 16).unwrap_or(0)]);
        } else {
            output.push(character);
        };
        position += 1;
    }
    output.push('"');
    output
}

#[derive(Clone, Copy)]
struct JsonbOutputFrame {
    node: usize,
    child: usize,
}

pub fn jsonb_to_text(input: JsonbValue) -> TextValue {
    if let JsonbValue::Error(error) = input {
        return TextValue::Error(error);
    };
    if let JsonbValue::Null = input {
        return TextValue::Null;
    };
    if let JsonbValue::Value(value) = input {
        let mut output = String::new();
        let mut frames: Vec<JsonbOutputFrame> = Vec::new();
        let mut depth: usize = 0;
        let mut current = value.root;
        let mut visiting = true;
        while visiting || depth > 0 {
            if visiting {
                let node = value.nodes[current];
                if node.kind == 0 {
                    output.push_str("null");
                } else if node.kind == 1 {
                    output.push_str("false");
                } else if node.kind == 2 {
                    output.push_str("true");
                } else if node.kind == 3 {
                    let mut position = node.text_start;
                    while position < node.text_end {
                        output.push(value.characters[position]);
                        position += 1;
                    }
                } else if node.kind == 4 {
                    let quoted = jsonb_quote(&value, node.text_start, node.text_end);
                    output.push_str(quoted.as_str());
                } else {
                    if node.kind == 6 {
                        let mut member = node.child;
                        let mut nonempty: usize = 0;
                        let mut unicode = false;
                        while member > 0 {
                            let entry = value.nodes[member];
                            if entry.key_end > entry.key_start {
                                nonempty += 1;
                            };
                            let mut position = entry.key_start;
                            while position < entry.key_end {
                                if value.characters[position] as i32 > 127 {
                                    unicode = true;
                                };
                                position += 1;
                            }
                            member = entry.next;
                        }
                        if unicode && nonempty > 1 {
                            return TextValue::Unknown;
                        };
                    };
                    if node.kind == 5 {
                        output.push('[');
                    } else {
                        output.push('{');
                    };
                    let frame = JsonbOutputFrame {
                        node: current,
                        child: node.child,
                    };
                    if depth < frames.len() {
                        frames[depth] = frame;
                    } else {
                        frames.push(frame);
                    };
                    depth += 1;
                };
                visiting = false;
            } else {
                let frame = frames[depth - 1];
                let node = value.nodes[frame.node];
                if frame.child == 0 {
                    if node.kind == 5 {
                        output.push(']');
                    } else {
                        output.push('}');
                    };
                    depth = depth - 1;
                } else {
                    let child = value.nodes[frame.child];
                    if frame.child != node.child {
                        output.push_str(", ");
                    };
                    if node.kind == 6 {
                        let key = jsonb_quote(&value, child.key_start, child.key_end);
                        output.push_str(key.as_str());
                        output.push_str(": ");
                    };
                    frames[depth - 1] = JsonbOutputFrame {
                        node: frame.node,
                        child: child.next,
                    };
                    current = frame.child;
                    visiting = true;
                };
            };
        }
        return TextValue::Value(output);
    };
    TextValue::Unknown
}
