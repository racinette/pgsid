const ENUM_SUPPORT_EMPTY: u32 = 8631360;

fn enum_support_argument(input: EnumValue, count: i32, unknown_valid: bool) -> CheckOutcome {
    let mut unresolved_flavor: i32 = 0;
    if let EnumValue::Unknown = input { unresolved_flavor = 1; };
    if let EnumValue::Error(error) = input {
        return CheckOutcome::Error(error);
    };
    if count < 0 || (input == EnumValue::Unknown && unknown_valid == false) {
        return check_unresolved(unresolved_flavor);
    };
    if let EnumValue::Value(value) = input {
        if value.ordinal < 0 || value.ordinal >= count {
            return check_unresolved(unresolved_flavor);
        };
    };
    CheckOutcome::True
}

fn enum_support_range_values(count: i32, identity: &str, first: i32, last: i32) -> ArrayValue {
    let mut elements: Vec<ArrayElement> = Vec::new();
    let mut ordinal = first;
    while ordinal < count && ordinal <= last {
        let value = make_enum_value(ordinal);
        let element = array_element_from_enum(value);
        elements.push(element);
        ordinal = ordinal + 1;
    }
    let mut dimensions: Vec<ArrayDimension> = Vec::new();
    if elements.len() > 0 {
        dimensions.push(ArrayDimension {
            lower: 1,
            length: elements.len() as i32,
        });
    };
    ArrayValue::Value(ArrayPayload {
        null_bitmap: BoolValue::Value(false),
        element_type: identity.to_owned(),
        element_kind: 6,
        dimensions: dimensions,
        elements: elements,
    })
}

pub fn sql__pg_catalog__enum_range__p6cj(
    input: EnumValue,
    count: i32,
    identity: &str,
    unknown_valid: bool,
) -> ArrayValue {
    let mut unresolved_flavor: i32 = 0;
    if let EnumValue::Unknown = input { unresolved_flavor = 1; };
    let validity = enum_support_argument(input, count, unknown_valid);
    if let CheckOutcome::Error(error) = validity {
        return ArrayValue::Error(error);
    };
    if validity != CheckOutcome::True {
        return array_unresolved(unresolved_flavor);
    };
    enum_support_range_values(count, identity, 0, count - 1)
}

pub fn sql__pg_catalog__enum_range__ecgl(
    lower: EnumValue,
    upper: EnumValue,
    count: i32,
    identity: &str,
    lower_unknown_valid: bool,
    upper_unknown_valid: bool,
) -> ArrayValue {
    let mut unresolved_flavor: i32 = 0;
    if let EnumValue::Unknown = lower { unresolved_flavor = 1; };
    if let EnumValue::Unknown = upper { unresolved_flavor = 1; };
    if let EnumValue::Error(error) = lower {
        return ArrayValue::Error(error);
    };
    if let EnumValue::Error(error) = upper {
        return ArrayValue::Error(error);
    };
    let lower_valid = enum_support_argument(lower, count, lower_unknown_valid);
    let upper_valid = enum_support_argument(upper, count, upper_unknown_valid);
    if lower_valid != CheckOutcome::True || upper_valid != CheckOutcome::True {
        return array_unresolved(unresolved_flavor);
    };
    if count > 1 && (lower == EnumValue::Unknown || upper == EnumValue::Unknown) {
        return array_unresolved(unresolved_flavor);
    };
    let mut first: i32 = 0;
    let mut last: i32 = count - 1;
    if let EnumValue::Value(value) = lower {
        first = value.ordinal;
    };
    if let EnumValue::Value(value) = upper {
        last = value.ordinal;
    };
    enum_support_range_values(count, identity, first, last)
}

fn enum_support_endpoint(
    input: EnumValue,
    count: i32,
    last: bool,
    unknown_valid: bool,
) -> EnumValue {
    let mut unresolved_flavor: i32 = 0;
    if let EnumValue::Unknown = input { unresolved_flavor = 1; };
    let validity = enum_support_argument(input, count, unknown_valid);
    if let CheckOutcome::Error(error) = validity {
        return EnumValue::Error(error);
    };
    if validity != CheckOutcome::True {
        return enum_unresolved(unresolved_flavor);
    };
    if count == 0 {
        return EnumValue::Error(make_sql_error(ENUM_SUPPORT_EMPTY));
    };
    if last {
        return make_enum_value(count - 1);
    };
    make_enum_value(0)
}

pub fn sql__pg_catalog__enum_first__e14q(
    input: EnumValue,
    count: i32,
    unknown_valid: bool,
) -> EnumValue {
    enum_support_endpoint(input, count, false, unknown_valid)
}

pub fn sql__pg_catalog__enum_last__73mc(
    input: EnumValue,
    count: i32,
    unknown_valid: bool,
) -> EnumValue {
    enum_support_endpoint(input, count, true, unknown_valid)
}
