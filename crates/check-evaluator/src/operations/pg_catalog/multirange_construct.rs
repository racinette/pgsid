const MULTIRANGE_NULL_MEMBER: u32 = 3452548;
const MULTIRANGE_ARRAY_DIMENSIONS: u32 = 3405888;

fn multirange_construct_order(input: &MultirangePayload, left: usize, right: usize) -> Int4Value {
    let a = input.ranges[left].clone();
    let b = input.ranges[right].clone();
    range_order(a, b)
}

fn multirange_order_known(input: Int4Value) -> bool {
    if let Int4Value::Value(_) = input {
        return true;
    };
    false
}

fn multirange_order_number(input: Int4Value) -> i32 {
    if let Int4Value::Value(value) = input {
        return value;
    };
    0
}

fn multirange_order_failure(input: Int4Value) -> MultirangeValue {
    if let Int4Value::Error(error) = input {
        return MultirangeValue::Error(error);
    };
    MultirangeValue::Unknown
}

fn multirange_construct_median(
    input: &MultirangePayload,
    a: usize,
    b: usize,
    c: usize,
) -> Int4Value {
    let ab = multirange_construct_order(input, a, b);
    if multirange_order_known(ab) == false {
        return ab;
    };
    let bc = multirange_construct_order(input, b, c);
    if multirange_order_known(bc) == false {
        return bc;
    };
    if multirange_order_number(ab) < 0 && multirange_order_number(bc) < 0 {
        return make_int4_value(b as i32);
    };
    if multirange_order_number(ab) >= 0 && multirange_order_number(bc) > 0 {
        return make_int4_value(b as i32);
    };
    let ac = multirange_construct_order(input, a, c);
    if multirange_order_known(ac) == false {
        return ac;
    };
    if multirange_order_number(ac) < 0 {
        if multirange_order_number(ab) < 0 {
            return make_int4_value(c as i32);
        };
        return make_int4_value(a as i32);
    };
    if multirange_order_number(ab) < 0 {
        return make_int4_value(a as i32);
    };
    make_int4_value(c as i32)
}

