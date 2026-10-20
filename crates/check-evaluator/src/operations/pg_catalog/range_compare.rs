fn range_same_family(left: &RangePayload, right: &RangePayload) -> bool {
    left.type_name.as_str() == right.type_name.as_str()
        && left.element_type.as_str() == right.element_type.as_str()
        && left.element_kind == right.element_kind
        && range_support_equal(left.support, right.support)
}

fn range_endpoint_compare(
    left: &RangePayload,
    left_upper: bool,
    right: &RangePayload,
    right_upper: bool,
) -> Int4Value {
    let mut li: usize = 0;
    let mut ri: usize = 0;
    let mut left_inc = left.lower_inclusive;
    let mut right_inc = right.lower_inclusive;
    if left_upper {
        li = 1;
        left_inc = left.upper_inclusive;
    };
    if right_upper {
        ri = 1;
        right_inc = right.upper_inclusive;
    };
    let a = left.bounds[li].clone();
    let b = right.bounds[ri].clone();
    let mut left_unbounded = false;
    let mut right_unbounded = false;
    if let ArrayElement::Null = a {
        left_unbounded = true;
    };
    if let ArrayElement::Null = b {
        right_unbounded = true;
    };
    if left_unbounded && right_unbounded && left_upper == right_upper {
        return make_int4_value(0);
    };
    if left_unbounded {
        if left_upper {
            return make_int4_value(1);
        };
        return make_int4_value(-1);
    };
    if right_unbounded {
        if right_upper {
            return make_int4_value(-1);
        };
        return make_int4_value(1);
    };
    let comparison = range_builtin_compare(a, b, left.support.comparison);
    if let Int4Value::Value(order) = comparison {
        if order != 0 {
            return comparison;
        };
        if left_inc == false && right_inc == false && left_upper == right_upper {
            return comparison;
        };
        if left_inc == false {
            if left_upper {
                return make_int4_value(-1);
            };
            return make_int4_value(1);
        };
        if right_inc == false {
            if right_upper {
                return make_int4_value(1);
            };
            return make_int4_value(-1);
        };
    };
    comparison
}

fn range_payload_compare(left: &RangePayload, right: &RangePayload) -> Int4Value {
    if left.empty && right.empty {
        return make_int4_value(0);
    };
    if left.empty {
        return make_int4_value(-1);
    };
    if right.empty {
        return make_int4_value(1);
    };
    let lower = range_endpoint_compare(left, false, right, false);
    if let Int4Value::Value(order) = lower {
        if order == 0 {
            return range_endpoint_compare(left, true, right, true);
        };
    };
    lower
}

pub fn sql__pg_catalog__range_cmp__8jgl(left: RangeValue, right: RangeValue) -> Int4Value {
    if let RangeValue::Error(error) = left {
        return Int4Value::Error(error);
    };
    if let RangeValue::Error(error) = right {
        return Int4Value::Error(error);
    };
    if let RangeValue::Null = left {
        return Int4Value::Null;
    };
    if let RangeValue::Null = right {
        return Int4Value::Null;
    };
    if let RangeValue::Value(a) = left {
        if let RangeValue::Value(b) = right {
            if range_same_family(&a, &b) {
                return range_payload_compare(&a, &b);
            };
        };
    };
    Int4Value::Unknown
}

fn range_order_boolean(input: Int4Value, strategy: i32) -> BoolValue {
    if let Int4Value::Error(error) = input {
        return BoolValue::Error(error);
    };
    if let Int4Value::Null = input {
        return BoolValue::Null;
    };
    if let Int4Value::Value(order) = input {
        if strategy == 1 {
            return BoolValue::Value(order < 0);
        };
        if strategy == 2 {
            return BoolValue::Value(order <= 0);
        };
        if strategy == 3 {
            return BoolValue::Value(order == 0);
        };
        if strategy == 4 {
            return BoolValue::Value(order >= 0);
        };
        if strategy == 5 {
            return BoolValue::Value(order > 0);
        };
        return BoolValue::Value(order != 0);
    };
    BoolValue::Unknown
}

