const TEXT_SEARCH_PARAMETER_ERROR: u32 = 3452619;
const TEXT_SEARCH_INTERNAL_ERROR: u32 = 56966976;

struct TextSearchState {
    characters: Vec<char>,
    pattern: Vec<char>,
}

fn text_search_at(search: &TextSearchState, from: usize) -> bool {
    if search.pattern.len() > search.characters.len() - from {
        return false;
    }
    let mut index: usize = 0;
    while index < search.pattern.len() {
        if search.characters[from + index] != search.pattern[index] {
            return false;
        }
        index += 1;
    }
    true
}

fn text_search_range(search: &TextSearchState, from: usize, end: usize) -> String {
    let mut output = String::new();
    let mut index = from;
    while index < end {
        output.push(search.characters[index]);
        index += 1;
    }
    output
}

pub fn sql__pg_catalog__textcat__s76e(left: TextValue, right: TextValue) -> TextValue {
    if let TextValue::Error(error) = left {
        return TextValue::Error(error);
    }
    if let TextValue::Error(error) = right {
        return TextValue::Error(error);
    }
    if left == TextValue::Unknown || right == TextValue::Unknown {
        return TextValue::Unknown;
    }
    if left == TextValue::Null || right == TextValue::Null {
        return TextValue::Null;
    }
    if let TextValue::Value(first) = left {
        if let TextValue::Value(second) = right {
            if text_build_octets(first.as_str()) + text_build_octets(second.as_str())
                > 1073741819i64
            {
                return TextValue::Error(make_sql_error(TEXT_SEARCH_INTERNAL_ERROR));
            }
            let mut output = first;
            output.push_str(second.as_str());
            return TextValue::Value(output);
        }
    }
    TextValue::Unknown
}

pub fn sql__pg_catalog__strpos__eb1n(left: TextValue, right: TextValue) -> Int4Value {
    if let TextValue::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let TextValue::Error(error) = right {
        return Int4Value::Error(error);
    }
    if left == TextValue::Unknown || right == TextValue::Unknown {
        return Int4Value::Unknown;
    }
    if left == TextValue::Null || right == TextValue::Null {
        return Int4Value::Null;
    }
    if let TextValue::Value(first) = left {
        if let TextValue::Value(second) = right {
            let search = TextSearchState {
                characters: first.chars().collect(),
                pattern: second.chars().collect(),
            };
            let mut index: usize = 0;
            let mut position: i32 = 1;
            while index <= search.characters.len() {
                if text_search_at(&search, index) {
                    return Int4Value::Value(position);
                }
                index += 1;
                position = position + 1;
            }
            return Int4Value::Value(0);
        }
    }
    Int4Value::Unknown
}

pub fn sql__pg_catalog__position__lq28(left: TextValue, right: TextValue) -> Int4Value {
    sql__pg_catalog__strpos__eb1n(left, right)
}

fn text_overlay_value(
    input: TextValue,
    replacement: TextValue,
    position: Int4Value,
    length: Int4Value,
    omitted: bool,
) -> TextValue {
    if let TextValue::Error(error) = input {
        return TextValue::Error(error);
    }
    if let TextValue::Error(error) = replacement {
        return TextValue::Error(error);
    }
    if let Int4Value::Error(error) = position {
        return TextValue::Error(error);
    }
    if let Int4Value::Error(error) = length {
        return TextValue::Error(error);
    }
    if input == TextValue::Unknown
        || replacement == TextValue::Unknown
        || position == Int4Value::Unknown
        || length == Int4Value::Unknown
    {
        return TextValue::Unknown;
    }
    if input == TextValue::Null
        || replacement == TextValue::Null
        || position == Int4Value::Null
        || length == Int4Value::Null
    {
        return TextValue::Null;
    }
    if let TextValue::Value(text) = input {
        if let TextValue::Value(inserted) = replacement {
            if let Int4Value::Value(start) = position {
                if let Int4Value::Value(requested) = length {
                    let mut count = requested;
                    if omitted {
                        let measured =
                            text_measure_value(TextValue::Value(inserted.clone()), false, 0);
                        if let Int4Value::Value(value) = measured {
                            count = value;
                        }
                    }
                    if start <= 0 {
                        return TextValue::Error(make_sql_error(TEXT_SUBSTRING_ERROR));
                    }
                    let end = start as i64 + count as i64;
                    if end < -2147483648i64 || end > 2147483647i64 {
                        return TextValue::Error(make_sql_error(TEXT_LENGTH_RANGE_ERROR));
                    }
                    let first = text_substring_value(
                        TextValue::Value(text.clone()),
                        Int4Value::Value(1),
                        Int4Value::Value(start - 1),
                        true,
                    );
                    let second = text_substring_value(
                        TextValue::Value(text),
                        Int4Value::Value(end as i32),
                        Int4Value::Value(0),
                        false,
                    );
                    let head = sql__pg_catalog__textcat__s76e(first, TextValue::Value(inserted));
                    return sql__pg_catalog__textcat__s76e(head, second);
                }
            }
        }
    }
    TextValue::Unknown
}

