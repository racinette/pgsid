const BYTEA_SUBSTRING_ERROR: u32 = 3452581;

fn bytea_substring(
    input: ByteaValue,
    position: Int4Value,
    length: Int4Value,
    has_length: bool,
) -> ByteaValue {
    if let ByteaValue::Error(error) = input {
        return ByteaValue::Error(error);
    }
    if let Int4Value::Error(error) = position {
        return ByteaValue::Error(error);
    }
    if let Int4Value::Error(error) = length {
        return ByteaValue::Error(error);
    }
    if input == ByteaValue::Unknown
        || position == Int4Value::Unknown
        || length == Int4Value::Unknown
    {
        return ByteaValue::Unknown;
    }
    if input == ByteaValue::Null || position == Int4Value::Null || length == Int4Value::Null {
        return ByteaValue::Null;
    }
    if let ByteaValue::Value(value) = input {
        if let Int4Value::Value(start) = position {
            if let Int4Value::Value(count) = length {
                if has_length && count < 0 {
                    return ByteaValue::Error(make_sql_error(BYTEA_SUBSTRING_ERROR));
                }
                let byte_length = bytea_payload_length(value.as_str());
                let mut first = start;
                if first < 1 {
                    first = 1;
                }
                let mut end = byte_length + 1;
                if has_length && start <= 2147483647 - count {
                    end = start + count;
                    if end > byte_length + 1 {
                        end = byte_length + 1;
                    }
                }
                let mut output = String::new();
                if first > byte_length || end <= first {
                    return ByteaValue::Value(output);
                }
                let chars: Vec<char> = value.chars().collect();
                let mut index: usize = 0;
                let mut current: i32 = 1;
                while index < chars.len() && current < end {
                    if current >= first {
                        output.push(chars[index]);
                        output.push(chars[index + 1]);
                    }
                    index = index + 2;
                    current = current + 1;
                }
                return ByteaValue::Value(output);
            }
        }
    }
    ByteaValue::Unknown
}

pub fn sql__pg_catalog__substring__2f07(input: ByteaValue, position: Int4Value) -> ByteaValue {
    bytea_substring(input, position, Int4Value::Value(0), false)
}

pub fn sql__pg_catalog__substring__b44k(
    input: ByteaValue,
    position: Int4Value,
    length: Int4Value,
) -> ByteaValue {
    bytea_substring(input, position, length, true)
}

pub fn sql__pg_catalog__substr__xbdy(input: ByteaValue, position: Int4Value) -> ByteaValue {
    bytea_substring(input, position, Int4Value::Value(0), false)
}

pub fn sql__pg_catalog__substr__jkup(
    input: ByteaValue,
    position: Int4Value,
    length: Int4Value,
) -> ByteaValue {
    bytea_substring(input, position, length, true)
}
