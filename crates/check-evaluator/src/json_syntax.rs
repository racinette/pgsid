#[derive(Clone)]
struct JsonSyntaxSource {
    characters: Vec<char>,
}

#[derive(Clone, Copy)]
struct JsonSyntaxToken {
    kind: i32,
    end: usize,
}

#[derive(Clone, Copy)]
struct JsonSyntaxFrame {
    state: i32,
}

#[derive(Clone, Copy)]
pub struct JsonSyntaxLayout {
    pub valid: bool,
    pub kind: i32,
    pub max_depth: usize,
}

const JSON_SYNTAX_INVALID: i32 = 12;
const JSON_SYNTAX_END: i32 = 0;
const JSON_SYNTAX_STRING: i32 = 1;
const JSON_SYNTAX_NUMBER: i32 = 2;
const JSON_SYNTAX_TRUE: i32 = 3;
const JSON_SYNTAX_FALSE: i32 = 4;
const JSON_SYNTAX_NULL: i32 = 5;
const JSON_SYNTAX_OBJECT_START: i32 = 6;
const JSON_SYNTAX_OBJECT_END: i32 = 7;
const JSON_SYNTAX_ARRAY_START: i32 = 8;
const JSON_SYNTAX_ARRAY_END: i32 = 9;
const JSON_SYNTAX_COLON: i32 = 10;
const JSON_SYNTAX_COMMA: i32 = 11;

const JSON_SYNTAX_ROOT_VALUE: i32 = 0;
const JSON_SYNTAX_ROOT_END: i32 = 1;
const JSON_SYNTAX_ARRAY_FIRST: i32 = 2;
const JSON_SYNTAX_ARRAY_NEXT: i32 = 3;
const JSON_SYNTAX_ARRAY_VALUE: i32 = 4;
const JSON_SYNTAX_OBJECT_FIRST: i32 = 5;
const JSON_SYNTAX_OBJECT_COLON: i32 = 6;
const JSON_SYNTAX_OBJECT_VALUE: i32 = 7;
const JSON_SYNTAX_OBJECT_NEXT: i32 = 8;
const JSON_SYNTAX_OBJECT_KEY: i32 = 9;

fn json_syntax_space(character: char) -> bool {
    character == ' ' || character == '\t' || character == '\n' || character == '\r'
}

fn json_syntax_digit(character: char) -> bool {
    let code = character as i32;
    code >= 48 && code <= 57
}

fn json_syntax_hex(character: char) -> bool {
    let code = character as i32;
    (code >= 48 && code <= 57) || (code >= 65 && code <= 70) || (code >= 97 && code <= 102)
}

fn json_syntax_bad_token(end: usize) -> JsonSyntaxToken {
    JsonSyntaxToken {
        kind: JSON_SYNTAX_INVALID,
        end: end,
    }
}

fn json_syntax_read_string(source: &JsonSyntaxSource, begin: usize) -> JsonSyntaxToken {
    let mut position = begin + 1;
    while position < source.characters.len() {
        let character = source.characters[position];
        position += 1;
        if character == '"' {
            return JsonSyntaxToken {
                kind: JSON_SYNTAX_STRING,
                end: position,
            };
        };
        let code = character as i32;
        if code < 32 {
            return json_syntax_bad_token(position);
        };
        if character == '\\' {
            if position >= source.characters.len() {
                return json_syntax_bad_token(position);
            };
            let escape = source.characters[position];
            position += 1;
            if escape == 'u' {
                let mut digit: usize = 0;
                while digit < 4 {
                    if position >= source.characters.len()
                        || json_syntax_hex(source.characters[position]) == false
                    {
                        return json_syntax_bad_token(position);
                    };
                    position += 1;
                    digit += 1;
                }
            } else if escape != '"'
                && escape != '\\'
                && escape != '/'
                && escape != 'b'
                && escape != 'f'
                && escape != 'n'
                && escape != 'r'
                && escape != 't'
            {
                return json_syntax_bad_token(position);
            };
        };
    }
    json_syntax_bad_token(position)
}

