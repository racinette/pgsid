const JSON_BUILD_PARAMETER: u32 = 3452619;
const JSON_BUILD_NULL_KEY: u32 = 3452548;

fn json_build_key(input: JsonbInput) -> TextValue {
    if let JsonbInput::Null = input {
        return TextValue::Error(make_sql_error(JSON_BUILD_NULL_KEY));
    };
    jsonb_build_key(input)
}

fn json_build(input: JsonbArguments, object: bool, utf8: bool) -> JsonValue {
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
        let mut output = String::new();
        if object {
            output.push('{');
        } else {
            output.push('[');
        };
        index = 0;
        while index < batch.values.len() {
            if index > 0 {
                output.push_str(", ");
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
                    output.push_str(" : ");
                    ready = true;
                };
                if ready == false {
                    return JsonValue::Unknown;
                };
                index += 1;
            };
            let converted = sql__pg_catalog__to_json__25lg(batch.values[index].clone(), utf8);
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
            index += 1;
        }
        if object {
            output.push('}');
        } else {
            output.push(']');
        };
        return make_json_value(output.as_str());
    };
    JsonValue::Unknown
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
