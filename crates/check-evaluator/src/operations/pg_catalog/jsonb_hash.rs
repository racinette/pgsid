#[derive(Clone, Copy)]
struct JsonbHashFrame {
    node: usize,
    key: bool,
}

fn jsonb_hash_scalar(
    source: &JsonbPayload,
    node: JsonbNode,
    key: bool,
    seed: i64,
    byte_order: i32,
    utf8: bool,
    extended: bool,
) -> Int8Value {
    if key || node.kind == 4 {
        let mut text = String::new();
        let mut start = node.text_start;
        let mut end = node.text_end;
        if key {
            start = node.key_start;
            end = node.key_end;
        };
        while start < end {
            text.push(source.characters[start]);
            start += 1;
        }
        let input = TextValue::Value(text);
        if extended {
            return text_hash_extended(input, Int8Value::Value(seed), false, byte_order, utf8);
        };
        let hash = text_hash_value(input, false, byte_order, utf8);
        return sql__pg_catalog__int8__mzac(hash);
    };
    if node.kind == 3 {
        let number = jsonb_relation_number(source, node);
        if extended {
            return sql__pg_catalog__hash_numeric_extended__oglu(
                number,
                Int8Value::Value(seed),
                byte_order,
            );
        };
        let hash = sql__pg_catalog__hash_numeric__0e7w(number, byte_order);
        return sql__pg_catalog__int8__mzac(hash);
    };
    if node.kind == 0 {
        if extended {
            if seed == 9223372036854775807i64 {
                return Int8Value::Value(-9223372036854775808i64);
            };
            return Int8Value::Value(seed + 1i64);
        };
        return Int8Value::Value(1i64);
    };
    if node.kind == 1 || node.kind == 2 {
        if extended && seed != 0i64 {
            let mut value: i32 = 0;
            if node.kind == 2 {
                value = 1;
            };
            return sql__pg_catalog__hashcharextended__uyia(
                InternalCharValue::Value(value),
                Int8Value::Value(seed),
            );
        };
        if node.kind == 2 {
            return Int8Value::Value(2i64);
        };
        return Int8Value::Value(4i64);
    };
    Int8Value::Unknown
}

fn jsonb_hash_payload(
    source: &JsonbPayload,
    seed: i64,
    byte_order: i32,
    utf8: bool,
    extended: bool,
) -> Int8Value {
    let root = source.nodes[source.root];
    if root.kind >= 5 && root.child == 0 {
        if extended {
            return Int8Value::Value(seed);
        };
        return Int8Value::Value(0i64);
    };
    let mut low: i64 = 0i64;
    let mut high: i64 = 0i64;
    if root.kind < 5 {
        low = 1073741824i64;
        if extended {
            high = low;
        };
    };
    let mut frames: Vec<JsonbHashFrame> = Vec::new();
    frames.push(JsonbHashFrame {
        node: source.root,
        key: false,
    });
    let mut depth: usize = 1;
    while depth > 0 {
        depth = depth - 1;
        let frame = frames[depth];
        let node = source.nodes[frame.node];
        if frame.key == false && node.kind >= 5 {
            let mut flag: i64 = 1073741824i64;
            if node.kind == 6 {
                flag = 536870912i64;
            };
            low = hash_xor(low, flag);
            if extended {
                high = hash_xor(high, flag);
            };
            let children = jsonb_order_children(source, node);
            let mut index = children.len();
            while index > 0 {
                index = index - 1;
                let value_frame = JsonbHashFrame {
                    node: children[index],
                    key: false,
                };
                if depth == frames.len() {
                    frames.push(value_frame);
                } else {
                    frames[depth] = value_frame;
                };
                depth += 1;
                if node.kind == 6 {
                    let key_frame = JsonbHashFrame {
                        node: children[index],
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
        } else {
            let scalar =
                jsonb_hash_scalar(source, node, frame.key, seed, byte_order, utf8, extended);
            if let Int8Value::Error(error) = scalar {
                return Int8Value::Error(error);
            };
            if scalar == Int8Value::Unknown || scalar == Int8Value::Null {
                return Int8Value::Unknown;
            };
            if let Int8Value::Value(bits) = scalar {
                let mut scalar_low = bits % 4294967296i64;
                if scalar_low < 0i64 {
                    scalar_low = scalar_low + 4294967296i64;
                };
                low = low * 2i64 % 4294967296i64 + low / 2147483648i64;
                low = hash_xor(low, scalar_low);
                if extended {
                    let mut scalar_high = (bits - scalar_low) / 4294967296i64;
                    if scalar_high < 0i64 {
                        scalar_high = scalar_high + 4294967296i64;
                    };
                    high = high * 2i64 % 4294967296i64 + high / 2147483648i64;
                    high = hash_xor(high, scalar_high);
                };
            };
        };
    }
    if high >= 2147483648i64 {
        high = high - 4294967296i64;
    };
    Int8Value::Value(high * 4294967296i64 + low)
}

fn jsonb_hash_context(
    input: JsonbValue,
    seed: Int8Value,
    byte_order: i32,
    utf8: bool,
    extended: bool,
) -> Int8Value {
    if let JsonbValue::Error(error) = input {
        return Int8Value::Error(error);
    };
    if let Int8Value::Error(error) = seed {
        return Int8Value::Error(error);
    };
    if let JsonbValue::Unknown = input {
        return Int8Value::Unknown;
    };
    if seed == Int8Value::Unknown {
        return Int8Value::Unknown;
    };
    if let JsonbValue::Null = input {
        return Int8Value::Null;
    };
    if seed == Int8Value::Null {
        return Int8Value::Null;
    };
    if let JsonbValue::Value(value) = input {
        if let Int8Value::Value(salt) = seed {
            if byte_order == 1 || byte_order == 2 {
                return jsonb_hash_payload(&value, salt, byte_order, utf8, extended);
            };
            let little = jsonb_hash_payload(&value, salt, 1, utf8, extended);
            if little == Int8Value::Unknown {
                return little;
            };
            let big = jsonb_hash_payload(&value, salt, 2, utf8, extended);
            if byte_order == 0 && little == big {
                return little;
            };
        };
    };
    Int8Value::Unknown
}

pub fn sql__pg_catalog__jsonb_hash__qo2a(
    input: JsonbValue,
    byte_order: i32,
    utf8: bool,
) -> Int4Value {
    let result = jsonb_hash_context(input, Int8Value::Value(0i64), byte_order, utf8, false);
    if let Int8Value::Error(error) = result {
        return Int4Value::Error(error);
    };
    if result == Int8Value::Null {
        return Int4Value::Null;
    };
    if let Int8Value::Value(value) = result {
        return Int4Value::Value(value as i32);
    };
    Int4Value::Unknown
}

pub fn sql__pg_catalog__jsonb_hash_extended__h75l(
    input: JsonbValue,
    seed: Int8Value,
    byte_order: i32,
    utf8: bool,
) -> Int8Value {
    jsonb_hash_context(input, seed, byte_order, utf8, true)
}
