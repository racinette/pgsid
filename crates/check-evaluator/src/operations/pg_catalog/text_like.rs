const TEXT_LIKE_ESCAPE_ERROR: u32 = 3452621;

fn text_like_character(value: char, insensitive: bool) -> char {
    if insensitive {
        return value.to_ascii_lowercase();
    }
    value
}

#[derive(Clone, Copy, PartialEq, Eq)]
struct TextLikeFrame {
    text: usize,
    pattern: usize,
    searching: bool,
    first: char,
}

fn text_like_match(input: &str, pattern: &str, insensitive: bool) -> Int4Value {
    let text: Vec<char> = input.chars().collect();
    let chars: Vec<char> = pattern.chars().collect();
    let mut frames: Vec<TextLikeFrame> = Vec::new();
    frames.push(TextLikeFrame {
        text: 0,
        pattern: 0,
        searching: false,
        first: '0',
    });
    let mut depth: usize = 1;
    while depth > 0 {
        let current = depth - 1;
        let frame = frames[current];
        let mut t = frame.text;
        let mut p = frame.pattern;
        let mut searching = frame.searching;
        let mut first = frame.first;
        let mut failed = false;
        if searching {
            while t < text.len() && text_like_character(text[t], insensitive) != first {
                t = t + 1;
            }
            if t >= text.len() {
                return Int4Value::Value(-1);
            }
            frames[current] = TextLikeFrame {
                text: t + 1,
                pattern: p,
                searching: true,
                first: first,
            };
            let child = TextLikeFrame {
                text: t,
                pattern: p,
                searching: false,
                first: '0',
            };
            if depth < frames.len() {
                frames[depth] = child;
            } else {
                frames.push(child);
            }
            depth += 1;
        } else {
            if t < text.len() && p < chars.len() {
                if chars[p] == '%' {
                    p = p + 1;
                    let mut wildcards = true;
                    while p < chars.len() && wildcards {
                        if chars[p] == '%' {
                            p = p + 1;
                        } else if chars[p] == '_' {
                            if t >= text.len() {
                                return Int4Value::Value(-1);
                            }
                            t = t + 1;
                            p = p + 1;
                        } else {
                            wildcards = false;
                        };
                    }
                    if p >= chars.len() {
                        return Int4Value::Value(1);
                    }
                    let mut literal = p;
                    if chars[p] == '\\' {
                        literal = literal + 1;
                        if literal >= chars.len() {
                            return Int4Value::Error(make_sql_error(TEXT_LIKE_ESCAPE_ERROR));
                        }
                    }
                    first = text_like_character(chars[literal], insensitive);
                    searching = true;
                } else if chars[p] == '_' {
                    t = t + 1;
                    p = p + 1;
                } else {
                    if chars[p] == '\\' {
                        p = p + 1;
                        if p >= chars.len() {
                            return Int4Value::Error(make_sql_error(TEXT_LIKE_ESCAPE_ERROR));
                        }
                    }
                    if text_like_character(text[t], insensitive)
                        != text_like_character(chars[p], insensitive)
                    {
                        failed = true;
                    } else {
                        t = t + 1;
                        p = p + 1;
                    };
                };
            } else if t < text.len() {
                failed = true;
            } else {
                while p < chars.len() && chars[p] == '%' {
                    p = p + 1;
                }
                if p >= chars.len() {
                    return Int4Value::Value(1);
                }
                return Int4Value::Value(-1);
            }
            if failed {
                depth = depth - 1;
            } else {
                frames[current] = TextLikeFrame {
                    text: t,
                    pattern: p,
                    searching: searching,
                    first: first,
                };
            };
        };
    }
    Int4Value::Value(0)
}

