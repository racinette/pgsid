#[derive(Clone, Copy)]
pub struct ArrayDimension {
    pub lower: i32,
    pub length: i32,
}

#[derive(Clone)]
pub struct ArrayPayload {
    pub element_type: String,
    pub element_kind: i32,
    pub dimensions: Vec<ArrayDimension>,
    pub elements: Vec<ArrayElement>,
}

#[derive(Clone)]
pub enum ArrayValue {
    Unknown,
    Null,
    Error(SqlError),
    Value(ArrayPayload),
}

#[derive(Clone)]
pub enum ArrayArguments {
    Unknown,
    Error(SqlError),
    Value(ArrayPayload),
}

pub fn array_unknown() -> ArrayValue {
    ArrayValue::Unknown
}

pub fn array_null() -> ArrayValue {
    ArrayValue::Null
}

pub fn array_is_null(input: ArrayValue) -> BoolValue {
    if let ArrayValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if let ArrayValue::Unknown = input {
        return BoolValue::Unknown;
    };
    if let ArrayValue::Null = input {
        return BoolValue::Value(true);
    };
    BoolValue::Value(false)
}

pub fn array_from_case_guard(input: CheckOutcome) -> ArrayValue {
    if let CheckOutcome::Error(error) = input {
        return ArrayValue::Error(error);
    };
    ArrayValue::Unknown
}

pub fn make_array_value(input: ArrayPayload) -> ArrayValue {
    let mut position: usize = 0;
    while position < input.elements.len() {
        let element = input.elements[position].clone();
        if let ArrayElement::Error(error) = element {
            return ArrayValue::Error(error);
        };
        position += 1;
    }
    let identity: Vec<char> = input.element_type.chars().collect();
    if identity.len() == 0 || input.element_kind < 1 || input.element_kind > 40 {
        return ArrayValue::Unknown;
    };
    position = 0;
    while position < identity.len() {
        if identity[position] == '\0' {
            return ArrayValue::Unknown;
        };
        position += 1;
    }
    if input.dimensions.len() > 6 {
        return ArrayValue::Unknown;
    };
    let mut count: i64 = 0i64;
    if input.dimensions.len() > 0 {
        count = 1i64;
    };
    position = 0;
    while position < input.dimensions.len() {
        let dimension = input.dimensions[position];
        if dimension.length <= 0 {
            return ArrayValue::Unknown;
        };
        let length = dimension.length as i64;
        let end = (dimension.lower as i64) + length;
        if end > 2147483647i64 || count > 2147483647i64 / length {
            return ArrayValue::Unknown;
        };
        count = count * length;
        position += 1;
    }
    if count != (input.elements.len() as i32) as i64 {
        return ArrayValue::Unknown;
    };
    position = 0;
    while position < input.elements.len() {
        let kind = array_element_family(input.elements[position].clone());
        if kind != 0 && kind != input.element_kind {
            return ArrayValue::Unknown;
        };
        position += 1;
    }
    ArrayValue::Value(input)
}

pub fn array_from_coerced_value(
    input: ArrayValue,
    element_type: &str,
    element_kind: i32,
) -> ArrayValue {
    if let ArrayValue::Value(value) = input {
        if value.element_type != element_type || value.element_kind != element_kind {
            return ArrayValue::Unknown;
        };
        return make_array_value(value);
    };
    input
}

pub fn make_array_arguments(element_type: &str, element_kind: i32) -> ArrayArguments {
    let dimensions: Vec<ArrayDimension> = Vec::new();
    let elements: Vec<ArrayElement> = Vec::new();
    ArrayArguments::Value(ArrayPayload {
        element_type: element_type.to_owned(),
        element_kind: element_kind,
        dimensions: dimensions,
        elements: elements,
    })
}

pub fn append_array_dimension(input: ArrayArguments, lower: i32, length: i32) -> ArrayArguments {
    if let ArrayArguments::Value(value) = input {
        let mut dimensions = value.dimensions;
        dimensions.push(ArrayDimension {
            lower: lower,
            length: length,
        });
        return ArrayArguments::Value(ArrayPayload {
            element_type: value.element_type,
            element_kind: value.element_kind,
            dimensions: dimensions,
            elements: value.elements,
        });
    };
    input
}

