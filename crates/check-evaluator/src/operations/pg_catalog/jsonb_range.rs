pub fn jsonb_input_from_range(input: RangeValue) -> JsonbInput {
    let text = range_to_text(input);
    jsonb_input_from_text(text)
}

pub fn jsonb_input_from_multirange(input: MultirangeValue) -> JsonbInput {
    let text = multirange_to_text(input);
    jsonb_input_from_text(text)
}

fn jsonb_deferred_range_input(nullness: BoolValue, category: i32, key: bool) -> JsonbInput {
    if let BoolValue::Error(error) = nullness {
        return JsonbInput::Error(error);
    };
    if let BoolValue::Value(value) = nullness {
        if value {
            return JsonbInput::Null;
        };
        if category == 2 && key {
            return JsonbInput::ConvertedError(make_sql_error(JSONB_BUILD_PARAMETER));
        };
    };
    JsonbInput::Unknown
}

pub fn jsonb_range_input_category(input: RangeValue, category: i32, key: bool) -> JsonbInput {
    if category == 1 {
        return jsonb_input_from_range(input);
    };
    let nullness = range_is_null(input);
    jsonb_deferred_range_input(nullness, category, key)
}

pub fn jsonb_multirange_input_category(
    input: MultirangeValue,
    category: i32,
    key: bool,
) -> JsonbInput {
    if category == 1 {
        return jsonb_input_from_multirange(input);
    };
    let nullness = multirange_is_null(input);
    jsonb_deferred_range_input(nullness, category, key)
}
