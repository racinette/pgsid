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
    utf8_extra: Vec<usize>,
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
    utf8: bool,
) -> JsonbStorageSize {
    let length = (end - begin) as i32;
    let first = jsonb_storage_unicode_before(source, begin);
    let last = jsonb_storage_unicode_before(source, end);
    let unicode = (last - first) as i32;
    let low = length as i64;
    if utf8 {
        let extra = source.utf8_extra[last] - source.utf8_extra[first];
        let bytes = low + (extra as i32) as i64;
        return jsonb_storage_bounds(bytes, bytes);
    };
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

fn jsonb_storage_character_index(source: &JsonbPayload) -> JsonbStorageCharacters {
    let mut non_ascii: Vec<usize> = Vec::new();
    let mut utf8_extra: Vec<usize> = Vec::new();
    let mut total_extra: usize = 0;
    utf8_extra.push(0);
    let mut position: usize = 0;
    while position < source.characters.len() {
        if source.characters[position] as i32 > 127 {
            non_ascii.push(position);
            let character = source.characters[position] as i32;
            total_extra += 1;
            if character >= 2048 {
                total_extra += 1;
            };
            if character >= 65536 {
                total_extra += 1;
            };
            utf8_extra.push(total_extra);
        };
        position += 1;
    }
    JsonbStorageCharacters {
        non_ascii: non_ascii,
        utf8_extra: utf8_extra,
    }
}

fn jsonb_storage_extents(
    source: &JsonbPayload,
    characters: &JsonbStorageCharacters,
    utf8: bool,
) -> Vec<JsonbStorageSize> {
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
                if node.text_start == node.text_end {
                    size = jsonb_storage_bounds(6i64, 16i64);
                } else {
                    size = jsonb_storage_numeric(source, node);
                };
            } else if node.kind == 4 {
                size = jsonb_storage_span(characters, node.text_start, node.text_end, utf8);
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
                            jsonb_storage_span(characters, entry.key_start, entry.key_end, utf8);
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
                let ordered = utf8 || unicode == false || nonempty <= 1;
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
                            sizes[source.root] = jsonb_storage_bounds(
                                JSONB_STORAGE_LIMIT + 1i64,
                                JSONB_STORAGE_LIMIT + 1i64,
                            );
                            return sizes;
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
                    sizes[source.root] = jsonb_storage_bounds(
                        JSONB_STORAGE_LIMIT + 1i64,
                        JSONB_STORAGE_LIMIT + 1i64,
                    );
                    return sizes;
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
    sizes[source.root] = root;
    sizes
}

fn jsonb_storage_layout(source: &JsonbPayload) -> JsonbStorageSize {
    let characters = jsonb_storage_character_index(source);
    let sizes = jsonb_storage_extents(source, &characters, false);
    sizes[source.root]
}

pub fn jsonb_ordered_object_offsets(source: &JsonbPayload, utf8: bool) -> Vec<NumericValue> {
    let characters = jsonb_storage_character_index(source);
    let sizes = jsonb_storage_extents(source, &characters, utf8);
    let mut offsets: Vec<JsonbStorageSize> = Vec::new();
    let mut result: Vec<NumericValue> = Vec::new();
    let mut index: usize = 0;
    while index < source.nodes.len() {
        offsets.push(JsonbStorageSize {
            low: 0i64,
            high: 0i64,
            reachable: false,
        });
        result.push(NumericValue::Unknown);
        index += 1;
    }
    offsets[source.root] = jsonb_storage_bounds(0i64, 0i64);
    index = 1;
    while index < source.nodes.len() {
        let node = source.nodes[index];
        let offset = offsets[index];
        if offset.reachable {
            if node.kind == 6 && offset.low == offset.high {
                result[index] = NumericValue::Value(text_signed_number(offset.low));
            };
            if node.kind >= 5 {
                let mut header: i64 = 4i64;
                let mut keys = jsonb_storage_bounds(0i64, 0i64);
                let mut nonempty: usize = 0;
                let mut unicode = false;
                let mut child = node.child;
                while child > 0 {
                    header = header + 4i64;
                    if node.kind == 6 {
                        header = header + 4i64;
                        let entry = source.nodes[child];
                        if entry.key_end > entry.key_start {
                            nonempty += 1;
                        };
                        let key =
                            jsonb_storage_span(&characters, entry.key_start, entry.key_end, utf8);
                        if key.high != key.low {
                            unicode = true;
                        };
                        keys = jsonb_storage_append(keys, key, false, true);
                    };
                    child = source.nodes[child].next;
                }
                let ordered = utf8 || unicode == false || nonempty <= 1;
                let mut current = jsonb_storage_bounds(header + keys.low, header + keys.high);
                child = node.child;
                while child > 0 {
                    let entry = source.nodes[child];
                    let aligned = entry.kind == 3 || entry.kind >= 5;
                    let mut begin = current;
                    if aligned {
                        if ordered {
                            begin = jsonb_storage_bounds(
                                jsonb_storage_aligned(current.low),
                                jsonb_storage_aligned(current.high),
                            );
                        } else {
                            begin = jsonb_storage_bounds(current.low, current.high + 3i64);
                        };
                    };
                    if ordered {
                        offsets[child] =
                            jsonb_storage_bounds(offset.low + begin.low, offset.high + begin.high);
                    } else {
                        offsets[child] = jsonb_storage_bounds(
                            offset.low + header + keys.low,
                            offset.high + sizes[index].high,
                        );
                    };
                    current = jsonb_storage_append(current, sizes[child], aligned, ordered);
                    child = entry.next;
                }
            };
        };
        index += 1;
    }
    result
}

pub fn jsonb_storage_admission(source: &JsonbPayload) -> BoolValue {
    jsonb_storage_decision(jsonb_storage_layout(source))
}

pub fn jsonb_partial_add(current: i64, extra: i64) -> i64 {
    if current < 0i64
        || extra < 0i64
        || current > JSONB_STORAGE_LIMIT
        || extra > JSONB_STORAGE_LIMIT
    {
        return JSONB_STORAGE_LIMIT + 1i64;
    };
    let total = current + extra;
    if total > JSONB_STORAGE_LIMIT {
        return JSONB_STORAGE_LIMIT + 1i64;
    };
    total
}

pub fn jsonb_partial_scalar_bound() -> i64 {
    131072i64 + 16383i64 + 16i64
}

pub fn jsonb_partial_value(maximum: i64) -> JsonbValue {
    jsonb_partial_shape(maximum, -1, -1)
}

pub fn jsonb_partial_shape(maximum: i64, kind: i32, length: i32) -> JsonbValue {
    if maximum < 0i64 || maximum > JSONB_STORAGE_LIMIT {
        return JsonbValue::Unknown;
    };
    JsonbValue::NonNull(JsonbKnowledge {
        maximum: maximum,
        kind: kind,
        length: length,
    })
}

pub fn jsonb_partial_bound(value: &JsonbPayload) -> i64 {
    let mut maximum = 16i64;
    let mut index: usize = 0;
    while index < value.characters.len() {
        maximum = jsonb_partial_add(maximum, 6i64);
        index += 1;
    }
    index = 0;
    while index < value.nodes.len() {
        maximum = jsonb_partial_add(maximum, 16i64);
        index += 1;
    }
    let storage = jsonb_storage_layout(value);
    if storage.high > maximum {
        maximum = storage.high;
    };
    jsonb_partial_add(0i64, maximum)
}
