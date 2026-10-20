#[derive(Clone, Copy)]
pub struct RangeSupport {
    pub comparison: i32,
    pub canonical: i32,
}

pub fn make_range_support(comparison: i32, canonical: i32) -> RangeSupport {
    RangeSupport {
        comparison,
        canonical,
    }
}

#[derive(Clone)]
pub struct RangeTextPayload {
    pub empty: bool,
    pub lower_present: bool,
    pub upper_present: bool,
    pub lower: String,
    pub upper: String,
    pub flags: String,
}

#[derive(Clone)]
pub enum RangeTextPlan {
    Unknown,
    Null,
    Error(SqlError),
    Value(RangeTextPayload),
}

pub fn range_unknown_support() -> RangeSupport {
    RangeSupport {
        comparison: 0,
        canonical: 0,
    }
}

pub fn range_builtin_support(type_name: &str, element_type: &str, kind: i32) -> RangeSupport {
    if type_name == "pg_catalog.int4range" && element_type == "pg_catalog.int4" && kind == 2 {
        return RangeSupport {
            comparison: 2,
            canonical: 2,
        };
    };
    if type_name == "pg_catalog.int8range" && element_type == "pg_catalog.int8" && kind == 3 {
        return RangeSupport {
            comparison: 3,
            canonical: 3,
        };
    };
    if type_name == "pg_catalog.daterange" && element_type == "pg_catalog.date" && kind == 7 {
        return RangeSupport {
            comparison: 7,
            canonical: 7,
        };
    };
    if type_name == "pg_catalog.numrange" && element_type == "pg_catalog.\"numeric\"" && kind == 10
    {
        return RangeSupport {
            comparison: 10,
            canonical: 1,
        };
    };
    if type_name == "pg_catalog.tsrange" && element_type == "pg_catalog.\"timestamp\"" && kind == 4
    {
        return RangeSupport {
            comparison: 4,
            canonical: 1,
        };
    };
    if type_name == "pg_catalog.tstzrange" && element_type == "pg_catalog.timestamptz" && kind == 5
    {
        return RangeSupport {
            comparison: 5,
            canonical: 1,
        };
    };
    range_unknown_support()
}

pub fn range_support_equal(left: RangeSupport, right: RangeSupport) -> bool {
    left.comparison == right.comparison && left.canonical == right.canonical
}

pub fn range_support_valid(input: RangeSupport, kind: i32) -> bool {
    let comparison = input.comparison == 0
        || (input.comparison == kind
            && (kind == 2 || kind == 3 || kind == 4 || kind == 5 || kind == 7 || kind == 10));
    let canonical = input.canonical == 0
        || input.canonical == 1
        || (input.canonical == kind && (kind == 2 || kind == 3 || kind == 7));
    comparison && canonical
}

#[derive(Clone)]
pub struct RangePayload {
    pub type_name: String,
    pub element_type: String,
    pub element_kind: i32,
    pub support: RangeSupport,
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

fn range_payload_with_support(input: RangePayload, support: RangeSupport) -> RangePayload {
    RangePayload {
        type_name: input.type_name,
        element_type: input.element_type,
        element_kind: input.element_kind,
        support,
        empty: input.empty,
        lower_inclusive: input.lower_inclusive,
        upper_inclusive: input.upper_inclusive,
        bounds: input.bounds,
    }
}

pub fn make_coerced_range_value(input: RangePayload) -> RangeValue {
    let value = input;
    let mut support = value.support;
    if value.type_name.as_str() == "" || value.element_type.as_str() == "" || value.element_kind < 1
    {
        return RangeValue::Unknown;
    };
    if range_support_equal(support, range_unknown_support()) {
        support = range_builtin_support(
            value.type_name.as_str(),
            value.element_type.as_str(),
            value.element_kind,
        );
    };
    if range_support_valid(support, value.element_kind) == false {
        return RangeValue::Unknown;
    };
    let expected = range_builtin_support(
        value.type_name.as_str(),
        value.element_type.as_str(),
        value.element_kind,
    );
    if range_support_equal(expected, range_unknown_support()) == false
        && range_support_equal(support, expected) == false
    {
        return RangeValue::Unknown;
    };
    if value.empty {
        if value.bounds.len() != 0 || value.lower_inclusive || value.upper_inclusive {
            return RangeValue::Unknown;
        };
        return RangeValue::Value(range_payload_with_support(value, support));
    };
    if value.bounds.len() != 2 {
        return RangeValue::Unknown;
    };
    let mut index: usize = 0;
    while index < value.bounds.len() {
        let bound = value.bounds[index].clone();
        if let ArrayElement::Error(error) = bound {
            return RangeValue::Error(error);
        };
        let kind = array_element_family(bound.clone());
        if kind != 0 && kind != value.element_kind {
            return RangeValue::Unknown;
        };
        if let ArrayElement::Null = bound {
            if (index == 0 && value.lower_inclusive) || (index == 1 && value.upper_inclusive) {
                return RangeValue::Unknown;
            };
        };
        index += 1;
    }
    RangeValue::Value(range_payload_with_support(value, support))
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
    let support = range_builtin_support(type_name, element_type, element_kind);
    range_from_profiled_bounds(
        type_name,
        element_type,
        element_kind,
        empty,
        lower_inclusive,
        upper_inclusive,
        lower,
        upper,
        support,
    )
}

pub fn range_from_profiled_bounds(
    type_name: &str,
    element_type: &str,
    element_kind: i32,
    empty: bool,
    lower_inclusive: bool,
    upper_inclusive: bool,
    lower: ArrayElement,
    upper: ArrayElement,
    support: RangeSupport,
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
        support,
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
        let expected = range_builtin_support(type_name, element_type, element_kind);
        if range_support_equal(expected, range_unknown_support()) == false
            && range_support_equal(value.support, expected) == false
        {
            return RangeValue::Unknown;
        };
        return RangeValue::Value(value);
    };
    input
}

pub fn range_from_coerced_profile(
    input: RangeValue,
    type_name: &str,
    element_type: &str,
    element_kind: i32,
    comparison: i32,
    canonical: i32,
) -> RangeValue {
    if let RangeValue::Value(payload) = input {
        if payload.type_name.as_str() != type_name
            || payload.element_type.as_str() != element_type
            || payload.element_kind != element_kind
        {
            return RangeValue::Unknown;
        };
        let support = RangeSupport {
            comparison,
            canonical,
        };
        return make_coerced_range_value(range_payload_with_support(payload, support));
    };
    input
}

pub fn range_require_support(input: RangeValue, expected: RangeSupport) -> RangeValue {
    if let RangeValue::Value(value) = input {
        if range_support_equal(value.support, expected) == false {
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
