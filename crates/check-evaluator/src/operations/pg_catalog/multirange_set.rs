fn multirange_set_range_known(input: RangeValue) -> bool {
    if let RangeValue::Value(_) = input {
        return true;
    };
    false
}

fn multirange_set_range_failure(input: RangeValue) -> MultirangeValue {
    if let RangeValue::Error(error) = input {
        return MultirangeValue::Error(error);
    };
    MultirangeValue::Unknown
}

fn multirange_set_boolean_failure(input: BoolValue) -> MultirangeValue {
    if let BoolValue::Error(error) = input {
        return MultirangeValue::Error(error);
    };
    MultirangeValue::Unknown
}

fn multirange_set_result(input: &MultirangePayload, ranges: Vec<RangeValue>) -> MultirangeValue {
    multirange_construct_normalize(MultirangePayload {
        type_name: input.type_name.clone(),
        range_type: input.range_type.clone(),
        element_type: input.element_type.clone(),
        element_kind: input.element_kind,
        support: input.support,
        ranges,
    })
}

fn multirange_set_union(left: &MultirangePayload, right: &MultirangePayload) -> MultirangeValue {
    let mut ranges: Vec<RangeValue> = Vec::new();
    let mut index: usize = 0;
    while index < left.ranges.len() {
        ranges.push(left.ranges[index].clone());
        index += 1;
    }
    index = 0;
    while index < right.ranges.len() {
        ranges.push(right.ranges[index].clone());
        index += 1;
    }
    multirange_set_result(left, ranges)
}

fn multirange_set_split(left: RangeValue, right: RangeValue) -> BoolValue {
    if let RangeValue::Error(error) = left {
        return BoolValue::Error(error);
    };
    if let RangeValue::Error(error) = right {
        return BoolValue::Error(error);
    };
    if let RangeValue::Value(a) = left {
        if let RangeValue::Value(b) = right {
            let lo = range_endpoint_compare(&a, false, &b, false);
            if let Int4Value::Error(error) = lo {
                return BoolValue::Error(error);
            };
            if let Int4Value::Value(lower_order) = lo {
                if lower_order >= 0 {
                    return BoolValue::Value(false);
                };
                let hi = range_endpoint_compare(&a, true, &b, true);
                return range_order_boolean(hi, 5);
            };
        };
    };
    BoolValue::Unknown
}

fn multirange_set_cut(left: RangeValue, right: RangeValue, upper: bool) -> RangeValue {
    if let RangeValue::Error(error) = left {
        return RangeValue::Error(error);
    };
    if let RangeValue::Error(error) = right {
        return RangeValue::Error(error);
    };
    if let RangeValue::Value(a) = left {
        if let RangeValue::Value(b) = right {
            if upper {
                return range_rebuild(
                    &a,
                    b.bounds[1].clone(),
                    a.bounds[1].clone(),
                    b.upper_inclusive == false,
                    a.upper_inclusive,
                );
            };
            return range_rebuild(
                &a,
                a.bounds[0].clone(),
                b.bounds[0].clone(),
                a.lower_inclusive,
                b.lower_inclusive == false,
            );
        };
    };
    RangeValue::Unknown
}

fn multirange_set_difference(
    left: &MultirangePayload,
    right: &MultirangePayload,
) -> MultirangeValue {
    let mut ranges: Vec<RangeValue> = Vec::new();
    let mut li: usize = 0;
    let mut ri: usize = 0;
    while li < left.ranges.len() {
        let mut current = left.ranges[li].clone();
        if multirange_set_range_known(current.clone()) == false {
            return multirange_set_range_failure(current);
        };
        let mut advancing = true;
        while ri < right.ranges.len() && advancing {
            let before = range_relation(right.ranges[ri].clone(), current.clone(), 1);
            if before == BoolValue::Value(true) {
                ri += 1;
            } else {
                if before != BoolValue::Value(false) {
                    return multirange_set_boolean_failure(before);
                };
                advancing = false;
            };
        }
        let mut cutting = true;
        while ri < right.ranges.len() && cutting {
            let other = right.ranges[ri].clone();
            let split = multirange_set_split(current.clone(), other.clone());
            if split == BoolValue::Value(true) {
                let low = multirange_set_cut(current.clone(), other.clone(), false);
                if multirange_set_range_known(low.clone()) == false {
                    return multirange_set_range_failure(low);
                };
                ranges.push(low);
                current = multirange_set_cut(current, other, true);
                if multirange_set_range_known(current.clone()) == false {
                    return multirange_set_range_failure(current);
                };
                ri += 1;
            } else {
                if split != BoolValue::Value(false) {
                    return multirange_set_boolean_failure(split);
                };
                let overlap = range_relation(current.clone(), other.clone(), 8);
                if overlap == BoolValue::Value(true) {
                    current = range_set(current, other.clone(), 4);
                    if multirange_set_range_known(current.clone()) == false {
                        return multirange_set_range_failure(current);
                    };
                    if range_empty_state(current.clone()) == BoolValue::Value(true) {
                        cutting = false;
                    } else {
                        let before = range_relation(current.clone(), other, 1);
                        if before == BoolValue::Value(true) {
                            cutting = false;
                        } else {
                            if before != BoolValue::Value(false) {
                                return multirange_set_boolean_failure(before);
                            };
                            ri += 1;
                        };
                    };
                } else {
                    if overlap != BoolValue::Value(false) {
                        return multirange_set_boolean_failure(overlap);
                    };
                    cutting = false;
                };
            };
        }
        ranges.push(current);
        li += 1;
    }
    multirange_set_result(left, ranges)
}

