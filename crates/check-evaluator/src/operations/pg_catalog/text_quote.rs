const TEXT_QUOTE_ALLOCATION_ERROR: u32 = 56966976;

fn quote_literal_capacity(bytes: i64, sql_text: bool) -> bool {
    let mut maximum: i64 = 536870909i64;
    if sql_text {
        maximum = 536870908i64;
    };
    bytes <= maximum
}

pub(crate) fn quote_literal_output(input: TextValue, sql_text: bool) -> TextValue {
    if let TextValue::Error(error) = input {
        return TextValue::Error(error);
    }
    if (input == TextValue::Unknown || input == TextValue::NonNull) {
        return TextValue::Unknown;
    }
    if input == TextValue::Null {
        return TextValue::Null;
    }
    if let TextValue::Value(text) = input {
        let bytes = text_build_octets(text.as_str());
        if quote_literal_capacity(bytes, sql_text) == false {
            return TextValue::Error(make_sql_error(TEXT_QUOTE_ALLOCATION_ERROR));
        }
        let characters: Vec<char> = text.chars().collect();
        let mut escaped = false;
        let mut index: usize = 0;
        while index < characters.len() {
            if characters[index] == '\\' {
                escaped = true;
            }
            index += 1;
        }
        let mut output = String::new();
        if escaped {
            output.push('E');
        }
        output.push('\'');
        index = 0;
        while index < characters.len() {
            let character = characters[index];
            if character == '\'' || character == '\\' {
                output.push(character);
            }
            output.push(character);
            index += 1;
        }
        output.push('\'');
        return TextValue::Value(output);
    }
    TextValue::Unknown
}

pub fn sql__pg_catalog__quote_literal__d0rq(input: TextValue) -> TextValue {
    quote_literal_output(input, true)
}