pub fn append_array_argument(input: ArrayArguments, element: ArrayElement) -> ArrayArguments {
    if let ArrayArguments::Error(_) = input {
        return input;
    };
    if let ArrayElement::Error(error) = element {
        return ArrayArguments::Error(error);
    };
    if let ArrayArguments::Value(value) = input {
        let mut elements = value.elements;
        elements.push(element);
        return ArrayArguments::Value(ArrayPayload {
            element_type: value.element_type,
            element_kind: value.element_kind,
            dimensions: value.dimensions,
            elements: elements,
        });
    };
    input
}

pub fn finish_array_arguments(input: ArrayArguments) -> ArrayValue {
    if let ArrayArguments::Error(error) = input {
        return ArrayValue::Error(error);
    };
    if let ArrayArguments::Value(value) = input {
        return make_array_value(value);
    };
    ArrayValue::Unknown
}

pub fn array_flat_element(input: ArrayValue, offset: Int4Value) -> ArrayElement {
    if let ArrayValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let Int4Value::Error(error) = offset {
        return ArrayElement::Error(error);
    };
    if let ArrayValue::Null = input {
        return ArrayElement::Null;
    };
    if let Int4Value::Null = offset {
        return ArrayElement::Null;
    };
    if let ArrayValue::Value(value) = input {
        if let Int4Value::Value(index) = offset {
            if index < 0 {
                return ArrayElement::Null;
            };
            let position = usize::try_from(index).unwrap_or(0);
            if position >= value.elements.len() {
                return ArrayElement::Null;
            };
            return value.elements[position].clone();
        };
    };
    ArrayElement::Unknown
}

pub fn finish_array_constructor(input: ArrayArguments) -> ArrayValue {
    if let ArrayArguments::Error(error) = input {
        return ArrayValue::Error(error);
    };
    if let ArrayArguments::Value(value) = input {
        let mut position: usize = 0;
        while position < value.elements.len() {
            let element = value.elements[position].clone();
            if let ArrayElement::Unknown = element {
                return ArrayValue::Unknown;
            };
            position += 1;
        }
        let mut dimensions: Vec<ArrayDimension> = Vec::new();
        if value.elements.len() > 0 {
            dimensions.push(ArrayDimension {
                lower: 1,
                length: value.elements.len() as i32,
            });
        };
        return make_array_value(ArrayPayload {
            element_type: value.element_type,
            element_kind: value.element_kind,
            dimensions: dimensions,
            elements: value.elements,
        });
    };
    ArrayValue::Unknown
}

#[derive(Clone)]
pub struct ArrayChildrenPayload {
    pub element_type: String,
    pub element_kind: i32,
    pub arrays: Vec<ArrayValue>,
}

#[derive(Clone)]
pub enum ArrayChildrenArguments {
    Unknown,
    Error(SqlError),
    Value(ArrayChildrenPayload),
}

pub fn make_array_children(element_type: &str, element_kind: i32) -> ArrayChildrenArguments {
    let arrays: Vec<ArrayValue> = Vec::new();
    ArrayChildrenArguments::Value(ArrayChildrenPayload {
        element_type: element_type.to_owned(),
        element_kind: element_kind,
        arrays: arrays,
    })
}

pub fn append_array_child(
    input: ArrayChildrenArguments,
    child: ArrayValue,
) -> ArrayChildrenArguments {
    if let ArrayChildrenArguments::Error(_) = input {
        return input;
    };
    if let ArrayValue::Error(error) = child {
        return ArrayChildrenArguments::Error(error);
    };
    if let ArrayChildrenArguments::Value(value) = input {
        let mut arrays = value.arrays;
        arrays.push(child);
        return ArrayChildrenArguments::Value(ArrayChildrenPayload {
            element_type: value.element_type,
            element_kind: value.element_kind,
            arrays: arrays,
        });
    };
    input
}

