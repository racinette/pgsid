const JSON_POPULATE_OBJECT_ERROR: u32 = 3452619;
const JSON_POPULATE_ARRAY_ERROR: u32 = 3484946;
const JSON_POPULATE_CALENDAR_ERROR: u32 = 3452551;

pub(crate) fn json_populate_kind(input: JsonbInput) -> i32 {
    if let JsonbInput::Json(value) = input {
        return value.kind;
    };
    if let JsonbInput::Jsonb(value) = input {
        return value.nodes[value.root].kind;
    };
    if let JsonbInput::Null = input {
        return -2;
    };
    -1
}

pub(crate) fn json_populate_text(input: JsonbInput, quoted: bool, utf8: bool) -> TextValue {
    if let JsonbInput::Error(error) = input {
        return TextValue::Error(error);
    };
    if let JsonbInput::Null = input {
        return TextValue::Null;
    };
    if let JsonbInput::Json(value) = input {
        return json_read_input_scalar(JsonValue::Value(value), quoted, utf8);
    };
    if let JsonbInput::Jsonb(value) = input {
        let kind = value.nodes[value.root].kind;
        if kind == 0 {
            return TextValue::Null;
        };
        let scalar = JsonbValue::Value(value);
        if quoted {
            return jsonb_text_context(scalar, utf8);
        };
        return jsonb_extract_text(scalar, utf8);
    };
    TextValue::Unknown
}

pub(crate) fn json_populate_jsonb(input: JsonbInput, utf8: bool) -> JsonbValue {
    if let JsonbInput::Jsonb(value) = input {
        if value.nodes[value.root].kind == 0 {
            return JsonbValue::Null;
        };
        return JsonbValue::Value(value);
    };
    let text = json_populate_text(input, true, utf8);
    jsonb_from_text_context(text, utf8)
}

pub(crate) fn json_populate_scalar_text(
    input: JsonbInput,
    quoted: bool,
    container: i32,
    calendar: bool,
    utf8: bool,
) -> TextValue {
    let kind = json_populate_kind(input.clone());
    if calendar && (kind == 5 || kind == 6) {
        return TextValue::Error(make_sql_error(JSON_POPULATE_CALENDAR_ERROR));
    };
    if kind >= 0 && kind != 0 && kind != 4 && container > 0 {
        if (container == 1 && kind != 5) || (container == 2 && kind != 6) {
            let mut state: u32 = JSON_POPULATE_ARRAY_ERROR;
            if container == 2 {
                state = JSON_POPULATE_OBJECT_ERROR;
            };
            return TextValue::Error(make_sql_error(state));
        };
        return TextValue::Unknown;
    };
    json_populate_text(input, quoted, utf8)
}

pub(crate) fn json_populate_hard_error(input: CheckOutcome, result: CheckOutcome) -> CheckOutcome {
    if let CheckOutcome::Error(_) = input {
        return input;
    };
    if let CheckOutcome::Error(_) = result {
        return result;
    };
    input
}

pub(crate) fn json_populate_begin_hard() -> CheckOutcome {
    CheckOutcome::True
}

pub(crate) fn json_populate_unavailable(input: JsonbInput, domain: bool) -> ArrayElement {
    let kind = json_populate_kind(input.clone());
    if domain == false && (kind == 0 || kind == -2) {
        return ArrayElement::Null;
    };
    ArrayElement::Unknown
}
