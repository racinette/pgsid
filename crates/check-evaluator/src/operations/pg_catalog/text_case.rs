fn text_case_value(input: TextValue, mode: i32) -> TextValue {
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
        let mut previous_alphanumeric = false;
        let mut index: usize = 0;
        while index < characters.len() {
            let original = characters[index];
            let code = original as i32;
            let uppercase = mode == 1 || (mode == 2 && previous_alphanumeric == false);
            let mut character = original.to_ascii_lowercase();
            if uppercase {
                character = original;
                if code >= 97 && code <= 122 {
                    let upper_code = code - 32;
                    character = char::from_u32(upper_code as u32).unwrap_or(original);
                }
            }
            output.push(character);
            previous_alphanumeric = (code >= 65 && code <= 90)
                || (code >= 97 && code <= 122)
                || (code >= 48 && code <= 57);
            index += 1;
        }
        return TextValue::Value(output);
    }
    TextValue::Unknown
}

pub fn sql__pg_catalog__casefold__bgkh(input: TextValue) -> TextValue {
    text_case_value(input, 0)
}

pub fn sql__pg_catalog__initcap__fyn6(input: TextValue) -> TextValue {
    text_case_value(input, 2)
}

pub fn sql__pg_catalog__lower__hcg0(input: TextValue) -> TextValue {
    text_case_value(input, 0)
}

pub fn sql__pg_catalog__upper__valc(input: TextValue) -> TextValue {
    text_case_value(input, 1)
}