fn multirange_construct_normalize(input: MultirangePayload) -> MultirangeValue {
    let mut order: Vec<usize> = Vec::new();
    let mut index: usize = 0;
    while index < input.ranges.len() {
        order.push(index);
        index += 1;
    }
    let mut starts: Vec<usize> = Vec::new();
    let mut lengths: Vec<usize> = Vec::new();
    starts.push(0);
    lengths.push(order.len());
    let mut tasks: usize = 1;
    while tasks > 0 {
        tasks = tasks - 1;
        let start = starts[tasks];
        let count = lengths[tasks];
        let end = start + count;
        let mut partition = count >= 7;
        if count < 7 {
            let mut next = start + 1;
            while next < end {
                let mut position = next;
                let mut shifting = true;
                while position > start && shifting {
                    let compared =
                        multirange_construct_order(&input, order[position - 1], order[position]);
                    if multirange_order_known(compared) == false {
                        return multirange_order_failure(compared);
                    };
                    if multirange_order_number(compared) > 0 {
                        let saved = order[position];
                        order[position] = order[position - 1];
                        order[position - 1] = saved;
                        position = position - 1;
                    } else {
                        shifting = false;
                    };
                }
                next += 1;
            }
        };
        if partition {
            let mut next = start + 1;
            let mut presorted = true;
            while next < end && presorted {
                let compared = multirange_construct_order(&input, order[next - 1], order[next]);
                if multirange_order_known(compared) == false {
                    return multirange_order_failure(compared);
                };
                if multirange_order_number(compared) > 0 {
                    presorted = false;
                };
                next += 1;
            }
            partition = presorted == false;
        };
        if partition {
            let half = (count as i32) / 2;
            let middle = start + usize::try_from(half).unwrap_or(0);
            let mut pivot = order[middle];
            if count > 7 {
                let mut low = order[start];
                let mut mid = pivot;
                let mut high = order[end - 1];
                if count > 40 {
                    let eighth = (count as i32) / 8;
                    let distance = usize::try_from(eighth).unwrap_or(0);
                    let lo_choice = multirange_construct_median(
                        &input,
                        low,
                        order[start + distance],
                        order[start + distance + distance],
                    );
                    if multirange_order_known(lo_choice) == false {
                        return multirange_order_failure(lo_choice);
                    };
                    low = usize::try_from(multirange_order_number(lo_choice)).unwrap_or(0);
                    let mid_choice = multirange_construct_median(
                        &input,
                        order[middle - distance],
                        mid,
                        order[middle + distance],
                    );
                    if multirange_order_known(mid_choice) == false {
                        return multirange_order_failure(mid_choice);
                    };
                    mid = usize::try_from(multirange_order_number(mid_choice)).unwrap_or(0);
                    let hi_choice = multirange_construct_median(
                        &input,
                        order[end - 1 - (distance + distance)],
                        order[end - 1 - distance],
                        high,
                    );
                    if multirange_order_known(hi_choice) == false {
                        return multirange_order_failure(hi_choice);
                    };
                    high = usize::try_from(multirange_order_number(hi_choice)).unwrap_or(0);
                };
                let choice = multirange_construct_median(&input, low, mid, high);
                if multirange_order_known(choice) == false {
                    return multirange_order_failure(choice);
                };
                pivot = usize::try_from(multirange_order_number(choice)).unwrap_or(0);
            };
            let mut pivot_position = start;
            while order[pivot_position] != pivot {
                pivot_position += 1;
            }
            let saved = order[start];
            order[start] = pivot;
            order[pivot_position] = saved;
            let mut equal_low = start + 1;
            let mut scan_low = equal_low;
            let mut scan_high = end - 1;
            let mut equal_high = scan_high;
            let mut searching = true;
            while searching {
                let mut advance = true;
                while scan_low <= scan_high && advance {
                    let compared = multirange_construct_order(&input, order[scan_low], pivot);
                    if multirange_order_known(compared) == false {
                        return multirange_order_failure(compared);
                    };
                    let comparison = multirange_order_number(compared);
                    if comparison <= 0 {
                        if comparison == 0 {
                            let saved = order[equal_low];
                            order[equal_low] = order[scan_low];
                            order[scan_low] = saved;
                            equal_low += 1;
                        };
                        scan_low += 1;
                    } else {
                        advance = false;
                    };
                }
                advance = true;
                while scan_low <= scan_high && advance {
                    let compared = multirange_construct_order(&input, order[scan_high], pivot);
                    if multirange_order_known(compared) == false {
                        return multirange_order_failure(compared);
                    };
                    let comparison = multirange_order_number(compared);
                    if comparison >= 0 {
                        if comparison == 0 {
                            let saved = order[equal_high];
                            order[equal_high] = order[scan_high];
                            order[scan_high] = saved;
                            equal_high = equal_high - 1;
                        };
                        scan_high = scan_high - 1;
                    } else {
                        advance = false;
                    };
                }
                if scan_low > scan_high {
                    searching = false;
                } else {
                    let saved = order[scan_low];
                    order[scan_low] = order[scan_high];
                    order[scan_high] = saved;
                    scan_low += 1;
                    scan_high = scan_high - 1;
                };
            }
            let mut swap_count = equal_low - start;
            if swap_count > scan_low - equal_low {
                swap_count = scan_low - equal_low;
            };
            let mut swapped: usize = 0;
            while swapped < swap_count {
                let left = start + swapped;
                let right = scan_low - swap_count + swapped;
                let saved = order[left];
                order[left] = order[right];
                order[right] = saved;
                swapped += 1;
            }
            swap_count = equal_high - scan_high;
            if swap_count > end - equal_high - 1 {
                swap_count = end - equal_high - 1;
            };
            swapped = 0;
            while swapped < swap_count {
                let left = scan_low + swapped;
                let right = end - swap_count + swapped;
                let saved = order[left];
                order[left] = order[right];
                order[right] = saved;
                swapped += 1;
            }
            let left_count = scan_low - equal_low;
            let right_count = equal_high - scan_high;
            let mut large_start = start;
            let mut large_count = left_count;
            let mut small_start = end - right_count;
            let mut small_count = right_count;
            if left_count <= right_count {
                large_start = small_start;
                large_count = right_count;
                small_start = start;
                small_count = left_count;
            };
            if large_count > 1 {
                if tasks < starts.len() {
                    starts[tasks] = large_start;
                    lengths[tasks] = large_count;
                } else {
                    starts.push(large_start);
                    lengths.push(large_count);
                };
                tasks += 1;
            };
            if small_count > 1 {
                if tasks < starts.len() {
                    starts[tasks] = small_start;
                    lengths[tasks] = small_count;
                } else {
                    starts.push(small_start);
                    lengths.push(small_count);
                };
                tasks += 1;
            };
        };
    }
    let mut ranges: Vec<RangeValue> = Vec::new();
    index = 0;
    while index < order.len() {
        let current = input.ranges[order[index]].clone();
        if let RangeValue::Value(payload) = current {
            if payload.empty == false {
                let mut emit_member = ranges.len() == 0;
                if ranges.len() > 0 {
                    let last = ranges[ranges.len() - 1].clone();
                    if let RangeValue::Value(previous) = last {
                        let adjacent = range_payload_relation(&previous, &payload, 7);
                        if let BoolValue::Error(error) = adjacent {
                            return MultirangeValue::Error(error);
                        };
                        if let BoolValue::Unknown = adjacent {
                            return MultirangeValue::Unknown;
                        };
                        if adjacent == BoolValue::Value(false) {
                            let before = range_payload_relation(&previous, &payload, 1);
                            if let BoolValue::Error(error) = before {
                                return MultirangeValue::Error(error);
                            };
                            if let BoolValue::Unknown = before {
                                return MultirangeValue::Unknown;
                            };
                            emit_member = before == BoolValue::Value(true);
                        };
                        if emit_member == false {
                            let merged = range_payload_set(&previous, &payload, 2);
                            if let RangeValue::Error(error) = merged {
                                return MultirangeValue::Error(error);
                            };
                            if let RangeValue::Unknown = merged {
                                return MultirangeValue::Unknown;
                            };
                            let position = ranges.len() - 1;
                            ranges[position] = merged;
                        };
                    };
                };
                if emit_member {
                    ranges.push(RangeValue::Value(payload));
                };
            };
        };
        index += 1;
    }
    make_coerced_multirange_value(MultirangePayload {
        type_name: input.type_name,
        range_type: input.range_type,
        element_type: input.element_type,
        element_kind: input.element_kind,
        support: input.support,
        ranges: ranges,
    })
}

