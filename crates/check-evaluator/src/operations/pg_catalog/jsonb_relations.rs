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

fn jsonb_root_facts(input: JsonbValue, measure: bool) -> JsonbKnowledge {
    if let JsonbValue::NonNull(facts) = input {
        return facts;
    };
    if let JsonbValue::Value(value) = input {
        let root = value.nodes[value.root];
        let mut length: i32 = 1;
        if root.kind >= 5 {
            length = jsonb_relation_count(&value, root) as i32;
        };
        let mut maximum: i64 = -1i64;
        if measure {
            maximum = jsonb_partial_bound(&value);
        };
        return JsonbKnowledge {
            maximum: maximum,
            kind: root.kind,
            length: length,
            shape: jsonb_empty_shape(),
        };
    };
    JsonbKnowledge {
        maximum: -1i64,
        kind: -1,
        length: -1,
        shape: jsonb_empty_shape(),
    }
}

fn jsonb_relation_walk(left: &JsonbPayload, right: &JsonbPayload, contains: bool) -> bool {
    jsonb_relation_walk_from(left, left.root, right, right.root, contains)
}

fn jsonb_relation_walk_from(
    left: &JsonbPayload,
    left_root: usize,
    right: &JsonbPayload,
    right_root: usize,
    contains: bool,
) -> bool {
    let mut frames: Vec<JsonbRelationFrame> = Vec::new();
    frames.push(jsonb_relation_cursor(left_root, right_root, 0, 0, 0));
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

fn jsonb_relation_partial(a: JsonbKnowledge, b: JsonbKnowledge, contains: bool) -> BoolValue {
    if a.kind < 0 || b.kind < 0 {
        return BoolValue::Unknown;
    };
    if a.kind != b.kind {
        if contains && a.kind == 5 && b.kind < 5 && a.length != 0 {
            return BoolValue::Unknown;
        };
        return make_bool_value(false);
    };
    if a.kind < 3 {
        return make_bool_value(true);
    };
    if a.kind >= 5 {
        if contains {
            if b.length == 0 {
                return make_bool_value(true);
            };
            if a.length >= 0 && b.length >= 0 {
                if (a.length == 0 && b.length > 0) || (a.kind == 6 && a.length < b.length) {
                    return make_bool_value(false);
                };
            };
        } else if a.length >= 0 && b.length >= 0 {
            if a.length != b.length {
                return make_bool_value(false);
            };
            if a.length == 0 {
                return make_bool_value(true);
            };
        };
    };
    BoolValue::Unknown
}

// Whether two nodes, either of which may be a hole, can have the same kind.
fn jsonb_shape_kinds_meet(a: &JsonbPayload, ai: usize, b: &JsonbPayload, bi: usize) -> bool {
    let mut kind: i32 = 0;
    while kind < 7 {
        if jsonb_hole_allows(a, ai, kind) && jsonb_hole_allows(b, bi, kind) {
            return true;
        };
        kind = kind + 1;
    }
    false
}

fn jsonb_shape_member(
    shape: &JsonbPayload,
    parent: usize,
    key: &JsonbPayload,
    member: usize,
) -> usize {
    let wanted = key.nodes[member];
    let mut child = shape.nodes[parent].child;
    while child > 0 {
        let node = shape.nodes[child];
        if node.key_end - node.key_start == wanted.key_end - wanted.key_start {
            let mut offset: usize = 0;
            let mut same = true;
            while same && node.key_start + offset < node.key_end {
                if shape.characters[node.key_start + offset]
                    != key.characters[wanted.key_start + offset]
                {
                    same = false;
                };
                offset += 1;
            }
            if same {
                return child;
            };
        };
        child = node.next;
    }
    0
}

// Equality or nested containment between subtrees that may hold holes: 1 holds, 0 fails, -1
// depends on a hole. Containment below the root follows PostgreSQL: kinds must match, objects
// need every right key, and each right element needs some left element containing it.
fn jsonb_shape_relation(
    a: &JsonbPayload,
    ai: usize,
    b: &JsonbPayload,
    bi: usize,
    contains: bool,
) -> i32 {
    let left = a.nodes[ai];
    let right = b.nodes[bi];
    if left.kind == 7 || right.kind == 7 {
        if jsonb_shape_kinds_meet(a, ai, b, bi) {
            return -1;
        };
        return 0;
    };
    if left.kind != right.kind {
        return 0;
    };
    if left.kind < 5 {
        if jsonb_relation_scalar(a, b, left, right) {
            return 1;
        };
        return 0;
    };
    if jsonb_shape_exact(a, ai) && jsonb_shape_exact(b, bi) {
        if jsonb_relation_walk_from(a, ai, b, bi, contains) {
            return 1;
        };
        return 0;
    };
    let first = jsonb_relation_count(a, left);
    let second = jsonb_relation_count(b, right);
    if (contains == false && first != second) || (left.kind == 6 && first < second) {
        return 0;
    };
    let mut result: i32 = 1;
    let mut member = right.child;
    let mut paired = left.child;
    while member > 0 {
        let mut outcome: i32 = 0;
        if left.kind == 6 {
            let found = jsonb_shape_member(a, ai, b, member);
            if found > 0 {
                outcome = jsonb_shape_relation(a, found, b, member, contains);
            };
        } else if contains == false {
            outcome = jsonb_shape_relation(a, paired, b, member, false);
            paired = a.nodes[paired].next;
        } else {
            let mut candidate = left.child;
            while candidate > 0 && outcome != 1 {
                let found = jsonb_shape_relation(a, candidate, b, member, true);
                if found == 1 || (found == -1 && outcome == 0) {
                    outcome = found;
                };
                candidate = a.nodes[candidate].next;
            }
        };
        if outcome == 0 {
            return 0;
        };
        if outcome == -1 {
            result = -1;
        };
        member = b.nodes[member].next;
    }
    result
}

// The root comparison adds PostgreSQL's one exception: an array contains a raw scalar that
// equals one of its scalar elements.
fn jsonb_shape_root_relation(a: &JsonbPayload, b: &JsonbPayload, contains: bool) -> i32 {
    let left = a.nodes[a.root];
    let right = b.nodes[b.root];
    if contains && right.kind < 5 {
        let mut result: i32 = 0;
        if left.kind == 5 {
            let mut child = left.child;
            while child > 0 {
                let candidate = a.nodes[child];
                if candidate.kind < 5 && jsonb_relation_scalar(a, b, candidate, right) {
                    return 1;
                };
                if candidate.kind == 7 && jsonb_hole_allows(a, child, right.kind) {
                    result = -1;
                };
                child = candidate.next;
            }
            return result;
        };
        if left.kind == 7 && jsonb_hole_allows(a, a.root, 5) {
            return -1;
        };
    };
    jsonb_shape_relation(a, a.root, b, b.root, contains)
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
    let mut partial = false;
    if let JsonbValue::NonNull(_) = left {
        partial = true;
    };
    if let JsonbValue::NonNull(_) = right {
        partial = true;
    };
    if partial {
        let mut first = jsonb_empty_shape();
        let mut second = jsonb_empty_shape();
        let left_shape = left.clone();
        if let JsonbValue::NonNull(facts) = left_shape {
            first = facts.shape;
        };
        let left_exact = left.clone();
        if let JsonbValue::Value(value) = left_exact {
            first = value;
        };
        let right_shape = right.clone();
        if let JsonbValue::NonNull(facts) = right_shape {
            second = facts.shape;
        };
        let right_exact = right.clone();
        if let JsonbValue::Value(value) = right_exact {
            second = value;
        };
        if first.nodes.len() > 1 && second.nodes.len() > 1 {
            let related = jsonb_shape_root_relation(&first, &second, contains);
            if related >= 0 {
                return make_bool_value((related == 1) != invert);
            };
            return BoolValue::Unknown;
        };
        let a = jsonb_root_facts(left, false);
        let b = jsonb_root_facts(right, false);
        let compared = jsonb_relation_partial(a, b, contains);
        if let BoolValue::Value(result) = compared {
            return make_bool_value(result != invert);
        };
        return compared;
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
