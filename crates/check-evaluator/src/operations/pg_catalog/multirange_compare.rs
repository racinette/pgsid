fn multirange_same_family(left: &MultirangePayload, right: &MultirangePayload) -> bool {
    left.type_name.as_str() == right.type_name.as_str()
        && left.range_type.as_str() == right.range_type.as_str()
        && left.element_type.as_str() == right.element_type.as_str()
        && left.element_kind == right.element_kind
        && range_support_equal(left.support, right.support)
}

fn multirange_span_family(input: &MultirangePayload, span: &RangePayload) -> bool {
    input.range_type.as_str() == span.type_name.as_str()
        && input.element_type.as_str() == span.element_type.as_str()
        && input.element_kind == span.element_kind
        && range_support_equal(input.support, span.support)
}

fn multirange_member_relation(
    left: &MultirangePayload,
    li: usize,
    right: &MultirangePayload,
    ri: usize,
    strategy: i32,
) -> BoolValue {
    let a = left.ranges[li].clone();
    let b = right.ranges[ri].clone();
    range_relation(a, b, strategy)
}

fn multirange_extreme(input: &MultirangePayload, upper: bool) -> RangeValue {
    let mut position: usize = 0;
    if upper {
        position = input.ranges.len() - 1;
    };
    input.ranges[position].clone()
}

fn multirange_endpoint_order(
    left: RangeValue,
    left_upper: bool,
    right: RangeValue,
    right_upper: bool,
) -> Int4Value {
    if let RangeValue::Error(error) = left {
        return Int4Value::Error(error);
    };
    if let RangeValue::Error(error) = right {
        return Int4Value::Error(error);
    };
    if let RangeValue::Value(a) = left {
        if let RangeValue::Value(b) = right {
            return range_endpoint_compare(&a, left_upper, &b, right_upper);
        };
    };
    Int4Value::Unknown
}

fn multirange_directional_adjacent(left: RangeValue, right: RangeValue) -> BoolValue {
    if let RangeValue::Error(error) = left {
        return BoolValue::Error(error);
    };
    if let RangeValue::Error(error) = right {
        return BoolValue::Error(error);
    };
    if let RangeValue::Value(a) = left {
        if let RangeValue::Value(b) = right {
            return range_bounds_adjacent(&a, &b);
        };
    };
    BoolValue::Unknown
}

fn multirange_payload_compare(left: &MultirangePayload, right: &MultirangePayload) -> Int4Value {
    let mut index: usize = 0;
    while index < left.ranges.len() && index < right.ranges.len() {
        let a = left.ranges[index].clone();
        let b = right.ranges[index].clone();
        let compared = sql__pg_catalog__range_cmp__8jgl(a, b);
        if compared != make_int4_value(0) {
            return compared;
        };
        index += 1;
    }
    if left.ranges.len() < right.ranges.len() {
        return make_int4_value(-1);
    };
    if left.ranges.len() > right.ranges.len() {
        return make_int4_value(1);
    };
    make_int4_value(0)
}

fn multirange_compare(left: MultirangeValue, right: MultirangeValue) -> Int4Value {
    if let MultirangeValue::Error(error) = left {
        return Int4Value::Error(error);
    };
    if let MultirangeValue::Error(error) = right {
        return Int4Value::Error(error);
    };
    if let MultirangeValue::Null = left {
        return Int4Value::Null;
    };
    if let MultirangeValue::Null = right {
        return Int4Value::Null;
    };
    if let MultirangeValue::Value(a) = left {
        if let MultirangeValue::Value(b) = right {
            if multirange_same_family(&a, &b) {
                return multirange_payload_compare(&a, &b);
            };
        };
    };
    Int4Value::Unknown
}

fn multirange_equal(left: MultirangeValue, right: MultirangeValue) -> BoolValue {
    if let MultirangeValue::Error(error) = left {
        return BoolValue::Error(error);
    };
    if let MultirangeValue::Error(error) = right {
        return BoolValue::Error(error);
    };
    if let MultirangeValue::Null = left {
        return BoolValue::Null;
    };
    if let MultirangeValue::Null = right {
        return BoolValue::Null;
    };
    if let MultirangeValue::Value(a) = left {
        if let MultirangeValue::Value(b) = right {
            if multirange_same_family(&a, &b) == false {
                return BoolValue::Unknown;
            };
            if a.ranges.len() != b.ranges.len() {
                return BoolValue::Value(false);
            };
            let mut index: usize = 0;
            while index < a.ranges.len() {
                let x = a.ranges[index].clone();
                let y = b.ranges[index].clone();
                let compared = sql__pg_catalog__range_cmp__8jgl(x, y);
                if compared != make_int4_value(0) {
                    return range_order_boolean(compared, 3);
                };
                index += 1;
            }
            return BoolValue::Value(true);
        };
    };
    BoolValue::Unknown
}

