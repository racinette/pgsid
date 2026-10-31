#[derive(Clone, Copy, PartialEq, Eq)]
pub enum Int2Value {
    Unknown,
    Unimplemented,
    Null,
    Value(i32),
    Error(SqlError),
}

pub fn int2_unknown() -> Int2Value { Int2Value::Unknown }

pub fn int2_null() -> Int2Value {
    Int2Value::Null
}

pub fn make_int2_value(value: i32) -> Int2Value {
    let unresolved_flavor: i32 = 0;
    if value < -32768 || value > 32767 {
        return int2_unresolved(unresolved_flavor);
    }
    Int2Value::Value(value)
}

pub fn int2_is_null(value: Int2Value) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int2Value::Unknown = value { unresolved_flavor = 1; };
    if let Int2Value::Unimplemented = value { unresolved_flavor = 2; };
    if let Int2Value::Error(error) = value {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_31_4: i32 = unresolved_flavor; if let Int2Value::Unknown = value { if condition_flavor_31_4 < 1 { condition_flavor_31_4 = 1; }; }; if let Int2Value::Unimplemented = value { condition_flavor_31_4 = 2; }; if (value == Int2Value::Unknown || value == Int2Value::Unimplemented) {
        return bool_unresolved(condition_flavor_31_4);
    }
    BoolValue::Value(value == Int2Value::Null)
}