fn multirange_construct_empty(
    type_name: &str,
    range_type: &str,
    element_type: &str,
    element_kind: i32,
) -> MultirangeValue {
    multirange_construct_empty_with_support(
        type_name,
        range_type,
        element_type,
        element_kind,
        range_builtin_support(range_type, element_type, element_kind),
    )
}

pub fn multirange_construct_empty_with_support(
    type_name: &str,
    range_type: &str,
    element_type: &str,
    element_kind: i32,
    support: RangeSupport,
) -> MultirangeValue {
    let ranges: Vec<RangeValue> = Vec::new();
    make_coerced_multirange_value(MultirangePayload {
        type_name: type_name.to_owned(),
        range_type: range_type.to_owned(),
        element_type: element_type.to_owned(),
        element_kind: element_kind,
        support,
        ranges: ranges,
    })
}

fn multirange_construct_single(
    input: RangeValue,
    type_name: &str,
    range_type: &str,
    element_type: &str,
    element_kind: i32,
) -> MultirangeValue {
    let mut typed = range_require_type(input, range_type, element_type, element_kind);
    if let RangeValue::Value(payload) = typed {
        typed = make_coerced_range_value(payload);
    };
    if let RangeValue::Error(error) = typed {
        return MultirangeValue::Error(error);
    };
    if let RangeValue::Null = typed {
        return MultirangeValue::Null;
    };
    if let RangeValue::Value(payload) = typed {
        let support = payload.support;
        let mut ranges: Vec<RangeValue> = Vec::new();
        if payload.empty == false {
            ranges.push(RangeValue::Value(payload));
        };
        return make_coerced_multirange_value(MultirangePayload {
            type_name: type_name.to_owned(),
            range_type: range_type.to_owned(),
            element_type: element_type.to_owned(),
            element_kind: element_kind,
            support,
            ranges: ranges,
        });
    };
    MultirangeValue::Unknown
}

