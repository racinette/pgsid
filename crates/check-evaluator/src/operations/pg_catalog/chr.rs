const CHR_INVALID_PARAMETER: u32 = 3452619;
const CHR_PROGRAM_LIMIT: u32 = 8584704;

pub fn sql__pg_catalog__chr__23bn(input: Int4Value) -> TextValue {
    if let Int4Value::Error(error) = input {
        return TextValue::Error(error);
    }
    if input == Int4Value::Unknown {
        return TextValue::Unknown;
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
    TextValue::Unknown
}