fn multirange_set_intersection(
    left: &MultirangePayload,
    right: &MultirangePayload,
) -> MultirangeValue {
    let mut ranges: Vec<RangeValue> = Vec::new();
    let mut li: usize = 0;
    let mut ri: usize = 0;
    while li < left.ranges.len() && ri < right.ranges.len() {
        let current = left.ranges[li].clone();
        let mut advancing = true;
        while ri < right.ranges.len() && advancing {
            let before = range_relation(right.ranges[ri].clone(), current.clone(), 1);
            if before == BoolValue::Value(true) {
                ri += 1;
            } else {
                if before != BoolValue::Value(false) {
                    return multirange_set_boolean_failure(before);
                };
                advancing = false;
            };
        }
        let mut intersecting = true;
        while ri < right.ranges.len() && intersecting {
            let other = right.ranges[ri].clone();
            let overlap = range_relation(current.clone(), other.clone(), 8);
            if overlap == BoolValue::Value(true) {
                let part = range_set(current.clone(), other.clone(), 3);
                if multirange_set_range_known(part.clone()) == false {
                    return multirange_set_range_failure(part);
                };
                ranges.push(part);
                let consumed = range_relation(other, current.clone(), 3);
                if consumed == BoolValue::Value(true) {
                    ri += 1;
                } else {
                    if consumed != BoolValue::Value(false) {
                        return multirange_set_boolean_failure(consumed);
                    };
                    intersecting = false;
                };
            } else {
                if overlap != BoolValue::Value(false) {
                    return multirange_set_boolean_failure(overlap);
                };
                intersecting = false;
            };
        }
        li += 1;
    }
    multirange_set_result(left, ranges)
}

fn multirange_set(left: MultirangeValue, right: MultirangeValue, strategy: i32) -> MultirangeValue {
    if let MultirangeValue::Error(error) = left {
        return MultirangeValue::Error(error);
    };
    if let MultirangeValue::Error(error) = right {
        return MultirangeValue::Error(error);
    };
    if let MultirangeValue::Null = left {
        return MultirangeValue::Null;
    };
    if let MultirangeValue::Null = right {
        return MultirangeValue::Null;
    };
    if let MultirangeValue::Value(a) = left {
        if let MultirangeValue::Value(b) = right {
            if multirange_same_family(&a, &b) == false {
                return MultirangeValue::Unknown;
            };
            if strategy == 3 && (a.ranges.len() == 0 || b.ranges.len() == 0) {
                let empty: Vec<RangeValue> = Vec::new();
                return multirange_set_result(&a, empty);
            };
            if a.ranges.len() == 0 {
                if strategy == 1 {
                    return MultirangeValue::Value(b);
                };
                return MultirangeValue::Value(a);
            };
            if b.ranges.len() == 0 {
                return MultirangeValue::Value(a);
            };
            if strategy == 1 {
                return multirange_set_union(&a, &b);
            };
            if strategy == 3 {
                return multirange_set_intersection(&a, &b);
            };
            return multirange_set_difference(&a, &b);
        };
    };
    MultirangeValue::Unknown
}

pub fn sql__pg_catalog__multirange_union__3oae(
    left: MultirangeValue,
    right: MultirangeValue,
) -> MultirangeValue {
    multirange_set(left, right, 1)
}

pub fn sql__pg_catalog__multirange_intersect__ezyb(
    left: MultirangeValue,
    right: MultirangeValue,
) -> MultirangeValue {
    multirange_set(left, right, 3)
}

pub fn sql__pg_catalog__multirange_minus__8qbr(
    left: MultirangeValue,
    right: MultirangeValue,
) -> MultirangeValue {
    multirange_set(left, right, 4)
}

pub fn sql__pg_catalog__range_merge__f619(input: MultirangeValue) -> RangeValue {
    if let MultirangeValue::Error(error) = input {
        return RangeValue::Error(error);
    };
    if let MultirangeValue::Null = input {
        return RangeValue::Null;
    };
    if let MultirangeValue::Value(payload) = input {
        if payload.ranges.len() == 0 {
            return range_from_profiled_bounds(
                payload.range_type.as_str(),
                payload.element_type.as_str(),
                payload.element_kind,
                true,
                false,
                false,
                ArrayElement::Null,
                ArrayElement::Null,
                payload.support,
            );
        };
        let first = payload.ranges[0].clone();
        if payload.ranges.len() == 1 {
            return first;
        };
        let last = payload.ranges[payload.ranges.len() - 1].clone();
        if let RangeValue::Error(error) = first {
            return RangeValue::Error(error);
        };
        if let RangeValue::Error(error) = last {
            return RangeValue::Error(error);
        };
        if let RangeValue::Value(a) = first {
            if let RangeValue::Value(b) = last {
                if payload.support.canonical == 0 {
                    return RangeValue::Unknown;
                };
                if payload.support.comparison == 0 {
                    let mut unbounded = false;
                    let first_bound = a.bounds[0].clone();
                    let last_bound = b.bounds[1].clone();
                    if let ArrayElement::Null = first_bound {
                        unbounded = true;
                    };
                    if let ArrayElement::Null = last_bound {
                        unbounded = true;
                    };
                    if unbounded == false {
                        return RangeValue::Unknown;
                    };
                };
                return range_from_typed_bounds(
                    payload.range_type.as_str(),
                    payload.element_type.as_str(),
                    payload.element_kind,
                    false,
                    a.lower_inclusive,
                    b.upper_inclusive,
                    a.bounds[0].clone(),
                    b.bounds[1].clone(),
                    payload.support,
                    a.enum_labels.as_str(),
                    a.enum_count,
                    a.bound_profile.clone(),
                );
            };
        };
    };
    RangeValue::Unknown
}
