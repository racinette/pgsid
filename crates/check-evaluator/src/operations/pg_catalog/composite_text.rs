const COMPOSITE_TEXT_SYNTAX: u32 = 3484946;

fn composite_text_space(ch: char) -> bool {
    ch == ' ' || ch == '\t' || ch == '\n' || ch == '\r' || ch == '\u{000B}' || ch == '\u{000C}'
}

fn composite_text_read(input: CompositeTextPayload) -> CompositeTextPlan {
    let characters = input.characters;
    let mut position = input.position;
    if input.fields.len() > 0 {
        if position >= characters.len() {
            return CompositeTextPlan::Error(make_sql_error(COMPOSITE_TEXT_SYNTAX));
        };
        if characters[position] != ',' {
            return CompositeTextPlan::Error(make_sql_error(COMPOSITE_TEXT_SYNTAX));
        };
        position += 1;
    };
    let mut current = TextValue::Null;
    if position >= characters.len() {
        return CompositeTextPlan::Error(make_sql_error(COMPOSITE_TEXT_SYNTAX));
    };
    if characters[position] != ',' && characters[position] != ')' {
        let mut text = String::new();
        let mut quoted = false;
        let mut done = false;
        while done == false {
            if position >= characters.len() {
                return CompositeTextPlan::Error(make_sql_error(COMPOSITE_TEXT_SYNTAX));
            };
            let ch = characters[position];
            if quoted == false && (ch == ',' || ch == ')') {
                done = true;
            } else {
                position += 1;
                if ch == '\\' {
                    if position >= characters.len() {
                        return CompositeTextPlan::Error(make_sql_error(COMPOSITE_TEXT_SYNTAX));
                    };
                    text.push(characters[position]);
                    position += 1;
                } else {
                    if ch == '"' {
                        if quoted && position < characters.len() && characters[position] == '"' {
                            text.push('"');
                            position += 1;
                        } else {
                            quoted = quoted == false;
                        };
                    } else {
                        text.push(ch);
                    };
                };
            };
        }
        current = TextValue::Value(text);
    };
    CompositeTextPlan::Value(CompositeTextPayload {
        characters: characters,
        position: position,
        expected: input.expected,
        fields: input.fields,
        current: current,
    })
}

pub fn prepare_composite_text(input: TextValue, expected: i32) -> CompositeTextPlan {
    if let TextValue::Error(error) = input {
        return CompositeTextPlan::Error(error);
    };
    if let TextValue::Null = input {
        return CompositeTextPlan::Null;
    };
    if expected < 0 {
        return CompositeTextPlan::Unknown;
    };
    if let TextValue::Value(text) = input {
        let characters: Vec<char> = text.chars().collect();
        let mut position: usize = 0;
        while position < characters.len() {
            if characters[position] == '\0' {
                return CompositeTextPlan::Unknown;
            };
            position += 1;
        }
        position = 0;
        while position < characters.len() && composite_text_space(characters[position]) {
            position += 1;
        }
        if position >= characters.len() {
            return CompositeTextPlan::Error(make_sql_error(COMPOSITE_TEXT_SYNTAX));
        };
        if characters[position] != '(' {
            return CompositeTextPlan::Error(make_sql_error(COMPOSITE_TEXT_SYNTAX));
        };
        position += 1;
        let fields: Vec<ArrayElement> = Vec::new();
        let count = usize::try_from(expected).unwrap_or(0);
        let payload = CompositeTextPayload {
            characters: characters,
            position: position,
            expected: count,
            fields: fields,
            current: TextValue::Unknown,
        };
        if expected > 0 {
            return composite_text_read(payload);
        };
        return CompositeTextPlan::Value(payload);
    };
    CompositeTextPlan::Unknown
}

pub fn composite_text_has_field(input: CompositeTextPlan) -> bool {
    if let CompositeTextPlan::Value(payload) = input {
        return payload.fields.len() < payload.expected;
    };
    false
}

pub fn composite_text_field(input: CompositeTextPlan) -> TextValue {
    if let CompositeTextPlan::Value(payload) = input {
        return payload.current.clone();
    };
    TextValue::Unknown
}

