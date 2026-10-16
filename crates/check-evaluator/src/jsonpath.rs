pub const JSONPATH_NODE_ROOT: i32 = 1;
pub const JSONPATH_NODE_CURRENT: i32 = 2;
pub const JSONPATH_NODE_LAST: i32 = 3;
pub const JSONPATH_NODE_STRING: i32 = 4;
pub const JSONPATH_NODE_NUMBER: i32 = 5;
pub const JSONPATH_NODE_VARIABLE: i32 = 6;
pub const JSONPATH_NODE_NULL: i32 = 7;
pub const JSONPATH_NODE_TRUE: i32 = 8;
pub const JSONPATH_NODE_FALSE: i32 = 9;
pub const JSONPATH_NODE_KEY: i32 = 10;
pub const JSONPATH_NODE_ANY_KEY: i32 = 11;
pub const JSONPATH_NODE_ANY_ARRAY: i32 = 12;
pub const JSONPATH_NODE_INDEX: i32 = 13;
pub const JSONPATH_NODE_SUBSCRIPT: i32 = 14;
pub const JSONPATH_NODE_DESCENDANT: i32 = 15;
pub const JSONPATH_NODE_FILTER: i32 = 16;
pub const JSONPATH_NODE_EXISTS: i32 = 17;
pub const JSONPATH_NODE_NOT: i32 = 18;
pub const JSONPATH_NODE_IS_UNKNOWN: i32 = 19;
pub const JSONPATH_NODE_PLUS: i32 = 20;
pub const JSONPATH_NODE_MINUS: i32 = 21;
pub const JSONPATH_NODE_ADD: i32 = 22;
pub const JSONPATH_NODE_SUB: i32 = 23;
pub const JSONPATH_NODE_MUL: i32 = 24;
pub const JSONPATH_NODE_DIV: i32 = 25;
pub const JSONPATH_NODE_MOD: i32 = 26;
pub const JSONPATH_NODE_EQ: i32 = 27;
pub const JSONPATH_NODE_NE: i32 = 28;
pub const JSONPATH_NODE_LT: i32 = 29;
pub const JSONPATH_NODE_LE: i32 = 30;
pub const JSONPATH_NODE_GT: i32 = 31;
pub const JSONPATH_NODE_GE: i32 = 32;
pub const JSONPATH_NODE_AND: i32 = 33;
pub const JSONPATH_NODE_OR: i32 = 34;
pub const JSONPATH_NODE_STARTS: i32 = 35;
pub const JSONPATH_NODE_REGEX: i32 = 36;
pub const JSONPATH_NODE_METHOD: i32 = 100;

#[derive(Clone, Copy)]
pub struct JsonpathNode {
    pub kind: i32,
    pub next: usize,
    pub left: usize,
    pub right: usize,
    pub text_start: usize,
    pub text_end: usize,
    pub first: i32,
    pub last: i32,
    pub flags: i32,
}

#[derive(Clone)]
pub struct JsonpathPayload {
    pub characters: Vec<char>,
    pub nodes: Vec<JsonpathNode>,
    pub root: usize,
    pub lax: bool,
}

#[derive(Clone)]
pub enum JsonpathValue {
    Unknown,
    Null,
    Value(JsonpathPayload),
    StoredText(String),
    Error(SqlError),
}

fn jsonpath_accessor_kind(kind: i32) -> bool {
    (kind >= JSONPATH_NODE_KEY && kind <= JSONPATH_NODE_INDEX)
        || kind == JSONPATH_NODE_DESCENDANT
        || kind == JSONPATH_NODE_FILTER
        || kind >= JSONPATH_NODE_METHOD
}

fn jsonpath_method_arity(kind: i32) -> i32 {
    if kind == 102
        || kind == 108
        || kind == 111
        || kind == 114
        || kind == 116
        || kind == 123
        || kind == 129
        || kind == 115
        || kind == 122
        || kind == 104
        || kind == 125
        || kind == 118
        || kind == 121
    {
        return 0;
    };
    if kind == 128 {
        return 1;
    };
    if kind == 109 || kind == 126 || kind == 130 || kind == 132 {
        return 2;
    };
    if kind == 124 {
        return 3;
    };
    -1
}

