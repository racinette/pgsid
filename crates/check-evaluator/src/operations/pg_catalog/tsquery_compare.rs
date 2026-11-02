#[derive(Clone, Copy)]
struct TsqueryCompareFrame { left: usize, right: usize, finish: bool }

fn tsquery_ascii(text: &str) -> bool {
    let chars: Vec<char> = text.chars().collect();
    let mut index: usize = 0;
    while index < chars.len() {
        if (chars[index] as i32) > 127 { return false; };
        index += 1;
    }
    true
}

fn tsquery_legacy_crc(text: &str) -> i32 {
    let chars: Vec<char> = text.chars().collect();
    let mut wire = String::new();
    let mut index: usize = 0;
    while index < chars.len() { wire = bytea_utf8_character(wire,chars[index]); index += 1; }
    let bytes = bytea_hash_bytes(wire.as_str());
    let mut crc: i64 = 4294967295i64;
    index = 0;
    while index < bytes.len() {
        let mut table = hash_xor(crc / 16777216i64,bytes[index].value);
        let mut bit: i32 = 0;
        while bit < 8 {
            let low = table % 2i64;
            table = table / 2i64;
            if low == 1i64 { table = hash_xor(table,3988292384i64); };
            bit = bit + 1;
        }
        crc = hash_xor(table,crc * 256i64 % 4294967296i64);
        index += 1;
    }
    let mut result = 4294967295i64 - crc;
    if result > 2147483647i64 { result = result - 4294967296i64; };
    result as i32
}

fn tsquery_compare(left: TsqueryValue, right: TsqueryValue, utf8: bool, exact: bool) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let TsqueryValue::Unknown = left { unresolved_flavor = 1; };
    if let TsqueryValue::Unknown = right { unresolved_flavor = 1; };
    if let TsqueryValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TsqueryValue::Unimplemented = right { unresolved_flavor = 2; };
    if let TsqueryValue::Error(error) = left { return Int4Value::Error(error); };
    if let TsqueryValue::Error(error) = right { return Int4Value::Error(error); };
    let mut condition_flavor_47_4: i32 = unresolved_flavor; if let TsqueryValue::Unknown = left { if condition_flavor_47_4 < 1 { condition_flavor_47_4 = 1; }; }; if let TsqueryValue::Unknown = left { return int4_unresolved(condition_flavor_47_4); }; let mut condition_flavor_47_88: i32 = unresolved_flavor; if let TsqueryValue::Unimplemented = left { condition_flavor_47_88 = 2; }; if let TsqueryValue::Unimplemented = left { return int4_unresolved(condition_flavor_47_88); };
    let mut condition_flavor_48_4: i32 = unresolved_flavor; if let TsqueryValue::Unknown = right { if condition_flavor_48_4 < 1 { condition_flavor_48_4 = 1; }; }; if let TsqueryValue::Unknown = right { return int4_unresolved(condition_flavor_48_4); }; let mut condition_flavor_48_89: i32 = unresolved_flavor; if let TsqueryValue::Unimplemented = right { condition_flavor_48_89 = 2; }; if let TsqueryValue::Unimplemented = right { return int4_unresolved(condition_flavor_48_89); };
    if let TsqueryValue::Null = left { return Int4Value::Null; };
    if let TsqueryValue::Null = right { return Int4Value::Null; };
    if let TsqueryValue::Value(a) = left {
        if let TsqueryValue::Value(b) = right {
            if a.nodes.len() < b.nodes.len() { return make_int4_value(-1); };
            if a.nodes.len() > b.nodes.len() { return make_int4_value(1); };
            // A stored size the caller did not supply follows from how the value was produced.
            if a.native_bytes < 0 || b.native_bytes < 0 { return int4_unresolved(resolution_context(unresolved_flavor)); };
            if a.native_bytes < b.native_bytes { return make_int4_value(-1); };
            if a.native_bytes > b.native_bytes { return make_int4_value(1); };
            if a.nodes.len() == 0 { return make_int4_value(0); };
            let mut frames: Vec<TsqueryCompareFrame> = Vec::new();
            frames.push(TsqueryCompareFrame {left:a.root,right:b.root,finish:false});
            let mut depth: usize = 1;
            while depth > 0 {
                depth = depth - 1;
                let frame = frames[depth];
                let an = a.nodes[frame.left].clone();
                let bn = b.nodes[frame.right].clone();
                if frame.finish {
                    if an.distance > bn.distance { return make_int4_value(-1); };
                    if an.distance < bn.distance { return make_int4_value(1); };
                } else {
                    if an.kind > bn.kind { return make_int4_value(-1); };
                    if an.kind < bn.kind { return make_int4_value(1); };
                    if an.kind == 0 {
                        if an.text != bn.text {
                            if utf8 == false && (tsquery_ascii(an.text.as_str()) == false || tsquery_ascii(bn.text.as_str()) == false) { return int4_unresolved(resolution_context(unresolved_flavor)); };
                            let ac = tsquery_legacy_crc(an.text.as_str());
                            let bc = tsquery_legacy_crc(bn.text.as_str());
                            if ac > bc { return make_int4_value(-1); };
                            if ac < bc { return make_int4_value(1); };
                            let order = tsvector_lexeme_order(an.text.as_str(),bn.text.as_str());
                            // Without a prefix relation the exact result is the server memcmp magnitude.
                            if exact && order != 0 && text_has_prefix(an.text.as_str(),bn.text.as_str()) == false && text_has_prefix(bn.text.as_str(),an.text.as_str()) == false { return int4_unresolved(resolution_context(unresolved_flavor)); };
                            return make_int4_value(order);
                        };
                    } else {
                        if an.kind == 4 {
                            let finish = TsqueryCompareFrame {left:frame.left,right:frame.right,finish:true};
                            if depth < frames.len() { frames[depth] = finish; } else { frames.push(finish); };
                            depth += 1;
                        };
                        let first = TsqueryCompareFrame {left:an.left,right:bn.left,finish:false};
                        if depth < frames.len() { frames[depth] = first; } else { frames.push(first); };
                        depth += 1;
                        if an.kind != 1 {
                            let second = TsqueryCompareFrame {left:an.right,right:bn.right,finish:false};
                            if depth < frames.len() { frames[depth] = second; } else { frames.push(second); };
                            depth += 1;
                        };
                    };
                };
            }
            return make_int4_value(0);
        };
    };
    int4_unresolved(unresolved_flavor)
}

