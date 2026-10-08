const UNISTR_SYNTAX_ERROR: u32 = 6819553;
const UNISTR_INVALID_CODE_POINT: u32 = 3452619;

pub fn sql__pg_catalog__unistr__n58m(input: TextValue) -> TextValue {
    if let TextValue::Error(error) = input {
        return TextValue::Error(error);
    }
    if input == TextValue::Unknown {
        return TextValue::Unknown;
    }
    if input == TextValue::Null {
        return TextValue::Null;
    }
    if let TextValue::Value(value) = input {
        let characters: Vec<char> = value.chars().collect();
        let mut output = String::new();
        let mut index: usize = 0;
        let mut first_surrogate: i32 = 0;
        while index < characters.len() {
            let character = characters[index];
            if character != '\\' {
                if first_surrogate != 0 {
                    return TextValue::Error(make_sql_error(UNISTR_SYNTAX_ERROR));
                }
                output.push(character);
                index += 1;
            } else if index + 1 < characters.len() && characters[index + 1] == '\\' {
                if first_surrogate != 0 {
                    return TextValue::Error(make_sql_error(UNISTR_SYNTAX_ERROR));
                }
                output.push('\\');
                index += 2;
            } else {
                let mut offset: usize = 1;
                let mut width: usize = 4;
                if index + 1 < characters.len() {
                    let prefix = characters[index + 1];
                    if prefix == 'u' {
                        offset = 2;
                    } else if prefix == '+' {
                        offset = 2;
                        width = 6;
                    } else if prefix == 'U' {
                        offset = 2;
                        width = 8;
                    };
                }
                if index + offset + width > characters.len() {
                    return TextValue::Error(make_sql_error(UNISTR_SYNTAX_ERROR));
                }
                let mut decoded: i64 = 0i64;
                let mut position: usize = 0;
                while position < width {
                    let digit = hex_digit(characters[index + offset + position]);
                    if digit > 15 {
                        return TextValue::Error(make_sql_error(UNISTR_SYNTAX_ERROR));
                    }
                    let widened_digit: i64 = digit as i64;
                    decoded = decoded * 16i64 + widened_digit;
                    position += 1;
                }
                if decoded == 0i64 || decoded > 1114111i64 {
                    return TextValue::Error(make_sql_error(UNISTR_INVALID_CODE_POINT));
                }
                let mut code: i32 = decoded as i32;
                if first_surrogate != 0 {
                    if code < 56320 || code > 57343 {
                        return TextValue::Error(make_sql_error(UNISTR_SYNTAX_ERROR));
                    }
                    code = 65536 + (first_surrogate - 55296) * 1024 + code - 56320;
                    first_surrogate = 0;
                } else if code >= 56320 && code <= 57343 {
                    return TextValue::Error(make_sql_error(UNISTR_SYNTAX_ERROR));
                }
                if code >= 55296 && code <= 56319 {
                    first_surrogate = code;
                } else {
                    let scalar = char::from_u32(code as u32).unwrap_or(' ');
                    output.push(scalar);
                }
                index = index + offset + width;
            };
        }
        if first_surrogate != 0 {
            return TextValue::Error(make_sql_error(UNISTR_SYNTAX_ERROR));
        }
        return TextValue::Value(output);
    }
    TextValue::Unknown
}
