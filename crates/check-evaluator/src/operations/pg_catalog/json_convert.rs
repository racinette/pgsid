pub fn jsonb_text_context(input: JsonbValue, utf8: bool) -> TextValue {
    if utf8 == false {
        return jsonb_to_text(input);
    };
    if let JsonbValue::Value(value) = input {
        let original = value.clone();
        let mut nodes = value.nodes;
        let mut index: usize = 1;
        while index < nodes.len() {
            let node = original.nodes[index];
            if node.kind == 6 {
                let children = jsonb_order_children(&original, node);
                let mut first: usize = 0;
                let mut position: usize = 0;
                while position < children.len() {
                    if position == 0 {
                        first = children[position];
                    };
                    let mut next: usize = 0;
                    if position + 1 < children.len() {
                        next = children[position + 1];
                    };
                    let child = children[position];
                    nodes[child] = jsonb_edit_link(nodes[child], next);
                    position += 1;
                }
                nodes[index] = jsonb_format_child(nodes[index], first);
            };
            index += 1;
        }
        return jsonb_to_ordered_text(JsonbValue::Value(JsonbPayload {
            characters: value.characters,
            nodes: nodes,
            root: value.root,
        }));
    };
    jsonb_to_text(input)
}

pub fn json_input_from_numeric(input: NumericValue) -> JsonbInput {
    let output = array_numeric_output(input);
    if let TextValue::Error(error) = output {
        return JsonbInput::Error(error);
    };
    if output == TextValue::Null {
        return JsonbInput::Null;
    };
    if let TextValue::Value(value) = output {
        return JsonbInput::Number(value);
    };
    JsonbInput::Unknown
}

pub fn sql__pg_catalog__to_json__25lg(input: JsonbInput, utf8: bool) -> JsonValue {
    if let JsonbInput::Error(error) = input {
        return JsonValue::Error(error);
    };
    if let JsonbInput::ConvertedError(error) = input {
        return JsonValue::Error(error);
    };
    if let JsonbInput::Null = input {
        return JsonValue::Null;
    };
    if let JsonbInput::Boolean(value) = input {
        if value {
            return make_json_value("true");
        };
        return make_json_value("false");
    };
    if let JsonbInput::Number(value) = input {
        if value == "NaN" || value == "Infinity" || value == "-Infinity" {
            let quoted = json_quote_string(value.as_str());
            return make_json_value(quoted.as_str());
        };
        return make_json_value(value.as_str());
    };
    if let JsonbInput::Text(value) = input {
        let quoted = json_quote_string(value.as_str());
        return make_json_value(quoted.as_str());
    };
    if let JsonbInput::Json(value) = input {
        return JsonValue::Value(value);
    };
    if let JsonbInput::Jsonb(value) = input {
        let output = jsonb_text_context(JsonbValue::Value(value), utf8);
        return json_from_coerced_text(output);
    };
    JsonValue::Unknown
}

#[derive(Clone, Copy)]
struct JsonOutputArrayFrame {
    dimension: usize,
    count: i32,
}

pub(crate) fn json_array_input_value(
    input: JsonbArrayInputPayload,
    pretty: BoolValue,
    utf8: bool,
) -> JsonValue {
    if input.state == -2 {
        return JsonValue::Error(input.error);
    };
    if let BoolValue::Error(error) = pretty {
        return JsonValue::Error(error);
    };
    if input.state == 0 || pretty == BoolValue::Null {
        return JsonValue::Null;
    };
    if input.state != 1 || pretty == BoolValue::Unknown {
        return JsonValue::Unknown;
    };
    if input.values.len() != input.elements.len() {
        return JsonValue::Unknown;
    };
    if input.values.len() == 0 {
        return make_json_value("[]");
    };
    let mut spaced = false;
    if let BoolValue::Value(value) = pretty {
        spaced = value;
    };
    let mut output = "[".to_owned();
    let mut frames: Vec<JsonOutputArrayFrame> = Vec::new();
    frames.push(JsonOutputArrayFrame {
        dimension: 0,
        count: 0,
    });
    let mut depth: usize = 1;
    let mut position: usize = 0;
    while depth > 0 {
        let frame = frames[depth - 1];
        if frame.count == input.dimensions[frame.dimension].length {
            output.push(']');
            depth = depth - 1;
        } else {
            if frame.count > 0 {
                if spaced && frame.dimension == 0 {
                    output.push_str(",\n ");
                } else {
                    output.push(',');
                };
            };
            frames[depth - 1] = JsonOutputArrayFrame {
                dimension: frame.dimension,
                count: frame.count + 1,
            };
            if frame.dimension + 1 < input.dimensions.len() {
                output.push('[');
                let next = JsonOutputArrayFrame {
                    dimension: frame.dimension + 1,
                    count: 0,
                };
                if depth == frames.len() {
                    frames.push(next);
                } else {
                    frames[depth] = next;
                };
                depth += 1;
            } else {
                let converted =
                    sql__pg_catalog__to_json__25lg(input.values[position].clone(), utf8);
                if let JsonValue::Error(error) = converted {
                    return JsonValue::Error(error);
                };
                if let JsonValue::Unknown = converted {
                    return JsonValue::Unknown;
                };
                if let JsonValue::Null = converted {
                    output.push_str("null");
                };
                if let JsonValue::Value(value) = converted {
                    output.push_str(value.source.as_str());
                };
                position += 1;
            };
        };
    }
    make_json_value(output.as_str())
}

pub(crate) fn json_array_input_plan(input: JsonbArrayInputPayload) -> JsonbArrayInputPlan {
    JsonbArrayInputPlan::Value(input)
}

pub fn sql__pg_catalog__array_to_json__sjq7(input: JsonbArrayInputPlan, utf8: bool) -> JsonValue {
    if let JsonbArrayInputPlan::Value(value) = input {
        return json_array_input_value(value, make_bool_value(false), utf8);
    };
    JsonValue::Unknown
}

pub fn sql__pg_catalog__array_to_json__fydb(
    input: JsonbArrayInputPlan,
    pretty: BoolValue,
    utf8: bool,
) -> JsonValue {
    if let JsonbArrayInputPlan::Value(value) = input {
        return json_array_input_value(value, pretty, utf8);
    };
    JsonValue::Unknown
}
