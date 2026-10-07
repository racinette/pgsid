pub fn sql__pg_catalog__text__vc4r(input: TextValue) -> TextValue {
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
    TextValue::Unknown
}
