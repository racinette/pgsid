#[derive(Clone, Copy)]
struct JsonpathParseNode {
    kind: i32,
    next: usize,
    left: usize,
    right: usize,
    text_start: usize,
    text_end: usize,
    first: i32,
    last: i32,
    flags: i32,
}

#[derive(Clone, Copy)]
struct JsonpathParseSlot {
    head: usize,
    tail: usize,
    token: usize,
    count: usize,
    level: i32,
}

#[derive(Clone, Copy)]
struct JsonpathParseVisit {
    node: usize,
    filters: usize,
    subscript: bool,
}

#[derive(Clone)]
struct JsonpathParseTree {
    source: Vec<char>,
    text: Vec<char>,
    nodes: Vec<JsonpathParseNode>,
    validation: Vec<usize>,
    root: usize,
    lax: bool,
    error: u32,
    requires_numeric_validation: bool,
    requires_regex_validation: bool,
}

#[derive(Clone, Copy)]
struct JsonpathParseLevel {
    value: i32,
    error: u32,
}

const JSONPATH_PARSE_RANGE: u32 = 3452547;
const JSONPATH_PARSE_UNSUPPORTED: u32 = 466560;

fn jsonpath_new_node(
    kind: i32,
    left: usize,
    right: usize,
    start: usize,
    end: usize,
    first: i32,
    last: i32,
    flags: i32,
) -> JsonpathParseNode {
    JsonpathParseNode {
        kind: kind,
        next: 0,
        left: left,
        right: right,
        text_start: start,
        text_end: end,
        first: first,
        last: last,
        flags: flags,
    }
}

fn jsonpath_node_link(node: JsonpathParseNode, next: usize) -> JsonpathParseNode {
    JsonpathParseNode {
        kind: node.kind,
        next: next,
        left: node.left,
        right: node.right,
        text_start: node.text_start,
        text_end: node.text_end,
        first: node.first,
        last: node.last,
        flags: node.flags,
    }
}

fn jsonpath_token_node(scan: &JsonpathScan, index: usize, kind: i32) -> JsonpathParseNode {
    let token = scan.tokens[index - 1];
    let mut start = token.text_start;
    let mut end = token.text_end;
    if kind == JSONPATH_NODE_NUMBER {
        start = token.start;
        end = token.end;
    };
    jsonpath_new_node(kind, 0, 0, start, end, 0, 0, 0)
}

fn jsonpath_empty_slot() -> JsonpathParseSlot {
    JsonpathParseSlot {
        head: 0,
        tail: 0,
        token: 0,
        count: 0,
        level: 0,
    }
}

fn jsonpath_node_slot(node: usize) -> JsonpathParseSlot {
    JsonpathParseSlot {
        head: node,
        tail: node,
        token: 0,
        count: 1,
        level: 0,
    }
}

fn jsonpath_table_action(state: usize, token: i32) -> i32 {
    let mut position = JSONPATH_TABLE_ACTION_OFFSETS[state];
    let end = JSONPATH_TABLE_ACTION_OFFSETS[state + 1];
    while position < end {
        if JSONPATH_TABLE_ACTION_TOKENS[position] == token {
            return JSONPATH_TABLE_ACTION_VALUES[position];
        };
        position += 1;
    }
    0
}

fn jsonpath_table_goto(state: usize, symbol: usize) -> usize {
    let mut position = JSONPATH_TABLE_GOTO_OFFSETS[state];
    let end = JSONPATH_TABLE_GOTO_OFFSETS[state + 1];
    while position < end {
        if JSONPATH_TABLE_GOTO_SYMBOLS[position] == symbol {
            return JSONPATH_TABLE_GOTO_VALUES[position];
        };
        position += 1;
    }
    0
}

