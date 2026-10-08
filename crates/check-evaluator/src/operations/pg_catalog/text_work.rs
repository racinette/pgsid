const TEXT_LENGTH_RANGE_ERROR: u32 = 3452547;

fn text_binary_hex(value: &str, trim_spaces: bool) -> String {
    let characters: Vec<char> = value.chars().collect();
    let mut end = characters.len();
    if trim_spaces {
        while end > 0 && characters[end - 1] == ' ' {
            end = end - 1;
        }
    };
    let mut output = String::new();
    let mut index: usize = 0;
    while index < end {
        output = bytea_utf8_character(output, characters[index]);
        index += 1;
    }
    output
}

fn text_binary_compare(left: TextValue, right: TextValue, trim_spaces: bool) -> Int4Value {
    if let TextValue::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let TextValue::Error(error) = right {
        return Int4Value::Error(error);
    }
    if left == TextValue::Unknown || right == TextValue::Unknown {
        return Int4Value::Unknown;
    }
    if left == TextValue::Null || right == TextValue::Null {
        return Int4Value::Null;
    }
    if let TextValue::Value(a) = left {
        if let TextValue::Value(b) = right {
            let first = text_binary_hex(a.as_str(), trim_spaces);
            let second = text_binary_hex(b.as_str(), trim_spaces);
            return bytea_compare(ByteaValue::Value(first), ByteaValue::Value(second));
        };
    };
    Int4Value::Unknown
}

fn text_measure_value(value: TextValue, trim_spaces: bool, mode: i32) -> Int4Value {
    if let TextValue::Error(error) = value {
        return Int4Value::Error(error);
    }
    if value == TextValue::Unknown {
        return Int4Value::Unknown;
    }
    if value == TextValue::Null {
        return Int4Value::Null;
    }
    if let TextValue::Value(text) = value {
        let characters: Vec<char> = text.chars().collect();
        let mut end = characters.len();
        if trim_spaces {
            while end > 0 && characters[end - 1] == ' ' {
                end = end - 1;
            }
        };
        let mut length: i64 = 0i64;
        let mut index: usize = 0;
        while index < end {
            let mut width: i64 = 1i64;
            if mode != 0 {
                let code = characters[index] as i32;
                if code >= 128 {
                    width = 2i64;
                }
                if code >= 2048 {
                    width = 3i64;
                }
                if code >= 65536 {
                    width = 4i64;
                }
            };
            length = length + width;
            index += 1;
        }
        if mode == 2 {
            length = length * 8i64;
        }
        if length > 2147483647i64 {
            return Int4Value::Error(make_sql_error(TEXT_LENGTH_RANGE_ERROR));
        }
        return Int4Value::Value(length as i32);
    };
    Int4Value::Unknown
}

fn text_trim_value(
    value: TextValue,
    set: TextValue,
    trim_left: bool,
    trim_right: bool,
) -> TextValue {
    if let TextValue::Error(error) = value {
        return TextValue::Error(error);
    }
    if let TextValue::Error(error) = set {
        return TextValue::Error(error);
    }
    if value == TextValue::Unknown || set == TextValue::Unknown {
        return TextValue::Unknown;
    }
    if value == TextValue::Null || set == TextValue::Null {
        return TextValue::Null;
    }
    if let TextValue::Value(text) = value {
        if let TextValue::Value(trim_set) = set {
            let characters: Vec<char> = text.chars().collect();
            let members: Vec<char> = trim_set.chars().collect();
            let mut start: usize = 0;
            let mut end = characters.len();
            if trim_left {
                while start < end {
                    let mut member: usize = 0;
                    let mut matched = false;
                    while member < members.len() {
                        if characters[start] == members[member] {
                            matched = true;
                        }
                        member += 1;
                    }
                    if matched == false {
                        break;
                    }
                    start += 1;
                }
            };
            if trim_right {
                while start < end {
                    let mut member: usize = 0;
                    let mut matched = false;
                    while member < members.len() {
                        if characters[end - 1] == members[member] {
                            matched = true;
                        }
                        member += 1;
                    }
                    if matched == false {
                        break;
                    }
                    end = end - 1;
                }
            };
            let mut output = String::new();
            let mut index = start;
            while index < end {
                output.push(characters[index]);
                index += 1;
            }
            return TextValue::Value(output);
        };
    };
    TextValue::Unknown
}
