const JSON_POPULATE_ARRAY_LIMIT: u32 = 8584704;

#[derive(Clone)]
pub struct JsonPopulateArrayPayload {
    pub text: ArrayTextPayload,
    pub values: Vec<JsonbInput>,
    pub hard_index: i32,
}

#[derive(Clone)]
pub enum JsonPopulateArrayPlan {
    Value(JsonPopulateArrayPayload),
}

#[derive(Clone)]
struct JsonPopulateArrayFrame {
    input: JsonbInput,
    position: i32,
    count: i32,
}

fn json_populate_array_length(input: JsonbInput) -> i32 {
    let mut count = Int4Value::Unknown;
    let raw = input.clone();
    if let JsonbInput::Json(value) = raw {
        count = json_read_length(JsonValue::Value(value));
    };
    if let JsonbInput::Jsonb(value) = input {
        count = sql__pg_catalog__jsonb_array_length__1gng(JsonbValue::Value(value));
    };
    if let Int4Value::Value(value) = count {
        return value;
    };
    -1
}

fn json_populate_array_element(input: JsonbInput, position: i32, utf8: bool) -> JsonbInput {
    let index = make_int4_value(position);
    let raw = input.clone();
    if let JsonbInput::Json(value) = raw {
        let selected = json_read_element_context(JsonValue::Value(value), index, false, utf8);
        if let TextValue::Error(error) = selected {
            return JsonbInput::Error(error);
        };
        if let TextValue::Value(text) = selected {
            let value = make_json_value(text.as_str());
            return jsonb_input_from_json(value);
        };
    };
    if let JsonbInput::Jsonb(value) = input {
        let selected = sql__pg_catalog__jsonb_array_element__08oi(JsonbValue::Value(value), index);
        if let JsonbValue::Value(payload) = selected {
            return JsonbInput::Jsonb(jsonb_detach_subtree(payload));
        };
        return jsonb_input_from_jsonb(selected);
    };
    JsonbInput::Unknown
}

fn json_populate_array_text_event(input: TextValue) -> ArrayTextEvent {
    if let TextValue::Value(text) = input {
        return ArrayTextEvent::Text(text);
    };
    if let TextValue::Null = input {
        return ArrayTextEvent::Null;
    };
    if let TextValue::Error(error) = input {
        return ArrayTextEvent::Error(error);
    };
    ArrayTextEvent::Unknown
}

pub(crate) fn prepare_json_populate_array(
    input: JsonbInput,
    text: TextValue,
    box_delimiter: bool,
    nulls: i32,
    quoted: bool,
    container: i32,
    calendar: bool,
    utf8: bool,
) -> JsonPopulateArrayPayload {
    let mut values: Vec<JsonbInput> = Vec::new();
    if json_populate_kind(input.clone()) != 5 {
        return JsonPopulateArrayPayload {
            text: prepare_array_text(text, box_delimiter, nulls),
            values: values,
            hard_index: -1,
        };
    };
    let count = json_populate_array_length(input.clone());
    let mut frames: Vec<JsonPopulateArrayFrame> = Vec::new();
    frames.push(JsonPopulateArrayFrame {
        input: input,
        position: 0,
        count: count,
    });
    let mut depth: usize = 1;
    let mut dimensions: Vec<ArrayDimension> = Vec::new();
    let mut ndims: usize = 0;
    let mut events: Vec<ArrayTextEvent> = Vec::new();
    let mut failed = false;
    while depth > 0 && failed == false {
        let top = depth - 1;
        let frame = frames[top].clone();
        if ndims == 0 {
            let first = json_populate_array_element(frame.input.clone(), 0, utf8);
            if frame.count == 0 || json_populate_kind(first) != 5 {
                ndims = depth;
                while dimensions.len() < ndims {
                    dimensions.push(ArrayDimension {
                        lower: 1,
                        length: -1,
                    });
                }
            };
        };
        if frame.position >= frame.count {
            if top == 0 || dimensions[top].length == -1 {
                dimensions[top] = ArrayDimension {
                    lower: 1,
                    length: frame.count,
                };
            } else if dimensions[top].length != frame.count {
                events.push(ArrayTextEvent::Error(make_sql_error(
                    JSON_POPULATE_ARRAY_ERROR,
                )));
                values.push(JsonbInput::Error(make_sql_error(JSON_POPULATE_ARRAY_ERROR)));
                failed = true;
            };
            depth = depth - 1;
        } else {
            let value = json_populate_array_element(frame.input.clone(), frame.position, utf8);
            frames[top] = JsonPopulateArrayFrame {
                input: frame.input,
                position: frame.position + 1,
                count: frame.count,
            };
            if ndims > 0 && depth >= ndims {
                let scalar =
                    json_populate_scalar_text(value.clone(), quoted, container, calendar, utf8);
                values.push(value);
                events.push(json_populate_array_text_event(scalar));
            } else if json_populate_kind(value.clone()) != 5 {
                events.push(ArrayTextEvent::Error(make_sql_error(
                    JSON_POPULATE_ARRAY_ERROR,
                )));
                values.push(JsonbInput::Error(make_sql_error(JSON_POPULATE_ARRAY_ERROR)));
                failed = true;
            } else {
                let count = json_populate_array_length(value.clone());
                let child = JsonPopulateArrayFrame {
                    input: value,
                    position: 0,
                    count: count,
                };
                if depth == frames.len() {
                    frames.push(child);
                } else {
                    frames[depth] = child;
                };
                depth += 1;
            };
        };
    }
    let mut hard_index: i32 = -1;
    if failed == false && ndims > 6 {
        hard_index = events.len() as i32;
        events.push(ArrayTextEvent::Error(make_sql_error(
            JSON_POPULATE_ARRAY_LIMIT,
        )));
        values.push(JsonbInput::Error(make_sql_error(JSON_POPULATE_ARRAY_LIMIT)));
    };
    let mut output: Vec<ArrayDimension> = Vec::new();
    let mut position: usize = 0;
    let mut empty = false;
    while position < dimensions.len() {
        if dimensions[position].length == 0 {
            empty = true;
        };
        position += 1;
    }
    position = 0;
    while empty == false && position < dimensions.len() {
        output.push(ArrayDimension {
            lower: 1,
            length: dimensions[position].length,
        });
        position += 1;
    }
    JsonPopulateArrayPayload {
        text: ArrayTextPayload {
            state: 1,
            dimensions: output,
            events: events,
        },
        values: values,
        hard_index: hard_index,
    }
}

