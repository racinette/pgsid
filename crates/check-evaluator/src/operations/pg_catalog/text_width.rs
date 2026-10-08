const TEXT_WIDTH_TRUNCATION_ERROR: u32 = 3452545;
const TEXT_WIDTH_ALLOCATION_ERROR: u32 = 56966976;

fn text_width_value(
    input: TextValue,
    modifier: Int4Value,
    explicit: BoolValue,
    fixed: bool,
) -> TextValue {
    if let TextValue::Error(error) = input {
        return TextValue::Error(error);
    }
    if let Int4Value::Error(error) = modifier {
        return TextValue::Error(error);
    }
    if let BoolValue::Error(error) = explicit {
        return TextValue::Error(error);
    }
    if input == TextValue::Unknown
        || modifier == Int4Value::Unknown
        || explicit == BoolValue::Unknown
    {
        return TextValue::Unknown;
    }
    if input == TextValue::Null || modifier == Int4Value::Null || explicit == BoolValue::Null {
        return TextValue::Null;
    }
    if let TextValue::Value(text) = input {
        if let Int4Value::Value(typmod) = modifier {
            if let BoolValue::Value(is_explicit) = explicit {
                if typmod < 4 {
                    return TextValue::Value(text);
                }
                let width = typmod - 4;
                let characters: Vec<char> = text.chars().collect();
                let mut count: i32 = 0;
                let mut index: usize = 0;
                while index < characters.len() {
                    count = count + 1;
                    index += 1;
                }
                if count == width || (fixed == false && count < width) {
                    return TextValue::Value(text);
                }
                if count < width {
                    let padding = width - count;
                    let output_size = text_build_octets(text.as_str()) + padding as i64;
                    if output_size > 1073741819i64 {
                        return TextValue::Error(make_sql_error(TEXT_WIDTH_ALLOCATION_ERROR));
                    }
                    let mut output = text;
                    while count < width {
                        output.push(' ');
                        count = count + 1;
                    }
                    return TextValue::Value(output);
                }
                let mut output = String::new();
                let mut position: i32 = 0;
                index = 0;
                while index < characters.len() {
                    if position < width {
                        output.push(characters[index]);
                    } else {
                        if is_explicit == false && characters[index] != ' ' {
                            return TextValue::Error(make_sql_error(TEXT_WIDTH_TRUNCATION_ERROR));
                        }
                    };
                    position = position + 1;
                    index += 1;
                }
                return TextValue::Value(output);
            }
        }
    }
    TextValue::Unknown
}

pub fn sql__pg_catalog__bpchar__2uas(
    input: TextValue,
    modifier: Int4Value,
    explicit: BoolValue,
) -> TextValue {
    text_width_value(input, modifier, explicit, true)
}

pub fn sql__pg_catalog__varchar__2rhn(
    input: TextValue,
    modifier: Int4Value,
    explicit: BoolValue,
) -> TextValue {
    text_width_value(input, modifier, explicit, false)
}
