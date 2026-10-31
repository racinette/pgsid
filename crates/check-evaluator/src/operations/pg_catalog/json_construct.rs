const JSON_BUILD_PARAMETER: u32 = 3452619;
const JSON_BUILD_NULL_KEY: u32 = 3452548;

fn json_build_key(input: JsonbInput) -> TextValue {
    if let JsonbInput::Null = input {
        return TextValue::Error(make_sql_error(JSON_BUILD_NULL_KEY));
    };
    jsonb_build_key(input)
}

fn json_build_layout(
    input: JsonbArguments,
    object: bool,
    utf8: bool,
    record: bool,
    pretty: bool,
) -> JsonValue {
    let mut unresolved_flavor: i32 = 0;
    if let JsonbArguments::Unknown = input { unresolved_flavor = 1; };
    if let JsonbArguments::Unimplemented = input { unresolved_flavor = 2; };
    if let JsonbArguments::Error(error) = input {
        return JsonValue::Error(error);
    };
    if let JsonbArguments::Null = input {
        return JsonValue::Null;
    };
    if let JsonbArguments::Values(batch) = input {
        let mut index: usize = 0;
        let mut odd = false;
        while index < batch.values.len() {
            let argument = batch.values[index].clone();
            if let JsonbInput::Error(error) = argument {
                return JsonValue::Error(error);
            };
            odd = odd == false;
            index += 1;
        }
        if object && odd {
            return JsonValue::Error(make_sql_error(JSON_BUILD_PARAMETER));
        };
        let mut complete = true;
        let mut output = String::new();
        if object {
            output.push('{');
        } else {
            output.push('[');
        };
        index = 0;
        while index < batch.values.len() {
            if index > 0 {
                if record {
                    if pretty {
                        output.push_str(",\n ");
                    } else {
                        output.push(',');
                    };
                } else {
                    output.push_str(", ");
                };
            };
            if object {
                let key = json_build_key(batch.values[index].clone());
                if let TextValue::Error(error) = key {
                    return JsonValue::Error(error);
                };
                let mut ready = false;
                if let TextValue::Value(value) = key {
                    let quoted = json_quote_string(value.as_str());
                    output.push_str(quoted.as_str());
                    if record {
                        output.push(':');
                    } else {
                        output.push_str(" : ");
                    };
                    ready = true;
                };
                if ready == false {
                    return json_unresolved(unresolved_flavor);
                };
                index += 1;
            };
            let value = batch.values[index].clone();
            let mut converted = JsonValue::NonNull;
            let mut scalar_unknown = false;
            if let JsonbInput::ScalarUnknown(_) = value {
                scalar_unknown = true;
            };
            if scalar_unknown {
                complete = false;
            };
            if scalar_unknown == false {
                converted = sql__pg_catalog__to_json__25lg(value, utf8);
            };
            if let JsonValue::NonNull = converted {
                complete = false;
            };
            if let JsonValue::Error(error) = converted {
                return JsonValue::Error(error);
            };
            let mut condition_flavor_100_12: i32 = unresolved_flavor; if let JsonValue::Unknown = converted { if condition_flavor_100_12 < 1 { condition_flavor_100_12 = 1; }; }; if let JsonValue::Unknown = converted {
                return json_unresolved(condition_flavor_100_12);
            }; let mut condition_flavor_102_15: i32 = unresolved_flavor; if let JsonValue::Unimplemented = converted { condition_flavor_102_15 = 2; }; if let JsonValue::Unimplemented = converted {
                return json_unresolved(condition_flavor_102_15);
            };
            if let JsonValue::Null = converted {
                output.push_str("null");
            };
            if let JsonValue::Value(value) = converted {
                output.push_str(value.source.as_str());
            };
            index += 1;
        }
        if object {
            output.push('}');
        } else {
            output.push(']');
        };
        if complete == false {
            return JsonValue::NonNull;
        };
        return make_json_value(output.as_str());
    };
    json_unresolved(unresolved_flavor)
}

fn json_build(input: JsonbArguments, object: bool, utf8: bool) -> JsonValue {
    json_build_layout(input, object, utf8, false, false)
}

pub(crate) fn json_array_value_input(input: ArrayValue, converted: JsonValue) -> JsonbInput {
    if let ArrayValue::Error(error) = input {
        return JsonbInput::Error(error);
    };
    if let JsonValue::Error(error) = converted {
        return JsonbInput::ConvertedError(error);
    };
    jsonb_input_from_json(converted)
}

pub fn sql__pg_catalog__json_build_array__gme1(input: JsonbArguments, utf8: bool) -> JsonValue {
    json_build(input, false, utf8)
}

