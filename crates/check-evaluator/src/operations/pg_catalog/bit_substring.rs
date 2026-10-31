const BIT_SUBSTRING_ERROR: u32 = 3452581;

fn bit_substring(
    input: BitValue,
    position: Int4Value,
    length: Int4Value,
    has_length: bool,
) -> BitValue {
    let mut unresolved_flavor: i32 = 0;
    if let BitValue::Unknown = input { unresolved_flavor = 1; };
    if let Int4Value::Unknown = position { unresolved_flavor = 1; };
    if let Int4Value::Unknown = length { unresolved_flavor = 1; };
    if let BitValue::Unimplemented = input { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = position { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = length { unresolved_flavor = 2; };
    if let BitValue::Error(error) = input {
        return BitValue::Error(error);
    }
    if let Int4Value::Error(error) = position {
        return BitValue::Error(error);
    }
    if let Int4Value::Error(error) = length {
        return BitValue::Error(error);
    }
    let mut condition_flavor_25_4: i32 = unresolved_flavor; if let BitValue::Unknown = input { if condition_flavor_25_4 < 1 { condition_flavor_25_4 = 1; }; }; if let BitValue::Unimplemented = input { condition_flavor_25_4 = 2; }; if let Int4Value::Unknown = position { if condition_flavor_25_4 < 1 { condition_flavor_25_4 = 1; }; }; if let Int4Value::Unimplemented = position { condition_flavor_25_4 = 2; }; if let Int4Value::Unknown = length { if condition_flavor_25_4 < 1 { condition_flavor_25_4 = 1; }; }; if let Int4Value::Unimplemented = length { condition_flavor_25_4 = 2; }; if (input == BitValue::Unknown || input == BitValue::Unimplemented) || (position == Int4Value::Unknown || position == Int4Value::Unimplemented) || (length == Int4Value::Unknown || length == Int4Value::Unimplemented)
    {
        return bit_unresolved(condition_flavor_25_4);
    }
    if input == BitValue::Null || position == Int4Value::Null || length == Int4Value::Null {
        return BitValue::Null;
    }
    if let BitValue::Value(value) = input {
        if let Int4Value::Value(start) = position {
            if let Int4Value::Value(count) = length {
                if has_length && count < 0 {
                    return BitValue::Error(make_sql_error(BIT_SUBSTRING_ERROR));
                }
                let bitlen = bit_payload_length(value.as_str());
                let mut first = start;
                if first < 1 {
                    first = 1;
                }
                let mut end = bitlen + 1;
                if has_length && start <= 2147483647 - count {
                    end = start + count;
                    if end > bitlen + 1 {
                        end = bitlen + 1;
                    }
                }
                let mut output = String::new();
                if first > bitlen || end <= first {
                    return BitValue::Value(output);
                }
                let chars: Vec<char> = value.chars().collect();
                let mut index: usize = 0;
                let mut current: i32 = 1;
                while index < chars.len() && current < end {
                    if current >= first {
                        output.push(chars[index]);
                    }
                    index += 1;
                    current = current + 1;
                }
                return BitValue::Value(output);
            }
        }
    }
    bit_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__substring__dfdi(input: BitValue, position: Int4Value) -> BitValue {
    bit_substring(input, position, Int4Value::Value(0), false)
}

pub fn sql__pg_catalog__substring__pr1e(
    input: BitValue,
    position: Int4Value,
    length: Int4Value,
) -> BitValue {
    bit_substring(input, position, length, true)
}
