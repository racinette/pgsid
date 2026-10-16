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
        let parsed = scalar_numeric_from_text(TextValue::Value(value));
        if let NumericValue::Error(_) = parsed {
            return NumericValue::Error(make_sql_error(JSONPATH_METHOD_NON_NUMERIC));
        };
        if let NumericValue::Value(number) = parsed {
            let parts = numeric_parts(number.as_str());
            if parts.valid && parts.special == 1 {
                return NumericValue::Value(number);
            };
            return NumericValue::Error(make_sql_error(JSONPATH_METHOD_NON_NUMERIC));
        };
    };
    NumericValue::Unknown
}

fn jsonpath_conversion_boolean_text(input: TextValue) -> BoolValue {
    let result = scalar_boolean_word(input);
    if let BoolValue::Error(_) = result {
        return BoolValue::Error(make_sql_error(JSONPATH_METHOD_NON_NUMERIC));
    };
    result
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
