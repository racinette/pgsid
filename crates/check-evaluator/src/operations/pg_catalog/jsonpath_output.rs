#[derive(Clone, Copy)]
struct JsonpathPrintTask {
    mode: i32,
    node: usize,
    brackets: bool,
    key: bool,
}

const JSONPATH_PRINT_TOKENS: &[&str] = &[
    "",
    "$",
    "@",
    "last",
    "",
    "",
    "$",
    "null",
    "true",
    "false",
    "",
    "*",
    "[*]",
    "[",
    "",
    "",
    "?(",
    "exists (",
    "!(",
    "(",
    "+",
    "-",
    " + ",
    " - ",
    " * ",
    " / ",
    " % ",
    " == ",
    " != ",
    " < ",
    " <= ",
    " > ",
    " >= ",
    " && ",
    " || ",
    " starts with ",
    " like_regex ",
    "(",
    ")",
    ") is unknown",
    "[",
    "]",
    ",",
    " to ",
];

fn jsonpath_output_task(mode: i32, node: usize, brackets: bool, key: bool) -> JsonpathPrintTask {
    JsonpathPrintTask {
        mode: mode,
        node: node,
        brackets: brackets,
        key: key,
    }
}

fn jsonpath_print_priority(kind: i32) -> i32 {
    if kind == JSONPATH_NODE_OR {
        return 0;
    };
    if kind == JSONPATH_NODE_AND {
        return 1;
    };
    if (kind >= JSONPATH_NODE_EQ && kind <= JSONPATH_NODE_GE) || kind == JSONPATH_NODE_STARTS {
        return 2;
    };
    if kind == JSONPATH_NODE_ADD || kind == JSONPATH_NODE_SUB {
        return 3;
    };
    if kind >= JSONPATH_NODE_MUL && kind <= JSONPATH_NODE_MOD {
        return 4;
    };
    if kind == JSONPATH_NODE_PLUS || kind == JSONPATH_NODE_MINUS {
        return 5;
    };
    6
}

