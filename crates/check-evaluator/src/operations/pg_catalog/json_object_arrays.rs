const JSON_OBJECT_ARRAY_RANK: u32 = 3452630;
const JSON_OBJECT_ARRAY_NULL: u32 = 3452548;

fn json_object_array_quote(input: &str) -> String {
    let characters: Vec<char> = input.chars().collect();
    let hex: Vec<char> = "0123456789abcdef".chars().collect();
    let mut output = String::new();
    output.push('"');
    let mut position: usize = 0;
    while position < characters.len() {
        let character = characters[position];
        let code = character as i32;
        if character == '"' {
            output.push_str("\\\"");
        } else if character == '\\' {
            output.push_str("\\\\");
        } else if character == '\u{0008}' {
            output.push_str("\\b");
        } else if character == '\u{000c}' {
            output.push_str("\\f");
        } else if character == '\n' {
            output.push_str("\\n");
        } else if character == '\r' {
            output.push_str("\\r");
        } else if character == '\t' {
            output.push_str("\\t");
        } else if code < 32 {
            output.push_str("\\u00");
            output.push(hex[usize::try_from(code / 16).unwrap_or(0)]);
            output.push(hex[usize::try_from(code % 16).unwrap_or(0)]);
        } else {
            output.push(character);
        };
        position += 1;
    }
    output.push('"');
    output
}

fn json_object_array_known(keys: ArrayPayload, values: ArrayPayload, paired: bool) -> JsonValue {
    if keys.element_type != "pg_catalog.text" || keys.element_kind != 8 {
        return JsonValue::Unknown;
    };
    let rank = keys.dimensions.len();
    if paired {
        if rank > 2 {
            return JsonValue::Error(make_sql_error(JSON_OBJECT_ARRAY_RANK));
        };
        if rank == 1 && keys.dimensions[0].length % 2 != 0 {
            return JsonValue::Error(make_sql_error(JSON_OBJECT_ARRAY_RANK));
        };
        if rank == 2 && keys.dimensions[1].length != 2 {
            return JsonValue::Error(make_sql_error(JSON_OBJECT_ARRAY_RANK));
        };
    } else {
        if values.element_type != "pg_catalog.text" || values.element_kind != 8 {
            return JsonValue::Unknown;
        };
        if rank > 1 || rank != values.dimensions.len() {
            return JsonValue::Error(make_sql_error(JSON_OBJECT_ARRAY_RANK));
        };
        if keys.elements.len() != values.elements.len() {
            return JsonValue::Error(make_sql_error(JSON_OBJECT_ARRAY_RANK));
        };
    };
    let mut index: usize = 0;
    while index < keys.elements.len() {
        let key = keys.elements[index].clone();
        if let ArrayElement::Null = key {
            return JsonValue::Error(make_sql_error(JSON_OBJECT_ARRAY_NULL));
        };
        index += 1;
        if paired {
            index += 1;
        };
    }
    let mut output = "{".to_owned();
    index = 0;
    while index < keys.elements.len() {
        let key = array_element_to_text(keys.elements[index].clone());
        if let TextValue::Error(error) = key {
            return JsonValue::Error(error);
        };
        if key == TextValue::Null {
            return JsonValue::Error(make_sql_error(JSON_OBJECT_ARRAY_NULL));
        };
        let mut ready = false;
        if let TextValue::Value(text) = key {
            ready = true;
            if index > 0 {
                output.push_str(", ");
            };
            let quoted = json_object_array_quote(text.as_str());
            output.push_str(quoted.as_str());
            output.push_str(" : ");
        };
        if ready == false {
            return JsonValue::Unknown;
        };
        let mut value = array_element_to_text(values.elements[index].clone());
        if paired {
            index += 1;
            value = array_element_to_text(keys.elements[index].clone());
        };
        if let TextValue::Error(error) = value {
            return JsonValue::Error(error);
        };
        ready = false;
        if value == TextValue::Null {
            output.push_str("null");
            ready = true;
        };
        if let TextValue::Value(text) = value {
            let quoted = json_object_array_quote(text.as_str());
            output.push_str(quoted.as_str());
            ready = true;
        };
        if ready == false {
            return JsonValue::Unknown;
        };
        index += 1;
    }
    output.push('}');
    make_json_value(output.as_str())
}

pub fn sql__pg_catalog__json_object__fm30(input: ArrayValue) -> JsonValue {
    if let ArrayValue::Error(error) = input {
        return JsonValue::Error(error);
    };
    if let ArrayValue::Null = input {
        return JsonValue::Null;
    };
    if let ArrayValue::Value(value) = input {
        return json_object_array_known(value.clone(), value, true);
    };
    JsonValue::Unknown
}

pub fn sql__pg_catalog__json_object__katl(keys: ArrayValue, values: ArrayValue) -> JsonValue {
    if let ArrayValue::Error(error) = keys {
        return JsonValue::Error(error);
    };
    if let ArrayValue::Error(error) = values {
        return JsonValue::Error(error);
    };
    if let ArrayValue::Null = keys {
        return JsonValue::Null;
    };
    if let ArrayValue::Null = values {
        return JsonValue::Null;
    };
    if let ArrayValue::Value(names) = keys {
        if let ArrayValue::Value(contents) = values {
            return json_object_array_known(names, contents, false);
        };
    };
    JsonValue::Unknown
}

fn json_object_array_to_jsonb(input: JsonValue) -> JsonbValue {
    if let JsonValue::Error(error) = input {
        return JsonbValue::Error(error);
    };
    if let JsonValue::Null = input {
        return JsonbValue::Null;
    };
    if let JsonValue::Value(value) = input {
        return jsonb_from_text(TextValue::Value(value.source));
    };
    JsonbValue::Unknown
}

pub fn sql__pg_catalog__jsonb_object__4dkp(input: ArrayValue) -> JsonbValue {
    let object = sql__pg_catalog__json_object__fm30(input);
    json_object_array_to_jsonb(object)
}

pub fn sql__pg_catalog__jsonb_object__tmdc(keys: ArrayValue, values: ArrayValue) -> JsonbValue {
    let object = sql__pg_catalog__json_object__katl(keys, values);
    json_object_array_to_jsonb(object)
}
