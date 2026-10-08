// Portions Copyright (c) 1999-2025, PostgreSQL Global Development Group.
const ASCII_UNDEFINED_ENCODING: u32 = 6820852;
const ASCII_UNSUPPORTED_ENCODING: u32 = 466560;

const ASCII_LATIN1: &[i32] = &[
    32, 32, 99, 76, 32, 89, 32, 32, 34, 67, 97, 32, 32, 45, 82, 32, 32, 32, 32, 32, 39, 117, 32,
    46, 44, 32, 32, 32, 32, 32, 32, 63, 65, 65, 65, 65, 65, 65, 65, 67, 69, 69, 69, 69, 73, 73, 73,
    73, 32, 78, 79, 79, 79, 79, 79, 120, 79, 85, 85, 85, 85, 89, 84, 66, 97, 97, 97, 97, 97, 97,
    97, 99, 101, 101, 101, 101, 105, 105, 105, 105, 32, 110, 111, 111, 111, 111, 111, 47, 111, 117,
    117, 117, 117, 121, 116, 121,
];

const ASCII_LATIN2: &[i32] = &[
    32, 65, 32, 76, 32, 76, 83, 32, 34, 83, 83, 84, 90, 45, 90, 90, 32, 97, 44, 108, 39, 108, 115,
    32, 44, 115, 115, 116, 122, 34, 122, 122, 82, 65, 65, 65, 65, 76, 67, 67, 67, 69, 69, 69, 69,
    73, 73, 68, 68, 78, 78, 79, 79, 79, 79, 120, 82, 85, 85, 85, 85, 89, 84, 66, 114, 97, 97, 97,
    97, 108, 99, 99, 99, 101, 101, 101, 101, 105, 105, 100, 100, 110, 110, 111, 111, 111, 111, 47,
    114, 117, 117, 117, 117, 121, 116, 46,
];

const ASCII_LATIN9: &[i32] = &[
    32, 32, 99, 76, 32, 89, 83, 32, 115, 67, 97, 32, 32, 45, 82, 32, 32, 32, 32, 32, 90, 117, 32,
    46, 122, 32, 32, 32, 69, 101, 89, 63, 65, 65, 65, 65, 65, 65, 65, 67, 69, 69, 69, 69, 73, 73,
    73, 73, 32, 78, 79, 79, 79, 79, 79, 120, 79, 85, 85, 85, 85, 89, 84, 66, 97, 97, 97, 97, 97,
    97, 97, 99, 101, 101, 101, 101, 105, 105, 105, 105, 32, 110, 111, 111, 111, 111, 111, 47, 111,
    117, 117, 117, 117, 121, 116, 121,
];

const ASCII_WIN1250: &[i32] = &[
    32, 32, 39, 32, 34, 32, 32, 32, 32, 37, 83, 60, 83, 84, 90, 90, 32, 96, 39, 34, 34, 46, 45, 45,
    32, 32, 115, 62, 115, 116, 122, 122, 32, 32, 32, 76, 32, 65, 32, 32, 34, 67, 83, 32, 32, 45,
    82, 90, 32, 32, 44, 108, 39, 117, 32, 46, 44, 97, 115, 32, 76, 34, 108, 122, 82, 65, 65, 65,
    65, 76, 67, 67, 67, 69, 69, 69, 69, 73, 73, 68, 68, 78, 78, 79, 79, 79, 79, 120, 82, 85, 85,
    85, 85, 89, 84, 66, 114, 97, 97, 97, 97, 108, 99, 99, 99, 101, 101, 101, 101, 105, 105, 100,
    100, 110, 110, 111, 111, 111, 111, 47, 114, 117, 117, 117, 117, 121, 116, 32,
];

fn ascii_encoding_octet(octet: i32, encoding: i32) -> char {
    if octet < 128 {
        return char::from_u32(octet as u32).unwrap_or(' ');
    }
    let mut start: i32 = 160;
    if encoding == 29 {
        start = 128;
    }
    if octet < start {
        return ' ';
    }
    let index = usize::try_from(octet - start).unwrap_or(0);
    let mut mapped: i32 = 0;
    if encoding == 8 {
        mapped = ASCII_LATIN1[index];
    } else if encoding == 9 {
        mapped = ASCII_LATIN2[index];
    } else if encoding == 16 {
        mapped = ASCII_LATIN9[index];
    } else {
        mapped = ASCII_WIN1250[index];
    }
    char::from_u32(mapped as u32).unwrap_or(' ')
}

fn ascii_encoding_text(value: String, encoding: i32) -> String {
    let characters: Vec<char> = value.chars().collect();
    let mut output = String::new();
    let mut index: usize = 0;
    while index < characters.len() {
        let code: i32 = characters[index] as i32;
        if code < 128 {
            output.push(ascii_encoding_octet(code, encoding));
        } else if code < 2048 {
            output.push(ascii_encoding_octet(192 + code / 64, encoding));
            output.push(ascii_encoding_octet(128 + code % 64, encoding));
        } else if code < 65536 {
            output.push(ascii_encoding_octet(224 + code / 4096, encoding));
            output.push(ascii_encoding_octet(128 + code / 64 % 64, encoding));
            output.push(ascii_encoding_octet(128 + code % 64, encoding));
        } else {
            output.push(ascii_encoding_octet(240 + code / 262144, encoding));
            output.push(ascii_encoding_octet(128 + code / 4096 % 64, encoding));
            output.push(ascii_encoding_octet(128 + code / 64 % 64, encoding));
            output.push(ascii_encoding_octet(128 + code % 64, encoding));
        }
        index += 1;
    }
    output
}

pub fn sql__pg_catalog__to_ascii__culg(value: TextValue) -> TextValue {
    if let TextValue::Error(error) = value {
        return TextValue::Error(error);
    }
    if value == TextValue::Unknown {
        return TextValue::Unknown;
    }
    if value == TextValue::Null {
        return TextValue::Null;
    }
    TextValue::Error(make_sql_error(ASCII_UNSUPPORTED_ENCODING))
}

pub fn sql__pg_catalog__to_ascii__uqov(value: TextValue, encoding: Int4Value) -> TextValue {
    if let TextValue::Error(error) = value {
        return TextValue::Error(error);
    }
    if let Int4Value::Error(error) = encoding {
        return TextValue::Error(error);
    }
    if value == TextValue::Unknown || encoding == Int4Value::Unknown {
        return TextValue::Unknown;
    }
    if value == TextValue::Null || encoding == Int4Value::Null {
        return TextValue::Null;
    }
    if let TextValue::Value(text) = value {
        if let Int4Value::Value(code) = encoding {
            if code < 0 || code > 41 {
                return TextValue::Error(make_sql_error(ASCII_UNDEFINED_ENCODING));
            }
            if code != 8 && code != 9 && code != 16 && code != 29 {
                return TextValue::Error(make_sql_error(ASCII_UNSUPPORTED_ENCODING));
            }
            return TextValue::Value(ascii_encoding_text(text, code));
        }
    }
    TextValue::Unknown
}
