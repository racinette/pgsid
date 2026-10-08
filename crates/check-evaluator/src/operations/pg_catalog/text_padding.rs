const TEXT_BUILD_LIMIT_ERROR: u32 = 8584704;

fn text_build_octets(value: &str) -> i64 {
    let characters: Vec<char> = value.chars().collect();
    let mut size: i64 = 0i64;
    let mut index: usize = 0;
    while index < characters.len() {
        let code = characters[index] as i32;
        let mut width: i64 = 1i64;
        if code >= 128 {
            width = 2i64;
        }
        if code >= 2048 {
            width = 3i64;
        }
        if code >= 65536 {
            width = 4i64;
        }
        size = size + width;
        index += 1;
    }
    size
}

fn text_padding(input: TextValue, length: Int4Value, fill: TextValue, right: bool) -> TextValue {
    if let TextValue::Error(error) = input {
        return TextValue::Error(error);
    }
    if let Int4Value::Error(error) = length {
        return TextValue::Error(error);
    }
    if let TextValue::Error(error) = fill {
        return TextValue::Error(error);
    }
    if input == TextValue::Unknown || length == Int4Value::Unknown || fill == TextValue::Unknown {
        return TextValue::Unknown;
    }
    if input == TextValue::Null || length == Int4Value::Null || fill == TextValue::Null {
        return TextValue::Null;
    }
    if let TextValue::Value(text) = input {
        if let Int4Value::Value(requested) = length {
            if let TextValue::Value(padding) = fill {
                let characters: Vec<char> = text.chars().collect();
                let members: Vec<char> = padding.chars().collect();
                let mut count = requested;
                if count < 0 {
                    count = 0;
                }
                let mut end: usize = 0;
                let mut kept: i32 = 0;
                while end < characters.len() && kept < count {
                    end += 1;
                    kept = kept + 1;
                }
                if members.len() == 0 {
                    count = kept;
                }
                if count >= 268435455 {
                    return TextValue::Error(make_sql_error(TEXT_BUILD_LIMIT_ERROR));
                }
                let mut padding_count = count - kept;
                let mut output = String::new();
                let mut index: usize = 0;
                if right {
                    while index < end {
                        output.push(characters[index]);
                        index += 1;
                    }
                }
                index = 0;
                while padding_count > 0 {
                    output.push(members[index]);
                    index += 1;
                    if index == members.len() {
                        index = 0;
                    }
                    padding_count = padding_count - 1;
                }
                if right == false {
                    index = 0;
                    while index < end {
                        output.push(characters[index]);
                        index += 1;
                    }
                }
                return TextValue::Value(output);
            }
        }
    }
    TextValue::Unknown
}

pub fn sql__pg_catalog__lpad__ezhf(
    input: TextValue,
    length: Int4Value,
    fill: TextValue,
) -> TextValue {
    text_padding(input, length, fill, false)
}

pub fn sql__pg_catalog__lpad__lqi7(input: TextValue, length: Int4Value) -> TextValue {
    text_padding(input, length, TextValue::Value(" ".to_owned()), false)
}

pub fn sql__pg_catalog__rpad__bw5z(
    input: TextValue,
    length: Int4Value,
    fill: TextValue,
) -> TextValue {
    text_padding(input, length, fill, true)
}

pub fn sql__pg_catalog__rpad__53f6(input: TextValue, length: Int4Value) -> TextValue {
    text_padding(input, length, TextValue::Value(" ".to_owned()), true)
}

pub fn sql__pg_catalog__repeat__f0fb(input: TextValue, length: Int4Value) -> TextValue {
    if let TextValue::Error(error) = input {
        return TextValue::Error(error);
    }
    if let Int4Value::Error(error) = length {
        return TextValue::Error(error);
    }
    if input == TextValue::Unknown || length == Int4Value::Unknown {
        return TextValue::Unknown;
    }
    if input == TextValue::Null || length == Int4Value::Null {
        return TextValue::Null;
    }
    if let TextValue::Value(text) = input {
        if let Int4Value::Value(requested) = length {
            if requested <= 0 {
                return TextValue::Value(String::new());
            }
            let size = text_build_octets(text.as_str());
            if size == 0i64 {
                return TextValue::Value(String::new());
            }
            if size * requested as i64 > 1073741819i64 {
                return TextValue::Error(make_sql_error(TEXT_BUILD_LIMIT_ERROR));
            }
            let mut count = requested;
            let mut block = text;
            let mut output = String::new();
            while count > 0 {
                if count % 2 == 1 {
                    output.push_str(block.as_str());
                }
                count = count / 2;
                if count > 0 {
                    let copy = block.clone();
                    block.push_str(copy.as_str());
                }
            }
            return TextValue::Value(output);
        }
    }
    TextValue::Unknown
}

pub fn sql__pg_catalog__translate__txpt(
    input: TextValue,
    from: TextValue,
    to: TextValue,
) -> TextValue {
    if let TextValue::Error(error) = input {
        return TextValue::Error(error);
    }
    if let TextValue::Error(error) = from {
        return TextValue::Error(error);
    }
    if let TextValue::Error(error) = to {
        return TextValue::Error(error);
    }
    if input == TextValue::Unknown || from == TextValue::Unknown || to == TextValue::Unknown {
        return TextValue::Unknown;
    }
    if input == TextValue::Null || from == TextValue::Null || to == TextValue::Null {
        return TextValue::Null;
    }
    if let TextValue::Value(text) = input {
        if let TextValue::Value(source) = from {
            if let TextValue::Value(target) = to {
                if text_build_octets(text.as_str()) > 268435454i64 {
                    return TextValue::Error(make_sql_error(TEXT_BUILD_LIMIT_ERROR));
                }
                let characters: Vec<char> = text.chars().collect();
                let before: Vec<char> = source.chars().collect();
                let after: Vec<char> = target.chars().collect();
                let mut output = String::new();
                let mut index: usize = 0;
                while index < characters.len() {
                    let mut member: usize = 0;
                    while member < before.len() && before[member] != characters[index] {
                        member += 1;
                    }
                    if member < before.len() {
                        if member < after.len() {
                            output.push(after[member]);
                        }
                    } else {
                        output.push(characters[index]);
                    };
                    index += 1;
                }
                return TextValue::Value(output);
            }
        }
    }
    TextValue::Unknown
}
