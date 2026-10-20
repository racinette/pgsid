#[derive(Clone)]
pub struct MultirangePayload {
    pub type_name: String,
    pub range_type: String,
    pub element_type: String,
    pub element_kind: i32,
    pub ranges: Vec<RangeValue>,
}

#[derive(Clone)]
pub enum MultirangeValue {
    Unknown,
    Null,
    Error(SqlError),
    Value(MultirangePayload),
}

pub fn multirange_unknown() -> MultirangeValue {
    MultirangeValue::Unknown
}

pub fn multirange_null() -> MultirangeValue {
    MultirangeValue::Null
}

fn multirange_component_state(input: &MultirangePayload, position: usize) -> BoolValue {
    let span = input.ranges[position].clone();
    let typed = range_require_type(
        span,
        input.range_type.as_str(),
        input.element_type.as_str(),
        input.element_kind,
    );
    if let RangeValue::Error(error) = typed {
        return BoolValue::Error(error);
    };
    if let RangeValue::Value(payload) = typed {
        if payload.empty {
            return BoolValue::Unknown;
        };
        let checked = make_coerced_range_value(payload);
        return range_is_null(checked);
    };
    BoolValue::Unknown
}

pub fn make_coerced_multirange_value(input: MultirangePayload) -> MultirangeValue {
    if input.type_name.as_str() == ""
        || input.range_type.as_str() == ""
        || input.element_type.as_str() == ""
        || input.element_kind < 1
    {
        return MultirangeValue::Unknown;
    };
    let mut index: usize = 0;
    while index < input.ranges.len() {
        let state = multirange_component_state(&input, index);
        if let BoolValue::Error(error) = state {
            return MultirangeValue::Error(error);
        };
        if state != BoolValue::Value(false) {
            return MultirangeValue::Unknown;
        };
        index += 1;
    }
    MultirangeValue::Value(input)
}

pub fn multirange_require_type(
    input: MultirangeValue,
    type_name: &str,
    range_type: &str,
    element_type: &str,
    element_kind: i32,
) -> MultirangeValue {
    if let MultirangeValue::Value(payload) = input {
        if payload.type_name.as_str() != type_name
            || payload.range_type.as_str() != range_type
            || payload.element_type.as_str() != element_type
            || payload.element_kind != element_kind
        {
            return MultirangeValue::Unknown;
        };
        return make_coerced_multirange_value(payload);
    };
    input
}

pub fn multirange_is_null(input: MultirangeValue) -> BoolValue {
    if let MultirangeValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if let MultirangeValue::Null = input {
        return BoolValue::Value(true);
    };
    if let MultirangeValue::Value(_) = input {
        return BoolValue::Value(false);
    };
    BoolValue::Unknown
}

pub fn multirange_from_case_guard(input: CheckOutcome) -> MultirangeValue {
    if let CheckOutcome::Error(error) = input {
        return MultirangeValue::Error(error);
    };
    MultirangeValue::Unknown
}

pub fn multirange_empty_state(input: MultirangeValue) -> BoolValue {
    if let MultirangeValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if let MultirangeValue::Null = input {
        return BoolValue::Null;
    };
    if let MultirangeValue::Value(payload) = input {
        return BoolValue::Value(payload.ranges.len() == 0);
    };
    BoolValue::Unknown
}

fn multirange_boundary_at(input: &MultirangePayload, upper: bool) -> RangeValue {
    if input.ranges.len() == 0 {
        return RangeValue::Null;
    };
    let mut position: usize = 0;
    if upper {
        position = input.ranges.len() - 1;
    };
    input.ranges[position].clone()
}

pub fn multirange_boundary(input: MultirangeValue, upper: bool) -> RangeValue {
    if let MultirangeValue::Error(error) = input {
        return RangeValue::Error(error);
    };
    if let MultirangeValue::Null = input {
        return RangeValue::Null;
    };
    if let MultirangeValue::Value(payload) = input {
        return multirange_boundary_at(&payload, upper);
    };
    RangeValue::Unknown
}

pub fn multirange_bound(input: MultirangeValue, upper: bool) -> ArrayElement {
    let boundary = multirange_boundary(input, upper);
    range_bound(boundary, upper)
}

pub fn multirange_bound_flag(input: MultirangeValue, upper: bool, infinite: bool) -> BoolValue {
    if let MultirangeValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if let MultirangeValue::Null = input {
        return BoolValue::Null;
    };
    if let MultirangeValue::Value(payload) = input {
        if payload.ranges.len() == 0 {
            return BoolValue::Value(false);
        };
        let boundary = multirange_boundary_at(&payload, upper);
        return range_bound_flag(boundary, upper, infinite);
    };
    BoolValue::Unknown
}
