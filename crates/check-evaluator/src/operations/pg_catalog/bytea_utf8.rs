fn bytea_utf8_character(output: String, character: char) -> String {
    let code = character as i32;
    let mut result = output;
    if code < 128 {
        result = bytea_append_byte(result, code);
    } else if code < 2048 {
        result = bytea_append_byte(result, 192 + code / 64);
        result = bytea_append_byte(result, 128 + code % 64);
    } else if code < 65536 {
        result = bytea_append_byte(result, 224 + code / 4096);
        result = bytea_append_byte(result, 128 + code / 64 % 64);
        result = bytea_append_byte(result, 128 + code % 64);
    } else {
        result = bytea_append_byte(result, 240 + code / 262144);
        result = bytea_append_byte(result, 128 + code / 4096 % 64);
        result = bytea_append_byte(result, 128 + code / 64 % 64);
        result = bytea_append_byte(result, 128 + code % 64);
    }
    result
}
