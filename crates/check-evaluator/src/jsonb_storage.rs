#[derive(Clone, Copy)]
struct JsonbStorageSize {
    low: i64,
    high: i64,
    reachable: bool,
}

const JSONB_STORAGE_LIMIT: i64 = 268435455i64;
const JSONB_STORAGE_ERROR: u32 = 8584704;

fn jsonb_storage_bounds(low: i64, high: i64) -> JsonbStorageSize {
    let ceiling = JSONB_STORAGE_LIMIT + 4i64;
    let mut a = low;
    let mut b = high;
    if a > ceiling {
        a = ceiling;
    };
    if b > ceiling {
        b = ceiling;
    };
    JsonbStorageSize {
        low: a,
        high: b,
        reachable: true,
    }
}

fn jsonb_storage_decision(size: JsonbStorageSize) -> BoolValue {
    if size.low > JSONB_STORAGE_LIMIT {
        return BoolValue::Error(make_sql_error(JSONB_STORAGE_ERROR));
    };
    if size.high > JSONB_STORAGE_LIMIT {
        return BoolValue::Unknown;
    };
    BoolValue::Value(true)
}

fn jsonb_storage_aligned(value: i64) -> i64 {
    ((value + 3i64) / 4i64) * 4i64
}

fn jsonb_storage_append(
    current: JsonbStorageSize,
    child: JsonbStorageSize,
    align: bool,
    ordered: bool,
) -> JsonbStorageSize {
    if align {
        if ordered {
            return jsonb_storage_bounds(
                jsonb_storage_aligned(current.low) + child.low,
                jsonb_storage_aligned(current.high) + child.high,
            );
        };
        return jsonb_storage_bounds(current.low + child.low, current.high + child.high + 3i64);
    };
    jsonb_storage_bounds(current.low + child.low, current.high + child.high)
}

fn jsonb_storage_padding(current: JsonbStorageSize, ordered: bool) -> JsonbStorageSize {
    if ordered && current.low == current.high {
        let padding = jsonb_storage_aligned(current.low) - current.low;
        return jsonb_storage_bounds(padding, padding);
    };
    jsonb_storage_bounds(0i64, 3i64)
}

#[derive(Clone)]
struct JsonbStorageCharacters {
    non_ascii: Vec<usize>,
}

fn jsonb_storage_unicode_before(source: &JsonbStorageCharacters, end: usize) -> usize {
    let mut low: usize = 0;
    let mut high = source.non_ascii.len();
    while low < high {
        let distance = (high - low) as i32;
        let middle = low + usize::try_from(distance / 2).unwrap_or(0);
        if source.non_ascii[middle] < end {
            low = middle + 1;
        } else {
            high = middle;
        };
    }
    low
}

fn jsonb_storage_span(
    source: &JsonbStorageCharacters,
    begin: usize,
    end: usize,
) -> JsonbStorageSize {
    let length = (end - begin) as i32;
    let first = jsonb_storage_unicode_before(source, begin);
    let last = jsonb_storage_unicode_before(source, end);
    let unicode = (last - first) as i32;
    let low = length as i64;
    jsonb_storage_bounds(low, low + (unicode as i64) * 3i64)
}

fn jsonb_storage_group(weight: i32) -> i32 {
    let mut group = weight / 4;
    if weight < 0 && weight % 4 != 0 {
        group = group - 1;
    };
    group
}

fn jsonb_storage_numeric(source: &JsonbPayload, node: JsonbNode) -> JsonbStorageSize {
    let mut number = String::new();
    let mut position = node.text_start;
    let mut fractional = false;
    let mut scale: i32 = 0;
    while position < node.text_end {
        let character = source.characters[position];
        number.push(character);
        if fractional {
            scale = scale + 1;
        };
        if character == '.' {
            fractional = true;
        };
        position += 1;
    }
    let layout = numeric_parts(number.as_str());
    let mut first: i32 = 0;
    let mut groups: i32 = 0;
    if layout.sign != 0 {
        first = jsonb_storage_group(layout.weight);
        let mut significant: i32 = 0;
        position = layout.first;
        while position < layout.end {
            if source.characters[node.text_start + position] != '.' {
                significant = significant + 1;
            };
            position += 1;
        }
        let last = jsonb_storage_group(layout.weight - significant + 1);
        groups = first - last + 1;
    };
    let mut header: i64 = 8i64;
    if scale <= 63 && first >= -64 && first <= 63 {
        header = 6i64;
    };
    let size = header + (groups as i64) * 2i64;
    jsonb_storage_bounds(size, size)
}

