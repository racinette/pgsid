const SNAPSHOT_SIZE_ERROR: u32 = 8584704;
fn snapshot_text_append_fits(current: usize, digits: usize, separator: bool) -> bool {
    if current > 1073741807 {
        return false;
    };
    let mut position = current;
    if separator {
        position += 1;
    };
    if position > 1073741807 {
        return false;
    };
    digits <= 1073741822 - position
}
pub fn snapshot_to_text(input: SnapshotValue) -> TextValue {
    if let SnapshotValue::Error(error) = input {
        return TextValue::Error(error);
    };
    if let SnapshotValue::Null = input {
        return TextValue::Null;
    };
    if let SnapshotValue::Value(payload) = input {
        let mut output = String::new();
        let mut length: usize = 2;
        let xmin_text = xid8_to_text(make_xid8_bits(payload.xmin));
        if let TextValue::Value(text) = xmin_text {
            let chars: Vec<char> = text.chars().collect();
            length += chars.len();
            output.push_str(text.as_str());
        };
        output.push(':');
        let xmax_text = xid8_to_text(make_xid8_bits(payload.xmax));
        if let TextValue::Value(text) = xmax_text {
            let chars: Vec<char> = text.chars().collect();
            length += chars.len();
            output.push_str(text.as_str());
        };
        output.push(':');
        let mut index: usize = 0;
        while index < payload.xip.len() {
            let word_text = xid8_to_text(make_xid8_bits(payload.xip[index].bits));
            if let TextValue::Value(text) = word_text {
                let chars: Vec<char> = text.chars().collect();
                let mut extra = chars.len();
                if index > 0 {
                    extra += 1;
                };
                if snapshot_text_append_fits(length, chars.len(), index > 0) == false {
                    return TextValue::Error(make_sql_error(SNAPSHOT_SIZE_ERROR));
                };
                length += extra;
                if index > 0 {
                    output.push(',');
                };
                output.push_str(text.as_str());
            };
            index += 1;
        }
        return TextValue::Value(output);
    };
    TextValue::Unknown
}
fn snapshot_send(input: SnapshotValue) -> ByteaValue {
    if let SnapshotValue::Error(error) = input {
        return ByteaValue::Error(error);
    };
    if let SnapshotValue::Null = input {
        return ByteaValue::Null;
    };
    if let SnapshotValue::Value(payload) = input {
        let count = payload.xip.len() as i32;
        let mut output = bytea_integer_send(count as i64, 4);
        let xmin_wire = bytea_integer_send(payload.xmin, 8);
        output.push_str(xmin_wire.as_str());
        let xmax_wire = bytea_integer_send(payload.xmax, 8);
        output.push_str(xmax_wire.as_str());
        let mut index: usize = 0;
        while index < payload.xip.len() {
            let word_wire = bytea_integer_send(payload.xip[index].bits, 8);
            output.push_str(word_wire.as_str());
            index += 1;
        }
        return ByteaValue::Value(output);
    };
    ByteaValue::Unknown
}
fn snapshot_bound(input: SnapshotValue, maximum: bool) -> Int8Value {
    if let SnapshotValue::Error(error) = input {
        return Int8Value::Error(error);
    };
    if let SnapshotValue::Null = input {
        return Int8Value::Null;
    };
    if let SnapshotValue::Value(payload) = input {
        if maximum {
            return make_int8_value(payload.xmax);
        };
        return make_int8_value(payload.xmin);
    };
    Int8Value::Unknown
}
fn snapshot_xid_bound(input: SnapshotValue, maximum: bool) -> Xid8Value {
    let bound = snapshot_bound(input, maximum);
    if let Int8Value::Error(error) = bound {
        return Xid8Value::Error(error);
    };
    if let Int8Value::Null = bound {
        return Xid8Value::Null;
    };
    if let Int8Value::Value(bits) = bound {
        return make_xid8_bits(bits);
    };
    Xid8Value::Unknown
}
fn snapshot_visible(value: Int8Value, snapshot: SnapshotValue) -> BoolValue {
    if let Int8Value::Error(error) = value {
        return BoolValue::Error(error);
    };
    if let SnapshotValue::Error(error) = snapshot {
        return BoolValue::Error(error);
    };
    if let Int8Value::Unknown = value {
        return BoolValue::Unknown;
    };
    if let SnapshotValue::Unknown = snapshot {
        return BoolValue::Unknown;
    };
    if let Int8Value::Null = value {
        return BoolValue::Null;
    };
    if let SnapshotValue::Null = snapshot {
        return BoolValue::Null;
    };
    if let Int8Value::Value(bits) = value {
        if let SnapshotValue::Value(payload) = snapshot {
            if snapshot_xid_order(bits, payload.xmin) < 0 {
                return make_bool_value(true);
            };
            if snapshot_xid_order(bits, payload.xmax) >= 0 {
                return make_bool_value(false);
            };
            let mut index: usize = 0;
            while index < payload.xip.len() {
                if bits == payload.xip[index].bits {
                    return make_bool_value(false);
                };
                index += 1;
            }
            return make_bool_value(true);
        };
    };
    BoolValue::Unknown
}
pub fn sql__pg_catalog__pg_snapshot_send__ux8s(input: SnapshotValue) -> ByteaValue {
    snapshot_send(input)
}
pub fn sql__pg_catalog__txid_snapshot_send__bjde(input: SnapshotValue) -> ByteaValue {
    snapshot_send(input)
}
pub fn sql__pg_catalog__pg_snapshot_xmin__je8q(input: SnapshotValue) -> Xid8Value {
    snapshot_xid_bound(input, false)
}
pub fn sql__pg_catalog__pg_snapshot_xmax__enpd(input: SnapshotValue) -> Xid8Value {
    snapshot_xid_bound(input, true)
}
pub fn sql__pg_catalog__txid_snapshot_xmin__vg5z(input: SnapshotValue) -> Int8Value {
    snapshot_bound(input, false)
}
pub fn sql__pg_catalog__txid_snapshot_xmax__nuyq(input: SnapshotValue) -> Int8Value {
    snapshot_bound(input, true)
}
pub fn sql__pg_catalog__txid_visible_in_snapshot__1qno(
    value: Int8Value,
    snapshot: SnapshotValue,
) -> BoolValue {
    snapshot_visible(value, snapshot)
}
pub fn sql__pg_catalog__pg_visible_in_snapshot__5zx2(
    value: Xid8Value,
    snapshot: SnapshotValue,
) -> BoolValue {
    snapshot_visible(xid8_bits(value), snapshot)
}