pub fn finish_array_children(input: ArrayChildrenArguments) -> ArrayValue {
    if let ArrayChildrenArguments::Error(error) = input {
        return ArrayValue::Error(error);
    };
    if let ArrayChildrenArguments::Value(value) = input {
        let mut position: usize = 0;
        while position < value.arrays.len() {
            let child = value.arrays[position].clone();
            if let ArrayValue::Unknown = child {
                return ArrayValue::Unknown;
            };
            position += 1;
        }
        let mut dimensions: Vec<ArrayDimension> = Vec::new();
        let mut elements: Vec<ArrayElement> = Vec::new();
        let mut empty = false;
        position = 0;
        while position < value.arrays.len() {
            let child = value.arrays[position].clone();
            if let ArrayValue::Null = child {
                empty = true;
            };
            if let ArrayValue::Value(array) = child {
                if array.element_type != value.element_type
                    || array.element_kind != value.element_kind
                {
                    return ArrayValue::Error(make_sql_error(ARRAY_CONSTRUCTOR_TYPE_MISMATCH));
                };
                if array.dimensions.len() == 0 {
                    empty = true;
                } else {
                    if dimensions.len() == 0 {
                        if array.dimensions.len() >= 6 {
                            return ArrayValue::Error(make_sql_error(SQL_ERROR_PROGRAM_LIMIT));
                        };
                        dimensions.push(ArrayDimension {
                            lower: 1,
                            length: value.arrays.len() as i32,
                        });
                        let mut index: usize = 0;
                        while index < array.dimensions.len() {
                            dimensions.push(array.dimensions[index]);
                            index += 1;
                        }
                    } else {
                        if dimensions.len() != array.dimensions.len() + 1 {
                            return ArrayValue::Error(make_sql_error(SQL_ERROR_ARRAY_SUBSCRIPT));
                        };
                        let mut index: usize = 0;
                        while index < array.dimensions.len() {
                            let expected = dimensions[index + 1];
                            let actual = array.dimensions[index];
                            if expected.lower != actual.lower || expected.length != actual.length {
                                return ArrayValue::Error(make_sql_error(
                                    SQL_ERROR_ARRAY_SUBSCRIPT,
                                ));
                            };
                            index += 1;
                        }
                    };
                    if (elements.len() as i32) as i64 + (array.elements.len() as i32) as i64
                        > 2147483647i64
                    {
                        return ArrayValue::Error(make_sql_error(SQL_ERROR_PROGRAM_LIMIT));
                    };
                    let mut index: usize = 0;
                    while index < array.elements.len() {
                        elements.push(array.elements[index].clone());
                        index += 1;
                    }
                };
            };
            position += 1;
        }
        if empty && dimensions.len() > 0 {
            return ArrayValue::Error(make_sql_error(SQL_ERROR_ARRAY_SUBSCRIPT));
        };
        return make_array_value(ArrayPayload {
            element_type: value.element_type,
            element_kind: value.element_kind,
            dimensions: dimensions,
            elements: elements,
        });
    };
    ArrayValue::Unknown
}

const ARRAY_CONSTRUCTOR_TYPE_MISMATCH: u32 = 6822148;

#[derive(Clone)]
struct ArrayTextSource {
    characters: Vec<char>,
}

#[derive(Clone)]
pub struct ArrayTextPayload {
    pub dimensions: Vec<ArrayDimension>,
    pub events: Vec<ArrayTextEvent>,
}

#[derive(Clone)]
pub enum ArrayTextPlan {
    Unknown,
    Null,
    Value(ArrayTextPayload),
}

#[derive(Clone)]
pub enum ArrayTextEvent {
    Text(String),
    Null,
    Unknown,
    Error(SqlError),
}

#[derive(Clone)]
struct ArrayTextToken {
    next: usize,
    kind: i32,
    text: String,
}

#[derive(Clone, Copy)]
struct ArrayTextBound {
    next: usize,
    value: i64,
    found: bool,
    overflow: bool,
}

const ARRAY_TEXT_INVALID: u32 = 3484946;

fn array_text_space(ch: char) -> bool {
    ch == ' ' || ch == '\t' || ch == '\n' || ch == '\r' || ch == '\x0b' || ch == '\x0c'
}

fn array_text_digit(ch: char) -> bool {
    let code = ch as i32;
    code >= 48 && code <= 57
}

fn array_text_skip_space(source: &ArrayTextSource, start: usize) -> usize {
    let mut position = start;
    while position < source.characters.len() && array_text_space(source.characters[position]) {
        position += 1;
    }
    position
}

