fn uuid_parse(value: &str) -> UuidValue {
    let chars: Vec<char> = value.chars().collect();
    if chars.len() < 32 || chars.len() > 41 {
        return UuidValue::Error(make_sql_error(SQL_ERROR_INVALID_TEXT_REPRESENTATION));
    }
    let mut index: usize = 0;
    let braces = chars[0] == '{';
    if braces {
        index += 1;
    }
    let mut word0: i32 = 0;
    let mut word1: i32 = 0;
    let mut word2: i32 = 0;
    let mut word3: i32 = 0;
    let mut word4: i32 = 0;
    let mut word5: i32 = 0;
    let mut word6: i32 = 0;
    let mut word7: i32 = 0;
    let mut group: usize = 0;
    while group < 8 {
        let mut word: i32 = 0;
        let mut digit_index: usize = 0;
        while digit_index < 4 {
            if index >= chars.len() {
                return UuidValue::Error(make_sql_error(SQL_ERROR_INVALID_TEXT_REPRESENTATION));
            }
            let digit = hex_digit(chars[index]);
            if digit == 16 {
                return UuidValue::Error(make_sql_error(SQL_ERROR_INVALID_TEXT_REPRESENTATION));
            }
            word = word * 16 + digit;
            index += 1;
            digit_index += 1;
        }
        if group == 0 {
            word0 = word;
        } else if group == 1 {
            word1 = word;
        } else if group == 2 {
            word2 = word;
        } else if group == 3 {
            word3 = word;
        } else if group == 4 {
            word4 = word;
        } else if group == 5 {
            word5 = word;
        } else if group == 6 {
            word6 = word;
        } else {
            word7 = word;
        };
        group += 1;
        if group < 8 && index < chars.len() && chars[index] == '-' {
            index += 1;
        }
    }
    if braces {
        if index >= chars.len() || chars[index] != '}' {
            return UuidValue::Error(make_sql_error(SQL_ERROR_INVALID_TEXT_REPRESENTATION));
        }
        index += 1;
    }
    if index != chars.len() {
        return UuidValue::Error(make_sql_error(SQL_ERROR_INVALID_TEXT_REPRESENTATION));
    }
    UuidValue::Value(Uuid {
        word0,
        word1,
        word2,
        word3,
        word4,
        word5,
        word6,
        word7,
    })
}

pub fn uuid_from_text(input: TextValue) -> UuidValue {
    if let TextValue::Error(error) = input {
        return UuidValue::Error(error);
    }
    if input == TextValue::Unknown {
        return UuidValue::Unknown;
    }
    if input == TextValue::Null {
        return UuidValue::Null;
    }
    if let TextValue::Value(value) = input {
        return uuid_parse(value.as_str());
    }
    UuidValue::Unknown
}

pub fn uuid_word(value: Uuid, index: i32) -> i32 {
    if index == 0 {
        return value.word0;
    }
    if index == 1 {
        return value.word1;
    }
    if index == 2 {
        return value.word2;
    }
    if index == 3 {
        return value.word3;
    }
    if index == 4 {
        return value.word4;
    }
    if index == 5 {
        return value.word5;
    }
    if index == 6 {
        return value.word6;
    }
    value.word7
}
