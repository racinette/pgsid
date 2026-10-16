#[derive(Clone, Copy)]
pub struct ArrayDimension {
    pub lower: i32,
    pub length: i32,
}

#[derive(Clone)]
pub struct ArrayPayload {
    pub element_type: String,
    pub element_kind: i32,
    pub dimensions: Vec<ArrayDimension>,
    pub elements: Vec<ArrayElement>,
}

#[derive(Clone)]
pub enum ArrayValue {
    Unknown,
    Null,
    Error(SqlError),
    Value(ArrayPayload),
}

#[derive(Clone)]
pub enum ArrayArguments {
    Unknown,
    Error(SqlError),
    Value(ArrayPayload),
}

pub fn array_unknown() -> ArrayValue {
    ArrayValue::Unknown
}

pub fn array_null() -> ArrayValue {
    ArrayValue::Null
}

pub fn array_is_null(input: ArrayValue) -> BoolValue {
    if let ArrayValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if let ArrayValue::Unknown = input {
        return BoolValue::Unknown;
    };
    if let ArrayValue::Null = input {
        return BoolValue::Value(true);
    };
    BoolValue::Value(false)
}

pub fn array_from_case_guard(input: CheckOutcome) -> ArrayValue {
    if let CheckOutcome::Error(error) = input {
        return ArrayValue::Error(error);
    };
    ArrayValue::Unknown
}

pub fn make_array_value(input: ArrayPayload) -> ArrayValue {
    let mut position: usize = 0;
    while position < input.elements.len() {
        let element = input.elements[position].clone();
        if let ArrayElement::Error(error) = element {
            return ArrayValue::Error(error);
        };
        position += 1;
    }
    let identity: Vec<char> = input.element_type.chars().collect();
    if identity.len() == 0 || input.element_kind < 1 || input.element_kind > 40 {
        return ArrayValue::Unknown;
    };
    position = 0;
    while position < identity.len() {
        if identity[position] == '\0' {
            return ArrayValue::Unknown;
        };
        position += 1;
    }
    if input.dimensions.len() > 6 {
        return ArrayValue::Unknown;
    };
    let mut count: i64 = 0i64;
    if input.dimensions.len() > 0 {
        count = 1i64;
    };
    position = 0;
    while position < input.dimensions.len() {
        let dimension = input.dimensions[position];
        if dimension.length <= 0 {
            return ArrayValue::Unknown;
        };
        let length = dimension.length as i64;
        let end = (dimension.lower as i64) + length;
        if end > 2147483647i64 || count > 2147483647i64 / length {
            return ArrayValue::Unknown;
        };
        count = count * length;
        position += 1;
    }
    if count != (input.elements.len() as i32) as i64 {
        return ArrayValue::Unknown;
    };
    position = 0;
    while position < input.elements.len() {
        let kind = array_element_family(input.elements[position].clone());
        if kind != 0 && kind != input.element_kind {
            return ArrayValue::Unknown;
        };
        position += 1;
    }
    ArrayValue::Value(input)
}

pub fn array_from_coerced_value(
    input: ArrayValue,
    element_type: &str,
    element_kind: i32,
) -> ArrayValue {
    if let ArrayValue::Value(value) = input {
        if value.element_type != element_type || value.element_kind != element_kind {
            return ArrayValue::Unknown;
        };
        return make_array_value(value);
    };
    input
}

pub fn make_array_arguments(element_type: &str, element_kind: i32) -> ArrayArguments {
    let dimensions: Vec<ArrayDimension> = Vec::new();
    let elements: Vec<ArrayElement> = Vec::new();
    ArrayArguments::Value(ArrayPayload {
        element_type: element_type.to_owned(),
        element_kind: element_kind,
        dimensions: dimensions,
        elements: elements,
    })
}

pub fn append_array_dimension(input: ArrayArguments, lower: i32, length: i32) -> ArrayArguments {
    if let ArrayArguments::Value(value) = input {
        let mut dimensions = value.dimensions;
        dimensions.push(ArrayDimension {
            lower: lower,
            length: length,
        });
        return ArrayArguments::Value(ArrayPayload {
            element_type: value.element_type,
            element_kind: value.element_kind,
            dimensions: dimensions,
            elements: value.elements,
        });
    };
    input
}

pub fn append_array_argument(input: ArrayArguments, element: ArrayElement) -> ArrayArguments {
    if let ArrayArguments::Error(_) = input {
        return input;
    };
    if let ArrayElement::Error(error) = element {
        return ArrayArguments::Error(error);
    };
    if let ArrayArguments::Value(value) = input {
        let mut elements = value.elements;
        elements.push(element);
        return ArrayArguments::Value(ArrayPayload {
            element_type: value.element_type,
            element_kind: value.element_kind,
            dimensions: value.dimensions,
            elements: elements,
        });
    };
    input
}

pub fn finish_array_arguments(input: ArrayArguments) -> ArrayValue {
    if let ArrayArguments::Error(error) = input {
        return ArrayValue::Error(error);
    };
    if let ArrayArguments::Value(value) = input {
        return make_array_value(value);
    };
    ArrayValue::Unknown
}

pub fn array_flat_element(input: ArrayValue, offset: Int4Value) -> ArrayElement {
    if let ArrayValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let Int4Value::Error(error) = offset {
        return ArrayElement::Error(error);
    };
    if let ArrayValue::Null = input {
        return ArrayElement::Null;
    };
    if let Int4Value::Null = offset {
        return ArrayElement::Null;
    };
    if let ArrayValue::Value(value) = input {
        if let Int4Value::Value(index) = offset {
            if index < 0 {
                return ArrayElement::Null;
            };
            let position = usize::try_from(index).unwrap_or(0);
            if position >= value.elements.len() {
                return ArrayElement::Null;
            };
            return value.elements[position].clone();
        };
    };
    ArrayElement::Unknown
}
