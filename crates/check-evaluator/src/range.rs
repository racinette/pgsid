#[derive(Clone)]
pub struct RangePayload {
    pub type_name: String,
    pub element_type: String,
    pub element_kind: i32,
    pub empty: bool,
    pub lower_inclusive: bool,
    pub upper_inclusive: bool,
    pub bounds: Vec<ArrayElement>,
}

#[derive(Clone)]
pub enum RangeValue {
    Unknown,
    Null,
    Error(SqlError),
    Value(RangePayload),
}

pub fn range_unknown() -> RangeValue {
    RangeValue::Unknown
}

pub fn range_null() -> RangeValue {
    RangeValue::Null
}

pub fn make_coerced_range_value(input: RangePayload) -> RangeValue {
    if input.type_name.as_str() == "" || input.element_type.as_str() == "" || input.element_kind < 1
    {
        return RangeValue::Unknown;
    };
    if input.empty {
        if input.bounds.len() != 0 || input.lower_inclusive || input.upper_inclusive {
            return RangeValue::Unknown;
        };
        return RangeValue::Value(input);
    };
    if input.bounds.len() != 2 {
        return RangeValue::Unknown;
    };
    let mut index: usize = 0;
    while index < input.bounds.len() {
        let bound = input.bounds[index].clone();
        if let ArrayElement::Error(error) = bound {
            return RangeValue::Error(error);
        };
        let kind = array_element_family(bound.clone());
        if kind != 0 && kind != input.element_kind {
            return RangeValue::Unknown;
        };
        if let ArrayElement::Null = bound {
            if (index == 0 && input.lower_inclusive) || (index == 1 && input.upper_inclusive) {
                return RangeValue::Unknown;
            };
        };
        index += 1;
    }
    RangeValue::Value(input)
}

pub fn range_from_coerced_bounds(
    type_name: &str,
    element_type: &str,
    element_kind: i32,
    empty: bool,
    lower_inclusive: bool,
    upper_inclusive: bool,
    lower: ArrayElement,
    upper: ArrayElement,
) -> RangeValue {
    let mut bounds: Vec<ArrayElement> = Vec::new();
    if empty == false {
        bounds.push(lower);
        bounds.push(upper);
    };
    make_coerced_range_value(RangePayload {
        type_name: type_name.to_owned(),
        element_type: element_type.to_owned(),
        element_kind,
        empty,
        lower_inclusive,
        upper_inclusive,
        bounds,
    })
}

pub fn range_require_type(
    input: RangeValue,
    type_name: &str,
    element_type: &str,
    element_kind: i32,
) -> RangeValue {
    if let RangeValue::Value(value) = input {
        if value.type_name.as_str() != type_name
            || value.element_type.as_str() != element_type
            || value.element_kind != element_kind
        {
            return RangeValue::Unknown;
        };
        return RangeValue::Value(value);
    };
    input
}

pub fn range_is_null(input: RangeValue) -> BoolValue {
    if let RangeValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if let RangeValue::Unknown = input {
        return BoolValue::Unknown;
    };
    if let RangeValue::Null = input {
        return BoolValue::Value(true);
    };
    BoolValue::Value(false)
}

pub fn range_from_case_guard(input: CheckOutcome) -> RangeValue {
    if let CheckOutcome::Error(error) = input {
        return RangeValue::Error(error);
    };
    RangeValue::Unknown
}

pub fn range_empty_state(input: RangeValue) -> BoolValue {
    if let RangeValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if let RangeValue::Null = input {
        return BoolValue::Null;
    };
    if let RangeValue::Value(value) = input {
        return BoolValue::Value(value.empty);
    };
    BoolValue::Unknown
}

pub fn range_bound(input: RangeValue, upper: bool) -> ArrayElement {
    if let RangeValue::Error(error) = input {
        return ArrayElement::Error(error);
    };
    if let RangeValue::Null = input {
        return ArrayElement::Null;
    };
    if let RangeValue::Value(value) = input {
        if value.empty {
            return ArrayElement::Null;
        };
        let mut index: usize = 0;
        if upper {
            index = 1;
        };
        return value.bounds[index].clone();
    };
    ArrayElement::Unknown
}

pub fn range_bound_flag(input: RangeValue, upper: bool, infinite: bool) -> BoolValue {
    if let RangeValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if let RangeValue::Null = input {
        return BoolValue::Null;
    };
    if let RangeValue::Value(value) = input {
        if value.empty {
            return BoolValue::Value(false);
        };
        if infinite {
            let mut index: usize = 0;
            if upper {
                index = 1;
            };
            let bound = value.bounds[index].clone();
            if let ArrayElement::Null = bound {
                return BoolValue::Value(true);
            };
            return BoolValue::Value(false);
        };
        if upper {
            return BoolValue::Value(value.upper_inclusive);
        };
        return BoolValue::Value(value.lower_inclusive);
    };
    BoolValue::Unknown
}