fn range_bounds_adjacent(left: &RangePayload, right: &RangePayload) -> BoolValue {
    let a = left.bounds[1].clone();
    let b = right.bounds[0].clone();
    if let ArrayElement::Null = a {
        return BoolValue::Value(false);
    };
    if let ArrayElement::Null = b {
        return BoolValue::Value(false);
    };
    let comparison = range_builtin_compare(a.clone(), b.clone(), left.support.comparison);
    if let Int4Value::Error(error) = comparison {
        return BoolValue::Error(error);
    };
    if let Int4Value::Value(order) = comparison {
        if order == 0 {
            return BoolValue::Value(left.upper_inclusive != right.lower_inclusive);
        };
        if order < 0 && left.support.canonical == 0 {
            return BoolValue::Unknown;
        };
        if order < 0
            && (left.support.canonical == 2
                || left.support.canonical == 3
                || left.support.canonical == 7)
        {
            let mut flags = String::new();
            if left.upper_inclusive {
                flags.push('(');
            } else {
                flags.push('[');
            };
            if right.lower_inclusive {
                flags.push(')');
            } else {
                flags.push(']');
            };
            let gap = range_construct_with_support(
                left.type_name.as_str(),
                left.element_type.as_str(),
                left.element_kind,
                a,
                b,
                TextValue::Value(flags),
                left.support,
            );
            return range_empty_state(gap);
        };
        return BoolValue::Value(false);
    };
    BoolValue::Unknown
}

fn range_payload_relation(left: &RangePayload, right: &RangePayload, strategy: i32) -> BoolValue {
    if strategy == 6 {
        return range_payload_relation(right, left, 5);
    };
    if strategy == 5 && right.empty {
        return BoolValue::Value(true);
    };
    if left.empty || right.empty {
        return BoolValue::Value(false);
    };
    if strategy == 1 {
        let order = range_endpoint_compare(left, true, right, false);
        return range_order_boolean(order, 1);
    };
    if strategy == 2 {
        let order = range_endpoint_compare(left, false, right, true);
        return range_order_boolean(order, 5);
    };
    if strategy == 3 {
        let order = range_endpoint_compare(left, true, right, true);
        return range_order_boolean(order, 2);
    };
    if strategy == 4 {
        let order = range_endpoint_compare(left, false, right, false);
        return range_order_boolean(order, 4);
    };
    if strategy == 5 {
        let lo = range_endpoint_compare(left, false, right, false);
        if let Int4Value::Value(order) = lo {
            if order > 0 {
                return BoolValue::Value(false);
            };
            let hi = range_endpoint_compare(left, true, right, true);
            return range_order_boolean(hi, 4);
        };
        return range_order_boolean(lo, 2);
    };
    if strategy == 7 {
        let first = range_bounds_adjacent(left, right);
        if let BoolValue::Value(adjacent) = first {
            if adjacent {
                return first;
            };
            return range_bounds_adjacent(right, left);
        };
        return first;
    };
    let lo = range_endpoint_compare(left, false, right, false);
    if let Int4Value::Error(error) = lo {
        return BoolValue::Error(error);
    };
    if let Int4Value::Value(order) = lo {
        if order >= 0 {
            let end = range_endpoint_compare(left, false, right, true);
            if let Int4Value::Error(error) = end {
                return BoolValue::Error(error);
            };
            let mut known = false;
            if let Int4Value::Value(limit) = end {
                known = true;
                if limit <= 0 {
                    return BoolValue::Value(true);
                };
            };
            if known == false {
                return BoolValue::Unknown;
            };
        };
        let reverse = range_endpoint_compare(right, false, left, false);
        if let Int4Value::Value(back) = reverse {
            if back < 0 {
                return BoolValue::Value(false);
            };
            let end = range_endpoint_compare(right, false, left, true);
            return range_order_boolean(end, 2);
        };
        return range_order_boolean(reverse, 4);
    };
    BoolValue::Unknown
}

fn range_relation(left: RangeValue, right: RangeValue, strategy: i32) -> BoolValue {
    if let RangeValue::Error(error) = left {
        return BoolValue::Error(error);
    };
    if let RangeValue::Error(error) = right {
        return BoolValue::Error(error);
    };
    if let RangeValue::Null = left {
        return BoolValue::Null;
    };
    if let RangeValue::Null = right {
        return BoolValue::Null;
    };
    if let RangeValue::Value(a) = left {
        if let RangeValue::Value(b) = right {
            if range_same_family(&a, &b) {
                return range_payload_relation(&a, &b, strategy);
            };
        };
    };
    BoolValue::Unknown
}