fn jsonpath_binary_kind(token: i32) -> i32 {
    if token == 43 {
        return JSONPATH_NODE_ADD;
    };
    if token == 45 {
        return JSONPATH_NODE_SUB;
    };
    if token == 42 {
        return JSONPATH_NODE_MUL;
    };
    if token == 47 {
        return JSONPATH_NODE_DIV;
    };
    if token == 37 {
        return JSONPATH_NODE_MOD;
    };
    if token == JSONPATH_SCAN_EQ {
        return JSONPATH_NODE_EQ;
    };
    if token == JSONPATH_SCAN_NE {
        return JSONPATH_NODE_NE;
    };
    if token == 60 {
        return JSONPATH_NODE_LT;
    };
    if token == JSONPATH_SCAN_LE {
        return JSONPATH_NODE_LE;
    };
    if token == 62 {
        return JSONPATH_NODE_GT;
    };
    if token == JSONPATH_SCAN_GE {
        return JSONPATH_NODE_GE;
    };
    if token == JSONPATH_SCAN_AND {
        return JSONPATH_NODE_AND;
    };
    JSONPATH_NODE_OR
}

fn jsonpath_read_level(scan: &JsonpathScan, index: usize) -> JsonpathParseLevel {
    let token = scan.tokens[index - 1];
    let mut position = token.start;
    let mut radix: i64 = 10i64;
    if position + 2 < token.end && scan.source[position] == '0' {
        let prefix = scan.source[position + 1];
        if prefix == 'x' || prefix == 'X' {
            radix = 16i64;
            position += 2;
        };
        if prefix == 'o' || prefix == 'O' {
            radix = 8i64;
            position += 2;
        };
        if prefix == 'b' || prefix == 'B' {
            radix = 2i64;
            position += 2;
        };
    };
    let mut value: i64 = 0i64;
    while position < token.end {
        let character = scan.source[position];
        position += 1;
        if character != '_' {
            let digit = jsonpath_scan_hex(character) as i64;
            if value > (2147483647i64 - digit) / radix {
                return JsonpathParseLevel {
                    value: 0,
                    error: JSONPATH_PARSE_RANGE,
                };
            };
            value = value * radix + digit;
        };
    }
    JsonpathParseLevel {
        value: value as i32,
        error: 0,
    }
}

fn jsonpath_parse_scope(tree: &JsonpathParseTree) -> u32 {
    let mut pending: Vec<JsonpathParseVisit> = Vec::new();
    pending.push(JsonpathParseVisit {
        node: tree.root,
        filters: 0,
        subscript: false,
    });
    let mut depth: usize = 1;
    while depth > 0 {
        depth = depth - 1;
        let visit = pending[depth];
        let node = tree.nodes[visit.node];
        if node.kind == JSONPATH_NODE_CURRENT && visit.filters == 0 {
            return JSONPATH_SCAN_SYNTAX;
        };
        if node.kind == JSONPATH_NODE_LAST && visit.subscript == false {
            return JSONPATH_SCAN_SYNTAX;
        };
        let mut child: usize = 0;
        while child < 3 {
            let mut index = node.next;
            let mut filters = visit.filters;
            let mut subscript = visit.subscript;
            if child == 1 {
                index = node.left;
                if node.kind == JSONPATH_NODE_FILTER {
                    filters += 1;
                };
                if node.kind == JSONPATH_NODE_INDEX || node.kind == JSONPATH_NODE_SUBSCRIPT {
                    subscript = true;
                };
            };
            if child == 2 {
                index = node.right;
                if node.kind == JSONPATH_NODE_SUBSCRIPT {
                    subscript = true;
                };
            };
            if index > 0 {
                let next = JsonpathParseVisit {
                    node: index,
                    filters: filters,
                    subscript: subscript,
                };
                if depth == pending.len() {
                    pending.push(next);
                } else {
                    pending[depth] = next;
                };
                depth += 1;
            };
            child += 1;
        }
    }
    0
}