pub fn sql__pg_catalog__json_build_array__3khl() -> JsonValue {
    make_json_value("[]")
}

pub fn sql__pg_catalog__json_build_object__qfmu(input: JsonbArguments, utf8: bool) -> JsonValue {
    json_build(input, true, utf8)
}

pub fn sql__pg_catalog__json_build_object__nqz6() -> JsonValue {
    make_json_value("{}")
}

pub(crate) fn prepare_json_record_pending(
    input: CompositeValue,
    pretty: BoolValue,
) -> JsonRecordInputPayload {
    let mut state: i32 = -1;
    let mut error = make_sql_error(0);
    let fields: Vec<ArrayElement> = Vec::new();
    let values: Vec<JsonbInput> = Vec::new();
    if let CompositeValue::Error(value) = input {
        state = -2;
        error = value;
    };
    if let BoolValue::Error(value) = pretty {
        if state != -2 {
            state = -2;
            error = value;
        };
    };
    if state != -2 {
        if let CompositeValue::Null = input {
            state = 0;
        };
        if let BoolValue::Null = pretty {
            state = 0;
        };
        if let CompositeValue::Value(value) = input {
            if let BoolValue::Value(_flag) = pretty {
                return JsonRecordInputPayload {
                    state: 3,
                    error: error,
                    type_name: value.type_name,
                    fields: value.fields,
                    values: values,
                    position: 0,
                };
            };
        };
    };
    JsonRecordInputPayload {
        state: state,
        error: error,
        type_name: String::new(),
        fields: fields,
        values: values,
        position: 0,
    }
}

pub(crate) fn json_record_layout_matches(
    input: &JsonRecordInputPayload,
    type_name: &str,
    count: i32,
) -> bool {
    let expected = usize::try_from(count).unwrap_or(input.fields.len() + 1);
    input.state == 3 && input.type_name.as_str() == type_name && input.fields.len() == expected
}

pub(crate) fn select_json_record_layout(
    input: JsonRecordInputPayload,
    type_name: &str,
    count: i32,
) -> JsonRecordInputPayload {
    let mut state = input.state;
    if json_record_layout_matches(&input, type_name, count) {
        state = 1;
    };
    JsonRecordInputPayload {
        state: state,
        error: input.error,
        type_name: input.type_name,
        fields: input.fields,
        values: input.values,
        position: input.position,
    }
}

pub(crate) fn prepare_json_record(
    input: CompositeValue,
    pretty: BoolValue,
    type_name: &str,
    count: i32,
) -> JsonRecordInputPayload {
    let pending = prepare_json_record_pending(input, pretty);
    select_json_record_layout(pending, type_name, count)
}

fn json_record_conversion_stopped(input: &JsonRecordInputPayload) -> bool {
    if input.values.len() > 0 {
        let last = input.values[input.values.len() - 1].clone();
        if let JsonbInput::Unknown = last {
            return true;
        }; if let JsonbInput::Unimplemented = last {
            return true;
        };
        if let JsonbInput::ConvertedError(_error) = last {
            return true;
        };
        if let JsonbInput::Error(_error) = last {
            return true;
        };
    };
    false
}

pub(crate) fn json_record_has_field(input: &JsonRecordInputPayload) -> bool {
    input.state == 1
        && input.position < input.fields.len()
        && json_record_conversion_stopped(input) == false
}

pub(crate) fn json_record_field(input: &JsonRecordInputPayload) -> ArrayElement {
    let unresolved_flavor: i32 = 0;
    if json_record_has_field(input) {
        return input.fields[input.position].clone();
    };
    array_element_unresolved(unresolved_flavor)
}

pub(crate) fn append_json_record(
    input: JsonRecordInputPayload,
    name: &str,
    value: JsonbInput,
) -> JsonRecordInputPayload {
    let mut values = input.values;
    values.push(JsonbInput::Text(name.to_owned()));
    let mut converted = value;
    if let JsonbInput::Error(error) = converted {
        converted = JsonbInput::ConvertedError(error);
    };
    values.push(converted);
    JsonRecordInputPayload {
        state: input.state,
        error: input.error,
        type_name: input.type_name,
        fields: input.fields,
        values: values,
        position: input.position + 1,
    }
}

