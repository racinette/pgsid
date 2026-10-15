#[derive(Clone, Copy)]
pub struct JsonpathNode {
    pub kind: i32,
    pub next: usize,
    pub left: usize,
    pub right: usize,
    pub text_start: usize,
    pub text_end: usize,
    pub first: i32,
    pub last: i32,
    pub flags: i32,
}

#[derive(Clone)]
pub struct JsonpathPayload {
    pub characters: Vec<char>,
    pub nodes: Vec<JsonpathNode>,
    pub root: usize,
    pub lax: bool,
}

#[derive(Clone)]
pub enum JsonpathValue {
    Unknown,
    Null,
    Value(JsonpathPayload),
    Error(SqlError),
}

pub fn jsonpath_unknown() -> JsonpathValue {
    JsonpathValue::Unknown
}

pub fn jsonpath_null() -> JsonpathValue {
    JsonpathValue::Null
}

pub fn jsonpath_is_null(input: JsonpathValue) -> BoolValue {
    if let JsonpathValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if let JsonpathValue::Unknown = input {
        return BoolValue::Unknown;
    };
    if let JsonpathValue::Null = input {
        return BoolValue::Value(true);
    };
    BoolValue::Value(false)
}

pub fn jsonpath_from_case_guard(input: CheckOutcome) -> JsonpathValue {
    if let CheckOutcome::Error(error) = input {
        return JsonpathValue::Error(error);
    };
    JsonpathValue::Unknown
}