fn array_text_read_bound(source: &ArrayTextSource, start: usize) -> ArrayTextBound {
    let mut position = start;
    let mut negative = false;
    if position < source.characters.len()
        && (source.characters[position] == '-' || source.characters[position] == '+')
    {
        negative = source.characters[position] == '-';
        position += 1;
    };
    let digits = position;
    let mut value: i64 = 0i64;
    let mut overflow = false;
    while position < source.characters.len() && array_text_digit(source.characters[position]) {
        if value > 2147483648i64 {
            overflow = true;
        } else {
            value = value * 10i64 + ((source.characters[position] as i32 - 48) as i64);
        };
        position += 1;
    }
    if negative {
        value = 0i64 - value;
    };
    if value < -2147483648i64 || value > 2147483647i64 {
        overflow = true;
    };
    if position == digits {
        return ArrayTextBound {
            next: start,
            value: 0i64,
            found: false,
            overflow: false,
        };
    };
    ArrayTextBound {
        next: position,
        value: value,
        found: true,
        overflow: overflow,
    }
}

fn array_text_read_token(
    source: &ArrayTextSource,
    start: usize,
    delimiter: char,
) -> ArrayTextToken {
    let mut position = array_text_skip_space(source, start);
    if position >= source.characters.len() {
        return ArrayTextToken {
            next: position,
            kind: 0,
            text: String::new(),
        };
    };
    let first = source.characters[position];
    if first == '{' {
        return ArrayTextToken {
            next: position + 1,
            kind: 1,
            text: String::new(),
        };
    };
    if first == '}' {
        return ArrayTextToken {
            next: position + 1,
            kind: 2,
            text: String::new(),
        };
    };
    if first == delimiter {
        return ArrayTextToken {
            next: position + 1,
            kind: 3,
            text: String::new(),
        };
    };
    let quoted = first == '"';
    if quoted {
        position += 1;
    };
    let mut characters: Vec<char> = Vec::new();
    let mut retained: usize = 0;
    let mut escaped = false;
    let mut finished = false;
    while position < source.characters.len() && finished == false {
        let ch = source.characters[position];
        if ch == '\\' {
            position += 1;
            if position >= source.characters.len() {
                return ArrayTextToken {
                    next: position,
                    kind: 0,
                    text: String::new(),
                };
            };
            characters.push(source.characters[position]);
            retained = characters.len();
            escaped = true;
            position += 1;
        } else if quoted && ch == '"' {
            position = array_text_skip_space(source, position + 1);
            if position >= source.characters.len() {
                return ArrayTextToken {
                    next: position,
                    kind: 0,
                    text: String::new(),
                };
            };
            let following = source.characters[position];
            if following != delimiter && following != '}' && following != '{' {
                return ArrayTextToken {
                    next: position,
                    kind: 0,
                    text: String::new(),
                };
            };
            retained = characters.len();
            finished = true;
        } else if quoted == false && (ch == delimiter || ch == '}') {
            finished = true;
        } else if quoted == false && (ch == '"' || ch == '{') {
            return ArrayTextToken {
                next: position,
                kind: 0,
                text: String::new(),
            };
        } else {
            characters.push(ch);
            if array_text_space(ch) == false {
                retained = characters.len();
            };
            position += 1;
        };
    }
    if finished == false {
        return ArrayTextToken {
            next: position,
            kind: 0,
            text: String::new(),
        };
    };
    let mut text = String::new();
    let mut index: usize = 0;
    while index < retained {
        text.push(characters[index]);
        index += 1;
    }
    let mut null_token = false;
    if quoted == false && escaped == false && retained == 4 {
        null_token = (characters[0] == 'N' || characters[0] == 'n')
            && (characters[1] == 'U' || characters[1] == 'u')
            && (characters[2] == 'L' || characters[2] == 'l')
            && (characters[3] == 'L' || characters[3] == 'l');
    };
    if null_token {
        return ArrayTextToken {
            next: position,
            kind: 5,
            text: text,
        };
    };
    ArrayTextToken {
        next: position,
        kind: 4,
        text: text,
    }
}

fn array_text_result(
    dimensions: Vec<ArrayDimension>,
    input: Vec<ArrayTextEvent>,
    error: u32,
) -> ArrayTextPlan {
    let mut events = input;
    if error != 0 {
        events.push(ArrayTextEvent::Error(make_sql_error(error)));
    };
    ArrayTextPlan::Value(ArrayTextPayload {
        dimensions: dimensions,
        events: events,
    })
}

