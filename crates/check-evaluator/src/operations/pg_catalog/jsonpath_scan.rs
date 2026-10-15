#[derive(Clone)]
struct JsonpathScanSource {
    characters: Vec<char>,
}

#[derive(Clone, Copy)]
struct JsonpathScanToken {
    kind: i32,
    start: usize,
    end: usize,
    text_start: usize,
    text_end: usize,
}

#[derive(Clone)]
struct JsonpathScanRead {
    kind: i32,
    end: usize,
    text: Vec<char>,
    error: u32,
}

#[derive(Clone)]
struct JsonpathScan {
    source: Vec<char>,
    tokens: Vec<JsonpathScanToken>,
    text: Vec<char>,
    error: u32,
}

const JSONPATH_SCAN_IDENT: i32 = 256;
const JSONPATH_SCAN_STRING: i32 = 257;
const JSONPATH_SCAN_VARIABLE: i32 = 258;
const JSONPATH_SCAN_INT: i32 = 259;
const JSONPATH_SCAN_NUMERIC: i32 = 260;
const JSONPATH_SCAN_AND: i32 = 261;
const JSONPATH_SCAN_OR: i32 = 262;
const JSONPATH_SCAN_ANY: i32 = 263;
const JSONPATH_SCAN_LE: i32 = 264;
const JSONPATH_SCAN_EQ: i32 = 265;
const JSONPATH_SCAN_NE: i32 = 266;
const JSONPATH_SCAN_GE: i32 = 267;
const JSONPATH_SCAN_KEYWORD: i32 = 280;
const JSONPATH_SCAN_SYNTAX: u32 = 6819553;
const JSONPATH_SCAN_SURROGATE: u32 = 3484946;
const JSONPATH_SCAN_ZERO: u32 = 3484949;

const JSONPATH_SCAN_KEYWORDS: &[&str] = &[
    "is",
    "to",
    "abs",
    "lax",
    "date",
    "flag",
    "last",
    "null",
    "size",
    "time",
    "true",
    "type",
    "with",
    "false",
    "floor",
    "bigint",
    "double",
    "exists",
    "number",
    "starts",
    "strict",
    "string",
    "boolean",
    "ceiling",
    "decimal",
    "integer",
    "time_tz",
    "unknown",
    "datetime",
    "keyvalue",
    "timestamp",
    "like_regex",
    "timestamp_tz",
];

fn jsonpath_scan_space(character: char) -> bool {
    character == ' '
        || character == '\t'
        || character == '\n'
        || character == '\r'
        || character == '\u{000c}'
}

fn jsonpath_scan_special(character: char) -> bool {
    character == '?'
        || character == '%'
        || character == '$'
        || character == '.'
        || character == '['
        || character == ']'
        || character == '{'
        || character == '}'
        || character == '('
        || character == ')'
        || character == '|'
        || character == '&'
        || character == '!'
        || character == '='
        || character == '<'
        || character == '>'
        || character == '@'
        || character == '#'
        || character == ','
        || character == '*'
        || character == ':'
        || character == '-'
        || character == '+'
        || character == '/'
}

fn jsonpath_scan_other(character: char) -> bool {
    jsonpath_scan_space(character) == false
        && jsonpath_scan_special(character) == false
        && character != '\\'
        && character != '"'
}

fn jsonpath_scan_hex(character: char) -> i32 {
    let code = character as i32;
    if code >= 48 && code <= 57 {
        return code - 48;
    };
    if code >= 65 && code <= 70 {
        return code - 55;
    };
    if code >= 97 && code <= 102 {
        return code - 87;
    };
    -1
}

fn jsonpath_scan_digits(source: &JsonpathScanSource, begin: usize, radix: i32) -> usize {
    let mut position = begin;
    while position < source.characters.len() {
        let digit = jsonpath_scan_hex(source.characters[position]);
        if digit < 0 || digit >= radix {
            return position;
        };
        position += 1;
        if position + 1 < source.characters.len() && source.characters[position] == '_' {
            let next = jsonpath_scan_hex(source.characters[position + 1]);
            if next >= 0 && next < radix {
                position += 1;
            };
        };
    }
    position
}

fn jsonpath_scan_empty_read(kind: i32, end: usize, error: u32) -> JsonpathScanRead {
    let text: Vec<char> = Vec::new();
    JsonpathScanRead {
        kind: kind,
        end: end,
        text: text,
        error: error,
    }
}

