pub fn domain_conversion_start(input: BoolValue, not_null: bool) -> CheckOutcome {
    let mut unresolved_flavor: i32 = 0;
    if let BoolValue::Unknown = input { unresolved_flavor = 1; };
    if let BoolValue::Unimplemented = input { unresolved_flavor = 2; };
    if let BoolValue::Error(error) = input {
        return CheckOutcome::Error(error);
    };
    if input != BoolValue::Value(true) && input != BoolValue::Value(false) {
        return check_unresolved(unresolved_flavor);
    };
    if not_null {
        if input == BoolValue::Value(true) {
            return CheckOutcome::Error(make_sql_error(SQL_ERROR_NOT_NULL_VIOLATION));
        };
    };
    CheckOutcome::True
}

pub fn domain_conversion_continues(input: CheckOutcome) -> bool {
    input == CheckOutcome::True
}

pub fn domain_conversion_check(input: CheckOutcome, result: CheckOutcome) -> CheckOutcome {
    if input != CheckOutcome::True {
        return input;
    };
    if result == CheckOutcome::False {
        return CheckOutcome::Error(make_sql_error(SQL_ERROR_CHECK_VIOLATION));
    };
    if result == CheckOutcome::Null {
        return CheckOutcome::True;
    };
    result
}

pub fn finish_domain_conversion(input: ArrayElement, result: CheckOutcome) -> ArrayElement {
    let mut unresolved_flavor: i32 = 0;
    if let ArrayElement::Unknown = input { unresolved_flavor = 1; };
    if let CheckOutcome::Unknown = result { unresolved_flavor = 1; };
    if let ArrayElement::Unimplemented = input { unresolved_flavor = 2; };
    if let CheckOutcome::Unimplemented = result { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = result {
        return ArrayElement::Error(error);
    };
    let mut condition_flavor_45_4: i32 = unresolved_flavor; if let CheckOutcome::Unknown = result { if condition_flavor_45_4 < 1 { condition_flavor_45_4 = 1; }; }; if let CheckOutcome::Unimplemented = result { condition_flavor_45_4 = 2; }; if (result == CheckOutcome::Unknown || result == CheckOutcome::Unimplemented) {
        return array_element_unresolved(condition_flavor_45_4);
    };
    input
}

pub fn finish_xml_domain_conversion(input: XmlValue, result: CheckOutcome) -> XmlValue {
    let mut unresolved_flavor: i32 = 0;
    if let XmlValue::Unknown = input { unresolved_flavor = 1; };
    if let XmlValue::NonNull(_knowledge) = input { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let CheckOutcome::Unknown = result { unresolved_flavor = 1; };
    if let XmlValue::Unimplemented = input { unresolved_flavor = 2; };
    if let CheckOutcome::Unimplemented = result { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = result {
        return XmlValue::Error(error);
    };
    let mut condition_flavor_60_4: i32 = unresolved_flavor; if let CheckOutcome::Unknown = result { if condition_flavor_60_4 < 1 { condition_flavor_60_4 = 1; }; }; if let CheckOutcome::Unimplemented = result { condition_flavor_60_4 = 2; }; if (result == CheckOutcome::Unknown || result == CheckOutcome::Unimplemented) {
        return xml_unresolved(condition_flavor_60_4);
    };
    input
}

pub fn finish_domain_array_input(input: ArrayTextPayload, converted: ArrayArguments) -> ArrayValue {
    let mut unresolved_flavor: i32 = 0;
    if let ArrayArguments::Unknown = converted { unresolved_flavor = 1; };
    if let ArrayArguments::Unimplemented = converted { unresolved_flavor = 2; };
    let mut condition_flavor_70_4: i32 = unresolved_flavor; if let ArrayArguments::Unknown = converted { if condition_flavor_70_4 < 1 { condition_flavor_70_4 = 1; }; }; if let ArrayArguments::Unknown = converted {
        return array_unresolved(condition_flavor_70_4);
    }; let mut condition_flavor_72_7: i32 = unresolved_flavor; if let ArrayArguments::Unimplemented = converted { condition_flavor_72_7 = 2; }; if let ArrayArguments::Unimplemented = converted {
        return array_unresolved(condition_flavor_72_7);
    };
    finish_prepared_array_text(input, converted)
}

pub fn finish_array_domain_conversion(input: ArrayValue, result: CheckOutcome) -> ArrayValue {
    let mut unresolved_flavor: i32 = 0;
    if let ArrayValue::Unknown = input { unresolved_flavor = 1; };
    if let CheckOutcome::Unknown = result { unresolved_flavor = 1; };
    if let ArrayValue::Unimplemented = input { unresolved_flavor = 2; };
    if let CheckOutcome::Unimplemented = result { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = result {
        return ArrayValue::Error(error);
    };
    let mut condition_flavor_87_4: i32 = unresolved_flavor; if let CheckOutcome::Unknown = result { if condition_flavor_87_4 < 1 { condition_flavor_87_4 = 1; }; }; if let CheckOutcome::Unimplemented = result { condition_flavor_87_4 = 2; }; if (result == CheckOutcome::Unknown || result == CheckOutcome::Unimplemented) {
        return array_unresolved(condition_flavor_87_4);
    };
    input
}

pub fn finish_range_domain_conversion(input: RangeValue, result: CheckOutcome) -> RangeValue {
    let mut unresolved_flavor: i32 = 0;
    if let RangeValue::Unknown = input { unresolved_flavor = 1; };
    if let CheckOutcome::Unknown = result { unresolved_flavor = 1; };
    if let RangeValue::Unimplemented = input { unresolved_flavor = 2; };
    if let CheckOutcome::Unimplemented = result { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = result {
        return RangeValue::Error(error);
    };
    let mut condition_flavor_102_4: i32 = unresolved_flavor; if let CheckOutcome::Unknown = result { if condition_flavor_102_4 < 1 { condition_flavor_102_4 = 1; }; }; if let CheckOutcome::Unimplemented = result { condition_flavor_102_4 = 2; }; if (result == CheckOutcome::Unknown || result == CheckOutcome::Unimplemented) {
        return range_unresolved(condition_flavor_102_4);
    };
    input
}

pub fn finish_multirange_domain_conversion(
    input: MultirangeValue,
    result: CheckOutcome,
) -> MultirangeValue {
    let mut unresolved_flavor: i32 = 0;
    if let MultirangeValue::Unknown = input { unresolved_flavor = 1; };
    if let CheckOutcome::Unknown = result { unresolved_flavor = 1; };
    if let MultirangeValue::Unimplemented = input { unresolved_flavor = 2; };
    if let CheckOutcome::Unimplemented = result { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = result {
        return MultirangeValue::Error(error);
    };
    let mut condition_flavor_120_4: i32 = unresolved_flavor; if let CheckOutcome::Unknown = result { if condition_flavor_120_4 < 1 { condition_flavor_120_4 = 1; }; }; if let CheckOutcome::Unimplemented = result { condition_flavor_120_4 = 2; }; if (result == CheckOutcome::Unknown || result == CheckOutcome::Unimplemented) {
        return multirange_unresolved(condition_flavor_120_4);
    };
    input
}

pub fn finish_tsvector_domain_conversion(input: TsvectorValue, result: CheckOutcome) -> TsvectorValue {
    let mut unresolved_flavor: i32 = 0;
    if let TsvectorValue::Unknown = input { unresolved_flavor = 1; };
    if let CheckOutcome::Unknown = result { unresolved_flavor = 1; };
    if let TsvectorValue::Unimplemented = input { unresolved_flavor = 2; };
    if let CheckOutcome::Unimplemented = result { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = result { return TsvectorValue::Error(error); };
    let mut condition_flavor_133_4: i32 = unresolved_flavor; if let CheckOutcome::Unknown = result { if condition_flavor_133_4 < 1 { condition_flavor_133_4 = 1; }; }; if let CheckOutcome::Unimplemented = result { condition_flavor_133_4 = 2; }; if (result == CheckOutcome::Unknown || result == CheckOutcome::Unimplemented) { return tsvector_unresolved(condition_flavor_133_4); };
    input
}

pub fn finish_tsquery_domain_conversion(input: TsqueryValue, result: CheckOutcome) -> TsqueryValue {
    let mut unresolved_flavor: i32 = 0;
    if let TsqueryValue::Unknown = input { unresolved_flavor = 1; };
    if let CheckOutcome::Unknown = result { unresolved_flavor = 1; };
    if let TsqueryValue::Unimplemented = input { unresolved_flavor = 2; };
    if let CheckOutcome::Unimplemented = result { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = result { return TsqueryValue::Error(error); };
    let mut condition_flavor_144_4: i32 = unresolved_flavor; if let CheckOutcome::Unknown = result { if condition_flavor_144_4 < 1 { condition_flavor_144_4 = 1; }; }; if let CheckOutcome::Unimplemented = result { condition_flavor_144_4 = 2; }; if (result == CheckOutcome::Unknown || result == CheckOutcome::Unimplemented) { return tsquery_unresolved(condition_flavor_144_4); };
    input
}