pub fn parse_array_text(input: TextValue, delimiter: char, nulls: i32) -> ArrayTextPlan {
    if let TextValue::Unknown = input {
        return ArrayTextPlan::Unknown;
    };
    if let TextValue::Null = input {
        return ArrayTextPlan::Null;
    };
    let mut dimensions: Vec<ArrayDimension> = Vec::new();
    let mut events: Vec<ArrayTextEvent> = Vec::new();
    if let TextValue::Error(error) = input {
        events.push(ArrayTextEvent::Error(error));
        return array_text_result(dimensions, events, 0);
    };
    if let TextValue::Value(value) = input {
        let characters: Vec<char> = value.chars().collect();
        let source = ArrayTextSource {
            characters: characters,
        };
        let mut index: usize = 0;
        let mut levels: Vec<ArrayDimension> = Vec::new();
        while index < 6 {
            dimensions.push(ArrayDimension {
                lower: 1,
                length: -1,
            });
            levels.push(ArrayDimension {
                lower: 1,
                length: 0,
            });
            index += 1;
        }
        let mut position = array_text_skip_space(&source, 0);
        let mut rank: usize = 0;
        while position < source.characters.len() && source.characters[position] == '[' {
            if rank >= 6 {
                return array_text_result(dimensions, events, SQL_ERROR_PROGRAM_LIMIT);
            };
            let first = array_text_read_bound(&source, position + 1);
            if first.overflow {
                return array_text_result(dimensions, events, SQL_ERROR_PROGRAM_LIMIT);
            };
            if first.found == false {
                return array_text_result(dimensions, events, ARRAY_TEXT_INVALID);
            };
            position = first.next;
            let mut lower: i64 = 1i64;
            let mut upper = first.value;
            if position < source.characters.len() && source.characters[position] == ':' {
                lower = first.value;
                let last = array_text_read_bound(&source, position + 1);
                if last.overflow {
                    return array_text_result(dimensions, events, SQL_ERROR_PROGRAM_LIMIT);
                };
                if last.found == false {
                    return array_text_result(dimensions, events, ARRAY_TEXT_INVALID);
                };
                upper = last.value;
                position = last.next;
            };
            if position >= source.characters.len() || source.characters[position] != ']' {
                return array_text_result(dimensions, events, ARRAY_TEXT_INVALID);
            };
            if upper < lower {
                return array_text_result(dimensions, events, SQL_ERROR_ARRAY_SUBSCRIPT);
            };
            let length = upper - lower + 1i64;
            if upper == 2147483647i64 || length > 2147483647i64 {
                return array_text_result(dimensions, events, SQL_ERROR_PROGRAM_LIMIT);
            };
            dimensions[rank] = ArrayDimension {
                lower: lower as i32,
                length: length as i32,
            };
            rank += 1;
            position = array_text_skip_space(&source, position + 1);
        }
        let mut frozen = rank > 0;
        if frozen {
            if position >= source.characters.len() || source.characters[position] != '=' {
                return array_text_result(dimensions, events, ARRAY_TEXT_INVALID);
            };
            position = array_text_skip_space(&source, position + 1);
        };
        if position >= source.characters.len() || source.characters[position] != '{' {
            return array_text_result(dimensions, events, ARRAY_TEXT_INVALID);
        };
        let mut nesting: usize = 0;
        let mut count: usize = 0;
        let mut expect_delimiter = false;
        let mut completed = false;
        while completed == false {
            let token = array_text_read_token(&source, position, delimiter);
            position = token.next;
            let kind = token.kind;
            if kind == 0 {
                return array_text_result(dimensions, events, ARRAY_TEXT_INVALID);
            };
            if kind == 1 {
                if expect_delimiter {
                    return array_text_result(dimensions, events, ARRAY_TEXT_INVALID);
                };
                if nesting >= 6 {
                    return array_text_result(dimensions, events, SQL_ERROR_PROGRAM_LIMIT);
                };
                levels[nesting] = ArrayDimension {
                    lower: 1,
                    length: 0,
                };
                nesting += 1;
                if nesting > rank {
                    if frozen {
                        return array_text_result(dimensions, events, ARRAY_TEXT_INVALID);
                    };
                    rank = nesting;
                };
            };
            if kind == 2 {
                let level = levels[nesting - 1];
                if level.length > 0 && expect_delimiter == false {
                    return array_text_result(dimensions, events, ARRAY_TEXT_INVALID);
                };
                nesting = nesting - 1;
                if nesting > 0 {
                    let outer = levels[nesting - 1];
                    levels[nesting - 1] = ArrayDimension {
                        lower: 1,
                        length: outer.length + 1,
                    };
                };
                let dimension = dimensions[nesting];
                if dimension.length < 0 {
                    dimensions[nesting] = ArrayDimension {
                        lower: dimension.lower,
                        length: level.length,
                    };
                } else if dimension.length != level.length {
                    return array_text_result(dimensions, events, ARRAY_TEXT_INVALID);
                };
                expect_delimiter = true;
                completed = nesting == 0;
            };
            if kind == 3 {
                if expect_delimiter == false {
                    return array_text_result(dimensions, events, ARRAY_TEXT_INVALID);
                };
                expect_delimiter = false;
            };
            let mut element = false;
            if kind == 4 {
                let text = token.text.clone();
                if expect_delimiter {
                    return array_text_result(dimensions, events, ARRAY_TEXT_INVALID);
                };
                events.push(ArrayTextEvent::Text(text));
                element = true;
            };
            if kind == 5 {
                let text = token.text;
                if expect_delimiter {
                    return array_text_result(dimensions, events, ARRAY_TEXT_INVALID);
                };
                if nulls == 1 {
                    events.push(ArrayTextEvent::Null);
                } else if nulls == 0 {
                    events.push(ArrayTextEvent::Text(text));
                } else {
                    events.push(ArrayTextEvent::Unknown);
                    return array_text_result(dimensions, events, 0);
                };
                element = true;
            };
            if element {
                count += 1;
                frozen = true;
                if nesting != rank {
                    return array_text_result(dimensions, events, ARRAY_TEXT_INVALID);
                };
                let level = levels[nesting - 1];
                levels[nesting - 1] = ArrayDimension {
                    lower: 1,
                    length: level.length + 1,
                };
                expect_delimiter = true;
            };
        }
        position = array_text_skip_space(&source, position);
        if position != source.characters.len() {
            return array_text_result(dimensions, events, ARRAY_TEXT_INVALID);
        };
        let mut result_dimensions: Vec<ArrayDimension> = Vec::new();
        if count > 0 {
            index = 0;
            while index < rank {
                result_dimensions.push(dimensions[index]);
                index += 1;
            }
        };
        return array_text_result(result_dimensions, events, 0);
    };
    ArrayTextPlan::Unknown
}