pub fn int2_from_case_guard(value: CheckOutcome) -> Int2Value {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = value { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = value { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = value {
        return Int2Value::Error(error);
    }
    int2_unresolved(unresolved_flavor)
}

pub fn int2_to_int4(value: Int2Value) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let Int2Value::Unknown = value { unresolved_flavor = 1; };
    if let Int2Value::Unimplemented = value { unresolved_flavor = 2; };
    if let Int2Value::Error(error) = value {
        return Int4Value::Error(error);
    }
    if value == Int2Value::Null {
        return Int4Value::Null;
    }
    if let Int2Value::Value(number) = value {
        return Int4Value::Value(number);
    }
    int4_unresolved(unresolved_flavor)
}

pub fn int2_to_int8(value: Int2Value) -> Int8Value {
    let mut unresolved_flavor: i32 = 0;
    if let Int2Value::Unknown = value { unresolved_flavor = 1; };
    if let Int2Value::Unimplemented = value { unresolved_flavor = 2; };
    if let Int2Value::Error(error) = value {
        return Int8Value::Error(error);
    }
    if value == Int2Value::Null {
        return Int8Value::Null;
    }
    if let Int2Value::Value(number) = value {
        let widened = number as i64;
        return Int8Value::Value(widened);
    }
    int8_unresolved(unresolved_flavor)
}

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

const TIMESTAMP_FIELD_OVERFLOW: u32 = 3452552;

fn timestamp_microseconds_valid(value: i64) -> bool {
    value == -9223372036854775808i64
        || value == 9223372036854775807i64
        || (value >= -211813488000000000i64 && value < 9223371331200000000i64)
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum TimestampValue {
    Unknown,
    Unimplemented,
    Null,
    Value(i64),
    Error(SqlError),
}

pub fn timestamp_unknown() -> TimestampValue { TimestampValue::Unknown }

pub fn timestamp_null() -> TimestampValue {
    TimestampValue::Null
}

pub fn make_timestamp_value(value: i64) -> TimestampValue {
    if timestamp_microseconds_valid(value) == false {
        return TimestampValue::Error(SqlError {
            state: TIMESTAMP_FIELD_OVERFLOW,
        });
    }
    TimestampValue::Value(value)
}

pub fn make_stored_timestamp_value(value: i64) -> TimestampValue {
    if value >= -211814092800000000i64 && value <= 9223371331200000000i64 {
        return TimestampValue::Value(value);
    };
    make_timestamp_value(value)
}

pub fn timestamp_is_null(value: TimestampValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestampValue::Unknown = value { unresolved_flavor = 1; };
    if let TimestampValue::Unimplemented = value { unresolved_flavor = 2; };
    if let TimestampValue::Error(error) = value {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_144_4: i32 = unresolved_flavor; if let TimestampValue::Unknown = value { if condition_flavor_144_4 < 1 { condition_flavor_144_4 = 1; }; }; if let TimestampValue::Unimplemented = value { condition_flavor_144_4 = 2; }; if (value == TimestampValue::Unknown || value == TimestampValue::Unimplemented) {
        return bool_unresolved(condition_flavor_144_4);
    }
    BoolValue::Value(value == TimestampValue::Null)
}

pub fn timestamp_from_case_guard(value: CheckOutcome) -> TimestampValue {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = value { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = value { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = value {
        return TimestampValue::Error(error);
    }
    timestamp_unresolved(unresolved_flavor)
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum TimestamptzValue {
    Unknown,
    Unimplemented,
    Null,
    Value(i64),
    Error(SqlError),
}

pub fn timestamptz_unknown() -> TimestamptzValue { TimestamptzValue::Unknown }

pub fn timestamptz_null() -> TimestamptzValue {
    TimestamptzValue::Null
}

pub fn make_timestamptz_value(value: i64) -> TimestamptzValue {
    if timestamp_microseconds_valid(value) == false {
        return TimestamptzValue::Error(SqlError {
            state: TIMESTAMP_FIELD_OVERFLOW,
        });
    }
    TimestamptzValue::Value(value)
}

pub fn make_stored_timestamptz_value(value: i64) -> TimestamptzValue {
    if value == 9223371331200000000i64 {
        return TimestamptzValue::Value(value);
    };
    make_timestamptz_value(value)
}

pub fn timestamptz_is_null(value: TimestamptzValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimestamptzValue::Unknown = value { unresolved_flavor = 1; };
    if let TimestamptzValue::Unimplemented = value { unresolved_flavor = 2; };
    if let TimestamptzValue::Error(error) = value {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_198_4: i32 = unresolved_flavor; if let TimestamptzValue::Unknown = value { if condition_flavor_198_4 < 1 { condition_flavor_198_4 = 1; }; }; if let TimestamptzValue::Unimplemented = value { condition_flavor_198_4 = 2; }; if (value == TimestamptzValue::Unknown || value == TimestamptzValue::Unimplemented) {
        return bool_unresolved(condition_flavor_198_4);
    }
    BoolValue::Value(value == TimestamptzValue::Null)
}

pub fn timestamptz_from_case_guard(value: CheckOutcome) -> TimestamptzValue {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = value { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = value { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = value {
        return TimestamptzValue::Error(error);
    }
    timestamptz_unresolved(unresolved_flavor)
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub struct EnumPayload {
    pub ordinal: i32,
    pub label_oid: i64,
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum EnumValue {
    Unknown,
    Unimplemented,
    Null,
    Value(EnumPayload),
    Error(SqlError),
}

pub fn enum_unknown() -> EnumValue { EnumValue::Unknown }

pub fn enum_null() -> EnumValue {
    EnumValue::Null
}

pub fn make_enum_value(value: i32) -> EnumValue {
    EnumValue::Value(EnumPayload {
        ordinal: value,
        label_oid: 0i64,
    })
}

pub fn make_catalog_enum_value(ordinal: i32, label_oid: i64) -> EnumValue {
    let unresolved_flavor: i32 = 0;
    if ordinal < 0 || label_oid < 1i64 || label_oid > 4294967295i64 {
        return enum_unresolved(unresolved_flavor);
    }
    EnumValue::Value(EnumPayload { ordinal, label_oid })
}

pub fn enum_is_null(value: EnumValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let EnumValue::Unknown = value { unresolved_flavor = 1; };
    if let EnumValue::Unimplemented = value { unresolved_flavor = 2; };
    if let EnumValue::Error(error) = value {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_257_4: i32 = unresolved_flavor; if let EnumValue::Unknown = value { if condition_flavor_257_4 < 1 { condition_flavor_257_4 = 1; }; }; if let EnumValue::Unimplemented = value { condition_flavor_257_4 = 2; }; if (value == EnumValue::Unknown || value == EnumValue::Unimplemented) {
        return bool_unresolved(condition_flavor_257_4);
    }
    BoolValue::Value(value == EnumValue::Null)
}

pub fn enum_from_case_guard(value: CheckOutcome) -> EnumValue {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = value { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = value { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = value {
        return EnumValue::Error(error);
    }
    enum_unresolved(unresolved_flavor)
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum DateValue {
    Unknown,
    Unimplemented,
    Null,
    Value(i32),
    Error(SqlError),
}

pub fn date_unknown() -> DateValue { DateValue::Unknown }

pub fn date_null() -> DateValue {
    DateValue::Null
}

pub fn make_date_value(value: i32) -> DateValue {
    if value != -2147483647 - 1 && value != 2147483647 {
        if value < -2451545 || value >= 2145031949 {
            return DateValue::Error(SqlError {
                state: DATE_FIELD_OVERFLOW,
            });
        }
    }
    DateValue::Value(value)
}

pub fn make_stored_date_value(value: i32) -> DateValue {
    if value >= -2451552 && value < -2451545 {
        return DateValue::Value(value);
    };
    make_date_value(value)
}

pub fn date_is_null(value: DateValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let DateValue::Unknown = value { unresolved_flavor = 1; };
    if let DateValue::Unimplemented = value { unresolved_flavor = 2; };
    if let DateValue::Error(error) = value {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_313_4: i32 = unresolved_flavor; if let DateValue::Unknown = value { if condition_flavor_313_4 < 1 { condition_flavor_313_4 = 1; }; }; if let DateValue::Unimplemented = value { condition_flavor_313_4 = 2; }; if (value == DateValue::Unknown || value == DateValue::Unimplemented) {
        return bool_unresolved(condition_flavor_313_4);
    }
    BoolValue::Value(value == DateValue::Null)
}

pub fn date_from_case_guard(value: CheckOutcome) -> DateValue {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = value { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = value { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = value {
        return DateValue::Error(error);
    }
    date_unresolved(unresolved_flavor)
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

#[derive(Clone, Copy)]
pub struct XmlKnowledge {
    pub document: BoolValue,
    pub content: BoolValue,
}

#[derive(Clone)]
pub enum XmlValue {
    Unknown,
    Unimplemented,
    Null,
    Value(String),
    RenderedText(String),
    Error(SqlError),
    NonNull(XmlKnowledge),
}

#[derive(Clone)]
pub struct XmlConcatState {
    pub status: CheckOutcome,
    pub has_value: bool,
    pub version: String,
    pub version_consistent: bool,
    pub standalone: i32,
    pub body: String,
}

pub fn xml_unknown() -> XmlValue { XmlValue::Unknown }

pub fn xml_null() -> XmlValue {
    XmlValue::Null
}

pub fn make_xml_value(source: &str) -> XmlValue {
    let unresolved_flavor: i32 = 0;
    let characters: Vec<char> = source.chars().collect();
    let mut index: usize = 0;
    while index < characters.len() {
        if characters[index] == '\0' {
            return xml_unresolved(unresolved_flavor);
        };
        index += 1;
    }
    XmlValue::Value(source.to_owned())
}

pub fn xml_from_rendered_text(input: TextValue) -> XmlValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = input { unresolved_flavor = 1; };
    if let TextValue::Unimplemented = input { unresolved_flavor = 2; };
    if let TextValue::Error(error) = input { return XmlValue::Error(error); };
    if let TextValue::Null = input { return XmlValue::Null; };
    if let TextValue::Value(value) = input {
        let checked = make_xml_value(value.as_str());
        if let XmlValue::Value(source) = checked { return XmlValue::RenderedText(source); };
    };
    xml_unresolved(unresolved_flavor)
}

pub fn make_xml_knowledge(document: BoolValue, content: BoolValue) -> XmlValue {
    let mut unresolved_flavor: i32 = 0;
    if let BoolValue::Unknown = document { unresolved_flavor = 1; };
    if let BoolValue::Unknown = content { unresolved_flavor = 1; };
    if let BoolValue::Unimplemented = document { unresolved_flavor = 2; };
    if let BoolValue::Unimplemented = content { unresolved_flavor = 2; };
    let mut valid_document = (document == BoolValue::Unknown || document == BoolValue::Unimplemented);
    let mut valid_content = (content == BoolValue::Unknown || content == BoolValue::Unimplemented);
    if let BoolValue::Value(_) = document { valid_document = true; };
    if let BoolValue::Value(_) = content { valid_content = true; };
    if valid_document == false || valid_content == false { return xml_unresolved(unresolved_flavor); };
    if document == BoolValue::Value(true) && content == BoolValue::Value(false) { return xml_unresolved(unresolved_flavor); };
    let mut actual_document = document;
    let mut actual_content = content;
    if document == BoolValue::Value(true) { actual_content = BoolValue::Value(true); };
    if content == BoolValue::Value(false) { actual_document = BoolValue::Value(false); };
    XmlValue::NonNull(XmlKnowledge { document: actual_document, content: actual_content })
}

pub fn make_xml_non_null(document: BoolValue) -> XmlValue {
    make_xml_knowledge(document,BoolValue::Unknown)
}

pub fn xml_is_null(input: XmlValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let XmlValue::Unknown = input { unresolved_flavor = 1; };
    if let XmlValue::Unimplemented = input { unresolved_flavor = 2; };
    if let XmlValue::NonNull(knowledge) = input {
        let checked = make_xml_knowledge(knowledge.document,knowledge.content);
        let mut condition_flavor_427_8: i32 = unresolved_flavor; if let XmlValue::Unknown = checked { if condition_flavor_427_8 < 1 { condition_flavor_427_8 = 1; }; }; if let XmlValue::Unknown = checked { return bool_unresolved(condition_flavor_427_8); }; let mut condition_flavor_427_91: i32 = unresolved_flavor; if let XmlValue::Unimplemented = checked { condition_flavor_427_91 = 2; }; if let XmlValue::Unimplemented = checked { return bool_unresolved(condition_flavor_427_91); };
    };
    if let XmlValue::Error(error) = input { return BoolValue::Error(error); };
    let mut condition_flavor_430_4: i32 = unresolved_flavor; if let XmlValue::Unknown = input { if condition_flavor_430_4 < 1 { condition_flavor_430_4 = 1; }; }; if let XmlValue::Unknown = input { return bool_unresolved(condition_flavor_430_4); }; let mut condition_flavor_430_85: i32 = unresolved_flavor; if let XmlValue::Unimplemented = input { condition_flavor_430_85 = 2; }; if let XmlValue::Unimplemented = input { return bool_unresolved(condition_flavor_430_85); };
    if let XmlValue::Null = input { return BoolValue::Value(true); };
    BoolValue::Value(false)
}

pub fn xml_from_case_guard(input: CheckOutcome) -> XmlValue {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = input { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = input { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = input { return XmlValue::Error(error); };
    if let CheckOutcome::Null = input { return XmlValue::Null; };
    xml_unresolved(unresolved_flavor)
}

pub fn int4_unknown() -> Int4Value { Int4Value::Unknown }

pub fn int4_null() -> Int4Value {
    Int4Value::Null
}

pub fn make_int4_value(value: i32) -> Int4Value {
    Int4Value::Value(value)
}

pub fn int8_unknown() -> Int8Value { Int8Value::Unknown }

pub fn int8_null() -> Int8Value {
    Int8Value::Null
}

pub fn make_int8_value(value: i64) -> Int8Value {
    Int8Value::Value(value)
}

pub fn text_unknown() -> TextValue { TextValue::Unknown }

pub fn text_null() -> TextValue {
    TextValue::Null
}

pub fn make_name_text_value(value: &str) -> TextValue {
    let unresolved_flavor: i32 = 0;
    let chars: Vec<char> = value.chars().collect();
    let mut index: usize = 0;
    while index < chars.len() {
        let code = chars[index] as i32;
        if code == 0 || (code >= 55296 && code <= 57343) {
            return text_unresolved(unresolved_flavor);
        };
        index += 1;
    }
    TextValue::Value(value.to_owned())
}

pub fn make_refcursor_text_value(value: &str) -> TextValue {
    make_name_text_value(value)
}

pub fn make_text_value(value: &str) -> TextValue {
    TextValue::Value(value.to_owned())
}

pub fn bool_unknown() -> BoolValue { BoolValue::Unknown }

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

#[derive(Clone, Copy)]
pub struct CheckEvaluationResult { pub outcome: CheckOutcome, pub reason: i32 }

pub fn make_check_evaluation_result(outcome: CheckOutcome, reason: i32) -> CheckEvaluationResult { CheckEvaluationResult {outcome,reason} }
pub fn check_evaluation_outcome(input: CheckEvaluationResult) -> CheckOutcome { input.outcome }
pub fn check_evaluation_reason(input: CheckEvaluationResult) -> Int4Value { Int4Value::Value(input.reason) }
pub fn check_requirement_code(input: i32) -> i32 { input }

pub fn check_requirement_merge(left: i32, right: i32) -> i32 {
    if left < 0 || right < 0 || left > 511 || right > 511 { return -1; };
    let mut a = left; let mut b = right; let mut weight: i32 = 1; let mut output: i32 = 0;
    while a > 0 || b > 0 {
        if a%2 != 0 || b%2 != 0 { output = output+weight; };
        a = a/2; b = b/2; weight = weight*2;
    }
    output
}

pub fn check_requirement_filter(nullness: BoolValue, reason: i32, partial: bool) -> i32 {
    if (nullness == BoolValue::Unknown || nullness == BoolValue::Unimplemented) {
        if reason > 0 { return reason; }; return -1;
    };
    if partial && nullness == BoolValue::Value(false) { return reason; };
    0
}

pub fn check_text_requirement(input: TextValue, reason: i32) -> i32 {
    if input == TextValue::NonNull { if reason > 0 { return reason; }; return -1; };
    let nullness = text_is_null(input);
    check_requirement_filter(nullness,reason,false)
}

pub fn check_xml_requirement(input: XmlValue, reason: i32) -> i32 {
    if let XmlValue::RenderedText(_) = input { return -1; };
    if let XmlValue::NonNull(_) = input { if reason > 0 { return reason; }; return -1; };
    let nullness = xml_is_null(input);
    check_requirement_filter(nullness,reason,false)
}

pub fn check_requirement_for_outcome(input: CheckOutcome, reason: i32) -> i32 {
    if (input == CheckOutcome::Unknown || input == CheckOutcome::Unimplemented) { return reason; };
    0
}

// A diagnostic text, not a CHECK value: Unknown here only means there is no message.
pub fn check_requirement_message(reason: i32) -> TextValue {
    if reason <= 0 || reason > 511 { return TextValue::Unknown; };
    let mut output = String::new();
    if (reason/1)%2 != 0 { output.push_str("XPath decimal conversion needs sql.codegen.checks.xpathPowerOfTenBits captured from the target PostgreSQL. "); };
    if (reason/2)%2 != 0 { output.push_str("XPath evaluation reaches a cyclic XML traversal that cannot be completed locally. "); };
    if (reason/4)%2 != 0 { output.push_str("The reached XPath operation or XML serialization is not implemented by the local evaluator. "); };
    if (reason/8)%2 != 0 { output.push_str("XPath evaluation needs sql.codegen.checks.xpathRecursionLimit for the target PostgreSQL XML library. "); };
    if (reason/16)%2 != 0 { output.push_str("XPath numeric XML output needs sql.codegen.checks.extraFloatDigits matching the PostgreSQL session. "); };
    if (reason/32)%2 != 0 { output.push_str("XPath document serialization depends on unavailable native XML notation ordering. "); };
    if (reason/64)%2 != 0 { output.push_str("XPath evaluation needs sql.codegen.checks.serverEncoding: UTF8. "); };
    if (reason/128)%2 != 0 { output.push_str("XPath evaluation needs the original XML storage bytes for this rendered value. "); };
    if (reason/256)%2 != 0 { output.push_str("XPath evaluation needs complete namespace mapping values. "); };
    if output.as_str() == "" { return TextValue::Unknown; };
    TextValue::Value(output)
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
    let mut condition_flavor_848_4: i32 = unresolved_flavor; if let BoolValue::Unknown = value { if condition_flavor_848_4 < 1 { condition_flavor_848_4 = 1; }; }; if let BoolValue::Unimplemented = value { condition_flavor_848_4 = 2; }; if (value == BoolValue::Unknown || value == BoolValue::Unimplemented) {
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

pub fn check_unknown() -> CheckOutcome { CheckOutcome::Unknown }

pub fn int4_is_null(value: Int4Value) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Int4Value::Unknown = value { unresolved_flavor = 1; };
    if let Int4Value::Unimplemented = value { unresolved_flavor = 2; };
    if let Int4Value::Error(error) = value {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_869_4: i32 = unresolved_flavor; if let Int4Value::Unknown = value { if condition_flavor_869_4 < 1 { condition_flavor_869_4 = 1; }; }; if let Int4Value::Unimplemented = value { condition_flavor_869_4 = 2; }; if (value == Int4Value::Unknown || value == Int4Value::Unimplemented) {
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
    let mut condition_flavor_882_4: i32 = unresolved_flavor; if let Int8Value::Unknown = value { if condition_flavor_882_4 < 1 { condition_flavor_882_4 = 1; }; }; if let Int8Value::Unimplemented = value { condition_flavor_882_4 = 2; }; if (value == Int8Value::Unknown || value == Int8Value::Unimplemented) {
        return bool_unresolved(condition_flavor_882_4);
    }
    BoolValue::Value(value == Int8Value::Null)
}

pub fn text_is_null(value: TextValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = value { unresolved_flavor = 1; };
    if let TextValue::Unimplemented = value { unresolved_flavor = 2; };
    if let TextValue::Error(error) = value {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_895_4: i32 = unresolved_flavor; if let TextValue::Unknown = value { if condition_flavor_895_4 < 1 { condition_flavor_895_4 = 1; }; }; if let TextValue::Unimplemented = value { condition_flavor_895_4 = 2; }; if (value == TextValue::Unknown || value == TextValue::Unimplemented) {
        return bool_unresolved(condition_flavor_895_4);
    }
    BoolValue::Value(value == TextValue::Null)
}

pub fn bool_is_null(value: BoolValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let BoolValue::Unknown = value { unresolved_flavor = 1; };
    if let BoolValue::Unimplemented = value { unresolved_flavor = 2; };
    if let BoolValue::Error(error) = value {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_908_4: i32 = unresolved_flavor; if let BoolValue::Unknown = value { if condition_flavor_908_4 < 1 { condition_flavor_908_4 = 1; }; }; if let BoolValue::Unimplemented = value { condition_flavor_908_4 = 2; }; if (value == BoolValue::Unknown || value == BoolValue::Unimplemented) {
        return bool_unresolved(condition_flavor_908_4);
    }
    BoolValue::Value(value == BoolValue::Null)
}

pub fn bool_not_value(value: BoolValue) -> BoolValue {
    if let BoolValue::Value(result) = value {
        if result {
            return BoolValue::Value(false);
        }
        return BoolValue::Value(true);
    }
    value
}

pub fn bool_from_check(value: CheckOutcome) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = value { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = value { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = value {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_931_4: i32 = unresolved_flavor; if let CheckOutcome::Unknown = value { if condition_flavor_931_4 < 1 { condition_flavor_931_4 = 1; }; }; if let CheckOutcome::Unimplemented = value { condition_flavor_931_4 = 2; }; if (value == CheckOutcome::Unknown || value == CheckOutcome::Unimplemented) {
        return bool_unresolved(condition_flavor_931_4);
    }
    if value == CheckOutcome::Null {
        return BoolValue::Null;
    }
    BoolValue::Value(value == CheckOutcome::True)
}

pub fn int4_from_case_guard(value: CheckOutcome) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = value { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = value { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = value {
        return Int4Value::Error(error);
    }
    int4_unresolved(unresolved_flavor)
}

pub fn int8_from_case_guard(value: CheckOutcome) -> Int8Value {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = value { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = value { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = value {
        return Int8Value::Error(error);
    }
    int8_unresolved(unresolved_flavor)
}

pub fn text_from_case_guard(value: CheckOutcome) -> TextValue {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = value { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = value { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = value {
        return TextValue::Error(error);
    }
    text_unresolved(unresolved_flavor)
}

#[derive(Clone, PartialEq, Eq)]
pub enum NumericValue {
    Unknown,
    Unimplemented,
    Null,
    Value(String),
    Error(SqlError),
}

pub fn numeric_unknown() -> NumericValue { NumericValue::Unknown }

pub fn numeric_null() -> NumericValue {
    NumericValue::Null
}

pub fn numeric_is_null(value: NumericValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = value { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = value { unresolved_flavor = 2; };
    if let NumericValue::Error(error) = value {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_992_4: i32 = unresolved_flavor; if let NumericValue::Unknown = value { if condition_flavor_992_4 < 1 { condition_flavor_992_4 = 1; }; }; if let NumericValue::Unimplemented = value { condition_flavor_992_4 = 2; }; if (value == NumericValue::Unknown || value == NumericValue::Unimplemented) {
        return bool_unresolved(condition_flavor_992_4);
    }
    BoolValue::Value(value == NumericValue::Null)
}

pub fn numeric_from_case_guard(value: CheckOutcome) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = value { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = value { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = value {
        return NumericValue::Error(error);
    }
    numeric_unresolved(unresolved_flavor)
}

pub fn make_numeric_value(value: &str) -> NumericValue {
    let unresolved_flavor: i32 = 0;
    let parts = numeric_parts(value);
    if parts.valid == false {
        return numeric_unresolved(unresolved_flavor);
    }
    NumericValue::Value(value.to_owned())
}

#[derive(Clone)]
pub struct JsonPayload {
    pub source: String,
    pub kind: i32,
    pub depth: usize,
}

#[derive(Clone)]
pub enum JsonValue {
    Unknown,
    Unimplemented,
    NonNull,
    Null,
    Value(JsonPayload),
    Error(SqlError),
}

pub fn json_unknown() -> JsonValue { JsonValue::Unknown }

pub fn json_null() -> JsonValue {
    JsonValue::Null
}

pub fn make_json_value(source: &str) -> JsonValue {
    let unresolved_flavor: i32 = 0;
    let syntax = json_syntax_scan(source);
    if syntax.valid == false {
        return json_unresolved(unresolved_flavor);
    };
    JsonValue::Value(JsonPayload {
        source: source.to_owned(),
        kind: syntax.kind,
        depth: syntax.max_depth,
    })
}

pub fn json_from_coerced_text(input: TextValue) -> JsonValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = input { unresolved_flavor = 1; };
    if let TextValue::Unimplemented = input { unresolved_flavor = 2; };
    if let TextValue::Error(error) = input {
        return JsonValue::Error(error);
    };
    if let TextValue::Null = input {
        return JsonValue::Null;
    };
    if let TextValue::Value(value) = input {
        return make_json_value(value.as_str());
    };
    json_unresolved(unresolved_flavor)
}

pub fn json_is_null(input: JsonValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let JsonValue::Unknown = input { unresolved_flavor = 1; };
    if let JsonValue::Unimplemented = input { unresolved_flavor = 2; };
    if let JsonValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_1076_4: i32 = unresolved_flavor; if let JsonValue::Unknown = input { if condition_flavor_1076_4 < 1 { condition_flavor_1076_4 = 1; }; }; if let JsonValue::Unknown = input {
        return bool_unresolved(condition_flavor_1076_4);
    }; let mut condition_flavor_1078_7: i32 = unresolved_flavor; if let JsonValue::Unimplemented = input { condition_flavor_1078_7 = 2; }; if let JsonValue::Unimplemented = input {
        return bool_unresolved(condition_flavor_1078_7);
    };
    if let JsonValue::Null = input {
        return BoolValue::Value(true);
    };
    BoolValue::Value(false)
}

pub fn json_from_case_guard(value: CheckOutcome) -> JsonValue {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = value { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = value { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = value {
        return JsonValue::Error(error);
    };
    json_unresolved(unresolved_flavor)
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

#[derive(Clone)]
pub enum JsonbInput {
    Unknown,
    Unimplemented,
    ScalarUnknown(String),
    JsonNonNull,
    JsonbNonNull(JsonbKnowledge),
    Null,
    Error(SqlError),
    ConvertedError(SqlError),
    Boolean(bool),
    Number(String),
    Text(String),
    Json(JsonPayload),
    Jsonb(JsonbPayload),
}

#[derive(Clone)]
pub struct JsonRecordInputPayload {
    pub type_name: String,
    pub state: i32,
    pub error: SqlError,
    pub fields: Vec<ArrayElement>,
    pub values: Vec<JsonbInput>,
    pub position: usize,
}

#[derive(Clone)]
pub enum JsonRecordInputPlan {
    Value(JsonRecordInputPayload),
}

#[derive(Clone)]
pub struct JsonbArgumentPayload {
    pub values: Vec<JsonbInput>,
}

#[derive(Clone)]
pub enum JsonbArguments {
    Unknown,
    Unimplemented,
    Null,
    Error(SqlError),
    Values(JsonbArgumentPayload),
}

pub fn make_jsonb_arguments() -> JsonbArguments {
    let values: Vec<JsonbInput> = Vec::new();
    JsonbArguments::Values(JsonbArgumentPayload { values: values })
}

pub fn append_jsonb_argument(input: JsonbArguments, value: JsonbInput) -> JsonbArguments {
    if let JsonbArguments::Values(batch) = input {
        let mut values = batch.values;
        values.push(value);
        return JsonbArguments::Values(JsonbArgumentPayload { values: values });
    };
    input
}

pub fn jsonb_key_input_from_float4(input: Float4Value) -> JsonbInput {
    if let Float4Value::Value(bits) = input {
        if bits == -2147483647 - 1 {
            return JsonbInput::Number("-0".to_owned());
        };
    };
    jsonb_input_from_float4(input)
}

pub fn jsonb_key_input_from_float8(input: Float8Value) -> JsonbInput {
    if let Float8Value::Value(bits) = input {
        if bits == -9223372036854775808i64 {
            return JsonbInput::Number("-0".to_owned());
        };
    };
    jsonb_input_from_float8(input)
}

pub fn jsonb_input_from_bool(input: BoolValue) -> JsonbInput {
    if let BoolValue::Error(error) = input {
        return JsonbInput::Error(error);
    };
    if let BoolValue::Null = input {
        return JsonbInput::Null;
    };
    if let BoolValue::Value(value) = input {
        return JsonbInput::Boolean(value);
    };
    JsonbInput::ScalarUnknown("1110000".to_owned())
}

pub fn jsonb_input_from_numeric(input: NumericValue) -> JsonbInput {
    if let NumericValue::Error(error) = input {
        return JsonbInput::Error(error);
    };
    if let NumericValue::Null = input {
        return JsonbInput::Null;
    };
    if let NumericValue::Value(value) = input {
        return JsonbInput::Number(value);
    };
    JsonbInput::ScalarUnknown("1001000".to_owned())
}

pub fn jsonb_input_from_text(input: TextValue) -> JsonbInput {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = input { unresolved_flavor = 1; };
    if let TextValue::Unimplemented = input { unresolved_flavor = 2; };
    if let TextValue::Error(error) = input {
        return JsonbInput::Error(error);
    };
    if let TextValue::Null = input {
        return JsonbInput::Null;
    };
    if let TextValue::Value(value) = input {
        return JsonbInput::Text(value);
    };
    jsonb_input_unresolved(unresolved_flavor)
}

pub fn jsonb_input_from_json(input: JsonValue) -> JsonbInput {
    let mut unresolved_flavor: i32 = 0;
    if let JsonValue::Unknown = input { unresolved_flavor = 1; };
    if let JsonValue::Unimplemented = input { unresolved_flavor = 2; };
    if let JsonValue::Error(error) = input {
        return JsonbInput::Error(error);
    };
    if let JsonValue::NonNull = input {
        return JsonbInput::JsonNonNull;
    };
    if let JsonValue::Null = input {
        return JsonbInput::Null;
    };
    if let JsonValue::Value(value) = input {
        return JsonbInput::Json(value);
    };
    jsonb_input_unresolved(unresolved_flavor)
}

pub fn jsonb_input_from_jsonb(input: JsonbValue) -> JsonbInput {
    let mut unresolved_flavor: i32 = 0;
    if let JsonbValue::Unknown = input { unresolved_flavor = 1; };
    if let JsonbValue::Unimplemented = input { unresolved_flavor = 2; };
    if let JsonbValue::NonNull(maximum) = input {
        return JsonbInput::JsonbNonNull(maximum);
    };
    if let JsonbValue::Error(error) = input {
        return JsonbInput::Error(error);
    };
    if let JsonbValue::Null = input {
        return JsonbInput::Null;
    };
    if let JsonbValue::Value(value) = input {
        return JsonbInput::Jsonb(value);
    };
    jsonb_input_unresolved(unresolved_flavor)
}

fn jsonb_input_float(number: f64) -> JsonbInput {
    let unresolved_flavor: i32 = 0;
    if number != number {
        return JsonbInput::Number("NaN".to_owned());
    };
    let infinity = 1.0f64 / 0.0f64;
    if number == infinity {
        return JsonbInput::Number("Infinity".to_owned());
    };
    if number == 0.0f64 - infinity {
        return JsonbInput::Number("-Infinity".to_owned());
    };
    if number == 0.0f64 {
        return JsonbInput::Number("0".to_owned());
    };
    let absolute = number.abs();
    if absolute >= 1.0f64 && absolute <= 9.0f64 {
        let digit = absolute as i32;
        if (digit as f64) == absolute {
            let mut output = String::new();
            if number < 0.0f64 {
                output.push('-');
            };
            output.push(char::from_u32((digit + 48) as u32).unwrap_or('0'));
            return JsonbInput::Number(output);
        };
    };
    jsonb_input_unresolved(unresolved_flavor)
}

pub fn jsonb_input_from_float4(input: Float4Value) -> JsonbInput {
    let mut unresolved_flavor: i32 = 0;
    if let Float4Value::Unknown = input { unresolved_flavor = 1; };
    if let Float4Value::Unimplemented = input { unresolved_flavor = 2; };
    if let Float4Value::Error(error) = input {
        return JsonbInput::Error(error);
    };
    if input == Float4Value::Null {
        return JsonbInput::Null;
    };
    if input == Float4Value::UnspecifiedNan {
        return JsonbInput::Number("NaN".to_owned());
    };
    if let Float4Value::Value(bits) = input {
        let number = float4_number(bits);
        return jsonb_input_float(number);
    };
    jsonb_input_unresolved(unresolved_flavor)
}

pub fn jsonb_input_from_float8(input: Float8Value) -> JsonbInput {
    let mut unresolved_flavor: i32 = 0;
    if let Float8Value::Unknown = input { unresolved_flavor = 1; };
    if let Float8Value::Unimplemented = input { unresolved_flavor = 2; };
    if let Float8Value::Error(error) = input {
        return JsonbInput::Error(error);
    };
    if input == Float8Value::Null {
        return JsonbInput::Null;
    };
    if input == Float8Value::UnspecifiedNan {
        return JsonbInput::Number("NaN".to_owned());
    };
    if let Float8Value::Value(bits) = input {
        let number = float8_number(bits);
        return jsonb_input_float(number);
    };
    jsonb_input_unresolved(unresolved_flavor)
}

pub fn make_jsonb_value(source: &str) -> JsonbValue {
    let unresolved_flavor: i32 = 0;
    let parsed = jsonb_parse_text(TextValue::Value(source.to_owned()), false);
    if let JsonbValue::Error(_) = parsed {
        return jsonb_unresolved(unresolved_flavor);
    };
    parsed
}

pub fn jsonb_unknown() -> JsonbValue { JsonbValue::Unknown }

pub fn jsonb_null() -> JsonbValue {
    JsonbValue::Null
}

pub fn jsonb_from_case_guard(value: CheckOutcome) -> JsonbValue {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = value { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = value { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = value {
        return JsonbValue::Error(error);
    };
    jsonb_unresolved(unresolved_flavor)
}

pub fn jsonb_is_null(input: JsonbValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let JsonbValue::Unknown = input { unresolved_flavor = 1; };
    if let JsonbValue::Unimplemented = input { unresolved_flavor = 2; };
    if let JsonbValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_1396_4: i32 = unresolved_flavor; if let JsonbValue::Unknown = input { if condition_flavor_1396_4 < 1 { condition_flavor_1396_4 = 1; }; }; if let JsonbValue::Unknown = input {
        return bool_unresolved(condition_flavor_1396_4);
    }; let mut condition_flavor_1398_7: i32 = unresolved_flavor; if let JsonbValue::Unimplemented = input { condition_flavor_1398_7 = 2; }; if let JsonbValue::Unimplemented = input {
        return bool_unresolved(condition_flavor_1398_7);
    };
    if let JsonbValue::Null = input {
        return BoolValue::Value(true);
    };
    BoolValue::Value(false)
}

pub fn jsonb_from_coerced_value(input: JsonbValue) -> JsonbValue {
    let mut unresolved_flavor: i32 = 0;
    if let JsonbValue::Unknown = input { unresolved_flavor = 1; };
    if let JsonbValue::Unimplemented = input { unresolved_flavor = 2; };
    if let JsonbValue::Value(value) = input {
        if jsonb_input_valid(&value) == false {
            return jsonb_unresolved(unresolved_flavor);
        };
        let source = jsonb_render(JsonbValue::Value(value), false, false);
        if let TextValue::Value(text) = source {
            return make_jsonb_value(text.as_str());
        };
        return jsonb_unresolved(unresolved_flavor);
    };
    input
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub struct NetworkAddress {
    pub family: usize,
    pub prefix: i32,
    pub word0: i32,
    pub word1: i32,
    pub word2: i32,
    pub word3: i32,
    pub word4: i32,
    pub word5: i32,
    pub word6: i32,
    pub word7: i32,
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum NetworkValue {
    Unknown,
    Unimplemented,
    Null,
    Value(NetworkAddress),
    Error(SqlError),
}

pub fn network_unknown() -> NetworkValue { NetworkValue::Unknown }
pub fn network_null() -> NetworkValue {
    NetworkValue::Null
}
pub fn network_is_null(value: NetworkValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let NetworkValue::Unknown = value { unresolved_flavor = 1; };
    if let NetworkValue::Unimplemented = value { unresolved_flavor = 2; };
    if let NetworkValue::Error(error) = value {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_1458_4: i32 = unresolved_flavor; if let NetworkValue::Unknown = value { if condition_flavor_1458_4 < 1 { condition_flavor_1458_4 = 1; }; }; if let NetworkValue::Unimplemented = value { condition_flavor_1458_4 = 2; }; if (value == NetworkValue::Unknown || value == NetworkValue::Unimplemented) {
        return bool_unresolved(condition_flavor_1458_4);
    }
    BoolValue::Value(value == NetworkValue::Null)
}
pub fn network_from_case_guard(value: CheckOutcome) -> NetworkValue {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = value { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = value { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = value {
        return NetworkValue::Error(error);
    }
    network_unresolved(unresolved_flavor)
}

pub fn make_network_value(value: &str) -> NetworkValue {
    let unresolved_flavor: i32 = 0;
    let chars: Vec<char> = value.chars().collect();
    if chars.len() > 256 {
        return network_unresolved(unresolved_flavor);
    }
    let parsed = network_parse(value, false);
    if let NetworkValue::Error(_) = parsed {
        return network_unresolved(unresolved_flavor);
    }
    parsed
}
pub fn make_cidr_value(value: &str) -> NetworkValue {
    let unresolved_flavor: i32 = 0;
    let chars: Vec<char> = value.chars().collect();
    if chars.len() > 256 {
        return network_unresolved(unresolved_flavor);
    }
    let parsed = network_parse(value, true);
    if let NetworkValue::Error(_) = parsed {
        return network_unresolved(unresolved_flavor);
    }
    parsed
}

#[derive(Clone, PartialEq, Eq)]
pub enum BitValue {
    Unknown,
    Unimplemented,
    Null,
    Value(String),
    Error(SqlError),
}

pub fn bit_unknown() -> BitValue { BitValue::Unknown }
pub fn bit_null() -> BitValue {
    BitValue::Null
}
pub fn bit_is_null(value: BitValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let BitValue::Unknown = value { unresolved_flavor = 1; };
    if let BitValue::Unimplemented = value { unresolved_flavor = 2; };
    if let BitValue::Error(error) = value {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_1518_4: i32 = unresolved_flavor; if let BitValue::Unknown = value { if condition_flavor_1518_4 < 1 { condition_flavor_1518_4 = 1; }; }; if let BitValue::Unimplemented = value { condition_flavor_1518_4 = 2; }; if (value == BitValue::Unknown || value == BitValue::Unimplemented) {
        return bool_unresolved(condition_flavor_1518_4);
    }
    BoolValue::Value(value == BitValue::Null)
}
pub fn bit_from_case_guard(value: CheckOutcome) -> BitValue {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = value { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = value { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = value {
        return BitValue::Error(error);
    }
    bit_unresolved(unresolved_flavor)
}
pub fn make_bit_value(value: &str) -> BitValue {
    let unresolved_flavor: i32 = 0;
    let chars: Vec<char> = value.chars().collect();
    if chars.len() > 2147483640 {
        return bit_unresolved(unresolved_flavor);
    }
    let mut index: usize = 0;
    while index < chars.len() {
        if chars[index] != '0' && chars[index] != '1' {
            return bit_unresolved(unresolved_flavor);
        }
        index += 1;
    }
    BitValue::Value(value.to_owned())
}

#[derive(Clone, PartialEq, Eq)]
pub enum ByteaValue {
    Unknown,
    Unimplemented,
    Null,
    Value(String),
    Error(SqlError),
    Unspecified(i32),
}

pub fn bytea_unknown() -> ByteaValue { ByteaValue::Unknown }
pub fn bytea_null() -> ByteaValue {
    ByteaValue::Null
}
pub fn bytea_is_null(value: ByteaValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let ByteaValue::Unknown = value { unresolved_flavor = 1; };
    if let ByteaValue::Unimplemented = value { unresolved_flavor = 2; };
    if let ByteaValue::Error(error) = value {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_1569_4: i32 = unresolved_flavor; if let ByteaValue::Unknown = value { if condition_flavor_1569_4 < 1 { condition_flavor_1569_4 = 1; }; }; if let ByteaValue::Unimplemented = value { condition_flavor_1569_4 = 2; }; if (value == ByteaValue::Unknown || value == ByteaValue::Unimplemented) {
        return bool_unresolved(condition_flavor_1569_4);
    }
    BoolValue::Value(value == ByteaValue::Null)
}
pub fn bytea_from_case_guard(value: CheckOutcome) -> ByteaValue {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = value { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = value { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = value {
        return ByteaValue::Error(error);
    }
    bytea_unresolved(unresolved_flavor)
}
pub fn make_bytea_value(value: &str) -> ByteaValue {
    let unresolved_flavor: i32 = 0;
    let chars: Vec<char> = value.chars().collect();
    let mut even = true;
    let mut output = String::new();
    let mut index: usize = 0;
    while index < chars.len() {
        let character = chars[index].to_ascii_lowercase();
        let code = character as u32;
        if (code < 48 || code > 57) && (code < 97 || code > 102) {
            return bytea_unresolved(unresolved_flavor);
        }
        output.push(character);
        even = even == false;
        index += 1;
    }
    if even == false {
        return bytea_unresolved(unresolved_flavor);
    }
    ByteaValue::Value(output)
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub struct MacAddress {
    pub word0: i32,
    pub word1: i32,
    pub word2: i32,
    pub word3: i32,
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum MacaddrValue {
    Unknown,
    Unimplemented,
    Null,
    Value(MacAddress),
    Error(SqlError),
}

pub fn macaddr_unknown() -> MacaddrValue { MacaddrValue::Unknown }
pub fn macaddr_null() -> MacaddrValue {
    MacaddrValue::Null
}
pub fn macaddr_is_null(value: MacaddrValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let MacaddrValue::Unknown = value { unresolved_flavor = 1; };
    if let MacaddrValue::Unimplemented = value { unresolved_flavor = 2; };
    if let MacaddrValue::Error(error) = value {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_1633_4: i32 = unresolved_flavor; if let MacaddrValue::Unknown = value { if condition_flavor_1633_4 < 1 { condition_flavor_1633_4 = 1; }; }; if let MacaddrValue::Unimplemented = value { condition_flavor_1633_4 = 2; }; if (value == MacaddrValue::Unknown || value == MacaddrValue::Unimplemented) {
        return bool_unresolved(condition_flavor_1633_4);
    }
    BoolValue::Value(value == MacaddrValue::Null)
}
pub fn macaddr_from_case_guard(value: CheckOutcome) -> MacaddrValue {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = value { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = value { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = value {
        return MacaddrValue::Error(error);
    }
    macaddr_unresolved(unresolved_flavor)
}
pub fn make_macaddr_value(value: &str) -> MacaddrValue {
    let unresolved_flavor: i32 = 0;
    let chars: Vec<char> = value.chars().collect();
    if chars.len() > 256 {
        return macaddr_unresolved(unresolved_flavor);
    }
    let text = MacText { chars };
    let parsed = macaddr_parse(&text);
    if parsed.valid == false {
        return macaddr_unresolved(unresolved_flavor);
    }
    MacaddrValue::Value(parsed.address)
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum Macaddr8Value {
    Unknown,
    Unimplemented,
    Null,
    Value(MacAddress),
    Error(SqlError),
}

pub fn macaddr8_unknown() -> Macaddr8Value { Macaddr8Value::Unknown }
pub fn macaddr8_null() -> Macaddr8Value {
    Macaddr8Value::Null
}
pub fn macaddr8_is_null(value: Macaddr8Value) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Macaddr8Value::Unknown = value { unresolved_flavor = 1; };
    if let Macaddr8Value::Unimplemented = value { unresolved_flavor = 2; };
    if let Macaddr8Value::Error(error) = value {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_1681_4: i32 = unresolved_flavor; if let Macaddr8Value::Unknown = value { if condition_flavor_1681_4 < 1 { condition_flavor_1681_4 = 1; }; }; if let Macaddr8Value::Unimplemented = value { condition_flavor_1681_4 = 2; }; if (value == Macaddr8Value::Unknown || value == Macaddr8Value::Unimplemented) {
        return bool_unresolved(condition_flavor_1681_4);
    }
    BoolValue::Value(value == Macaddr8Value::Null)
}
pub fn macaddr8_from_case_guard(value: CheckOutcome) -> Macaddr8Value {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = value { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = value { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = value {
        return Macaddr8Value::Error(error);
    }
    macaddr8_unresolved(unresolved_flavor)
}
pub fn make_macaddr8_value(value: &str) -> Macaddr8Value {
    let unresolved_flavor: i32 = 0;
    let chars: Vec<char> = value.chars().collect();
    if chars.len() > 256 {
        return macaddr8_unresolved(unresolved_flavor);
    }
    let text = MacText { chars };
    let parsed = macaddr8_parse(&text);
    if parsed.valid == false {
        return macaddr8_unresolved(unresolved_flavor);
    }
    Macaddr8Value::Value(parsed.address)
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub struct Uuid {
    pub word0: i32,
    pub word1: i32,
    pub word2: i32,
    pub word3: i32,
    pub word4: i32,
    pub word5: i32,
    pub word6: i32,
    pub word7: i32,
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum UuidValue {
    Unknown,
    Unimplemented,
    Null,
    Value(Uuid),
    Error(SqlError),
}

pub fn uuid_unknown() -> UuidValue { UuidValue::Unknown }
pub fn uuid_null() -> UuidValue {
    UuidValue::Null
}
pub fn uuid_is_null(value: UuidValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let UuidValue::Unknown = value { unresolved_flavor = 1; };
    if let UuidValue::Unimplemented = value { unresolved_flavor = 2; };
    if let UuidValue::Error(error) = value {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_1741_4: i32 = unresolved_flavor; if let UuidValue::Unknown = value { if condition_flavor_1741_4 < 1 { condition_flavor_1741_4 = 1; }; }; if let UuidValue::Unimplemented = value { condition_flavor_1741_4 = 2; }; if (value == UuidValue::Unknown || value == UuidValue::Unimplemented) {
        return bool_unresolved(condition_flavor_1741_4);
    }
    BoolValue::Value(value == UuidValue::Null)
}
pub fn uuid_from_case_guard(value: CheckOutcome) -> UuidValue {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = value { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = value { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = value {
        return UuidValue::Error(error);
    }
    uuid_unresolved(unresolved_flavor)
}
pub fn make_uuid_value(value: &str) -> UuidValue {
    let unresolved_flavor: i32 = 0;
    let parsed = uuid_parse(value);
    if let UuidValue::Error(_) = parsed {
        return uuid_unresolved(unresolved_flavor);
    }
    parsed
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum Float4Value {
    Unknown,
    Unimplemented,
    Null,
    Value(i32),
    Error(SqlError),
    UnspecifiedNan,
}

pub fn make_float4_literal_bits(bits: i32) -> Float4Value {
    let number = f32::from_bits(bits as u32) as f64;
    if number != number {
        return Float4Value::UnspecifiedNan;
    };
    make_float4_bits(bits)
}

pub fn float4_unknown() -> Float4Value { Float4Value::Unknown }
pub fn float4_null() -> Float4Value {
    Float4Value::Null
}
pub fn make_float4_bits(bits: i32) -> Float4Value {
    Float4Value::Value(bits)
}

pub fn float4_number(bits: i32) -> f64 {
    f32::from_bits(bits as u32) as f64
}

pub fn make_float4_value(value: f64) -> Float4Value {
    let unresolved_flavor: i32 = 0;
    let bits = (value as f32).to_bits() as i32;
    let rounded = float4_number(bits);
    if value == value && rounded != value {
        return float4_unresolved(unresolved_flavor);
    }
    Float4Value::Value(bits)
}

pub fn float4_is_null(value: Float4Value) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Float4Value::Unknown = value { unresolved_flavor = 1; };
    if let Float4Value::Unimplemented = value { unresolved_flavor = 2; };
    if let Float4Value::Error(error) = value {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_1811_4: i32 = unresolved_flavor; if let Float4Value::Unknown = value { if condition_flavor_1811_4 < 1 { condition_flavor_1811_4 = 1; }; }; if let Float4Value::Unimplemented = value { condition_flavor_1811_4 = 2; }; if (value == Float4Value::Unknown || value == Float4Value::Unimplemented) {
        return bool_unresolved(condition_flavor_1811_4);
    }
    BoolValue::Value(value == Float4Value::Null)
}

pub fn float4_from_case_guard(value: CheckOutcome) -> Float4Value {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = value { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = value { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = value {
        return Float4Value::Error(error);
    }
    float4_unresolved(unresolved_flavor)
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum Float8Value {
    Unknown,
    Unimplemented,
    Null,
    Value(i64),
    Error(SqlError),
    UnspecifiedNan,
}

pub fn float8_semantic(input: Float8Value) -> Float8Value {
    if input == Float8Value::UnspecifiedNan {
        return make_float8_bits(9221120237041090560i64);
    };
    input
}

pub fn make_float8_literal_bits(bits: i64) -> Float8Value {
    let number = f64::from_bits(bits as u64);
    if number != number {
        return Float8Value::UnspecifiedNan;
    };
    make_float8_bits(bits)
}

pub fn float8_unknown() -> Float8Value { Float8Value::Unknown }
pub fn float8_null() -> Float8Value {
    Float8Value::Null
}
pub fn make_float8_bits(bits: i64) -> Float8Value {
    Float8Value::Value(bits)
}

pub fn float8_number(bits: i64) -> f64 {
    f64::from_bits(bits as u64)
}

pub fn make_float8_value(value: f64) -> Float8Value {
    let bits = value.to_bits() as i64;
    Float8Value::Value(bits)
}

pub fn float8_is_null(value: Float8Value) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Float8Value::Unknown = value { unresolved_flavor = 1; };
    if let Float8Value::Unimplemented = value { unresolved_flavor = 2; };
    if let Float8Value::Error(error) = value {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_1876_4: i32 = unresolved_flavor; if let Float8Value::Unknown = value { if condition_flavor_1876_4 < 1 { condition_flavor_1876_4 = 1; }; }; if let Float8Value::Unimplemented = value { condition_flavor_1876_4 = 2; }; if (value == Float8Value::Unknown || value == Float8Value::Unimplemented) {
        return bool_unresolved(condition_flavor_1876_4);
    }
    BoolValue::Value(value == Float8Value::Null)
}

pub fn float8_from_case_guard(value: CheckOutcome) -> Float8Value {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = value { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = value { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = value {
        return Float8Value::Error(error);
    }
    float8_unresolved(unresolved_flavor)
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum TimeValue {
    Unknown,
    Unimplemented,
    Null,
    Value(i64),
    Error(SqlError),
}

pub fn time_unknown() -> TimeValue { TimeValue::Unknown }
pub fn time_null() -> TimeValue {
    TimeValue::Null
}

pub fn make_time_value(time: i64) -> TimeValue {
    let unresolved_flavor: i32 = 0;
    if time < 0i64 || time > 86400000000i64 {
        return time_unresolved(unresolved_flavor);
    }
    TimeValue::Value(time)
}

pub fn time_is_null(input: TimeValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimeValue::Unknown = input { unresolved_flavor = 1; };
    if let TimeValue::Unimplemented = input { unresolved_flavor = 2; };
    if let TimeValue::Error(error) = input {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_1921_4: i32 = unresolved_flavor; if let TimeValue::Unknown = input { if condition_flavor_1921_4 < 1 { condition_flavor_1921_4 = 1; }; }; if let TimeValue::Unimplemented = input { condition_flavor_1921_4 = 2; }; if (input == TimeValue::Unknown || input == TimeValue::Unimplemented) {
        return bool_unresolved(condition_flavor_1921_4);
    }
    BoolValue::Value(input == TimeValue::Null)
}

pub fn time_from_case_guard(input: CheckOutcome) -> TimeValue {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = input { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = input { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = input {
        return TimeValue::Error(error);
    }
    time_unresolved(unresolved_flavor)
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub struct TimetzPayload {
    pub time: i64,
    pub zone: i32,
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum TimetzValue {
    Unknown,
    Unimplemented,
    Null,
    Value(TimetzPayload),
    Error(SqlError),
}

pub fn timetz_unknown() -> TimetzValue { TimetzValue::Unknown }
pub fn timetz_null() -> TimetzValue {
    TimetzValue::Null
}

pub fn make_timetz_value(time: i64, zone: i32) -> TimetzValue {
    let unresolved_flavor: i32 = 0;
    if time < 0i64 || time > 86400000000i64 {
        return timetz_unresolved(unresolved_flavor);
    }
    TimetzValue::Value(TimetzPayload {
        time: time,
        zone: zone,
    })
}

pub fn timetz_is_null(input: TimetzValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TimetzValue::Unknown = input { unresolved_flavor = 1; };
    if let TimetzValue::Unimplemented = input { unresolved_flavor = 2; };
    if let TimetzValue::Error(error) = input {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_1975_4: i32 = unresolved_flavor; if let TimetzValue::Unknown = input { if condition_flavor_1975_4 < 1 { condition_flavor_1975_4 = 1; }; }; if let TimetzValue::Unimplemented = input { condition_flavor_1975_4 = 2; }; if (input == TimetzValue::Unknown || input == TimetzValue::Unimplemented) {
        return bool_unresolved(condition_flavor_1975_4);
    }
    BoolValue::Value(input == TimetzValue::Null)
}

pub fn timetz_from_case_guard(input: CheckOutcome) -> TimetzValue {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = input { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = input { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = input {
        return TimetzValue::Error(error);
    }
    timetz_unresolved(unresolved_flavor)
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub struct IntervalPayload {
    pub months: i32,
    pub days: i32,
    pub time: i64,
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum IntervalValue {
    Unknown,
    Unimplemented,
    Null,
    Value(IntervalPayload),
    Error(SqlError),
}

pub fn interval_unknown() -> IntervalValue { IntervalValue::Unknown }
pub fn interval_null() -> IntervalValue {
    IntervalValue::Null
}

pub fn make_interval_value(months: i32, days: i32, time: i64) -> IntervalValue {
    IntervalValue::Value(IntervalPayload {
        months: months,
        days: days,
        time: time,
    })
}

pub fn interval_is_null(input: IntervalValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let IntervalValue::Unknown = input { unresolved_flavor = 1; };
    if let IntervalValue::Unimplemented = input { unresolved_flavor = 2; };
    if let IntervalValue::Error(error) = input {
        return BoolValue::Error(error);
    }
    let mut condition_flavor_2027_4: i32 = unresolved_flavor; if let IntervalValue::Unknown = input { if condition_flavor_2027_4 < 1 { condition_flavor_2027_4 = 1; }; }; if let IntervalValue::Unimplemented = input { condition_flavor_2027_4 = 2; }; if (input == IntervalValue::Unknown || input == IntervalValue::Unimplemented) {
        return bool_unresolved(condition_flavor_2027_4);
    }
    BoolValue::Value(input == IntervalValue::Null)
}

pub fn interval_from_case_guard(input: CheckOutcome) -> IntervalValue {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = input { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = input { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = input {
        return IntervalValue::Error(error);
    }
    interval_unresolved(unresolved_flavor)
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub struct PointPayload {
    pub x: i64,
    pub y: i64,
    pub wire_known: bool,
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum PointValue {
    Unknown,
    Unimplemented,
    Null,
    Value(PointPayload),
    Error(SqlError),
}

pub fn point_unknown() -> PointValue { PointValue::Unknown }
pub fn point_null() -> PointValue {
    PointValue::Null
}
pub fn make_point_bits(x: i64, y: i64) -> PointValue {
    PointValue::Value(PointPayload {
        x,
        y,
        wire_known: true,
    })
}
pub fn make_point_value(x: f64, y: f64) -> PointValue {
    let x_bits = x.to_bits() as i64;
    let y_bits = y.to_bits() as i64;
    make_point_bits(x_bits, y_bits)
}
pub fn point_is_null(input: PointValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let PointValue::Unknown = input { unresolved_flavor = 1; };
    if let PointValue::Unimplemented = input { unresolved_flavor = 2; };
    if let PointValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_2082_4: i32 = unresolved_flavor; if let PointValue::Unknown = input { if condition_flavor_2082_4 < 1 { condition_flavor_2082_4 = 1; }; }; if let PointValue::Unimplemented = input { condition_flavor_2082_4 = 2; }; if (input == PointValue::Unknown || input == PointValue::Unimplemented) {
        return bool_unresolved(condition_flavor_2082_4);
    };
    make_bool_value(input == PointValue::Null)
}
pub fn point_from_case_guard(input: CheckOutcome) -> PointValue {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = input { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = input { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = input {
        return PointValue::Error(error);
    };
    point_unresolved(unresolved_flavor)
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub struct LinePayload {
    pub a: i64,
    pub b: i64,
    pub c: i64,
    pub wire_known: bool,
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum LineValue {
    Unknown,
    Unimplemented,
    Null,
    Value(LinePayload),
    Error(SqlError),
}

pub fn line_unknown() -> LineValue { LineValue::Unknown }
pub fn line_null() -> LineValue {
    LineValue::Null
}
pub fn make_line_bits(a: i64, b: i64, c: i64) -> LineValue {
    let unresolved_flavor: i32 = 0;
    let first = float8_number(a);
    let second = float8_number(b);
    if first.abs() <= 0.000001f64 && second.abs() <= 0.000001f64 {
        return line_unresolved(unresolved_flavor);
    };
    LineValue::Value(LinePayload {
        a,
        b,
        c,
        wire_known: true,
    })
}
pub fn make_stored_line_bits(a: i64, b: i64, c: i64) -> LineValue {
    LineValue::Value(LinePayload { a, b, c, wire_known: true })
}
pub fn line_is_null(input: LineValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let LineValue::Unknown = input { unresolved_flavor = 1; };
    if let LineValue::Unimplemented = input { unresolved_flavor = 2; };
    if let LineValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_2142_4: i32 = unresolved_flavor; if let LineValue::Unknown = input { if condition_flavor_2142_4 < 1 { condition_flavor_2142_4 = 1; }; }; if let LineValue::Unimplemented = input { condition_flavor_2142_4 = 2; }; if (input == LineValue::Unknown || input == LineValue::Unimplemented) {
        return bool_unresolved(condition_flavor_2142_4);
    };
    make_bool_value(input == LineValue::Null)
}
pub fn line_from_case_guard(input: CheckOutcome) -> LineValue {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = input { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = input { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = input {
        return LineValue::Error(error);
    };
    line_unresolved(unresolved_flavor)
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub struct LsegPayload {
    pub x1: i64,
    pub y1: i64,
    pub x2: i64,
    pub y2: i64,
    pub wire_known: bool,
}
#[derive(Clone, Copy, PartialEq, Eq)]
pub enum LsegValue {
    Unknown,
    Unimplemented,
    Null,
    Value(LsegPayload),
    Error(SqlError),
}
pub fn lseg_unknown() -> LsegValue { LsegValue::Unknown }
pub fn lseg_null() -> LsegValue {
    LsegValue::Null
}
pub fn make_lseg_bits(x1: i64, y1: i64, x2: i64, y2: i64) -> LsegValue {
    LsegValue::Value(LsegPayload {
        x1,
        y1,
        x2,
        y2,
        wire_known: true,
    })
}
pub fn lseg_is_null(input: LsegValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let LsegValue::Unknown = input { unresolved_flavor = 1; };
    if let LsegValue::Unimplemented = input { unresolved_flavor = 2; };
    if let LsegValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_2193_4: i32 = unresolved_flavor; if let LsegValue::Unknown = input { if condition_flavor_2193_4 < 1 { condition_flavor_2193_4 = 1; }; }; if let LsegValue::Unimplemented = input { condition_flavor_2193_4 = 2; }; if (input == LsegValue::Unknown || input == LsegValue::Unimplemented) {
        return bool_unresolved(condition_flavor_2193_4);
    };
    make_bool_value(input == LsegValue::Null)
}
pub fn lseg_from_case_guard(input: CheckOutcome) -> LsegValue {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = input { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = input { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = input {
        return LsegValue::Error(error);
    };
    lseg_unresolved(unresolved_flavor)
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub struct BoxPayload {
    pub high_x: i64,
    pub high_y: i64,
    pub low_x: i64,
    pub low_y: i64,
    pub wire_known: bool,
}
#[derive(Clone, Copy, PartialEq, Eq)]
pub enum BoxValue {
    Unknown,
    Unimplemented,
    Null,
    Value(BoxPayload),
    Error(SqlError),
    NonNull,
}
pub fn box_unknown() -> BoxValue { BoxValue::Unknown }
pub fn box_null() -> BoxValue {
    BoxValue::Null
}
pub fn make_box_bits(high_x: i64, high_y: i64, low_x: i64, low_y: i64) -> BoxValue {
    BoxValue::Value(BoxPayload {
        high_x,
        high_y,
        low_x,
        low_y,
        wire_known: true,
    })
}
pub fn box_is_null(input: BoxValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let BoxValue::Unknown = input { unresolved_flavor = 1; };
    if let BoxValue::Unimplemented = input { unresolved_flavor = 2; };
    if let BoxValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_2245_4: i32 = unresolved_flavor; if let BoxValue::Unknown = input { if condition_flavor_2245_4 < 1 { condition_flavor_2245_4 = 1; }; }; if let BoxValue::Unimplemented = input { condition_flavor_2245_4 = 2; }; if (input == BoxValue::Unknown || input == BoxValue::Unimplemented) {
        return bool_unresolved(condition_flavor_2245_4);
    };
    make_bool_value(input == BoxValue::Null)
}
pub fn box_from_case_guard(input: CheckOutcome) -> BoxValue {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = input { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = input { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = input {
        return BoxValue::Error(error);
    };
    box_unresolved(unresolved_flavor)
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub struct CirclePayload {
    pub x: i64,
    pub y: i64,
    pub radius: i64,
    pub wire_known: bool,
}

#[derive(Clone)]
pub struct PathPayload {
    pub closed: bool,
    pub points: Vec<PointPayload>,
}

#[derive(Clone)]
pub enum PathValue {
    Unknown,
    Unimplemented,
    Null,
    Value(PathPayload),
    Error(SqlError),
}

pub fn path_unknown() -> PathValue { PathValue::Unknown }
pub fn path_null() -> PathValue {
    PathValue::Null
}
pub fn make_path_value(payload: PathPayload) -> PathValue {
    let unresolved_flavor: i32 = 0;
    if payload.points.len() == 0 {
        return path_unresolved(unresolved_flavor);
    };
    PathValue::Value(payload)
}
pub fn start_stored_path(closed: bool) -> PathValue {
    let points: Vec<PointPayload> = Vec::new();
    let payload = PathPayload { closed, points };
    PathValue::Value(payload)
}
pub fn append_stored_path_point(path: PathValue, point: PointValue) -> PathValue {
    let mut unresolved_flavor: i32 = 0;
    if let PathValue::Unknown = path { unresolved_flavor = 1; };
    if let PointValue::Unknown = point { unresolved_flavor = 1; };
    if let PathValue::Unimplemented = path { unresolved_flavor = 2; };
    if let PointValue::Unimplemented = point { unresolved_flavor = 2; };
    if let PathValue::Error(error) = path { return PathValue::Error(error); };
    if let PointValue::Error(error) = point { return PathValue::Error(error); };
    if let PathValue::Value(payload) = path {
        let closed = payload.closed;
        let mut points = payload.points;
        if let PointValue::Value(value) = point {
            points.push(value);
            let updated = PathPayload { closed, points };
            return PathValue::Value(updated);
        };
    };
    path_unresolved(unresolved_flavor)
}
pub fn path_is_null(input: PathValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let PathValue::Unknown = input { unresolved_flavor = 1; };
    if let PathValue::Unimplemented = input { unresolved_flavor = 2; };
    if let PathValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_2325_4: i32 = unresolved_flavor; if let PathValue::Unknown = input { if condition_flavor_2325_4 < 1 { condition_flavor_2325_4 = 1; }; }; if let PathValue::Unknown = input {
        return bool_unresolved(condition_flavor_2325_4);
    }; let mut condition_flavor_2327_7: i32 = unresolved_flavor; if let PathValue::Unimplemented = input { condition_flavor_2327_7 = 2; }; if let PathValue::Unimplemented = input {
        return bool_unresolved(condition_flavor_2327_7);
    };
    if let PathValue::Null = input {
        return make_bool_value(true);
    };
    make_bool_value(false)
}
pub fn path_from_case_guard(input: CheckOutcome) -> PathValue {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = input { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = input { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = input {
        return PathValue::Error(error);
    };
    path_unresolved(unresolved_flavor)
}

#[derive(Clone)]
pub struct PolygonPayload {
    pub points: Vec<PointPayload>,
    pub bounds: BoxValue,
}
#[derive(Clone)]
pub enum PolygonValue {
    Unknown,
    Unimplemented,
    Null,
    Value(PolygonPayload),
    Error(SqlError),
}
pub fn start_stored_polygon(bounds: BoxValue) -> PolygonValue {
    let points: Vec<PointPayload> = Vec::new();
    let payload = PolygonPayload { points, bounds };
    PolygonValue::Value(payload)
}
pub fn append_stored_polygon_point(polygon: PolygonValue, point: PointValue) -> PolygonValue {
    let mut unresolved_flavor: i32 = 0;
    if let PolygonValue::Unknown = polygon { unresolved_flavor = 1; };
    if let PointValue::Unknown = point { unresolved_flavor = 1; };
    if let PolygonValue::Unimplemented = polygon { unresolved_flavor = 2; };
    if let PointValue::Unimplemented = point { unresolved_flavor = 2; };
    if let PolygonValue::Error(error) = polygon { return PolygonValue::Error(error); };
    if let PointValue::Error(error) = point { return PolygonValue::Error(error); };
    if let PolygonValue::Value(payload) = polygon {
        let bounds = payload.bounds;
        let mut points = payload.points;
        if let PointValue::Value(value) = point {
            points.push(value);
            let updated = PolygonPayload { bounds, points };
            return PolygonValue::Value(updated);
        };
    };
    polygon_unresolved(unresolved_flavor)
}
fn polygon_coordinate_less(left: i64, right: i64) -> bool {
    let a = float8_number(left);
    let b = float8_number(right);
    if b != b {
        return a == a;
    };
    a < b
}
fn polygon_coordinate_equal(left: i64, right: i64) -> bool {
    let a = float8_number(left);
    let b = float8_number(right);
    a == b || (a != a && b != b)
}
fn polygon_coordinate_known(point: PointPayload, y: bool) -> bool {
    let mut bits = point.x;
    if y {
        bits = point.y;
    };
    let value = float8_number(bits);
    point.wire_known || value == value
}
fn polygon_calculated_bounds(payload: PolygonPayload) -> BoxPayload {
    let first = payload.points[0];
    let mut high_x = first.x;
    let mut high_y = first.y;
    let mut low_x = first.x;
    let mut low_y = first.y;
    let mut high_x_known = polygon_coordinate_known(first, false);
    let mut high_y_known = polygon_coordinate_known(first, true);
    let mut low_x_known = high_x_known;
    let mut low_y_known = high_y_known;
    let mut index: usize = 1;
    while index < payload.points.len() {
        let point = payload.points[index];
        if polygon_coordinate_less(point.x, low_x) {
            low_x = point.x;
            low_x_known = polygon_coordinate_known(point, false);
        };
        if polygon_coordinate_less(high_x, point.x) {
            high_x = point.x;
            high_x_known = polygon_coordinate_known(point, false);
        };
        if polygon_coordinate_less(point.y, low_y) {
            low_y = point.y;
            low_y_known = polygon_coordinate_known(point, true);
        };
        if polygon_coordinate_less(high_y, point.y) {
            high_y = point.y;
            high_y_known = polygon_coordinate_known(point, true);
        };
        index += 1;
    }
    BoxPayload {
        high_x,
        high_y,
        low_x,
        low_y,
        wire_known: high_x_known && high_y_known && low_x_known && low_y_known,
    }
}
fn polygon_bounds_ambiguous(payload: PolygonPayload, bounds: BoxPayload) -> bool {
    if bounds.wire_known == false {
        return true;
    };
    let mut index: usize = 0;
    while index < payload.points.len() {
        let point = payload.points[index];
        if (polygon_coordinate_equal(point.x, bounds.high_x) && point.x != bounds.high_x)
            || (polygon_coordinate_equal(point.x, bounds.low_x) && point.x != bounds.low_x)
            || (polygon_coordinate_equal(point.y, bounds.high_y) && point.y != bounds.high_y)
            || (polygon_coordinate_equal(point.y, bounds.low_y) && point.y != bounds.low_y)
        {
            return true;
        };
        index += 1;
    }
    false
}
pub fn make_polygon_value(payload: PolygonPayload) -> PolygonValue {
    let unresolved_flavor: i32 = 0;
    let maximum_points: i32 = 134217725;
    let fallback: usize = 0;
    let maximum = usize::try_from(maximum_points).unwrap_or(fallback);
    if payload.points.len() == 0 || payload.points.len() > maximum {
        return polygon_unresolved(unresolved_flavor);
    };
    let calculated = polygon_calculated_bounds(payload.clone());
    let mut bounds = payload.bounds;
    if (bounds == BoxValue::Unknown || bounds == BoxValue::Unimplemented) {
        bounds = BoxValue::NonNull;
        if polygon_bounds_ambiguous(payload.clone(), calculated) == false {
            bounds = BoxValue::Value(calculated);
        };
    };
    if let BoxValue::Value(actual) = bounds {
        if polygon_coordinate_equal(actual.high_x, calculated.high_x) == false
            || polygon_coordinate_equal(actual.high_y, calculated.high_y) == false
            || polygon_coordinate_equal(actual.low_x, calculated.low_x) == false
            || polygon_coordinate_equal(actual.low_y, calculated.low_y) == false
        {
            return polygon_unresolved(unresolved_flavor);
        };
    };
    if bounds == BoxValue::Null {
        return polygon_unresolved(unresolved_flavor);
    };
    if let BoxValue::Error(_) = bounds {
        return polygon_unresolved(unresolved_flavor);
    };
    PolygonValue::Value(PolygonPayload {
        points: payload.points,
        bounds,
    })
}
pub fn make_polygon_points(payload: PolygonPayload) -> PolygonValue {
    let unresolved_flavor: i32 = 0;
    let maximum_points: i32 = 134217725;
    let fallback: usize = 0;
    let maximum = usize::try_from(maximum_points).unwrap_or(fallback);
    if payload.points.len() == 0 || payload.points.len() > maximum {
        return polygon_unresolved(unresolved_flavor);
    };
    let bounds = polygon_calculated_bounds(payload.clone());
    PolygonValue::Value(PolygonPayload {
        points: payload.points,
        bounds: BoxValue::Value(bounds),
    })
}
pub fn polygon_unknown() -> PolygonValue { PolygonValue::Unknown }
pub fn polygon_null() -> PolygonValue {
    PolygonValue::Null
}
pub fn polygon_is_null(input: PolygonValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let PolygonValue::Unknown = input { unresolved_flavor = 1; };
    if let PolygonValue::Unimplemented = input { unresolved_flavor = 2; };
    if let PolygonValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_2521_4: i32 = unresolved_flavor; if let PolygonValue::Unknown = input { if condition_flavor_2521_4 < 1 { condition_flavor_2521_4 = 1; }; }; if let PolygonValue::Unknown = input {
        return bool_unresolved(condition_flavor_2521_4);
    }; let mut condition_flavor_2523_7: i32 = unresolved_flavor; if let PolygonValue::Unimplemented = input { condition_flavor_2523_7 = 2; }; if let PolygonValue::Unimplemented = input {
        return bool_unresolved(condition_flavor_2523_7);
    };
    if let PolygonValue::Null = input {
        return make_bool_value(true);
    };
    make_bool_value(false)
}
pub fn polygon_from_case_guard(input: CheckOutcome) -> PolygonValue {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = input { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = input { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = input {
        return PolygonValue::Error(error);
    };
    polygon_unresolved(unresolved_flavor)
}
#[derive(Clone, Copy, PartialEq, Eq)]
pub enum CircleValue {
    Unknown,
    Unimplemented,
    Null,
    Value(CirclePayload),
    Error(SqlError),
}
pub fn circle_unknown() -> CircleValue { CircleValue::Unknown }
pub fn circle_null() -> CircleValue {
    CircleValue::Null
}
pub fn make_circle_bits(x: i64, y: i64, radius: i64) -> CircleValue {
    CircleValue::Value(CirclePayload {
        x,
        y,
        radius,
        wire_known: true,
    })
}
pub fn circle_is_null(input: CircleValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let CircleValue::Unknown = input { unresolved_flavor = 1; };
    if let CircleValue::Unimplemented = input { unresolved_flavor = 2; };
    if let CircleValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_2567_4: i32 = unresolved_flavor; if let CircleValue::Unknown = input { if condition_flavor_2567_4 < 1 { condition_flavor_2567_4 = 1; }; }; if let CircleValue::Unimplemented = input { condition_flavor_2567_4 = 2; }; if (input == CircleValue::Unknown || input == CircleValue::Unimplemented) {
        return bool_unresolved(condition_flavor_2567_4);
    };
    make_bool_value(input == CircleValue::Null)
}
pub fn circle_from_case_guard(input: CheckOutcome) -> CircleValue {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = input { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = input { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = input {
        return CircleValue::Error(error);
    };
    circle_unresolved(unresolved_flavor)
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub struct AclitemPayload {
    pub grantee: i64,
    pub grantor: i64,
    pub privileges: i64,
    pub grant_options: i64,
}
#[derive(Clone, Copy, PartialEq, Eq)]
pub struct AclitemCatalogPayload {
    pub privileges: i64,
    pub grant_options: i64,
    pub public_grantee: bool,
    pub invalid_grantor: bool,
}
#[derive(Clone, Copy, PartialEq, Eq)]
pub enum AclitemValue {
    Unknown,
    Unimplemented,
    Null,
    Value(AclitemPayload),
    Error(SqlError),
    Catalog(AclitemCatalogPayload),
}
pub fn aclitem_unknown() -> AclitemValue { AclitemValue::Unknown }
pub fn aclitem_null() -> AclitemValue { AclitemValue::Null }
pub fn make_aclitem_value(grantee: i64, grantor: i64, privileges: i64, grant_options: i64) -> AclitemValue {
    let unresolved_flavor: i32 = 0;
    if grantee < 0i64 || grantee > 4294967295i64 || grantor < 0i64 || grantor > 4294967295i64
        || privileges < 0i64 || privileges > 4294967295i64 || grant_options < 0i64 || grant_options > 4294967295i64 {
        return aclitem_unresolved(unresolved_flavor);
    };
    AclitemValue::Value(AclitemPayload { grantee: grantee, grantor: grantor, privileges: privileges, grant_options: grant_options })
}
pub fn make_aclitem_catalog_value(privileges: i64, grant_options: i64, public_grantee: bool, invalid_grantor: bool) -> AclitemValue {
    let unresolved_flavor: i32 = 0;
    if privileges < 0i64 || privileges > 4294967295i64 || grant_options < 0i64 || grant_options > 4294967295i64 { return aclitem_unresolved(unresolved_flavor); };
    if public_grantee && invalid_grantor { return make_aclitem_value(0i64,0i64,privileges,grant_options); };
    AclitemValue::Catalog(AclitemCatalogPayload { privileges, grant_options, public_grantee, invalid_grantor })
}
pub fn aclitem_is_null(input: AclitemValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let AclitemValue::Unknown = input { unresolved_flavor = 1; };
    if let AclitemValue::Unimplemented = input { unresolved_flavor = 2; };
    if let AclitemValue::Error(error) = input { return BoolValue::Error(error); };
    let mut condition_flavor_2626_4: i32 = unresolved_flavor; if let AclitemValue::Unknown = input { if condition_flavor_2626_4 < 1 { condition_flavor_2626_4 = 1; }; }; if let AclitemValue::Unimplemented = input { condition_flavor_2626_4 = 2; }; if (input == AclitemValue::Unknown || input == AclitemValue::Unimplemented) { return bool_unresolved(condition_flavor_2626_4); };
    make_bool_value(input == AclitemValue::Null)
}
pub fn aclitem_from_case_guard(input: CheckOutcome) -> AclitemValue {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = input { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = input { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = input { return AclitemValue::Error(error); };
    aclitem_unresolved(unresolved_flavor)
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum MoneyValue {
    Unknown,
    Unimplemented,
    Null,
    Value(i64),
    Error(SqlError),
}
pub fn money_unknown() -> MoneyValue { MoneyValue::Unknown }
pub fn money_null() -> MoneyValue {
    MoneyValue::Null
}
pub fn make_money_value(units: i64) -> MoneyValue {
    MoneyValue::Value(units)
}
pub fn money_is_null(input: MoneyValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let MoneyValue::Unknown = input { unresolved_flavor = 1; };
    if let MoneyValue::Unimplemented = input { unresolved_flavor = 2; };
    if let MoneyValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_2659_4: i32 = unresolved_flavor; if let MoneyValue::Unknown = input { if condition_flavor_2659_4 < 1 { condition_flavor_2659_4 = 1; }; }; if let MoneyValue::Unimplemented = input { condition_flavor_2659_4 = 2; }; if (input == MoneyValue::Unknown || input == MoneyValue::Unimplemented) {
        return bool_unresolved(condition_flavor_2659_4);
    };
    make_bool_value(input == MoneyValue::Null)
}
pub fn money_from_case_guard(input: CheckOutcome) -> MoneyValue {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = input { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = input { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = input {
        return MoneyValue::Error(error);
    };
    money_unresolved(unresolved_flavor)
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum InternalCharValue {
    Unknown,
    Unimplemented,
    Null,
    Value(i32),
    Error(SqlError),
}
pub fn internal_char_unknown() -> InternalCharValue { InternalCharValue::Unknown }
pub fn internal_char_null() -> InternalCharValue {
    InternalCharValue::Null
}
pub fn make_internal_char_value(units: i32) -> InternalCharValue {
    let unresolved_flavor: i32 = 0;
    if units < 0 || units > 255 {
        return internal_char_unresolved(unresolved_flavor);
    };
    InternalCharValue::Value(units)
}
pub fn internal_char_is_null(input: InternalCharValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let InternalCharValue::Unknown = input { unresolved_flavor = 1; };
    if let InternalCharValue::Unimplemented = input { unresolved_flavor = 2; };
    if let InternalCharValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_2700_4: i32 = unresolved_flavor; if let InternalCharValue::Unknown = input { if condition_flavor_2700_4 < 1 { condition_flavor_2700_4 = 1; }; }; if let InternalCharValue::Unimplemented = input { condition_flavor_2700_4 = 2; }; if (input == InternalCharValue::Unknown || input == InternalCharValue::Unimplemented) {
        return bool_unresolved(condition_flavor_2700_4);
    };
    make_bool_value(input == InternalCharValue::Null)
}
pub fn internal_char_from_case_guard(input: CheckOutcome) -> InternalCharValue {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = input { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = input { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = input {
        return InternalCharValue::Error(error);
    };
    internal_char_unresolved(unresolved_flavor)
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum OidValue {
    Unknown,
    Unimplemented,
    Null,
    Value(i64),
    Error(SqlError),
}
pub fn oid_unknown() -> OidValue { OidValue::Unknown }
pub fn oid_null() -> OidValue {
    OidValue::Null
}
pub fn make_oid_value(units: i64) -> OidValue {
    let unresolved_flavor: i32 = 0;
    if units < 0i64 || units > 4294967295i64 {
        return oid_unresolved(unresolved_flavor);
    };
    OidValue::Value(units)
}
pub fn oid_is_null(input: OidValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let OidValue::Unknown = input { unresolved_flavor = 1; };
    if let OidValue::Unimplemented = input { unresolved_flavor = 2; };
    if let OidValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_2741_4: i32 = unresolved_flavor; if let OidValue::Unknown = input { if condition_flavor_2741_4 < 1 { condition_flavor_2741_4 = 1; }; }; if let OidValue::Unimplemented = input { condition_flavor_2741_4 = 2; }; if (input == OidValue::Unknown || input == OidValue::Unimplemented) {
        return bool_unresolved(condition_flavor_2741_4);
    };
    make_bool_value(input == OidValue::Null)
}
pub fn oid_from_case_guard(input: CheckOutcome) -> OidValue {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = input { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = input { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = input {
        return OidValue::Error(error);
    };
    oid_unresolved(unresolved_flavor)
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum XidValue {
    Unknown,
    Unimplemented,
    Null,
    Value(i64),
    Error(SqlError),
}
pub fn xid_unknown() -> XidValue { XidValue::Unknown }
pub fn xid_null() -> XidValue {
    XidValue::Null
}
pub fn make_xid_value(units: i64) -> XidValue {
    let unresolved_flavor: i32 = 0;
    if units < 0i64 || units > 4294967295i64 {
        return xid_unresolved(unresolved_flavor);
    };
    XidValue::Value(units)
}
pub fn xid_is_null(input: XidValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let XidValue::Unknown = input { unresolved_flavor = 1; };
    if let XidValue::Unimplemented = input { unresolved_flavor = 2; };
    if let XidValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_2782_4: i32 = unresolved_flavor; if let XidValue::Unknown = input { if condition_flavor_2782_4 < 1 { condition_flavor_2782_4 = 1; }; }; if let XidValue::Unimplemented = input { condition_flavor_2782_4 = 2; }; if (input == XidValue::Unknown || input == XidValue::Unimplemented) {
        return bool_unresolved(condition_flavor_2782_4);
    };
    make_bool_value(input == XidValue::Null)
}
pub fn xid_from_case_guard(input: CheckOutcome) -> XidValue {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = input { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = input { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = input {
        return XidValue::Error(error);
    };
    xid_unresolved(unresolved_flavor)
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum CidValue {
    Unknown,
    Unimplemented,
    Null,
    Value(i64),
    Error(SqlError),
}
pub fn cid_unknown() -> CidValue { CidValue::Unknown }
pub fn cid_null() -> CidValue {
    CidValue::Null
}
pub fn make_cid_value(units: i64) -> CidValue {
    let unresolved_flavor: i32 = 0;
    if units < 0i64 || units > 4294967295i64 {
        return cid_unresolved(unresolved_flavor);
    };
    CidValue::Value(units)
}
pub fn cid_is_null(input: CidValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let CidValue::Unknown = input { unresolved_flavor = 1; };
    if let CidValue::Unimplemented = input { unresolved_flavor = 2; };
    if let CidValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_2823_4: i32 = unresolved_flavor; if let CidValue::Unknown = input { if condition_flavor_2823_4 < 1 { condition_flavor_2823_4 = 1; }; }; if let CidValue::Unimplemented = input { condition_flavor_2823_4 = 2; }; if (input == CidValue::Unknown || input == CidValue::Unimplemented) {
        return bool_unresolved(condition_flavor_2823_4);
    };
    make_bool_value(input == CidValue::Null)
}
pub fn cid_from_case_guard(input: CheckOutcome) -> CidValue {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = input { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = input { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = input {
        return CidValue::Error(error);
    };
    cid_unresolved(unresolved_flavor)
}

#[derive(Clone, Copy)]
pub struct SnapshotXid {
    pub bits: i64,
}

#[derive(Clone)]
pub struct SnapshotPayload {
    pub xmin: i64,
    pub xmax: i64,
    pub xip: Vec<SnapshotXid>,
}

#[derive(Clone)]
pub enum SnapshotValue {
    Unknown,
    Unimplemented,
    Null,
    Value(SnapshotPayload),
    Error(SqlError),
}

pub fn snapshot_xid_order(left: i64, right: i64) -> i32 {
    if left < 0i64 && right >= 0i64 {
        return 1;
    };
    if left >= 0i64 && right < 0i64 {
        return -1;
    };
    if left < right {
        return -1;
    };
    if left > right {
        return 1;
    };
    0
}
pub fn snapshot_unknown() -> SnapshotValue { SnapshotValue::Unknown }
pub fn snapshot_null() -> SnapshotValue {
    SnapshotValue::Null
}
pub fn snapshot_count_fits(count: usize) -> bool {
    count <= 134217724
}
pub fn make_snapshot_value(payload: SnapshotPayload) -> SnapshotValue {
    let unresolved_flavor: i32 = 0;
    if snapshot_count_fits(payload.xip.len()) == false {
        return snapshot_unresolved(unresolved_flavor);
    };
    if payload.xmin % 4294967296i64 == 0i64
        || payload.xmax % 4294967296i64 == 0i64
        || snapshot_xid_order(payload.xmin, payload.xmax) > 0
    {
        return snapshot_unresolved(unresolved_flavor);
    };
    let mut index: usize = 0;
    let mut previous = 0i64;
    while index < payload.xip.len() {
        let bits = payload.xip[index].bits;
        if snapshot_xid_order(bits, payload.xmin) < 0
            || snapshot_xid_order(bits, payload.xmax) > 0
            || snapshot_xid_order(bits, previous) <= 0
        {
            return snapshot_unresolved(unresolved_flavor);
        };
        previous = bits;
        index += 1;
    }
    SnapshotValue::Value(payload)
}
pub fn start_stored_snapshot(xmin: i64, xmax: i64) -> SnapshotValue {
    let xip: Vec<SnapshotXid> = Vec::new();
    make_snapshot_value(SnapshotPayload { xmin, xmax, xip })
}
pub fn append_stored_snapshot(input: SnapshotValue, bits: i64) -> SnapshotValue {
    if let SnapshotValue::Value(payload) = input {
        let xmin = payload.xmin;
        let xmax = payload.xmax;
        let mut xip = payload.xip;
        xip.push(SnapshotXid { bits });
        return SnapshotValue::Value(SnapshotPayload { xmin, xmax, xip });
    };
    input
}
pub fn snapshot_is_null(input: SnapshotValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let SnapshotValue::Unknown = input { unresolved_flavor = 1; };
    if let SnapshotValue::Unimplemented = input { unresolved_flavor = 2; };
    if let SnapshotValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_2928_4: i32 = unresolved_flavor; if let SnapshotValue::Unknown = input { if condition_flavor_2928_4 < 1 { condition_flavor_2928_4 = 1; }; }; if let SnapshotValue::Unknown = input {
        return bool_unresolved(condition_flavor_2928_4);
    }; let mut condition_flavor_2930_7: i32 = unresolved_flavor; if let SnapshotValue::Unimplemented = input { condition_flavor_2930_7 = 2; }; if let SnapshotValue::Unimplemented = input {
        return bool_unresolved(condition_flavor_2930_7);
    };
    if let SnapshotValue::Null = input {
        return make_bool_value(true);
    };
    make_bool_value(false)
}
pub fn snapshot_from_case_guard(input: CheckOutcome) -> SnapshotValue {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = input { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = input { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = input {
        return SnapshotValue::Error(error);
    };
    snapshot_unresolved(unresolved_flavor)
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum Xid8Value {
    Unknown,
    Unimplemented,
    Null,
    Value(i64),
    Error(SqlError),
}
pub fn xid8_unknown() -> Xid8Value { Xid8Value::Unknown }
pub fn xid8_null() -> Xid8Value {
    Xid8Value::Null
}
pub fn make_xid8_bits(units: i64) -> Xid8Value {
    Xid8Value::Value(units)
}
pub fn xid8_is_null(input: Xid8Value) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let Xid8Value::Unknown = input { unresolved_flavor = 1; };
    if let Xid8Value::Unimplemented = input { unresolved_flavor = 2; };
    if let Xid8Value::Error(error) = input {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_2970_4: i32 = unresolved_flavor; if let Xid8Value::Unknown = input { if condition_flavor_2970_4 < 1 { condition_flavor_2970_4 = 1; }; }; if let Xid8Value::Unimplemented = input { condition_flavor_2970_4 = 2; }; if (input == Xid8Value::Unknown || input == Xid8Value::Unimplemented) {
        return bool_unresolved(condition_flavor_2970_4);
    };
    make_bool_value(input == Xid8Value::Null)
}
pub fn xid8_from_case_guard(input: CheckOutcome) -> Xid8Value {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = input { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = input { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = input {
        return Xid8Value::Error(error);
    };
    xid8_unresolved(unresolved_flavor)
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum PgLsnValue {
    Unknown,
    Unimplemented,
    Null,
    Value(i64),
    Error(SqlError),
}
pub fn pg_lsn_unknown() -> PgLsnValue { PgLsnValue::Unknown }
pub fn pg_lsn_null() -> PgLsnValue {
    PgLsnValue::Null
}
pub fn make_pg_lsn_bits(units: i64) -> PgLsnValue {
    PgLsnValue::Value(units)
}
pub fn pg_lsn_is_null(input: PgLsnValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let PgLsnValue::Unknown = input { unresolved_flavor = 1; };
    if let PgLsnValue::Unimplemented = input { unresolved_flavor = 2; };
    if let PgLsnValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_3007_4: i32 = unresolved_flavor; if let PgLsnValue::Unknown = input { if condition_flavor_3007_4 < 1 { condition_flavor_3007_4 = 1; }; }; if let PgLsnValue::Unimplemented = input { condition_flavor_3007_4 = 2; }; if (input == PgLsnValue::Unknown || input == PgLsnValue::Unimplemented) {
        return bool_unresolved(condition_flavor_3007_4);
    };
    make_bool_value(input == PgLsnValue::Null)
}
pub fn pg_lsn_from_case_guard(input: CheckOutcome) -> PgLsnValue {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = input { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = input { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = input {
        return PgLsnValue::Error(error);
    };
    pg_lsn_unresolved(unresolved_flavor)
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum TidValue {
    Unknown,
    Unimplemented,
    Null,
    Value(i64),
    Error(SqlError),
}
pub fn tid_unknown() -> TidValue { TidValue::Unknown }
pub fn tid_null() -> TidValue {
    TidValue::Null
}
pub fn make_tid_value(units: i64) -> TidValue {
    let unresolved_flavor: i32 = 0;
    if units < 0i64 || units > 281474976710655i64 {
        return tid_unresolved(unresolved_flavor);
    };
    TidValue::Value(units)
}
pub fn tid_is_null(input: TidValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TidValue::Unknown = input { unresolved_flavor = 1; };
    if let TidValue::Unimplemented = input { unresolved_flavor = 2; };
    if let TidValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_3048_4: i32 = unresolved_flavor; if let TidValue::Unknown = input { if condition_flavor_3048_4 < 1 { condition_flavor_3048_4 = 1; }; }; if let TidValue::Unimplemented = input { condition_flavor_3048_4 = 2; }; if (input == TidValue::Unknown || input == TidValue::Unimplemented) {
        return bool_unresolved(condition_flavor_3048_4);
    };
    make_bool_value(input == TidValue::Null)
}
pub fn tid_from_case_guard(input: CheckOutcome) -> TidValue {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = input { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = input { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = input {
        return TidValue::Error(error);
    };
    tid_unresolved(unresolved_flavor)
}

pub fn make_tid_parts(block: i64, offset: i32) -> TidValue {
    let unresolved_flavor: i32 = 0;
    if block < 0i64 || block > 4294967295i64 || offset < 0 || offset > 65535 {
        return tid_unresolved(unresolved_flavor);
    };
    let low = offset as i64;
    make_tid_value(block * 65536i64 + low)
}

pub fn jsonpath_unknown() -> JsonpathValue { JsonpathValue::Unknown }

pub fn jsonpath_null() -> JsonpathValue {
    JsonpathValue::Null
}

pub fn jsonpath_is_null(input: JsonpathValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let JsonpathValue::Unknown = input { unresolved_flavor = 1; };
    if let JsonpathValue::Unimplemented = input { unresolved_flavor = 2; };
    if let JsonpathValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    let mut condition_flavor_3085_4: i32 = unresolved_flavor; if let JsonpathValue::Unknown = input { if condition_flavor_3085_4 < 1 { condition_flavor_3085_4 = 1; }; }; if let JsonpathValue::Unknown = input {
        return bool_unresolved(condition_flavor_3085_4);
    }; let mut condition_flavor_3087_7: i32 = unresolved_flavor; if let JsonpathValue::Unimplemented = input { condition_flavor_3087_7 = 2; }; if let JsonpathValue::Unimplemented = input {
        return bool_unresolved(condition_flavor_3087_7);
    };
    if let JsonpathValue::Null = input {
        return BoolValue::Value(true);
    };
    BoolValue::Value(false)
}

pub fn jsonpath_from_case_guard(input: CheckOutcome) -> JsonpathValue {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = input { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = input { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = input {
        return JsonpathValue::Error(error);
    };
    jsonpath_unresolved(unresolved_flavor)
}

pub fn jsonpath_from_coerced_value(input: JsonpathValue) -> JsonpathValue {
    let mut unresolved_flavor: i32 = 0;
    if let JsonpathValue::Unknown = input { unresolved_flavor = 1; };
    if let JsonpathValue::Unimplemented = input { unresolved_flavor = 2; };
    if let JsonpathValue::StoredText(text) = input {
        let characters: Vec<char> = text.chars().collect();
        if characters.len() == 0 {
            return jsonpath_unresolved(unresolved_flavor);
        };
        let mut index: usize = 0;
        while index < characters.len() {
            if characters[index] == '\0' {
                return jsonpath_unresolved(unresolved_flavor);
            };
            index += 1;
        }
        return JsonpathValue::StoredText(text);
    };
    if let JsonpathValue::Value(value) = input {
        if value.root == 0 || value.root >= value.nodes.len() {
            return jsonpath_unresolved(unresolved_flavor);
        };
        let mut index: usize = 0;
        while index < value.characters.len() {
            if value.characters[index] == '\0' {
                return jsonpath_unresolved(unresolved_flavor);
            };
            index += 1;
        }
        let mut visited: Vec<usize> = Vec::new();
        visited.push(0);
        index = 1;
        while index < value.nodes.len() {
            if jsonpath_payload_node_valid(&value, index) == false {
                return jsonpath_unresolved(unresolved_flavor);
            };
            visited.push(0);
            index += 1;
        }
        let mut pending: Vec<JsonpathBoundaryVisit> = Vec::new();
        pending.push(JsonpathBoundaryVisit {
            node: value.root,
            filters: 0,
            subscript: false,
            accessor: false,
            list: false,
        });
        let mut depth: usize = 1;
        while depth > 0 {
            depth = depth - 1;
            let visit = pending[depth];
            if visited[visit.node] != 0 {
                return jsonpath_unresolved(unresolved_flavor);
            };
            visited[visit.node] = 1;
            let node = value.nodes[visit.node];
            if (node.kind == JSONPATH_NODE_SUBSCRIPT) != visit.list {
                return jsonpath_unresolved(unresolved_flavor);
            };
            if visit.list == false && jsonpath_accessor_kind(node.kind) != visit.accessor {
                return jsonpath_unresolved(unresolved_flavor);
            };
            if node.kind == JSONPATH_NODE_CURRENT && visit.filters == 0 {
                return jsonpath_unresolved(unresolved_flavor);
            };
            if node.kind == JSONPATH_NODE_LAST && visit.subscript == false {
                return jsonpath_unresolved(unresolved_flavor);
            };
            let mut child: usize = 0;
            while child < 3 {
                let mut next = node.next;
                let mut filters = visit.filters;
                let mut subscript = visit.subscript;
                let mut accessor = true;
                let mut list = node.kind == JSONPATH_NODE_SUBSCRIPT;
                if child == 1 {
                    next = node.left;
                    accessor = false;
                    list = node.kind == JSONPATH_NODE_INDEX;
                    if node.kind == JSONPATH_NODE_FILTER {
                        filters += 1;
                    };
                    if node.kind == JSONPATH_NODE_INDEX || node.kind == JSONPATH_NODE_SUBSCRIPT {
                        subscript = true;
                    };
                };
                if child == 2 {
                    next = node.right;
                    accessor = false;
                    list = false;
                    if node.kind == JSONPATH_NODE_SUBSCRIPT {
                        subscript = true;
                    };
                };
                if next > 0 {
                    let task = JsonpathBoundaryVisit {
                        node: next,
                        filters: filters,
                        subscript: subscript,
                        accessor: accessor,
                        list: list,
                    };
                    if depth < pending.len() {
                        pending[depth] = task;
                    } else {
                        pending.push(task);
                    };
                    depth += 1;
                };
                child += 1;
            }
        }
        return JsonpathValue::Value(value);
    };
    input
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

pub fn tsvector_unknown() -> TsvectorValue { TsvectorValue::Unknown }
pub fn tsvector_null() -> TsvectorValue { TsvectorValue::Null }

pub fn make_stored_tsvector_payload(native_bytes: i32) -> TsvectorPayload {
    let lexemes: Vec<TsvectorLexeme> = Vec::new();
    TsvectorPayload { lexemes, native_bytes }
}
pub fn make_stored_tsvector_lexeme(text: &str) -> TsvectorLexeme {
    let positions: Vec<TsvectorPosition> = Vec::new();
    TsvectorLexeme { text: text.to_owned(), positions }
}
pub fn tsvector_append_stored_position(input: TsvectorLexeme, position: i32, weight: i32) -> TsvectorLexeme {
    let mut positions = input.positions;
    positions.push(TsvectorPosition { position, weight });
    TsvectorLexeme { text: input.text, positions }
}
pub fn tsvector_append_stored_lexeme(input: TsvectorPayload, lexeme: TsvectorLexeme) -> TsvectorPayload {
    let mut lexemes = input.lexemes;
    lexemes.push(lexeme);
    TsvectorPayload { lexemes, native_bytes: input.native_bytes }
}

pub fn tsvector_lexeme_bytes(input: &str) -> i32 {
    let chars: Vec<char> = input.chars().collect();
    let mut bytes: i32 = 0;
    let mut index: usize = 0;
    while index < chars.len() {
        let point = chars[index] as i32;
        let mut width: i32 = 1;
        if point == 0 { return -1; };
        if point >= 65536 { width = 4; }
        else if point >= 2048 { width = 3; }
        else if point >= 128 { width = 2; };
        if bytes > 2147483647 - width { return -1; };
        bytes = bytes + width;
        index += 1;
    }
    bytes
}

pub fn tsvector_lexeme_order(left: &str, right: &str) -> i32 {
    let a: Vec<char> = left.chars().collect();
    let b: Vec<char> = right.chars().collect();
    let mut index: usize = 0;
    while index < a.len() && index < b.len() {
        if (a[index] as i32) < (b[index] as i32) { return -1; };
        if (a[index] as i32) > (b[index] as i32) { return 1; };
        index += 1;
    }
    if a.len() < b.len() { return -1; };
    if a.len() > b.len() { return 1; };
    0
}

pub fn tsvector_canonical_bytes(input: &TsvectorPayload) -> i32 {
    if input.lexemes.len() > 1048575 { return -1; };
    let mut bytes: i32 = 0;
    let mut index: usize = 0;
    while index < input.lexemes.len() {
        let width = tsvector_lexeme_bytes(input.lexemes[index].text.as_str());
        if width < 0 || width > 2047 { return -1; };
        bytes = bytes + width;
        let count = input.lexemes[index].positions.len();
        if count > 256 { return -1; };
        if count > 0 {
            if bytes % 2 != 0 { bytes = bytes + 1; };
            bytes = bytes + 2 + (count as i32) * 2;
        };
        if bytes > 1048575 { return -1; };
        index += 1;
    }
    8 + (input.lexemes.len() as i32) * 4 + bytes
}

pub fn make_tsvector_value(input: TsvectorPayload) -> TsvectorValue {
    let unresolved_flavor: i32 = 0;
    if input.native_bytes > 1073741823 { return tsvector_unresolved(unresolved_flavor); };
    if tsvector_canonical_bytes(&input) < 0 { return tsvector_unresolved(unresolved_flavor); };
    if input.native_bytes != -1 && input.native_bytes < 8 + (input.lexemes.len() as i32) * 4 {
        return tsvector_unresolved(unresolved_flavor);
    };
    let mut index: usize = 0;
    while index < input.lexemes.len() {
        let text = input.lexemes[index].text.as_str();
        if text == "" { return tsvector_unresolved(unresolved_flavor); };
        if index > 0 && tsvector_lexeme_order(input.lexemes[index - 1].text.as_str(),text) > 0 {
            return tsvector_unresolved(unresolved_flavor);
        };
        let mut position: usize = 0;
        let mut previous: i32 = -1;
        while position < input.lexemes[index].positions.len() {
            let value = input.lexemes[index].positions[position];
            if value.position < 0 || value.position < previous || value.position > 16383 || value.weight < 0 || value.weight > 3 {
                return tsvector_unresolved(unresolved_flavor);
            };
            previous = value.position;
            position += 1;
        }
        index += 1;
    }
    TsvectorValue::Value(input)
}

pub fn tsvector_is_null(input: TsvectorValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TsvectorValue::Unknown = input { unresolved_flavor = 1; };
    if let TsvectorValue::Unimplemented = input { unresolved_flavor = 2; };
    if let TsvectorValue::Error(error) = input { return BoolValue::Error(error); };
    let mut condition_flavor_3358_4: i32 = unresolved_flavor; if let TsvectorValue::Unknown = input { if condition_flavor_3358_4 < 1 { condition_flavor_3358_4 = 1; }; }; if let TsvectorValue::Unknown = input { return bool_unresolved(condition_flavor_3358_4); }; let mut condition_flavor_3358_90: i32 = unresolved_flavor; if let TsvectorValue::Unimplemented = input { condition_flavor_3358_90 = 2; }; if let TsvectorValue::Unimplemented = input { return bool_unresolved(condition_flavor_3358_90); };
    if let TsvectorValue::Null = input { return make_bool_value(true); };
    make_bool_value(false)
}

pub fn tsvector_from_case_guard(input: CheckOutcome) -> TsvectorValue {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = input { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = input { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = input { return TsvectorValue::Error(error); };
    tsvector_unresolved(unresolved_flavor)
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

pub fn tsquery_unknown() -> TsqueryValue { TsqueryValue::Unknown }
pub fn tsquery_null() -> TsqueryValue { TsqueryValue::Null }

pub fn tsquery_canonical_bytes(input: &TsqueryPayload) -> i32 {
    if input.nodes.len() > 89478484 { return -1; };
    let count = input.nodes.len() as i32;
    let mut bytes: i64 = 8i64 + (count as i64) * 12i64;
    let mut index: usize = 0;
    while index < input.nodes.len() {
        if input.nodes[index].kind == 0 {
            let width = tsvector_lexeme_bytes(input.nodes[index].text.as_str());
            if width < 0 || width > 2047 { return -1; };
            bytes = bytes + (width as i64) + 1i64;
        };
        index += 1;
    }
    if bytes > 1073741823i64 { return -1; };
    bytes as i32
}

pub fn make_tsquery_value(input: TsqueryPayload) -> TsqueryValue {
    let unresolved_flavor: i32 = 0;
    if input.nodes.len() > 89478484 { return tsquery_unresolved(unresolved_flavor); };
    if input.native_bytes < -1 || input.native_bytes > 1073741823 { return tsquery_unresolved(unresolved_flavor); };
    let count = input.nodes.len() as i32;
    if input.native_bytes != -1 && (input.native_bytes as i64) < 8i64 + (count as i64) * 12i64 { return tsquery_unresolved(unresolved_flavor); };
    if input.nodes.len() == 0 {
        if input.root != 0 { return tsquery_unresolved(unresolved_flavor); };
        return TsqueryValue::Value(input);
    };
    if input.root != input.nodes.len() - 1 { return tsquery_unresolved(unresolved_flavor); };
    let mut stack: Vec<usize> = Vec::new();
    let mut depth: usize = 0;
    let mut index: usize = 0;
    while index < input.nodes.len() {
        let node = input.nodes[index].clone();
        if node.kind < 0 || node.kind > 4 { return tsquery_unresolved(unresolved_flavor); };
        if node.kind == 0 {
            let width = tsvector_lexeme_bytes(node.text.as_str());
            if width < 0 || width > 2047 { return tsquery_unresolved(unresolved_flavor); };
            if node.weight < 0 || node.weight > 15 || node.distance != 0 || node.left != 0 || node.right != 0 { return tsquery_unresolved(unresolved_flavor); };
        } else {
            if node.text != "" || node.weight != 0 || node.prefix { return tsquery_unresolved(unresolved_flavor); };
            if node.kind != 4 && node.distance != 0 { return tsquery_unresolved(unresolved_flavor); };
            if node.kind == 4 && (node.distance < -32768 || node.distance > 32767) { return tsquery_unresolved(unresolved_flavor); };
            if node.kind == 1 {
                if depth < 1 || node.left != stack[depth - 1] || node.right != 0 { return tsquery_unresolved(unresolved_flavor); };
                depth = depth - 1;
            } else {
                if depth < 2 || node.left != stack[depth - 2] || node.right != stack[depth - 1] { return tsquery_unresolved(unresolved_flavor); };
                depth = depth - 2;
            };
        };
        if depth < stack.len() { stack[depth] = index; } else { stack.push(index); };
        depth += 1;
        index += 1;
    }
    if depth != 1 { return tsquery_unresolved(unresolved_flavor); };
    TsqueryValue::Value(input)
}

pub fn tsquery_is_null(input: TsqueryValue) -> BoolValue {
    let mut unresolved_flavor: i32 = 0;
    if let TsqueryValue::Unknown = input { unresolved_flavor = 1; };
    if let TsqueryValue::Unimplemented = input { unresolved_flavor = 2; };
    if let TsqueryValue::Error(error) = input { return BoolValue::Error(error); };
    let mut condition_flavor_3464_4: i32 = unresolved_flavor; if let TsqueryValue::Unknown = input { if condition_flavor_3464_4 < 1 { condition_flavor_3464_4 = 1; }; }; if let TsqueryValue::Unknown = input { return bool_unresolved(condition_flavor_3464_4); }; let mut condition_flavor_3464_89: i32 = unresolved_flavor; if let TsqueryValue::Unimplemented = input { condition_flavor_3464_89 = 2; }; if let TsqueryValue::Unimplemented = input { return bool_unresolved(condition_flavor_3464_89); };
    if let TsqueryValue::Null = input { return make_bool_value(true); };
    make_bool_value(false)
}

pub fn tsquery_from_case_guard(input: CheckOutcome) -> TsqueryValue {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = input { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = input { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = input { return TsqueryValue::Error(error); };
    tsquery_unresolved(unresolved_flavor)
}

pub fn make_tsquery_payload(native_bytes: i32) -> TsqueryPayload {
    let nodes: Vec<TsqueryNode> = Vec::new();
    TsqueryPayload {nodes:nodes,root:0,native_bytes:native_bytes}
}

pub fn tsquery_append_node(input: TsqueryPayload, kind: i32, text: &str, weight: i32, prefix: bool, distance: i32, left: usize, right: usize) -> TsqueryPayload {
    let mut nodes = input.nodes;
    let root = nodes.len();
    nodes.push(TsqueryNode {kind:kind,text:text.to_owned(),weight:weight,prefix:prefix,distance:distance,left:left,right:right});
    TsqueryPayload {nodes:nodes,root:root,native_bytes:input.native_bytes}
}

// Flavors: 1 Unknown (needs database context), 2 Unimplemented.

pub fn aclitem_unresolved(flavor: i32) -> AclitemValue {
    if flavor == 1 { return AclitemValue::Unknown; };
    AclitemValue::Unimplemented
}

pub fn array_unresolved(flavor: i32) -> ArrayValue {
    if flavor == 1 { return ArrayValue::Unknown; };
    ArrayValue::Unimplemented
}

pub fn bit_unresolved(flavor: i32) -> BitValue {
    if flavor == 1 { return BitValue::Unknown; };
    BitValue::Unimplemented
}

pub fn bool_unresolved(flavor: i32) -> BoolValue {
    if flavor == 1 { return BoolValue::Unknown; };
    BoolValue::Unimplemented
}

pub fn box_unresolved(flavor: i32) -> BoxValue {
    if flavor == 1 { return BoxValue::Unknown; };
    BoxValue::Unimplemented
}

pub fn bytea_unresolved(flavor: i32) -> ByteaValue {
    if flavor == 1 { return ByteaValue::Unknown; };
    ByteaValue::Unimplemented
}

pub fn cid_unresolved(flavor: i32) -> CidValue {
    if flavor == 1 { return CidValue::Unknown; };
    CidValue::Unimplemented
}

pub fn circle_unresolved(flavor: i32) -> CircleValue {
    if flavor == 1 { return CircleValue::Unknown; };
    CircleValue::Unimplemented
}


pub fn composite_row_unresolved(flavor: i32) -> CompositeValue {
    if flavor == 1 { return CompositeValue::Unknown; };
    CompositeValue::Unimplemented
}

pub fn date_unresolved(flavor: i32) -> DateValue {
    if flavor == 1 { return DateValue::Unknown; };
    DateValue::Unimplemented
}

pub fn enum_unresolved(flavor: i32) -> EnumValue {
    if flavor == 1 { return EnumValue::Unknown; };
    EnumValue::Unimplemented
}

pub fn float4_unresolved(flavor: i32) -> Float4Value {
    if flavor == 1 { return Float4Value::Unknown; };
    Float4Value::Unimplemented
}

pub fn float8_unresolved(flavor: i32) -> Float8Value {
    if flavor == 1 { return Float8Value::Unknown; };
    Float8Value::Unimplemented
}

pub fn int2_unresolved(flavor: i32) -> Int2Value {
    if flavor == 1 { return Int2Value::Unknown; };
    Int2Value::Unimplemented
}

pub fn int4_unresolved(flavor: i32) -> Int4Value {
    if flavor == 1 { return Int4Value::Unknown; };
    Int4Value::Unimplemented
}

pub fn int8_unresolved(flavor: i32) -> Int8Value {
    if flavor == 1 { return Int8Value::Unknown; };
    Int8Value::Unimplemented
}

pub fn internal_char_unresolved(flavor: i32) -> InternalCharValue {
    if flavor == 1 { return InternalCharValue::Unknown; };
    InternalCharValue::Unimplemented
}

pub fn interval_unresolved(flavor: i32) -> IntervalValue {
    if flavor == 1 { return IntervalValue::Unknown; };
    IntervalValue::Unimplemented
}

pub fn jsonb_unresolved(flavor: i32) -> JsonbValue {
    if flavor == 1 { return JsonbValue::Unknown; };
    JsonbValue::Unimplemented
}

pub fn jsonpath_unresolved(flavor: i32) -> JsonpathValue {
    if flavor == 1 { return JsonpathValue::Unknown; };
    JsonpathValue::Unimplemented
}

pub fn json_unresolved(flavor: i32) -> JsonValue {
    if flavor == 1 { return JsonValue::Unknown; };
    JsonValue::Unimplemented
}

pub fn line_unresolved(flavor: i32) -> LineValue {
    if flavor == 1 { return LineValue::Unknown; };
    LineValue::Unimplemented
}

pub fn lseg_unresolved(flavor: i32) -> LsegValue {
    if flavor == 1 { return LsegValue::Unknown; };
    LsegValue::Unimplemented
}

pub fn macaddr8_unresolved(flavor: i32) -> Macaddr8Value {
    if flavor == 1 { return Macaddr8Value::Unknown; };
    Macaddr8Value::Unimplemented
}

pub fn macaddr_unresolved(flavor: i32) -> MacaddrValue {
    if flavor == 1 { return MacaddrValue::Unknown; };
    MacaddrValue::Unimplemented
}

pub fn money_unresolved(flavor: i32) -> MoneyValue {
    if flavor == 1 { return MoneyValue::Unknown; };
    MoneyValue::Unimplemented
}

pub fn multirange_unresolved(flavor: i32) -> MultirangeValue {
    if flavor == 1 { return MultirangeValue::Unknown; };
    MultirangeValue::Unimplemented
}

pub fn network_unresolved(flavor: i32) -> NetworkValue {
    if flavor == 1 { return NetworkValue::Unknown; };
    NetworkValue::Unimplemented
}

pub fn numeric_unresolved(flavor: i32) -> NumericValue {
    if flavor == 1 { return NumericValue::Unknown; };
    NumericValue::Unimplemented
}

pub fn oid_unresolved(flavor: i32) -> OidValue {
    if flavor == 1 { return OidValue::Unknown; };
    OidValue::Unimplemented
}

pub fn path_unresolved(flavor: i32) -> PathValue {
    if flavor == 1 { return PathValue::Unknown; };
    PathValue::Unimplemented
}

pub fn pg_lsn_unresolved(flavor: i32) -> PgLsnValue {
    if flavor == 1 { return PgLsnValue::Unknown; };
    PgLsnValue::Unimplemented
}

pub fn point_unresolved(flavor: i32) -> PointValue {
    if flavor == 1 { return PointValue::Unknown; };
    PointValue::Unimplemented
}

pub fn polygon_unresolved(flavor: i32) -> PolygonValue {
    if flavor == 1 { return PolygonValue::Unknown; };
    PolygonValue::Unimplemented
}

pub fn range_unresolved(flavor: i32) -> RangeValue {
    if flavor == 1 { return RangeValue::Unknown; };
    RangeValue::Unimplemented
}

pub fn snapshot_unresolved(flavor: i32) -> SnapshotValue {
    if flavor == 1 { return SnapshotValue::Unknown; };
    SnapshotValue::Unimplemented
}

pub fn text_unresolved(flavor: i32) -> TextValue {
    if flavor == 1 { return TextValue::Unknown; };
    TextValue::Unimplemented
}

pub fn tid_unresolved(flavor: i32) -> TidValue {
    if flavor == 1 { return TidValue::Unknown; };
    TidValue::Unimplemented
}

pub fn timestamptz_unresolved(flavor: i32) -> TimestamptzValue {
    if flavor == 1 { return TimestamptzValue::Unknown; };
    TimestamptzValue::Unimplemented
}

pub fn timestamp_unresolved(flavor: i32) -> TimestampValue {
    if flavor == 1 { return TimestampValue::Unknown; };
    TimestampValue::Unimplemented
}

pub fn timetz_unresolved(flavor: i32) -> TimetzValue {
    if flavor == 1 { return TimetzValue::Unknown; };
    TimetzValue::Unimplemented
}

pub fn time_unresolved(flavor: i32) -> TimeValue {
    if flavor == 1 { return TimeValue::Unknown; };
    TimeValue::Unimplemented
}

pub fn tsquery_unresolved(flavor: i32) -> TsqueryValue {
    if flavor == 1 { return TsqueryValue::Unknown; };
    TsqueryValue::Unimplemented
}

pub fn tsvector_unresolved(flavor: i32) -> TsvectorValue {
    if flavor == 1 { return TsvectorValue::Unknown; };
    TsvectorValue::Unimplemented
}

pub fn uuid_unresolved(flavor: i32) -> UuidValue {
    if flavor == 1 { return UuidValue::Unknown; };
    UuidValue::Unimplemented
}

pub fn xid8_unresolved(flavor: i32) -> Xid8Value {
    if flavor == 1 { return Xid8Value::Unknown; };
    Xid8Value::Unimplemented
}

pub fn xid_unresolved(flavor: i32) -> XidValue {
    if flavor == 1 { return XidValue::Unknown; };
    XidValue::Unimplemented
}

pub fn xml_unresolved(flavor: i32) -> XmlValue {
    if flavor == 1 { return XmlValue::Unknown; };
    XmlValue::Unimplemented
}

pub fn array_arguments_unresolved(flavor: i32) -> ArrayArguments {
    if flavor == 1 { return ArrayArguments::Unknown; };
    ArrayArguments::Unimplemented
}

pub fn array_children_arguments_unresolved(flavor: i32) -> ArrayChildrenArguments {
    if flavor == 1 { return ArrayChildrenArguments::Unknown; };
    ArrayChildrenArguments::Unimplemented
}

pub fn array_element_unresolved(flavor: i32) -> ArrayElement {
    if flavor == 1 { return ArrayElement::Unknown; };
    ArrayElement::Unimplemented
}

pub fn array_text_event_unresolved(flavor: i32) -> ArrayTextEvent {
    if flavor == 1 { return ArrayTextEvent::Unknown; };
    ArrayTextEvent::Unimplemented
}

pub fn array_text_plan_unresolved(flavor: i32) -> ArrayTextPlan {
    if flavor == 1 { return ArrayTextPlan::Unknown; };
    ArrayTextPlan::Unimplemented
}

pub fn composite_text_plan_unresolved(flavor: i32) -> CompositeTextPlan {
    if flavor == 1 { return CompositeTextPlan::Unknown; };
    CompositeTextPlan::Unimplemented
}

pub fn jsonb_arguments_unresolved(flavor: i32) -> JsonbArguments {
    if flavor == 1 { return JsonbArguments::Unknown; };
    JsonbArguments::Unimplemented
}

pub fn jsonb_input_unresolved(flavor: i32) -> JsonbInput {
    if flavor == 1 { return JsonbInput::Unknown; };
    JsonbInput::Unimplemented
}

pub fn range_text_plan_unresolved(flavor: i32) -> RangeTextPlan {
    if flavor == 1 { return RangeTextPlan::Unknown; };
    RangeTextPlan::Unimplemented
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
