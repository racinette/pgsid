const JSONPATH_METHOD_BIGINT: i32 = 115;
const JSONPATH_METHOD_NUMBER: i32 = 118;
const JSONPATH_METHOD_STRING: i32 = 121;
const JSONPATH_METHOD_BOOLEAN: i32 = 122;
const JSONPATH_METHOD_DECIMAL: i32 = 124;
const JSONPATH_METHOD_INTEGER: i32 = 125;

fn jsonpath_conversion_kind(kind: i32) -> bool {
    kind == JSONPATH_METHOD_BIGINT
        || kind == JSONPATH_METHOD_NUMBER
        || kind == JSONPATH_METHOD_STRING
        || kind == JSONPATH_METHOD_BOOLEAN
        || kind == JSONPATH_METHOD_DECIMAL
        || kind == JSONPATH_METHOD_INTEGER
}

fn jsonpath_conversion_integer_text(input: TextValue, wide: bool) -> NumericValue {
    if let TextValue::Value(value) = input {
        let characters: Vec<char> = value.chars().collect();
        let mut start: usize = 0;
        let mut end = characters.len();
        while start < end && numeric_space(characters[start]) {
            start += 1;
        }
        while end > start && numeric_space(characters[end - 1]) {
            end = end - 1;
        }
        let mut negative = false;
        if start < end && (characters[start] == '+' || characters[start] == '-') {
            negative = characters[start] == '-';
            start += 1;
        };
        let mut radix: i64 = 10i64;
        let mut prefixed = false;
        if start + 1 < end && characters[start] == '0' {
            let prefix = characters[start + 1].to_ascii_lowercase();
            if prefix == 'x' {
                radix = 16i64;
                prefixed = true;
            };
            if prefix == 'o' {
                radix = 8i64;
                prefixed = true;
            };
            if prefix == 'b' {
                radix = 2i64;
                prefixed = true;
            };
            if prefixed {
                start += 2;
            };
        };
        let mut minimum: i64 = -2147483647i64;
        if negative {
            minimum = -2147483648i64;
        };
        if wide {
            minimum = -9223372036854775807i64;
            if negative {
                minimum = -9223372036854775808i64;
            };
        };
        let mut number: i64 = 0i64;
        let mut digits = false;
        let mut previous = prefixed;
        while start < end {
            let character = characters[start];
            let digit = jsonpath_scan_hex(character) as i64;
            if character == '_' {
                if previous == false || start + 1 == end {
                    return NumericValue::Error(make_sql_error(JSONPATH_METHOD_NON_NUMERIC));
                };
                let next = jsonpath_scan_hex(characters[start + 1]) as i64;
                if next < 0i64 || next >= radix {
                    return NumericValue::Error(make_sql_error(JSONPATH_METHOD_NON_NUMERIC));
                };
                previous = false;
            } else {
                if digit < 0i64 || digit >= radix {
                    return NumericValue::Error(make_sql_error(JSONPATH_METHOD_NON_NUMERIC));
                };
                if number < (minimum + digit) / radix {
                    return NumericValue::Error(make_sql_error(JSONPATH_METHOD_NON_NUMERIC));
                };
                number = number * radix - digit;
                digits = true;
                previous = true;
            };
            start += 1;
        }
        if digits == false {
            return NumericValue::Error(make_sql_error(JSONPATH_METHOD_NON_NUMERIC));
        };
        if negative == false {
            number = 0i64 - number;
        };
        return NumericValue::Value(text_signed_number(number));
    };
    NumericValue::Unknown
}