pub fn tsquery_order(left: TsqueryValue, right: TsqueryValue, utf8: bool) -> Int4Value { tsquery_compare(left,right,utf8,false) }
pub fn sql__pg_catalog__tsquery_cmp__1oet(left: TsqueryValue, right: TsqueryValue, utf8: bool) -> Int4Value { tsquery_compare(left,right,utf8,true) }

fn tsquery_relation(left: TsqueryValue, right: TsqueryValue, utf8: bool, mode: i32) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TsqueryValue::Unknown = left { unresolved_flavor = 1; };
    if let TsqueryValue::Unknown = right { unresolved_flavor = 1; };
    if let TsqueryValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TsqueryValue::Unimplemented = right { unresolved_flavor = 2; };
    let order = tsquery_compare(left,right,utf8,false);
    if let Int4Value::Error(error) = order { return BoolValue::Error(error); };
    if let Int4Value::Null = order { return BoolValue::Null; };
    if let Int4Value::Value(value) = order {
        if mode == 0 { return make_bool_value(value == 0); };
        if mode == 1 { return make_bool_value(value != 0); };
        if mode == 2 { return make_bool_value(value < 0); };
        if mode == 3 { return make_bool_value(value <= 0); };
        if mode == 4 { return make_bool_value(value > 0); };
        return make_bool_value(value >= 0);
    };
    let mut local_flavor_127_4: i32 = unresolved_flavor; if let Int4Value::Unknown = order { if local_flavor_127_4 < 1 { local_flavor_127_4 = 1; }; }; if let Int4Value::Unimplemented = order { local_flavor_127_4 = 2; }; bool_unresolved(local_flavor_127_4)
}
pub fn sql__pg_catalog__tsquery_eq__d4ao(a: TsqueryValue,b: TsqueryValue,utf8: bool)->BoolValue { tsquery_relation(a,b,utf8,0) }
pub fn sql__pg_catalog__tsquery_ne__2lq4(a: TsqueryValue,b: TsqueryValue,utf8: bool)->BoolValue { tsquery_relation(a,b,utf8,1) }
pub fn sql__pg_catalog__tsquery_lt__zocf(a: TsqueryValue,b: TsqueryValue,utf8: bool)->BoolValue { tsquery_relation(a,b,utf8,2) }
pub fn sql__pg_catalog__tsquery_le__3i4m(a: TsqueryValue,b: TsqueryValue,utf8: bool)->BoolValue { tsquery_relation(a,b,utf8,3) }
pub fn sql__pg_catalog__tsquery_gt__6cq7(a: TsqueryValue,b: TsqueryValue,utf8: bool)->BoolValue { tsquery_relation(a,b,utf8,4) }
pub fn sql__pg_catalog__tsquery_ge__0jdt(a: TsqueryValue,b: TsqueryValue,utf8: bool)->BoolValue { tsquery_relation(a,b,utf8,5) }

