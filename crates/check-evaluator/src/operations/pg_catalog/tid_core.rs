fn tid_compare(left: TidValue, right: TidValue) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let TidValue::Unknown = left { unresolved_flavor = 1; };
    if let TidValue::Unknown = right { unresolved_flavor = 1; };
    if let TidValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TidValue::Unimplemented = right { unresolved_flavor = 2; };
    if let TidValue::Error(error) = left {
        return Int4Value::Error(error);
    };
    if let TidValue::Error(error) = right {
        return Int4Value::Error(error);
    };
    let mut condition_flavor_13_4: i32 = unresolved_flavor; if let TidValue::Unknown = left { if condition_flavor_13_4 < 1 { condition_flavor_13_4 = 1; }; }; if let TidValue::Unimplemented = left { condition_flavor_13_4 = 2; }; if let TidValue::Unknown = right { if condition_flavor_13_4 < 1 { condition_flavor_13_4 = 1; }; }; if let TidValue::Unimplemented = right { condition_flavor_13_4 = 2; }; if (left == TidValue::Unknown || left == TidValue::Unimplemented) || (right == TidValue::Unknown || right == TidValue::Unimplemented) {
        return int4_unresolved(condition_flavor_13_4);
    };
    if left == TidValue::Null || right == TidValue::Null {
        return Int4Value::Null;
    };
    if let TidValue::Value(a) = left {
        if let TidValue::Value(b) = right {
            if a < b {
                return Int4Value::Value(-1);
            };
            if a > b {
                return Int4Value::Value(1);
            };
            return Int4Value::Value(0);
        };
    };
    int4_unresolved(unresolved_flavor)
}
fn tid_relation(left: TidValue, right: TidValue, mode: i32) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TidValue::Unknown = left { unresolved_flavor = 1; };
    if let TidValue::Unknown = right { unresolved_flavor = 1; };
    if let TidValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TidValue::Unimplemented = right { unresolved_flavor = 2; };
    let comparison = tid_compare(left, right);
    if let Int4Value::Error(error) = comparison {
        return BoolValue::Error(error);
    };
    if comparison == Int4Value::Null {
        return BoolValue::Null;
    };
    if let Int4Value::Value(order) = comparison {
        if mode == 0 {
            return make_bool_value(order == 0);
        };
        if mode == 1 {
            return make_bool_value(order != 0);
        };
        if mode == 2 {
            return make_bool_value(order < 0);
        };
        if mode == 3 {
            return make_bool_value(order <= 0);
        };
        if mode == 4 {
            return make_bool_value(order > 0);
        };
        return make_bool_value(order >= 0);
    };
    bool_unresolved(unresolved_flavor)
}
fn tid_select(left: TidValue, right: TidValue, larger: bool) -> TidValue {
    let mut unresolved_flavor: i32 = 0;
    if let TidValue::Unknown = left { unresolved_flavor = 1; };
    if let TidValue::Unknown = right { unresolved_flavor = 1; };
    if let TidValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TidValue::Unimplemented = right { unresolved_flavor = 2; };
    let comparison = tid_compare(left, right);
    if let Int4Value::Error(error) = comparison {
        return TidValue::Error(error);
    };
    if comparison == Int4Value::Null {
        return TidValue::Null;
    };
    if let Int4Value::Value(order) = comparison {
        if (larger && order > 0) || (larger == false && order < 0) {
            return left;
        };
        return right;
    };
    tid_unresolved(unresolved_flavor)
}