fn jsonpath_conversion_number_text(input: TextValue) -> NumericValue {
    if let TextValue::Value(value) = input {
        let characters: Vec<char> = value.chars().collect();
        let mut start: usize = 0;
        let mut end = characters.len();
        while start < end && numeric_space(characters[start]) {
            start += 1;
        }
        while end > start && numeric_space(characters[end - 1]) {
            end = end - 1;
        }
        let mut negative = false;
        if start < end && (characters[start] == '+' || characters[start] == '-') {
            negative = characters[start] == '-';
            start += 1;
        };
        if start == end {
            return NumericValue::Error(make_sql_error(JSONPATH_METHOD_NON_NUMERIC));
        };
        let mut radix: i32 = 10;
        let mut prefix_end = start;
        if start + 1 < end && characters[start] == '0' {
            let prefix = characters[start + 1].to_ascii_lowercase();
            if prefix == 'x' {
                radix = 16;
                prefix_end = start + 2;
            };
            if prefix == 'o' {
                radix = 8;
                prefix_end = start + 2;
            };
            if prefix == 'b' {
                radix = 2;
                prefix_end = start + 2;
            };
        };
        let mut clean = String::new();
        let mut position = start;
        while position < end {
            let character = characters[position];
            if character == '_' {
                if position == start || position + 1 == end {
                    return NumericValue::Error(make_sql_error(JSONPATH_METHOD_NON_NUMERIC));
                };
                let before = jsonpath_scan_hex(characters[position - 1]);
                let after = jsonpath_scan_hex(characters[position + 1]);
                if (position != prefix_end && (before < 0 || before >= radix))
                    || after < 0
                    || after >= radix
                {
                    return NumericValue::Error(make_sql_error(JSONPATH_METHOD_NON_NUMERIC));
                };
            } else {
                clean.push(character);
            };
            position += 1;
        }
        let content: Vec<char> = clean.chars().collect();
        let mut begin: usize = 0;
        if radix == 10 {
            while begin + 1 < content.len()
                && content[begin] == '0'
                && numeric_wire_decimal_digit(content[begin + 1]) >= 0
            {
                begin += 1;
            }
        };
        let mut normalized = String::new();
        position = begin;
        while position < content.len() {
            normalized.push(content[position]);
            position += 1;
        }
        let source = JsonpathScanSource {
            characters: normalized.chars().collect(),
        };
        if source.characters.len() == 0 {
            return NumericValue::Error(make_sql_error(JSONPATH_METHOD_NON_NUMERIC));
        };
        let first = source.characters[0];
        if numeric_wire_decimal_digit(first) < 0 && first != '.' {
            return NumericValue::Error(make_sql_error(JSONPATH_METHOD_NON_NUMERIC));
        };
        let token = jsonpath_scan_number(&source, 0);
        if token.error != 0
            || token.end != source.characters.len()
            || (token.kind != JSONPATH_SCAN_INT && token.kind != JSONPATH_SCAN_NUMERIC)
        {
            return NumericValue::Error(make_sql_error(JSONPATH_METHOD_NON_NUMERIC));
        };
        let parsed = jsonpath_numeric_literal(normalized.as_str());
        if let TextValue::Error(_) = parsed {
            return NumericValue::Error(make_sql_error(JSONPATH_METHOD_NON_NUMERIC));
        };
        if let TextValue::Value(number) = parsed {
            let mut result = NumericValue::Value(number);
            if negative {
                result = sql__pg_catalog__numeric_uminus__wcmy(result);
            };
            return result;
        };
    };
    NumericValue::Unknown
}

fn jsonpath_conversion_boolean_text(input: TextValue) -> BoolValue {
    if let TextValue::Value(value) = input {
        let characters: Vec<char> = value.chars().collect();
        let start: usize = 0;
        let end = characters.len();
        if end - start == 1 && characters[start] == '1' {
            return BoolValue::Value(true);
        };
        if end - start == 1 && characters[start] == '0' {
            return BoolValue::Value(false);
        };
        let mut result = BoolValue::Error(make_sql_error(JSONPATH_METHOD_NON_NUMERIC));
        let words: Vec<char> = "truefalseyesnoonoff".chars().collect();
        let mut word: usize = 0;
        while word < 6 {
            let mut begin: usize = 0;
            let mut length: usize = 4;
            let mut minimum: usize = 1;
            let mut state = true;
            if word == 1 {
                begin = 4;
                length = 5;
                state = false;
            };
            if word == 2 {
                begin = 9;
                length = 3;
            };
            if word == 3 {
                begin = 12;
                length = 2;
                state = false;
            };
            if word == 4 {
                begin = 14;
                length = 2;
                minimum = 2;
            };
            if word == 5 {
                begin = 16;
                length = 3;
                minimum = 2;
                state = false;
            };
            if end - start >= minimum && end - start <= length {
                let mut offset: usize = 0;
                let mut equal = true;
                while offset < end - start {
                    if characters[start + offset].to_ascii_lowercase() != words[begin + offset] {
                        equal = false;
                    };
                    offset += 1;
                }
                if equal {
                    result = BoolValue::Value(state);
                };
            };
            word += 1;
        }
        return result;
    };
    BoolValue::Unknown
}

