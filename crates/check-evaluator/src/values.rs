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
    value == -9223372036854775808i64 || value == 9223372036854775807i64 ||
        (value >= -211813488000000000i64 && value < 9223371331200000000i64)
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
        return TimestampValue::Error(SqlError { state: TIMESTAMP_FIELD_OVERFLOW });
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
        return TimestamptzValue::Error(SqlError { state: TIMESTAMP_FIELD_OVERFLOW });
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
            return DateValue::Error(SqlError { state: DATE_FIELD_OVERFLOW });
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

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum TextValue<'a> {
    Unknown,
    Null,
    Value(&'a str),
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

pub fn text_unknown() -> TextValue<'static> {
    TextValue::Unknown
}

pub fn text_null() -> TextValue<'static> {
    TextValue::Null
}

pub fn make_text_value(value: &str) -> TextValue<'_> {
    TextValue::Value(value)
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

pub fn text_from_case_guard(value: CheckOutcome) -> TextValue<'static> {
    if let CheckOutcome::Error(error) = value {
        return TextValue::Error(error);
    }
    TextValue::Unknown
}
