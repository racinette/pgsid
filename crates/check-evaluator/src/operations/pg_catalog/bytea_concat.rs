const BYTEA_MAX_LENGTH: i32 = 1073741819;
const BYTEA_ALLOCATION_ERROR: u32 = 56966976;

fn bytea_concat_length(left: i32, right: i32) -> Int4Value {
    if left > BYTEA_MAX_LENGTH - right {
        return Int4Value::Error(make_sql_error(BYTEA_ALLOCATION_ERROR));
    }
    Int4Value::Value(left + right)
}

pub fn sql__pg_catalog__byteacat__zitv(left: ByteaValue, right: ByteaValue) -> ByteaValue {
    let mut unresolved_flavor: i32 = 0;
    if let ByteaValue::Unknown = left { unresolved_flavor = 1; };
    if let ByteaValue::Unknown = right { unresolved_flavor = 1; };
    if let ByteaValue::Unimplemented = left { unresolved_flavor = 2; };
    if let ByteaValue::Unimplemented = right { unresolved_flavor = 2; };
    if let ByteaValue::Error(error) = left {
        return ByteaValue::Error(error);
    }
    if let ByteaValue::Error(error) = right {
        return ByteaValue::Error(error);
    }
    let mut condition_flavor_23_4: i32 = unresolved_flavor; if let ByteaValue::Unknown = left { if condition_flavor_23_4 < 1 { condition_flavor_23_4 = 1; }; }; if let ByteaValue::Unimplemented = left { condition_flavor_23_4 = 2; }; if let ByteaValue::Unknown = right { if condition_flavor_23_4 < 1 { condition_flavor_23_4 = 1; }; }; if let ByteaValue::Unimplemented = right { condition_flavor_23_4 = 2; }; if (left == ByteaValue::Unknown || left == ByteaValue::Unimplemented) || (right == ByteaValue::Unknown || right == ByteaValue::Unimplemented) {
        return bytea_unresolved(condition_flavor_23_4);
    }
    if left == ByteaValue::Null || right == ByteaValue::Null {
        return ByteaValue::Null;
    }
    let first_length = bytea_length(left.clone());
    let second_length = bytea_length(right.clone());
    if let Int4Value::Value(first) = first_length {
        if let Int4Value::Value(second) = second_length {
            let length = bytea_concat_length(first, second);
            if let Int4Value::Error(error) = length {
                return ByteaValue::Error(error);
            }
            if first == 0 {
                return right;
            }
            if second == 0 {
                return left;
            }
            if let Int4Value::Value(size) = length {
                if let ByteaValue::Unspecified(_) = left {
                    return ByteaValue::Unspecified(size);
                }
                if let ByteaValue::Unspecified(_) = right {
                    return ByteaValue::Unspecified(size);
                }
            }
        }
    }
    if let ByteaValue::Value(a) = left {
        if let ByteaValue::Value(b) = right {
            let first = bytea_payload_length(a.as_str());
            let second = bytea_payload_length(b.as_str());
            let length = bytea_concat_length(first, second);
            if let Int4Value::Error(error) = length {
                return ByteaValue::Error(error);
            }
            let mut output = a;
            output.push_str(b.as_str());
            return ByteaValue::Value(output);
        }
    }
    let mut local_flavor_66_4: i32 = unresolved_flavor; if let Int4Value::Unknown = second_length { if local_flavor_66_4 < 1 { local_flavor_66_4 = 1; }; }; if let Int4Value::Unimplemented = second_length { local_flavor_66_4 = 2; }; if let Int4Value::Unknown = first_length { if local_flavor_66_4 < 1 { local_flavor_66_4 = 1; }; }; if let Int4Value::Unimplemented = first_length { local_flavor_66_4 = 2; }; bytea_unresolved(local_flavor_66_4)
}