fn jsonpath_conversion_boolean_value(
    number: NumericValue,
    text: TextValue,
    value_kind: i32,
) -> BoolValue {
    if value_kind == 1 || value_kind == 2 {
        return BoolValue::Value(value_kind == 2);
    };
    if value_kind == 4 {
        return jsonpath_conversion_boolean_text(text);
    };
    if value_kind == 3 {
        if let NumericValue::Value(value) = number {
            let parsed = jsonpath_conversion_integer_text(TextValue::Value(value), false);
            if let NumericValue::Error(error) = parsed {
                return BoolValue::Error(error);
            };
            if let NumericValue::Value(value) = parsed {
                return BoolValue::Value(value != "0".to_owned());
            };
        };
        return BoolValue::Unknown;
    };
    BoolValue::Error(make_sql_error(JSONPATH_METHOD_NON_NUMERIC))
}

fn jsonpath_conversion_string_value(
    number: NumericValue,
    text: TextValue,
    value_kind: i32,
) -> TextValue {
    if value_kind == 4 {
        return text;
    };
    if value_kind == 1 {
        return TextValue::Value("false".to_owned());
    };
    if value_kind == 2 {
        return TextValue::Value("true".to_owned());
    };
    if value_kind == 3 {
        if let NumericValue::Value(value) = number {
            return TextValue::Value(value);
        };
        return TextValue::Unknown;
    };
    TextValue::Error(make_sql_error(JSONPATH_METHOD_NON_NUMERIC))
}

fn jsonpath_conversion_numeric_value(
    context: &JsonpathExecutionContext,
    method: JsonpathNode,
    number: NumericValue,
    text: TextValue,
    value_kind: i32,
) -> NumericValue {
    if value_kind != 3 && value_kind != 4 {
        return NumericValue::Error(make_sql_error(JSONPATH_METHOD_NON_NUMERIC));
    };
    let mut converted = number;
    if method.kind == JSONPATH_METHOD_INTEGER || method.kind == JSONPATH_METHOD_BIGINT {
        if value_kind == 4 {
            return jsonpath_conversion_integer_text(text, method.kind == JSONPATH_METHOD_BIGINT);
        };
        if method.kind == JSONPATH_METHOD_INTEGER {
            let integer = sql__pg_catalog__int4__z4rh(converted);
            if let Int4Value::Error(_) = integer {
                return NumericValue::Error(make_sql_error(JSONPATH_METHOD_NON_NUMERIC));
            };
            return sql__pg_catalog__numeric__ncrk(integer);
        };
        let integer = sql__pg_catalog__int8__xy54(converted);
        if let Int8Value::Error(_) = integer {
            return NumericValue::Error(make_sql_error(JSONPATH_METHOD_NON_NUMERIC));
        };
        return sql__pg_catalog__numeric__11bc(integer);
    };
    if value_kind == 4 {
        converted = jsonpath_conversion_number_text(text);
    };
    if method.kind == JSONPATH_METHOD_DECIMAL && method.left > 0 {
        if let NumericValue::Error(error) = converted {
            return NumericValue::Error(error);
        };
        if let NumericValue::Unknown = converted {
            return NumericValue::Unknown;
        };
        let precision = sql__pg_catalog__int4__z4rh(jsonpath_execution_numeric(
            context,
            JsonpathReference {
                source: 2,
                node: method.left,
            },
        ));
        if let Int4Value::Error(_) = precision {
            return NumericValue::Error(make_sql_error(JSONPATH_METHOD_NON_NUMERIC));
        };
        let mut scale = Int4Value::Value(0);
        if method.right > 0 {
            scale = sql__pg_catalog__int4__z4rh(jsonpath_execution_numeric(
                context,
                JsonpathReference {
                    source: 2,
                    node: method.right,
                },
            ));
        };
        if let Int4Value::Error(_) = scale {
            return NumericValue::Error(make_sql_error(JSONPATH_METHOD_NON_NUMERIC));
        };
        if let Int4Value::Value(p) = precision {
            if let Int4Value::Value(s) = scale {
                if p < 1 || p > 1000 || s < -1000 || s > 1000 {
                    return NumericValue::Error(make_sql_error(JSONPATH_EXEC_PARAMETER));
                };
                let mut packed = s;
                if packed < 0 {
                    packed = packed + 2048;
                };
                return jsonpath_conversion_remap_numeric(sql__pg_catalog__numeric__879l(
                    converted,
                    Int4Value::Value(p * 65536 + packed + 4),
                ));
            };
        };
        return NumericValue::Unknown;
    };
    converted
}