pub(crate) fn json_populate_array_text(input: &JsonPopulateArrayPayload) -> ArrayTextPayload {
    input.text.clone()
}

pub(crate) fn json_populate_array_hard(
    input: &JsonPopulateArrayPayload,
    index: Int4Value,
) -> CheckOutcome {
    if let Int4Value::Value(position) = index {
        if input.hard_index >= 0 && position > input.hard_index {
            return CheckOutcome::Error(make_sql_error(JSON_POPULATE_ARRAY_LIMIT));
        };
    };
    CheckOutcome::True
}

pub(crate) fn json_populate_array_current(
    input: &JsonPopulateArrayPayload,
    index: Int4Value,
) -> JsonbInput {
    if let Int4Value::Value(position) = index {
        if position >= 0 && position < input.values.len() as i32 {
            return input.values[usize::try_from(position).unwrap_or(0)].clone();
        };
    };
    JsonbInput::Unknown
}

pub(crate) fn json_populate_array_has_event(
    text: &ArrayTextPayload,
    index: Int4Value,
    input: &ArrayOutputPayload,
) -> bool {
    input.state == 1 && array_text_has_event(text, index)
}

pub(crate) fn json_populate_array_jsonb(
    input: JsonbInput,
    text: TextValue,
    utf8: bool,
) -> JsonbValue {
    if let JsonbInput::Unknown = input {
        return jsonb_from_text_context(text, utf8);
    };
    json_populate_jsonb(input, utf8)
}

pub(crate) fn finish_json_populate_array(
    input: ArrayTextPayload,
    converted: ArrayArguments,
) -> ArrayValue {
    if let ArrayArguments::Unknown = converted {
        return ArrayValue::Unknown;
    };
    finish_domain_array_input(input, converted)
}

pub(crate) fn json_populate_array_modifier(
    input: ArrayElement,
    identity: &str,
    modifier: i32,
) -> ArrayElement {
    if modifier < 0 {
        return input;
    };
    if identity == "pg_catalog.\"varchar\"" {
        return array_element_from_text(sql__pg_catalog__varchar__2rhn(
            array_element_to_text(input),
            make_int4_value(modifier),
            make_bool_value(false),
        ));
    };
    if identity == "pg_catalog.bpchar" {
        return array_element_from_text(sql__pg_catalog__bpchar__2uas(
            array_element_to_text(input),
            make_int4_value(modifier),
            make_bool_value(false),
        ));
    };
    array_element_typmod(input, identity, modifier)
}
