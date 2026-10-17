const IDENTIFIER_PARSE_ERROR: u32 = 3452619;

fn identifier_space(character: char) -> bool {
    let code = character as i32;
    code == 32 || code == 9 || code == 10 || code == 11 || code == 12 || code == 13
}

fn identifier_start(character: char) -> bool {
    let code = character as i32;
    character == '_' || (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || code >= 128
}

fn identifier_continuation(character: char) -> bool {
    let code = character as i32;
    identifier_start(character) || character == '$' || (code >= 48 && code <= 57)
}

pub fn sql__pg_catalog__parse_ident__uh6p(
    input: TextValue,
    strict: BoolValue,
    utf8: bool,
) -> ArrayValue {
    if let TextValue::Error(error) = input {
        return ArrayValue::Error(error);
    };
    if let BoolValue::Error(error) = strict {
        return ArrayValue::Error(error);
    };
    if input == TextValue::Null || strict == BoolValue::Null {
        return ArrayValue::Null;
    };
    if let TextValue::Value(text) = input {
        if let BoolValue::Value(strict_mode) = strict {
            let characters: Vec<char> = text.chars().collect();
            let mut position: usize = 0;
            let mut count: i32 = 0;
            let mut output = make_array_arguments("pg_catalog.text", 8);
            while position < characters.len() && identifier_space(characters[position]) {
                position += 1;
            }
            while position <= characters.len() {
                if position == characters.len() {
                    return ArrayValue::Error(make_sql_error(IDENTIFIER_PARSE_ERROR));
                };
                let mut part = String::new();
                if characters[position] == '"' {
                    position += 1;
                    let mut closed = false;
                    while position < characters.len() {
                        let character = characters[position];
                        position += 1;
                        if character == '"' {
                            if position < characters.len() && characters[position] == '"' {
                                part.push('"');
                                position += 1;
                            } else {
                                closed = true;
                                break;
                            };
                        } else {
                            part.push(character);
                        };
                    }
                    if closed == false || part == "" {
                        return ArrayValue::Error(make_sql_error(IDENTIFIER_PARSE_ERROR));
                    };
                } else if identifier_start(characters[position]) {
                    while position < characters.len()
                        && identifier_continuation(characters[position])
                    {
                        let character = characters[position];
                        if (character as i32) >= 128 && utf8 == false {
                            return ArrayValue::Unknown;
                        };
                        part.push(character.to_ascii_lowercase());
                        position += 1;
                    }
                } else {
                    return ArrayValue::Error(make_sql_error(IDENTIFIER_PARSE_ERROR));
                };
                let element = array_element_from_text(TextValue::Value(part));
                output = append_array_argument(output, element);
                count = count + 1;
                while position < characters.len() && identifier_space(characters[position]) {
                    position += 1;
                }
                if position == characters.len() {
                    return array_string_finish(output, count);
                };
                if characters[position] == '.' {
                    position += 1;
                    while position < characters.len() && identifier_space(characters[position]) {
                        position += 1;
                    }
                } else if strict_mode {
                    return ArrayValue::Error(make_sql_error(IDENTIFIER_PARSE_ERROR));
                } else {
                    return array_string_finish(output, count);
                };
            }
        };
    };
    ArrayValue::Unknown
}
