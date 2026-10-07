const BYTEA_MAX_LENGTH: i32 = 1073741819;
const BYTEA_ALLOCATION_ERROR: u32 = 56966976;

fn bytea_concat_length(left: i32, right: i32) -> Int4Value {
    if left > BYTEA_MAX_LENGTH - right {
        return Int4Value::Error(make_sql_error(BYTEA_ALLOCATION_ERROR));
    }
    Int4Value::Value(left + right)
}

pub fn sql__pg_catalog__byteacat__zitv(left: ByteaValue, right: ByteaValue) -> ByteaValue {
    if let ByteaValue::Error(error) = left {
        return ByteaValue::Error(error);
    }
    if let ByteaValue::Error(error) = right {
        return ByteaValue::Error(error);
    }
    if left == ByteaValue::Unknown || right == ByteaValue::Unknown {
        return ByteaValue::Unknown;
    }
    if left == ByteaValue::Null || right == ByteaValue::Null {
        return ByteaValue::Null;
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
    ByteaValue::Unknown
}