fn range_contains_element(
    input: RangeValue,
    element: ArrayElement,
    element_first: bool,
) -> BoolValue {
    if element_first {
        if let ArrayElement::Error(error) = element {
            return BoolValue::Error(error);
        };
    };
    if let RangeValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if let ArrayElement::Error(error) = element {
        return BoolValue::Error(error);
    };
    if let RangeValue::Null = input {
        return BoolValue::Null;
    };
    if let ArrayElement::Null = element {
        return BoolValue::Null;
    };
    if let ArrayElement::Unknown = element {
        return BoolValue::Unknown;
    };
    if let RangeValue::Value(span) = input {
        if span.empty {
            return BoolValue::Value(false);
        };
        let kind = array_element_family(element.clone());
        if kind != 0 && kind != span.element_kind {
            return BoolValue::Unknown;
        };
        let lower = span.bounds[0].clone();
        let upper = span.bounds[1].clone();
        let mut has_lower = true;
        let mut has_upper = true;
        if let ArrayElement::Null = lower {
            has_lower = false;
        };
        if let ArrayElement::Null = upper {
            has_upper = false;
        };
        if has_lower {
            let comparison = range_builtin_compare(lower, element.clone(), span.support.comparison);
            if let Int4Value::Error(error) = comparison {
                return BoolValue::Error(error);
            };
            let mut known = false;
            if let Int4Value::Value(order) = comparison {
                known = true;
                if order > 0 || (order == 0 && span.lower_inclusive == false) {
                    return BoolValue::Value(false);
                };
            };
            if known == false {
                return BoolValue::Unknown;
            };
        };
        if has_upper {
            let comparison = range_builtin_compare(upper, element, span.support.comparison);
            if let Int4Value::Error(error) = comparison {
                return BoolValue::Error(error);
            };
            let mut known = false;
            if let Int4Value::Value(order) = comparison {
                known = true;
                if order < 0 || (order == 0 && span.upper_inclusive == false) {
                    return BoolValue::Value(false);
                };
            };
            if known == false {
                return BoolValue::Unknown;
            };
        };
        return BoolValue::Value(true);
    };
    BoolValue::Unknown
}

pub fn sql__pg_catalog__range_lt__t1sv(left: RangeValue, right: RangeValue) -> BoolValue {
    let comparison = sql__pg_catalog__range_cmp__8jgl(left, right);
    range_order_boolean(comparison, 1)
}

pub fn sql__pg_catalog__range_le__ur15(left: RangeValue, right: RangeValue) -> BoolValue {
    let comparison = sql__pg_catalog__range_cmp__8jgl(left, right);
    range_order_boolean(comparison, 2)
}

pub fn sql__pg_catalog__range_eq__loxq(left: RangeValue, right: RangeValue) -> BoolValue {
    let comparison = sql__pg_catalog__range_cmp__8jgl(left, right);
    range_order_boolean(comparison, 3)
}

pub fn sql__pg_catalog__range_ge__i2f0(left: RangeValue, right: RangeValue) -> BoolValue {
    let comparison = sql__pg_catalog__range_cmp__8jgl(left, right);
    range_order_boolean(comparison, 4)
}

pub fn sql__pg_catalog__range_gt__943z(left: RangeValue, right: RangeValue) -> BoolValue {
    let comparison = sql__pg_catalog__range_cmp__8jgl(left, right);
    range_order_boolean(comparison, 5)
}

pub fn sql__pg_catalog__range_ne__mzkw(left: RangeValue, right: RangeValue) -> BoolValue {
    let comparison = sql__pg_catalog__range_cmp__8jgl(left, right);
    range_order_boolean(comparison, 6)
}

pub fn sql__pg_catalog__range_before__z0g8(left: RangeValue, right: RangeValue) -> BoolValue {
    range_relation(left, right, 1)
}

pub fn sql__pg_catalog__range_after__5pak(left: RangeValue, right: RangeValue) -> BoolValue {
    range_relation(left, right, 2)
}

pub fn sql__pg_catalog__range_overleft__8k1o(left: RangeValue, right: RangeValue) -> BoolValue {
    range_relation(left, right, 3)
}

pub fn sql__pg_catalog__range_overright__rl1q(left: RangeValue, right: RangeValue) -> BoolValue {
    range_relation(left, right, 4)
}

pub fn sql__pg_catalog__range_contains__ut37(left: RangeValue, right: RangeValue) -> BoolValue {
    range_relation(left, right, 5)
}

pub fn sql__pg_catalog__range_contained_by__ok2x(left: RangeValue, right: RangeValue) -> BoolValue {
    range_relation(left, right, 6)
}

pub fn sql__pg_catalog__range_adjacent__03u0(left: RangeValue, right: RangeValue) -> BoolValue {
    range_relation(left, right, 7)
}

pub fn sql__pg_catalog__range_overlaps__38jd(left: RangeValue, right: RangeValue) -> BoolValue {
    range_relation(left, right, 8)
}

pub fn sql__pg_catalog__range_contains_elem__wtfe(
    input: RangeValue,
    element: ArrayElement,
) -> BoolValue {
    range_contains_element(input, element, false)
}

pub fn sql__pg_catalog__elem_contained_by_range__wkbk(
    element: ArrayElement,
    input: RangeValue,
) -> BoolValue {
    range_contains_element(input, element, true)
}
