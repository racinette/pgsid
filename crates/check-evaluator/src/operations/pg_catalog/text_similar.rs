const SIMILAR_ESCAPE_ERROR: u32 = 3452621;
const SQLSTATE_SIMILAR_QUOTES: u32 = 3452556;
const SIMILAR_ALLOCATION_ERROR: u32 = 56966976;

fn similar_pattern_capacity_fits(bytes: i64) -> bool {
    27i64 + 3i64 * bytes <= 1073741823i64
}

fn similar_pattern_value(pattern: TextValue, escape: TextValue) -> TextValue {
    if let TextValue::Error(error) = pattern {
        return TextValue::Error(error);
    }
    if let TextValue::Error(error) = escape {
        return TextValue::Error(error);
    }
    if pattern == TextValue::Unknown || escape == TextValue::Unknown {
        return TextValue::Unknown;
    }
    if pattern == TextValue::Null || escape == TextValue::Null {
        return TextValue::Null;
    }
    if let TextValue::Value(pattern_value) = pattern {
        if let TextValue::Value(escape_value) = escape {
            let characters: Vec<char> = pattern_value.chars().collect();
            let escapes: Vec<char> = escape_value.chars().collect();
            if escapes.len() > 1 {
                return TextValue::Error(make_sql_error(SIMILAR_ESCAPE_ERROR));
            }
            if similar_pattern_capacity_fits(text_build_octets(pattern_value.as_str())) == false {
                return TextValue::Error(make_sql_error(SIMILAR_ALLOCATION_ERROR));
            }
            let mut escaping = false;
            let mut escape_character = '\\';
            if escapes.len() == 1 {
                escaping = true;
                escape_character = escapes[0];
            }
            let escape_code: i32 = escape_character as i32;
            let mut output = String::new();
            output.push_str("^(?:");
            let mut after_escape = false;
            let mut quotes: i32 = 0;
            let mut bracket_depth: i32 = 0;
            let mut class_position: i32 = 0;
            let mut index: usize = 0;
            while index < characters.len() {
                let character = characters[index];
                let code: i32 = character as i32;
                if escaping && escape_code > 127 && code > 127 {
                    if after_escape {
                        output.push('\\');
                        output.push(character);
                        after_escape = false;
                    } else if character == escape_character {
                        after_escape = true;
                    } else {
                        output.push(character);
                    };
                } else if after_escape {
                    if character == '"' && bracket_depth < 1 {
                        if quotes == 0 {
                            output.push_str("){1,1}?(");
                        } else if quotes == 1 {
                            output.push_str("){1,1}(?:");
                        } else {
                            return TextValue::Error(make_sql_error(SQLSTATE_SIMILAR_QUOTES));
                        }
                        quotes = quotes + 1;
                    } else {
                        output.push('\\');
                        output.push(character);
                        class_position = 3;
                    }
                    after_escape = false;
                } else if escaping && character == escape_character {
                    after_escape = true;
                } else if bracket_depth > 0 {
                    if character == '\\' {
                        output.push('\\');
                    }
                    output.push(character);
                    if character == ']' && class_position > 2 {
                        bracket_depth = bracket_depth - 1;
                    } else if character == '[' {
                        bracket_depth = bracket_depth + 1;
                        class_position = 3;
                    } else if character == '^' {
                        class_position = class_position + 1;
                    } else {
                        class_position = 3;
                    };
                } else if character == '[' {
                    output.push(character);
                    bracket_depth = 1;
                    class_position = 1;
                } else if character == '%' {
                    output.push_str(".*");
                } else if character == '_' {
                    output.push('.');
                } else if character == '(' {
                    output.push_str("(?:");
                } else if character == '\\'
                    || character == '.'
                    || character == '^'
                    || character == '$'
                {
                    output.push('\\');
                    output.push(character);
                } else {
                    output.push(character);
                }
                index += 1;
            }
            output.push_str(")$");
            return TextValue::Value(output);
        }
    }
    TextValue::Unknown
}

pub fn sql__pg_catalog__similar_to_escape__7txt(pattern: TextValue) -> TextValue {
    similar_pattern_value(pattern, make_text_value("\\"))
}

pub fn sql__pg_catalog__similar_to_escape__9vor(
    pattern: TextValue,
    escape: TextValue,
) -> TextValue {
    similar_pattern_value(pattern, escape)
}
