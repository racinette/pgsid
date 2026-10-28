#[derive(Clone, Copy)]
struct JsonbRelationFrame {
    left: usize,
    right: usize,
    left_child: usize,
    right_child: usize,
    state: i32,
}

fn jsonb_relation_cursor(
    left: usize,
    right: usize,
    a: usize,
    b: usize,
    state: i32,
) -> JsonbRelationFrame {
    JsonbRelationFrame {
        left: left,
        right: right,
        left_child: a,
        right_child: b,
        state: state,
    }
}

fn jsonb_relation_span(
    left: &JsonbPayload,
    right: &JsonbPayload,
    a: usize,
    a_end: usize,
    b: usize,
    b_end: usize,
) -> bool {
    if a_end - a != b_end - b {
        return false;
    };
    let mut index: usize = 0;
    while index < a_end - a {
        if left.characters[a + index] != right.characters[b + index] {
            return false;
        };
        index += 1;
    }
    true
}

fn jsonb_relation_number(source: &JsonbPayload, node: JsonbNode) -> NumericValue {
    let mut text = String::new();
    let mut position = node.text_start;
    while position < node.text_end {
        text.push(source.characters[position]);
        position += 1;
    }
    NumericValue::Value(text)
}

fn jsonb_relation_scalar(
    left: &JsonbPayload,
    right: &JsonbPayload,
    a: JsonbNode,
    b: JsonbNode,
) -> bool {
    if a.kind != b.kind {
        return false;
    };
    if a.kind == 3 {
        let first = jsonb_relation_number(left, a);
        let second = jsonb_relation_number(right, b);
        let compared = numeric_compare(first, second);
        if let Int4Value::Value(order) = compared {
            return order == 0;
        };
        return false;
    };
    if a.kind == 4 {
        return jsonb_relation_span(
            left,
            right,
            a.text_start,
            a.text_end,
            b.text_start,
            b.text_end,
        );
    };
    a.kind < 3
}

fn jsonb_relation_count(source: &JsonbPayload, node: JsonbNode) -> usize {
    let mut count: usize = 0;
    let mut child = node.child;
    while child > 0 {
        count += 1;
        child = source.nodes[child].next;
    }
    count
}