fn multirange_payload_relation(
    left: &MultirangePayload,
    right: &MultirangePayload,
    strategy: i32,
) -> BoolValue {
    if strategy == 6 {
        return multirange_payload_relation(right, left, 5);
    };
    if strategy == 5 && right.ranges.len() == 0 {
        return BoolValue::Value(true);
    };
    if left.ranges.len() == 0 || right.ranges.len() == 0 {
        return BoolValue::Value(false);
    };
    if strategy >= 1 && strategy <= 4 {
        let a = multirange_extreme(left, strategy == 1 || strategy == 3);
        let b = multirange_extreme(right, strategy == 2 || strategy == 3);
        let compared = multirange_endpoint_order(
            a,
            strategy == 1 || strategy == 3,
            b,
            strategy == 2 || strategy == 3,
        );
        if strategy == 1 {
            return range_order_boolean(compared, 1);
        };
        if strategy == 2 {
            return range_order_boolean(compared, 5);
        };
        if strategy == 3 {
            return range_order_boolean(compared, 2);
        };
        return range_order_boolean(compared, 4);
    };
    if strategy == 7 {
        let a = multirange_extreme(left, true);
        let b = multirange_extreme(right, false);
        let first = multirange_directional_adjacent(a, b);
        if first != BoolValue::Value(false) {
            return first;
        };
        let reverse_left = multirange_extreme(right, true);
        let reverse_right = multirange_extreme(left, false);
        return multirange_directional_adjacent(reverse_left, reverse_right);
    };
    let mut li: usize = 0;
    let mut ri: usize = 0;
    while ri < right.ranges.len() {
        let mut advancing = true;
        while advancing {
            let before = multirange_member_relation(left, li, right, ri, 1);
            if before == BoolValue::Value(true) {
                li += 1;
                if li >= left.ranges.len() {
                    return BoolValue::Value(false);
                };
            } else {
                if before != BoolValue::Value(false) {
                    return before;
                };
                advancing = false;
            };
        }
        let current = multirange_member_relation(left, li, right, ri, strategy);
        if strategy == 5 && current != BoolValue::Value(true) {
            return current;
        };
        if strategy == 8 && current != BoolValue::Value(false) {
            return current;
        };
        ri += 1;
    }
    BoolValue::Value(strategy == 5)
}

fn multirange_relation(left: MultirangeValue, right: MultirangeValue, strategy: i32) -> BoolValue {
    if let MultirangeValue::Error(error) = left {
        return BoolValue::Error(error);
    };
    if let MultirangeValue::Error(error) = right {
        return BoolValue::Error(error);
    };
    if let MultirangeValue::Null = left {
        return BoolValue::Null;
    };
    if let MultirangeValue::Null = right {
        return BoolValue::Null;
    };
    if let MultirangeValue::Value(a) = left {
        if let MultirangeValue::Value(b) = right {
            if multirange_same_family(&a, &b) {
                return multirange_payload_relation(&a, &b, strategy);
            };
        };
    };
    BoolValue::Unknown
}

fn multirange_search_span(
    input: &MultirangePayload,
    span: &RangePayload,
    contains: bool,
) -> BoolValue {
    if span.empty {
        return BoolValue::Value(contains);
    };
    let mut lower: i32 = 0;
    let mut upper = input.ranges.len() as i32;
    while lower < upper {
        let middle = lower + (upper - lower) / 2;
        let position = usize::try_from(middle).unwrap_or(0);
        let member = input.ranges[position].clone();
        if let RangeValue::Error(error) = member {
            return BoolValue::Error(error);
        };
        if let RangeValue::Null = member {
            return BoolValue::Unknown;
        };
        if let RangeValue::Unknown = member {
            return BoolValue::Unknown;
        };
        if let RangeValue::Value(candidate) = member {
            let before = range_endpoint_compare(span, true, &candidate, false);
            if let Int4Value::Error(error) = before {
                return BoolValue::Error(error);
            };
            let mut known = false;
            if let Int4Value::Value(order) = before {
                known = true;
                if order < 0 {
                    upper = middle;
                } else {
                    let after = range_endpoint_compare(span, false, &candidate, true);
                    if let Int4Value::Error(error) = after {
                        return BoolValue::Error(error);
                    };
                    let mut decided = false;
                    if let Int4Value::Value(direction) = after {
                        decided = true;
                        if direction > 0 {
                            lower = middle + 1;
                        } else {
                            if contains {
                                return range_payload_relation(&candidate, span, 5);
                            };
                            return BoolValue::Value(true);
                        };
                    };
                    if decided == false {
                        return BoolValue::Unknown;
                    };
                };
            };
            if known == false {
                return BoolValue::Unknown;
            };
        };
    }
    BoolValue::Value(false)
}

