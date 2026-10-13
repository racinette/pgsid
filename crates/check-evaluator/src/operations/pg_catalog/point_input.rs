struct GeometryInputText {
    chars: Vec<char>,
}
#[derive(Clone, Copy)]
struct GeometryInputNumber {
    value: Float8Value,
    end: usize,
}
fn geometry_input_word(source: &GeometryInputText, start: usize, word: &str) -> bool {
    let letters: Vec<char> = word.chars().collect();
    if start + letters.len() > source.chars.len() {
        return false;
    };
    let mut index: usize = 0;
    while index < letters.len() {
        if source.chars[start + index].to_ascii_lowercase() != letters[index] {
            return false;
        };
        index += 1;
    }
    true
}
fn geometry_input_space(source: &GeometryInputText, start: usize) -> usize {
    let mut index = start;
    while index < source.chars.len() && numeric_space(source.chars[index]) {
        index += 1;
    }
    index
}
fn geometry_input_digit(value: char) -> bool {
    let code = value as i32;
    code >= 48 && code <= 57
}
fn geometry_read_number(source: &GeometryInputText, begin: usize) -> GeometryInputNumber {
    let start = geometry_input_space(source, begin);
    let mut index = start;
    if index < source.chars.len() && (source.chars[index] == '+' || source.chars[index] == '-') {
        index += 1;
    };
    let unsigned = index;
    if geometry_input_word(source, unsigned, "0x") {
        return GeometryInputNumber {
            value: Float8Value::Unknown,
            end: index,
        };
    };
    if geometry_input_word(source, unsigned, "infinity") {
        index += 8;
    } else if geometry_input_word(source, unsigned, "inf") {
        index += 3;
    } else if geometry_input_word(source, unsigned, "nan") {
        index += 3;
        if unsigned != start || (index < source.chars.len() && source.chars[index] == '(') {
            return GeometryInputNumber {
                value: Float8Value::Unknown,
                end: index,
            };
        };
    } else {
        let mut digits: usize = 0;
        while index < source.chars.len() && geometry_input_digit(source.chars[index]) {
            index += 1;
            digits += 1;
        }
        if index < source.chars.len() && source.chars[index] == '.' {
            index += 1;
            while index < source.chars.len() && geometry_input_digit(source.chars[index]) {
                index += 1;
                digits += 1;
            }
        };
        if digits == 0 {
            return GeometryInputNumber {
                value: Float8Value::Error(make_sql_error(FLOAT_INPUT_INVALID)),
                end: index,
            };
        };
        if index < source.chars.len() && source.chars[index].to_ascii_lowercase() == 'e' {
            let saved = index;
            index += 1;
            if index < source.chars.len()
                && (source.chars[index] == '+' || source.chars[index] == '-')
            {
                index += 1;
            };
            let exponent = index;
            while index < source.chars.len() && geometry_input_digit(source.chars[index]) {
                index += 1;
            }
            if index == exponent {
                index = saved;
            };
        };
    };
    let mut token = String::new();
    let mut at = start;
    while at < index {
        token.push(source.chars[at]);
        at += 1;
    }
    let value = float8_from_text(make_text_value(token.as_str()));
    GeometryInputNumber {
        value: value,
        end: geometry_input_space(source, index),
    }
}
fn point_parse(value: &str) -> PointValue {
    let chars: Vec<char> = value.chars().collect();
    if chars.len() > 4096 {
        return PointValue::Unknown;
    };
    let source = GeometryInputText { chars: chars };
    let mut index = geometry_input_space(&source, 0);
    let mut parenthesized = false;
    if index < source.chars.len() && source.chars[index] == '(' {
        parenthesized = true;
        index += 1;
    };
    let first = geometry_read_number(&source, index);
    let first_value = first.value;
    if let Float8Value::Error(error) = first_value {
        return PointValue::Error(error);
    };
    if first_value == Float8Value::Unknown {
        return PointValue::Unknown;
    };
    index = first.end;
    if index >= source.chars.len() || source.chars[index] != ',' {
        return PointValue::Error(make_sql_error(FLOAT_INPUT_INVALID));
    };
    index += 1;
    let second = geometry_read_number(&source, index);
    let second_value = second.value;
    if let Float8Value::Error(error) = second_value {
        return PointValue::Error(error);
    };
    if second_value == Float8Value::Unknown {
        return PointValue::Unknown;
    };
    index = second.end;
    if parenthesized {
        if index >= source.chars.len() || source.chars[index] != ')' {
            return PointValue::Error(make_sql_error(FLOAT_INPUT_INVALID));
        };
        index = geometry_input_space(&source, index + 1);
    };
    if index != source.chars.len() {
        return PointValue::Error(make_sql_error(FLOAT_INPUT_INVALID));
    };
    sql__pg_catalog__point__db27(first_value, second_value)
}
pub fn point_from_text(input: TextValue) -> PointValue {
    if let TextValue::Error(error) = input {
        return PointValue::Error(error);
    };
    if input == TextValue::Null {
        return PointValue::Null;
    };
    if let TextValue::Value(value) = input {
        return point_parse(value.as_str());
    };
    PointValue::Unknown
}