fn jsonpath_scan_number(source: &JsonpathScanSource, begin: usize) -> JsonpathScanRead {
    let mut integer = begin;
    if source.characters[begin] == '0' {
        integer += 1;
    } else {
        integer = jsonpath_scan_digits(source, begin, 10);
    };
    let mut decimal = begin;
    if integer < source.characters.len() && source.characters[integer] == '.' {
        decimal = jsonpath_scan_digits(source, integer + 1, 10);
    };
    let mut base = integer;
    if decimal > base {
        base = decimal;
    };
    let mut real = begin;
    let mut failed_real = begin;
    if base > begin
        && base < source.characters.len()
        && (source.characters[base] == 'e' || source.characters[base] == 'E')
    {
        let mut digits = base + 1;
        if digits < source.characters.len()
            && (source.characters[digits] == '+' || source.characters[digits] == '-')
        {
            digits += 1;
            failed_real = digits;
        };
        let end = jsonpath_scan_digits(source, digits, 10);
        if end > digits {
            real = end;
        };
    };
    let mut prefixed = begin;
    if begin + 2 < source.characters.len() && source.characters[begin] == '0' {
        let prefix = source.characters[begin + 1];
        let mut radix: i32 = 0;
        if prefix == 'x' || prefix == 'X' {
            radix = 16;
        };
        if prefix == 'o' || prefix == 'O' {
            radix = 8;
        };
        if prefix == 'b' || prefix == 'B' {
            radix = 2;
        };
        if radix > 0 {
            let end = jsonpath_scan_digits(source, begin + 2, radix);
            if end > begin + 2 {
                prefixed = end;
            };
        };
    };
    let mut kind = JSONPATH_SCAN_INT;
    let mut end = integer;
    if decimal > end {
        end = decimal;
        kind = JSONPATH_SCAN_NUMERIC;
    };
    if real > end {
        end = real;
        kind = JSONPATH_SCAN_NUMERIC;
    };
    if prefixed > end {
        end = prefixed;
        kind = JSONPATH_SCAN_INT;
    };
    let mut junk = begin;
    if integer > begin
        && integer < source.characters.len()
        && jsonpath_scan_other(source.characters[integer])
    {
        junk = integer + 1;
    };
    if decimal > begin
        && decimal < source.characters.len()
        && jsonpath_scan_other(source.characters[decimal])
        && decimal + 1 > junk
    {
        junk = decimal + 1;
    };
    if real > begin
        && real < source.characters.len()
        && jsonpath_scan_other(source.characters[real])
        && real + 1 > junk
    {
        junk = real + 1;
    };
    let mut error: u32 = 0;
    if failed_real > end {
        end = failed_real;
        error = JSONPATH_SCAN_SYNTAX;
    };
    if junk > end {
        end = junk;
        error = JSONPATH_SCAN_SYNTAX;
    };
    let mut other = begin;
    while other < source.characters.len() && jsonpath_scan_other(source.characters[other]) {
        other += 1;
    }
    // A trailing-junk rule consumes one byte; a non-ASCII character lets the
    // complete identifier win the byte-length comparison.
    if other > end
        || (other == end
            && other > begin
            && error != 0
            && (source.characters[end - 1] as i32) >= 128)
    {
        return jsonpath_scan_empty_read(0, begin, 0);
    };
    jsonpath_scan_empty_read(kind, end, error)
}

fn jsonpath_scan_unicode(source: &JsonpathScanSource, begin: usize) -> JsonpathScanRead {
    let mut codes: Vec<usize> = Vec::new();
    let mut position = begin;
    while position + 1 < source.characters.len()
        && source.characters[position] == '\\'
        && source.characters[position + 1] == 'u'
    {
        position += 2;
        let braced = position < source.characters.len() && source.characters[position] == '{';
        if braced {
            position += 1;
        };
        let mut count: usize = 0;
        let mut code: i32 = 0;
        let mut limit: usize = 4;
        if braced {
            limit = 6;
        };
        while position < source.characters.len() && count < limit {
            let digit = jsonpath_scan_hex(source.characters[position]);
            if digit < 0 {
                break;
            };
            code = code * 16 + digit;
            position += 1;
            count += 1;
        }
        if (braced
            && (count == 0
                || position == source.characters.len()
                || source.characters[position] != '}'))
            || (braced == false && count != 4)
        {
            return jsonpath_scan_empty_read(0, position, JSONPATH_SCAN_SYNTAX);
        };
        if braced {
            position += 1;
        };
        codes.push(usize::try_from(code).unwrap_or(0));
    }
    let mut text: Vec<char> = Vec::new();
    let mut index: usize = 0;
    let mut high: i32 = -1;
    while index < codes.len() {
        let mut code = codes[index] as i32;
        index += 1;
        if code >= 55296 && code <= 56319 {
            if high >= 0 {
                return jsonpath_scan_empty_read(0, position, JSONPATH_SCAN_SURROGATE);
            };
            high = code;
        } else {
            if code >= 56320 && code <= 57343 {
                if high < 0 {
                    return jsonpath_scan_empty_read(0, position, JSONPATH_SCAN_SURROGATE);
                };
                code = 65536 + (high - 55296) * 1024 + code - 56320;
                high = -1;
            } else if high >= 0 {
                return jsonpath_scan_empty_read(0, position, JSONPATH_SCAN_SURROGATE);
            };
            if code == 0 {
                return jsonpath_scan_empty_read(0, position, JSONPATH_SCAN_ZERO);
            };
            if code > 1114111 {
                return jsonpath_scan_empty_read(0, position, JSONPATH_SCAN_SYNTAX);
            };
            text.push(char::from_u32(code as u32).unwrap_or(' '));
        };
    }
    if high >= 0 {
        return jsonpath_scan_empty_read(0, position, JSONPATH_SCAN_SURROGATE);
    };
    JsonpathScanRead {
        kind: 0,
        end: position,
        text: text,
        error: 0,
    }
}

