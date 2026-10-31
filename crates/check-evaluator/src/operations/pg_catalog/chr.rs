const CHR_INVALID_PARAMETER: u32 = 3452619;
const CHR_PROGRAM_LIMIT: u32 = 8584704;

pub fn sql__pg_catalog__chr__23bn(input: Int4Value) -> TextValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int4Value::Unknown = input { unresolved_flavor = 1; };
    if let Int4Value::Unimplemented = input { unresolved_flavor = 2; };
    if let Int4Value::Error(error) = input {
        return TextValue::Error(error);
    }
    let mut condition_flavor_11_4: i32 = unresolved_flavor; if let Int4Value::Unknown = input { if condition_flavor_11_4 < 1 { condition_flavor_11_4 = 1; }; }; if let Int4Value::Unimplemented = input { condition_flavor_11_4 = 2; }; if (input == Int4Value::Unknown || input == Int4Value::Unimplemented) {
        return text_unresolved(condition_flavor_11_4);
    }
    if input == Int4Value::Null {
        return TextValue::Null;
    }
    if let Int4Value::Value(value) = input {
        if value < 0 {
            return TextValue::Error(make_sql_error(CHR_INVALID_PARAMETER));
        }
        if value == 0 || value > 1114111 || (value >= 55296 && value <= 57343) {
            return TextValue::Error(make_sql_error(CHR_PROGRAM_LIMIT));
        }
        let character = char::from_u32(value as u32).unwrap_or('\0');
        let mut output = String::new();
        output.push(character);
        return TextValue::Value(output);
    }
    text_unresolved(unresolved_flavor)
}

pub fn chr_context(input: Int4Value, utf8: bool) -> TextValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int4Value::Unknown = input { unresolved_flavor = 1; };
    if let Int4Value::Unimplemented = input { unresolved_flavor = 2; };
    let value = sql__pg_catalog__chr__23bn(input);
    if utf8 == false {
        if let Int4Value::Value(code) = input {
            if code > 127 {
                if let TextValue::Value(_) = value {
                    return text_unresolved(resolution_context(unresolved_flavor));
                }
            }
        }
    }
    value
}
