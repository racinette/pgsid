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
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = left { unresolved_flavor = 1; };
    if let TextValue::Unknown = right { unresolved_flavor = 1; };
    if let TextValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TextValue::Unimplemented = right { unresolved_flavor = 2; };
    if let TextValue::Error(error) = left {
        return TextValue::Error(error);
    }
    if let TextValue::Error(error) = right {
        return TextValue::Error(error);
    }
    let mut condition_flavor_45_4: i32 = unresolved_flavor; if let TextValue::Unknown = left { if condition_flavor_45_4 < 1 { condition_flavor_45_4 = 1; }; }; if let TextValue::Unimplemented = left { condition_flavor_45_4 = 2; }; if let TextValue::Unknown = right { if condition_flavor_45_4 < 1 { condition_flavor_45_4 = 1; }; }; if let TextValue::Unimplemented = right { condition_flavor_45_4 = 2; }; if ((left == TextValue::Unknown || left == TextValue::Unimplemented) || left == TextValue::NonNull) || ((right == TextValue::Unknown || right == TextValue::Unimplemented) || right == TextValue::NonNull) {
        return text_unresolved(condition_flavor_45_4);
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
    text_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__strpos__eb1n(left: TextValue, right: TextValue) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = left { unresolved_flavor = 1; };
    if let TextValue::Unknown = right { unresolved_flavor = 1; };
    if let TextValue::Unimplemented = left { unresolved_flavor = 2; };
    if let TextValue::Unimplemented = right { unresolved_flavor = 2; };
    if let TextValue::Error(error) = left {
        return Int4Value::Error(error);
    }
    if let TextValue::Error(error) = right {
        return Int4Value::Error(error);
    }
    let mut condition_flavor_78_4: i32 = unresolved_flavor; if let TextValue::Unknown = left { if condition_flavor_78_4 < 1 { condition_flavor_78_4 = 1; }; }; if let TextValue::Unimplemented = left { condition_flavor_78_4 = 2; }; if let TextValue::Unknown = right { if condition_flavor_78_4 < 1 { condition_flavor_78_4 = 1; }; }; if let TextValue::Unimplemented = right { condition_flavor_78_4 = 2; }; if ((left == TextValue::Unknown || left == TextValue::Unimplemented) || left == TextValue::NonNull) || ((right == TextValue::Unknown || right == TextValue::Unimplemented) || right == TextValue::NonNull) {
        return int4_unresolved(condition_flavor_78_4);
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
    int4_unresolved(unresolved_flavor)
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
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = input { unresolved_flavor = 1; };
    if let TextValue::Unknown = replacement { unresolved_flavor = 1; };
    if let Int4Value::Unknown = position { unresolved_flavor = 1; };
    if let Int4Value::Unknown = length { unresolved_flavor = 1; };
    if let TextValue::Unimplemented = input { unresolved_flavor = 2; };
    if let TextValue::Unimplemented = replacement { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = position { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = length { unresolved_flavor = 2; };
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
    let mut condition_flavor_137_4: i32 = unresolved_flavor; if let TextValue::Unknown = input { if condition_flavor_137_4 < 1 { condition_flavor_137_4 = 1; }; }; if let TextValue::Unimplemented = input { condition_flavor_137_4 = 2; }; if let TextValue::Unknown = replacement { if condition_flavor_137_4 < 1 { condition_flavor_137_4 = 1; }; }; if let TextValue::Unimplemented = replacement { condition_flavor_137_4 = 2; }; if let Int4Value::Unknown = position { if condition_flavor_137_4 < 1 { condition_flavor_137_4 = 1; }; }; if let Int4Value::Unimplemented = position { condition_flavor_137_4 = 2; }; if let Int4Value::Unknown = length { if condition_flavor_137_4 < 1 { condition_flavor_137_4 = 1; }; }; if let Int4Value::Unimplemented = length { condition_flavor_137_4 = 2; }; if ((input == TextValue::Unknown || input == TextValue::Unimplemented) || input == TextValue::NonNull)
        || ((replacement == TextValue::Unknown || replacement == TextValue::Unimplemented) || replacement == TextValue::NonNull)
        || (position == Int4Value::Unknown || position == Int4Value::Unimplemented)
        || (length == Int4Value::Unknown || length == Int4Value::Unimplemented)
    {
        return text_unresolved(condition_flavor_137_4);
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
    text_unresolved(unresolved_flavor)
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
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = input { unresolved_flavor = 1; };
    if let TextValue::Unknown = from { unresolved_flavor = 1; };
    if let TextValue::Unknown = to { unresolved_flavor = 1; };
    if let TextValue::Unimplemented = input { unresolved_flavor = 2; };
    if let TextValue::Unimplemented = from { unresolved_flavor = 2; };
    if let TextValue::Unimplemented = to { unresolved_flavor = 2; };
    if let TextValue::Error(error) = input {
        return TextValue::Error(error);
    }
    if let TextValue::Error(error) = from {
        return TextValue::Error(error);
    }
    if let TextValue::Error(error) = to {
        return TextValue::Error(error);
    }
    let mut condition_flavor_229_4: i32 = unresolved_flavor; if let TextValue::Unknown = input { if condition_flavor_229_4 < 1 { condition_flavor_229_4 = 1; }; }; if let TextValue::Unimplemented = input { condition_flavor_229_4 = 2; }; if let TextValue::Unknown = from { if condition_flavor_229_4 < 1 { condition_flavor_229_4 = 1; }; }; if let TextValue::Unimplemented = from { condition_flavor_229_4 = 2; }; if let TextValue::Unknown = to { if condition_flavor_229_4 < 1 { condition_flavor_229_4 = 1; }; }; if let TextValue::Unimplemented = to { condition_flavor_229_4 = 2; }; if ((input == TextValue::Unknown || input == TextValue::Unimplemented) || input == TextValue::NonNull) || ((from == TextValue::Unknown || from == TextValue::Unimplemented) || from == TextValue::NonNull) || ((to == TextValue::Unknown || to == TextValue::Unimplemented) || to == TextValue::NonNull) {
        return text_unresolved(condition_flavor_229_4);
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
    text_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__split_part__doxr(
    input: TextValue,
    separator: TextValue,
    field: Int4Value,
) -> TextValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = input { unresolved_flavor = 1; };
    if let TextValue::Unknown = separator { unresolved_flavor = 1; };
    if let Int4Value::Unknown = field { unresolved_flavor = 1; };
    if let TextValue::Unimplemented = input { unresolved_flavor = 2; };
    if let TextValue::Unimplemented = separator { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = field { unresolved_flavor = 2; };
    if let TextValue::Error(error) = input {
        return TextValue::Error(error);
    }
    if let TextValue::Error(error) = separator {
        return TextValue::Error(error);
    }
    if let Int4Value::Error(error) = field {
        return TextValue::Error(error);
    }
    let mut condition_flavor_302_4: i32 = unresolved_flavor; if let TextValue::Unknown = input { if condition_flavor_302_4 < 1 { condition_flavor_302_4 = 1; }; }; if let TextValue::Unimplemented = input { condition_flavor_302_4 = 2; }; if let TextValue::Unknown = separator { if condition_flavor_302_4 < 1 { condition_flavor_302_4 = 1; }; }; if let TextValue::Unimplemented = separator { condition_flavor_302_4 = 2; }; if let Int4Value::Unknown = field { if condition_flavor_302_4 < 1 { condition_flavor_302_4 = 1; }; }; if let Int4Value::Unimplemented = field { condition_flavor_302_4 = 2; }; if ((input == TextValue::Unknown || input == TextValue::Unimplemented) || input == TextValue::NonNull) || ((separator == TextValue::Unknown || separator == TextValue::Unimplemented) || separator == TextValue::NonNull) || (field == Int4Value::Unknown || field == Int4Value::Unimplemented)
    {
        return text_unresolved(condition_flavor_302_4);
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
    text_unresolved(unresolved_flavor)
}
