#[derive(Clone)]
pub struct TextFormatSource {
    pub characters: Vec<char>,
}

#[derive(Clone)]
pub enum TextFormatInput {
    Value(TextFormatState),
}

#[derive(Clone)]
pub struct TextFormatState {
    pub source: TextFormatSource,
    pub position: usize,
    pub status: CheckOutcome,
    pub output: TextFormatOutput,
    pub next_argument: i32,
    pub argument: i32,
    pub width: i32,
    pub left: bool,
    pub conversion: i32,
    pub phase: i32,
    pub request: i32,
    pub count: i32,
    pub render: bool,
}

pub(crate) fn format_begin(
    format: TextValue,
    count: Int4Value,
    guard: BoolValue,
) -> TextFormatState {
    let mut format_text = String::new();
    let mut status = CheckOutcome::Unknown;
    if format == TextValue::Null {
        status = CheckOutcome::Null;
    };
    if let TextValue::Error(error) = format {
        status = CheckOutcome::Error(error);
    };
    if let TextValue::Value(text) = format {
        format_text = text;
        status = CheckOutcome::True;
    };
    let source: Vec<char> = format_text.chars().collect();
    let mut size: i32 = 0;
    let mut known_count = false;
    if let Int4Value::Value(value) = count {
        size = value;
        known_count = true;
    };
    if known_count == false && status == CheckOutcome::True {
        status = CheckOutcome::Unknown;
    };
    let output = format_begin_output(guard);
    if output.status != CheckOutcome::True {
        status = output.status;
    };
    let parsed_source = TextFormatSource { characters: source };
    TextFormatState {
        source: parsed_source,
        position: 0,
        status: status,
        output: output,
        next_argument: 1,
        argument: -1,
        width: 0,
        left: false,
        conversion: 0,
        phase: 0,
        request: 0,
        count: size,
        render: false,
    }
}

pub(crate) fn format_continues(input: &TextFormatState) -> bool {
    input.status == CheckOutcome::True
        && (input.phase != 0 || input.position < input.source.characters.len())
}

pub(crate) fn format_requests(input: &TextFormatState, position: i32) -> bool {
    input.status == CheckOutcome::True && input.phase != 0 && input.request == position
}

pub(crate) fn format_needs_argument(input: &TextFormatState) -> bool {
    input.status == CheckOutcome::True && input.phase != 0
}

pub(crate) fn format_should_render(input: &TextFormatState) -> bool {
    input.status == CheckOutcome::True && input.render
}

pub(crate) fn format_array_count(input: &ArrayOutputPayload) -> Int4Value {
    if input.state == 0 {
        return Int4Value::Value(0);
    };
    if input.state == 1 && input.elements.len() < 2147483647 {
        let size = input.elements.len() as i32;
        return Int4Value::Value(size);
    };
    Int4Value::Unknown
}

pub(crate) fn format_argument_index(input: &TextFormatState) -> Int4Value {
    Int4Value::Value(input.request - 1)
}

pub(crate) fn format_next(input: TextFormatState) -> TextFormatState {
    if input.status != CheckOutcome::True || input.phase != 0 {
        return input;
    };
    let source = input.source;
    let mut position = input.position;
    let mut output = input.output;
    let mut status = input.status;
    let mut next_argument = input.next_argument;
    let mut argument = input.argument;
    let mut width = input.width;
    let mut left = input.left;
    let mut conversion = input.conversion;
    let mut phase = input.phase;
    let mut request = input.request;
    while position < source.characters.len() && phase == 0 && status == CheckOutcome::True {
        let character = source.characters[position];
        if character != '%' {
            let mut text = String::new();
            while position < source.characters.len() && source.characters[position] != '%' {
                text.push(source.characters[position]);
                position += 1;
            }
            let bytes = text_build_octets(text.as_str());
            let value = TextValue::Value(text);
            let facts = format_exact_bounds(bytes);
            output = format_append_output(output, value, facts, 0, false);
            status = output.status;
        } else {
            let start = position + 1;
            let token = format_parse_token(&source, start);
            position = token.end;
            status = token.status;
            if status == CheckOutcome::True {
                if token.conversion == 37 {
                    let text = make_text_value("%");
                    let facts = format_exact_bounds(1i64);
                    output = format_append_output(output, text, facts, 0, false);
                    status = output.status;
                } else {
                    argument = token.argument;
                    width = token.width;
                    left = token.left;
                    conversion = token.conversion;
                    if token.width_argument >= 0 {
                        request = next_argument;
                        if token.width_argument > 0 {
                            request = token.width_argument;
                        };
                        phase = 1;
                    } else {
                        request = next_argument;
                        if argument > 0 {
                            request = argument;
                        };
                        phase = 2;
                    };
                    if request > input.count {
                        let error = make_sql_error(TEXT_FORMAT_SYNTAX_ERROR);
                        status = CheckOutcome::Error(error);
                    } else {
                        next_argument = request + 1;
                    };
                };
            };
        };
    }
    TextFormatState {
        source: source,
        position: position,
        status: status,
        output: output,
        next_argument: next_argument,
        argument: argument,
        width: width,
        left: left,
        conversion: conversion,
        phase: phase,
        request: request,
        count: input.count,
        render: false,
    }
}

pub(crate) fn make_format_input(input: TextFormatState) -> TextFormatInput {
    TextFormatInput::Value(input)
}

fn format_finish(input: TextFormatInput) -> TextValue {
    if let TextFormatInput::Value(state) = input {
        if state.status == CheckOutcome::True {
            return format_finish_output(state.output);
        };
        if state.status == CheckOutcome::Null {
            return TextValue::Null;
        };
        let status = state.status;
        if let CheckOutcome::Error(error) = status {
            return TextValue::Error(error);
        };
    };
    TextValue::Unknown
}

pub fn sql__pg_catalog__format__bz7w(input: TextFormatInput) -> TextValue {
    format_finish(input)
}

pub fn sql__pg_catalog__format__tfn6(input: TextFormatInput) -> TextValue {
    format_finish(input)
}
