#[derive(Clone, Copy, PartialEq, Eq)]
pub enum Int2Value {
    Unknown,
    Null,
    Value(i32),
    Error(SqlError),
}

pub fn int2_unknown() -> Int2Value {
    Int2Value::Unknown
}

pub fn int2_null() -> Int2Value {
    Int2Value::Null
}

pub fn make_int2_value(value: i32) -> Int2Value {
    if value < -32768 || value > 32767 {
        return Int2Value::Unknown;
    }
    Int2Value::Value(value)
}

pub fn int2_is_null(value: Int2Value) -> BoolValue {
    if let Int2Value::Error(error) = value {
        return BoolValue::Error(error);
    }
    if value == Int2Value::Unknown {
        return BoolValue::Unknown;
    }
    BoolValue::Value(value == Int2Value::Null)
}

pub fn int2_from_case_guard(value: CheckOutcome) -> Int2Value {
    if let CheckOutcome::Error(error) = value {
        return Int2Value::Error(error);
    }
    Int2Value::Unknown
}

pub fn int2_to_int4(value: Int2Value) -> Int4Value {
    if let Int2Value::Error(error) = value {
        return Int4Value::Error(error);
    }
    if value == Int2Value::Null {
        return Int4Value::Null;
    }
    if let Int2Value::Value(number) = value {
        return Int4Value::Value(number);
    }
    Int4Value::Unknown
}

