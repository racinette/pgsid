const JSON_OBJECT_ARRAY_RANK: u32 = 3452630;
const JSON_OBJECT_ARRAY_NULL: u32 = 3452548;

fn json_object_array_known(keys: ArrayPayload, values: ArrayPayload, paired: bool) -> JsonValue {
    let unresolved_flavor: i32 = 0;
    if keys.element_type != "pg_catalog.text" || keys.element_kind != 8 {
        return json_unresolved(unresolved_flavor);
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
            return json_unresolved(unresolved_flavor);
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
        let mut key_flavor: i32 = unresolved_flavor;
        if (key == TextValue::Unknown || key == TextValue::NonNull) && key_flavor < 1 { key_flavor = 1; };
        if key == TextValue::Unimplemented { key_flavor = 2; };
        let mut ready = false;
        if let TextValue::Value(text) = key {
            ready = true;
            if index > 0 {
                output.push_str(", ");
            };
            let quoted = json_quote_string(text.as_str());
            output.push_str(quoted.as_str());
            output.push_str(" : ");
        };
        if ready == false {
            return json_unresolved(key_flavor);
        };
        let mut value = array_element_to_text(values.elements[index].clone());
        if paired {
            index += 1;
            value = array_element_to_text(keys.elements[index].clone());
        };
        if let TextValue::Error(error) = value {
            return JsonValue::Error(error);
        };
        let mut value_flavor: i32 = unresolved_flavor;
        if (value == TextValue::Unknown || value == TextValue::NonNull) && value_flavor < 1 { value_flavor = 1; };
        if value == TextValue::Unimplemented { value_flavor = 2; };
        ready = false;
        if value == TextValue::Null {
            output.push_str("null");
            ready = true;
        };
        if let TextValue::Value(text) = value {
            let quoted = json_quote_string(text.as_str());
            output.push_str(quoted.as_str());
            ready = true;
        };
        if ready == false {
            return json_unresolved(value_flavor);
        };
        index += 1;
    }
    output.push('}');
    make_json_value(output.as_str())
}

pub fn sql__pg_catalog__json_object__fm30(input: ArrayValue) -> JsonValue {
    let mut unresolved_flavor: i32 = 0;
    if let ArrayValue::Unknown = input { unresolved_flavor = 1; };
    if let ArrayValue::Unimplemented = input { unresolved_flavor = 2; };
    if let ArrayValue::Error(error) = input {
        return JsonValue::Error(error);
    };
    if let ArrayValue::Null = input {
        return JsonValue::Null;
    };
    if let ArrayValue::Value(value) = input {
        return json_object_array_known(value.clone(), value, true);
    };
    json_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__json_object__katl(keys: ArrayValue, values: ArrayValue) -> JsonValue {
    let mut unresolved_flavor: i32 = 0;
    if let ArrayValue::Unknown = keys { unresolved_flavor = 1; };
    if let ArrayValue::Unknown = values { unresolved_flavor = 1; };
    if let ArrayValue::Unimplemented = keys { unresolved_flavor = 2; };
    if let ArrayValue::Unimplemented = values { unresolved_flavor = 2; };
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
    json_unresolved(unresolved_flavor)
}

fn json_object_array_to_jsonb(input: JsonValue) -> JsonbValue {
    let mut unresolved_flavor: i32 = 0;
    if let JsonValue::Unknown = input { unresolved_flavor = 1; };
    if let JsonValue::NonNull = input { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let JsonValue::Unimplemented = input { unresolved_flavor = 2; };
    if let JsonValue::Error(error) = input {
        return JsonbValue::Error(error);
    };
    if let JsonValue::Null = input {
        return JsonbValue::Null;
    };
    if let JsonValue::Value(value) = input {
        return jsonb_from_text(TextValue::Value(value.source));
    };
    jsonb_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__jsonb_object__4dkp(input: ArrayValue) -> JsonbValue {
    let object = sql__pg_catalog__json_object__fm30(input);
    json_object_array_to_jsonb(object)
}

pub fn sql__pg_catalog__jsonb_object__tmdc(keys: ArrayValue, values: ArrayValue) -> JsonbValue {
    let object = sql__pg_catalog__json_object__katl(keys, values);
    json_object_array_to_jsonb(object)
}
