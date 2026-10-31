pub fn sql__pg_catalog__text__vc4r(input: TextValue) -> TextValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = input { unresolved_flavor = 1; };
    if let TextValue::Unimplemented = input { unresolved_flavor = 2; };
    if let TextValue::Error(error) = input {
        return TextValue::Error(error);
    }
    let mut condition_flavor_8_4: i32 = unresolved_flavor; if let TextValue::Unknown = input { if condition_flavor_8_4 < 1 { condition_flavor_8_4 = 1; }; }; if let TextValue::Unimplemented = input { condition_flavor_8_4 = 2; }; if ((input == TextValue::Unknown || input == TextValue::Unimplemented) || input == TextValue::NonNull) {
        return text_unresolved(condition_flavor_8_4);
    }
    if input == TextValue::Null {
        return TextValue::Null;
    }
    if let TextValue::Value(value) = input {
        let chars: Vec<char> = value.chars().collect();
        let mut end = chars.len();
        while end > 0 && chars[end - 1] == ' ' {
            end = end - 1;
        }
        let mut output = String::new();
        let mut index: usize = 0;
        while index < end {
            output.push(chars[index]);
            index += 1;
        }
        return TextValue::Value(output);
    }
    text_unresolved(unresolved_flavor)
}