fn json_syntax_read_number(source: &JsonSyntaxSource, begin: usize) -> JsonSyntaxToken {
    let mut position = begin;
    if source.characters[position] == '-' {
        position += 1;
    };
    if position >= source.characters.len()
        || json_syntax_digit(source.characters[position]) == false
    {
        return json_syntax_bad_token(position);
    };
    if source.characters[position] == '0' {
        position += 1;
    } else {
        while position < source.characters.len() && json_syntax_digit(source.characters[position]) {
            position += 1;
        }
    };
    if position < source.characters.len() && source.characters[position] == '.' {
        position += 1;
        let first = position;
        while position < source.characters.len() && json_syntax_digit(source.characters[position]) {
            position += 1;
        }
        if position == first {
            return json_syntax_bad_token(position);
        };
    };
    if position < source.characters.len()
        && (source.characters[position] == 'e' || source.characters[position] == 'E')
    {
        position += 1;
        if position < source.characters.len()
            && (source.characters[position] == '+' || source.characters[position] == '-')
        {
            position += 1;
        };
        let first = position;
        while position < source.characters.len() && json_syntax_digit(source.characters[position]) {
            position += 1;
        }
        if position == first {
            return json_syntax_bad_token(position);
        };
    };
    JsonSyntaxToken {
        kind: JSON_SYNTAX_NUMBER,
        end: position,
    }
}

fn json_syntax_keyword(
    source: &JsonSyntaxSource,
    begin: usize,
    word: &str,
    kind: i32,
) -> JsonSyntaxToken {
    let expected: Vec<char> = word.chars().collect();
    let mut index: usize = 0;
    let mut position = begin;
    while index < expected.len() {
        if position >= source.characters.len() || source.characters[position] != expected[index] {
            return json_syntax_bad_token(position);
        };
        position += 1;
        index += 1;
    }
    JsonSyntaxToken {
        kind: kind,
        end: position,
    }
}

fn json_syntax_read_token(source: &JsonSyntaxSource, begin: usize) -> JsonSyntaxToken {
    let mut position = begin;
    while position < source.characters.len() && json_syntax_space(source.characters[position]) {
        position += 1;
    }
    if position == source.characters.len() {
        return JsonSyntaxToken {
            kind: JSON_SYNTAX_END,
            end: position,
        };
    };
    let character = source.characters[position];
    if character == '"' {
        return json_syntax_read_string(source, position);
    };
    if character == '-' || json_syntax_digit(character) {
        return json_syntax_read_number(source, position);
    };
    if character == 't' {
        return json_syntax_keyword(source, position, "true", JSON_SYNTAX_TRUE);
    };
    if character == 'f' {
        return json_syntax_keyword(source, position, "false", JSON_SYNTAX_FALSE);
    };
    if character == 'n' {
        return json_syntax_keyword(source, position, "null", JSON_SYNTAX_NULL);
    };
    let mut kind = JSON_SYNTAX_INVALID;
    if character == '{' {
        kind = JSON_SYNTAX_OBJECT_START;
    } else if character == '}' {
        kind = JSON_SYNTAX_OBJECT_END;
    } else if character == '[' {
        kind = JSON_SYNTAX_ARRAY_START;
    } else if character == ']' {
        kind = JSON_SYNTAX_ARRAY_END;
    } else if character == ':' {
        kind = JSON_SYNTAX_COLON;
    } else if character == ',' {
        kind = JSON_SYNTAX_COMMA;
    };
    JsonSyntaxToken {
        kind: kind,
        end: position + 1,
    }
}

fn json_syntax_root_kind(token: i32) -> i32 {
    if token == JSON_SYNTAX_NULL {
        return 0;
    };
    if token == JSON_SYNTAX_FALSE {
        return 1;
    };
    if token == JSON_SYNTAX_TRUE {
        return 2;
    };
    if token == JSON_SYNTAX_NUMBER {
        return 3;
    };
    if token == JSON_SYNTAX_STRING {
        return 4;
    };
    if token == JSON_SYNTAX_ARRAY_START {
        return 5;
    };
    if token == JSON_SYNTAX_OBJECT_START {
        return 6;
    };
    -1
}

fn json_syntax_invalid_layout(depth: usize) -> JsonSyntaxLayout {
    JsonSyntaxLayout {
        valid: false,
        kind: -1,
        max_depth: depth,
    }
}