fn multirange_span_contains(input: &MultirangePayload, span: &RangePayload) -> BoolValue {
    if input.ranges.len() == 0 {
        return BoolValue::Value(true);
    };
    if span.empty {
        return BoolValue::Value(false);
    };
    let first = multirange_extreme(input, false);
    let last = multirange_extreme(input, true);
    let lo = multirange_endpoint_order(range_copy_payload(span), false, first, false);
    if let Int4Value::Error(error) = lo {
        return BoolValue::Error(error);
    };
    if let Int4Value::Value(order) = lo {
        if order > 0 {
            return BoolValue::Value(false);
        };
        let hi = multirange_endpoint_order(range_copy_payload(span), true, last, true);
        return range_order_boolean(hi, 4);
    };
    BoolValue::Unknown
}

fn multirange_span_relation(
    input: MultirangeValue,
    span: RangeValue,
    strategy: i32,
    multi_first: bool,
) -> BoolValue {
    if multi_first == false {
        if let RangeValue::Error(error) = span {
            return BoolValue::Error(error);
        };
    };
    if let MultirangeValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if let RangeValue::Error(error) = span {
        return BoolValue::Error(error);
    };
    if let MultirangeValue::Null = input {
        return BoolValue::Null;
    };
    if let RangeValue::Null = span {
        return BoolValue::Null;
    };
    if let MultirangeValue::Value(a) = input {
        if let RangeValue::Value(b) = span {
            if multirange_span_family(&a, &b) == false {
                return BoolValue::Unknown;
            };
            if strategy == 5 || strategy == 6 {
                if (multi_first && strategy == 5) || (multi_first == false && strategy == 6) {
                    return multirange_search_span(&a, &b, true);
                };
                return multirange_span_contains(&a, &b);
            };
            if a.ranges.len() == 0 || b.empty {
                return BoolValue::Value(false);
            };
            if strategy == 8 {
                return multirange_search_span(&a, &b, false);
            };
            if strategy == 7 {
                let first = multirange_extreme(&a, false);
                let adjacent = multirange_directional_adjacent(RangeValue::Value(b.clone()), first);
                if adjacent != BoolValue::Value(false) {
                    return adjacent;
                };
                let last = multirange_extreme(&a, true);
                return multirange_directional_adjacent(last, RangeValue::Value(b));
            };
            let left_upper = strategy == 1 || strategy == 3;
            let right_upper = strategy == 2 || strategy == 3;
            let mut multi_upper = left_upper;
            if multi_first == false {
                multi_upper = right_upper;
            };
            let member = multirange_extreme(&a, multi_upper);
            let mut compared = Int4Value::Unknown;
            if multi_first {
                compared = multirange_endpoint_order(
                    member,
                    left_upper,
                    RangeValue::Value(b),
                    right_upper,
                );
            } else {
                compared = multirange_endpoint_order(
                    RangeValue::Value(b),
                    left_upper,
                    member,
                    right_upper,
                );
            };
            if strategy == 1 {
                return range_order_boolean(compared, 1);
            };
            if strategy == 2 {
                return range_order_boolean(compared, 5);
            };
            if strategy == 3 {
                return range_order_boolean(compared, 2);
            };
            return range_order_boolean(compared, 4);
        };
    };
    BoolValue::Unknown
}

fn multirange_element_direction(span: &RangePayload, element: ArrayElement) -> Int4Value {
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
        let compared = range_builtin_compare(lower, element.clone(), span.support.comparison);
        if let Int4Value::Value(order) = compared {
            if order > 0 || (order == 0 && span.lower_inclusive == false) {
                return make_int4_value(-1);
            };
        };
        if multirange_order_known(compared) == false {
            return compared;
        };
    };
    if has_upper {
        let compared = range_builtin_compare(upper, element, span.support.comparison);
        if let Int4Value::Value(order) = compared {
            if order < 0 || (order == 0 && span.upper_inclusive == false) {
                return make_int4_value(1);
            };
        };
        if multirange_order_known(compared) == false {
            return compared;
        };
    };
    make_int4_value(0)
}

