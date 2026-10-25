#[derive(Clone)]
pub struct MultirangePayload {
    pub type_name: String,
    pub range_type: String,
    pub element_type: String,
    pub element_kind: i32,
    pub support: RangeSupport,
    pub ranges: Vec<RangeValue>,
}

pub fn multirange_payload_with_ranges(input: MultirangePayload, ranges: Vec<RangeValue>) -> MultirangePayload {
    MultirangePayload {type_name:input.type_name,range_type:input.range_type,element_type:input.element_type,
        element_kind:input.element_kind,support:input.support,ranges:ranges}
}

#[derive(Clone)]
pub enum MultirangeValue {
    Unknown,
    Null,
    Error(SqlError),
    Value(MultirangePayload),
}

#[derive(Clone)]
pub struct MultirangeTextPayload {
    pub characters: Vec<char>,
    pub position: usize,
    pub member: String,
    pub started: bool,
    pub ranges: Vec<RangeValue>,
    pub state: i32,
    pub error: SqlError,
}

#[derive(Clone)]
pub enum MultirangeTextPlan {
    Value(MultirangeTextPayload),
}

pub fn multirange_unknown() -> MultirangeValue {
    MultirangeValue::Unknown
}

pub fn multirange_null() -> MultirangeValue {
    MultirangeValue::Null
}

fn multirange_component(
    input: &MultirangePayload,
    position: usize,
    support: RangeSupport,
) -> RangeValue {
    let mut span = input.ranges[position].clone();
    if let RangeValue::Value(payload) = span {
        span = make_coerced_range_value(payload);
    };
    let typed = range_require_type(
        span,
        input.range_type.as_str(),
        input.element_type.as_str(),
        input.element_kind,
    );
    let supported = range_require_support(typed, support);
    if let RangeValue::Error(error) = supported {
        return RangeValue::Error(error);
    };
    if let RangeValue::Value(payload) = supported {
        if payload.empty {
            return RangeValue::Unknown;
        };
        return RangeValue::Value(payload);
    };
    RangeValue::Unknown
}

pub fn make_coerced_multirange_value(input: MultirangePayload) -> MultirangeValue {
    let payload = input;
    let mut support = payload.support;
    if payload.type_name.as_str() == ""
        || payload.range_type.as_str() == ""
        || payload.element_type.as_str() == ""
        || payload.element_kind < 1
    {
        return MultirangeValue::Unknown;
    };
    let expected = range_builtin_support(
        payload.range_type.as_str(),
        payload.element_type.as_str(),
        payload.element_kind,
    );
    if range_support_equal(support, range_unknown_support()) {
        support = expected;
    };
    if range_support_valid(support, payload.element_kind) == false {
        return MultirangeValue::Unknown;
    };
    if range_support_equal(expected, range_unknown_support()) == false
        && range_support_equal(support, expected) == false
    {
        return MultirangeValue::Unknown;
    };
    let mut ranges: Vec<RangeValue> = Vec::new();
    let mut index: usize = 0;
    while index < payload.ranges.len() {
        let member = multirange_component(&payload, index, support);
        if let RangeValue::Error(error) = member {
            return MultirangeValue::Error(error);
        };
        let mut known = false;
        if let RangeValue::Value(span) = member {
            ranges.push(RangeValue::Value(span));
            known = true;
        };
        if known == false {
            return MultirangeValue::Unknown;
        };
        index += 1;
    }
    MultirangeValue::Value(MultirangePayload {
        type_name: payload.type_name,
        range_type: payload.range_type,
        element_type: payload.element_type,
        element_kind: payload.element_kind,
        support,
        ranges,
    })
}

pub fn multirange_from_profiled_ranges(
    type_name: &str,
    range_type: &str,
    element_type: &str,
    element_kind: i32,
    ranges: Vec<RangeValue>,
    support: RangeSupport,
) -> MultirangeValue {
    make_coerced_multirange_value(MultirangePayload {
        type_name: type_name.to_owned(),
        range_type: range_type.to_owned(),
        element_type: element_type.to_owned(),
        element_kind,
        support,
        ranges,
    })
}