pub fn json_syntax_scan(value: &str) -> JsonSyntaxLayout {
    let source = JsonSyntaxSource {
        characters: value.chars().collect(),
    };
    let mut frames: Vec<JsonSyntaxFrame> = Vec::new();
    frames.push(JsonSyntaxFrame {
        state: JSON_SYNTAX_ROOT_VALUE,
    });
    let mut depth: usize = 1;
    let mut maximum: usize = 0;
    let mut position: usize = 0;
    let mut root_kind: i32 = -1;
    while depth > 0 {
        let token = json_syntax_read_token(&source, position);
        if token.kind == JSON_SYNTAX_INVALID {
            return json_syntax_invalid_layout(maximum);
        };
        let frame = depth - 1;
        let state = frames[frame].state;
        if state == JSON_SYNTAX_ROOT_END {
            if token.kind != JSON_SYNTAX_END {
                return json_syntax_invalid_layout(maximum);
            };
            return JsonSyntaxLayout {
                valid: true,
                kind: root_kind,
                max_depth: maximum,
            };
        };
        if state == JSON_SYNTAX_ARRAY_NEXT || state == JSON_SYNTAX_OBJECT_NEXT {
            let mut expected = JSON_SYNTAX_ARRAY_END;
            let mut continuation = JSON_SYNTAX_ARRAY_VALUE;
            if state == JSON_SYNTAX_OBJECT_NEXT {
                expected = JSON_SYNTAX_OBJECT_END;
                continuation = JSON_SYNTAX_OBJECT_KEY;
            };
            if token.kind == expected {
                depth = depth - 1;
            } else if token.kind == JSON_SYNTAX_COMMA {
                frames[frame] = JsonSyntaxFrame {
                    state: continuation,
                };
            } else {
                return json_syntax_invalid_layout(maximum);
            };
        } else if state == JSON_SYNTAX_OBJECT_COLON {
            if token.kind != JSON_SYNTAX_COLON {
                return json_syntax_invalid_layout(maximum);
            };
            frames[frame] = JsonSyntaxFrame {
                state: JSON_SYNTAX_OBJECT_VALUE,
            };
        } else if state == JSON_SYNTAX_OBJECT_FIRST || state == JSON_SYNTAX_OBJECT_KEY {
            if state == JSON_SYNTAX_OBJECT_FIRST && token.kind == JSON_SYNTAX_OBJECT_END {
                depth = depth - 1;
            } else if token.kind == JSON_SYNTAX_STRING {
                frames[frame] = JsonSyntaxFrame {
                    state: JSON_SYNTAX_OBJECT_COLON,
                };
            } else {
                return json_syntax_invalid_layout(maximum);
            };
        } else if state == JSON_SYNTAX_ARRAY_FIRST && token.kind == JSON_SYNTAX_ARRAY_END {
            depth = depth - 1;
        } else {
            let kind = json_syntax_root_kind(token.kind);
            if kind < 0 {
                return json_syntax_invalid_layout(maximum);
            };
            if state == JSON_SYNTAX_ROOT_VALUE {
                root_kind = kind;
                frames[frame] = JsonSyntaxFrame {
                    state: JSON_SYNTAX_ROOT_END,
                };
            } else if state == JSON_SYNTAX_OBJECT_VALUE {
                frames[frame] = JsonSyntaxFrame {
                    state: JSON_SYNTAX_OBJECT_NEXT,
                };
            } else {
                frames[frame] = JsonSyntaxFrame {
                    state: JSON_SYNTAX_ARRAY_NEXT,
                };
            };
            if token.kind == JSON_SYNTAX_ARRAY_START || token.kind == JSON_SYNTAX_OBJECT_START {
                let mut child = JSON_SYNTAX_ARRAY_FIRST;
                if token.kind == JSON_SYNTAX_OBJECT_START {
                    child = JSON_SYNTAX_OBJECT_FIRST;
                };
                if depth > maximum {
                    maximum = depth;
                };
                if depth < frames.len() {
                    frames[depth] = JsonSyntaxFrame { state: child };
                } else {
                    frames.push(JsonSyntaxFrame { state: child });
                };
                depth += 1;
            };
        };
        position = token.end;
    }
    json_syntax_invalid_layout(maximum)
}