fn jsonb_storage_layout(source: &JsonbPayload) -> JsonbStorageSize {
    let mut non_ascii: Vec<usize> = Vec::new();
    let mut position: usize = 0;
    while position < source.characters.len() {
        if source.characters[position] as i32 > 127 {
            non_ascii.push(position);
        };
        position += 1;
    }
    let characters = JsonbStorageCharacters {
        non_ascii: non_ascii,
    };
    let mut sizes: Vec<JsonbStorageSize> = Vec::new();
    let mut index: usize = 0;
    while index < source.nodes.len() {
        sizes.push(JsonbStorageSize {
            low: 0i64,
            high: 0i64,
            reachable: false,
        });
        index += 1;
    }
    sizes[source.root] = jsonb_storage_bounds(0i64, 0i64);
    index = 1;
    while index < source.nodes.len() {
        if sizes[index].reachable {
            let mut child = source.nodes[index].child;
            while child > 0 {
                sizes[child] = jsonb_storage_bounds(0i64, 0i64);
                child = source.nodes[child].next;
            }
        };
        index += 1;
    }
    let mut uncertain = false;
    index = source.nodes.len();
    while index > 1 {
        index = index - 1;
        if sizes[index].reachable {
            let node = source.nodes[index];
            let mut size = jsonb_storage_bounds(0i64, 0i64);
            if node.kind == 3 {
                size = jsonb_storage_numeric(source, node);
            } else if node.kind == 4 {
                size = jsonb_storage_span(&characters, node.text_start, node.text_end);
            } else if node.kind >= 5 {
                let mut count: i64 = 0i64;
                let mut keys = jsonb_storage_bounds(0i64, 0i64);
                let mut nonempty: usize = 0;
                let mut unicode = false;
                let mut child = node.child;
                while child > 0 {
                    count = count + 1i64;
                    if node.kind == 6 {
                        let entry = source.nodes[child];
                        let key =
                            jsonb_storage_span(&characters, entry.key_start, entry.key_end);
                        if key.high != key.low {
                            unicode = true;
                        };
                        if entry.key_end > entry.key_start {
                            nonempty += 1;
                        };
                        keys = jsonb_storage_append(keys, key, false, true);
                    };
                    child = source.nodes[child].next;
                }
                let ordered = unicode == false || nonempty <= 1;
                let mut entries: i64 = 4i64;
                if node.kind == 6 {
                    entries = 8i64;
                };
                let header = 4i64 + count * entries;
                size =
                    jsonb_storage_append(jsonb_storage_bounds(header, header), keys, false, true);
                child = node.child;
                while child > 0 {
                    let entry = source.nodes[child];
                    let child_size = sizes[child];
                    let align = entry.kind == 3 || entry.kind >= 5;
                    if entry.kind >= 5 {
                        let padding = jsonb_storage_padding(size, ordered);
                        let total = jsonb_storage_bounds(
                            child_size.low + padding.low,
                            child_size.high + padding.high,
                        );
                        let decision = jsonb_storage_decision(total);
                        if let BoolValue::Error(_) = decision {
                            return jsonb_storage_bounds(
                                JSONB_STORAGE_LIMIT + 1i64,
                                JSONB_STORAGE_LIMIT + 1i64,
                            );
                        };
                        if let BoolValue::Unknown = decision {
                            uncertain = true;
                        };
                    };
                    size = jsonb_storage_append(size, child_size, align, ordered);
                    child = entry.next;
                }
                let decision = jsonb_storage_decision(size);
                if let BoolValue::Error(_) = decision {
                    return jsonb_storage_bounds(
                        JSONB_STORAGE_LIMIT + 1i64,
                        JSONB_STORAGE_LIMIT + 1i64,
                    );
                };
                if let BoolValue::Unknown = decision {
                    uncertain = true;
                };
            };
            sizes[index] = size;
        };
    }
    let mut root = sizes[source.root];
    if source.nodes[source.root].kind < 5 {
        root = jsonb_storage_append(jsonb_storage_bounds(8i64, 8i64), root, false, true);
    };
    if uncertain && root.high <= JSONB_STORAGE_LIMIT {
        root = jsonb_storage_bounds(root.low, JSONB_STORAGE_LIMIT + 1i64);
    };
    root
}

fn jsonb_storage_admission(source: &JsonbPayload) -> BoolValue {
    jsonb_storage_decision(jsonb_storage_layout(source))
}
