#[derive(Clone, Copy)]
struct JsonbOrderFrame {
    left: usize,
    right: usize,
    key: bool,
}

fn jsonb_order_width(code: i32) -> usize {
    if code < 128 {
        return 1;
    };
    if code < 2048 {
        return 2;
    };
    if code < 65536 {
        return 3;
    };
    4
}

fn jsonb_order_byte(code: i32, width: usize, index: usize) -> i32 {
    if width == 1 {
        return code;
    };
    if index == 0 {
        if width == 2 {
            return 192 + code / 64;
        };
        if width == 3 {
            return 224 + code / 4096;
        };
        return 240 + code / 262144;
    };
    if width - index == 3 {
        return 128 + code / 4096 % 64;
    };
    if width - index == 2 {
        return 128 + code / 64 % 64;
    };
    128 + code % 64
}

fn jsonb_order_span(
    left: &JsonbPayload,
    right: &JsonbPayload,
    start_a: usize,
    end_a: usize,
    start_b: usize,
    end_b: usize,
) -> i32 {
    let mut a = start_a;
    let mut b = start_b;
    while a < end_a && b < end_b {
        let first = left.characters[a] as i32;
        let second = right.characters[b] as i32;
        if first != second {
            let width_a = jsonb_order_width(first);
            let width_b = jsonb_order_width(second);
            let mut index: usize = 0;
            while index < width_a && index < width_b {
                let byte_a = jsonb_order_byte(first, width_a, index);
                let byte_b = jsonb_order_byte(second, width_b, index);
                if byte_a != byte_b {
                    return byte_a - byte_b;
                };
                index += 1;
            }
        };
        a += 1;
        b += 1;
    }
    if a < end_a {
        return 1;
    };
    if b < end_b {
        return -1;
    };
    0
}

fn jsonb_order_key_size(source: &JsonbPayload, node: JsonbNode) -> usize {
    let mut size: usize = 0;
    let mut index = node.key_start;
    while index < node.key_end {
        size += jsonb_order_width(source.characters[index] as i32);
        index += 1;
    }
    size
}

fn jsonb_order_key(source: &JsonbPayload, left: usize, right: usize) -> i32 {
    let a = source.nodes[left];
    let b = source.nodes[right];
    let size_a = jsonb_order_key_size(source, a);
    let size_b = jsonb_order_key_size(source, b);
    if size_a < size_b {
        return -1;
    };
    if size_a > size_b {
        return 1;
    };
    jsonb_order_span(
        source,
        source,
        a.key_start,
        a.key_end,
        b.key_start,
        b.key_end,
    )
}

fn jsonb_order_children(source: &JsonbPayload, node: JsonbNode) -> Vec<usize> {
    let mut children: Vec<usize> = Vec::new();
    let mut buffer: Vec<usize> = Vec::new();
    let mut child = node.child;
    while child > 0 {
        children.push(child);
        buffer.push(child);
        child = source.nodes[child].next;
    }
    if node.kind != 6 {
        return children;
    };
    let count = children.len();
    let mut width: usize = 1;
    while width < count {
        let mut start: usize = 0;
        while start < count {
            let mut middle = start + width;
            if middle > count {
                middle = count;
            };
            let mut end = middle + width;
            if end > count {
                end = count;
            };
            let mut a = start;
            let mut b = middle;
            let mut output = start;
            while output < end {
                if b == end
                    || (a < middle && jsonb_order_key(source, children[a], children[b]) <= 0)
                {
                    buffer[output] = children[a];
                    a += 1;
                } else {
                    buffer[output] = children[b];
                    b += 1;
                };
                output += 1;
            }
            start = end;
        }
        let mut index: usize = 0;
        while index < count {
            children[index] = buffer[index];
            index += 1;
        }
        width = width + width;
    }
    children
}

fn jsonb_order_rank(kind: i32) -> i32 {
    if kind == 4 {
        return 1;
    };
    if kind == 3 {
        return 2;
    };
    if kind == 1 || kind == 2 {
        return 3;
    };
    if kind == 5 {
        return 16;
    };
    if kind == 6 {
        return 17;
    };
    0
}