fn jsonpath_conversion_remap_numeric(value: NumericValue) -> NumericValue {
    if let NumericValue::Error(_) = value {
        return NumericValue::Error(make_sql_error(JSONPATH_METHOD_NON_NUMERIC));
    };
    value
}

fn jsonpath_conversion_text_predicate(
    kind: i32,
    left: TextValue,
    right: TextValue,
    utf8: bool,
) -> JsonpathPredicateValue {
    if let TextValue::Value(first) = left {
        if let TextValue::Value(second) = right {
            let a: Vec<char> = first.chars().collect();
            let b: Vec<char> = second.chars().collect();
            let mut index: usize = 0;
            let mut unicode = false;
            while index < a.len() {
                if a[index] as i32 > 127 {
                    unicode = true;
                };
                index += 1;
            }
            index = 0;
            while index < b.len() {
                if b[index] as i32 > 127 {
                    unicode = true;
                };
                index += 1;
            }
            if unicode && utf8 == false {
                return JsonpathPredicateValue {
                    state: 0,
                    deferred: true,
                };
            };
            index = 0;
            let mut order: i32 = 0;
            while index < a.len() && index < b.len() && order == 0 {
                let x = a[index] as i32;
                let y = b[index] as i32;
                if x < y {
                    order = -1;
                };
                if x > y {
                    order = 1;
                };
                index += 1;
            }
            if order == 0 {
                if a.len() < b.len() {
                    order = -1;
                };
                if a.len() > b.len() {
                    order = 1;
                };
            };
            let mut result = false;
            if kind == JSONPATH_NODE_STARTS {
                result = b.len() <= a.len();
                index = 0;
                while result && index < b.len() {
                    if a[index] != b[index] {
                        result = false;
                    };
                    index += 1;
                }
            };
            if kind == JSONPATH_NODE_EQ {
                result = order == 0;
            };
            if kind == JSONPATH_NODE_NE {
                result = order != 0;
            };
            if kind == JSONPATH_NODE_LT {
                result = order < 0;
            };
            if kind == JSONPATH_NODE_LE {
                result = order <= 0;
            };
            if kind == JSONPATH_NODE_GT {
                result = order > 0;
            };
            if kind == JSONPATH_NODE_GE {
                result = order >= 0;
            };
            let mut state: i32 = 1;
            if result {
                state = 2;
            };
            return JsonpathPredicateValue {
                state: state,
                deferred: false,
            };
        };
    };
    JsonpathPredicateValue {
        state: 0,
        deferred: true,
    }
}