fn multirange_construct_array(
    input: ArrayValue,
    type_name: &str,
    range_type: &str,
    element_type: &str,
    element_kind: i32,
) -> MultirangeValue {
    multirange_construct_array_with_support(
        input,
        type_name,
        range_type,
        element_type,
        element_kind,
        range_builtin_support(range_type, element_type, element_kind),
    )
}

pub fn multirange_construct_single_with_support(
    input: RangeValue,
    type_name: &str,
    range_type: &str,
    element_type: &str,
    element_kind: i32,
    support: RangeSupport,
) -> MultirangeValue {
    let typed = range_require_support(input, support);
    multirange_construct_single(typed, type_name, range_type, element_type, element_kind)
}

pub fn multirange_construct_array_with_support(
    input: ArrayValue,
    type_name: &str,
    range_type: &str,
    element_type: &str,
    element_kind: i32,
    support: RangeSupport,
) -> MultirangeValue {
    if let ArrayValue::Error(error) = input {
        return MultirangeValue::Error(error);
    };
    if let ArrayValue::Null = input {
        return MultirangeValue::Null;
    };
    if let ArrayValue::Value(payload) = input {
        if payload.element_type.as_str() != range_type || payload.element_kind != 42 {
            return MultirangeValue::Unknown;
        };
        if payload.dimensions.len() > 1 {
            return MultirangeValue::Error(make_sql_error(MULTIRANGE_ARRAY_DIMENSIONS));
        };
        let mut ranges: Vec<RangeValue> = Vec::new();
        let mut index: usize = 0;
        let mut unknown = false;
        while index < payload.elements.len() {
            let cell = payload.elements[index].clone();
            let family = array_element_family(cell.clone());
            if family != 0 && family != 42 {
                return MultirangeValue::Unknown;
            };
            if let ArrayElement::Error(error) = cell {
                return MultirangeValue::Error(error);
            };
            if let ArrayElement::Null = cell {
                return MultirangeValue::Error(make_sql_error(MULTIRANGE_NULL_MEMBER));
            };
            if let ArrayElement::Unknown = cell {
                unknown = true;
            };
            if let ArrayElement::Range(span) = cell {
                let mut typed = range_require_type(
                    RangeValue::Value(span),
                    range_type,
                    element_type,
                    element_kind,
                );
                typed = range_require_support(typed, support);
                if let RangeValue::Value(span) = typed {
                    typed = make_coerced_range_value(span);
                };
                if let RangeValue::Error(error) = typed {
                    return MultirangeValue::Error(error);
                };
                if let RangeValue::Unknown = typed {
                    return MultirangeValue::Unknown;
                };
                ranges.push(typed);
            };
            index += 1;
        }
        if unknown {
            return MultirangeValue::Unknown;
        };
        return multirange_construct_normalize(MultirangePayload {
            type_name: type_name.to_owned(),
            range_type: range_type.to_owned(),
            element_type: element_type.to_owned(),
            element_kind: element_kind,
            support,
            ranges: ranges,
        });
    };
    MultirangeValue::Unknown
}

pub fn sql__pg_catalog__datemultirange__qjle() -> MultirangeValue {
    multirange_construct_empty(
        "pg_catalog.datemultirange",
        "pg_catalog.daterange",
        "pg_catalog.date",
        7,
    )
}

pub fn sql__pg_catalog__datemultirange__jpar(input: ArrayValue) -> MultirangeValue {
    multirange_construct_array(
        input,
        "pg_catalog.datemultirange",
        "pg_catalog.daterange",
        "pg_catalog.date",
        7,
    )
}

pub fn sql__pg_catalog__datemultirange__mwip(input: RangeValue) -> MultirangeValue {
    multirange_construct_single(
        input,
        "pg_catalog.datemultirange",
        "pg_catalog.daterange",
        "pg_catalog.date",
        7,
    )
}

