pub(crate) fn bit_from_text_modifier(
    input: TextValue,
    width: i32,
    varying: bool,
    utf8: bool,
) -> BitValue {
    if let TextValue::Value(value) = input {
        let characters: Vec<char> = value.chars().collect();
        let mut index: usize = 0;
        while index < characters.len() {
            let character = characters[index] as i32;
            if character > 127 && utf8 == false {
                return BitValue::Unknown;
            };
            index += 1;
        }
        let mut length = text_build_octets(value.as_str());
        let mut hexadecimal = false;
        if characters.len() > 0 {
            let first = characters[0];
            if first == 'b' || first == 'B' || first == 'x' || first == 'X' {
                length = length - 1i64;
            };
            if first == 'x' || first == 'X' {
                hexadecimal = true;
            };
        };
        if hexadecimal {
            let maximum = BIT_MAX_LENGTH as i64;
            if length > maximum / 4i64 {
                return BitValue::Error(make_sql_error(BIT_PROGRAM_LIMIT_EXCEEDED));
            };
            length = length * 4i64;
        };
        let requested = width as i64;
        if width > 0 {
            if varying && length > requested {
                return BitValue::Error(make_sql_error(BIT_STRING_RIGHT_TRUNCATION));
            };
            if varying == false && length != requested {
                return BitValue::Error(make_sql_error(BIT_STRING_LENGTH_MISMATCH));
            };
        };
        return bit_from_text(TextValue::Value(value));
    };
    bit_from_text(input)
}
