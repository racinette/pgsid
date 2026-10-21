const RANGE_SET_NONCONTIGUOUS: u32 = 3452544;

fn range_empty_like(input: &RangePayload) -> RangeValue {
    range_from_defined_bounds(
        input.type_name.as_str(),
        input.element_type.as_str(),
        input.element_kind,
        true,
        false,
        false,
        ArrayElement::Null,
        ArrayElement::Null,
        input.support,
        input.enum_labels.as_str(),
        input.enum_count,
    )
}

fn range_copy_payload(input: &RangePayload) -> RangeValue {
    if input.empty {
        return range_empty_like(input);
    };
    range_from_defined_bounds(
        input.type_name.as_str(),
        input.element_type.as_str(),
        input.element_kind,
        false,
        input.lower_inclusive,
        input.upper_inclusive,
        input.bounds[0].clone(),
        input.bounds[1].clone(),
        input.support,
        input.enum_labels.as_str(),
        input.enum_count,
    )
}

fn range_rebuild(
    input: &RangePayload,
    lower: ArrayElement,
    upper: ArrayElement,
    lower_inc: bool,
    upper_inc: bool,
) -> RangeValue {
    let initial = range_profile_serialize(
        input.type_name.as_str(),
        input.element_type.as_str(),
        input.element_kind,
        lower,
        upper,
        lower_inc,
        upper_inc,
        input.support,
        input.enum_labels.as_str(),
        input.enum_count,
    );
    range_builtin_canonical(initial)
}

fn range_payload_difference(left: &RangePayload, right: &RangePayload) -> RangeValue {
    if left.empty || right.empty {
        return range_copy_payload(left);
    };
    let ll = range_endpoint_compare(left, false, right, false);
    if let Int4Value::Error(error) = ll {
        return RangeValue::Error(error);
    };
    let lu = range_endpoint_compare(left, false, right, true);
    if let Int4Value::Error(error) = lu {
        return RangeValue::Error(error);
    };
    let ul = range_endpoint_compare(left, true, right, false);
    if let Int4Value::Error(error) = ul {
        return RangeValue::Error(error);
    };
    let uu = range_endpoint_compare(left, true, right, true);
    if let Int4Value::Error(error) = uu {
        return RangeValue::Error(error);
    };
    if let Int4Value::Value(c_ll) = ll {
        if let Int4Value::Value(c_lu) = lu {
            if let Int4Value::Value(c_ul) = ul {
                if let Int4Value::Value(c_uu) = uu {
                    if c_ll < 0 && c_uu > 0 {
                        return RangeValue::Error(make_sql_error(RANGE_SET_NONCONTIGUOUS));
                    };
                    if c_lu > 0 || c_ul < 0 {
                        return range_copy_payload(left);
                    };
                    if c_ll >= 0 && c_uu <= 0 {
                        return range_empty_like(left);
                    };
                    if c_ll <= 0 && c_ul >= 0 && c_uu <= 0 {
                        let lower = left.bounds[0].clone();
                        let upper = right.bounds[0].clone();
                        return range_rebuild(
                            left,
                            lower,
                            upper,
                            left.lower_inclusive,
                            right.lower_inclusive == false,
                        );
                    };
                    if c_ll >= 0 && c_uu >= 0 && c_lu <= 0 {
                        let lower = right.bounds[1].clone();
                        let upper = left.bounds[1].clone();
                        return range_rebuild(
                            left,
                            lower,
                            upper,
                            right.upper_inclusive == false,
                            left.upper_inclusive,
                        );
                    };
                };
            };
        };
    };
    RangeValue::Unknown
}

fn range_payload_set(left: &RangePayload, right: &RangePayload, strategy: i32) -> RangeValue {
    if strategy == 4 {
        return range_payload_difference(left, right);
    };
    if strategy == 3 && (left.empty || right.empty) {
        return range_empty_like(left);
    };
    if left.empty {
        return range_copy_payload(right);
    };
    if right.empty {
        return range_copy_payload(left);
    };
    if strategy == 1 || strategy == 3 {
        let overlap = range_payload_relation(left, right, 8);
        if let BoolValue::Error(error) = overlap {
            return RangeValue::Error(error);
        };
        let mut known = false;
        if let BoolValue::Value(overlapping) = overlap {
            known = true;
            if overlapping == false {
                if strategy == 3 {
                    return range_empty_like(left);
                };
                let adjacent = range_payload_relation(left, right, 7);
                if let BoolValue::Error(error) = adjacent {
                    return RangeValue::Error(error);
                };
                if let BoolValue::Unknown = adjacent {
                    return RangeValue::Unknown;
                };
                if let BoolValue::Value(connected) = adjacent {
                    if connected == false {
                        return RangeValue::Error(make_sql_error(RANGE_SET_NONCONTIGUOUS));
                    };
                };
            };
        };
        if known == false {
            return RangeValue::Unknown;
        };
    };
    let lo = range_endpoint_compare(left, false, right, false);
    if let Int4Value::Error(error) = lo {
        return RangeValue::Error(error);
    };
    if let Int4Value::Value(lower_order) = lo {
        let hi = range_endpoint_compare(left, true, right, true);
        if let Int4Value::Error(error) = hi {
            return RangeValue::Error(error);
        };
        if let Int4Value::Value(upper_order) = hi {
            let mut lower = right.bounds[0].clone();
            let mut upper = right.bounds[1].clone();
            let mut lower_inc = right.lower_inclusive;
            let mut upper_inc = right.upper_inclusive;
            if (strategy == 3 && lower_order >= 0) || (strategy != 3 && lower_order < 0) {
                lower = left.bounds[0].clone();
                lower_inc = left.lower_inclusive;
            };
            if (strategy == 3 && upper_order <= 0) || (strategy != 3 && upper_order > 0) {
                upper = left.bounds[1].clone();
                upper_inc = left.upper_inclusive;
            };
            return range_rebuild(left, lower, upper, lower_inc, upper_inc);
        };
    };
    RangeValue::Unknown
}

fn range_set(left: RangeValue, right: RangeValue, strategy: i32) -> RangeValue {
    if let RangeValue::Error(error) = left {
        return RangeValue::Error(error);
    };
    if let RangeValue::Error(error) = right {
        return RangeValue::Error(error);
    };
    if let RangeValue::Null = left {
        return RangeValue::Null;
    };
    if let RangeValue::Null = right {
        return RangeValue::Null;
    };
    if let RangeValue::Value(a) = left {
        if let RangeValue::Value(b) = right {
            if range_same_family(&a, &b) {
                return range_payload_set(&a, &b, strategy);
            };
        };
    };
    RangeValue::Unknown
}

pub fn sql__pg_catalog__range_union__8koj(left: RangeValue, right: RangeValue) -> RangeValue {
    range_set(left, right, 1)
}

pub fn sql__pg_catalog__range_merge__b43r(left: RangeValue, right: RangeValue) -> RangeValue {
    range_set(left, right, 2)
}

pub fn sql__pg_catalog__range_intersect__4pce(left: RangeValue, right: RangeValue) -> RangeValue {
    range_set(left, right, 3)
}

pub fn sql__pg_catalog__range_minus__f67g(left: RangeValue, right: RangeValue) -> RangeValue {
    range_set(left, right, 4)
}