pub fn sql__pg_catalog__overlay__niqv(
    input: TextValue,
    replacement: TextValue,
    position: Int4Value,
) -> TextValue {
    text_overlay_value(input, replacement, position, Int4Value::Value(0), true)
}

pub fn sql__pg_catalog__overlay__ju3l(
    input: TextValue,
    replacement: TextValue,
    position: Int4Value,
    length: Int4Value,
) -> TextValue {
    text_overlay_value(input, replacement, position, length, false)
}

pub fn sql__pg_catalog__replace__gz9l(
    input: TextValue,
    from: TextValue,
    to: TextValue,
) -> TextValue {
    if let TextValue::Error(error) = input {
        return TextValue::Error(error);
    }
    if let TextValue::Error(error) = from {
        return TextValue::Error(error);
    }
    if let TextValue::Error(error) = to {
        return TextValue::Error(error);
    }
    if input == TextValue::Unknown || from == TextValue::Unknown || to == TextValue::Unknown {
        return TextValue::Unknown;
    }
    if input == TextValue::Null || from == TextValue::Null || to == TextValue::Null {
        return TextValue::Null;
    }
    if let TextValue::Value(text) = input {
        if let TextValue::Value(pattern) = from {
            if let TextValue::Value(replacement) = to {
                if pattern == "" || text == "" {
                    return TextValue::Value(text);
                }
                let search = TextSearchState {
                    characters: text.chars().collect(),
                    pattern: pattern.chars().collect(),
                };
                let mut index: usize = 0;
                let mut output_size = text_build_octets(text.as_str());
                let difference =
                    text_build_octets(replacement.as_str()) - text_build_octets(pattern.as_str());
                while index < search.characters.len() {
                    if text_search_at(&search, index) {
                        output_size = output_size + difference;
                        index += search.pattern.len();
                    } else {
                        index += 1;
                    };
                }
                if output_size > 1073741822i64 {
                    return TextValue::Error(make_sql_error(TEXT_BUILD_LIMIT_ERROR));
                }
                if output_size > 1073741819i64 {
                    return TextValue::Error(make_sql_error(TEXT_SEARCH_INTERNAL_ERROR));
                }
                let mut output = String::new();
                index = 0;
                while index < search.characters.len() {
                    if text_search_at(&search, index) {
                        output.push_str(replacement.as_str());
                        index += search.pattern.len();
                    } else {
                        output.push(search.characters[index]);
                        index += 1;
                    };
                }
                return TextValue::Value(output);
            }
        }
    }
    TextValue::Unknown
}

pub fn sql__pg_catalog__split_part__doxr(
    input: TextValue,
    separator: TextValue,
    field: Int4Value,
) -> TextValue {
    if let TextValue::Error(error) = input {
        return TextValue::Error(error);
    }
    if let TextValue::Error(error) = separator {
        return TextValue::Error(error);
    }
    if let Int4Value::Error(error) = field {
        return TextValue::Error(error);
    }
    if input == TextValue::Unknown || separator == TextValue::Unknown || field == Int4Value::Unknown
    {
        return TextValue::Unknown;
    }
    if input == TextValue::Null || separator == TextValue::Null || field == Int4Value::Null {
        return TextValue::Null;
    }
    if let TextValue::Value(text) = input {
        if let TextValue::Value(pattern) = separator {
            if let Int4Value::Value(requested) = field {
                if requested == 0 {
                    return TextValue::Error(make_sql_error(TEXT_SEARCH_PARAMETER_ERROR));
                }
                if text == "" {
                    return TextValue::Value(text);
                }
                if pattern == "" {
                    if requested == 1 || requested == -1 {
                        return TextValue::Value(text);
                    }
                    return TextValue::Value(String::new());
                }
                let search = TextSearchState {
                    characters: text.chars().collect(),
                    pattern: pattern.chars().collect(),
                };
                let mut target = requested as i64;
                let mut index: usize = 0;
                if target < 0i64 {
                    let mut fields: i64 = 1i64;
                    while index < search.characters.len() {
                        if text_search_at(&search, index) {
                            fields = fields + 1i64;
                            index += search.pattern.len();
                        } else {
                            index += 1;
                        };
                    }
                    target = target + fields + 1i64;
                    if target <= 0i64 {
                        return TextValue::Value(String::new());
                    }
                }
                index = 0;
                let mut first: usize = 0;
                let mut current: i64 = 1i64;
                while index < search.characters.len() {
                    if text_search_at(&search, index) {
                        if current == target {
                            return TextValue::Value(text_search_range(&search, first, index));
                        }
                        current = current + 1i64;
                        index += search.pattern.len();
                        first = index;
                    } else {
                        index += 1;
                    };
                }
                if current == target {
                    return TextValue::Value(text_search_range(&search, first, index));
                }
                return TextValue::Value(String::new());
            }
        }
    }
    TextValue::Unknown
}
