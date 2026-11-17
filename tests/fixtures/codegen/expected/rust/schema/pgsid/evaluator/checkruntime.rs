#[derive(Clone, Copy, PartialEq, Eq)]
pub enum Int4Value {
    Unknown,
    Unimplemented,
    Null,
    Value(i32),
    Error(SqlError),
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum Int8Value {
    Unknown,
    Unimplemented,
    Null,
    Value(i64),
    Error(SqlError),
}

#[derive(Clone, PartialEq, Eq)]
pub enum TextValue {
    Unknown,
    Unimplemented,
    Null,
    Value(String),
    Error(SqlError),
    NonNull,
}

pub fn make_int4_value(value: i32) -> Int4Value {
    Int4Value::Value(value)
}

pub fn make_int8_value(value: i64) -> Int8Value {
    Int8Value::Value(value)
}

pub fn make_text_value(value: &str) -> TextValue {
    TextValue::Value(value.to_owned())
}

pub fn bool_null() -> BoolValue {
    BoolValue::Null
}

pub fn make_bool_value(value: bool) -> BoolValue {
    BoolValue::Value(value)
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum CheckOutcome {
    True,
    False,
    Null,
    Unknown,
    Unimplemented,
    Error(SqlError),
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub struct SqlError {
    pub state: u32,
}

pub fn make_sql_error(state: u32) -> SqlError {
    SqlError { state: state }
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub struct SqlErrorDescription<'a> {
    pub message: &'a str,
}

const SQL_ERROR_NUMERIC_OUT_OF_RANGE: u32 = 3452547;

const SQL_ERROR_NOT_NULL_VIOLATION: u32 = 3505682;

const SQL_ERROR_CHECK_VIOLATION: u32 = 3505720;

const SQL_ERROR_DATATYPE_MISMATCH: u32 = 6822148;

const SQL_ERROR_CARDINALITY_VIOLATION: u32 = 3405888;

const SQL_ERROR_NULL_VALUE_NOT_ALLOWED: u32 = 3452548;

const SQL_ERROR_INVALID_DATETIME_FORMAT: u32 = 3452551;

const SQL_ERROR_DATETIME_FIELD_OVERFLOW: u32 = 3452552;

const SQL_ERROR_TIMEZONE_DISPLACEMENT: u32 = 3452553;

const SQL_ERROR_INVALID_USE_OF_ESCAPE: u32 = 3452556;

const SQL_ERROR_ZERO_LENGTH_CHARACTER_STRING: u32 = 3452559;

const SQL_ERROR_INVALID_XML_DOCUMENT: u32 = 3452566;

const SQL_ERROR_NOT_XML_DOCUMENT: u32 = 3452565;

const SQL_ERROR_INVALID_XML_CONTENT: u32 = 3452567;

const SQL_ERROR_INVALID_XML_COMMENT: u32 = 3452572;

const SQL_ERROR_INVALID_XML_PROCESSING_INSTRUCTION: u32 = 3452573;

const SQL_ERROR_DIVISION_BY_ZERO: u32 = 3452582;

const SQL_ERROR_INVALID_FRAME_SIZE: u32 = 3452583;

const SQL_ERROR_SUBSTRING: u32 = 3452581;

const SQL_ERROR_INVALID_REGEX: u32 = 3452591;

const SQL_ERROR_INVALID_LOGARITHM: u32 = 3452594;

const SQL_ERROR_INVALID_POWER: u32 = 3452595;

const SQL_ERROR_INVALID_WIDTH_BUCKET: u32 = 3452596;

const SQL_ERROR_INVALID_PARAMETER: u32 = 3452619;

const SQL_ERROR_INVALID_ESCAPE: u32 = 3452621;

const SQL_ERROR_INVALID_TEXT_REPRESENTATION: u32 = 3484946;

const SQL_ERROR_UNDEFINED_OBJECT: u32 = 6820852;

const SQL_ERROR_SYNTAX: u32 = 6819553;

const SQL_ERROR_STRING_LENGTH_MISMATCH: u32 = 3452622;

const SQL_ERROR_STRING_RIGHT_TRUNCATION: u32 = 3452545;

const SQL_ERROR_ARRAY_SUBSCRIPT: u32 = 3452630;

const SQL_ERROR_FEATURE_NOT_SUPPORTED: u32 = 466560;

const SQL_ERROR_PROGRAM_LIMIT: u32 = 8584704;

const SQL_ERROR_INTERNAL: u32 = 56966976;

const SQL_ERROR_OBJECT_NOT_READY: u32 = 8631360;

const SQL_ERROR_JSON_DATETIME: u32 = 3452653;

const SQL_ERROR_JSON_NON_NUMERIC: u32 = 3452658;

const SQL_ERROR_JSON_SUBSCRIPT: u32 = 3452655;

const SQL_ERROR_JSON_ARRAY: u32 = 3452661;

const SQL_ERROR_JSON_MEMBER: u32 = 3452662;

const SQL_ERROR_JSON_NUMBER: u32 = 3452663;

const SQL_ERROR_JSON_OBJECT: u32 = 3452664;

const SQL_ERROR_JSON_SINGLETON: u32 = 3452660;

pub fn sql_error_message(error: SqlError) -> SqlErrorDescription<'static> {
    if error.state == SQL_ERROR_DATATYPE_MISMATCH { return SqlErrorDescription { message: "could not convert row type" }; }
    if error.state == SQL_ERROR_ZERO_LENGTH_CHARACTER_STRING {
        return SqlErrorDescription { message: "zero-length character string" };
    }
    if error.state == SQL_ERROR_INVALID_XML_PROCESSING_INSTRUCTION { return SqlErrorDescription { message: "invalid XML processing instruction" }; }
    if error.state == SQL_ERROR_NOT_XML_DOCUMENT { return SqlErrorDescription { message: "not an XML document" }; }
    if error.state == SQL_ERROR_INVALID_XML_DOCUMENT {
        return SqlErrorDescription { message: "invalid XML document" };
    }
    if error.state == SQL_ERROR_INVALID_XML_CONTENT {
        return SqlErrorDescription { message: "invalid XML content" };
    }
    if error.state == SQL_ERROR_INVALID_XML_COMMENT {
        return SqlErrorDescription { message: "invalid XML comment" };
    }
    if error.state == SQL_ERROR_CARDINALITY_VIOLATION {
        return SqlErrorDescription {
            message: "cardinality violation",
        };
    }
    if error.state == SQL_ERROR_NOT_NULL_VIOLATION {
        return SqlErrorDescription {
            message: "not-null constraint violation",
        };
    }
    if error.state == SQL_ERROR_CHECK_VIOLATION {
        return SqlErrorDescription {
            message: "check constraint violation",
        };
    }
    if error.state == SQL_ERROR_OBJECT_NOT_READY {
        return SqlErrorDescription {
            message: "object not in prerequisite state",
        };
    }
    if error.state == SQL_ERROR_NULL_VALUE_NOT_ALLOWED {
        return SqlErrorDescription {
            message: "null value not allowed",
        };
    }
    if error.state == SQL_ERROR_JSON_DATETIME {
        return SqlErrorDescription {
            message: "invalid argument for SQL/JSON datetime function",
        };
    }
    if error.state == SQL_ERROR_JSON_NON_NUMERIC {
        return SqlErrorDescription {
            message: "non-numeric SQL/JSON item",
        };
    }
    if error.state == SQL_ERROR_JSON_SUBSCRIPT {
        return SqlErrorDescription {
            message: "invalid SQL/JSON subscript",
        };
    }
    if error.state == SQL_ERROR_JSON_ARRAY {
        return SqlErrorDescription {
            message: "SQL/JSON array not found",
        };
    }
    if error.state == SQL_ERROR_JSON_MEMBER {
        return SqlErrorDescription {
            message: "SQL/JSON member not found",
        };
    }
    if error.state == SQL_ERROR_JSON_NUMBER {
        return SqlErrorDescription {
            message: "SQL/JSON number not found",
        };
    }
    if error.state == SQL_ERROR_JSON_OBJECT {
        return SqlErrorDescription {
            message: "SQL/JSON object not found",
        };
    }
    if error.state == SQL_ERROR_JSON_SINGLETON {
        return SqlErrorDescription {
            message: "singleton SQL/JSON item required",
        };
    }
    if error.state == SQL_ERROR_SYNTAX {
        return SqlErrorDescription {
            message: "syntax error",
        };
    }
    if error.state == SQL_ERROR_UNDEFINED_OBJECT {
        return SqlErrorDescription {
            message: "undefined object",
        };
    }
    if error.state == SQL_ERROR_FEATURE_NOT_SUPPORTED {
        return SqlErrorDescription {
            message: "feature not supported",
        };
    }
    if error.state == SQL_ERROR_INVALID_FRAME_SIZE {
        return SqlErrorDescription {
            message: "invalid preceding or following size",
        };
    }
    if error.state == SQL_ERROR_INVALID_ESCAPE {
        return SqlErrorDescription {
            message: "invalid escape sequence",
        };
    }
    if error.state == SQL_ERROR_INVALID_USE_OF_ESCAPE {
        return SqlErrorDescription {
            message: "invalid use of escape character",
        };
    }
    if error.state == SQL_ERROR_INTERNAL {
        return SqlErrorDescription {
            message: "internal error",
        };
    }
    if error.state == SQL_ERROR_SUBSTRING {
        return SqlErrorDescription {
            message: "substring error",
        };
    }
    if error.state == SQL_ERROR_ARRAY_SUBSCRIPT {
        return SqlErrorDescription {
            message: "array subscript error",
        };
    }
    if error.state == SQL_ERROR_PROGRAM_LIMIT {
        return SqlErrorDescription {
            message: "program limit exceeded",
        };
    }
    if error.state == SQL_ERROR_STRING_RIGHT_TRUNCATION {
        return SqlErrorDescription {
            message: "string data right truncation",
        };
    }
    if error.state == SQL_ERROR_STRING_LENGTH_MISMATCH {
        return SqlErrorDescription {
            message: "string data length mismatch",
        };
    }
    if error.state == SQL_ERROR_INVALID_TEXT_REPRESENTATION {
        return SqlErrorDescription {
            message: "invalid text representation",
        };
    }
    if error.state == SQL_ERROR_NUMERIC_OUT_OF_RANGE {
        return SqlErrorDescription {
            message: "numeric value out of range",
        };
    }
    if error.state == SQL_ERROR_INVALID_DATETIME_FORMAT {
        return SqlErrorDescription {
            message: "invalid date/time format",
        };
    }
    if error.state == SQL_ERROR_DATETIME_FIELD_OVERFLOW {
        return SqlErrorDescription {
            message: "date/time field value out of range",
        };
    }
    if error.state == SQL_ERROR_TIMEZONE_DISPLACEMENT {
        return SqlErrorDescription {
            message: "time zone displacement out of range",
        };
    }
    if error.state == SQL_ERROR_DIVISION_BY_ZERO {
        return SqlErrorDescription {
            message: "division by zero",
        };
    }
    if error.state == SQL_ERROR_INVALID_LOGARITHM {
        return SqlErrorDescription {
            message: "invalid argument for logarithm",
        };
    }
    if error.state == SQL_ERROR_INVALID_POWER {
        return SqlErrorDescription {
            message: "invalid argument for power function",
        };
    }
    if error.state == SQL_ERROR_INVALID_WIDTH_BUCKET {
        return SqlErrorDescription {
            message: "invalid argument for width_bucket function",
        };
    }
    if error.state == SQL_ERROR_INVALID_REGEX {
        return SqlErrorDescription {
            message: "invalid regular expression",
        };
    }
    if error.state == SQL_ERROR_INVALID_PARAMETER {
        return SqlErrorDescription {
            message: "invalid parameter value",
        };
    }
    SqlErrorDescription {
        message: "SQL evaluation failed",
    }
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum BoolValue {
    Unknown,
    Unimplemented,
    Null,
    Value(bool),
    Error(SqlError),
}

pub fn check_from_bool(value: BoolValue) -> CheckOutcome {
    let mut unresolved_flavor: i32 = 0;
    if let BoolValue::Unknown = value { unresolved_flavor = 1; };
    if let BoolValue::Unimplemented = value { unresolved_flavor = 2; };
    if let BoolValue::Error(error) = value {
        return CheckOutcome::Error(error);
    }
    let mut condition_flavor_848_4: i32 = unresolved_flavor; if let BoolValue::Unknown = value { if condition_flavor_848_4 < 1 { condition_flavor_848_4 = 1; }; }; if let BoolValue::Unimplemented = value { condition_flavor_848_4 = 2; }; if value == BoolValue::Unknown || value == BoolValue::Unimplemented {
        return check_unresolved(condition_flavor_848_4);
    }
    if value == BoolValue::Null {
        return CheckOutcome::Null;
    }
    if value == BoolValue::Value(false) {
        return CheckOutcome::False;
    }
    CheckOutcome::True
}

pub fn int4_is_null(value: Int4Value) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int4Value::Unknown = value { unresolved_flavor = 1; };
    if let Int4Value::Unimplemented = value { unresolved_flavor = 2; };
    if let Int4Value::Error(error) = value {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_869_4: i32 = unresolved_flavor; if let Int4Value::Unknown = value { if condition_flavor_869_4 < 1 { condition_flavor_869_4 = 1; }; }; if let Int4Value::Unimplemented = value { condition_flavor_869_4 = 2; }; if value == Int4Value::Unknown || value == Int4Value::Unimplemented {
        return bool_unresolved(condition_flavor_869_4);
    }
    BoolValue::Value(value == Int4Value::Null)
}

pub fn int8_is_null(value: Int8Value) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int8Value::Unknown = value { unresolved_flavor = 1; };
    if let Int8Value::Unimplemented = value { unresolved_flavor = 2; };
    if let Int8Value::Error(error) = value {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_882_4: i32 = unresolved_flavor; if let Int8Value::Unknown = value { if condition_flavor_882_4 < 1 { condition_flavor_882_4 = 1; }; }; if let Int8Value::Unimplemented = value { condition_flavor_882_4 = 2; }; if value == Int8Value::Unknown || value == Int8Value::Unimplemented {
        return bool_unresolved(condition_flavor_882_4);
    }
    BoolValue::Value(value == Int8Value::Null)
}

pub fn bool_is_null(value: BoolValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let BoolValue::Unknown = value { unresolved_flavor = 1; };
    if let BoolValue::Unimplemented = value { unresolved_flavor = 2; };
    if let BoolValue::Error(error) = value {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_908_4: i32 = unresolved_flavor; if let BoolValue::Unknown = value { if condition_flavor_908_4 < 1 { condition_flavor_908_4 = 1; }; }; if let BoolValue::Unimplemented = value { condition_flavor_908_4 = 2; }; if value == BoolValue::Unknown || value == BoolValue::Unimplemented {
        return bool_unresolved(condition_flavor_908_4);
    }
    BoolValue::Value(value == BoolValue::Null)
}

#[derive(Clone)]
pub enum NumericValue {
    Unknown,
    Unimplemented,
    Null,
    Value(NumericVar),
    Error(SqlError),
}

// numeric input: the text's decimal digits packed into NBASE digits at the weight its point and
// exponent give, and the display scale its fractional digits less its exponent give.
pub fn make_numeric_value(value: &str) -> NumericValue {
    let layout = numeric_parts(value);
    if layout.valid == false {
        return numeric_unresolved(0);
    }
    if layout.special == 3 {
        return NumericValue::Value(numeric_var_special(NUMERIC_SIGN_NAN));
    }
    if layout.special == 2 {
        return NumericValue::Value(numeric_var_special(NUMERIC_SIGN_PINF));
    }
    if layout.special == 0 {
        return NumericValue::Value(numeric_var_special(NUMERIC_SIGN_NINF));
    }
    let chars: Vec<char> = value.chars().collect();
    let mut index: usize = 0;
    let mut point = false;
    let mut power = false;
    let mut fractional: i32 = 0;
    let mut exponent: i32 = 0;
    let mut exponent_sign: i32 = 1;
    while index < chars.len() {
        let digit = numeric_digit(chars[index]);
        if digit >= 0 {
            if power {
                exponent = exponent * 10 + digit;
            } else if point {
                fractional = fractional + 1;
            };
        } else if chars[index] == '.' {
            point = true;
        } else if chars[index] == 'e' || chars[index] == 'E' {
            power = true;
        } else if power && chars[index] == '-' {
            exponent_sign = -1;
        };
        index += 1;
    }
    let mut dscale = fractional - exponent * exponent_sign;
    if dscale < 0 {
        dscale = 0;
    }
    let mut digits: Vec<usize> = Vec::new();
    if layout.sign == 0 {
        return NumericValue::Value(NumericVar {
            sign: 1,
            weight: 0,
            dscale: dscale,
            digits: digits,
        });
    }
    let mut weight = layout.weight / 4;
    if layout.weight % 4 < 0 {
        weight = weight - 1;
    }
    let mut leading = weight * 4 + 3 - layout.weight;
    let mut emitted: i32 = 0;
    let mut group: i32 = 0;
    index = layout.first;
    while index < layout.end || emitted % 4 != 0 {
        let mut decimal: i32 = 0;
        if leading > 0 {
            leading = leading - 1;
        } else if index < layout.end {
            decimal = numeric_digit(chars[index]);
            while decimal < 0 {
                index += 1;
                decimal = numeric_digit(chars[index]);
            }
            index += 1;
        };
        group = group * 10 + decimal;
        emitted = emitted + 1;
        if emitted % 4 == 0 {
            digits.push(usize::try_from(group).unwrap_or(0));
            group = 0;
        }
    }
    NumericValue::Value(NumericVar {
        sign: layout.sign,
        weight: weight,
        dscale: dscale,
        digits: digits,
    })
}

#[derive(Clone, Copy)]
pub struct JsonbNode {
    pub kind: i32,
    pub child: usize,
    pub next: usize,
    pub key_start: usize,
    pub key_end: usize,
    pub text_start: usize,
    pub text_end: usize,
}

#[derive(Clone)]
pub struct JsonbPayload {
    pub characters: Vec<char>,
    pub nodes: Vec<JsonbNode>,
    pub root: usize,
}

// Partial JSONB facts. A shape with nodes is the complete logical tree except for kind 7 holes:
// each hole stands for one nonnull JSON value, and its text holds seven '0'/'1' flags, one per
// possible node kind from null to object. An empty shape records no structure.
#[derive(Clone)]
pub struct JsonbKnowledge {
    pub maximum: i64,
    pub kind: i32,
    pub length: i32,
    pub shape: JsonbPayload,
}

#[derive(Clone)]
pub enum JsonbValue {
    Unknown,
    Unimplemented,
    NonNull(JsonbKnowledge),
    Null,
    Value(JsonbPayload),
    Error(SqlError),
}

#[derive(Clone, Copy)]
pub struct TsvectorPosition {
    pub position: i32,
    pub weight: i32,
}

#[derive(Clone)]
pub struct TsvectorLexeme {
    pub text: String,
    pub positions: Vec<TsvectorPosition>,
}

#[derive(Clone)]
pub struct TsvectorPayload {
    pub lexemes: Vec<TsvectorLexeme>,
    pub native_bytes: i32,
}

#[derive(Clone)]
pub enum TsvectorValue {
    Unknown,
    Unimplemented,
    Null,
    Value(TsvectorPayload),
    Error(SqlError),
}

#[derive(Clone)]
pub struct TsqueryNode {
    pub kind: i32,
    pub text: String,
    pub weight: i32,
    pub prefix: bool,
    pub distance: i32,
    pub left: usize,
    pub right: usize,
}

#[derive(Clone)]
pub struct TsqueryPayload {
    pub nodes: Vec<TsqueryNode>,
    pub root: usize,
    pub native_bytes: i32,
}

#[derive(Clone)]
pub enum TsqueryValue {
    Unknown,
    Unimplemented,
    Null,
    Value(TsqueryPayload),
    Error(SqlError),
}

pub fn bool_unresolved(flavor: i32) -> BoolValue {
    if flavor == 1 { return BoolValue::Unknown; };
    BoolValue::Unimplemented
}

pub fn int4_unresolved(flavor: i32) -> Int4Value {
    if flavor == 1 { return Int4Value::Unknown; };
    Int4Value::Unimplemented
}

pub fn jsonb_unresolved(flavor: i32) -> JsonbValue {
    if flavor == 1 { return JsonbValue::Unknown; };
    JsonbValue::Unimplemented
}

pub fn numeric_unresolved(flavor: i32) -> NumericValue {
    if flavor == 1 { return NumericValue::Unknown; };
    NumericValue::Unimplemented
}

pub fn text_unresolved(flavor: i32) -> TextValue {
    if flavor == 1 { return TextValue::Unknown; };
    TextValue::Unimplemented
}

pub fn check_unresolved(flavor: i32) -> CheckOutcome {
    if flavor == 1 { return CheckOutcome::Unknown; };
    CheckOutcome::Unimplemented
}

// A deferral guarded by a declared-context fact needs the database, unless an input it reached was
// already Unimplemented.
pub fn resolution_context(flavor: i32) -> i32 {
    if flavor == 2 { return 2; };
    1
}

/*
 * PostgreSQL Database Management System
 * (also known as Postgres, formerly known as Postgres95)
 *
 * Portions Copyright (c) 1996-2026, PostgreSQL Global Development Group
 *
 * Portions Copyright (c) 1994, The Regents of the University of California
 *
 * Permission to use, copy, modify, and distribute this software and its
 * documentation for any purpose, without fee, and without a written agreement
 * is hereby granted, provided that the above copyright notice and this
 * paragraph and the following two paragraphs appear in all copies.
 *
 * IN NO EVENT SHALL THE UNIVERSITY OF CALIFORNIA BE LIABLE TO ANY PARTY FOR
 * DIRECT, INDIRECT, SPECIAL, INCIDENTAL, OR CONSEQUENTIAL DAMAGES, INCLUDING
 * LOST PROFITS, ARISING OUT OF THE USE OF THIS SOFTWARE AND ITS
 * DOCUMENTATION, EVEN IF THE UNIVERSITY OF CALIFORNIA HAS BEEN ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *
 * THE UNIVERSITY OF CALIFORNIA SPECIFICALLY DISCLAIMS ANY WARRANTIES,
 * INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY
 * AND FITNESS FOR A PARTICULAR PURPOSE.  THE SOFTWARE PROVIDED HEREUNDER IS
 * ON AN "AS IS" BASIS, AND THE UNIVERSITY OF CALIFORNIA HAS NO OBLIGATIONS TO
 * PROVIDE MAINTENANCE, SUPPORT, UPDATES, ENHANCEMENTS, OR MODIFICATIONS.
 */

#[derive(Clone, Copy)]
pub struct NumericLayout {
    pub valid: bool,
    pub special: i32,
    pub sign: i32,
    pub weight: i32,
    pub first: usize,
    pub end: usize,
}

fn invalid_numeric_parts() -> NumericLayout {
    NumericLayout {
        valid: false,
        special: 1,
        sign: 0,
        weight: 0,
        first: 0,
        end: 0,
    }
}

pub fn numeric_space(value: char) -> bool {
    value == ' '
        || value == '\t'
        || value == '\n'
        || value == '\r'
        || value == '\x0b'
        || value == '\x0c'
}

fn numeric_digit(value: char) -> i32 {
    if value == '0' {
        return 0;
    }
    if value == '1' {
        return 1;
    }
    if value == '2' {
        return 2;
    }
    if value == '3' {
        return 3;
    }
    if value == '4' {
        return 4;
    }
    if value == '5' {
        return 5;
    }
    if value == '6' {
        return 6;
    }
    if value == '7' {
        return 7;
    }
    if value == '8' {
        return 8;
    }
    if value == '9' {
        return 9;
    }
    -1
}

pub fn numeric_parts(value: &str) -> NumericLayout {
    let chars: Vec<char> = value.chars().collect();
    if chars.len() > 1000000 {
        return invalid_numeric_parts();
    }
    let mut begin: usize = 0;
    let mut end = chars.len();
    while begin < end && numeric_space(chars[begin]) {
        begin += 1;
    }
    while end > begin && numeric_space(chars[end - 1]) {
        end = end - 1;
    }
    if begin == end {
        return invalid_numeric_parts();
    }
    let mut index = begin;
    let mut sign: i32 = 1;
    if chars[index] == '-' {
        sign = -1;
        index += 1;
    } else if chars[index] == '+' {
        index += 1;
    }
    if index == end {
        return invalid_numeric_parts();
    }
    if end - begin == 3
        && chars[begin].to_ascii_lowercase() == 'n'
        && chars[begin + 1].to_ascii_lowercase() == 'a'
        && chars[begin + 2].to_ascii_lowercase() == 'n'
    {
        return NumericLayout {
            valid: true,
            special: 3,
            sign: 0,
            weight: 0,
            first: 0,
            end: 0,
        };
    }
    if (end - index == 3 || end - index == 8)
        && chars[index].to_ascii_lowercase() == 'i'
        && chars[index + 1].to_ascii_lowercase() == 'n'
        && chars[index + 2].to_ascii_lowercase() == 'f'
    {
        if end - index == 8
            && (chars[index + 3].to_ascii_lowercase() != 'i'
                || chars[index + 4].to_ascii_lowercase() != 'n'
                || chars[index + 5].to_ascii_lowercase() != 'i'
                || chars[index + 6].to_ascii_lowercase() != 't'
                || chars[index + 7].to_ascii_lowercase() != 'y')
        {
            return invalid_numeric_parts();
        }
        let mut special: i32 = 2;
        if sign < 0 {
            special = 0;
        }
        return NumericLayout {
            valid: true,
            special: special,
            sign: 0,
            weight: 0,
            first: 0,
            end: 0,
        };
    }
    let mut point = false;
    let mut digits: i32 = 0;
    let mut before: i32 = 0;
    let mut fractional: i32 = 0;
    let mut first = end;
    let mut last: usize = 0;
    let mut leading: i32 = 0;
    while index < end {
        let digit = numeric_digit(chars[index]);
        if digit >= 0 {
            if first == end && digit == 0 {
                leading = leading + 1;
            }
            if digit != 0 {
                if first == end {
                    first = index;
                }
                last = index + 1;
            }
            digits = digits + 1;
            if point {
                fractional = fractional + 1;
            } else {
                before = before + 1;
            }
            index += 1;
        } else if chars[index] == '.' {
            if point {
                return invalid_numeric_parts();
            }
            point = true;
            index += 1;
            if index < end && chars[index] == '_' {
                return invalid_numeric_parts();
            }
        } else if chars[index] == '_' {
            if index == begin
                || numeric_digit(chars[index - 1]) < 0
                || index + 1 == end
                || numeric_digit(chars[index + 1]) < 0
            {
                return invalid_numeric_parts();
            }
            index += 1;
        } else {
            break;
        };
    }
    if digits == 0 {
        return invalid_numeric_parts();
    }
    let mut exponent: i32 = 0;
    if index < end && (chars[index] == 'e' || chars[index] == 'E') {
        index += 1;
        let mut negative = false;
        if index < end && chars[index] == '-' {
            negative = true;
            index += 1;
        } else if index < end && chars[index] == '+' {
            index += 1;
        }
        let start = index;
        if index == end || numeric_digit(chars[index]) < 0 {
            return invalid_numeric_parts();
        }
        while index < end {
            let digit = numeric_digit(chars[index]);
            if digit >= 0 {
                if exponent > 107374182 || (exponent == 107374182 && digit > 3) {
                    return invalid_numeric_parts();
                }
                exponent = exponent * 10 + digit;
                index += 1;
            } else if chars[index] == '_' {
                if index == start
                    || numeric_digit(chars[index - 1]) < 0
                    || index + 1 == end
                    || numeric_digit(chars[index + 1]) < 0
                {
                    return invalid_numeric_parts();
                }
                index += 1;
            } else {
                break;
            };
        }
        if negative {
            exponent = 0 - exponent;
        }
    }
    if index != end || fractional - exponent > 16383 {
        return invalid_numeric_parts();
    }
    let weight = before - leading - 1 + exponent;
    if first == end {
        return NumericLayout {
            valid: true,
            special: 1,
            sign: 0,
            weight: 0,
            first: 0,
            end: 0,
        };
    }
    if weight > 131071 || weight < -131072 {
        return invalid_numeric_parts();
    }
    NumericLayout {
        valid: true,
        special: 1,
        sign: sign,
        weight: weight,
        first: first,
        end: last,
    }
}

// NumericVar sign values for the special numerics, which carry no digits.
pub const NUMERIC_SIGN_PINF: i32 = 2;

pub const NUMERIC_SIGN_NINF: i32 = 4;

pub const NUMERIC_SIGN_NAN: i32 = 3;

// PostgreSQL's NumericVar, the form numeric values take between operations: base-NBASE
// digits, most significant first, the weight of the first digit, the display scale, and a sign
// of 1 or -1, or one of the special signs. A zero has no digits.
#[derive(Clone)]
pub struct NumericVar {
    pub sign: i32,
    pub weight: i32,
    pub dscale: i32,
    pub digits: Vec<usize>,
}

pub fn numeric_var_special(sign: i32) -> NumericVar {
    let digits: Vec<usize> = Vec::new();
    NumericVar {
        sign: sign,
        weight: 0,
        dscale: 0,
        digits: digits,
    }
}

// PostgreSQL's get_str_from_var: the integer digits without leading zeros, then dscale
// fractional digits.
pub fn numeric_text(value: &NumericVar) -> String {
    if value.sign == NUMERIC_SIGN_NAN {
        return "NaN".to_owned();
    }
    if value.sign == NUMERIC_SIGN_PINF {
        return "Infinity".to_owned();
    }
    if value.sign == NUMERIC_SIGN_NINF {
        return "-Infinity".to_owned();
    }
    let mut output = String::new();
    if value.sign < 0 {
        output.push('-');
    }
    let count = value.digits.len() as i32;
    if value.weight < 0 {
        output.push('0');
    } else {
        let mut d: i32 = 0;
        while d <= value.weight {
            let mut dig: i32 = 0;
            if d < count {
                dig = value.digits[usize::try_from(d).unwrap_or(0)] as i32;
            }
            let mut putit = d > 0;
            let mut place: i32 = 1000;
            while place > 1 {
                let d1 = dig / place;
                dig = dig - d1 * place;
                if d1 > 0 {
                    putit = true;
                }
                if putit {
                    output.push(char::from_u32((d1 + 48) as u32).unwrap_or('0'));
                }
                place = place / 10;
            }
            output.push(char::from_u32((dig + 48) as u32).unwrap_or('0'));
            d = d + 1;
        }
    };
    if value.dscale > 0 {
        output.push('.');
        let mut written: i32 = 0;
        let mut d = value.weight + 1;
        while written < value.dscale {
            let mut dig: i32 = 0;
            if d >= 0 && d < count {
                dig = value.digits[usize::try_from(d).unwrap_or(0)] as i32;
            }
            let mut place: i32 = 1000;
            while place > 0 && written < value.dscale {
                let d1 = dig / place;
                dig = dig - d1 * place;
                output.push(char::from_u32((d1 + 48) as u32).unwrap_or('0'));
                written = written + 1;
                place = place / 10;
            }
            d = d + 1;
        }
    }
    output
}

#[derive(Clone)]
struct JsonSyntaxSource {
    characters: Vec<char>,
}

#[derive(Clone, Copy)]
struct JsonSyntaxToken {
    kind: i32,
    end: usize,
}

const JSON_SYNTAX_INVALID: i32 = 12;

const JSON_SYNTAX_END: i32 = 0;

const JSON_SYNTAX_STRING: i32 = 1;

const JSON_SYNTAX_NUMBER: i32 = 2;

const JSON_SYNTAX_TRUE: i32 = 3;

const JSON_SYNTAX_FALSE: i32 = 4;

const JSON_SYNTAX_NULL: i32 = 5;

const JSON_SYNTAX_OBJECT_START: i32 = 6;

const JSON_SYNTAX_OBJECT_END: i32 = 7;

const JSON_SYNTAX_ARRAY_START: i32 = 8;

const JSON_SYNTAX_ARRAY_END: i32 = 9;

const JSON_SYNTAX_COLON: i32 = 10;

const JSON_SYNTAX_COMMA: i32 = 11;

const JSON_SYNTAX_ROOT_VALUE: i32 = 0;

const JSON_SYNTAX_ROOT_END: i32 = 1;

const JSON_SYNTAX_ARRAY_FIRST: i32 = 2;

const JSON_SYNTAX_ARRAY_NEXT: i32 = 3;

const JSON_SYNTAX_ARRAY_VALUE: i32 = 4;

const JSON_SYNTAX_OBJECT_FIRST: i32 = 5;

const JSON_SYNTAX_OBJECT_COLON: i32 = 6;

const JSON_SYNTAX_OBJECT_VALUE: i32 = 7;

const JSON_SYNTAX_OBJECT_NEXT: i32 = 8;

const JSON_SYNTAX_OBJECT_KEY: i32 = 9;

fn json_syntax_space(character: char) -> bool {
    character == ' ' || character == '\t' || character == '\n' || character == '\r'
}

fn json_syntax_digit(character: char) -> bool {
    let code = character as i32;
    code >= 48 && code <= 57
}

fn json_syntax_alphanumeric(character: char) -> bool {
    let code = character as i32;
    json_syntax_digit(character)
        || (code >= 65 && code <= 90)
        || (code >= 97 && code <= 122)
        || code >= 128
        || character == '_'
}

fn json_syntax_hex(character: char) -> bool {
    let code = character as i32;
    (code >= 48 && code <= 57) || (code >= 65 && code <= 70) || (code >= 97 && code <= 102)
}

fn json_syntax_bad_token(end: usize) -> JsonSyntaxToken {
    JsonSyntaxToken {
        kind: JSON_SYNTAX_INVALID,
        end: end,
    }
}

fn json_syntax_read_string(source: &JsonSyntaxSource, begin: usize) -> JsonSyntaxToken {
    let mut position = begin + 1;
    while position < source.characters.len() {
        let character = source.characters[position];
        position += 1;
        if character == '"' {
            return JsonSyntaxToken {
                kind: JSON_SYNTAX_STRING,
                end: position,
            };
        };
        let code = character as i32;
        if code < 32 {
            return json_syntax_bad_token(position);
        };
        if character == '\\' {
            if position >= source.characters.len() {
                return json_syntax_bad_token(position);
            };
            let escape = source.characters[position];
            position += 1;
            if escape == 'u' {
                let mut digit: usize = 0;
                while digit < 4 {
                    if position >= source.characters.len()
                        || json_syntax_hex(source.characters[position]) == false
                    {
                        return json_syntax_bad_token(position);
                    };
                    position += 1;
                    digit += 1;
                }
            } else if escape != '"'
                && escape != '\\'
                && escape != '/'
                && escape != 'b'
                && escape != 'f'
                && escape != 'n'
                && escape != 'r'
                && escape != 't'
            {
                return json_syntax_bad_token(position);
            };
        };
    }
    json_syntax_bad_token(position)
}

fn json_syntax_read_number(source: &JsonSyntaxSource, begin: usize) -> JsonSyntaxToken {
    let mut position = begin;
    if source.characters[position] == '-' {
        position += 1;
    };
    if position >= source.characters.len()
        || json_syntax_digit(source.characters[position]) == false
    {
        return json_syntax_bad_token(position);
    };
    if source.characters[position] == '0' {
        position += 1;
    } else {
        while position < source.characters.len() && json_syntax_digit(source.characters[position]) {
            position += 1;
        }
    };
    if position < source.characters.len() && source.characters[position] == '.' {
        position += 1;
        let first = position;
        while position < source.characters.len() && json_syntax_digit(source.characters[position]) {
            position += 1;
        }
        if position == first {
            return json_syntax_bad_token(position);
        };
    };
    if position < source.characters.len()
        && (source.characters[position] == 'e' || source.characters[position] == 'E')
    {
        position += 1;
        if position < source.characters.len()
            && (source.characters[position] == '+' || source.characters[position] == '-')
        {
            position += 1;
        };
        let first = position;
        while position < source.characters.len() && json_syntax_digit(source.characters[position]) {
            position += 1;
        }
        if position == first {
            return json_syntax_bad_token(position);
        };
    };
    if position < source.characters.len() && json_syntax_alphanumeric(source.characters[position]) {
        return json_syntax_bad_token(position);
    };
    JsonSyntaxToken {
        kind: JSON_SYNTAX_NUMBER,
        end: position,
    }
}

fn json_syntax_keyword(
    source: &JsonSyntaxSource,
    begin: usize,
    word: &str,
    kind: i32,
) -> JsonSyntaxToken {
    let expected: Vec<char> = word.chars().collect();
    let mut index: usize = 0;
    let mut position = begin;
    while index < expected.len() {
        if position >= source.characters.len() || source.characters[position] != expected[index] {
            return json_syntax_bad_token(position);
        };
        position += 1;
        index += 1;
    }
    if position < source.characters.len() && json_syntax_alphanumeric(source.characters[position]) {
        return json_syntax_bad_token(position);
    };
    JsonSyntaxToken {
        kind: kind,
        end: position,
    }
}

fn json_syntax_read_token(source: &JsonSyntaxSource, begin: usize) -> JsonSyntaxToken {
    let mut position = begin;
    while position < source.characters.len() && json_syntax_space(source.characters[position]) {
        position += 1;
    }
    if position == source.characters.len() {
        return JsonSyntaxToken {
            kind: JSON_SYNTAX_END,
            end: position,
        };
    };
    let character = source.characters[position];
    if character == '"' {
        return json_syntax_read_string(source, position);
    };
    if character == '-' || json_syntax_digit(character) {
        return json_syntax_read_number(source, position);
    };
    if character == 't' {
        return json_syntax_keyword(source, position, "true", JSON_SYNTAX_TRUE);
    };
    if character == 'f' {
        return json_syntax_keyword(source, position, "false", JSON_SYNTAX_FALSE);
    };
    if character == 'n' {
        return json_syntax_keyword(source, position, "null", JSON_SYNTAX_NULL);
    };
    let mut kind = JSON_SYNTAX_INVALID;
    if character == '{' {
        kind = JSON_SYNTAX_OBJECT_START;
    } else if character == '}' {
        kind = JSON_SYNTAX_OBJECT_END;
    } else if character == '[' {
        kind = JSON_SYNTAX_ARRAY_START;
    } else if character == ']' {
        kind = JSON_SYNTAX_ARRAY_END;
    } else if character == ':' {
        kind = JSON_SYNTAX_COLON;
    } else if character == ',' {
        kind = JSON_SYNTAX_COMMA;
    };
    JsonSyntaxToken {
        kind: kind,
        end: position + 1,
    }
}

fn json_syntax_root_kind(token: i32) -> i32 {
    if token == JSON_SYNTAX_NULL {
        return 0;
    };
    if token == JSON_SYNTAX_FALSE {
        return 1;
    };
    if token == JSON_SYNTAX_TRUE {
        return 2;
    };
    if token == JSON_SYNTAX_NUMBER {
        return 3;
    };
    if token == JSON_SYNTAX_STRING {
        return 4;
    };
    if token == JSON_SYNTAX_ARRAY_START {
        return 5;
    };
    if token == JSON_SYNTAX_OBJECT_START {
        return 6;
    };
    -1
}

#[derive(Clone, Copy)]
struct JsonSyntaxTransition {
    state: i32,
    action: i32,
}

const JSON_SYNTAX_REJECT: i32 = 7;

const JSON_SYNTAX_CONTINUE: i32 = 0;

const JSON_SYNTAX_FINISH: i32 = 1;

const JSON_SYNTAX_CLOSE: i32 = 2;

const JSON_SYNTAX_KEY: i32 = 3;

const JSON_SYNTAX_VALUE: i32 = 4;

const JSON_SYNTAX_OPEN_ARRAY: i32 = 5;

const JSON_SYNTAX_OPEN_OBJECT: i32 = 6;

fn json_syntax_step(state: i32, token: i32) -> JsonSyntaxTransition {
    let mut next = state;
    let mut action = JSON_SYNTAX_REJECT;
    if state == JSON_SYNTAX_ROOT_END {
        if token == JSON_SYNTAX_END {
            action = JSON_SYNTAX_FINISH;
        };
    } else if state == JSON_SYNTAX_ARRAY_NEXT || state == JSON_SYNTAX_OBJECT_NEXT {
        let mut close = JSON_SYNTAX_ARRAY_END;
        let mut continuation = JSON_SYNTAX_ARRAY_VALUE;
        if state == JSON_SYNTAX_OBJECT_NEXT {
            close = JSON_SYNTAX_OBJECT_END;
            continuation = JSON_SYNTAX_OBJECT_KEY;
        };
        if token == close {
            action = JSON_SYNTAX_CLOSE;
        } else if token == JSON_SYNTAX_COMMA {
            next = continuation;
            action = JSON_SYNTAX_CONTINUE;
        };
    } else if state == JSON_SYNTAX_OBJECT_COLON {
        if token == JSON_SYNTAX_COLON {
            next = JSON_SYNTAX_OBJECT_VALUE;
            action = JSON_SYNTAX_CONTINUE;
        };
    } else if state == JSON_SYNTAX_OBJECT_FIRST || state == JSON_SYNTAX_OBJECT_KEY {
        if state == JSON_SYNTAX_OBJECT_FIRST && token == JSON_SYNTAX_OBJECT_END {
            action = JSON_SYNTAX_CLOSE;
        } else if token == JSON_SYNTAX_STRING {
            next = JSON_SYNTAX_OBJECT_COLON;
            action = JSON_SYNTAX_KEY;
        };
    } else if state == JSON_SYNTAX_ARRAY_FIRST && token == JSON_SYNTAX_ARRAY_END {
        action = JSON_SYNTAX_CLOSE;
    } else if json_syntax_root_kind(token) >= 0 {
        action = JSON_SYNTAX_VALUE;
        if token == JSON_SYNTAX_ARRAY_START {
            action = JSON_SYNTAX_OPEN_ARRAY;
        } else if token == JSON_SYNTAX_OBJECT_START {
            action = JSON_SYNTAX_OPEN_OBJECT;
        };
        next = JSON_SYNTAX_ARRAY_NEXT;
        if state == JSON_SYNTAX_ROOT_VALUE {
            next = JSON_SYNTAX_ROOT_END;
        } else if state == JSON_SYNTAX_OBJECT_VALUE {
            next = JSON_SYNTAX_OBJECT_NEXT;
        };
    };
    JsonSyntaxTransition {
        state: next,
        action: action,
    }
}

#[derive(Clone, Copy)]
struct JsonReadToken {
    start: usize,
    end: usize,
    kind: i32,
    syntax: i32,
}

const JSON_READ_END: i32 = 0;

const JSON_READ_QUOTE: i32 = 1;

const JSON_READ_ATOM: i32 = 2;

const JSON_READ_OBJECT_OPEN: i32 = 3;

const JSON_READ_OBJECT_CLOSE: i32 = 4;

const JSON_READ_ARRAY_OPEN: i32 = 5;

const JSON_READ_ARRAY_CLOSE: i32 = 6;

const JSON_READ_COLON: i32 = 7;

const JSON_READ_COMMA: i32 = 8;

const JSON_READ_ZERO: u32 = 3484949;

const JSON_READ_INVALID_TEXT: u32 = 3484946;

fn json_read_next_token(source: &JsonSyntaxSource, begin: usize) -> JsonReadToken {
    let mut start = begin;
    while start < source.characters.len() && json_syntax_space(source.characters[start]) {
        start += 1;
    }
    let token = json_syntax_read_token(source, start);
    let mut kind = JSON_READ_ATOM;
    if token.kind == JSON_SYNTAX_STRING {
        kind = JSON_READ_QUOTE;
    } else if token.kind == JSON_SYNTAX_OBJECT_START {
        kind = JSON_READ_OBJECT_OPEN;
    } else if token.kind == JSON_SYNTAX_OBJECT_END {
        kind = JSON_READ_OBJECT_CLOSE;
    } else if token.kind == JSON_SYNTAX_ARRAY_START {
        kind = JSON_READ_ARRAY_OPEN;
    } else if token.kind == JSON_SYNTAX_ARRAY_END {
        kind = JSON_READ_ARRAY_CLOSE;
    } else if token.kind == JSON_SYNTAX_COLON {
        kind = JSON_READ_COLON;
    } else if token.kind == JSON_SYNTAX_COMMA {
        kind = JSON_READ_COMMA;
    } else if token.kind == JSON_SYNTAX_END {
        kind = JSON_READ_END;
    };
    JsonReadToken {
        start: start,
        end: token.end,
        kind: kind,
        syntax: token.kind,
    }
}

fn json_read_hex(character: char) -> i32 {
    let code = character as i32;
    if code >= 48 && code <= 57 {
        return code - 48;
    };
    if code >= 65 && code <= 70 {
        return code - 55;
    };
    code - 87
}

fn json_read_decode_string_context(
    source: &JsonSyntaxSource,
    token: JsonReadToken,
    utf8: bool,
) -> TextValue {
    let unresolved_flavor: i32 = 0;
    let mut position = token.start + 1;
    let mut high: i32 = -1;
    let mut output = String::new();
    while position < source.characters.len() {
        let character = source.characters[position];
        position += 1;
        if character == '"' {
            if high >= 0 {
                return TextValue::Error(make_sql_error(JSON_READ_INVALID_TEXT));
            };
            return TextValue::Value(output);
        };
        if (character as i32) < 32 {
            return TextValue::Error(make_sql_error(JSON_READ_INVALID_TEXT));
        };
        if character == '\\' {
            if position == source.characters.len() {
                return TextValue::Error(make_sql_error(JSON_READ_INVALID_TEXT));
            };
            let escape = source.characters[position];
            position += 1;
            if escape == 'u' {
                let mut code: i32 = 0;
                let mut digit: usize = 0;
                while digit < 4 {
                    if position == source.characters.len()
                        || json_syntax_hex(source.characters[position]) == false
                    {
                        return TextValue::Error(make_sql_error(JSON_READ_INVALID_TEXT));
                    };
                    code = code * 16 + json_read_hex(source.characters[position]);
                    position += 1;
                    digit += 1;
                }
                if code >= 55296 && code <= 56319 {
                    if high >= 0 {
                        return TextValue::Error(make_sql_error(JSON_READ_INVALID_TEXT));
                    };
                    high = code;
                } else {
                    if code >= 56320 && code <= 57343 {
                        if high < 0 {
                            return TextValue::Error(make_sql_error(JSON_READ_INVALID_TEXT));
                        };
                        code = 65536 + (high - 55296) * 1024 + code - 56320;
                        high = -1;
                    };
                    if high >= 0 {
                        return TextValue::Error(make_sql_error(JSON_READ_INVALID_TEXT));
                    };
                    if code == 0 {
                        return TextValue::Error(make_sql_error(JSON_READ_ZERO));
                    };
                    if code > 127 && utf8 == false {
                        return text_unresolved(resolution_context(unresolved_flavor));
                    };
                    output.push(char::from_u32(code as u32).unwrap_or(' '));
                };
            } else {
                if high >= 0 {
                    return TextValue::Error(make_sql_error(JSON_READ_INVALID_TEXT));
                };
                let mut decoded = escape;
                if escape == 'b' {
                    decoded = '\u{0008}';
                } else if escape == 'f' {
                    decoded = '\u{000c}';
                } else if escape == 'n' {
                    decoded = '\n';
                } else if escape == 'r' {
                    decoded = '\r';
                } else if escape == 't' {
                    decoded = '\t';
                } else if escape != '"' && escape != '\\' && escape != '/' {
                    return TextValue::Error(make_sql_error(JSON_READ_INVALID_TEXT));
                };
                output.push(decoded);
            };
        } else {
            if high >= 0 {
                return TextValue::Error(make_sql_error(JSON_READ_INVALID_TEXT));
            };
            output.push(character);
        };
    }
    TextValue::Error(make_sql_error(JSON_READ_INVALID_TEXT))
}

#[derive(Clone, Copy)]
struct JsonbFrame {
    state: i32,
    node: usize,
    tail: usize,
    key_start: usize,
    key_end: usize,
}

#[derive(Clone)]
struct JsonbCharacters {
    characters: Vec<char>,
}

const JSONB_NUMERIC_RANGE: u32 = 3452547;

fn jsonb_node_link(node: JsonbNode, next: usize) -> JsonbNode {
    JsonbNode {
        kind: node.kind,
        child: node.child,
        next: next,
        key_start: node.key_start,
        key_end: node.key_end,
        text_start: node.text_start,
        text_end: node.text_end,
    }
}

fn jsonb_node_child(node: JsonbNode, child: usize) -> JsonbNode {
    JsonbNode {
        kind: node.kind,
        child: child,
        next: node.next,
        key_start: node.key_start,
        key_end: node.key_end,
        text_start: node.text_start,
        text_end: node.text_end,
    }
}

fn jsonb_scalar_ready(source: &JsonSyntaxSource, token: JsonReadToken, utf8: bool) -> BoolValue {
    let unresolved_flavor: i32 = 0;
    let following = json_read_next_token(source, token.end);
    if following.start < source.characters.len() && source.characters[following.start] == '"' {
        let decoded = json_read_decode_string_context(source, following, utf8);
        if let TextValue::Error(error) = decoded {
            return BoolValue::Error(error);
        };
        let mut condition_flavor_49_8: i32 = unresolved_flavor; if let TextValue::Unknown = decoded { if condition_flavor_49_8 < 1 { condition_flavor_49_8 = 1; }; }; if let TextValue::Unimplemented = decoded { condition_flavor_49_8 = 2; }; if (decoded == TextValue::Unknown || decoded == TextValue::Unimplemented) || decoded == TextValue::NonNull {
            return bool_unresolved(condition_flavor_49_8);
        };
    };
    if following.syntax == JSON_SYNTAX_INVALID {
        return BoolValue::Error(make_sql_error(JSON_READ_INVALID_TEXT));
    };
    BoolValue::Value(true)
}

fn jsonb_number_text(source: &JsonSyntaxSource, token: JsonReadToken, utf8: bool) -> TextValue {
    let unresolved_flavor: i32 = 0;
    let ready = jsonb_scalar_ready(source, token, utf8);
    if let BoolValue::Error(error) = ready {
        return TextValue::Error(error);
    };
    let mut condition_flavor_65_4: i32 = unresolved_flavor; if let BoolValue::Unknown = ready { if condition_flavor_65_4 < 1 { condition_flavor_65_4 = 1; }; }; if let BoolValue::Unimplemented = ready { condition_flavor_65_4 = 2; }; if ready == BoolValue::Unknown || ready == BoolValue::Unimplemented {
        return text_unresolved(condition_flavor_65_4);
    };
    let mut position = token.start;
    let negative = source.characters[position] == '-';
    if negative {
        position += 1;
    };
    let mut digits: Vec<char> = Vec::new();
    let mut before: i32 = 0;
    let mut point = false;
    let mut first: i32 = -1;
    while position < token.end
        && source.characters[position] != 'e'
        && source.characters[position] != 'E'
    {
        let character = source.characters[position];
        if character == '.' {
            point = true;
        } else {
            if first < 0 && character != '0' {
                first = digits.len() as i32;
            };
            digits.push(character);
            if point == false {
                before = before + 1;
            };
        };
        position += 1;
    }
    let mut exponent: i32 = 0;
    if position < token.end {
        position += 1;
        let mut sign: i32 = 1;
        if source.characters[position] == '-' {
            sign = -1;
            position += 1;
        } else if source.characters[position] == '+' {
            position += 1;
        };
        while position < token.end {
            let digit = source.characters[position] as i32 - 48;
            if exponent > 107374182 || (exponent == 107374182 && digit > 3) {
                return TextValue::Error(make_sql_error(JSONB_NUMERIC_RANGE));
            };
            exponent = exponent * 10 + digit;
            position += 1;
        }
        exponent = exponent * sign;
    };
    let count = digits.len() as i32;
    let mut scale = (count - before) as i64 - exponent as i64;
    if scale < 0i64 {
        scale = 0i64;
    };
    let boundary = before as i64 + exponent as i64;
    let weight = boundary - first as i64 - 1i64;
    if scale > 16383i64 || (first >= 0 && weight > 131071i64) {
        return TextValue::Error(make_sql_error(JSONB_NUMERIC_RANGE));
    };
    let mut output = String::new();
    if first >= 0 && negative {
        output.push('-');
    };
    let mut place: i64 = 0i64;
    if first >= 0 && weight > 0i64 {
        place = weight;
    };
    while place >= 0i64 {
        let index = boundary - place - 1i64;
        let mut digit = '0';
        if first >= 0 && index >= 0i64 && index < count as i64 {
            digit = digits[usize::try_from(index as i32).unwrap_or(0)];
        };
        output.push(digit);
        place = place - 1i64;
    }
    if scale > 0i64 {
        output.push('.');
    };
    let mut fraction: i64 = 0i64;
    while fraction < scale {
        let index = boundary + fraction;
        let mut digit = '0';
        if first >= 0 && index >= 0i64 && index < count as i64 {
            digit = digits[usize::try_from(index as i32).unwrap_or(0)];
        };
        output.push(digit);
        fraction = fraction + 1i64;
    }
    let numeric = numeric_parts(output.as_str());
    if numeric.valid == false {
        return TextValue::Error(make_sql_error(JSONB_NUMERIC_RANGE));
    };
    TextValue::Value(output)
}

fn jsonb_key_compare(source: &JsonbCharacters, left: JsonbNode, right: JsonbNode) -> i32 {
    let a = left.key_end - left.key_start;
    let b = right.key_end - right.key_start;
    if a < b {
        return -1;
    };
    if a > b {
        return 1;
    };
    let mut offset: usize = 0;
    while offset < a {
        let x = source.characters[left.key_start + offset] as i32;
        let y = source.characters[right.key_start + offset] as i32;
        if x < y {
            return -1;
        };
        if x > y {
            return 1;
        };
        offset += 1;
    }
    0
}

fn jsonb_normalize_objects(input: JsonbPayload) -> JsonbPayload {
    let source = JsonbCharacters {
        characters: input.characters,
    };
    let mut nodes = input.nodes;
    let mut index: usize = 1;
    while index < nodes.len() {
        let parent = nodes[index];
        if parent.kind == 6 {
            let mut entries: Vec<usize> = Vec::new();
            let mut scratch: Vec<usize> = Vec::new();
            let mut child = parent.child;
            while child > 0 {
                entries.push(child);
                scratch.push(0);
                child = nodes[child].next;
            }
            let mut width: usize = 1;
            while width < entries.len() {
                let mut begin: usize = 0;
                while begin < entries.len() {
                    let mut middle = begin + width;
                    if middle > entries.len() {
                        middle = entries.len();
                    };
                    let mut end = middle + width;
                    if end > entries.len() {
                        end = entries.len();
                    };
                    let mut a = begin;
                    let mut b = middle;
                    let mut out = begin;
                    while out < end {
                        let mut take_left = b == end;
                        if a < middle && b < end {
                            let comparison =
                                jsonb_key_compare(&source, nodes[entries[a]], nodes[entries[b]]);
                            take_left =
                                comparison < 0 || (comparison == 0 && entries[a] > entries[b]);
                        };
                        if a < middle && take_left {
                            scratch[out] = entries[a];
                            a += 1;
                        } else {
                            scratch[out] = entries[b];
                            b += 1;
                        };
                        out += 1;
                    }
                    begin = end;
                }
                let mut out: usize = 0;
                while out < entries.len() {
                    entries[out] = scratch[out];
                    out += 1;
                }
                width = width + width;
            }
            let mut first: usize = 0;
            let mut last: usize = 0;
            let mut out: usize = 0;
            while out < entries.len() {
                let current = entries[out];
                if last == 0 || jsonb_key_compare(&source, nodes[last], nodes[current]) != 0 {
                    if last == 0 {
                        first = current;
                    } else {
                        nodes[last] = jsonb_node_link(nodes[last], current);
                    };
                    last = current;
                };
                out += 1;
            }
            if last > 0 {
                nodes[last] = jsonb_node_link(nodes[last], 0);
            };
            nodes[index] = jsonb_node_child(parent, first);
        };
        index += 1;
    }
    JsonbPayload {
        characters: source.characters,
        nodes: nodes,
        root: input.root,
    }
}

fn jsonb_parse_text_context(input: TextValue, admission: bool, utf8: bool) -> JsonbValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = input { unresolved_flavor = 1; };
    if let TextValue::NonNull = input { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TextValue::Unimplemented = input { unresolved_flavor = 2; };
    if let TextValue::Error(error) = input {
        return JsonbValue::Error(error);
    };
    if let TextValue::Null = input {
        return JsonbValue::Null;
    };
    if let TextValue::Value(value) = input {
        let source = JsonSyntaxSource {
            characters: value.chars().collect(),
        };
        let mut characters: Vec<char> = Vec::new();
        let mut nodes: Vec<JsonbNode> = Vec::new();
        nodes.push(JsonbNode {
            kind: -1,
            child: 0,
            next: 0,
            key_start: 0,
            key_end: 0,
            text_start: 0,
            text_end: 0,
        });
        let mut frames: Vec<JsonbFrame> = Vec::new();
        frames.push(JsonbFrame {
            state: JSON_SYNTAX_ROOT_VALUE,
            node: 0,
            tail: 0,
            key_start: 0,
            key_end: 0,
        });
        let mut depth: usize = 1;
        let mut position: usize = 0;
        let mut root: usize = 0;
        while depth > 0 {
            let token = json_read_next_token(&source, position);
            let mut decoded = TextValue::Null;
            if token.start < source.characters.len() && source.characters[token.start] == '"' {
                decoded = json_read_decode_string_context(&source, token, utf8);
                if let TextValue::Error(error) = decoded {
                    return JsonbValue::Error(error);
                };
                let mut condition_flavor_317_16: i32 = unresolved_flavor; if let TextValue::Unknown = decoded { if condition_flavor_317_16 < 1 { condition_flavor_317_16 = 1; }; }; if let TextValue::Unimplemented = decoded { condition_flavor_317_16 = 2; }; if (decoded == TextValue::Unknown || decoded == TextValue::Unimplemented) || decoded == TextValue::NonNull {
                    return jsonb_unresolved(condition_flavor_317_16);
                };
            };
            if token.syntax == JSON_SYNTAX_INVALID {
                return JsonbValue::Error(make_sql_error(JSON_READ_INVALID_TEXT));
            };
            let frame = frames[depth - 1];
            if admission && frame.state == JSON_SYNTAX_OBJECT_VALUE {
                let mut low: i64 = 0i64;
                let mut high: i64 = 0i64;
                let mut key = frame.key_start;
                while key < frame.key_end {
                    low = low + 1i64;
                    high = high + 1i64;
                    if characters[key] as i32 > 127 {
                        high = high + 3i64;
                    };
                    key += 1;
                }
                let decision = jsonb_storage_decision(jsonb_storage_bounds(low, high));
                if let BoolValue::Error(error) = decision {
                    return JsonbValue::Error(error);
                };
                let mut condition_flavor_341_16: i32 = unresolved_flavor; if let BoolValue::Unknown = decision { if condition_flavor_341_16 < 1 { condition_flavor_341_16 = 1; }; }; if let BoolValue::Unimplemented = decision { condition_flavor_341_16 = 2; }; if decision == BoolValue::Unknown || decision == BoolValue::Unimplemented {
                    return jsonb_unresolved(condition_flavor_341_16);
                };
            };
            let transition = json_syntax_step(frame.state, token.syntax);
            if transition.action == JSON_SYNTAX_REJECT {
                return JsonbValue::Error(make_sql_error(JSON_READ_INVALID_TEXT));
            };
            if transition.action == JSON_SYNTAX_FINISH {
                let payload = JsonbPayload {
                    characters: characters,
                    nodes: nodes,
                    root: root,
                };
                let normalized = jsonb_normalize_objects(payload);
                if admission {
                    let decision = jsonb_storage_admission(&normalized);
                    if let BoolValue::Error(error) = decision {
                        return JsonbValue::Error(error);
                    };
                    let mut condition_flavor_361_20: i32 = unresolved_flavor; if let BoolValue::Unknown = decision { if condition_flavor_361_20 < 1 { condition_flavor_361_20 = 1; }; }; if let BoolValue::Unimplemented = decision { condition_flavor_361_20 = 2; }; if decision == BoolValue::Unknown || decision == BoolValue::Unimplemented {
                        return jsonb_unresolved(condition_flavor_361_20);
                    };
                };
                return JsonbValue::Value(normalized);
            };
            let mut key_start = frame.key_start;
            let mut key_end = frame.key_end;
            let mut tail = frame.tail;
            if transition.action == JSON_SYNTAX_CLOSE {
                depth = depth - 1;
            } else {
                if transition.action == JSON_SYNTAX_KEY {
                    key_start = characters.len();
                    if let TextValue::Value(key) = decoded {
                        let content: Vec<char> = key.chars().collect();
                        let mut i: usize = 0;
                        while i < content.len() {
                            characters.push(content[i]);
                            i += 1;
                        }
                    };
                    key_end = characters.len();
                } else if transition.action == JSON_SYNTAX_VALUE
                    || transition.action == JSON_SYNTAX_OPEN_ARRAY
                    || transition.action == JSON_SYNTAX_OPEN_OBJECT
                {
                    if token.syntax == JSON_SYNTAX_NUMBER {
                        decoded = jsonb_number_text(&source, token, utf8);
                        if let TextValue::Error(error) = decoded {
                            return JsonbValue::Error(error);
                        };
                        let mut condition_flavor_393_24: i32 = unresolved_flavor; if let TextValue::Unknown = decoded { if condition_flavor_393_24 < 1 { condition_flavor_393_24 = 1; }; }; if let TextValue::Unimplemented = decoded { condition_flavor_393_24 = 2; }; if (decoded == TextValue::Unknown || decoded == TextValue::Unimplemented) || decoded == TextValue::NonNull {
                            return jsonb_unresolved(condition_flavor_393_24);
                        };
                    };
                    if admission && token.kind == JSON_READ_QUOTE {
                        let ready = jsonb_scalar_ready(&source, token, utf8);
                        if let BoolValue::Error(error) = ready {
                            return JsonbValue::Error(error);
                        };
                        let mut condition_flavor_402_24: i32 = unresolved_flavor; if let BoolValue::Unknown = ready { if condition_flavor_402_24 < 1 { condition_flavor_402_24 = 1; }; }; if let BoolValue::Unimplemented = ready { condition_flavor_402_24 = 2; }; if ready == BoolValue::Unknown || ready == BoolValue::Unimplemented {
                            return jsonb_unresolved(condition_flavor_402_24);
                        };
                        let size_text = decoded.clone();
                        if let TextValue::Value(text) = size_text {
                            let content: Vec<char> = text.chars().collect();
                            let mut low: i64 = 0i64;
                            let mut high: i64 = 0i64;
                            let mut position: usize = 0;
                            while position < content.len() {
                                low = low + 1i64;
                                high = high + 1i64;
                                if content[position] as i32 > 127 {
                                    high = high + 3i64;
                                };
                                position += 1;
                            }
                            let decision = jsonb_storage_decision(jsonb_storage_bounds(low, high));
                            if let BoolValue::Error(error) = decision {
                                return JsonbValue::Error(error);
                            };
                            let mut condition_flavor_423_28: i32 = unresolved_flavor; if let BoolValue::Unknown = decision { if condition_flavor_423_28 < 1 { condition_flavor_423_28 = 1; }; }; if let BoolValue::Unimplemented = decision { condition_flavor_423_28 = 2; }; if decision == BoolValue::Unknown || decision == BoolValue::Unimplemented {
                                return jsonb_unresolved(condition_flavor_423_28);
                            };
                        };
                    };
                    let text_start = characters.len();
                    if let TextValue::Value(text) = decoded {
                        let content: Vec<char> = text.chars().collect();
                        let mut i: usize = 0;
                        while i < content.len() {
                            characters.push(content[i]);
                            i += 1;
                        }
                    };
                    let current = nodes.len();
                    nodes.push(JsonbNode {
                        kind: json_syntax_root_kind(token.syntax),
                        child: 0,
                        next: 0,
                        key_start: key_start,
                        key_end: key_end,
                        text_start: text_start,
                        text_end: characters.len(),
                    });
                    if frame.node == 0 {
                        root = current;
                    } else if tail == 0 {
                        nodes[frame.node] = jsonb_node_child(nodes[frame.node], current);
                    } else {
                        nodes[tail] = jsonb_node_link(nodes[tail], current);
                    };
                    tail = current;
                };
                frames[depth - 1] = JsonbFrame {
                    state: transition.state,
                    node: frame.node,
                    tail: tail,
                    key_start: key_start,
                    key_end: key_end,
                };
                if transition.action == JSON_SYNTAX_OPEN_ARRAY
                    || transition.action == JSON_SYNTAX_OPEN_OBJECT
                {
                    let mut state = JSON_SYNTAX_ARRAY_FIRST;
                    if transition.action == JSON_SYNTAX_OPEN_OBJECT {
                        state = JSON_SYNTAX_OBJECT_FIRST;
                    };
                    let child = JsonbFrame {
                        state: state,
                        node: tail,
                        tail: 0,
                        key_start: 0,
                        key_end: 0,
                    };
                    if depth < frames.len() {
                        frames[depth] = child;
                    } else {
                        frames.push(child);
                    };
                    depth += 1;
                };
            };
            position = token.end;
        }
    };
    jsonb_unresolved(unresolved_flavor)
}

fn jsonb_quote(source: &JsonbPayload, begin: usize, end: usize) -> String {
    let mut output = String::new();
    output.push('"');
    let hex: Vec<char> = "0123456789abcdef".chars().collect();
    let mut position = begin;
    while position < end {
        let character = source.characters[position];
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

#[derive(Clone, Copy)]
struct JsonbOutputFrame {
    node: usize,
    child: usize,
}

fn jsonb_render(input: JsonbValue, require_order: bool, pretty: bool) -> TextValue {
    let mut unresolved_flavor: i32 = 0;
    if let JsonbValue::Unknown = input { unresolved_flavor = 1; };
    if let JsonbValue::Unimplemented = input { unresolved_flavor = 2; };
    if let JsonbValue::NonNull(_maximum) = input {
        if pretty {
            return text_unresolved(unresolved_flavor);
        };
        return TextValue::NonNull;
    };
    if let JsonbValue::Error(error) = input {
        return TextValue::Error(error);
    };
    if let JsonbValue::Null = input {
        return TextValue::Null;
    };
    if let JsonbValue::Value(value) = input {
        let mut output = String::new();
        let mut frames: Vec<JsonbOutputFrame> = Vec::new();
        let mut depth: usize = 0;
        let mut current = value.root;
        let mut visiting = true;
        while visiting || depth > 0 {
            if visiting {
                let node = value.nodes[current];
                if node.kind == 0 {
                    output.push_str("null");
                } else if node.kind == 1 {
                    output.push_str("false");
                } else if node.kind == 2 {
                    output.push_str("true");
                } else if node.kind == 3 {
                    let mut position = node.text_start;
                    while position < node.text_end {
                        output.push(value.characters[position]);
                        position += 1;
                    }
                } else if node.kind == 4 {
                    let quoted = jsonb_quote(&value, node.text_start, node.text_end);
                    output.push_str(quoted.as_str());
                } else {
                    if node.kind == 6 && require_order {
                        let mut member = node.child;
                        let mut nonempty: usize = 0;
                        let mut unicode = false;
                        while member > 0 {
                            let entry = value.nodes[member];
                            if entry.key_end > entry.key_start {
                                nonempty += 1;
                            };
                            let mut position = entry.key_start;
                            while position < entry.key_end {
                                if value.characters[position] as i32 > 127 {
                                    unicode = true;
                                };
                                position += 1;
                            }
                            member = entry.next;
                        }
                        // Keys sort by their bytes in the server encoding, which the output does not know.
                        if unicode && nonempty > 1 {
                            return text_unresolved(resolution_context(unresolved_flavor));
                        };
                    };
                    if node.kind == 5 {
                        output.push('[');
                    } else {
                        output.push('{');
                    };
                    let frame = JsonbOutputFrame {
                        node: current,
                        child: node.child,
                    };
                    if depth < frames.len() {
                        frames[depth] = frame;
                    } else {
                        frames.push(frame);
                    };
                    depth += 1;
                };
                visiting = false;
            } else {
                let frame = frames[depth - 1];
                let node = value.nodes[frame.node];
                if frame.child == 0 {
                    if pretty {
                        output.push('\n');
                        let mut level: usize = 0;
                        while level + 1 < depth {
                            output.push_str("    ");
                            level += 1;
                        }
                    };
                    if node.kind == 5 {
                        output.push(']');
                    } else {
                        output.push('}');
                    };
                    depth = depth - 1;
                } else {
                    let child = value.nodes[frame.child];
                    if frame.child != node.child {
                        if pretty {
                            output.push(',');
                        } else {
                            output.push_str(", ");
                        };
                    };
                    if pretty {
                        output.push('\n');
                        let mut level: usize = 0;
                        while level < depth {
                            output.push_str("    ");
                            level += 1;
                        }
                    };
                    if node.kind == 6 {
                        let key = jsonb_quote(&value, child.key_start, child.key_end);
                        output.push_str(key.as_str());
                        output.push_str(": ");
                    };
                    frames[depth - 1] = JsonbOutputFrame {
                        node: frame.node,
                        child: child.next,
                    };
                    current = frame.child;
                    visiting = true;
                };
            };
        }
        return TextValue::Value(output);
    };
    text_unresolved(unresolved_flavor)
}

pub fn jsonb_to_text(input: JsonbValue) -> TextValue {
    jsonb_render(input, true, false)
}

pub fn jsonb_from_text(input: TextValue) -> JsonbValue {
    jsonb_parse_text(input, true)
}

fn jsonb_parse_text(input: TextValue, admission: bool) -> JsonbValue {
    jsonb_parse_text_context(input, admission, false)
}

#[derive(Clone, Copy)]
struct JsonbStorageSize {
    low: i64,
    high: i64,
    reachable: bool,
}

const JSONB_STORAGE_LIMIT: i64 = 268435455i64;

const JSONB_STORAGE_ERROR: u32 = 8584704;

fn jsonb_storage_bounds(low: i64, high: i64) -> JsonbStorageSize {
    let ceiling = JSONB_STORAGE_LIMIT + 4i64;
    let mut a = low;
    let mut b = high;
    if a > ceiling {
        a = ceiling;
    };
    if b > ceiling {
        b = ceiling;
    };
    JsonbStorageSize {
        low: a,
        high: b,
        reachable: true,
    }
}

fn jsonb_storage_decision(size: JsonbStorageSize) -> BoolValue {
    let unresolved_flavor: i32 = 0;
    if size.low > JSONB_STORAGE_LIMIT {
        return BoolValue::Error(make_sql_error(JSONB_STORAGE_ERROR));
    };
    // Sizes that straddle the limit differ by how the server's encoding widens the text.
    if size.high > JSONB_STORAGE_LIMIT {
        return bool_unresolved(resolution_context(unresolved_flavor));
    };
    BoolValue::Value(true)
}

fn jsonb_storage_aligned(value: i64) -> i64 {
    ((value + 3i64) / 4i64) * 4i64
}

fn jsonb_storage_append(
    current: JsonbStorageSize,
    child: JsonbStorageSize,
    align: bool,
    ordered: bool,
) -> JsonbStorageSize {
    if align {
        if ordered {
            return jsonb_storage_bounds(
                jsonb_storage_aligned(current.low) + child.low,
                jsonb_storage_aligned(current.high) + child.high,
            );
        };
        return jsonb_storage_bounds(current.low + child.low, current.high + child.high + 3i64);
    };
    jsonb_storage_bounds(current.low + child.low, current.high + child.high)
}

fn jsonb_storage_padding(current: JsonbStorageSize, ordered: bool) -> JsonbStorageSize {
    if ordered && current.low == current.high {
        let padding = jsonb_storage_aligned(current.low) - current.low;
        return jsonb_storage_bounds(padding, padding);
    };
    jsonb_storage_bounds(0i64, 3i64)
}

#[derive(Clone)]
struct JsonbStorageCharacters {
    non_ascii: Vec<usize>,
    utf8_extra: Vec<usize>,
}

fn jsonb_storage_unicode_before(source: &JsonbStorageCharacters, end: usize) -> usize {
    let mut low: usize = 0;
    let mut high = source.non_ascii.len();
    while low < high {
        let distance = (high - low) as i32;
        let middle = low + usize::try_from(distance / 2).unwrap_or(0);
        if source.non_ascii[middle] < end {
            low = middle + 1;
        } else {
            high = middle;
        };
    }
    low
}

fn jsonb_storage_span(
    source: &JsonbStorageCharacters,
    begin: usize,
    end: usize,
    utf8: bool,
) -> JsonbStorageSize {
    let length = (end - begin) as i32;
    let first = jsonb_storage_unicode_before(source, begin);
    let last = jsonb_storage_unicode_before(source, end);
    let unicode = (last - first) as i32;
    let low = length as i64;
    if utf8 {
        let extra = source.utf8_extra[last] - source.utf8_extra[first];
        let bytes = low + (extra as i32) as i64;
        return jsonb_storage_bounds(bytes, bytes);
    };
    jsonb_storage_bounds(low, low + (unicode as i64) * 3i64)
}

fn jsonb_storage_group(weight: i32) -> i32 {
    let mut group = weight / 4;
    if weight < 0 && weight % 4 != 0 {
        group = group - 1;
    };
    group
}

fn jsonb_storage_numeric(source: &JsonbPayload, node: JsonbNode) -> JsonbStorageSize {
    let mut number = String::new();
    let mut position = node.text_start;
    let mut fractional = false;
    let mut scale: i32 = 0;
    while position < node.text_end {
        let character = source.characters[position];
        number.push(character);
        if fractional {
            scale = scale + 1;
        };
        if character == '.' {
            fractional = true;
        };
        position += 1;
    }
    let layout = numeric_parts(number.as_str());
    let mut first: i32 = 0;
    let mut groups: i32 = 0;
    if layout.sign != 0 {
        first = jsonb_storage_group(layout.weight);
        let mut significant: i32 = 0;
        position = layout.first;
        while position < layout.end {
            if source.characters[node.text_start + position] != '.' {
                significant = significant + 1;
            };
            position += 1;
        }
        let last = jsonb_storage_group(layout.weight - significant + 1);
        groups = first - last + 1;
    };
    let mut header: i64 = 8i64;
    if scale <= 63 && first >= -64 && first <= 63 {
        header = 6i64;
    };
    let size = header + (groups as i64) * 2i64;
    jsonb_storage_bounds(size, size)
}

fn jsonb_storage_character_index(source: &JsonbPayload) -> JsonbStorageCharacters {
    let mut non_ascii: Vec<usize> = Vec::new();
    let mut utf8_extra: Vec<usize> = Vec::new();
    let mut total_extra: usize = 0;
    utf8_extra.push(0);
    let mut position: usize = 0;
    while position < source.characters.len() {
        if source.characters[position] as i32 > 127 {
            non_ascii.push(position);
            let character = source.characters[position] as i32;
            total_extra += 1;
            if character >= 2048 {
                total_extra += 1;
            };
            if character >= 65536 {
                total_extra += 1;
            };
            utf8_extra.push(total_extra);
        };
        position += 1;
    }
    JsonbStorageCharacters {
        non_ascii: non_ascii,
        utf8_extra: utf8_extra,
    }
}

fn jsonb_storage_extents(
    source: &JsonbPayload,
    characters: &JsonbStorageCharacters,
    utf8: bool,
) -> Vec<JsonbStorageSize> {
    let mut sizes: Vec<JsonbStorageSize> = Vec::new();
    let mut index: usize = 0;
    while index < source.nodes.len() {
        sizes.push(JsonbStorageSize {
            low: 0i64,
            high: 0i64,
            reachable: false,
        });
        index += 1;
    }
    sizes[source.root] = jsonb_storage_bounds(0i64, 0i64);
    index = 1;
    while index < source.nodes.len() {
        if sizes[index].reachable {
            let mut child = source.nodes[index].child;
            while child > 0 {
                sizes[child] = jsonb_storage_bounds(0i64, 0i64);
                child = source.nodes[child].next;
            }
        };
        index += 1;
    }
    let mut uncertain = false;
    index = source.nodes.len();
    while index > 1 {
        index = index - 1;
        if sizes[index].reachable {
            let node = source.nodes[index];
            let mut size = jsonb_storage_bounds(0i64, 0i64);
            if node.kind == 3 {
                if node.text_start == node.text_end {
                    size = jsonb_storage_bounds(6i64, 16i64);
                } else {
                    size = jsonb_storage_numeric(source, node);
                };
            } else if node.kind == 4 {
                size = jsonb_storage_span(characters, node.text_start, node.text_end, utf8);
            } else if node.kind >= 5 {
                let mut count: i64 = 0i64;
                let mut keys = jsonb_storage_bounds(0i64, 0i64);
                let mut nonempty: usize = 0;
                let mut unicode = false;
                let mut child = node.child;
                while child > 0 {
                    count = count + 1i64;
                    if node.kind == 6 {
                        let entry = source.nodes[child];
                        let key =
                            jsonb_storage_span(characters, entry.key_start, entry.key_end, utf8);
                        if key.high != key.low {
                            unicode = true;
                        };
                        if entry.key_end > entry.key_start {
                            nonempty += 1;
                        };
                        keys = jsonb_storage_append(keys, key, false, true);
                    };
                    child = source.nodes[child].next;
                }
                let ordered = utf8 || unicode == false || nonempty <= 1;
                let mut entries: i64 = 4i64;
                if node.kind == 6 {
                    entries = 8i64;
                };
                let header = 4i64 + count * entries;
                size =
                    jsonb_storage_append(jsonb_storage_bounds(header, header), keys, false, true);
                child = node.child;
                while child > 0 {
                    let entry = source.nodes[child];
                    let child_size = sizes[child];
                    let align = entry.kind == 3 || entry.kind >= 5;
                    if entry.kind >= 5 {
                        let padding = jsonb_storage_padding(size, ordered);
                        let total = jsonb_storage_bounds(
                            child_size.low + padding.low,
                            child_size.high + padding.high,
                        );
                        let decision = jsonb_storage_decision(total);
                        if let BoolValue::Error(_) = decision {
                            sizes[source.root] = jsonb_storage_bounds(
                                JSONB_STORAGE_LIMIT + 1i64,
                                JSONB_STORAGE_LIMIT + 1i64,
                            );
                            return sizes;
                        };
                        if decision == BoolValue::Unknown || decision == BoolValue::Unimplemented {
                            uncertain = true;
                        };
                    };
                    size = jsonb_storage_append(size, child_size, align, ordered);
                    child = entry.next;
                }
                let decision = jsonb_storage_decision(size);
                if let BoolValue::Error(_) = decision {
                    sizes[source.root] = jsonb_storage_bounds(
                        JSONB_STORAGE_LIMIT + 1i64,
                        JSONB_STORAGE_LIMIT + 1i64,
                    );
                    return sizes;
                };
                if decision == BoolValue::Unknown || decision == BoolValue::Unimplemented {
                    uncertain = true;
                };
            };
            sizes[index] = size;
        };
    }
    let mut root = sizes[source.root];
    if source.nodes[source.root].kind < 5 {
        root = jsonb_storage_append(jsonb_storage_bounds(8i64, 8i64), root, false, true);
    };
    if uncertain && root.high <= JSONB_STORAGE_LIMIT {
        root = jsonb_storage_bounds(root.low, JSONB_STORAGE_LIMIT + 1i64);
    };
    sizes[source.root] = root;
    sizes
}

fn jsonb_storage_layout(source: &JsonbPayload) -> JsonbStorageSize {
    let characters = jsonb_storage_character_index(source);
    let sizes = jsonb_storage_extents(source, &characters, false);
    sizes[source.root]
}

pub fn jsonb_storage_admission(source: &JsonbPayload) -> BoolValue {
    jsonb_storage_decision(jsonb_storage_layout(source))
}

pub(crate) fn array_value_validity(input: BoolValue, unknown_valid: bool) -> CheckOutcome {
    let mut unresolved_flavor: i32 = 0;
    if let BoolValue::Unknown = input { unresolved_flavor = 1; };
    if let BoolValue::Unimplemented = input { unresolved_flavor = 2; };
    if let BoolValue::Error(error) = input {
        return CheckOutcome::Error(error);
    };
    let mut condition_flavor_54_4: i32 = unresolved_flavor; if let BoolValue::Unknown = input { if condition_flavor_54_4 < 1 { condition_flavor_54_4 = 1; }; }; if let BoolValue::Unimplemented = input { condition_flavor_54_4 = 2; }; if (input == BoolValue::Unknown || input == BoolValue::Unimplemented) && unknown_valid == false {
        return check_unresolved(condition_flavor_54_4);
    };
    CheckOutcome::True
}

pub(crate) fn array_validity_finish(left: CheckOutcome, right: CheckOutcome) -> CheckOutcome {
    if left == CheckOutcome::Unknown && right == CheckOutcome::Unimplemented {
        return right;
    };
    if left == CheckOutcome::Unknown || left == CheckOutcome::Unimplemented {
        return left;
    };
    if let CheckOutcome::Error(_) = left {
        return left;
    };
    right
}

// Stopped validity replaces the result, except that a result the evaluator cannot produce
// outranks a validity that only waits on a database fact.
pub(crate) fn array_validity_result(validity: CheckOutcome, result: CheckOutcome) -> CheckOutcome {
    if validity == CheckOutcome::Unknown && result == CheckOutcome::Unimplemented {
        return result;
    };
    if case_guard_stops(validity) {
        return validity;
    };
    result
}

pub fn text_number(value: i32, base: i32) -> String {
    let digits: Vec<char> = "0123456789abcdef".chars().collect();
    let mut reversed: Vec<char> = Vec::new();
    let mut remaining = value;
    if remaining == 0 {
        reversed.push('0');
    }
    while remaining > 0 {
        let mut digit = remaining % base;
        let mut index: usize = 0;
        while digit > 0 {
            index += 1;
            digit = digit - 1;
        }
        reversed.push(digits[index]);
        remaining = remaining / base;
    }
    let mut output = String::new();
    let mut position = reversed.len();
    while position > 0 {
        position = position - 1;
        output.push(reversed[position]);
    }
    output
}

pub fn text_signed_number(value: i64) -> String {
    let digits: Vec<char> = "0123456789".chars().collect();
    let mut reversed: Vec<char> = Vec::new();
    let mut remaining = value;
    if remaining > 0i64 {
        remaining = 0i64 - remaining;
    }
    if remaining == 0i64 {
        reversed.push('0');
    }
    while remaining < 0i64 {
        let mut digit = 0i64 - (remaining % 10i64);
        let mut index: usize = 0;
        while digit > 0i64 {
            index += 1;
            digit = digit - 1i64;
        }
        reversed.push(digits[index]);
        remaining = remaining / 10i64;
    }
    let mut output = String::new();
    if value < 0i64 {
        output.push('-');
    }
    let mut position = reversed.len();
    while position > 0 {
        position = position - 1;
        output.push(reversed[position]);
    }
    output
}

pub fn or_finish(left: CheckOutcome, right: CheckOutcome) -> CheckOutcome {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = left { unresolved_flavor = 1; };
    if let CheckOutcome::Unknown = right { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = left { unresolved_flavor = 2; };
    if let CheckOutcome::Unimplemented = right { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = left {
        return CheckOutcome::Error(error);
    }
    if let CheckOutcome::Error(error) = right {
        return CheckOutcome::Error(error);
    }
    if left == CheckOutcome::True || right == CheckOutcome::True {
        return CheckOutcome::True;
    }
    let mut condition_flavor_60_4: i32 = unresolved_flavor; if let CheckOutcome::Unknown = left { if condition_flavor_60_4 < 1 { condition_flavor_60_4 = 1; }; }; if let CheckOutcome::Unimplemented = left { condition_flavor_60_4 = 2; }; if let CheckOutcome::Unknown = right { if condition_flavor_60_4 < 1 { condition_flavor_60_4 = 1; }; }; if let CheckOutcome::Unimplemented = right { condition_flavor_60_4 = 2; }; if (left == CheckOutcome::Unknown || left == CheckOutcome::Unimplemented) || (right == CheckOutcome::Unknown || right == CheckOutcome::Unimplemented) {
        return check_unresolved(condition_flavor_60_4);
    }
    if left == CheckOutcome::Null || right == CheckOutcome::Null {
        return CheckOutcome::Null;
    }
    CheckOutcome::False
}

pub fn case_guard_stops(value: CheckOutcome) -> bool {
    if value == CheckOutcome::Unknown || value == CheckOutcome::Unimplemented {
        return true;
    }
    if let CheckOutcome::Error(_) = value {
        return true;
    }
    false
}

pub fn case_guard_takes(value: CheckOutcome) -> bool {
    value == CheckOutcome::True
}
