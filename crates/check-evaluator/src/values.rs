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
pub enum EnumValue {
    Unknown,
    Null,
    Value(i32),
    Error(SqlError),
}

pub fn enum_unknown() -> EnumValue {
    EnumValue::Unknown
}

pub fn enum_null() -> EnumValue {
    EnumValue::Null
}

pub fn make_enum_value(value: i32) -> EnumValue {
    EnumValue::Value(value)
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
const SQL_ERROR_DIVISION_BY_ZERO: u32 = 3452582;
const SQL_ERROR_INVALID_REGEX: u32 = 3452591;
const SQL_ERROR_INVALID_PARAMETER: u32 = 3452619;
const SQL_ERROR_INVALID_TEXT_REPRESENTATION: u32 = 3484946;

pub fn sql_error_message(error: SqlError) -> SqlErrorDescription<'static> {
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

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum NumericValue<'a> {
    Unknown,
    Null,
    Value(&'a str),
    Error(SqlError),
}

pub fn numeric_unknown() -> NumericValue<'static> {
    NumericValue::Unknown
}

pub fn numeric_null() -> NumericValue<'static> {
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

pub fn numeric_from_case_guard(value: CheckOutcome) -> NumericValue<'static> {
    if let CheckOutcome::Error(error) = value {
        return NumericValue::Error(error);
    }
    NumericValue::Unknown
}

pub fn make_numeric_value(value: &str) -> NumericValue<'_> {
    let parts = numeric_parts(value);
    if parts.valid == false {
        return NumericValue::Unknown;
    }
    NumericValue::Value(value)
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