pub fn tid_to_text(input: TidValue) -> TextValue {
    let mut unresolved_flavor: i32 = 0;
    if let TidValue::Unknown = input { unresolved_flavor = 1; };
    if let TidValue::Unimplemented = input { unresolved_flavor = 2; };
    if let TidValue::Error(error) = input { return TextValue::Error(error); };
    if input == TidValue::Null { return TextValue::Null; };
    if let TidValue::Value(value) = input {
        let mut output = String::new();
        output.push('(');
        output.push_str(text_signed_number(value / 65536i64).as_str());
        output.push(',');
        output.push_str(text_signed_number(value % 65536i64).as_str());
        output.push(')');
        return TextValue::Value(output);
    };
    text_unresolved(unresolved_flavor)
}
fn tid_send(input: TidValue) -> ByteaValue {
    let mut unresolved_flavor: i32 = 0;
    if let TidValue::Unknown = input { unresolved_flavor = 1; };
    if let TidValue::Unimplemented = input { unresolved_flavor = 2; };
    if let TidValue::Error(error) = input { return ByteaValue::Error(error); };
    if input == TidValue::Null { return ByteaValue::Null; };
    if let TidValue::Value(value) = input {
        let mut place = 1099511627776i64;
        let mut output = String::new();
        while place > 0i64 {
            let byte = (value / place % 256i64) as i32;
            output = bytea_append_byte(output, byte);
            place = place / 256i64;
        };
        return ByteaValue::Value(output);
    };
    bytea_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__tidsend__o4ql(left: TidValue) -> ByteaValue {
    tid_send(left)
}

pub fn sql__pg_catalog__bttidcmp__ak5t(left: TidValue, right: TidValue) -> Int4Value {
    tid_compare(left, right)
}

fn tid_hash_bytes(value: i64) -> Vec<HashByte> {
    let block = value / 65536i64;
    let high = block / 65536i64;
    let low = block % 65536i64;
    let offset = value % 65536i64;
    let mut bytes: Vec<HashByte> = Vec::new();
    bytes.push(HashByte { value: high % 256i64 });
    bytes.push(HashByte { value: high / 256i64 });
    bytes.push(HashByte { value: low % 256i64 });
    bytes.push(HashByte { value: low / 256i64 });
    bytes.push(HashByte { value: offset % 256i64 });
    bytes.push(HashByte { value: offset / 256i64 });
    bytes
}
pub fn sql__pg_catalog__hashtid__li7j(left: TidValue, byte_order: i32) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let TidValue::Unknown = left { unresolved_flavor = 1; };
    if let TidValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TidValue::Error(error) = left {
        return Int4Value::Error(error);
    };
    if left == TidValue::Null {
        return Int4Value::Null;
    };
    if let TidValue::Value(value) = left {
        let bytes = tid_hash_bytes(value);
        return hash_native32(bytes, byte_order, 2);
    };
    int4_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__hashtidextended__osxq(
    left: TidValue,
    right: Int8Value,
    byte_order: i32,
) -> Int8Value {
    let mut unresolved_flavor: i32 = 0;
    if let TidValue::Unknown = left { unresolved_flavor = 1; };
    if let Int8Value::Unknown = right { unresolved_flavor = 1; };
    if let TidValue::Unimplemented = left { unresolved_flavor = 2; };
    if let Int8Value::Unimplemented = right { unresolved_flavor = 2; };
    if let TidValue::Error(error) = left {
        return Int8Value::Error(error);
    };
    if let Int8Value::Error(error) = right {
        return Int8Value::Error(error);
    };
    let mut condition_flavor_179_4: i32 = unresolved_flavor; if let TidValue::Unknown = left { if condition_flavor_179_4 < 1 { condition_flavor_179_4 = 1; }; }; if let TidValue::Unimplemented = left { condition_flavor_179_4 = 2; }; if let Int8Value::Unknown = right { if condition_flavor_179_4 < 1 { condition_flavor_179_4 = 1; }; }; if let Int8Value::Unimplemented = right { condition_flavor_179_4 = 2; }; if (left == TidValue::Unknown || left == TidValue::Unimplemented) || (right == Int8Value::Unknown || right == Int8Value::Unimplemented) {
        return int8_unresolved(condition_flavor_179_4);
    };
    if left == TidValue::Null || right == Int8Value::Null {
        return Int8Value::Null;
    };
    if let TidValue::Value(value) = left {
        if let Int8Value::Value(seed) = right {
            let bytes = tid_hash_bytes(value);
            return hash_native64(bytes, seed, byte_order, 2);
        };
    };
    int8_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__tideq__ba7v(left: TidValue, right: TidValue) -> BoolValue {
    tid_relation(left, right, 0)
}

pub fn sql__pg_catalog__tidge__3r7u(left: TidValue, right: TidValue) -> BoolValue {
    tid_relation(left, right, 5)
}

pub fn sql__pg_catalog__tidgt__2wvy(left: TidValue, right: TidValue) -> BoolValue {
    tid_relation(left, right, 4)
}

pub fn sql__pg_catalog__tidlarger__zk24(left: TidValue, right: TidValue) -> TidValue {
    tid_select(left, right, true)
}

pub fn sql__pg_catalog__tidle__ny8u(left: TidValue, right: TidValue) -> BoolValue {
    tid_relation(left, right, 3)
}

pub fn sql__pg_catalog__tidlt__am0j(left: TidValue, right: TidValue) -> BoolValue {
    tid_relation(left, right, 2)
}

pub fn sql__pg_catalog__tidne__wafx(left: TidValue, right: TidValue) -> BoolValue {
    tid_relation(left, right, 1)
}

pub fn sql__pg_catalog__tidsmaller__k6of(left: TidValue, right: TidValue) -> TidValue {
    tid_select(left, right, false)
}