pub fn append_composite_text(
    input: CompositeTextPlan,
    field: ArrayElement,
    stored: bool,
) -> CompositeTextPlan {
    if let CompositeTextPlan::Value(payload) = input {
        if payload.fields.len() >= payload.expected {
            return CompositeTextPlan::Unknown;
        };
        if let ArrayElement::Error(error) = field {
            return CompositeTextPlan::Error(error);
        };
        if stored == false {
            if let ArrayElement::Unknown = field {
                return CompositeTextPlan::Unknown;
            };
        };
        let mut fields = payload.fields;
        fields.push(field);
        let next = CompositeTextPayload {
            characters: payload.characters,
            position: payload.position,
            expected: payload.expected,
            fields: fields,
            current: TextValue::Unknown,
        };
        if next.fields.len() < next.expected {
            return composite_text_read(next);
        };
        return CompositeTextPlan::Value(next);
    };
    input
}

pub fn finish_composite_text(input: CompositeTextPlan, type_name: &str) -> CompositeValue {
    if let CompositeTextPlan::Error(error) = input {
        return CompositeValue::Error(error);
    };
    if let CompositeTextPlan::Null = input {
        return CompositeValue::Null;
    };
    if let CompositeTextPlan::Value(payload) = input {
        if payload.fields.len() != payload.expected {
            return CompositeValue::Unknown;
        };
        let characters = payload.characters;
        let mut position = payload.position;
        if position >= characters.len() {
            return CompositeValue::Error(make_sql_error(COMPOSITE_TEXT_SYNTAX));
        };
        if characters[position] != ')' {
            return CompositeValue::Error(make_sql_error(COMPOSITE_TEXT_SYNTAX));
        };
        position += 1;
        while position < characters.len() && composite_text_space(characters[position]) {
            position += 1;
        }
        if position != characters.len() {
            return CompositeValue::Error(make_sql_error(COMPOSITE_TEXT_SYNTAX));
        };
        return make_composite_value(CompositePayload {
            type_name: type_name.to_owned(),
            fields: payload.fields,
        });
    };
    CompositeValue::Unknown
}

pub fn prepare_composite_output(input: CompositeValue, type_name: &str, fields: i32) -> TextValue {
    if let CompositeValue::Error(error) = input {
        return TextValue::Error(error.clone());
    };
    if let CompositeValue::Null = input {
        return TextValue::Null;
    };
    if let CompositeValue::Value(payload) = input {
        if payload.type_name.as_str() == type_name
            && fields >= 0
            && payload.fields.len() <= 2147483647
            && payload.fields.len() as i32 == fields
        {
            return make_text_value("(");
        };
    };
    TextValue::Unknown
}

pub fn composite_output_has_field(input: TextValue) -> bool {
    if let TextValue::Value(_) = input {
        return true;
    };
    false
}

pub fn append_composite_output(input: TextValue, field: TextValue, first: bool) -> TextValue {
    if let TextValue::Value(source) = input {
        if let TextValue::Error(error) = field {
            return TextValue::Error(error);
        };
        if let TextValue::Unknown = field {
            return TextValue::Unknown;
        };
        let mut result = source;
        if first == false {
            result.push(',');
        };
        if let TextValue::Value(text) = field {
            let characters: Vec<char> = text.chars().collect();
            let mut quoted = characters.len() == 0;
            let mut position: usize = 0;
            while position < characters.len() {
                let ch = characters[position];
                if ch == '\0' {
                    return TextValue::Unknown;
                };
                if ch == '"'
                    || ch == '\\'
                    || ch == '('
                    || ch == ')'
                    || ch == ','
                    || composite_text_space(ch)
                {
                    quoted = true;
                };
                position += 1;
            }
            if quoted {
                result.push('"');
            };
            position = 0;
            while position < characters.len() {
                let ch = characters[position];
                if ch == '"' || ch == '\\' {
                    result.push(ch);
                };
                result.push(ch);
                position += 1;
            }
            if quoted {
                result.push('"');
            };
        };
        return TextValue::Value(result);
    };
    input
}

pub fn finish_composite_output(input: TextValue) -> TextValue {
    if let TextValue::Value(text) = input {
        let mut result = text;
        result.push(')');
        return TextValue::Value(result);
    };
    input
}