pub fn array_text_event_count(input: &ArrayTextPayload) -> Int4Value {
    Int4Value::Value(input.events.len() as i32)
}

pub fn array_text_event_at(input: &ArrayTextPayload, index: Int4Value) -> TextValue {
    if let Int4Value::Error(error) = index {
        return TextValue::Error(error);
    };
    if let Int4Value::Value(position) = index {
        if position < 0 {
            return TextValue::Unknown;
        };
        let offset = usize::try_from(position).unwrap_or(0);
        if offset >= input.events.len() {
            return TextValue::Unknown;
        };
        let event = input.events[offset].clone();
        if let ArrayTextEvent::Text(text) = event {
            return TextValue::Value(text);
        };
        if let ArrayTextEvent::Null = event {
            return TextValue::Null;
        };
        if let ArrayTextEvent::Error(error) = event {
            return TextValue::Error(error);
        };
    };
    TextValue::Unknown
}

pub fn finish_array_text(plan: ArrayTextPlan, converted: ArrayArguments) -> ArrayValue {
    if let ArrayArguments::Error(error) = converted {
        return ArrayValue::Error(error);
    };
    if let ArrayTextPlan::Null = plan {
        return ArrayValue::Null;
    };
    if let ArrayTextPlan::Value(payload) = plan {
        let mut index: usize = 0;
        while index < payload.events.len() {
            let event = payload.events[index].clone();
            if let ArrayTextEvent::Error(error) = event {
                return ArrayValue::Error(error);
            };
            index += 1;
        }
        if let ArrayArguments::Value(value) = converted {
            index = 0;
            while index < value.elements.len() {
                let element = value.elements[index].clone();
                if let ArrayElement::Unknown = element {
                    return ArrayValue::Unknown;
                };
                index += 1;
            }
            return make_array_value(ArrayPayload {
                element_type: value.element_type,
                element_kind: value.element_kind,
                dimensions: payload.dimensions,
                elements: value.elements,
            });
        };
    };
    ArrayValue::Unknown
}
