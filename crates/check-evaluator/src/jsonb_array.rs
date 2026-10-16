#[derive(Clone)]
pub struct JsonbArrayInputPayload {
    pub state: i32,
    pub error: SqlError,
    pub dimensions: Vec<ArrayDimension>,
    pub elements: Vec<ArrayElement>,
    pub values: Vec<JsonbInput>,
    pub position: usize,
}

#[derive(Clone)]
pub enum JsonbArrayInputPlan {
    Value(JsonbArrayInputPayload),
}

pub(crate) fn prepare_jsonb_array_input(input: ArrayValue) -> JsonbArrayInputPayload {
    let prepared = prepare_array_output(input);
    let values: Vec<JsonbInput> = Vec::new();
    JsonbArrayInputPayload {
        state: prepared.state,
        error: prepared.error,
        dimensions: prepared.dimensions,
        elements: prepared.elements,
        values: values,
        position: 0,
    }
}

pub(crate) fn jsonb_array_input_continues(input: &JsonbArrayInputPayload) -> bool {
    input.state == 1 && input.position < input.elements.len()
}

pub(crate) fn jsonb_array_input_is_key(input: &JsonbArrayInputPayload) -> bool {
    (input.position as i32) % 2 == 0
}

pub(crate) fn jsonb_array_input_element(input: &JsonbArrayInputPayload) -> ArrayElement {
    if input.position < input.elements.len() {
        return input.elements[input.position].clone();
    };
    ArrayElement::Unknown
}

pub(crate) fn append_jsonb_array_input(
    input: JsonbArrayInputPayload,
    value: JsonbInput,
) -> JsonbArrayInputPayload {
    let mut values = input.values;
    values.push(value);
    JsonbArrayInputPayload {
        state: input.state,
        error: input.error,
        dimensions: input.dimensions,
        elements: input.elements,
        values: values,
        position: input.position + 1,
    }
}

pub(crate) fn jsonb_array_input_arguments(input: JsonbArrayInputPayload) -> JsonbArguments {
    if input.state == -2 {
        return JsonbArguments::Error(input.error);
    };
    if input.state == 0 {
        return JsonbArguments::Null;
    };
    if input.state != 1 || input.values.len() != input.elements.len() {
        return JsonbArguments::Unknown;
    };
    JsonbArguments::Values(JsonbArgumentPayload {
        values: input.values,
    })
}

pub(crate) fn jsonb_array_float4_input(input: Float4Value, key: bool) -> JsonbInput {
    if key {
        return jsonb_key_input_from_float4(input);
    };
    jsonb_input_from_float4(input)
}

pub(crate) fn jsonb_array_float8_input(input: Float8Value, key: bool) -> JsonbInput {
    if key {
        return jsonb_key_input_from_float8(input);
    };
    jsonb_input_from_float8(input)
}
