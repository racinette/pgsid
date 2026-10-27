#[derive(Clone, Copy)]
pub struct TextFormatToken {
    pub status: CheckOutcome,
    pub end: usize,
    pub argument: i32,
    pub width_argument: i32,
    pub width: i32,
    pub left: bool,
    pub conversion: i32,
}

#[derive(Clone, Copy)]
struct TextFormatDigits {
    end: usize,
    value: i32,
    found: bool,
    status: CheckOutcome,
}

const TEXT_FORMAT_SYNTAX_ERROR: u32 = 3452619;
const TEXT_FORMAT_RANGE_ERROR: u32 = 3452547;

fn format_parse_digits(input: &TextFormatSource, start: usize) -> TextFormatDigits {
    let mut index = start;
    let mut value: i32 = 0;
    let mut found = false;
    let mut status = CheckOutcome::True;
    if index >= input.characters.len() {
        let error = make_sql_error(TEXT_FORMAT_SYNTAX_ERROR);
        status = CheckOutcome::Error(error);
    };
    while index < input.characters.len() && status == CheckOutcome::True {
        let code = input.characters[index] as i32;
        if code < 48 || code > 57 {
            return TextFormatDigits {
                end: index,
                value: value,
                found: found,
                status: status,
            };
        };
        let digit = code - 48;
        if value > 214748364 || (value == 214748364 && digit > 7) {
            let error = make_sql_error(TEXT_FORMAT_RANGE_ERROR);
            status = CheckOutcome::Error(error);
        } else {
            value = value * 10 + digit;
            index += 1;
            found = true;
            if index == input.characters.len() {
                let error = make_sql_error(TEXT_FORMAT_SYNTAX_ERROR);
                status = CheckOutcome::Error(error);
            };
        };
    }
    TextFormatDigits {
        end: index,
        value: value,
        found: found,
        status: status,
    }
}

pub(crate) fn format_parse_token(input: &TextFormatSource, start: usize) -> TextFormatToken {
    let mut index = start;
    let mut status = CheckOutcome::True;
    let mut argument: i32 = -1;
    let mut width_argument: i32 = -1;
    let mut width: i32 = 0;
    let mut left = false;
    let mut conversion: i32 = 0;
    let mut parse_options = true;
    if index >= input.characters.len() {
        let error = make_sql_error(TEXT_FORMAT_SYNTAX_ERROR);
        status = CheckOutcome::Error(error);
    };
    if status == CheckOutcome::True && input.characters[index] == '%' {
        conversion = 37;
        index += 1;
        parse_options = false;
    };
    if status == CheckOutcome::True && parse_options {
        let digits = format_parse_digits(input, index);
        status = digits.status;
        index = digits.end;
        if status == CheckOutcome::True && digits.found {
            if input.characters[index] == '$' {
                argument = digits.value;
                index += 1;
                if argument == 0 || index == input.characters.len() {
                    let error = make_sql_error(TEXT_FORMAT_SYNTAX_ERROR);
                    status = CheckOutcome::Error(error);
                };
            } else {
                width = digits.value;
                parse_options = false;
            };
        };
    };
    if status == CheckOutcome::True && parse_options {
        while index < input.characters.len() && input.characters[index] == '-' {
            left = true;
            index += 1;
        }
        if index == input.characters.len() {
            let error = make_sql_error(TEXT_FORMAT_SYNTAX_ERROR);
            status = CheckOutcome::Error(error);
        };
        if status == CheckOutcome::True {
            if input.characters[index] == '*' {
                index += 1;
                let digits = format_parse_digits(input, index);
                index = digits.end;
                status = digits.status;
                width_argument = 0;
                if status == CheckOutcome::True && digits.found {
                    width_argument = digits.value;
                    if input.characters[index] != '$' || width_argument == 0 {
                        let error = make_sql_error(TEXT_FORMAT_SYNTAX_ERROR);
                        status = CheckOutcome::Error(error);
                    } else {
                        index += 1;
                        if index == input.characters.len() {
                            let error = make_sql_error(TEXT_FORMAT_SYNTAX_ERROR);
                            status = CheckOutcome::Error(error);
                        };
                    };
                };
            } else {
                let digits = format_parse_digits(input, index);
                index = digits.end;
                status = digits.status;
                width = digits.value;
            };
        };
    };
    if status == CheckOutcome::True && conversion != 37 {
        let character = input.characters[index];
        if character == 's' {
            conversion = 115;
        } else if character == 'I' {
            conversion = 73;
        } else if character == 'L' {
            conversion = 76;
        } else {
            let error = make_sql_error(TEXT_FORMAT_SYNTAX_ERROR);
            status = CheckOutcome::Error(error);
        };
        index += 1;
    };
    TextFormatToken {
        status: status,
        end: index,
        argument: argument,
        width_argument: width_argument,
        width: width,
        left: left,
        conversion: conversion,
    }
}
