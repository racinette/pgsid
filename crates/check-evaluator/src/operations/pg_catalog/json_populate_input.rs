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

pub(crate) fn json_populate_record_object(input: JsonbInput) -> bool {
    json_populate_kind(input) == 6
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
        let text = json_populate_text(input, false, utf8);
        return json_populate_calendar_text(text);
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

fn json_populate_calendar_digit(character: char) -> i32 {
    let code = character as i32;
    if code >= 48 && code <= 57 {
        return code - 48;
    };
    -1
}

fn json_populate_calendar_space(character: char) -> bool {
    character == ' '
        || character == '\t'
        || character == '\n'
        || character == '\r'
        || character == '\u{000b}'
        || character == '\u{000c}'
}

fn json_populate_calendar_alpha(character: char) -> bool {
    let code = character.to_ascii_lowercase() as i32;
    code >= 97 && code <= 122
}

fn json_populate_calendar_text(input: TextValue) -> TextValue {
    if let TextValue::Value(text) = input {
        let characters: Vec<char> = text.chars().collect();
        let mut possible = false;
        let mut invalid_word = false;
        let mut numbers: usize = 0;
        let mut position: usize = 0;
        while position < characters.len() {
            let character = characters[position];
            if character == '\\' {
                return TextValue::Unknown;
            };
            if json_populate_calendar_digit(character) >= 0 {
                let start = position;
                while position < characters.len()
                    && json_populate_calendar_digit(characters[position]) >= 0
                {
                    position += 1;
                }
                numbers += 1;
                if position - start >= 2 || characters[start] == '0' {
                    possible = true;
                };
            } else if json_populate_calendar_alpha(character) {
                let start = position;
                while position < characters.len()
                    && json_populate_calendar_alpha(characters[position])
                {
                    position += 1;
                }
                let initial = characters[start].to_ascii_lowercase();
                if position - start >= 2
                    || initial == 'j'
                    || initial == 'y'
                    || initial == 'm'
                    || initial == 'd'
                    || initial == 'h'
                    || initial == 's'
                    || initial == 't'
                    || initial == 'w'
                    || initial == 'z'
                {
                    possible = true;
                } else {
                    invalid_word = true;
                };
            } else {
                if (character == ':'
                    && position > 0
                    && json_populate_calendar_digit(characters[position - 1]) >= 0)
                    || character == '+'
                    || character == '-'
                    || character == '.'
                    || character == '/'
                {
                    possible = true;
                };
                position += 1;
            };
        }
        if possible == false && (numbers < 2 || invalid_word) {
            return TextValue::Error(make_sql_error(JSON_POPULATE_CALENDAR_ERROR));
        };
        let mut result = String::new();
        let mut separated = true;
        let mut clock_field = false;
        position = 0;
        while position < characters.len() {
            let character = characters[position];
            let mut separator = character == '['
                || character == ']'
                || character == '{'
                || character == '}'
                || character == ','
                || character == '"'
                || json_populate_calendar_space(character);
            if character == ':' {
                if clock_field
                    || (position > 0 && json_populate_calendar_digit(characters[position - 1]) >= 0)
                {
                    clock_field = true;
                } else {
                    separator = true;
                };
            };
            if separator {
                clock_field = false;
                if separated == false {
                    result.push(' ');
                };
            } else {
                result.push(character);
                if json_populate_calendar_alpha(character) {
                    clock_field = false;
                };
            };
            separated = separator;
            position += 1;
        }
        return TextValue::Value(result);
    };
    input
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