fn jsonpath_scan_lookup_keyword(text: &JsonpathScanSource) -> i32 {
    let mut original = String::new();
    let mut folded = String::new();
    let mut position: usize = 0;
    while position < text.characters.len() {
        let character = text.characters[position];
        original.push(character);
        let code = character as i32;
        if code >= 65 && code <= 90 {
            folded.push(char::from_u32((code + 32) as u32).unwrap_or(' '));
        } else {
            folded.push(character);
        };
        position += 1;
    }
    let mut index: usize = 0;
    while index < JSONPATH_SCAN_KEYWORDS.len() {
        let keyword = JSONPATH_SCAN_KEYWORDS[index];
        if folded.as_str() == keyword {
            if (keyword == "null" || keyword == "true" || keyword == "false")
                && original.as_str() != keyword
            {
                return JSONPATH_SCAN_IDENT;
            };
            return JSONPATH_SCAN_KEYWORD + index as i32;
        };
        index += 1;
    }
    JSONPATH_SCAN_IDENT
}

fn jsonpath_scan_name(source: &JsonpathScanSource, begin: usize, kind: i32) -> JsonpathScanRead {
    let quoted = kind == JSONPATH_SCAN_STRING || kind == JSONPATH_SCAN_VARIABLE;
    let mut position = begin;
    let mut text: Vec<char> = Vec::new();
    while position < source.characters.len() {
        let character = source.characters[position];
        if quoted && character == '"' {
            return JsonpathScanRead {
                kind: kind,
                end: position + 1,
                text: text,
                error: 0,
            };
        };
        if quoted == false
            && (jsonpath_scan_space(character)
                || jsonpath_scan_special(character)
                || character == '"')
        {
            if character == '/'
                && position + 1 < source.characters.len()
                && source.characters[position + 1] == '*'
            {
                return jsonpath_scan_empty_read(-1, position, 0);
            };
            break;
        };
        if character == '\\' {
            if position + 1 == source.characters.len() || source.characters[position + 1] == '\n' {
                return jsonpath_scan_empty_read(0, position, JSONPATH_SCAN_SYNTAX);
            };
            let escape = source.characters[position + 1];
            if escape == 'u' {
                let decoded = jsonpath_scan_unicode(source, position);
                if decoded.error != 0 {
                    return decoded;
                };
                let mut index: usize = 0;
                while index < decoded.text.len() {
                    text.push(decoded.text[index]);
                    index += 1;
                }
                position = decoded.end;
            } else if escape == 'x' {
                if position + 3 >= source.characters.len() {
                    return jsonpath_scan_empty_read(0, position, JSONPATH_SCAN_SYNTAX);
                };
                let first = jsonpath_scan_hex(source.characters[position + 2]);
                let second = jsonpath_scan_hex(source.characters[position + 3]);
                if first < 0 || second < 0 {
                    return jsonpath_scan_empty_read(0, position, JSONPATH_SCAN_SYNTAX);
                };
                let code = first * 16 + second;
                if code == 0 {
                    return jsonpath_scan_empty_read(0, position, JSONPATH_SCAN_ZERO);
                };
                text.push(char::from_u32(code as u32).unwrap_or(' '));
                position += 4;
            } else {
                let mut decoded = escape;
                if escape == 'b' {
                    decoded = '\u{0008}';
                };
                if escape == 'f' {
                    decoded = '\u{000c}';
                };
                if escape == 'n' {
                    decoded = '\n';
                };
                if escape == 'r' {
                    decoded = '\r';
                };
                if escape == 't' {
                    decoded = '\t';
                };
                if escape == 'v' {
                    decoded = '\u{000b}';
                };
                text.push(decoded);
                position += 2;
            };
        } else {
            text.push(character);
            position += 1;
        };
    }
    if quoted {
        return jsonpath_scan_empty_read(0, position, JSONPATH_SCAN_SYNTAX);
    };
    let decoded = JsonpathScanSource { characters: text };
    let keyword = jsonpath_scan_lookup_keyword(&decoded);
    JsonpathScanRead {
        kind: keyword,
        end: position,
        text: decoded.characters,
        error: 0,
    }
}

