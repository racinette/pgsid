pub fn sql__pg_catalog__byteaeq__z0yh(left: ByteaValue, right: ByteaValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let ByteaValue::Unknown = left { unresolved_flavor = 1; };
    if let ByteaValue::Unknown = right { unresolved_flavor = 1; };
    if let ByteaValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let ByteaValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == ByteaValue::Unknown || right == ByteaValue::Unknown {
        return bool_unresolved(unresolved_flavor);
    }
    if left == ByteaValue::Null || right == ByteaValue::Null {
        return BoolValue::Null;
    }
    let left_length = bytea_length(left.clone());
    let right_length = bytea_length(right.clone());
    if let Int4Value::Value(a) = left_length {
        if let Int4Value::Value(b) = right_length {
            if a != b { return make_bool_value(false); };
            if a == 0 { return make_bool_value(true); };
        };
    };
    if let ByteaValue::Value(a) = left {
        if let ByteaValue::Value(b) = right {
            return BoolValue::Value(a == b);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__byteane__volo(left: ByteaValue, right: ByteaValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let ByteaValue::Unknown = left { unresolved_flavor = 1; };
    if let ByteaValue::Unknown = right { unresolved_flavor = 1; };
    if let ByteaValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let ByteaValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == ByteaValue::Unknown || right == ByteaValue::Unknown {
        return bool_unresolved(unresolved_flavor);
    }
    if left == ByteaValue::Null || right == ByteaValue::Null {
        return BoolValue::Null;
    }
    let left_length = bytea_length(left.clone());
    let right_length = bytea_length(right.clone());
    if let Int4Value::Value(a) = left_length {
        if let Int4Value::Value(b) = right_length {
            if a != b { return make_bool_value(true); };
            if a == 0 { return make_bool_value(false); };
        };
    };
    if let ByteaValue::Value(a) = left {
        if let ByteaValue::Value(b) = right {
            return BoolValue::Value(a != b);
        }
    }
    bool_unresolved(unresolved_flavor)
}

pub fn text_wire_context(input: TextValue, utf8: bool) -> ByteaValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = input { unresolved_flavor = 1; };
    if let TextValue::Error(error) = input { return ByteaValue::Error(error); };
    if input == TextValue::Null { return ByteaValue::Null; };
    if let TextValue::Value(value) = input {
        let chars: Vec<char> = value.chars().collect();
        let mut index: usize = 0;
        while index < chars.len() {
            let code = chars[index] as i32;
            if code == 0 || (utf8 == false && code > 127) { return bytea_unresolved(unresolved_flavor); };
            index += 1;
        }
        return ByteaValue::Value(text_binary_hex(value.as_str(), false));
    };
    bytea_unresolved(unresolved_flavor)
}

fn text_wire_without_context(input: TextValue) -> ByteaValue {
    text_wire_context(input, false)
}

pub fn sql__pg_catalog__textsend__mgfj(input: TextValue) -> ByteaValue {
    text_wire_without_context(input)
}


pub fn sql__pg_catalog__varcharsend__jov8(input: TextValue) -> ByteaValue {
    text_wire_without_context(input)
}

pub fn sql__pg_catalog__bpcharsend__h9zn(input: TextValue) -> ByteaValue {
    text_wire_without_context(input)
}