fn json_record_arguments(input: JsonRecordInputPayload) -> JsonbArguments {
    let unresolved_flavor: i32 = 0;
    if input.state == -2 {
        return JsonbArguments::Error(input.error);
    };
    if input.state == 0 {
        return JsonbArguments::Null;
    };
    if input.values.len() > 2147483647 || input.position > 2147483647 {
        return jsonb_arguments_unresolved(unresolved_flavor);
    };
    let count = input.values.len() as i32;
    let position = input.position as i32;
    if input.state != 1
        || (input.position != input.fields.len() && json_record_conversion_stopped(&input) == false)
        || count % 2 != 0
        || count / 2 != position
    {
        return jsonb_arguments_unresolved(unresolved_flavor);
    };
    JsonbArguments::Values(JsonbArgumentPayload {
        values: input.values,
    })
}

fn json_record_value(input: JsonRecordInputPayload, pretty: BoolValue, utf8: bool) -> JsonValue {
    let batch = json_record_arguments(input);
    let mut spaced = false;
    if let BoolValue::Value(value) = pretty {
        spaced = value;
    };
    json_build_layout(batch, true, utf8, true, spaced)
}

pub(crate) fn json_record_input(input: JsonRecordInputPayload, utf8: bool) -> JsonbInput {
    if input.state == -2 {
        return JsonbInput::Error(input.error);
    };
    let pretty = BoolValue::Value(false);
    let converted = json_record_value(input, pretty, utf8);
    if let JsonValue::Error(error) = converted {
        return JsonbInput::ConvertedError(error);
    };
    jsonb_input_from_json(converted)
}

pub(crate) fn jsonb_record_input(input: JsonRecordInputPayload) -> JsonbInput {
    if input.state == -2 {
        return JsonbInput::Error(input.error);
    };
    let batch = json_record_arguments(input);
    let converted = jsonb_build(batch, true);
    if let JsonbValue::Error(error) = converted {
        return JsonbInput::ConvertedError(error);
    };
    jsonb_input_from_jsonb(converted)
}

pub(crate) fn json_record_opaque_input(input: ArrayElement) -> JsonbInput {
    let mut unresolved_flavor: i32 = 0;
    if let ArrayElement::Unknown = input { unresolved_flavor = 1; };
    if let ArrayElement::Unimplemented = input { unresolved_flavor = 2; };
    if let ArrayElement::Null = input {
        return JsonbInput::Null;
    };
    if let ArrayElement::Error(error) = input {
        return JsonbInput::Error(error);
    };
    jsonb_input_unresolved(unresolved_flavor)
}

pub(crate) fn json_record_key_input(input: CompositeValue) -> JsonbInput {
    let mut unresolved_flavor: i32 = 0;
    if let CompositeValue::Unknown = input { unresolved_flavor = 1; };
    if let CompositeValue::Unimplemented = input { unresolved_flavor = 2; };
    if let CompositeValue::Error(error) = input {
        return JsonbInput::Error(error);
    };
    if let CompositeValue::Null = input {
        return JsonbInput::Null;
    };
    let mut condition_flavor_377_4: i32 = unresolved_flavor; if let CompositeValue::Unknown = input { if condition_flavor_377_4 < 1 { condition_flavor_377_4 = 1; }; }; if let CompositeValue::Unknown = input {
        return jsonb_input_unresolved(condition_flavor_377_4);
    }; let mut condition_flavor_379_7: i32 = unresolved_flavor; if let CompositeValue::Unimplemented = input { condition_flavor_379_7 = 2; }; if let CompositeValue::Unimplemented = input {
        return jsonb_input_unresolved(condition_flavor_379_7);
    };
    let marker = make_jsonb_value("{}");
    jsonb_input_from_jsonb(marker)
}

pub(crate) fn finish_json_record_plan(input: JsonRecordInputPayload) -> JsonRecordInputPlan {
    JsonRecordInputPlan::Value(input)
}

fn json_record_plan_value(input: JsonRecordInputPlan, pretty: BoolValue, utf8: bool) -> JsonValue {
    let mut unresolved_flavor: i32 = 0;
    if let BoolValue::Unknown = pretty { unresolved_flavor = 1; };
    if let BoolValue::Unimplemented = pretty { unresolved_flavor = 2; };
    if let JsonRecordInputPlan::Value(value) = input {
        return json_record_value(value, pretty, utf8);
    };
    json_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__row_to_json__99i2(input: JsonRecordInputPlan, utf8: bool) -> JsonValue {
    let pretty = BoolValue::Value(false);
    json_record_plan_value(input, pretty, utf8)
}

pub fn sql__pg_catalog__row_to_json__djs5(
    input: JsonRecordInputPlan,
    pretty: BoolValue,
    utf8: bool,
) -> JsonValue {
    json_record_plan_value(input, pretty, utf8)
}
