pub fn array_bitmap_union(left: BoolValue, right: BoolValue) -> BoolValue {
    if left == BoolValue::Value(true) || right == BoolValue::Value(true) {
        return BoolValue::Value(true);
    };
    if left == BoolValue::Value(false) && right == BoolValue::Value(false) {
        return BoolValue::Value(false);
    };
    BoolValue::Unknown
}

pub fn array_element_bitmap(input: ArrayElement) -> BoolValue {
    if let ArrayElement::Unknown = input {
        return BoolValue::Unknown;
    };
    if let ArrayElement::Null = input {
        return BoolValue::Value(true);
    };
    if let ArrayElement::Error(error) = input {
        return BoolValue::Error(error);
    };
    BoolValue::Value(false)
}

pub fn array_elements_bitmap(input: &ArrayPayload) -> BoolValue {
    let mut result = BoolValue::Value(false);
    let mut index: usize = 0;
    while index < input.elements.len() {
        result = array_bitmap_union(result, array_element_bitmap(input.elements[index].clone()));
        index += 1;
    }
    result
}

pub fn array_reconstruction_bitmap(input: &ArrayPayload) -> BoolValue {
    if input.null_bitmap == BoolValue::Value(false) {
        return input.null_bitmap;
    };
    array_elements_bitmap(input)
}

pub fn array_bitmap_choice(left: BoolValue, right: BoolValue) -> BoolValue {
    if left == right {
        return left;
    };
    BoolValue::Unknown
}

pub fn array_null_bitmap(input: ArrayValue) -> BoolValue {
    if let ArrayValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if let ArrayValue::Null = input {
        return BoolValue::Null;
    };
    if let ArrayValue::Value(value) = input {
        return value.null_bitmap;
    };
    BoolValue::Unknown
}
