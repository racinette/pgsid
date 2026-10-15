#[derive(Clone)]
struct JsonReadSource {
    characters: Vec<char>,
}

#[derive(Clone, Copy)]
struct JsonReadToken {
    start: usize,
    end: usize,
    kind: i32,
}

const JSON_READ_END: i32 = 0;
const JSON_READ_QUOTE: i32 = 1;
const JSON_READ_ATOM: i32 = 2;
const JSON_READ_OBJECT_OPEN: i32 = 3;
const JSON_READ_OBJECT_CLOSE: i32 = 4;
const JSON_READ_ARRAY_OPEN: i32 = 5;
const JSON_READ_ARRAY_CLOSE: i32 = 6;
const JSON_READ_COLON: i32 = 7;
const JSON_READ_COMMA: i32 = 8;
const JSON_READ_ZERO: u32 = 3484949;
const JSON_READ_NON_ARRAY: u32 = 3452619;

fn json_read_space(character: char) -> bool {
    character == ' ' || character == '\t' || character == '\n' || character == '\r'
}

fn json_read_next_token(source: &JsonReadSource, begin: usize) -> JsonReadToken {
    let mut start = begin;
    while start < source.characters.len() && json_read_space(source.characters[start]) {
        start += 1;
    }
    if start == source.characters.len() {
        return JsonReadToken {
            start: start,
            end: start,
            kind: JSON_READ_END,
        };
    };
    let character = source.characters[start];
    let mut kind = JSON_READ_ATOM;
    if character == '{' {
        kind = JSON_READ_OBJECT_OPEN;
    } else if character == '}' {
        kind = JSON_READ_OBJECT_CLOSE;
    } else if character == '[' {
        kind = JSON_READ_ARRAY_OPEN;
    } else if character == ']' {
        kind = JSON_READ_ARRAY_CLOSE;
    } else if character == ':' {
        kind = JSON_READ_COLON;
    } else if character == ',' {
        kind = JSON_READ_COMMA;
    };
    let mut end = start + 1;
    if character == '"' {
        kind = JSON_READ_QUOTE;
        let mut done = false;
        while end < source.characters.len() && done == false {
            let next = source.characters[end];
            end += 1;
            if next == '\\' {
                end += 1;
            } else if next == '"' {
                done = true;
            };
        }
    } else if kind == JSON_READ_ATOM {
        let mut done = false;
        while end < source.characters.len() && done == false {
            let next = source.characters[end];
            if json_read_space(next) || next == ',' || next == ']' || next == '}' {
                done = true;
            } else {
                end += 1;
            };
        }
    };
    JsonReadToken {
        start: start,
        end: end,
        kind: kind,
    }
}

fn json_read_hex(character: char) -> i32 {
    let code = character as i32;
    if code >= 48 && code <= 57 {
        return code - 48;
    };
    if code >= 65 && code <= 70 {
        return code - 55;
    };
    code - 87
}

fn json_read_decode_string(source: &JsonReadSource, token: JsonReadToken) -> TextValue {
    let mut position = token.start + 1;
    let mut high: i32 = -1;
    let mut output = String::new();
    while position + 1 < token.end {
        let character = source.characters[position];
        position += 1;
        if character == '\\' {
            let escape = source.characters[position];
            position += 1;
            if escape == 'u' {
                let mut code: i32 = 0;
                let mut digit: usize = 0;
                while digit < 4 {
                    code = code * 16 + json_read_hex(source.characters[position]);
                    position += 1;
                    digit += 1;
                }
                if code >= 55296 && code <= 56319 {
                    if high >= 0 {
                        return TextValue::Error(make_sql_error(JSON_INVALID_TEXT));
                    };
                    high = code;
                } else {
                    if code >= 56320 && code <= 57343 {
                        if high < 0 {
                            return TextValue::Error(make_sql_error(JSON_INVALID_TEXT));
                        };
                        code = 65536 + (high - 55296) * 1024 + code - 56320;
                        high = -1;
                    };
                    if high >= 0 {
                        return TextValue::Error(make_sql_error(JSON_INVALID_TEXT));
                    };
                    if code == 0 {
                        return TextValue::Error(make_sql_error(JSON_READ_ZERO));
                    };
                    if code > 127 {
                        return TextValue::Unknown;
                    };
                    output.push(char::from_u32(code as u32).unwrap_or(' '));
                };
            } else {
                if high >= 0 {
                    return TextValue::Error(make_sql_error(JSON_INVALID_TEXT));
                };
                let mut decoded = escape;
                if escape == 'b' {
                    decoded = '\u{0008}';
                } else if escape == 'f' {
                    decoded = '\u{000c}';
                } else if escape == 'n' {
                    decoded = '\n';
                } else if escape == 'r' {
                    decoded = '\r';
                } else if escape == 't' {
                    decoded = '\t';
                };
                output.push(decoded);
            };
        } else {
            if high >= 0 {
                return TextValue::Error(make_sql_error(JSON_INVALID_TEXT));
            };
            output.push(character);
        };
    }
    if high >= 0 {
        return TextValue::Error(make_sql_error(JSON_INVALID_TEXT));
    };
    TextValue::Value(output)
}

