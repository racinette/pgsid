// Portions Copyright (c) 1999-2025, PostgreSQL Global Development Group.
const ASCII_UNDEFINED_ENCODING: u32 = 6820852;
const ASCII_UNSUPPORTED_ENCODING: u32 = 466560;

// The server's other encoding names, each valid but not convertible to ASCII.
const ASCII_OTHER_ENCODING_NAMES: &[&str] = &[
    "abc", "alt", "big5", "euccn", "eucjis2004", "eucjp", "euckr", "euctw", "gb18030", "gbk",
    "iso885910", "iso885913", "iso885914", "iso885916", "iso88593", "iso88594", "iso88595",
    "iso88596", "iso88597", "iso88598", "iso88599", "johab", "koi8", "koi8r", "koi8u", "latin10",
    "latin3", "latin4", "latin5", "latin6", "latin7", "latin8", "mskanji", "muleinternal",
    "shiftjis", "shiftjis2004", "sjis", "sqlascii", "tcvn", "tcvn5712", "uhc", "unicode", "utf8",
    "vscii", "win", "win1251", "win1252", "win1253", "win1254", "win1255", "win1256", "win1257",
    "win1258", "win866", "win874", "win932", "win936", "win949", "win950", "windows1251",
    "windows1252", "windows1253", "windows1254", "windows1255", "windows1256", "windows1257",
    "windows1258", "windows866", "windows874", "windows932", "windows936", "windows949",
    "windows950",
];

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
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = value { unresolved_flavor = 1; };
    if let TextValue::NonNull = value { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TextValue::Unimplemented = value { unresolved_flavor = 2; };
    if let TextValue::Error(error) = value {
        return TextValue::Error(error);
    }
    let mut condition_flavor_96_4: i32 = unresolved_flavor; if let TextValue::Unknown = value { if condition_flavor_96_4 < 1 { condition_flavor_96_4 = 1; }; }; if let TextValue::Unimplemented = value { condition_flavor_96_4 = 2; }; if (value == TextValue::Unknown || value == TextValue::Unimplemented) || value == TextValue::NonNull {
        return text_unresolved(condition_flavor_96_4);
    }
    if value == TextValue::Null {
        return TextValue::Null;
    }
    TextValue::Error(make_sql_error(ASCII_UNSUPPORTED_ENCODING))
}

pub fn sql__pg_catalog__to_ascii__uqov(value: TextValue, encoding: Int4Value) -> TextValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = value { unresolved_flavor = 1; };
    if let TextValue::NonNull = value { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let Int4Value::Unknown = encoding { unresolved_flavor = 1; };
    if let TextValue::Unimplemented = value { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = encoding { unresolved_flavor = 2; };
    if let TextValue::Error(error) = value {
        return TextValue::Error(error);
    }
    if let Int4Value::Error(error) = encoding {
        return TextValue::Error(error);
    }
    let mut condition_flavor_117_4: i32 = unresolved_flavor; if let TextValue::Unknown = value { if condition_flavor_117_4 < 1 { condition_flavor_117_4 = 1; }; }; if let TextValue::Unimplemented = value { condition_flavor_117_4 = 2; }; if let Int4Value::Unknown = encoding { if condition_flavor_117_4 < 1 { condition_flavor_117_4 = 1; }; }; if let Int4Value::Unimplemented = encoding { condition_flavor_117_4 = 2; }; if ((value == TextValue::Unknown || value == TextValue::Unimplemented) || value == TextValue::NonNull) || (encoding == Int4Value::Unknown || encoding == Int4Value::Unimplemented) {
        return text_unresolved(condition_flavor_117_4);
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
    text_unresolved(unresolved_flavor)
}

// The server keeps only alphanumeric characters of an encoding name, lowering ASCII letters, and
// looks the rest up. Returns the encoding, 0 for a name it cannot convert, -1 for no encoding and
// -2 when the answer depends on whether the server's C library counts a non-ASCII byte as
// alphanumeric.
fn ascii_encoding_name(name: &str) -> i32 {
    let characters: Vec<char> = name.chars().collect();
    let mut key = String::new();
    let mut foreign = false;
    let mut index: usize = 0;
    while index < characters.len() {
        let character = characters[index];
        let code = character as i32;
        if (code >= 48 && code <= 57) || (code >= 97 && code <= 122) {
            key.push(character);
        } else if code >= 65 && code <= 90 {
            key.push(char::from_u32((code + 32) as u32).unwrap_or(' '));
        } else if code >= 128 {
            foreign = true;
        };
        index += 1;
    }
    let mut encoding: i32 = -1;
    if key == "latin1" || key == "iso88591" {
        encoding = 8;
    } else if key == "latin2" || key == "iso88592" {
        encoding = 9;
    } else if key == "latin9" || key == "iso885915" {
        encoding = 16;
    } else if key == "win1250" || key == "windows1250" {
        encoding = 29;
    } else {
        index = 0;
        while index < ASCII_OTHER_ENCODING_NAMES.len() {
            if ASCII_OTHER_ENCODING_NAMES[index] == key.as_str() {
                encoding = 0;
            };
            index += 1;
        }
    };
    if foreign && encoding != -1 {
        return -2;
    };
    encoding
}

pub fn sql__pg_catalog__to_ascii__654m(value: TextValue, encoding: TextValue) -> TextValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = value { unresolved_flavor = 1; };
    if let TextValue::NonNull = value { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TextValue::Unknown = encoding { unresolved_flavor = 1; };
    if let TextValue::NonNull = encoding { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TextValue::Unimplemented = value { unresolved_flavor = 2; };
    if let TextValue::Unimplemented = encoding { unresolved_flavor = 2; };
    if let TextValue::Error(error) = value {
        return TextValue::Error(error);
    }
    if let TextValue::Error(error) = encoding {
        return TextValue::Error(error);
    }
    if value == TextValue::Null || encoding == TextValue::Null {
        return TextValue::Null;
    }
    if let TextValue::Value(text) = value {
        if let TextValue::Value(name) = encoding {
            let code = ascii_encoding_name(name.as_str());
            if code == -2 {
                return text_unresolved(resolution_context(unresolved_flavor));
            }
            if code == -1 {
                return TextValue::Error(make_sql_error(ASCII_UNDEFINED_ENCODING));
            }
            if code == 0 {
                return TextValue::Error(make_sql_error(ASCII_UNSUPPORTED_ENCODING));
            }
            return TextValue::Value(ascii_encoding_text(text, code));
        }
    }
    text_unresolved(unresolved_flavor)
}
