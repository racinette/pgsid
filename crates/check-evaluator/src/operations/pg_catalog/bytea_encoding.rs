const BYTEA_ENCODING_ERROR: u32 = 3452619;
const BYTEA_SYNTAX_ERROR: u32 = 3484946;
const BYTEA_CODEC_LIMIT: u32 = 8584704;

fn bytea_codec_length_fits(length: i64) -> bool {
    length <= 1073741819i64
}

fn bytea_base64_encoded_length(length: i64) -> i64 {
    (length + 2i64) / 3i64 * 4i64 + length / 57i64
}

fn bytea_codec_utf8_length(value: &str) -> i64 {
    let chars: Vec<char> = value.chars().collect();
    let mut index: usize = 0;
    let mut length: i64 = 0i64;
    while index < chars.len() {
        let codepoint = chars[index] as i32;
        if codepoint <= 127 {
            length = length + 1i64;
        } else if codepoint <= 2047 {
            length = length + 2i64;
        } else if codepoint <= 65535 {
            length = length + 3i64;
        } else {
            length = length + 4i64;
        }
        index += 1;
    }
    length
}

fn bytea_escape_encoded_length(value: &str) -> i64 {
    let chars: Vec<char> = value.chars().collect();
    let mut index: usize = 0;
    let mut length: i64 = 0i64;
    while index < chars.len() {
        let high = hex_digit(chars[index]);
        let low = hex_digit(chars[index + 1]);
        let byte = high * 16 + low;
        if byte == 0 || byte >= 128 {
            length = length + 4i64;
        } else if byte == 92 {
            length = length + 2i64;
        } else {
            length = length + 1i64;
        }
        index = index + 2;
    }
    length
}

fn bytea_format_is(input: &str, expected: &str) -> bool {
    let chars: Vec<char> = input.chars().collect();
    let spelling: Vec<char> = expected.chars().collect();
    if chars.len() != spelling.len() {
        return false;
    }
    let mut index: usize = 0;
    while index < chars.len() {
        if chars[index].to_ascii_lowercase() != spelling[index] {
            return false;
        }
        index += 1;
    }
    true
}

fn bytea_codec_space(value: char) -> bool {
    value == ' ' || value == '\t' || value == '\r' || value == '\n'
}

fn bytea_base64_digit(value: char) -> i32 {
    let alphabet: Vec<char> = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
        .chars()
        .collect();
    let mut index: usize = 0;
    let mut number: i32 = 0;
    while index < alphabet.len() {
        if alphabet[index] == value {
            return number;
        }
        index += 1;
        number = number + 1;
    }
    -1
}

fn bytea_base64_character(value: i32) -> char {
    let alphabet: Vec<char> = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
        .chars()
        .collect();
    let mut index: usize = 0;
    let mut remaining = value;
    while remaining > 0 {
        index += 1;
        remaining = remaining - 1;
    }
    alphabet[index]
}

fn bytea_base64_encode(value: &str) -> String {
    let chars: Vec<char> = value.chars().collect();
    let mut output = String::new();
    let mut index: usize = 0;
    let mut packed: i32 = 0;
    let mut count: i32 = 0;
    let mut line: i32 = 0;
    while index < chars.len() {
        let high = hex_digit(chars[index]);
        let low = hex_digit(chars[index + 1]);
        let byte = high * 16 + low;
        packed = packed * 256 + byte;
        count = count + 1;
        index = index + 2;
        if count == 3 {
            let a = bytea_base64_character(packed / 262144);
            let b = bytea_base64_character(packed / 4096 % 64);
            let c = bytea_base64_character(packed / 64 % 64);
            let d = bytea_base64_character(packed % 64);
            output.push(a);
            output.push(b);
            output.push(c);
            output.push(d);
            packed = 0;
            count = 0;
            line = line + 4;
            if line == 76 {
                output.push('\n');
                line = 0;
            }
        }
    }
    if count != 0 {
        if count == 1 {
            packed = packed * 65536;
        } else {
            packed = packed * 256;
        }
        let a = bytea_base64_character(packed / 262144);
        let b = bytea_base64_character(packed / 4096 % 64);
        output.push(a);
        output.push(b);
        if count == 2 {
            let c = bytea_base64_character(packed / 64 % 64);
            output.push(c);
        } else {
            output.push('=');
        }
        output.push('=');
    }
    output
}