fn jsonpath_payload_node_valid(value: &JsonpathPayload, index: usize) -> bool {
    let node = value.nodes[index];
    if node.next >= value.nodes.len()
        || node.left >= value.nodes.len()
        || node.right >= value.nodes.len()
        || node.text_start > node.text_end
        || node.text_end > value.characters.len()
    {
        return false;
    };
    let kind = node.kind;
    if kind < JSONPATH_NODE_ROOT || (kind > JSONPATH_NODE_REGEX && kind < JSONPATH_NODE_METHOD) {
        return false;
    };
    if kind == JSONPATH_NODE_NUMBER {
        let mut text = String::new();
        let mut position = node.text_start;
        let mut negative = false;
        if position < node.text_end && value.characters[position] == '-' {
            negative = true;
            text.push('-');
            position += 1;
        };
        let begin = position;
        let mut point = false;
        let mut nonzero = false;
        let mut fraction: usize = 0;
        while position < node.text_end {
            let character = value.characters[position];
            if character == '.' {
                if point || position == begin || position + 1 == node.text_end {
                    return false;
                };
                point = true;
            } else if character as i32 >= 48 && character as i32 <= 57 {
                if character != '0' {
                    nonzero = true;
                };
                if point {
                    fraction += 1;
                };
                if position == begin
                    && character == '0'
                    && position + 1 < node.text_end
                    && value.characters[position + 1] != '.'
                {
                    return false;
                };
            } else {
                return false;
            };
            text.push(character);
            position += 1;
        }
        if begin == node.text_end || (negative && nonzero == false) || fraction > 16383 {
            return false;
        };
        let parts = numeric_parts(text.as_str());
        if parts.valid == false || parts.special != 1 || parts.weight > 131072 {
            return false;
        };
    };
    if kind == JSONPATH_NODE_REGEX {
        return node.left > 0
            && node.right == 0
            && node.flags >= 0
            && node.flags <= 31
            && ((node.flags / 8) % 2 == 0 || node.flags >= 16);
    };
    if kind >= JSONPATH_NODE_METHOD {
        let arity = jsonpath_method_arity(kind);
        if arity < 0 {
            return false;
        };
        if arity == 0 {
            return node.left == 0 && node.right == 0;
        };
        if arity < 3 && node.right != 0 {
            return false;
        };
        if node.left == 0 {
            return node.right == 0;
        };
        let left = value.nodes[node.left];
        let mut argument_kind = JSONPATH_NODE_NUMBER;
        if arity == 1 {
            argument_kind = JSONPATH_NODE_STRING;
        };
        if left.kind != argument_kind || left.next != 0 {
            return false;
        };
        if node.right > 0 {
            let right = value.nodes[node.right];
            if right.kind != JSONPATH_NODE_NUMBER || right.next != 0 {
                return false;
            };
        };
        return true;
    };
    if kind >= JSONPATH_NODE_ADD && kind <= JSONPATH_NODE_STARTS {
        return node.left > 0 && node.right > 0;
    };
    if kind == JSONPATH_NODE_SUBSCRIPT {
        return node.left > 0;
    };
    if kind == JSONPATH_NODE_INDEX || (kind >= JSONPATH_NODE_FILTER && kind <= JSONPATH_NODE_MINUS)
    {
        if (kind == JSONPATH_NODE_PLUS || kind == JSONPATH_NODE_MINUS) && node.left > 0 {
            let child = value.nodes[node.left];
            if child.kind == JSONPATH_NODE_NUMBER && child.next == 0 {
                return false;
            };
        };
        return node.left > 0 && node.right == 0;
    };
    if kind == JSONPATH_NODE_DESCENDANT && (node.first < -1 || node.last < -1) {
        return false;
    };
    node.left == 0 && node.right == 0
}

#[derive(Clone, Copy)]
struct JsonpathBoundaryVisit {
    node: usize,
    filters: usize,
    subscript: bool,
    accessor: bool,
    list: bool,
}