pub fn sql__pg_catalog__int4multirange__qvfa() -> MultirangeValue {
    multirange_construct_empty(
        "pg_catalog.int4multirange",
        "pg_catalog.int4range",
        "pg_catalog.int4",
        2,
    )
}

pub fn sql__pg_catalog__int4multirange__809e(input: ArrayValue) -> MultirangeValue {
    multirange_construct_array(
        input,
        "pg_catalog.int4multirange",
        "pg_catalog.int4range",
        "pg_catalog.int4",
        2,
    )
}

pub fn sql__pg_catalog__int4multirange__weie(input: RangeValue) -> MultirangeValue {
    multirange_construct_single(
        input,
        "pg_catalog.int4multirange",
        "pg_catalog.int4range",
        "pg_catalog.int4",
        2,
    )
}

pub fn sql__pg_catalog__int8multirange__djko() -> MultirangeValue {
    multirange_construct_empty(
        "pg_catalog.int8multirange",
        "pg_catalog.int8range",
        "pg_catalog.int8",
        3,
    )
}

pub fn sql__pg_catalog__int8multirange__x1sx(input: ArrayValue) -> MultirangeValue {
    multirange_construct_array(
        input,
        "pg_catalog.int8multirange",
        "pg_catalog.int8range",
        "pg_catalog.int8",
        3,
    )
}

pub fn sql__pg_catalog__int8multirange__jzn4(input: RangeValue) -> MultirangeValue {
    multirange_construct_single(
        input,
        "pg_catalog.int8multirange",
        "pg_catalog.int8range",
        "pg_catalog.int8",
        3,
    )
}

pub fn sql__pg_catalog__nummultirange__qnke() -> MultirangeValue {
    multirange_construct_empty(
        "pg_catalog.nummultirange",
        "pg_catalog.numrange",
        "pg_catalog.\"numeric\"",
        10,
    )
}

pub fn sql__pg_catalog__nummultirange__voqt(input: ArrayValue) -> MultirangeValue {
    multirange_construct_array(
        input,
        "pg_catalog.nummultirange",
        "pg_catalog.numrange",
        "pg_catalog.\"numeric\"",
        10,
    )
}

pub fn sql__pg_catalog__nummultirange__88ec(input: RangeValue) -> MultirangeValue {
    multirange_construct_single(
        input,
        "pg_catalog.nummultirange",
        "pg_catalog.numrange",
        "pg_catalog.\"numeric\"",
        10,
    )
}

pub fn sql__pg_catalog__tsmultirange__bmb3() -> MultirangeValue {
    multirange_construct_empty(
        "pg_catalog.tsmultirange",
        "pg_catalog.tsrange",
        "pg_catalog.\"timestamp\"",
        4,
    )
}

pub fn sql__pg_catalog__tsmultirange__pp1p(input: ArrayValue) -> MultirangeValue {
    multirange_construct_array(
        input,
        "pg_catalog.tsmultirange",
        "pg_catalog.tsrange",
        "pg_catalog.\"timestamp\"",
        4,
    )
}

pub fn sql__pg_catalog__tsmultirange__kuha(input: RangeValue) -> MultirangeValue {
    multirange_construct_single(
        input,
        "pg_catalog.tsmultirange",
        "pg_catalog.tsrange",
        "pg_catalog.\"timestamp\"",
        4,
    )
}

pub fn sql__pg_catalog__tstzmultirange__3xsg() -> MultirangeValue {
    multirange_construct_empty(
        "pg_catalog.tstzmultirange",
        "pg_catalog.tstzrange",
        "pg_catalog.timestamptz",
        5,
    )
}

pub fn sql__pg_catalog__tstzmultirange__hkj9(input: ArrayValue) -> MultirangeValue {
    multirange_construct_array(
        input,
        "pg_catalog.tstzmultirange",
        "pg_catalog.tstzrange",
        "pg_catalog.timestamptz",
        5,
    )
}

pub fn sql__pg_catalog__tstzmultirange__z001(input: RangeValue) -> MultirangeValue {
    multirange_construct_single(
        input,
        "pg_catalog.tstzmultirange",
        "pg_catalog.tstzrange",
        "pg_catalog.timestamptz",
        5,
    )
}