fn bytea_base64_decode(value: &str) -> ByteaValue {
    let chars: Vec<char> = value.chars().collect();
    let mut output = String::new();
    let mut index: usize = 0;
    let mut packed: i32 = 0;
    let mut count: i32 = 0;
    let mut end: i32 = 0;
    while index < chars.len() {
        let character = chars[index];
        index += 1;
        if bytea_codec_space(character) == false {
            let mut digit: i32 = 0;
            if character == '=' {
                if end == 0 {
                    if count == 2 {
                        end = 1;
                    } else if count == 3 {
                        end = 2;
                    } else {
                        return ByteaValue::Error(make_sql_error(BYTEA_ENCODING_ERROR));
                    };
                }
            } else {
                digit = bytea_base64_digit(character);
                if digit < 0 {
                    return ByteaValue::Error(make_sql_error(BYTEA_ENCODING_ERROR));
                }
            }
            packed = packed * 64 + digit;
            count = count + 1;
            if count == 4 {
                output = bytea_append_byte(output, packed / 65536 % 256);
                if end == 0 || end > 1 {
                    output = bytea_append_byte(output, packed / 256 % 256);
                }
                if end == 0 || end > 2 {
                    output = bytea_append_byte(output, packed % 256);
                }
                packed = 0;
                count = 0;
            }
        }
    }
    if count != 0 {
        return ByteaValue::Error(make_sql_error(BYTEA_ENCODING_ERROR));
    }
    ByteaValue::Value(output)
}

fn bytea_hex_decode(value: &str) -> ByteaValue {
    let chars: Vec<char> = value.chars().collect();
    let mut output = String::new();
    let mut index: usize = 0;
    while index < chars.len() {
        if bytea_codec_space(chars[index]) {
            index += 1;
        } else {
            let high = hex_digit(chars[index]);
            index += 1;
            if high > 15 || index >= chars.len() {
                return ByteaValue::Error(make_sql_error(BYTEA_ENCODING_ERROR));
            }
            let low = hex_digit(chars[index]);
            index += 1;
            if low > 15 {
                return ByteaValue::Error(make_sql_error(BYTEA_ENCODING_ERROR));
            }
            output = bytea_append_byte(output, high * 16 + low);
        };
    }
    ByteaValue::Value(output)
}

fn bytea_octal_digit(value: char) -> i32 {
    if value == '0' {
        return 0;
    }
    if value == '1' {
        return 1;
    }
    if value == '2' {
        return 2;
    }
    if value == '3' {
        return 3;
    }
    if value == '4' {
        return 4;
    }
    if value == '5' {
        return 5;
    }
    if value == '6' {
        return 6;
    }
    if value == '7' {
        return 7;
    }
    8
}

fn bytea_escape_decoded_length(value: &str) -> Int8Value {
    let chars: Vec<char> = value.chars().collect();
    let mut index: usize = 0;
    let mut length: i64 = 0i64;
    while index < chars.len() {
        let character = chars[index];
        index += 1;
        if character != '\\' {
            let codepoint = character as i32;
            if codepoint <= 127 {
                length = length + 1i64;
            } else if codepoint <= 2047 {
                length = length + 2i64;
            } else if codepoint <= 65535 {
                length = length + 3i64;
            } else {
                length = length + 4i64;
            };
        } else if index + 2 < chars.len()
            && bytea_octal_digit(chars[index]) <= 3
            && bytea_octal_digit(chars[index + 1]) <= 7
            && bytea_octal_digit(chars[index + 2]) <= 7
        {
            index = index + 3;
            length = length + 1i64;
        } else if index < chars.len() && chars[index] == '\\' {
            index += 1;
            length = length + 1i64;
        } else {
            return Int8Value::Error(make_sql_error(BYTEA_SYNTAX_ERROR));
        };
    }
    Int8Value::Value(length)
}

fn bytea_escape_decode(value: &str) -> ByteaValue {
    let chars: Vec<char> = value.chars().collect();
    let mut output = String::new();
    let mut index: usize = 0;
    while index < chars.len() {
        let character = chars[index];
        index += 1;
        if character != '\\' {
            output = bytea_utf8_character(output, character);
        } else if index < chars.len() && chars[index] == '\\' {
            output = bytea_append_byte(output, 92);
            index += 1;
        } else if index + 2 < chars.len() {
            let a = bytea_octal_digit(chars[index]);
            let b = bytea_octal_digit(chars[index + 1]);
            let c = bytea_octal_digit(chars[index + 2]);
            if a > 3 || b > 7 || c > 7 {
                return ByteaValue::Error(make_sql_error(BYTEA_SYNTAX_ERROR));
            }
            output = bytea_append_byte(output, a * 64 + b * 8 + c);
            index = index + 3;
        } else {
            return ByteaValue::Error(make_sql_error(BYTEA_SYNTAX_ERROR));
        };
    }
    ByteaValue::Value(output)
}