fn jsonpath_print_quote(value: &JsonpathPayload, begin: usize, end: usize) -> String {
    let mut output = String::new();
    output.push('"');
    let hex: Vec<char> = "0123456789abcdef".chars().collect();
    let mut position = begin;
    while position < end {
        let character = value.characters[position];
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

fn jsonpath_print_level(level: i32) -> String {
    if level == -1 {
        return "last".to_owned();
    };
    let result = int4_to_text(Int4Value::Value(level));
    if let TextValue::Value(value) = result {
        return value;
    };
    String::new()
}

pub fn jsonpath_to_text(input: JsonpathValue) -> TextValue {
    if let JsonpathValue::Error(error) = input {
        return TextValue::Error(error);
    };
    if let JsonpathValue::Null = input {
        return TextValue::Null;
    };
    if let JsonpathValue::Value(value) = input {
        let mut output = String::new();
        if value.lax == false {
            output.push_str("strict ");
        };
        let mut stack: Vec<JsonpathPrintTask> = Vec::new();
        stack.push(jsonpath_output_task(0, value.root, true, false));
        let mut count = stack.len();
        while count > 0 {
            count = count - 1;
            let task = stack[count];
            if task.mode == 1 {
                output.push_str(JSONPATH_PRINT_TOKENS[task.node]);
            } else {
                let node = value.nodes[task.node];
                if task.mode == 2 {
                    let quoted = jsonpath_print_quote(&value, node.text_start, node.text_end);
                    output.push_str(quoted.as_str());
                    if node.flags > 0 {
                        output.push_str(" flag \"");
                        if node.flags % 2 == 1 {
                            output.push('i');
                        };
                        if (node.flags / 2) % 2 == 1 {
                            output.push('s');
                        };
                        if (node.flags / 4) % 2 == 1 {
                            output.push('m');
                        };
                        if (node.flags / 8) % 2 == 1 {
                            output.push('x');
                        };
                        if (node.flags / 16) % 2 == 1 {
                            output.push('q');
                        };
                        output.push('"');
                    };
                } else if task.mode == 3 {
                    if node.next > 0 {
                        let next = jsonpath_output_task(3, node.next, false, false);
                        if count < stack.len() {
                            stack[count] = next;
                        } else {
                            stack.push(next);
                        };
                        count += 1;
                        let comma = jsonpath_output_task(1, 42, false, false);
                        if count < stack.len() {
                            stack[count] = comma;
                        } else {
                            stack.push(comma);
                        };
                        count += 1;
                    };
                    if node.right > 0 {
                        let right = jsonpath_output_task(0, node.right, false, false);
                        if count < stack.len() {
                            stack[count] = right;
                        } else {
                            stack.push(right);
                        };
                        count += 1;
                        let separator = jsonpath_output_task(1, 43, false, false);
                        if count < stack.len() {
                            stack[count] = separator;
                        } else {
                            stack.push(separator);
                        };
                        count += 1;
                    };
                    let left = jsonpath_output_task(0, node.left, false, false);
                    if count < stack.len() {
                        stack[count] = left;
                    } else {
                        stack.push(left);
                    };
                    count += 1;
                } else {
                    if node.next > 0 {
                        let next = jsonpath_output_task(0, node.next, true, true);
                        if count < stack.len() {
                            stack[count] = next;
                        } else {
                            stack.push(next);
                        };
                        count += 1;
                    };
                    let kind = node.kind;
                    if (kind == JSONPATH_NODE_KEY
                        || kind == JSONPATH_NODE_ANY_KEY
                        || kind == JSONPATH_NODE_DESCENDANT)
                        && task.key
                    {
                        output.push('.');
                    };
                    if kind == JSONPATH_NODE_STRING
                        || kind == JSONPATH_NODE_KEY
                        || kind == JSONPATH_NODE_VARIABLE
                    {
                        if kind == JSONPATH_NODE_VARIABLE {
                            output.push('$');
                        };
                        let quoted = jsonpath_print_quote(&value, node.text_start, node.text_end);
                        output.push_str(quoted.as_str());
                    };
                    if kind == JSONPATH_NODE_NUMBER {
                        if node.next > 0 {
                            output.push('(');
                        };
                        let mut position = node.text_start;
                        while position < node.text_end {
                            output.push(value.characters[position]);
                            position += 1;
                        }
                        if node.next > 0 {
                            output.push(')');
                        };
                    };
                    if kind == JSONPATH_NODE_ROOT
                        || kind == JSONPATH_NODE_CURRENT
                        || kind == JSONPATH_NODE_LAST
                        || kind == JSONPATH_NODE_NULL
                        || kind == JSONPATH_NODE_TRUE
                        || kind == JSONPATH_NODE_FALSE
                        || kind == JSONPATH_NODE_ANY_KEY
                        || kind == JSONPATH_NODE_ANY_ARRAY
                    {
                        output.push_str(JSONPATH_PRINT_TOKENS[usize::try_from(kind).unwrap_or(0)]);
                    };
                    if kind >= JSONPATH_NODE_ADD && kind <= JSONPATH_NODE_STARTS {
                        if task.brackets {
                            output.push('(');
                            let closing = jsonpath_output_task(1, 38, false, false);
                            if count < stack.len() {
                                stack[count] = closing;
                            } else {
                                stack.push(closing);
                            };
                            count += 1;
                        };
                        let priority = jsonpath_print_priority(kind);
                        let right_node = value.nodes[node.right];
                        let right = jsonpath_output_task(
                            0,
                            node.right,
                            jsonpath_print_priority(right_node.kind) <= priority,
                            false,
                        );
                        if count < stack.len() {
                            stack[count] = right;
                        } else {
                            stack.push(right);
                        };
                        count += 1;
                        let operation = jsonpath_output_task(
                            1,
                            usize::try_from(kind).unwrap_or(0),
                            false,
                            false,
                        );
                        if count < stack.len() {
                            stack[count] = operation;
                        } else {
                            stack.push(operation);
                        };
                        count += 1;
                        let left_node = value.nodes[node.left];
                        let left = jsonpath_output_task(
                            0,
                            node.left,
                            jsonpath_print_priority(left_node.kind) <= priority,
                            false,
                        );
                        if count < stack.len() {
                            stack[count] = left;
                        } else {
                            stack.push(left);
                        };
                        count += 1;
                    };
                    if kind == JSONPATH_NODE_PLUS
                        || kind == JSONPATH_NODE_MINUS
                        || kind == JSONPATH_NODE_REGEX
                    {
                        if task.brackets {
                            output.push('(');
                            let closing = jsonpath_output_task(1, 38, false, false);
                            if count < stack.len() {
                                stack[count] = closing;
                            } else {
                                stack.push(closing);
                            };
                            count += 1;
                        };
                        if kind == JSONPATH_NODE_REGEX {
                            let pattern = jsonpath_output_task(2, task.node, false, false);
                            if count < stack.len() {
                                stack[count] = pattern;
                            } else {
                                stack.push(pattern);
                            };
                            count += 1;
                            let operation = jsonpath_output_task(1, 36, false, false);
                            if count < stack.len() {
                                stack[count] = operation;
                            } else {
                                stack.push(operation);
                            };
                            count += 1;
                        } else {
                            output.push_str(
                                JSONPATH_PRINT_TOKENS[usize::try_from(kind).unwrap_or(0)],
                            );
                        };
                        let child_node = value.nodes[node.left];
                        let child = jsonpath_output_task(
                            0,
                            node.left,
                            jsonpath_print_priority(child_node.kind)
                                <= jsonpath_print_priority(kind),
                            false,
                        );
                        if count < stack.len() {
                            stack[count] = child;
                        } else {
                            stack.push(child);
                        };
                        count += 1;
                    };
                    if kind == JSONPATH_NODE_NOT
                        || kind == JSONPATH_NODE_IS_UNKNOWN
                        || kind == JSONPATH_NODE_FILTER
                        || kind == JSONPATH_NODE_EXISTS
                    {
                        output.push_str(JSONPATH_PRINT_TOKENS[usize::try_from(kind).unwrap_or(0)]);
                        let mut closing_token: usize = 38;
                        if kind == JSONPATH_NODE_IS_UNKNOWN {
                            closing_token = 39;
                        };
                        let closing = jsonpath_output_task(1, closing_token, false, false);
                        if count < stack.len() {
                            stack[count] = closing;
                        } else {
                            stack.push(closing);
                        };
                        count += 1;
                        let child = jsonpath_output_task(0, node.left, false, false);
                        if count < stack.len() {
                            stack[count] = child;
                        } else {
                            stack.push(child);
                        };
                        count += 1;
                    };
                    if kind == JSONPATH_NODE_INDEX {
                        output.push('[');
                        let closing = jsonpath_output_task(1, 41, false, false);
                        if count < stack.len() {
                            stack[count] = closing;
                        } else {
                            stack.push(closing);
                        };
                        count += 1;
                        let subscript = jsonpath_output_task(3, node.left, false, false);
                        if count < stack.len() {
                            stack[count] = subscript;
                        } else {
                            stack.push(subscript);
                        };
                        count += 1;
                    };
                    if kind == JSONPATH_NODE_DESCENDANT {
                        output.push_str("**");
                        if node.first != 0 || node.last != -1 {
                            output.push('{');
                            let first = jsonpath_print_level(node.first);
                            output.push_str(first.as_str());
                            if node.last != node.first {
                                output.push_str(" to ");
                                let last = jsonpath_print_level(node.last);
                                output.push_str(last.as_str());
                            };
                            output.push('}');
                        };
                    };
                    if kind >= JSONPATH_NODE_METHOD {
                        output.push('.');
                        output.push_str(
                            JSONPATH_SCAN_KEYWORDS
                                [usize::try_from(kind - JSONPATH_NODE_METHOD).unwrap_or(0)],
                        );
                        output.push('(');
                        let closing = jsonpath_output_task(1, 38, false, false);
                        if count < stack.len() {
                            stack[count] = closing;
                        } else {
                            stack.push(closing);
                        };
                        count += 1;
                        if node.right > 0 {
                            let right = jsonpath_output_task(0, node.right, false, false);
                            if count < stack.len() {
                                stack[count] = right;
                            } else {
                                stack.push(right);
                            };
                            count += 1;
                            let comma = jsonpath_output_task(1, 42, false, false);
                            if count < stack.len() {
                                stack[count] = comma;
                            } else {
                                stack.push(comma);
                            };
                            count += 1;
                        };
                        if node.left > 0 {
                            let left = jsonpath_output_task(0, node.left, false, false);
                            if count < stack.len() {
                                stack[count] = left;
                            } else {
                                stack.push(left);
                            };
                            count += 1;
                        };
                    };
                };
            };
        }
        return TextValue::Value(output);
    };
    TextValue::Unknown
}