fn jsonpath_parse(input: &str) -> JsonpathParseTree {
    let scan = jsonpath_scan_tokens(input);
    let mut nodes: Vec<JsonpathParseNode> = Vec::new();
    let mut validation: Vec<usize> = Vec::new();
    nodes.push(jsonpath_new_node(0, 0, 0, 0, 0, 0, 0, 0));
    let mut states: Vec<usize> = Vec::new();
    states.push(0);
    let mut slots: Vec<JsonpathParseSlot> = Vec::new();
    let mut depth: usize = 1;
    let mut position: usize = 0;
    let mut root: usize = 0;
    let mut lax = true;
    let mut error: u32 = 0;
    let mut requires_numeric = false;
    let mut requires_regex = false;
    let mut done = false;
    while done == false && error == 0 {
        let state = states[depth - 1];
        let mut action = JSONPATH_TABLE_DEFAULTS[state];
        if action == 0 {
            let mut lookahead: i32 = 0;
            if position < scan.tokens.len() {
                lookahead = scan.tokens[position].kind;
            } else if scan.error != 0 {
                error = scan.error;
            };
            if error == 0 {
                action = jsonpath_table_action(state, lookahead);
            };
        };
        if error == 0 {
            if action == 2147483647 {
                done = true;
            } else if action == 0 {
                error = JSONPATH_SCAN_SYNTAX;
            } else if action > 0 {
                let shifted = JsonpathParseSlot {
                    head: 0,
                    tail: 0,
                    token: position + 1,
                    count: 0,
                    level: scan.tokens[position].kind,
                };
                if depth - 1 == slots.len() {
                    slots.push(shifted);
                } else {
                    slots[depth - 1] = shifted;
                };
                let next = usize::try_from(action - 1).unwrap_or(0);
                if depth == states.len() {
                    states.push(next);
                } else {
                    states[depth] = next;
                };
                depth += 1;
                position += 1;
            } else {
                let rule = usize::try_from(0 - action - 1).unwrap_or(0);
                let length = JSONPATH_TABLE_RULE_LENGTHS[rule];
                let reduce = JSONPATH_TABLE_RULE_ACTIONS[rule];
                let begin = depth - length - 1;
                let mut first = jsonpath_empty_slot();
                let mut second = jsonpath_empty_slot();
                let mut third = jsonpath_empty_slot();
                let mut fourth = jsonpath_empty_slot();
                let mut fifth = jsonpath_empty_slot();
                if length > 0 {
                    first = slots[begin];
                };
                if length > 1 {
                    second = slots[begin + 1];
                };
                if length > 2 {
                    third = slots[begin + 2];
                };
                if length > 3 {
                    fourth = slots[begin + 3];
                };
                if length > 4 {
                    fifth = slots[begin + 4];
                };
                let mut value = first;
                let mut node = jsonpath_new_node(0, 0, 0, 0, 0, 0, 0, 0);
                if reduce == JSONPATH_REDUCE_PASS {
                    value = first;
                };
                if reduce == JSONPATH_REDUCE_RESULT {
                    root = second.head;
                    lax = first.count > 0;
                    value = second;
                };
                if reduce == JSONPATH_REDUCE_EMPTY_RESULT {
                    error = JSONPATH_SCAN_SURROGATE;
                };
                if reduce == JSONPATH_REDUCE_LAX {
                    value = jsonpath_node_slot(0);
                };
                if reduce == JSONPATH_REDUCE_STRICT || reduce == JSONPATH_REDUCE_NONE {
                    value = jsonpath_empty_slot();
                };
                if reduce == JSONPATH_REDUCE_MIDDLE {
                    value = second;
                };
                if reduce == JSONPATH_REDUCE_STRING
                    || reduce == JSONPATH_REDUCE_VARIABLE
                    || reduce == JSONPATH_REDUCE_NUMBER
                    || reduce == JSONPATH_REDUCE_KEY
                {
                    let mut kind = JSONPATH_NODE_STRING;
                    if reduce == JSONPATH_REDUCE_VARIABLE {
                        kind = JSONPATH_NODE_VARIABLE;
                    };
                    if reduce == JSONPATH_REDUCE_NUMBER {
                        kind = JSONPATH_NODE_NUMBER;
                        requires_numeric = true;
                    };
                    if reduce == JSONPATH_REDUCE_KEY {
                        kind = JSONPATH_NODE_KEY;
                    };
                    node = jsonpath_token_node(&scan, first.token, kind);
                };
                if reduce == JSONPATH_REDUCE_NULL {
                    node = jsonpath_new_node(JSONPATH_NODE_NULL, 0, 0, 0, 0, 0, 0, 0);
                };
                if reduce == JSONPATH_REDUCE_TRUE {
                    node = jsonpath_new_node(JSONPATH_NODE_TRUE, 0, 0, 0, 0, 0, 0, 0);
                };
                if reduce == JSONPATH_REDUCE_FALSE {
                    node = jsonpath_new_node(JSONPATH_NODE_FALSE, 0, 0, 0, 0, 0, 0, 0);
                };
                if reduce == JSONPATH_REDUCE_ROOT {
                    node = jsonpath_new_node(JSONPATH_NODE_ROOT, 0, 0, 0, 0, 0, 0, 0);
                };
                if reduce == JSONPATH_REDUCE_CURRENT {
                    node = jsonpath_new_node(JSONPATH_NODE_CURRENT, 0, 0, 0, 0, 0, 0, 0);
                };
                if reduce == JSONPATH_REDUCE_LAST {
                    node = jsonpath_new_node(JSONPATH_NODE_LAST, 0, 0, 0, 0, 0, 0, 0);
                };
                if reduce == JSONPATH_REDUCE_BINARY {
                    node = jsonpath_new_node(
                        jsonpath_binary_kind(second.level),
                        first.head,
                        third.head,
                        0,
                        0,
                        0,
                        0,
                        0,
                    );
                };
                if reduce == JSONPATH_REDUCE_PLUS
                    || reduce == JSONPATH_REDUCE_MINUS
                    || reduce == JSONPATH_REDUCE_NOT
                    || reduce == JSONPATH_REDUCE_EXISTS
                    || reduce == JSONPATH_REDUCE_IS_UNKNOWN
                    || reduce == JSONPATH_REDUCE_FILTER
                {
                    let mut kind = JSONPATH_NODE_PLUS;
                    let mut child = second.head;
                    if reduce == JSONPATH_REDUCE_MINUS {
                        kind = JSONPATH_NODE_MINUS;
                    };
                    if reduce == JSONPATH_REDUCE_NOT {
                        kind = JSONPATH_NODE_NOT;
                    };
                    if reduce == JSONPATH_REDUCE_EXISTS {
                        kind = JSONPATH_NODE_EXISTS;
                        child = third.head;
                    };
                    if reduce == JSONPATH_REDUCE_IS_UNKNOWN {
                        kind = JSONPATH_NODE_IS_UNKNOWN;
                    };
                    if reduce == JSONPATH_REDUCE_FILTER {
                        kind = JSONPATH_NODE_FILTER;
                        child = third.head;
                    };
                    node = jsonpath_new_node(kind, child, 0, 0, 0, 0, 0, 0);
                };
                if reduce == JSONPATH_REDUCE_STARTS {
                    node = jsonpath_new_node(
                        JSONPATH_NODE_STARTS,
                        first.head,
                        fourth.head,
                        0,
                        0,
                        0,
                        0,
                        0,
                    );
                };
                if reduce == JSONPATH_REDUCE_REGEX || reduce == JSONPATH_REDUCE_REGEX_FLAGS {
                    requires_regex = true;
                    let mut insensitive = false;
                    let mut dotall = false;
                    let mut multiline = false;
                    let mut expanded = false;
                    let mut quoted = false;
                    if reduce == JSONPATH_REDUCE_REGEX_FLAGS {
                        let token = scan.tokens[fifth.token - 1];
                        let mut flag = token.text_start;
                        while flag < token.text_end {
                            let character = scan.text[flag];
                            if character == 'i' {
                                insensitive = true;
                            } else if character == 's' {
                                dotall = true;
                            } else if character == 'm' {
                                multiline = true;
                            } else if character == 'x' {
                                expanded = true;
                            } else if character == 'q' {
                                quoted = true;
                            } else {
                                error = JSONPATH_SCAN_SYNTAX;
                            };
                            flag += 1;
                        }
                    };
                    let mut flags: i32 = 0;
                    if insensitive {
                        flags = flags + 1;
                    };
                    if dotall {
                        flags = flags + 2;
                    };
                    if multiline {
                        flags = flags + 4;
                    };
                    if expanded {
                        flags = flags + 8;
                    };
                    if quoted {
                        flags = flags + 16;
                    };
                    if expanded && quoted == false && error == 0 {
                        error = JSONPATH_PARSE_UNSUPPORTED;
                    };
                    let token = scan.tokens[third.token - 1];
                    node = jsonpath_new_node(
                        JSONPATH_NODE_REGEX,
                        first.head,
                        0,
                        token.text_start,
                        token.text_end,
                        0,
                        0,
                        flags,
                    );
                };
                if reduce == JSONPATH_REDUCE_CHAIN || reduce == JSONPATH_REDUCE_GROUP_CHAIN {
                    let mut left = first;
                    let mut right = second;
                    if reduce == JSONPATH_REDUCE_GROUP_CHAIN {
                        left = second;
                        right = fourth;
                    };
                    let tail = nodes[left.tail];
                    nodes[left.tail] = jsonpath_node_link(tail, right.head);
                    value = JsonpathParseSlot {
                        head: left.head,
                        tail: right.tail,
                        token: 0,
                        count: 1,
                        level: 0,
                    };
                };
                if reduce == JSONPATH_REDUCE_SUBSCRIPT || reduce == JSONPATH_REDUCE_SLICE {
                    node = jsonpath_new_node(
                        JSONPATH_NODE_SUBSCRIPT,
                        first.head,
                        third.head,
                        0,
                        0,
                        0,
                        0,
                        0,
                    );
                };
                if reduce == JSONPATH_REDUCE_LIST {
                    let tail = nodes[first.tail];
                    nodes[first.tail] = jsonpath_node_link(tail, third.head);
                    value = JsonpathParseSlot {
                        head: first.head,
                        tail: third.tail,
                        token: 0,
                        count: first.count + third.count,
                        level: 0,
                    };
                };
                if reduce == JSONPATH_REDUCE_ARRAY_ANY {
                    node = jsonpath_new_node(JSONPATH_NODE_ANY_ARRAY, 0, 0, 0, 0, 0, 0, 0);
                };
                if reduce == JSONPATH_REDUCE_ARRAY_INDEX {
                    node = jsonpath_new_node(JSONPATH_NODE_INDEX, second.head, 0, 0, 0, 0, 0, 0);
                };
                if reduce == JSONPATH_REDUCE_LEVEL_NUMBER {
                    let level = jsonpath_read_level(&scan, first.token);
                    error = level.error;
                    value = JsonpathParseSlot {
                        head: 0,
                        tail: 0,
                        token: 0,
                        count: 0,
                        level: level.value,
                    };
                };
                if reduce == JSONPATH_REDUCE_LEVEL_LAST {
                    value = JsonpathParseSlot {
                        head: 0,
                        tail: 0,
                        token: 0,
                        count: 0,
                        level: -1,
                    };
                };
                if reduce == JSONPATH_REDUCE_ANY_ALL
                    || reduce == JSONPATH_REDUCE_ANY_ONE
                    || reduce == JSONPATH_REDUCE_ANY_RANGE
                {
                    let mut begin: i32 = 0;
                    let mut end: i32 = -1;
                    if reduce != JSONPATH_REDUCE_ANY_ALL {
                        begin = third.level;
                        end = third.level;
                    };
                    if reduce == JSONPATH_REDUCE_ANY_RANGE {
                        end = fifth.level;
                    };
                    node = jsonpath_new_node(JSONPATH_NODE_DESCENDANT, 0, 0, 0, 0, begin, end, 0);
                };
                if reduce == JSONPATH_REDUCE_KEY_ANY {
                    node = jsonpath_new_node(JSONPATH_NODE_ANY_KEY, 0, 0, 0, 0, 0, 0, 0);
                };
                if reduce == JSONPATH_REDUCE_METHOD || reduce == JSONPATH_REDUCE_DATETIME {
                    node = jsonpath_new_node(
                        JSONPATH_NODE_METHOD + second.level - JSONPATH_SCAN_KEYWORD,
                        fourth.head,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                    );
                };
                if reduce == JSONPATH_REDUCE_DECIMAL {
                    if fourth.count > 2 {
                        error = JSONPATH_SCAN_SYNTAX;
                    };
                    let mut right: usize = 0;
                    if fourth.count > 1 {
                        let argument = nodes[fourth.head];
                        right = argument.next;
                        nodes[fourth.head] = jsonpath_node_link(argument, 0);
                    };
                    node = jsonpath_new_node(
                        JSONPATH_NODE_METHOD + second.level - JSONPATH_SCAN_KEYWORD,
                        fourth.head,
                        right,
                        0,
                        0,
                        0,
                        0,
                        0,
                    );
                };
                if reduce == JSONPATH_REDUCE_SIGNED_PLUS || reduce == JSONPATH_REDUCE_SIGNED_MINUS {
                    requires_numeric = true;
                    let number = jsonpath_token_node(&scan, second.token, JSONPATH_NODE_NUMBER);
                    let index = nodes.len();
                    nodes.push(number);
                    validation.push(index);
                    let mut kind = JSONPATH_NODE_PLUS;
                    if reduce == JSONPATH_REDUCE_SIGNED_MINUS {
                        kind = JSONPATH_NODE_MINUS;
                    };
                    node = jsonpath_new_node(kind, index, 0, 0, 0, 0, 0, 0);
                };
                if node.kind > 0 {
                    let index = nodes.len();
                    nodes.push(node);
                    if error == 0
                        && (node.kind == JSONPATH_NODE_NUMBER || node.kind == JSONPATH_NODE_REGEX)
                    {
                        validation.push(index);
                    };
                    value = jsonpath_node_slot(index);
                };
                depth = depth - length;
                let next =
                    jsonpath_table_goto(states[depth - 1], JSONPATH_TABLE_RULE_SYMBOLS[rule]);
                if depth - 1 == slots.len() {
                    slots.push(value);
                } else {
                    slots[depth - 1] = value;
                };
                if depth == states.len() {
                    states.push(next);
                } else {
                    states[depth] = next;
                };
                depth += 1;
            };
        };
    }
    let tree = JsonpathParseTree {
        source: scan.source,
        text: scan.text,
        nodes: nodes,
        validation: validation,
        root: root,
        lax: lax,
        error: error,
        requires_numeric_validation: requires_numeric,
        requires_regex_validation: requires_regex,
    };
    if error == 0 {
        let scope = jsonpath_parse_scope(&tree);
        if scope != 0 {
            return JsonpathParseTree {
                source: tree.source,
                text: tree.text,
                nodes: tree.nodes,
                validation: tree.validation,
                root: tree.root,
                lax: tree.lax,
                error: scope,
                requires_numeric_validation: tree.requires_numeric_validation,
                requires_regex_validation: tree.requires_regex_validation,
            };
        };
    };
    tree
}