pub fn int2_to_int8(value: Int2Value) -> Int8Value {
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
    Int8Value::Unknown
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum Int4Value {
    Unknown,
    Null,
    Value(i32),
    Error(SqlError),
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum Int8Value {
    Unknown,
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
    Null,
    Value(i64),
    Error(SqlError),
}

pub fn timestamp_unknown() -> TimestampValue {
    TimestampValue::Unknown
}

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

pub fn timestamp_is_null(value: TimestampValue) -> BoolValue {
    if let TimestampValue::Error(error) = value {
        return BoolValue::Error(error);
    }
    if value == TimestampValue::Unknown {
        return BoolValue::Unknown;
    }
    BoolValue::Value(value == TimestampValue::Null)
}

pub fn timestamp_from_case_guard(value: CheckOutcome) -> TimestampValue {
    if let CheckOutcome::Error(error) = value {
        return TimestampValue::Error(error);
    }
    TimestampValue::Unknown
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum TimestamptzValue {
    Unknown,
    Null,
    Value(i64),
    Error(SqlError),
}

pub fn timestamptz_unknown() -> TimestamptzValue {
    TimestamptzValue::Unknown
}

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

pub fn timestamptz_is_null(value: TimestamptzValue) -> BoolValue {
    if let TimestamptzValue::Error(error) = value {
        return BoolValue::Error(error);
    }
    if value == TimestamptzValue::Unknown {
        return BoolValue::Unknown;
    }
    BoolValue::Value(value == TimestamptzValue::Null)
}

pub fn timestamptz_from_case_guard(value: CheckOutcome) -> TimestamptzValue {
    if let CheckOutcome::Error(error) = value {
        return TimestamptzValue::Error(error);
    }
    TimestamptzValue::Unknown
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub struct EnumPayload {
    pub ordinal: i32,
    pub label_oid: i64,
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum EnumValue {
    Unknown,
    Null,
    Value(EnumPayload),
    Error(SqlError),
}

pub fn enum_unknown() -> EnumValue {
    EnumValue::Unknown
}

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
    if ordinal < 0 || label_oid < 1i64 || label_oid > 4294967295i64 {
        return EnumValue::Unknown;
    }
    EnumValue::Value(EnumPayload { ordinal, label_oid })
}

pub fn enum_is_null(value: EnumValue) -> BoolValue {
    if let EnumValue::Error(error) = value {
        return BoolValue::Error(error);
    }
    if value == EnumValue::Unknown {
        return BoolValue::Unknown;
    }
    BoolValue::Value(value == EnumValue::Null)
}

pub fn enum_from_case_guard(value: CheckOutcome) -> EnumValue {
    if let CheckOutcome::Error(error) = value {
        return EnumValue::Error(error);
    }
    EnumValue::Unknown
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum DateValue {
    Unknown,
    Null,
    Value(i32),
    Error(SqlError),
}

pub fn date_unknown() -> DateValue {
    DateValue::Unknown
}

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

pub fn date_is_null(value: DateValue) -> BoolValue {
    if let DateValue::Error(error) = value {
        return BoolValue::Error(error);
    }
    if value == DateValue::Unknown {
        return BoolValue::Unknown;
    }
    BoolValue::Value(value == DateValue::Null)
}

pub fn date_from_case_guard(value: CheckOutcome) -> DateValue {
    if let CheckOutcome::Error(error) = value {
        return DateValue::Error(error);
    }
    DateValue::Unknown
}

#[derive(Clone, PartialEq, Eq)]
pub enum TextValue {
    Unknown,
    Null,
    Value(String),
    Error(SqlError),
}

pub fn int4_unknown() -> Int4Value {
    Int4Value::Unknown
}

pub fn int4_null() -> Int4Value {
    Int4Value::Null
}

pub fn make_int4_value(value: i32) -> Int4Value {
    Int4Value::Value(value)
}

pub fn int8_unknown() -> Int8Value {
    Int8Value::Unknown
}

pub fn int8_null() -> Int8Value {
    Int8Value::Null
}

pub fn make_int8_value(value: i64) -> Int8Value {
    Int8Value::Value(value)
}

pub fn text_unknown() -> TextValue {
    TextValue::Unknown
}

pub fn text_null() -> TextValue {
    TextValue::Null
}

pub fn make_text_value(value: &str) -> TextValue {
    TextValue::Value(value.to_owned())
}

pub fn bool_unknown() -> BoolValue {
    BoolValue::Unknown
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
const SQL_ERROR_INVALID_DATETIME_FORMAT: u32 = 3452551;
const SQL_ERROR_DATETIME_FIELD_OVERFLOW: u32 = 3452552;
const SQL_ERROR_TIMEZONE_DISPLACEMENT: u32 = 3452553;
const SQL_ERROR_INVALID_USE_OF_ESCAPE: u32 = 3452556;
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

pub fn sql_error_message(error: SqlError) -> SqlErrorDescription<'static> {
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
    Null,
    Value(bool),
    Error(SqlError),
}

pub fn check_from_bool(value: BoolValue) -> CheckOutcome {
    if let BoolValue::Error(error) = value {
        return CheckOutcome::Error(error);
    }
    if value == BoolValue::Unknown {
        return CheckOutcome::Unknown;
    }
    if value == BoolValue::Null {
        return CheckOutcome::Null;
    }
    if value == BoolValue::Value(false) {
        return CheckOutcome::False;
    }
    CheckOutcome::True
}

pub fn check_unknown() -> CheckOutcome {
    CheckOutcome::Unknown
}

pub fn int4_is_null(value: Int4Value) -> BoolValue {
    if let Int4Value::Error(error) = value {
        return BoolValue::Error(error);
    }
    if value == Int4Value::Unknown {
        return BoolValue::Unknown;
    }
    BoolValue::Value(value == Int4Value::Null)
}

pub fn int8_is_null(value: Int8Value) -> BoolValue {
    if let Int8Value::Error(error) = value {
        return BoolValue::Error(error);
    }
    if value == Int8Value::Unknown {
        return BoolValue::Unknown;
    }
    BoolValue::Value(value == Int8Value::Null)
}

pub fn text_is_null(value: TextValue) -> BoolValue {
    if let TextValue::Error(error) = value {
        return BoolValue::Error(error);
    }
    if value == TextValue::Unknown {
        return BoolValue::Unknown;
    }
    BoolValue::Value(value == TextValue::Null)
}

pub fn bool_is_null(value: BoolValue) -> BoolValue {
    if let BoolValue::Error(error) = value {
        return BoolValue::Error(error);
    }
    if value == BoolValue::Unknown {
        return BoolValue::Unknown;
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
    if let CheckOutcome::Error(error) = value {
        return BoolValue::Error(error);
    }
    if value == CheckOutcome::Unknown {
        return BoolValue::Unknown;
    }
    if value == CheckOutcome::Null {
        return BoolValue::Null;
    }
    BoolValue::Value(value == CheckOutcome::True)
}

pub fn int4_from_case_guard(value: CheckOutcome) -> Int4Value {
    if let CheckOutcome::Error(error) = value {
        return Int4Value::Error(error);
    }
    Int4Value::Unknown
}

pub fn int8_from_case_guard(value: CheckOutcome) -> Int8Value {
    if let CheckOutcome::Error(error) = value {
        return Int8Value::Error(error);
    }
    Int8Value::Unknown
}

pub fn text_from_case_guard(value: CheckOutcome) -> TextValue {
    if let CheckOutcome::Error(error) = value {
        return TextValue::Error(error);
    }
    TextValue::Unknown
}

#[derive(Clone, PartialEq, Eq)]
pub enum NumericValue {
    Unknown,
    Null,
    Value(String),
    Error(SqlError),
}

pub fn numeric_unknown() -> NumericValue {
    NumericValue::Unknown
}

pub fn numeric_null() -> NumericValue {
    NumericValue::Null
}

pub fn numeric_is_null(value: NumericValue) -> BoolValue {
    if let NumericValue::Error(error) = value {
        return BoolValue::Error(error);
    }
    if value == NumericValue::Unknown {
        return BoolValue::Unknown;
    }
    BoolValue::Value(value == NumericValue::Null)
}

pub fn numeric_from_case_guard(value: CheckOutcome) -> NumericValue {
    if let CheckOutcome::Error(error) = value {
        return NumericValue::Error(error);
    }
    NumericValue::Unknown
}

pub fn make_numeric_value(value: &str) -> NumericValue {
    let parts = numeric_parts(value);
    if parts.valid == false {
        return NumericValue::Unknown;
    }
    NumericValue::Value(value.to_owned())
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
    Null,
    Value(NetworkAddress),
    Error(SqlError),
}

pub fn network_unknown() -> NetworkValue {
    NetworkValue::Unknown
}
pub fn network_null() -> NetworkValue {
    NetworkValue::Null
}
pub fn network_is_null(value: NetworkValue) -> BoolValue {
    if let NetworkValue::Error(error) = value {
        return BoolValue::Error(error);
    }
    if value == NetworkValue::Unknown {
        return BoolValue::Unknown;
    }
    BoolValue::Value(value == NetworkValue::Null)
}
pub fn network_from_case_guard(value: CheckOutcome) -> NetworkValue {
    if let CheckOutcome::Error(error) = value {
        return NetworkValue::Error(error);
    }
    NetworkValue::Unknown
}

pub fn make_network_value(value: &str) -> NetworkValue {
    let chars: Vec<char> = value.chars().collect();
    if chars.len() > 256 {
        return NetworkValue::Unknown;
    }
    let parsed = network_parse(value, false);
    if let NetworkValue::Error(_) = parsed {
        return NetworkValue::Unknown;
    }
    parsed
}
pub fn make_cidr_value(value: &str) -> NetworkValue {
    let chars: Vec<char> = value.chars().collect();
    if chars.len() > 256 {
        return NetworkValue::Unknown;
    }
    let parsed = network_parse(value, true);
    if let NetworkValue::Error(_) = parsed {
        return NetworkValue::Unknown;
    }
    parsed
}

#[derive(Clone, PartialEq, Eq)]
pub enum BitValue {
    Unknown,
    Null,
    Value(String),
    Error(SqlError),
}

pub fn bit_unknown() -> BitValue {
    BitValue::Unknown
}
pub fn bit_null() -> BitValue {
    BitValue::Null
}
pub fn bit_is_null(value: BitValue) -> BoolValue {
    if let BitValue::Error(error) = value {
        return BoolValue::Error(error);
    }
    if value == BitValue::Unknown {
        return BoolValue::Unknown;
    }
    BoolValue::Value(value == BitValue::Null)
}
pub fn bit_from_case_guard(value: CheckOutcome) -> BitValue {
    if let CheckOutcome::Error(error) = value {
        return BitValue::Error(error);
    }
    BitValue::Unknown
}
pub fn make_bit_value(value: &str) -> BitValue {
    let chars: Vec<char> = value.chars().collect();
    if chars.len() > 2147483640 {
        return BitValue::Unknown;
    }
    let mut index: usize = 0;
    while index < chars.len() {
        if chars[index] != '0' && chars[index] != '1' {
            return BitValue::Unknown;
        }
        index += 1;
    }
    BitValue::Value(value.to_owned())
}

#[derive(Clone, PartialEq, Eq)]
pub enum ByteaValue {
    Unknown,
    Null,
    Value(String),
    Error(SqlError),
}

pub fn bytea_unknown() -> ByteaValue {
    ByteaValue::Unknown
}
pub fn bytea_null() -> ByteaValue {
    ByteaValue::Null
}
pub fn bytea_is_null(value: ByteaValue) -> BoolValue {
    if let ByteaValue::Error(error) = value {
        return BoolValue::Error(error);
    }
    if value == ByteaValue::Unknown {
        return BoolValue::Unknown;
    }
    BoolValue::Value(value == ByteaValue::Null)
}
pub fn bytea_from_case_guard(value: CheckOutcome) -> ByteaValue {
    if let CheckOutcome::Error(error) = value {
        return ByteaValue::Error(error);
    }
    ByteaValue::Unknown
}
pub fn make_bytea_value(value: &str) -> ByteaValue {
    let chars: Vec<char> = value.chars().collect();
    let mut even = true;
    let mut output = String::new();
    let mut index: usize = 0;
    while index < chars.len() {
        let character = chars[index].to_ascii_lowercase();
        let code = character as u32;
        if (code < 48 || code > 57) && (code < 97 || code > 102) {
            return ByteaValue::Unknown;
        }
        output.push(character);
        even = even == false;
        index += 1;
    }
    if even == false {
        return ByteaValue::Unknown;
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
    Null,
    Value(MacAddress),
    Error(SqlError),
}

pub fn macaddr_unknown() -> MacaddrValue {
    MacaddrValue::Unknown
}
pub fn macaddr_null() -> MacaddrValue {
    MacaddrValue::Null
}
pub fn macaddr_is_null(value: MacaddrValue) -> BoolValue {
    if let MacaddrValue::Error(error) = value {
        return BoolValue::Error(error);
    }
    if value == MacaddrValue::Unknown {
        return BoolValue::Unknown;
    }
    BoolValue::Value(value == MacaddrValue::Null)
}
pub fn macaddr_from_case_guard(value: CheckOutcome) -> MacaddrValue {
    if let CheckOutcome::Error(error) = value {
        return MacaddrValue::Error(error);
    }
    MacaddrValue::Unknown
}
pub fn make_macaddr_value(value: &str) -> MacaddrValue {
    let chars: Vec<char> = value.chars().collect();
    if chars.len() > 256 {
        return MacaddrValue::Unknown;
    }
    let text = MacText { chars };
    let parsed = macaddr_parse(&text);
    if parsed.valid == false {
        return MacaddrValue::Unknown;
    }
    MacaddrValue::Value(parsed.address)
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum Macaddr8Value {
    Unknown,
    Null,
    Value(MacAddress),
    Error(SqlError),
}

pub fn macaddr8_unknown() -> Macaddr8Value {
    Macaddr8Value::Unknown
}
pub fn macaddr8_null() -> Macaddr8Value {
    Macaddr8Value::Null
}
pub fn macaddr8_is_null(value: Macaddr8Value) -> BoolValue {
    if let Macaddr8Value::Error(error) = value {
        return BoolValue::Error(error);
    }
    if value == Macaddr8Value::Unknown {
        return BoolValue::Unknown;
    }
    BoolValue::Value(value == Macaddr8Value::Null)
}
pub fn macaddr8_from_case_guard(value: CheckOutcome) -> Macaddr8Value {
    if let CheckOutcome::Error(error) = value {
        return Macaddr8Value::Error(error);
    }
    Macaddr8Value::Unknown
}
pub fn make_macaddr8_value(value: &str) -> Macaddr8Value {
    let chars: Vec<char> = value.chars().collect();
    if chars.len() > 256 {
        return Macaddr8Value::Unknown;
    }
    let text = MacText { chars };
    let parsed = macaddr8_parse(&text);
    if parsed.valid == false {
        return Macaddr8Value::Unknown;
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
    Null,
    Value(Uuid),
    Error(SqlError),
}

pub fn uuid_unknown() -> UuidValue {
    UuidValue::Unknown
}
pub fn uuid_null() -> UuidValue {
    UuidValue::Null
}
pub fn uuid_is_null(value: UuidValue) -> BoolValue {
    if let UuidValue::Error(error) = value {
        return BoolValue::Error(error);
    }
    if value == UuidValue::Unknown {
        return BoolValue::Unknown;
    }
    BoolValue::Value(value == UuidValue::Null)
}
pub fn uuid_from_case_guard(value: CheckOutcome) -> UuidValue {
    if let CheckOutcome::Error(error) = value {
        return UuidValue::Error(error);
    }
    UuidValue::Unknown
}
pub fn make_uuid_value(value: &str) -> UuidValue {
    let parsed = uuid_parse(value);
    if let UuidValue::Error(_) = parsed {
        return UuidValue::Unknown;
    }
    parsed
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum Float4Value {
    Unknown,
    Null,
    Value(i32),
    Error(SqlError),
    UnspecifiedNan,
}

pub fn float4_unknown() -> Float4Value {
    Float4Value::Unknown
}
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
    let bits = (value as f32).to_bits() as i32;
    let rounded = float4_number(bits);
    if value == value && rounded != value {
        return Float4Value::Unknown;
    }
    Float4Value::Value(bits)
}

pub fn float4_is_null(value: Float4Value) -> BoolValue {
    if let Float4Value::Error(error) = value {
        return BoolValue::Error(error);
    }
    if value == Float4Value::Unknown {
        return BoolValue::Unknown;
    }
    BoolValue::Value(value == Float4Value::Null)
}

pub fn float4_from_case_guard(value: CheckOutcome) -> Float4Value {
    if let CheckOutcome::Error(error) = value {
        return Float4Value::Error(error);
    }
    Float4Value::Unknown
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum Float8Value {
    Unknown,
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

pub fn float8_unknown() -> Float8Value {
    Float8Value::Unknown
}
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
    if let Float8Value::Error(error) = value {
        return BoolValue::Error(error);
    }
    if value == Float8Value::Unknown {
        return BoolValue::Unknown;
    }
    BoolValue::Value(value == Float8Value::Null)
}

pub fn float8_from_case_guard(value: CheckOutcome) -> Float8Value {
    if let CheckOutcome::Error(error) = value {
        return Float8Value::Error(error);
    }
    Float8Value::Unknown
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum TimeValue {
    Unknown,
    Null,
    Value(i64),
    Error(SqlError),
}

pub fn time_unknown() -> TimeValue {
    TimeValue::Unknown
}
pub fn time_null() -> TimeValue {
    TimeValue::Null
}

pub fn make_time_value(time: i64) -> TimeValue {
    if time < 0i64 || time > 86400000000i64 {
        return TimeValue::Unknown;
    }
    TimeValue::Value(time)
}

pub fn time_is_null(input: TimeValue) -> BoolValue {
    if let TimeValue::Error(error) = input {
        return BoolValue::Error(error);
    }
    if input == TimeValue::Unknown {
        return BoolValue::Unknown;
    }
    BoolValue::Value(input == TimeValue::Null)
}

pub fn time_from_case_guard(input: CheckOutcome) -> TimeValue {
    if let CheckOutcome::Error(error) = input {
        return TimeValue::Error(error);
    }
    TimeValue::Unknown
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub struct TimetzPayload {
    pub time: i64,
    pub zone: i32,
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum TimetzValue {
    Unknown,
    Null,
    Value(TimetzPayload),
    Error(SqlError),
}

pub fn timetz_unknown() -> TimetzValue {
    TimetzValue::Unknown
}
pub fn timetz_null() -> TimetzValue {
    TimetzValue::Null
}

pub fn make_timetz_value(time: i64, zone: i32) -> TimetzValue {
    if time < 0i64 || time > 86400000000i64 {
        return TimetzValue::Unknown;
    }
    TimetzValue::Value(TimetzPayload {
        time: time,
        zone: zone,
    })
}

pub fn timetz_is_null(input: TimetzValue) -> BoolValue {
    if let TimetzValue::Error(error) = input {
        return BoolValue::Error(error);
    }
    if input == TimetzValue::Unknown {
        return BoolValue::Unknown;
    }
    BoolValue::Value(input == TimetzValue::Null)
}

pub fn timetz_from_case_guard(input: CheckOutcome) -> TimetzValue {
    if let CheckOutcome::Error(error) = input {
        return TimetzValue::Error(error);
    }
    TimetzValue::Unknown
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
    Null,
    Value(IntervalPayload),
    Error(SqlError),
}

pub fn interval_unknown() -> IntervalValue {
    IntervalValue::Unknown
}
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
    if let IntervalValue::Error(error) = input {
        return BoolValue::Error(error);
    }
    if input == IntervalValue::Unknown {
        return BoolValue::Unknown;
    }
    BoolValue::Value(input == IntervalValue::Null)
}

pub fn interval_from_case_guard(input: CheckOutcome) -> IntervalValue {
    if let CheckOutcome::Error(error) = input {
        return IntervalValue::Error(error);
    }
    IntervalValue::Unknown
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
    Null,
    Value(PointPayload),
    Error(SqlError),
}

pub fn point_unknown() -> PointValue {
    PointValue::Unknown
}
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
    if let PointValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if input == PointValue::Unknown {
        return BoolValue::Unknown;
    };
    make_bool_value(input == PointValue::Null)
}
pub fn point_from_case_guard(input: CheckOutcome) -> PointValue {
    if let CheckOutcome::Error(error) = input {
        return PointValue::Error(error);
    };
    PointValue::Unknown
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
    Null,
    Value(LinePayload),
    Error(SqlError),
}

pub fn line_unknown() -> LineValue {
    LineValue::Unknown
}
pub fn line_null() -> LineValue {
    LineValue::Null
}
pub fn make_line_bits(a: i64, b: i64, c: i64) -> LineValue {
    let first = float8_number(a);
    let second = float8_number(b);
    if first.abs() <= 0.000001f64 && second.abs() <= 0.000001f64 {
        return LineValue::Unknown;
    };
    LineValue::Value(LinePayload {
        a,
        b,
        c,
        wire_known: true,
    })
}
pub fn line_is_null(input: LineValue) -> BoolValue {
    if let LineValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if input == LineValue::Unknown {
        return BoolValue::Unknown;
    };
    make_bool_value(input == LineValue::Null)
}
pub fn line_from_case_guard(input: CheckOutcome) -> LineValue {
    if let CheckOutcome::Error(error) = input {
        return LineValue::Error(error);
    };
    LineValue::Unknown
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
    Null,
    Value(LsegPayload),
    Error(SqlError),
}
pub fn lseg_unknown() -> LsegValue {
    LsegValue::Unknown
}
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
    if let LsegValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if input == LsegValue::Unknown {
        return BoolValue::Unknown;
    };
    make_bool_value(input == LsegValue::Null)
}
pub fn lseg_from_case_guard(input: CheckOutcome) -> LsegValue {
    if let CheckOutcome::Error(error) = input {
        return LsegValue::Error(error);
    };
    LsegValue::Unknown
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
    Null,
    Value(BoxPayload),
    Error(SqlError),
}
pub fn box_unknown() -> BoxValue {
    BoxValue::Unknown
}
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
    if let BoxValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if input == BoxValue::Unknown {
        return BoolValue::Unknown;
    };
    make_bool_value(input == BoxValue::Null)
}
pub fn box_from_case_guard(input: CheckOutcome) -> BoxValue {
    if let CheckOutcome::Error(error) = input {
        return BoxValue::Error(error);
    };
    BoxValue::Unknown
}


#[derive(Clone, Copy, PartialEq, Eq)]
pub struct CirclePayload {
    pub x: i64,
    pub y: i64,
    pub radius: i64,
    pub wire_known: bool,
}
#[derive(Clone, Copy, PartialEq, Eq)]
pub enum CircleValue {
    Unknown,
    Null,
    Value(CirclePayload),
    Error(SqlError),
}
pub fn circle_unknown() -> CircleValue {
    CircleValue::Unknown
}
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
    if let CircleValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if input == CircleValue::Unknown {
        return BoolValue::Unknown;
    };
    make_bool_value(input == CircleValue::Null)
}
pub fn circle_from_case_guard(input: CheckOutcome) -> CircleValue {
    if let CheckOutcome::Error(error) = input {
        return CircleValue::Error(error);
    };
    CircleValue::Unknown
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum MoneyValue {
    Unknown,
    Null,
    Value(i64),
    Error(SqlError),
}
pub fn money_unknown() -> MoneyValue {
    MoneyValue::Unknown
}
pub fn money_null() -> MoneyValue {
    MoneyValue::Null
}
pub fn make_money_value(units: i64) -> MoneyValue {
    MoneyValue::Value(units)
}
pub fn money_is_null(input: MoneyValue) -> BoolValue {
    if let MoneyValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if input == MoneyValue::Unknown {
        return BoolValue::Unknown;
    };
    make_bool_value(input == MoneyValue::Null)
}
pub fn money_from_case_guard(input: CheckOutcome) -> MoneyValue {
    if let CheckOutcome::Error(error) = input {
        return MoneyValue::Error(error);
    };
    MoneyValue::Unknown
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum OidValue {
    Unknown,
    Null,
    Value(i64),
    Error(SqlError),
}
pub fn oid_unknown() -> OidValue {
    OidValue::Unknown
}
pub fn oid_null() -> OidValue {
    OidValue::Null
}
pub fn make_oid_value(units: i64) -> OidValue {
    if units < 0i64 || units > 4294967295i64 {
        return OidValue::Unknown;
    };
    OidValue::Value(units)
}
pub fn oid_is_null(input: OidValue) -> BoolValue {
    if let OidValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if input == OidValue::Unknown {
        return BoolValue::Unknown;
    };
    make_bool_value(input == OidValue::Null)
}
pub fn oid_from_case_guard(input: CheckOutcome) -> OidValue {
    if let CheckOutcome::Error(error) = input {
        return OidValue::Error(error);
    };
    OidValue::Unknown
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum XidValue {
    Unknown,
    Null,
    Value(i64),
    Error(SqlError),
}
pub fn xid_unknown() -> XidValue {
    XidValue::Unknown
}
pub fn xid_null() -> XidValue {
    XidValue::Null
}
pub fn make_xid_value(units: i64) -> XidValue {
    if units < 0i64 || units > 4294967295i64 {
        return XidValue::Unknown;
    };
    XidValue::Value(units)
}
pub fn xid_is_null(input: XidValue) -> BoolValue {
    if let XidValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if input == XidValue::Unknown {
        return BoolValue::Unknown;
    };
    make_bool_value(input == XidValue::Null)
}
pub fn xid_from_case_guard(input: CheckOutcome) -> XidValue {
    if let CheckOutcome::Error(error) = input {
        return XidValue::Error(error);
    };
    XidValue::Unknown
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum CidValue {
    Unknown,
    Null,
    Value(i64),
    Error(SqlError),
}
pub fn cid_unknown() -> CidValue {
    CidValue::Unknown
}
pub fn cid_null() -> CidValue {
    CidValue::Null
}
pub fn make_cid_value(units: i64) -> CidValue {
    if units < 0i64 || units > 4294967295i64 {
        return CidValue::Unknown;
    };
    CidValue::Value(units)
}
pub fn cid_is_null(input: CidValue) -> BoolValue {
    if let CidValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if input == CidValue::Unknown {
        return BoolValue::Unknown;
    };
    make_bool_value(input == CidValue::Null)
}
pub fn cid_from_case_guard(input: CheckOutcome) -> CidValue {
    if let CheckOutcome::Error(error) = input {
        return CidValue::Error(error);
    };
    CidValue::Unknown
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum Xid8Value {
    Unknown,
    Null,
    Value(i64),
    Error(SqlError),
}
pub fn xid8_unknown() -> Xid8Value {
    Xid8Value::Unknown
}
pub fn xid8_null() -> Xid8Value {
    Xid8Value::Null
}
pub fn make_xid8_bits(units: i64) -> Xid8Value {
    Xid8Value::Value(units)
}
pub fn xid8_is_null(input: Xid8Value) -> BoolValue {
    if let Xid8Value::Error(error) = input {
        return BoolValue::Error(error);
    };
    if input == Xid8Value::Unknown {
        return BoolValue::Unknown;
    };
    make_bool_value(input == Xid8Value::Null)
}
pub fn xid8_from_case_guard(input: CheckOutcome) -> Xid8Value {
    if let CheckOutcome::Error(error) = input {
        return Xid8Value::Error(error);
    };
    Xid8Value::Unknown
}