fn jsonb_order_walk(left: &JsonbPayload, right: &JsonbPayload) -> Int4Value {
    let first = left.nodes[left.root];
    let second = right.nodes[right.root];
    if first.kind < 5 && second.kind == 5 {
        if second.child == 0 {
            return Int4Value::Value(1);
        };
        return Int4Value::Value(-1);
    };
    if first.kind == 5 && second.kind < 5 {
        if first.child == 0 {
            return Int4Value::Value(-1);
        };
        return Int4Value::Value(1);
    };
    let mut frames: Vec<JsonbOrderFrame> = Vec::new();
    frames.push(JsonbOrderFrame {
        left: left.root,
        right: right.root,
        key: false,
    });
    let mut depth: usize = 1;
    while depth > 0 {
        depth = depth - 1;
        let frame = frames[depth];
        let a = left.nodes[frame.left];
        let b = right.nodes[frame.right];
        if frame.key {
            let compared =
                jsonb_order_span(left, right, a.key_start, a.key_end, b.key_start, b.key_end);
            if compared != 0 {
                return Int4Value::Value(compared);
            };
        } else {
            let rank_a = jsonb_order_rank(a.kind);
            let rank_b = jsonb_order_rank(b.kind);
            if rank_a < rank_b {
                return Int4Value::Value(-1);
            };
            if rank_a > rank_b {
                return Int4Value::Value(1);
            };
            let mut compared = Int4Value::Value(0);
            if a.kind == 3 {
                compared = numeric_compare(
                    jsonb_relation_number(left, a),
                    jsonb_relation_number(right, b),
                );
            } else if a.kind == 4 {
                compared = Int4Value::Value(jsonb_order_span(
                    left,
                    right,
                    a.text_start,
                    a.text_end,
                    b.text_start,
                    b.text_end,
                ));
            } else if a.kind < 3 {
                if a.kind < b.kind {
                    compared = Int4Value::Value(-1);
                } else if a.kind > b.kind {
                    compared = Int4Value::Value(1);
                };
            } else {
                let count_a = jsonb_relation_count(left, a);
                let count_b = jsonb_relation_count(right, b);
                if count_a < count_b {
                    return Int4Value::Value(-1);
                };
                if count_a > count_b {
                    return Int4Value::Value(1);
                };
                let children_a = jsonb_order_children(left, a);
                let children_b = jsonb_order_children(right, b);
                let mut index = count_a;
                while index > 0 {
                    index = index - 1;
                    let child_a = children_a[index];
                    let child_b = children_b[index];
                    let value_frame = JsonbOrderFrame {
                        left: child_a,
                        right: child_b,
                        key: false,
                    };
                    if depth == frames.len() {
                        frames.push(value_frame);
                    } else {
                        frames[depth] = value_frame;
                    };
                    depth += 1;
                    if a.kind == 6 {
                        let key_frame = JsonbOrderFrame {
                            left: child_a,
                            right: child_b,
                            key: true,
                        };
                        if depth == frames.len() {
                            frames.push(key_frame);
                        } else {
                            frames[depth] = key_frame;
                        };
                        depth += 1;
                    };
                }
            };
            if compared != Int4Value::Value(0) {
                return compared;
            };
        };
    }
    Int4Value::Value(0)
}

pub fn sql__pg_catalog__jsonb_cmp__n2cx(left: JsonbValue, right: JsonbValue) -> Int4Value {
    if let JsonbValue::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let JsonbValue::Error(error) = right {
        return Int4Value::Error(error);
    }
    if let JsonbValue::Unknown = left {
        return Int4Value::Unknown;
    }
    if let JsonbValue::Unknown = right {
        return Int4Value::Unknown;
    }
    if let JsonbValue::Null = left {
        return Int4Value::Null;
    }
    if let JsonbValue::Null = right {
        return Int4Value::Null;
    }
    if let JsonbValue::Value(a) = left {
        if let JsonbValue::Value(b) = right {
            return jsonb_order_walk(&a, &b);
        };
    };
    Int4Value::Unknown
}

pub fn sql__pg_catalog__jsonb_lt__tn76(left: JsonbValue, right: JsonbValue) -> BoolValue {
    value_order_finish(sql__pg_catalog__jsonb_cmp__n2cx(left, right), 2)
}

pub fn sql__pg_catalog__jsonb_le__mrjw(left: JsonbValue, right: JsonbValue) -> BoolValue {
    value_order_finish(sql__pg_catalog__jsonb_cmp__n2cx(left, right), 3)
}

pub fn sql__pg_catalog__jsonb_gt__ogc1(left: JsonbValue, right: JsonbValue) -> BoolValue {
    value_order_finish(sql__pg_catalog__jsonb_cmp__n2cx(left, right), 4)
}

pub fn sql__pg_catalog__jsonb_ge__ymoh(left: JsonbValue, right: JsonbValue) -> BoolValue {
    value_order_finish(sql__pg_catalog__jsonb_cmp__n2cx(left, right), 5)
}
