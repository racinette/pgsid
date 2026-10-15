pub fn sql__pg_catalog__byteaeq__z0yh(left: ByteaValue, right: ByteaValue) -> BoolValue {
    if let ByteaValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let ByteaValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == ByteaValue::Unknown || right == ByteaValue::Unknown {
        return BoolValue::Unknown;
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
    BoolValue::Unknown
}

pub fn sql__pg_catalog__byteane__volo(left: ByteaValue, right: ByteaValue) -> BoolValue {
    if let ByteaValue::Error(error) = left {
        return BoolValue::Error(error);
    }
    if let ByteaValue::Error(error) = right {
        return BoolValue::Error(error);
    }
    if left == ByteaValue::Unknown || right == ByteaValue::Unknown {
        return BoolValue::Unknown;
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
    BoolValue::Unknown
}

fn text_wire_without_context(input: TextValue) -> ByteaValue {
    if let TextValue::Error(error) = input { return ByteaValue::Error(error); };
    if input == TextValue::Null { return ByteaValue::Null; };
    if let TextValue::Value(value) = input {
        let chars: Vec<char> = value.chars().collect();
        let mut index: usize = 0;
        while index < chars.len() {
            let code = chars[index] as i32;
            if code == 0 || code > 127 { return ByteaValue::Unknown; };
            index += 1;
        }
        return ByteaValue::Value(text_binary_hex(value.as_str(), false));
    };
    ByteaValue::Unknown
}

pub fn sql__pg_catalog__textsend__mgfj(input: TextValue) -> ByteaValue {
    text_wire_without_context(input)
}
