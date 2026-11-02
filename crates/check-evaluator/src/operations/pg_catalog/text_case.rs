fn text_case_value(input: TextValue, mode: i32) -> TextValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = input { unresolved_flavor = 1; };
    if let TextValue::NonNull = input { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TextValue::Unimplemented = input { unresolved_flavor = 2; };
    if let TextValue::Error(error) = input {
        return TextValue::Error(error);
    }
    let mut condition_flavor_8_4: i32 = unresolved_flavor; if let TextValue::Unknown = input { if condition_flavor_8_4 < 1 { condition_flavor_8_4 = 1; }; }; if let TextValue::Unimplemented = input { condition_flavor_8_4 = 2; }; if (input == TextValue::Unknown || input == TextValue::Unimplemented) || input == TextValue::NonNull {
        return text_unresolved(condition_flavor_8_4);
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
    text_unresolved(unresolved_flavor)
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