fn jsonb_relation_walk(left: &JsonbPayload, right: &JsonbPayload, contains: bool) -> bool {
    let mut frames: Vec<JsonbRelationFrame> = Vec::new();
    frames.push(jsonb_relation_cursor(left.root, right.root, 0, 0, 0));
    let mut depth: usize = 1;
    let mut returning = false;
    let mut result = false;
    while depth > 0 {
        let frame = frames[depth - 1];
        let a = left.nodes[frame.left];
        let b = right.nodes[frame.right];
        if returning {
            returning = false;
            if frame.state == 4 {
                let mut first = left.nodes[frame.left_child].next;
                let mut second = frame.right_child;
                if result {
                    first = a.child;
                    second = right.nodes[second].next;
                };
                frames[depth - 1] =
                    jsonb_relation_cursor(frame.left, frame.right, first, second, 1);
            } else if result == false {
                depth = depth - 1;
                returning = true;
            } else {
                let mut first = frame.left_child;
                if frame.state == 3 {
                    first = left.nodes[first].next;
                };
                frames[depth - 1] = jsonb_relation_cursor(
                    frame.left,
                    frame.right,
                    first,
                    right.nodes[frame.right_child].next,
                    1,
                );
            };
        } else if frame.state == 0 {
            if a.kind < 5 && b.kind < 5 {
                result = jsonb_relation_scalar(left, right, a, b);
                depth = depth - 1;
                returning = true;
            } else if contains && a.kind == 5 && b.kind < 5 {
                let mut child = a.child;
                result = false;
                while child > 0 {
                    let candidate = left.nodes[child];
                    if candidate.kind < 5 && jsonb_relation_scalar(left, right, candidate, b) {
                        result = true;
                        child = 0;
                    } else {
                        child = candidate.next;
                    };
                }
                depth = depth - 1;
                returning = true;
            } else if a.kind != b.kind {
                result = false;
                depth = depth - 1;
                returning = true;
            } else {
                let first = jsonb_relation_count(left, a);
                let second = jsonb_relation_count(right, b);
                if (contains == false && first != second) || (a.kind == 6 && first < second) {
                    result = false;
                    depth = depth - 1;
                    returning = true;
                } else {
                    frames[depth - 1] =
                        jsonb_relation_cursor(frame.left, frame.right, a.child, b.child, 1);
                };
            };
        } else if frame.right_child == 0 {
            result = true;
            depth = depth - 1;
            returning = true;
        } else {
            let target = right.nodes[frame.right_child];
            let mut candidate = frame.left_child;
            let mut waiting: i32 = 3;
            if a.kind == 6 {
                waiting = 2;
                candidate = a.child;
                let mut found = false;
                while candidate > 0 && found == false {
                    let node = left.nodes[candidate];
                    if jsonb_relation_span(
                        left,
                        right,
                        node.key_start,
                        node.key_end,
                        target.key_start,
                        target.key_end,
                    ) {
                        found = true;
                    } else {
                        candidate = node.next;
                    };
                }
            } else if contains {
                waiting = 4;
                let mut found = false;
                while candidate > 0 && found == false {
                    let node = left.nodes[candidate];
                    if target.kind < 5 {
                        found = node.kind < 5 && jsonb_relation_scalar(left, right, node, target);
                    } else {
                        found = node.kind >= 5;
                    };
                    if found == false {
                        candidate = node.next;
                    };
                }
                if target.kind < 5 && candidate > 0 {
                    frames[depth - 1] =
                        jsonb_relation_cursor(frame.left, frame.right, a.child, target.next, 1);
                    waiting = 0;
                };
            };
            if waiting > 0 {
                let mut compatible = candidate > 0;
                if compatible && contains && a.kind == 6 {
                    let node = left.nodes[candidate];
                    if (node.kind < 5 || target.kind < 5) && node.kind != target.kind {
                        compatible = false;
                    };
                };
                if compatible == false {
                    result = false;
                    depth = depth - 1;
                    returning = true;
                } else {
                    frames[depth - 1] = jsonb_relation_cursor(
                        frame.left,
                        frame.right,
                        candidate,
                        frame.right_child,
                        waiting,
                    );
                    let next = jsonb_relation_cursor(candidate, frame.right_child, 0, 0, 0);
                    if depth < frames.len() {
                        frames[depth] = next;
                    } else {
                        frames.push(next);
                    };
                    depth += 1;
                };
            };
        };
    }
    result
}

fn jsonb_relation_values(
    left: JsonbValue,
    right: JsonbValue,
    contains: bool,
    invert: bool,
) -> BoolValue {
    if let JsonbValue::Error(error) = left {
        return BoolValue::Error(error);
    };
    if let JsonbValue::Error(error) = right {
        return BoolValue::Error(error);
    };
    if let JsonbValue::Null = left {
        return BoolValue::Null;
    };
    if let JsonbValue::Null = right {
        return BoolValue::Null;
    };
    if let JsonbValue::Unknown = left {
        return BoolValue::Unknown;
    };
    if let JsonbValue::Unknown = right {
        return BoolValue::Unknown;
    };
    if let JsonbValue::Value(a) = left {
        if let JsonbValue::Value(b) = right {
            let result = jsonb_relation_walk(&a, &b, contains);
            return BoolValue::Value(result != invert);
        };
    };
    BoolValue::Unknown
}

pub fn sql__pg_catalog__jsonb_eq__tfah(left: JsonbValue, right: JsonbValue) -> BoolValue {
    jsonb_relation_values(left, right, false, false)
}

pub fn sql__pg_catalog__jsonb_ne__79zi(left: JsonbValue, right: JsonbValue) -> BoolValue {
    jsonb_relation_values(left, right, false, true)
}

pub fn sql__pg_catalog__jsonb_contains__x4n2(left: JsonbValue, right: JsonbValue) -> BoolValue {
    jsonb_relation_values(left, right, true, false)
}

pub fn sql__pg_catalog__jsonb_contained__3itb(left: JsonbValue, right: JsonbValue) -> BoolValue {
    if let JsonbValue::Error(error) = left {
        return BoolValue::Error(error);
    };
    if let JsonbValue::Error(error) = right {
        return BoolValue::Error(error);
    };
    jsonb_relation_values(right, left, true, false)
}