fn text_like(input: TextValue, pattern: TextValue, insensitive: bool, negate: bool) -> BoolValue {
    if let TextValue::Error(error) = input {
        return BoolValue::Error(error);
    }
    if let TextValue::Error(error) = pattern {
        return BoolValue::Error(error);
    }
    if input == TextValue::Unknown || pattern == TextValue::Unknown {
        return BoolValue::Unknown;
    }
    if input == TextValue::Null || pattern == TextValue::Null {
        return BoolValue::Null;
    }
    if let TextValue::Value(value) = input {
        if let TextValue::Value(pat) = pattern {
            let result = text_like_match(value.as_str(), pat.as_str(), insensitive);
            if let Int4Value::Error(error) = result {
                return BoolValue::Error(error);
            }
            if let Int4Value::Value(matched) = result {
                return BoolValue::Value((matched == 1) != negate);
            }
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__bpchariclike__apon(input: TextValue, pattern: TextValue) -> BoolValue {
    text_like(input, pattern, true, false)
}
pub fn sql__pg_catalog__bpcharicnlike__blnm(input: TextValue, pattern: TextValue) -> BoolValue {
    text_like(input, pattern, true, true)
}
pub fn sql__pg_catalog__bpcharlike__3trv(input: TextValue, pattern: TextValue) -> BoolValue {
    text_like(input, pattern, false, false)
}
pub fn sql__pg_catalog__bpcharnlike__hafu(input: TextValue, pattern: TextValue) -> BoolValue {
    text_like(input, pattern, false, true)
}
pub fn sql__pg_catalog__like__zn9s(input: TextValue, pattern: TextValue) -> BoolValue {
    text_like(input, pattern, false, false)
}
pub fn sql__pg_catalog__notlike__45mm(input: TextValue, pattern: TextValue) -> BoolValue {
    text_like(input, pattern, false, true)
}
pub fn sql__pg_catalog__texticlike__qnr5(input: TextValue, pattern: TextValue) -> BoolValue {
    text_like(input, pattern, true, false)
}
pub fn sql__pg_catalog__texticnlike__mjxh(input: TextValue, pattern: TextValue) -> BoolValue {
    text_like(input, pattern, true, true)
}
pub fn sql__pg_catalog__textlike__4fik(input: TextValue, pattern: TextValue) -> BoolValue {
    text_like(input, pattern, false, false)
}
pub fn sql__pg_catalog__textnlike__7ux0(input: TextValue, pattern: TextValue) -> BoolValue {
    text_like(input, pattern, false, true)
}

pub fn sql__pg_catalog__like_escape__xfrr(input: TextValue, escape: TextValue) -> TextValue {
    if let TextValue::Error(error) = input {
        return TextValue::Error(error);
    }
    if let TextValue::Error(error) = escape {
        return TextValue::Error(error);
    }
    if input == TextValue::Unknown || escape == TextValue::Unknown {
        return TextValue::Unknown;
    }
    if input == TextValue::Null || escape == TextValue::Null {
        return TextValue::Null;
    }
    if let TextValue::Value(value) = input {
        if let TextValue::Value(esc) = escape {
            if text_build_octets(value.as_str()) > 536870909i64 {
                return TextValue::Error(make_sql_error(TEXT_SEARCH_INTERNAL_ERROR));
            }
            let chars: Vec<char> = value.chars().collect();
            let escape_chars: Vec<char> = esc.chars().collect();
            if escape_chars.len() > 1 {
                return TextValue::Error(make_sql_error(TEXT_LIKE_ESCAPE_ERROR));
            }
            if escape_chars.len() == 1 && escape_chars[0] == '\\' {
                return TextValue::Value(value);
            }
            let mut output = String::new();
            let mut index: usize = 0;
            let mut after_escape = false;
            while index < chars.len() {
                let character = chars[index];
                let mut is_escape = false;
                if escape_chars.len() == 1 {
                    is_escape = character == escape_chars[0] && after_escape == false;
                }
                if is_escape {
                    output.push('\\');
                    after_escape = true;
                } else {
                    if character == '\\' && after_escape == false {
                        output.push('\\');
                    }
                    output.push(character);
                    after_escape = false;
                };
                index += 1;
            }
            return TextValue::Value(output);
        }
    }
    TextValue::Unknown
}