fn jsonpath_scan_next(source: &JsonpathScanSource, begin: usize) -> JsonpathScanRead {
    let character = source.characters[begin];
    let mut next = '\0';
    if begin + 1 < source.characters.len() {
        next = source.characters[begin + 1];
    };
    if character == '/' && next == '*' {
        let mut position = begin + 2;
        while position + 1 < source.characters.len() {
            if source.characters[position] == '*' && source.characters[position + 1] == '/' {
                return jsonpath_scan_empty_read(-1, position + 2, 0);
            };
            position += 1;
        }
        return jsonpath_scan_empty_read(0, position, JSONPATH_SCAN_SYNTAX);
    };
    if character == '$' {
        if next == '"' {
            return jsonpath_scan_name(source, begin + 2, JSONPATH_SCAN_VARIABLE);
        };
        if begin + 1 < source.characters.len() && jsonpath_scan_other(next) {
            let mut end = begin + 1;
            let mut text: Vec<char> = Vec::new();
            while end < source.characters.len() && jsonpath_scan_other(source.characters[end]) {
                text.push(source.characters[end]);
                end += 1;
            }
            return JsonpathScanRead {
                kind: JSONPATH_SCAN_VARIABLE,
                end: end,
                text: text,
                error: 0,
            };
        };
    };
    if character == '"' {
        return jsonpath_scan_name(source, begin + 1, JSONPATH_SCAN_STRING);
    };
    let mut pair: i32 = 0;
    if character == '&' && next == '&' {
        pair = JSONPATH_SCAN_AND;
    };
    if character == '|' && next == '|' {
        pair = JSONPATH_SCAN_OR;
    };
    if character == '*' && next == '*' {
        pair = JSONPATH_SCAN_ANY;
    };
    if character == '<' && next == '=' {
        pair = JSONPATH_SCAN_LE;
    };
    if character == '=' && next == '=' {
        pair = JSONPATH_SCAN_EQ;
    };
    if (character == '!' && next == '=') || (character == '<' && next == '>') {
        pair = JSONPATH_SCAN_NE;
    };
    if character == '>' && next == '=' {
        pair = JSONPATH_SCAN_GE;
    };
    if pair > 0 {
        return jsonpath_scan_empty_read(pair, begin + 2, 0);
    };
    let digit = jsonpath_scan_hex(character);
    let next_digit = jsonpath_scan_hex(next);
    if (digit >= 0 && digit < 10) || (character == '.' && next_digit >= 0 && next_digit < 10) {
        let number = jsonpath_scan_number(source, begin);
        if number.end > begin {
            return number;
        };
    };
    if jsonpath_scan_special(character) {
        return jsonpath_scan_empty_read(character as i32, begin + 1, 0);
    };
    jsonpath_scan_name(source, begin, JSONPATH_SCAN_IDENT)
}

fn jsonpath_scan_tokens(input: &str) -> JsonpathScan {
    let source = JsonpathScanSource {
        characters: input.chars().collect(),
    };
    let mut tokens: Vec<JsonpathScanToken> = Vec::new();
    let mut text: Vec<char> = Vec::new();
    let mut position: usize = 0;
    while position < source.characters.len() {
        if jsonpath_scan_space(source.characters[position]) {
            position += 1;
        } else {
            let read = jsonpath_scan_next(&source, position);
            if read.error != 0 {
                return JsonpathScan {
                    source: source.characters,
                    tokens: tokens,
                    text: text,
                    error: read.error,
                };
            };
            if read.kind >= 0 {
                let start = text.len();
                let mut index: usize = 0;
                while index < read.text.len() {
                    text.push(read.text[index]);
                    index += 1;
                }
                tokens.push(JsonpathScanToken {
                    kind: read.kind,
                    start: position,
                    end: read.end,
                    text_start: start,
                    text_end: text.len(),
                });
            };
            position = read.end;
        };
    }
    JsonpathScan {
        source: source.characters,
        tokens: tokens,
        text: text,
        error: 0,
    }
}