fn multirange_contains_element(
    input: MultirangeValue,
    element: ArrayElement,
    element_first: bool,
) -> BoolValue {
    if element_first {
        if let ArrayElement::Error(error) = element {
            return BoolValue::Error(error);
        };
    };
    if let MultirangeValue::Error(error) = input {
        return BoolValue::Error(error);
    };
    if let ArrayElement::Error(error) = element {
        return BoolValue::Error(error);
    };
    if let MultirangeValue::Null = input {
        return BoolValue::Null;
    };
    if let ArrayElement::Null = element {
        return BoolValue::Null;
    };
    if let ArrayElement::Unknown = element {
        return BoolValue::Unknown;
    };
    if let MultirangeValue::Value(payload) = input {
        if array_element_family(element.clone()) != payload.element_kind {
            return BoolValue::Unknown;
        };
        let mut lower: i32 = 0;
        let mut upper = payload.ranges.len() as i32;
        while lower < upper {
            let middle = lower + (upper - lower) / 2;
            let position = usize::try_from(middle).unwrap_or(0);
            let member = payload.ranges[position].clone();
            if let RangeValue::Error(error) = member {
                return BoolValue::Error(error);
            };
            if let RangeValue::Null = member {
                return BoolValue::Unknown;
            };
            if let RangeValue::Unknown = member {
                return BoolValue::Unknown;
            };
            if let RangeValue::Value(span) = member {
                let compared = multirange_element_direction(&span, element.clone());
                if let Int4Value::Error(error) = compared {
                    return BoolValue::Error(error);
                };
                let mut known = false;
                if let Int4Value::Value(order) = compared {
                    known = true;
                    if order == 0 {
                        return BoolValue::Value(true);
                    };
                    if order < 0 {
                        upper = middle;
                    } else {
                        lower = middle + 1;
                    };
                };
                if known == false {
                    return BoolValue::Unknown;
                };
            };
        }
        return BoolValue::Value(false);
    };
    BoolValue::Unknown
}

pub fn sql__pg_catalog__elem_contained_by_multirange__1fqy(
    left: ArrayElement,
    right: MultirangeValue,
) -> BoolValue {
    multirange_contains_element(right, left, true)
}

pub fn sql__pg_catalog__multirange_adjacent_multirange__volo(
    left: MultirangeValue,
    right: MultirangeValue,
) -> BoolValue {
    multirange_relation(left, right, 7)
}

pub fn sql__pg_catalog__multirange_adjacent_range__z75g(
    left: MultirangeValue,
    right: RangeValue,
) -> BoolValue {
    multirange_span_relation(left, right, 7, true)
}

pub fn sql__pg_catalog__multirange_after_multirange__nrvn(
    left: MultirangeValue,
    right: MultirangeValue,
) -> BoolValue {
    multirange_relation(left, right, 2)
}

pub fn sql__pg_catalog__multirange_after_range__r05j(
    left: MultirangeValue,
    right: RangeValue,
) -> BoolValue {
    multirange_span_relation(left, right, 2, true)
}

pub fn sql__pg_catalog__multirange_before_multirange__8hjl(
    left: MultirangeValue,
    right: MultirangeValue,
) -> BoolValue {
    multirange_relation(left, right, 1)
}

pub fn sql__pg_catalog__multirange_before_range__5v34(
    left: MultirangeValue,
    right: RangeValue,
) -> BoolValue {
    multirange_span_relation(left, right, 1, true)
}

pub fn sql__pg_catalog__multirange_cmp__mafd(
    left: MultirangeValue,
    right: MultirangeValue,
) -> Int4Value {
    multirange_compare(left, right)
}

pub fn sql__pg_catalog__multirange_contained_by_multirange__9c9u(
    left: MultirangeValue,
    right: MultirangeValue,
) -> BoolValue {
    multirange_relation(left, right, 6)
}

pub fn sql__pg_catalog__multirange_contained_by_range__muhz(
    left: MultirangeValue,
    right: RangeValue,
) -> BoolValue {
    multirange_span_relation(left, right, 6, true)
}

pub fn sql__pg_catalog__multirange_contains_elem__aq4j(
    left: MultirangeValue,
    right: ArrayElement,
) -> BoolValue {
    multirange_contains_element(left, right, false)
}

pub fn sql__pg_catalog__multirange_contains_multirange__xn5h(
    left: MultirangeValue,
    right: MultirangeValue,
) -> BoolValue {
    multirange_relation(left, right, 5)
}

