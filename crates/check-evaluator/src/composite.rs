#[derive(Clone)]
pub struct CompositePayload {
    pub type_name: String,
    pub fields: Vec<ArrayElement>,
}

#[derive(Clone)]
pub enum CompositeValue {
    Unknown,
    Null,
    Error(SqlError),
    Value(CompositePayload),
}

pub fn composite_unknown() -> CompositeValue { CompositeValue::Unknown }
pub fn composite_null() -> CompositeValue { CompositeValue::Null }

pub fn composite_from_case_guard(input: CheckOutcome) -> CompositeValue {
    if let CheckOutcome::Error(error) = input { return CompositeValue::Error(error); };
    CompositeValue::Unknown
}

pub fn make_composite_value(input: CompositePayload) -> CompositeValue {
    let identity: Vec<char> = input.type_name.chars().collect();
    if identity.len() == 0 || input.fields.len() > 2147483647 { return CompositeValue::Unknown; };
    let mut index: usize = 0;
    while index < identity.len() {
        if identity[index] == '\0' { return CompositeValue::Unknown; };
        index += 1;
    }
    let mut fields = input.fields;
    index = 0;
    while index < fields.len() {
        let source = fields[index].clone();
        let checked = array_coerced_owned_element(source.clone());
        if let ArrayElement::Error(error) = checked { return CompositeValue::Error(error); };
        if let ArrayElement::Unknown = checked {
            if array_element_family(source) >= 41 { return CompositeValue::Unknown; };
        };
        fields[index] = checked;
        index += 1;
    }
    CompositeValue::Value(CompositePayload { type_name: input.type_name, fields: fields })
}

pub fn composite_from_coerced_value(input: CompositeValue) -> CompositeValue {
    if let CompositeValue::Value(value) = input { return make_composite_value(value); };
    input
}

pub fn make_composite_fields(type_name: &str) -> CompositeValue {
    let fields: Vec<ArrayElement> = Vec::new();
    make_composite_value(CompositePayload { type_name: type_name.to_owned(), fields: fields })
}

pub fn append_composite_field(input: CompositeValue, field: ArrayElement) -> CompositeValue {
    if let CompositeValue::Value(value) = input {
        let mut fields = value.fields;
        fields.push(field);
        return make_composite_value(CompositePayload { type_name: value.type_name, fields: fields });
    };
    input
}

pub fn composite_field_count(input: CompositeValue) -> Int4Value {
    let checked = composite_from_coerced_value(input);
    if let CompositeValue::Error(error) = checked { return Int4Value::Error(error); };
    if let CompositeValue::Null = checked { return Int4Value::Null; };
    if let CompositeValue::Value(value) = checked { return make_int4_value(value.fields.len() as i32); };
    Int4Value::Unknown
}

pub fn composite_field_at(input: CompositeValue, index: Int4Value) -> ArrayElement {
    let checked = composite_from_coerced_value(input);
    if let CompositeValue::Error(error) = checked { return ArrayElement::Error(error); };
    if let Int4Value::Error(error) = index { return ArrayElement::Error(error); };
    if let CompositeValue::Null = checked { return ArrayElement::Null; };
    if let CompositeValue::Value(value) = checked {
        if let Int4Value::Value(offset) = index {
            let position = usize::try_from(offset).unwrap_or(value.fields.len());
            if offset >= 0 && position < value.fields.len() { return value.fields[position].clone(); };
        };
    };
    ArrayElement::Unknown
}

pub fn composite_datum_is_null(input: CompositeValue) -> BoolValue {
    let checked = composite_from_coerced_value(input);
    if let CompositeValue::Error(error) = checked { return BoolValue::Error(error); };
    if let CompositeValue::Unknown = checked { return BoolValue::Unknown; };
    if let CompositeValue::Null = checked { return make_bool_value(true); };
    make_bool_value(false)
}

fn composite_row_null_test(input: CompositeValue, negated: bool) -> BoolValue {
    let checked = composite_from_coerced_value(input);
    if let CompositeValue::Error(error) = checked { return BoolValue::Error(error); };
    if let CompositeValue::Null = checked { return make_bool_value(negated == false); };
    if let CompositeValue::Value(value) = checked {
        let mut unknown = false;
        let mut index: usize = 0;
        while index < value.fields.len() {
            let field = value.fields[index].clone();
            let mut known = true;
            if let ArrayElement::Unknown = field {
                unknown = true;
                known = false;
            };
            if known {
                let mut is_null = false;
                if let ArrayElement::Null = field { is_null = true; };
                if is_null == negated { return make_bool_value(false); };
            };
            index += 1;
        }
        if unknown { return BoolValue::Unknown; };
        return make_bool_value(true);
    };
    BoolValue::Unknown
}

pub fn composite_is_null(input: CompositeValue) -> BoolValue { composite_row_null_test(input, false) }
pub fn composite_is_not_null(input: CompositeValue) -> BoolValue { composite_row_null_test(input, true) }

pub fn array_element_from_composite(input: CompositeValue) -> ArrayElement {
    if let CompositeValue::Error(error) = input { return ArrayElement::Error(error); };
    if let CompositeValue::Null = input { return ArrayElement::Null; };
    if let CompositeValue::Value(value) = input { return ArrayElement::Composite(value); };
    ArrayElement::Unknown
}

pub fn array_element_to_composite(input: ArrayElement) -> CompositeValue {
    if let ArrayElement::Error(error) = input { return CompositeValue::Error(error); };
    if let ArrayElement::Null = input { return CompositeValue::Null; };
    if let ArrayElement::Composite(value) = input { return CompositeValue::Value(value); };
    CompositeValue::Unknown
}