fn tsquery_contains(left: TsqueryValue,right: TsqueryValue,reverse: bool)->BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TsqueryValue::Unknown = left { unresolved_flavor = 1; };
    if let TsqueryValue::Unknown = right { unresolved_flavor = 1; };
    if let TsqueryValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TsqueryValue::Unimplemented = right { unresolved_flavor = 2; };
    if let TsqueryValue::Error(error) = left { return BoolValue::Error(error); };
    if let TsqueryValue::Error(error) = right { return BoolValue::Error(error); };
    let mut condition_flavor_144_4: i32 = unresolved_flavor; if let TsqueryValue::Unknown = left { if condition_flavor_144_4 < 1 { condition_flavor_144_4 = 1; }; }; if let TsqueryValue::Unknown = left { return bool_unresolved(condition_flavor_144_4); }; let mut condition_flavor_144_88: i32 = unresolved_flavor; if let TsqueryValue::Unimplemented = left { condition_flavor_144_88 = 2; }; if let TsqueryValue::Unimplemented = left { return bool_unresolved(condition_flavor_144_88); };
    let mut condition_flavor_145_4: i32 = unresolved_flavor; if let TsqueryValue::Unknown = right { if condition_flavor_145_4 < 1 { condition_flavor_145_4 = 1; }; }; if let TsqueryValue::Unknown = right { return bool_unresolved(condition_flavor_145_4); }; let mut condition_flavor_145_89: i32 = unresolved_flavor; if let TsqueryValue::Unimplemented = right { condition_flavor_145_89 = 2; }; if let TsqueryValue::Unimplemented = right { return bool_unresolved(condition_flavor_145_89); };
    if let TsqueryValue::Null = left { return BoolValue::Null; };
    if let TsqueryValue::Null = right { return BoolValue::Null; };
    if let TsqueryValue::Value(a) = left {
        if let TsqueryValue::Value(b) = right {
            let mut haystack = a;
            let mut needles = b;
            if reverse { let saved = haystack; haystack = needles; needles = saved; };
            let mut i: usize = 0;
            while i < needles.nodes.len() {
                if needles.nodes[i].kind == 0 {
                    let mut found = false;
                    let mut j: usize = 0;
                    while j < haystack.nodes.len() {
                        if haystack.nodes[j].kind == 0 && needles.nodes[i].text == haystack.nodes[j].text { found = true; break; };
                        j += 1;
                    }
                    if found == false { return make_bool_value(false); };
                };
                i += 1;
            }
            return make_bool_value(true);
        };
    };
    bool_unresolved(unresolved_flavor)
}
pub fn sql__pg_catalog__tsq_mcontains__d21x(a: TsqueryValue,b: TsqueryValue)->BoolValue { tsquery_contains(a,b,false) }
pub fn sql__pg_catalog__tsq_mcontained__4g5m(a: TsqueryValue,b: TsqueryValue)->BoolValue { tsquery_contains(a,b,true) }
