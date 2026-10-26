const BYTEA_OUTPUT_ALLOCATION_ERROR: u32 = 56966976;
const BYTEA_OUTPUT_LIMIT_ERROR: u32 = 8584704;

pub fn bytea_output_context(input: ByteaValue, format: i32, sql_text: bool) -> TextValue {
    if let ByteaValue::Error(error) = input { return TextValue::Error(error); };
    if input == ByteaValue::Null { return TextValue::Null; };
    if let ByteaValue::Value(value) = input {
        let characters: Vec<char> = value.chars().collect();
        let mut hex_length: i64 = 2i64;
        let mut escape_length: i64 = 0i64;
        let mut index: usize = 0;
        while index < characters.len() {
            let byte = hex_digit(characters[index])*16+hex_digit(characters[index+1]);
            hex_length = hex_length+2i64;
            if byte < 32 || byte > 126 { escape_length = escape_length+4i64; }
            else if byte == 92 { escape_length = escape_length+2i64; }
            else { escape_length = escape_length+1i64; };
            index += 2;
        }
        if format != 1 && format != 2 {
            let mut maximum = 1073741822i64;
            if sql_text { maximum = 1073741819i64; };
            if hex_length <= maximum && escape_length <= maximum { return TextValue::NonNull; };
            return TextValue::Unknown;
        };
        let mut length = hex_length;
        if format == 2 { length = escape_length; };
        if length > 1073741822i64 {
            if format == 2 { return TextValue::Error(make_sql_error(BYTEA_OUTPUT_LIMIT_ERROR)); };
            return TextValue::Error(make_sql_error(BYTEA_OUTPUT_ALLOCATION_ERROR));
        };
        if sql_text && length > 1073741819i64 { return TextValue::Error(make_sql_error(BYTEA_OUTPUT_ALLOCATION_ERROR)); };
        let mut output = String::new();
        if format == 1 {
            output.push('\\'); output.push('x'); output.push_str(value.as_str());
            return TextValue::Value(output);
        };
        index = 0;
        while index < characters.len() {
            let byte = hex_digit(characters[index])*16+hex_digit(characters[index+1]);
            if byte < 32 || byte > 126 {
                output.push('\\');
                output.push(bytea_ascii_character(byte/64+48));
                output.push(bytea_ascii_character(byte/8%8+48));
                output.push(bytea_ascii_character(byte%8+48));
            } else if byte == 92 { output.push('\\'); output.push('\\'); }
            else { output.push(bytea_ascii_character(byte)); };
            index += 2;
        }
        return TextValue::Value(output);
    };
    TextValue::Unknown
}