fn bytea_escape_encode(value: &str) -> String {
    let chars: Vec<char> = value.chars().collect();
    let mut output = String::new();
    let mut index: usize = 0;
    while index < chars.len() {
        let high = hex_digit(chars[index]);
        let low = hex_digit(chars[index + 1]);
        let byte = high * 16 + low;
        if byte == 0 || byte >= 128 {
            output.push('\\');
            let a = bytea_ascii_character(byte / 64 + 48);
            let b = bytea_ascii_character(byte / 8 % 8 + 48);
            let c = bytea_ascii_character(byte % 8 + 48);
            output.push(a);
            output.push(b);
            output.push(c);
        } else if byte == 92 {
            output.push('\\');
            output.push('\\');
        } else {
            let character = bytea_ascii_character(byte);
            output.push(character);
        }
        index = index + 2;
    }
    output
}

pub fn sql__pg_catalog__encode__bvkp(input: ByteaValue, format: TextValue) -> TextValue {
    if let ByteaValue::Error(error) = input {
        return TextValue::Error(error);
    }
    if let TextValue::Error(error) = format {
        return TextValue::Error(error);
    }
    if input == ByteaValue::Unknown || format == TextValue::Unknown {
        return TextValue::Unknown;
    }
    if input == ByteaValue::Null || format == TextValue::Null {
        return TextValue::Null;
    }
    if let ByteaValue::Value(value) = input {
        if let TextValue::Value(name) = format {
            if bytea_format_is(name.as_str(), "hex") {
                let length = bytea_payload_length(value.as_str());
                let encoded = length as i64;
                if bytea_codec_length_fits(encoded * 2i64) == false {
                    return TextValue::Error(make_sql_error(BYTEA_CODEC_LIMIT));
                }
                return TextValue::Value(value);
            }
            if bytea_format_is(name.as_str(), "base64") {
                let length = bytea_payload_length(value.as_str());
                let bytes = length as i64;
                let encoded = bytea_base64_encoded_length(bytes);
                if bytea_codec_length_fits(encoded) == false {
                    return TextValue::Error(make_sql_error(BYTEA_CODEC_LIMIT));
                }
                let result = bytea_base64_encode(value.as_str());
                return TextValue::Value(result);
            }
            if bytea_format_is(name.as_str(), "escape") {
                let encoded = bytea_escape_encoded_length(value.as_str());
                if bytea_codec_length_fits(encoded) == false {
                    return TextValue::Error(make_sql_error(BYTEA_CODEC_LIMIT));
                }
                let result = bytea_escape_encode(value.as_str());
                return TextValue::Value(result);
            }
            return TextValue::Error(make_sql_error(BYTEA_ENCODING_ERROR));
        }
    }
    TextValue::Unknown
}

pub fn sql__pg_catalog__decode__b6gt(input: TextValue, format: TextValue) -> ByteaValue {
    if let TextValue::Error(error) = input {
        return ByteaValue::Error(error);
    }
    if let TextValue::Error(error) = format {
        return ByteaValue::Error(error);
    }
    if input == TextValue::Unknown || format == TextValue::Unknown {
        return ByteaValue::Unknown;
    }
    if input == TextValue::Null || format == TextValue::Null {
        return ByteaValue::Null;
    }
    if let TextValue::Value(value) = input {
        if let TextValue::Value(name) = format {
            if bytea_format_is(name.as_str(), "hex") {
                let bytes = bytea_codec_utf8_length(value.as_str());
                if bytea_codec_length_fits(bytes / 2i64) == false {
                    return ByteaValue::Error(make_sql_error(BYTEA_CODEC_LIMIT));
                }
                return bytea_hex_decode(value.as_str());
            }
            if bytea_format_is(name.as_str(), "base64") {
                let bytes = bytea_codec_utf8_length(value.as_str());
                if bytea_codec_length_fits(bytes * 3i64 / 4i64) == false {
                    return ByteaValue::Error(make_sql_error(BYTEA_CODEC_LIMIT));
                }
                return bytea_base64_decode(value.as_str());
            }
            if bytea_format_is(name.as_str(), "escape") {
                let estimate = bytea_escape_decoded_length(value.as_str());
                if let Int8Value::Error(error) = estimate {
                    return ByteaValue::Error(error);
                }
                if let Int8Value::Value(length) = estimate {
                    if bytea_codec_length_fits(length) == false {
                        return ByteaValue::Error(make_sql_error(BYTEA_CODEC_LIMIT));
                    }
                }
                return bytea_escape_decode(value.as_str());
            }
            return ByteaValue::Error(make_sql_error(BYTEA_ENCODING_ERROR));
        }
    }
    ByteaValue::Unknown
}
