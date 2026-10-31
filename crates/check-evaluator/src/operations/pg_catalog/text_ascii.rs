pub fn sql__pg_catalog__ascii__7m47(input: TextValue) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = input { unresolved_flavor = 1; };
    if let TextValue::NonNull = input { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TextValue::Unimplemented = input { unresolved_flavor = 2; };
    if let TextValue::Error(error) = input {
        return Int4Value::Error(error);
    }
    let mut condition_flavor_8_4: i32 = unresolved_flavor; if let TextValue::Unknown = input { if condition_flavor_8_4 < 1 { condition_flavor_8_4 = 1; }; }; if let TextValue::Unimplemented = input { condition_flavor_8_4 = 2; }; if ((input == TextValue::Unknown || input == TextValue::Unimplemented) || input == TextValue::NonNull) {
        return int4_unresolved(condition_flavor_8_4);
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
    int4_unresolved(unresolved_flavor)
}

pub fn ascii_context(input: TextValue, utf8: bool) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = input { unresolved_flavor = 1; };
    if let TextValue::NonNull = input { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TextValue::Unimplemented = input { unresolved_flavor = 2; };
    let value = sql__pg_catalog__ascii__7m47(input);
    if utf8 == false {
        if let Int4Value::Value(code) = value {
            if code > 127 {
                return int4_unresolved(resolution_context(unresolved_flavor));
            }
        }
    }
    value
}