pub fn multirange_from_coerced_array(
    input: ArrayValue,
    type_name: &str,
    range_type: &str,
    element_type: &str,
    element_kind: i32,
    support: RangeSupport,
) -> MultirangeValue {
    let coerced = array_from_coerced_value(input, range_type, 42);
    if let ArrayValue::Error(error) = coerced {
        return MultirangeValue::Error(error);
    };
    if let ArrayValue::Value(payload) = coerced {
        if payload.element_type.as_str() != range_type || payload.element_kind != 42
            || payload.dimensions.len() > 1
        {
            return MultirangeValue::Unknown;
        };
        let mut ranges: Vec<RangeValue> = Vec::new();
        let mut index: usize = 0;
        while index < payload.elements.len() {
            ranges.push(array_element_to_range(payload.elements[index].clone()));
            index += 1;
        };
        return multirange_from_profiled_ranges(type_name, range_type, element_type, element_kind, ranges, support);
    };
    MultirangeValue::Unknown
}

pub fn multirange_from_coerced_profile(
    input: MultirangeValue,
    type_name: &str,
    range_type: &str,
    element_type: &str,
    element_kind: i32,
    comparison: i32,
    canonical: i32,
) -> MultirangeValue {
    multirange_from_coerced_defined_profile(input, type_name, range_type, element_type, element_kind, comparison, canonical, "", -1)
}

pub fn multirange_from_coerced_defined_profile(
    input: MultirangeValue,
    type_name: &str,
    range_type: &str,
    element_type: &str,
    element_kind: i32,
    comparison: i32,
    canonical: i32,
    labels: &str,
    count: i32,
) -> MultirangeValue {
    if let MultirangeValue::Value(payload) = input {
        if payload.type_name.as_str() != type_name
            || payload.range_type.as_str() != range_type
            || payload.element_type.as_str() != element_type
            || payload.element_kind != element_kind
        {
            return MultirangeValue::Unknown;
        };
        let mut ranges = payload.ranges;
        let mut index: usize = 0;
        while index < ranges.len() {
            if count >= 0 {
                ranges[index] = range_from_coerced_defined_profile(ranges[index].clone(), range_type, element_type, element_kind, comparison, canonical, labels, count);
            } else {
            ranges[index] = range_from_coerced_profile(
                ranges[index].clone(),
                range_type,
                element_type,
                element_kind,
                comparison,
                canonical,
            );
            };
            index += 1;
        }
        return multirange_from_profiled_ranges(
            type_name,
            range_type,
            element_type,
            element_kind,
            ranges,
            RangeSupport {
                comparison,
                canonical,
            },
        );
    };
    input
}

pub fn multirange_from_coerced_typed_profile(input: MultirangeValue, type_name: &str,
    range_type: &str, element_type: &str, element_kind: i32, comparison: i32,
    canonical: i32, bound_profile: RangeBoundContext) -> MultirangeValue {
    if let MultirangeValue::Value(payload)=input {
        if payload.type_name.as_str()!=type_name || payload.range_type.as_str()!=range_type
            || payload.element_type.as_str()!=element_type || payload.element_kind!=element_kind {
            return MultirangeValue::Unknown;
        };
        let mut ranges=payload.ranges;
        let mut index:usize=0;
        while index<ranges.len() {
            ranges[index]=range_from_coerced_typed_profile(ranges[index].clone(),range_type,
                element_type,element_kind,comparison,canonical,bound_profile.clone());
            index+=1;
        }
        return multirange_from_profiled_ranges(type_name,range_type,element_type,element_kind,
            ranges,make_range_support(comparison,canonical));
    };
    input
}

pub fn multirange_require_support(
    input: MultirangeValue,
    expected: RangeSupport,
) -> MultirangeValue {
    if let MultirangeValue::Value(payload) = input {
        if range_support_equal(payload.support, expected) == false {
            return MultirangeValue::Unknown;
        };
        return MultirangeValue::Value(payload);
    };
    input
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