pub fn sql__pg_catalog__multirange_contains_range__bpqf(
    left: MultirangeValue,
    right: RangeValue,
) -> BoolValue {
    multirange_span_relation(left, right, 5, true)
}

pub fn sql__pg_catalog__multirange_eq__9xy5(
    left: MultirangeValue,
    right: MultirangeValue,
) -> BoolValue {
    multirange_equal(left, right)
}

pub fn sql__pg_catalog__multirange_ge__m1wr(
    left: MultirangeValue,
    right: MultirangeValue,
) -> BoolValue {
    let order = multirange_compare(left, right);
    range_order_boolean(order, 4)
}

pub fn sql__pg_catalog__multirange_gt__3xub(
    left: MultirangeValue,
    right: MultirangeValue,
) -> BoolValue {
    let order = multirange_compare(left, right);
    range_order_boolean(order, 5)
}

pub fn sql__pg_catalog__multirange_le__3kuk(
    left: MultirangeValue,
    right: MultirangeValue,
) -> BoolValue {
    let order = multirange_compare(left, right);
    range_order_boolean(order, 2)
}

pub fn sql__pg_catalog__multirange_lt__8rid(
    left: MultirangeValue,
    right: MultirangeValue,
) -> BoolValue {
    let order = multirange_compare(left, right);
    range_order_boolean(order, 1)
}

pub fn sql__pg_catalog__multirange_ne__fjyh(
    left: MultirangeValue,
    right: MultirangeValue,
) -> BoolValue {
    let equal = multirange_equal(left, right);
    bool_not_value(equal)
}

pub fn sql__pg_catalog__multirange_overlaps_multirange__93jh(
    left: MultirangeValue,
    right: MultirangeValue,
) -> BoolValue {
    multirange_relation(left, right, 8)
}

pub fn sql__pg_catalog__multirange_overlaps_range__lju4(
    left: MultirangeValue,
    right: RangeValue,
) -> BoolValue {
    multirange_span_relation(left, right, 8, true)
}

pub fn sql__pg_catalog__multirange_overleft_multirange__lj1m(
    left: MultirangeValue,
    right: MultirangeValue,
) -> BoolValue {
    multirange_relation(left, right, 3)
}

pub fn sql__pg_catalog__multirange_overleft_range__q948(
    left: MultirangeValue,
    right: RangeValue,
) -> BoolValue {
    multirange_span_relation(left, right, 3, true)
}

pub fn sql__pg_catalog__multirange_overright_multirange__20d6(
    left: MultirangeValue,
    right: MultirangeValue,
) -> BoolValue {
    multirange_relation(left, right, 4)
}

pub fn sql__pg_catalog__multirange_overright_range__j24k(
    left: MultirangeValue,
    right: RangeValue,
) -> BoolValue {
    multirange_span_relation(left, right, 4, true)
}

pub fn sql__pg_catalog__range_adjacent_multirange__8wks(
    left: RangeValue,
    right: MultirangeValue,
) -> BoolValue {
    multirange_span_relation(right, left, 7, false)
}

pub fn sql__pg_catalog__range_after_multirange__5u82(
    left: RangeValue,
    right: MultirangeValue,
) -> BoolValue {
    multirange_span_relation(right, left, 2, false)
}

pub fn sql__pg_catalog__range_before_multirange__eaoa(
    left: RangeValue,
    right: MultirangeValue,
) -> BoolValue {
    multirange_span_relation(right, left, 1, false)
}

pub fn sql__pg_catalog__range_contained_by_multirange__oyeg(
    left: RangeValue,
    right: MultirangeValue,
) -> BoolValue {
    multirange_span_relation(right, left, 6, false)
}

pub fn sql__pg_catalog__range_contains_multirange__n92i(
    left: RangeValue,
    right: MultirangeValue,
) -> BoolValue {
    multirange_span_relation(right, left, 5, false)
}

pub fn sql__pg_catalog__range_overlaps_multirange__5sb2(
    left: RangeValue,
    right: MultirangeValue,
) -> BoolValue {
    multirange_span_relation(right, left, 8, false)
}

pub fn sql__pg_catalog__range_overleft_multirange__zjel(
    left: RangeValue,
    right: MultirangeValue,
) -> BoolValue {
    multirange_span_relation(right, left, 3, false)
}

pub fn sql__pg_catalog__range_overright_multirange__c1uw(
    left: RangeValue,
    right: MultirangeValue,
) -> BoolValue {
    multirange_span_relation(right, left, 4, false)
}
