const BYTEA_ESCAPE_ERROR: u32 = 3452621;

#[derive(Clone, Copy, PartialEq, Eq)]
struct ByteaLikeFrame {
    text: usize,
    pattern: usize,
    searching: bool,
    first_high: char,
    first_low: char,
}

fn bytea_like_match(input: &str, pattern: &str) -> Int4Value {
    let text: Vec<char> = input.chars().collect();
    let chars: Vec<char> = pattern.chars().collect();
    let mut frames: Vec<ByteaLikeFrame> = Vec::new();
    frames.push(ByteaLikeFrame {
        text: 0, pattern: 0, searching: false, first_high: '0', first_low: '0',
    });
    let mut depth: usize = 1;
    while depth > 0 {
        let current = depth - 1;
        let frame = frames[current];
        let mut t = frame.text;
        let mut p = frame.pattern;
        let mut searching = frame.searching;
        let mut first_high = frame.first_high;
        let mut first_low = frame.first_low;
        let mut failed = false;
        if searching {
            while t < text.len() && (text[t] != first_high || text[t + 1] != first_low) {
                t = t + 2;
            }
            if t >= text.len() {
                return Int4Value::Value(-1);
            }
            frames[current] = ByteaLikeFrame {
                text: t + 2, pattern: p, searching: true,
                first_high: first_high, first_low: first_low,
            };
            let child = ByteaLikeFrame {
                text: t, pattern: p, searching: false, first_high: '0', first_low: '0',
            };
            if depth < frames.len() {
                frames[depth] = child;
            } else {
                frames.push(child);
            }
            depth += 1;
        } else {
            if t < text.len() && p < chars.len() {
                if chars[p] == '2' && chars[p + 1] == '5' {
                    p = p + 2;
                    let mut wildcards = true;
                    while p < chars.len() && wildcards {
                        if chars[p] == '2' && chars[p + 1] == '5' {
                            p = p + 2;
                        } else if chars[p] == '5' && chars[p + 1] == 'f' {
                            if t >= text.len() {
                                return Int4Value::Value(-1);
                            }
                            t = t + 2;
                            p = p + 2;
                        } else {
                            wildcards = false;
                        };
                    }
                    if p >= chars.len() {
                        return Int4Value::Value(1);
                    }
                    let mut literal = p;
                    if chars[p] == '5' && chars[p + 1] == 'c' {
                        literal = literal + 2;
                        if literal >= chars.len() {
                            return Int4Value::Error(make_sql_error(BYTEA_ESCAPE_ERROR));
                        }
                    }
                    first_high = chars[literal];
                    first_low = chars[literal + 1];
                    searching = true;
                } else if chars[p] == '5' && chars[p + 1] == 'f' {
                    t = t + 2;
                    p = p + 2;
                } else {
                    if chars[p] == '5' && chars[p + 1] == 'c' {
                        p = p + 2;
                        if p >= chars.len() {
                            return Int4Value::Error(make_sql_error(BYTEA_ESCAPE_ERROR));
                        }
                    }
                    if text[t] != chars[p] || text[t + 1] != chars[p + 1] {
                        failed = true;
                    } else {
                        t = t + 2;
                        p = p + 2;
                    };
                };
            } else if t < text.len() {
                failed = true;
            } else {
                while p < chars.len() && chars[p] == '2' && chars[p + 1] == '5' {
                    p = p + 2;
                }
                if p >= chars.len() {
                    return Int4Value::Value(1);
                }
                return Int4Value::Value(-1);
            }
            if failed {
                depth = depth - 1;
            } else {
                frames[current] = ByteaLikeFrame {
                    text: t, pattern: p, searching: searching,
                    first_high: first_high, first_low: first_low,
                };
            };
        };
    }
    Int4Value::Value(0)
}

fn bytea_like(input: ByteaValue, pattern: ByteaValue, negate: bool) -> BoolValue {
    if let ByteaValue::Error(error) = input { return BoolValue::Error(error); }
    if let ByteaValue::Error(error) = pattern { return BoolValue::Error(error); }
    if input == ByteaValue::Unknown || pattern == ByteaValue::Unknown { return BoolValue::Unknown; }
    if input == ByteaValue::Null || pattern == ByteaValue::Null { return BoolValue::Null; }
    if let ByteaValue::Value(value) = input {
        if let ByteaValue::Value(pat) = pattern {
            let result = bytea_like_match(value.as_str(), pat.as_str());
            if let Int4Value::Error(error) = result { return BoolValue::Error(error); }
            if let Int4Value::Value(matched) = result {
                let value = matched == 1;
                return BoolValue::Value(value != negate);
            }
        }
    }
    BoolValue::Unknown
}

pub fn sql__pg_catalog__bytealike__jhpm(input: ByteaValue, pattern: ByteaValue) -> BoolValue {
    bytea_like(input, pattern, false)
}
pub fn sql__pg_catalog__like__9b5r(input: ByteaValue, pattern: ByteaValue) -> BoolValue {
    bytea_like(input, pattern, false)
}
pub fn sql__pg_catalog__byteanlike__qodo(input: ByteaValue, pattern: ByteaValue) -> BoolValue {
    bytea_like(input, pattern, true)
}
pub fn sql__pg_catalog__notlike__cy7a(input: ByteaValue, pattern: ByteaValue) -> BoolValue {
    bytea_like(input, pattern, true)
}

pub fn sql__pg_catalog__like_escape__hk4j(input: ByteaValue, escape: ByteaValue) -> ByteaValue {
    if let ByteaValue::Error(error) = input { return ByteaValue::Error(error); }
    if let ByteaValue::Error(error) = escape { return ByteaValue::Error(error); }
    if input == ByteaValue::Unknown || escape == ByteaValue::Unknown { return ByteaValue::Unknown; }
    if input == ByteaValue::Null || escape == ByteaValue::Null { return ByteaValue::Null; }
    if let ByteaValue::Value(value) = input {
        if let ByteaValue::Value(esc) = escape {
            let length = bytea_payload_length(value.as_str());
            let allocated = bytea_concat_length(length, length);
            if let Int4Value::Error(error) = allocated { return ByteaValue::Error(error); }
            let chars: Vec<char> = value.chars().collect();
            let escape_chars: Vec<char> = esc.chars().collect();
            if escape_chars.len() > 2 {
                return ByteaValue::Error(make_sql_error(BYTEA_ESCAPE_ERROR));
            }
            if escape_chars.len() == 2 && escape_chars[0] == '5' && escape_chars[1] == 'c' {
                return ByteaValue::Value(value);
            }
            let mut output = String::new();
            let mut index: usize = 0;
            let mut after_escape = false;
            while index < chars.len() {
                let high = chars[index];
                let low = chars[index + 1];
                let mut is_escape = false;
                if escape_chars.len() == 2 {
                    is_escape = high == escape_chars[0] && low == escape_chars[1] && after_escape == false;
                }
                if is_escape {
                    output.push_str("5c");
                    after_escape = true;
                } else {
                    if high == '5' && low == 'c' && after_escape == false {
                        output.push_str("5c");
                    }
                    output.push(high);
                    output.push(low);
                    after_escape = false;
                }
                index = index + 2;
            }
            return ByteaValue::Value(output);
        }
    }
    ByteaValue::Unknown
}
