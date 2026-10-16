const JSONPATH_METHOD_ABS: i32 = 102;
const JSONPATH_METHOD_SIZE: i32 = 108;
const JSONPATH_METHOD_TYPE: i32 = 111;
const JSONPATH_METHOD_FLOOR: i32 = 114;
const JSONPATH_METHOD_DOUBLE: i32 = 116;
const JSONPATH_METHOD_CEILING: i32 = 123;
const JSONPATH_METHOD_NON_NUMERIC: u32 = 3452658;
const JSONPATH_METHOD_TYPE_NAMES: &[&str] = &[
    "null",
    "boolean",
    "boolean",
    "number",
    "string",
    "array",
    "object",
    "date",
    "time without time zone",
    "time with time zone",
    "timestamp without time zone",
    "timestamp with time zone",
];

fn jsonpath_method_core(kind: i32) -> bool {
    kind == JSONPATH_METHOD_ABS
        || kind == JSONPATH_METHOD_SIZE
        || kind == JSONPATH_METHOD_TYPE
        || kind == JSONPATH_METHOD_FLOOR
        || kind == JSONPATH_METHOD_DOUBLE
        || kind == JSONPATH_METHOD_CEILING
        || jsonpath_conversion_kind(kind)
}

fn jsonpath_method_text(
    context: &JsonpathExecutionContext,
    reference: JsonpathReference,
) -> TextValue {
    let node = jsonpath_execution_node(context, reference);
    if node.kind != 4 {
        return TextValue::Unknown;
    };
    let mut text = String::new();
    let mut position = node.text_start;
    while position < node.text_end {
        text.push(jsonpath_execution_character(
            context,
            reference.source,
            position,
        ));
        position += 1;
    }
    TextValue::Value(text)
}

fn jsonpath_method_nan_spelling(input: &str) -> bool {
    let characters: Vec<char> = input.chars().collect();
    let mut index: usize = 0;
    while index < characters.len() && numeric_space(characters[index]) {
        index += 1;
    }
    if index < characters.len() && (characters[index] == '+' || characters[index] == '-') {
        index += 1;
    };
    index + 2 < characters.len()
        && characters[index].to_ascii_lowercase() == 'n'
        && characters[index + 1].to_ascii_lowercase() == 'a'
        && characters[index + 2].to_ascii_lowercase() == 'n'
}

fn jsonpath_method_double_value(
    number: NumericValue,
    text: TextValue,
    numeric: bool,
) -> NumericValue {
    let mut input = text;
    if numeric {
        let copied = number.clone();
        if let NumericValue::Value(value) = copied {
            input = TextValue::Value(value);
        };
    };
    let copied_input = input.clone();
    if let TextValue::Value(value) = copied_input {
        if jsonpath_method_nan_spelling(value.as_str()) {
            return NumericValue::Error(make_sql_error(JSONPATH_METHOD_NON_NUMERIC));
        };
    };
    let converted = float8_semantic(float8_from_text(input));
    if let Float8Value::Error(_) = converted {
        return NumericValue::Error(make_sql_error(JSONPATH_METHOD_NON_NUMERIC));
    };
    if let Float8Value::Value(bits) = converted {
        let value = float8_number(bits);
        let infinity = 1.0f64 / 0.0f64;
        if value != value || value.abs() == infinity {
            return NumericValue::Error(make_sql_error(JSONPATH_METHOD_NON_NUMERIC));
        };
        if numeric {
            return number;
        };
        return sql__pg_catalog__numeric__ev2s(Float8Value::Value(bits));
    };
    NumericValue::Unknown
}

fn jsonpath_method_numeric(
    kind: i32,
    number: NumericValue,
    text: TextValue,
    value_kind: i32,
) -> NumericValue {
    if kind == JSONPATH_METHOD_DOUBLE {
        if value_kind != 3 && value_kind != 4 {
            return NumericValue::Error(make_sql_error(JSONPATH_METHOD_NON_NUMERIC));
        };
        return jsonpath_method_double_value(number, text, value_kind == 3);
    };
    if value_kind != 3 {
        return NumericValue::Error(make_sql_error(JSONPATH_METHOD_NON_NUMERIC));
    };
    if kind == JSONPATH_METHOD_ABS {
        return sql__pg_catalog__numeric_abs__6g5e(number);
    };
    if kind == JSONPATH_METHOD_FLOOR {
        return sql__pg_catalog__floor__x7mh(number);
    };
    sql__pg_catalog__ceiling__pr5v(number)
}
