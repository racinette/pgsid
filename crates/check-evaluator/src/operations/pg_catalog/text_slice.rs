const TEXT_SUBSTRING_ERROR: u32 = 3452581;

fn text_substring_value(
    input: TextValue,
    position: Int4Value,
    length: Int4Value,
    has_length: bool,
) -> TextValue {
    if let TextValue::Error(error) = input {
        return TextValue::Error(error);
    }
    if let Int4Value::Error(error) = position {
        return TextValue::Error(error);
    }
    if let Int4Value::Error(error) = length {
        return TextValue::Error(error);
    }
    if input == TextValue::Unknown || position == Int4Value::Unknown || length == Int4Value::Unknown
    {
        return TextValue::Unknown;
    }
    if input == TextValue::Null || position == Int4Value::Null || length == Int4Value::Null {
        return TextValue::Null;
    }
    if let TextValue::Value(text) = input {
        if let Int4Value::Value(start) = position {
            if let Int4Value::Value(count) = length {
                if has_length && count < 0 {
                    return TextValue::Error(make_sql_error(TEXT_SUBSTRING_ERROR));
                }
                let first = start as i64;
                let mut end: i64 = 2147483648i64;
                if has_length && start <= 2147483647 - count {
                    let stop = start + count;
                    end = stop as i64;
                }
                let characters: Vec<char> = text.chars().collect();
                let mut output = String::new();
                let mut index: usize = 0;
                let mut current: i64 = 1i64;
                while index < characters.len() && current < end {
                    if current >= first {
                        output.push(characters[index]);
                    }
                    index += 1;
                    current = current + 1i64;
                }
                return TextValue::Value(output);
            }
        }
    }
    TextValue::Unknown
}

fn text_side_value(input: TextValue, length: Int4Value, from_right: bool) -> TextValue {
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
        if let Int4Value::Value(count) = length {
            let characters: Vec<char> = text.chars().collect();
            let mut total: i64 = 0i64;
            let mut index: usize = 0;
            while index < characters.len() {
                total = total + 1i64;
                index += 1;
            }
            let requested = count as i64;
            let mut first: i64 = 0i64;
            let mut end = total;
            if from_right {
                if count < 0 {
                    first = 0i64 - requested;
                    if count == -2147483647 - 1 {
                        first = 0i64;
                    }
                } else {
                    first = total - requested;
                };
            } else {
                if count < 0 {
                    end = total + requested;
                } else {
                    end = requested;
                };
            };
            let mut output = String::new();
            index = 0;
            let mut current: i64 = 0i64;
            while index < characters.len() && current < end {
                if current >= first {
                    output.push(characters[index]);
                }
                index += 1;
                current = current + 1i64;
            }
            return TextValue::Value(output);
        }
    }
    TextValue::Unknown
}

pub fn sql__pg_catalog__substring__ezt4(input: TextValue, position: Int4Value) -> TextValue {
    text_substring_value(input, position, Int4Value::Value(0), false)
}

pub fn sql__pg_catalog__substring__dd1c(
    input: TextValue,
    position: Int4Value,
    length: Int4Value,
) -> TextValue {
    text_substring_value(input, position, length, true)
}

pub fn sql__pg_catalog__substr__8v03(input: TextValue, position: Int4Value) -> TextValue {
    text_substring_value(input, position, Int4Value::Value(0), false)
}

pub fn sql__pg_catalog__substr__zhiv(
    input: TextValue,
    position: Int4Value,
    length: Int4Value,
) -> TextValue {
    text_substring_value(input, position, length, true)
}

pub fn sql__pg_catalog__left__8f3e(input: TextValue, length: Int4Value) -> TextValue {
    text_side_value(input, length, false)
}

pub fn sql__pg_catalog__right__hbgt(input: TextValue, length: Int4Value) -> TextValue {
    text_side_value(input, length, true)
}

pub fn sql__pg_catalog__reverse__5pr1(input: TextValue) -> TextValue {
    if let TextValue::Error(error) = input {
        return TextValue::Error(error);
    }
    if input == TextValue::Unknown {
        return TextValue::Unknown;
    }
    if input == TextValue::Null {
        return TextValue::Null;
    }
    if let TextValue::Value(text) = input {
        let characters: Vec<char> = text.chars().collect();
        let mut index = characters.len();
        let mut output = String::new();
        while index > 0 {
            index = index - 1;
            output.push(characters[index]);
        }
        return TextValue::Value(output);
    }
    TextValue::Unknown
}