fn json_read_slice(source: &JsonReadSource, start: usize, end: usize) -> TextValue {
    let mut output = String::new();
    let mut position = start;
    while position < end {
        output.push(source.characters[position]);
        position += 1;
    }
    TextValue::Value(output)
}

fn json_read_array_count(source: &JsonReadSource) -> i64 {
    let mut depth: usize = 0;
    let mut position: usize = 0;
    let mut count: i64 = 0i64;
    let mut expecting = true;
    while position < source.characters.len() {
        let token = json_read_next_token(source, position);
        if token.kind == JSON_READ_END {
            return count;
        };
        if depth == 1 {
            if token.kind == JSON_READ_COMMA {
                expecting = true;
            } else if expecting
                && (token.kind == JSON_READ_QUOTE
                    || token.kind == JSON_READ_ATOM
                    || token.kind == JSON_READ_ARRAY_OPEN
                    || token.kind == JSON_READ_OBJECT_OPEN)
            {
                count = count + 1i64;
                expecting = false;
            };
        };
        if token.kind == JSON_READ_OBJECT_OPEN || token.kind == JSON_READ_ARRAY_OPEN {
            depth += 1;
        } else if token.kind == JSON_READ_OBJECT_CLOSE || token.kind == JSON_READ_ARRAY_CLOSE {
            depth = depth - 1;
        };
        position = token.end;
    }
    count
}

fn json_read_select(value: &str, key: &str, index: i32, object: bool, as_text: bool) -> TextValue {
    let source = JsonReadSource {
        characters: value.chars().collect(),
    };
    let root = json_read_next_token(&source, 0);
    let root_object = root.kind == JSON_READ_OBJECT_OPEN;
    let root_array = root.kind == JSON_READ_ARRAY_OPEN;
    let mut wanted = index as i64;
    if wanted < 0i64 && root_array {
        wanted = json_read_array_count(&source) + wanted;
    };
    let mut depth: usize = 0;
    let mut position: usize = 0;
    let mut state: i32 = 0;
    if root_array {
        state = 2;
    };
    let mut matched = false;
    let mut element: i64 = 0i64;
    let mut capture = false;
    let mut capture_depth: usize = 0;
    let mut capture_start: usize = 0;
    let mut result = TextValue::Null;
    while position < source.characters.len() {
        let token = json_read_next_token(&source, position);
        if token.kind == JSON_READ_END {
            return result;
        };
        let mut decoded = TextValue::Null;
        if token.kind == JSON_READ_QUOTE {
            decoded = json_read_decode_string(&source, token);
            if let TextValue::Error(error) = decoded {
                return TextValue::Error(error);
            };
            if let TextValue::Unknown = decoded {
                return TextValue::Unknown;
            };
        };
        if depth == 1 {
            if root_object && state == 0 && token.kind == JSON_READ_QUOTE {
                let decoded_name = decoded.clone();
                if let TextValue::Value(name) = decoded_name {
                    matched = name.as_str() == key;
                };
                state = 1;
            } else if token.kind == JSON_READ_COLON && root_object {
                state = 2;
            } else if token.kind == JSON_READ_COMMA {
                state = 0;
                if root_array {
                    state = 2;
                };
            } else if state == 2
                && (token.kind == JSON_READ_QUOTE
                    || token.kind == JSON_READ_ATOM
                    || token.kind == JSON_READ_ARRAY_OPEN
                    || token.kind == JSON_READ_OBJECT_OPEN)
            {
                let selected = (object && root_object && matched)
                    || (object == false && root_array && element == wanted);
                element = element + 1i64;
                state = 3;
                if selected {
                    if token.kind == JSON_READ_ARRAY_OPEN || token.kind == JSON_READ_OBJECT_OPEN {
                        capture = true;
                        capture_depth = depth;
                        capture_start = token.start;
                    } else if as_text && token.kind == JSON_READ_QUOTE {
                        result = decoded.clone();
                    } else if as_text
                        && token.kind == JSON_READ_ATOM
                        && source.characters[token.start] == 'n'
                    {
                        result = TextValue::Null;
                    } else {
                        result = json_read_slice(&source, token.start, token.end);
                    };
                };
            };
        };
        if token.kind == JSON_READ_OBJECT_OPEN || token.kind == JSON_READ_ARRAY_OPEN {
            depth += 1;
        } else if token.kind == JSON_READ_OBJECT_CLOSE || token.kind == JSON_READ_ARRAY_CLOSE {
            depth = depth - 1;
            if capture && depth == capture_depth {
                result = json_read_slice(&source, capture_start, token.end);
                capture = false;
            };
        };
        position = token.end;
    }
    result
}

