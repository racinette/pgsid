#[derive(Clone, Copy, PartialEq, Eq)]
pub enum Int4Value {
    Unknown,
    Null,
    Value(i32),
    Error(SqlError),
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

pub fn text_from_case_guard(value: CheckOutcome) -> TextValue<'static> {
    if let CheckOutcome::Error(error) = value {
        return TextValue::Error(error);
    }
    TextValue::Unknown
}
