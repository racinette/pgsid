pub fn sql__pg_catalog__ascii__7m47(input: TextValue) -> Int4Value {
    if let TextValue::Error(error) = input {
        return Int4Value::Error(error);
    }
    if input == TextValue::Unknown {
        return Int4Value::Unknown;
    }
    if input == TextValue::Null {
        return Int4Value::Null;
    }
    if let TextValue::Value(value) = input {
        let chars: Vec<char> = value.chars().collect();
        if chars.len() == 0 {
            return Int4Value::Value(0);
        }
        let code = chars[0] as i32;
        return Int4Value::Value(code);
    }
    Int4Value::Unknown
}