fn json_read_field(input: JsonValue, key: TextValue, as_text: bool) -> TextValue {
    if let JsonValue::Error(error) = input {
        return TextValue::Error(error);
    };
    if let TextValue::Error(error) = key {
        return TextValue::Error(error);
    };
    if let JsonValue::Unknown = input {
        return TextValue::Unknown;
    };
    if let TextValue::Unknown = key {
        return TextValue::Unknown;
    };
    if let JsonValue::Null = input {
        return TextValue::Null;
    };
    if let TextValue::Null = key {
        return TextValue::Null;
    };
    if let JsonValue::Value(value) = input {
        if let TextValue::Value(name) = key {
            return json_read_select(value.source.as_str(), name.as_str(), 0, true, as_text);
        };
    };
    TextValue::Unknown
}

fn json_read_element(input: JsonValue, index: Int4Value, as_text: bool) -> TextValue {
    if let JsonValue::Error(error) = input {
        return TextValue::Error(error);
    };
    if let Int4Value::Error(error) = index {
        return TextValue::Error(error);
    };
    if let JsonValue::Unknown = input {
        return TextValue::Unknown;
    };
    if let Int4Value::Unknown = index {
        return TextValue::Unknown;
    };
    if let JsonValue::Null = input {
        return TextValue::Null;
    };
    if let Int4Value::Null = index {
        return TextValue::Null;
    };
    if let JsonValue::Value(value) = input {
        if let Int4Value::Value(number) = index {
            return json_read_select(value.source.as_str(), "", number, false, as_text);
        };
    };
    TextValue::Unknown
}

pub fn sql__pg_catalog__json_object_field__ubt9(input: JsonValue, key: TextValue) -> JsonValue {
    let selected = json_read_field(input, key, false);
    json_from_coerced_text(selected)
}

pub fn sql__pg_catalog__json_object_field_text__zdkt(
    input: JsonValue,
    key: TextValue,
) -> TextValue {
    json_read_field(input, key, true)
}

pub fn sql__pg_catalog__json_array_element__8yh4(input: JsonValue, index: Int4Value) -> JsonValue {
    let selected = json_read_element(input, index, false);
    json_from_coerced_text(selected)
}

pub fn sql__pg_catalog__json_array_element_text__t2sr(
    input: JsonValue,
    index: Int4Value,
) -> TextValue {
    json_read_element(input, index, true)
}

pub fn sql__pg_catalog__json_array_length__97pw(input: JsonValue) -> Int4Value {
    if let JsonValue::Error(error) = input {
        return Int4Value::Error(error);
    };
    if let JsonValue::Null = input {
        return Int4Value::Null;
    };
    if let JsonValue::Value(value) = input {
        if value.kind != 5 {
            return Int4Value::Error(make_sql_error(JSON_READ_NON_ARRAY));
        };
        let source = JsonReadSource {
            characters: value.source.chars().collect(),
        };
        let count = json_read_array_count(&source);
        return make_int4_value(count as i32);
    };
    Int4Value::Unknown
}
