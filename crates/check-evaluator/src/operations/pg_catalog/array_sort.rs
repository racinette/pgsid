const ARRAY_SORT_MISSING: u32 = 466560;
const ARRAY_SORT_ARRAY_MISSING: u32 = 6822435;

fn array_sort_payload(
    value: ArrayPayload,
    state: i32,
    error: SqlError,
    descending: bool,
    nulls_first: bool,
) -> ArraySortPayload {
    let mut rows: i32 = 0;
    let mut null_bitmap = value.null_bitmap;
    if value.dimensions.len() > 0 && value.dimensions[0].length >= 2 {
        null_bitmap = array_reconstruction_bitmap(&value);
    };
    let mut width: i32 = 0;
    if value.dimensions.len() > 0 {
        rows = value.dimensions[0].length;
        width = (value.elements.len() as i32) / rows;
    };
    let mut order: Vec<usize> = Vec::new();
    let mut buffer: Vec<usize> = Vec::new();
    let mut ties: Vec<usize> = Vec::new();
    let mut index: i32 = 0;
    while index < rows {
        let position = usize::try_from(index).unwrap_or(0);
        order.push(position);
        buffer.push(position);
        ties.push(0);
        index = index + 1;
    }
    let mut right: i32 = 0;
    if rows > 0 {
        right = 1;
    };
    ArraySortPayload {
        null_bitmap: null_bitmap,
        element_type: value.element_type,
        element_kind: value.element_kind,
        dimensions: value.dimensions,
        elements: value.elements,
        order: order,
        buffer: buffer,
        ties: ties,
        rows: rows,
        width: width,
        run: 1,
        segment: 0,
        left: 0,
        right: right,
        output: 0,
        phase: 1,
        tie: 1,
        state: state,
        error: error,
        descending: descending,
        nulls_first: nulls_first,
    }
}

fn array_sort_status(state: i32, error: SqlError) -> ArraySortPayload {
    let dimensions: Vec<ArrayDimension> = Vec::new();
    let elements: Vec<ArrayElement> = Vec::new();
    let value = ArrayPayload {
        null_bitmap: BoolValue::Unknown,
        element_type: String::new(),
        element_kind: 0,
        dimensions: dimensions,
        elements: elements,
    };
    array_sort_payload(value, state, error, false, false)
}

pub(crate) fn prepare_array_sort(
    input: ArrayValue,
    descending: BoolValue,
    nulls_first: BoolValue,
    available: bool,
) -> ArraySortPayload {
    if let ArrayValue::Error(error) = input {
        return array_sort_status(-2, error);
    };
    if let BoolValue::Error(error) = descending {
        return array_sort_status(-2, error);
    };
    if let BoolValue::Error(error) = nulls_first {
        return array_sort_status(-2, error);
    };
    if let ArrayValue::Null = input {
        return array_sort_status(0, make_sql_error(0));
    };
    if descending == BoolValue::Null || nulls_first == BoolValue::Null {
        return array_sort_status(0, make_sql_error(0));
    };
    if let ArrayValue::Value(value) = input {
        if let BoolValue::Value(reverse) = descending {
            if let BoolValue::Value(null_order) = nulls_first {
                let mut state: i32 = 1;
                let mut error = make_sql_error(0);
                if value.dimensions.len() == 0 || value.dimensions[0].length < 2 {
                    state = 2;
                } else if available == false {
                    state = -2;
                    error = make_sql_error(ARRAY_SORT_MISSING);
                    if value.dimensions.len() > 1 {
                        error = make_sql_error(ARRAY_SORT_ARRAY_MISSING);
                    };
                };
                return array_sort_payload(value, state, error, reverse, null_order);
            };
        };
    };
    array_sort_status(-1, make_sql_error(0))
}

pub(crate) fn array_sort_continues(input: &ArraySortPayload) -> bool {
    input.state == 1
}

fn array_sort_middle(input: &ArraySortPayload) -> i32 {
    let value = (input.segment as i64) + (input.run as i64);
    if value > (input.rows as i64) {
        return input.rows;
    };
    value as i32
}
fn array_sort_end(input: &ArraySortPayload) -> i32 {
    let value = (input.segment as i64) + 2i64 * (input.run as i64);
    if value > (input.rows as i64) {
        return input.rows;
    };
    value as i32
}

pub(crate) fn array_sort_needs_pair(input: &ArraySortPayload) -> bool {
    if input.state != 1 {
        return false;
    };
    if input.phase == 2 {
        return input.tie < input.rows;
    };
    input.left < array_sort_middle(input) && input.right < array_sort_end(input)
}

pub(crate) fn array_sort_pair_continues(
    input: &ArraySortPayload,
    index: Int4Value,
    compared: Int4Value,
) -> bool {
    if compared != make_int4_value(0) {
        return false;
    };
    if let Int4Value::Value(position) = index {
        return position >= 0 && position < input.width;
    };
    false
}

pub(crate) fn array_sort_element_at(
    input: &ArraySortPayload,
    index: Int4Value,
    right: bool,
) -> ArrayElement {
    let mut row = input.left;
    if right {
        row = input.right;
    };
    if input.phase == 2 {
        row = input.tie - 1;
        if right {
            row = input.tie;
        };
    };
    let row_index = usize::try_from(row).unwrap_or(input.order.len());
    if row_index >= input.order.len() {
        return ArrayElement::Unknown;
    };
    if let Int4Value::Value(column) = index {
        let offset = (input.order[row_index] as i32) * input.width + column;
        let position = usize::try_from(offset).unwrap_or(input.elements.len());
        if column >= 0 && column < input.width && position < input.elements.len() {
            return input.elements[position].clone();
        };
    };
    ArrayElement::Unknown
}

pub(crate) fn array_sort_cell_pair(
    input: &ArraySortPayload,
    left: ArrayElement,
    right: ArrayElement,
) -> Int4Value {
    let mut nullable = false;
    if let ArrayElement::Null = left {
        nullable = true;
    };
    if let ArrayElement::Null = right {
        nullable = true;
    };
    let compared = array_comparison_pair(left, right, false);
    if nullable && input.dimensions.len() == 1 && input.nulls_first != input.descending {
        if let Int4Value::Value(value) = compared {
            return make_int4_value(0 - value);
        };
    };
    compared
}

pub(crate) fn array_sort_step(input: ArraySortPayload, compared: Int4Value) -> ArraySortPayload {
    let mut state = input.state;
    let mut error = input.error;
    let mut run = input.run;
    let mut segment = input.segment;
    let mut left = input.left;
    let mut right = input.right;
    let mut output = input.output;
    let mut phase = input.phase;
    let mut tie = input.tie;
    let middle = array_sort_middle(&input);
    let end = array_sort_end(&input);
    let required = array_sort_needs_pair(&input);
    let order = input.order;
    let mut buffer = input.buffer;
    let mut ties = input.ties;
    if state == 1 {
        let mut comparison: i32 = 0;
        if required {
            if let Int4Value::Error(failed) = compared {
                state = -2;
                error = failed;
            };
            if compared == Int4Value::Unknown || compared == Int4Value::Null {
                state = 3;
            };
            if let Int4Value::Value(value) = compared {
                comparison = value;
            };
        };
        if state == 1 {
            if phase == 2 {
                let position = usize::try_from(tie).unwrap_or(ties.len());
                if comparison == 0 {
                    ties[position] = 1;
                };
                tie = tie + 1;
                if tie >= input.rows {
                    state = 4;
                };
            } else {
                if input.descending {
                    comparison = 0 - comparison;
                };
                let mut chosen = left;
                if left >= middle || (right < end && comparison > 0) {
                    chosen = right;
                    right = right + 1;
                } else {
                    left = left + 1;
                };
                let destination = usize::try_from(output).unwrap_or(buffer.len());
                let origin = usize::try_from(chosen).unwrap_or(order.len());
                buffer[destination] = order[origin];
                output = output + 1;
                if output >= end {
                    segment = end;
                    left = segment;
                    let next = (segment as i64) + (run as i64);
                    right = input.rows;
                    if next < (input.rows as i64) {
                        right = next as i32;
                    };
                    if segment >= input.rows {
                        let next_run = 2i64 * (run as i64);
                        run = input.rows;
                        if next_run < (input.rows as i64) {
                            run = next_run as i32;
                        };
                        segment = 0;
                        left = 0;
                        right = run;
                        output = 0;
                        if run >= input.rows {
                            phase = 2;
                        };
                        return ArraySortPayload {
                            null_bitmap: input.null_bitmap,
                            element_type: input.element_type,
                            element_kind: input.element_kind,
                            dimensions: input.dimensions,
                            elements: input.elements,
                            order: buffer,
                            buffer: order,
                            ties: ties,
                            rows: input.rows,
                            width: input.width,
                            run: run,
                            segment: segment,
                            left: left,
                            right: right,
                            output: output,
                            phase: phase,
                            tie: tie,
                            state: state,
                            error: error,
                            descending: input.descending,
                            nulls_first: input.nulls_first,
                        };
                    };
                };
            };
        };
    };
    ArraySortPayload {
        null_bitmap: input.null_bitmap,
        element_type: input.element_type,
        element_kind: input.element_kind,
        dimensions: input.dimensions,
        elements: input.elements,
        order: order,
        buffer: buffer,
        ties: ties,
        rows: input.rows,
        width: input.width,
        run: run,
        segment: segment,
        left: left,
        right: right,
        output: output,
        phase: phase,
        tie: tie,
        state: state,
        error: error,
        descending: input.descending,
        nulls_first: input.nulls_first,
    }
}

fn array_sort_same_element(left: ArrayElement, right: ArrayElement) -> bool {
    let kind = array_element_family(left.clone());
    if kind != array_element_family(right.clone()) {
        return false;
    };
    if let ArrayElement::Null = left {
        if let ArrayElement::Null = right {
            return true;
        };
    };
    if let ArrayElement::ByteaUnspecified(_) = left {
        return false;
    };
    if kind == 42 {
        let first_range = array_element_to_range(left);
        let second_range = array_element_to_range(right);
        if let RangeValue::Value(first) = first_range {
            if let RangeValue::Value(second) = second_range {
                if first.type_name != second.type_name || first.element_type != second.element_type
                    || first.element_kind != second.element_kind || first.empty != second.empty
                    || first.lower_inclusive != second.lower_inclusive || first.upper_inclusive != second.upper_inclusive
                    || first.bounds.len() != second.bounds.len() {
                    return false;
                };
                let mut position: usize = 0;
                while position < first.bounds.len() {
                    if array_sort_same_element(first.bounds[position].clone(), second.bounds[position].clone()) == false {
                        return false;
                    };
                    position += 1;
                }
                return true;
            };
        };
        return false;
    };
    if kind == 43 {
        let first_multi = array_element_to_multirange(left);
        let second_multi = array_element_to_multirange(right);
        if let MultirangeValue::Value(first) = first_multi {
            if let MultirangeValue::Value(second) = second_multi {
                if first.type_name != second.type_name || first.range_type != second.range_type
                    || first.element_type != second.element_type || first.element_kind != second.element_kind
                    || first.ranges.len() != second.ranges.len() {
                    return false;
                };
                let mut position: usize = 0;
                while position < first.ranges.len() {
                    let first_member = array_element_from_range(first.ranges[position].clone());
                    let second_member = array_element_from_range(second.ranges[position].clone());
                    if array_sort_same_element(first_member, second_member) == false {
                        return false;
                    };
                    position += 1;
                }
                return true;
            };
        };
        return false;
    };
    if kind == 1 {
        return array_element_to_int2(left) == array_element_to_int2(right);
    };
    if kind == 2 {
        return array_element_to_int4(left) == array_element_to_int4(right);
    };
    if kind == 3 {
        return array_element_to_int8(left) == array_element_to_int8(right);
    };
    if kind == 4 {
        return array_element_to_timestamp(left) == array_element_to_timestamp(right);
    };
    if kind == 5 {
        return array_element_to_timestamptz(left) == array_element_to_timestamptz(right);
    };
    if kind == 6 {
        return array_element_to_enum(left) == array_element_to_enum(right);
    };
    if kind == 7 {
        return array_element_to_date(left) == array_element_to_date(right);
    };
    if kind == 8 {
        return array_element_to_text(left) == array_element_to_text(right);
    };
    if kind == 9 {
        return array_element_to_bool(left) == array_element_to_bool(right);
    };
    if kind == 10 {
        return array_element_to_numeric(left) == array_element_to_numeric(right);
    };
    if kind == 13 {
        return array_element_to_network(left) == array_element_to_network(right);
    };
    if kind == 14 {
        return array_element_to_bit(left) == array_element_to_bit(right);
    };
    if kind == 15 {
        return array_element_to_bytea(left) == array_element_to_bytea(right);
    };
    if kind == 16 {
        return array_element_to_macaddr(left) == array_element_to_macaddr(right);
    };
    if kind == 17 {
        return array_element_to_macaddr8(left) == array_element_to_macaddr8(right);
    };
    if kind == 18 {
        return array_element_to_uuid(left) == array_element_to_uuid(right);
    };
    if kind == 19 {
        return array_element_to_float4(left) == array_element_to_float4(right);
    };
    if kind == 20 {
        return array_element_to_float8(left) == array_element_to_float8(right);
    };
    if kind == 21 {
        return array_element_to_time(left) == array_element_to_time(right);
    };
    if kind == 22 {
        return array_element_to_timetz(left) == array_element_to_timetz(right);
    };
    if kind == 23 {
        return array_element_to_interval(left) == array_element_to_interval(right);
    };
    if kind == 24 {
        return array_element_to_point(left) == array_element_to_point(right);
    };
    if kind == 25 {
        return array_element_to_line(left) == array_element_to_line(right);
    };
    if kind == 26 {
        return array_element_to_lseg(left) == array_element_to_lseg(right);
    };
    if kind == 27 {
        return array_element_to_box(left) == array_element_to_box(right);
    };
    if kind == 30 {
        return array_element_to_circle(left) == array_element_to_circle(right);
    };
    if kind == 31 {
        return array_element_to_money(left) == array_element_to_money(right);
    };
    if kind == 32 {
        return array_element_to_internal_char(left) == array_element_to_internal_char(right);
    };
    if kind == 33 {
        return array_element_to_oid(left) == array_element_to_oid(right);
    };
    if kind == 34 {
        return array_element_to_xid(left) == array_element_to_xid(right);
    };
    if kind == 35 {
        return array_element_to_cid(left) == array_element_to_cid(right);
    };
    if kind == 37 {
        return array_element_to_xid8(left) == array_element_to_xid8(right);
    };
    if kind == 38 {
        return array_element_to_pg_lsn(left) == array_element_to_pg_lsn(right);
    };
    if kind == 39 {
        return array_element_to_tid(left) == array_element_to_tid(right);
    };
    if kind == 41 {
        let first_array = array_element_to_array(left);
        let second_array = array_element_to_array(right);
        if let ArrayValue::Value(first) = first_array {
            if let ArrayValue::Value(second) = second_array {
                if first.element_type != second.element_type
                    || first.element_kind != second.element_kind
                    || first.null_bitmap != second.null_bitmap
                    || first.dimensions.len() != second.dimensions.len()
                    || first.elements.len() != second.elements.len()
                {
                    return false;
                };
                let mut dimension: usize = 0;
                while dimension < first.dimensions.len() {
                    if first.dimensions[dimension].lower != second.dimensions[dimension].lower
                        || first.dimensions[dimension].length != second.dimensions[dimension].length
                    {
                        return false;
                    };
                    dimension += 1;
                }
                let mut position: usize = 0;
                while position < first.elements.len() {
                    if array_sort_same_element(
                        first.elements[position].clone(),
                        second.elements[position].clone(),
                    ) == false
                    {
                        return false;
                    };
                    position += 1;
                }
                return true;
            };
        };
        return false;
    };
    if kind == 12 {
        let a = jsonb_to_ordered_text(array_element_to_jsonb(left));
        let b = jsonb_to_ordered_text(array_element_to_jsonb(right));
        if let TextValue::Value(first) = a {
            if let TextValue::Value(second) = b {
                return first == second;
            };
        };
        return false;
    };
    if kind == 28 {
        let first_path = array_element_to_path(left);
        let second_path = array_element_to_path(right);
        if let PathValue::Value(first) = first_path {
            if let PathValue::Value(second) = second_path {
                if first.closed != second.closed || first.points.len() != second.points.len() {
                    return false;
                };
                let mut position: usize = 0;
                while position < first.points.len() {
                    if first.points[position] != second.points[position] {
                        return false;
                    };
                    position += 1;
                }
                return true;
            };
        };
    };
    false
}

pub(crate) fn finish_array_sort(input: ArraySortPayload) -> ArrayValue {
    if input.state == -2 {
        return ArrayValue::Error(input.error);
    };
    if input.state == 0 {
        return ArrayValue::Null;
    };
    if input.state == -1 {
        return ArrayValue::Unknown;
    };
    if input.state == 2 {
        return make_array_value(ArrayPayload {
            null_bitmap: input.null_bitmap,
            element_type: input.element_type,
            element_kind: input.element_kind,
            dimensions: input.dimensions,
            elements: input.elements,
        });
    };
    let mut elements: Vec<ArrayElement> = Vec::new();
    if input.state == 3 {
        let mut position: usize = 0;
        while position < input.elements.len() {
            elements.push(ArrayElement::Unknown);
            position += 1;
        }
    } else if input.state == 4 {
        let mut start: i32 = 0;
        while start < input.rows {
            let mut end = start + 1;
            while end < input.rows {
                let position = usize::try_from(end).unwrap_or(input.ties.len());
                if input.ties[position] == 0 {
                    break;
                };
                end = end + 1;
            }
            let mut consensus: Vec<ArrayElement> = Vec::new();
            let mut column: i32 = 0;
            while column < input.width {
                let first = usize::try_from(start).unwrap_or(input.order.len());
                let offset = (input.order[first] as i32) * input.width + column;
                let position = usize::try_from(offset).unwrap_or(input.elements.len());
                let element = input.elements[position].clone();
                let mut same = true;
                let mut candidate = start + 1;
                while candidate < end {
                    let other = usize::try_from(candidate).unwrap_or(input.order.len());
                    let other_offset = (input.order[other] as i32) * input.width + column;
                    let other_position =
                        usize::try_from(other_offset).unwrap_or(input.elements.len());
                    if array_sort_same_element(
                        element.clone(),
                        input.elements[other_position].clone(),
                    ) == false
                    {
                        same = false;
                    };
                    candidate = candidate + 1;
                }
                if same {
                    consensus.push(element);
                } else {
                    consensus.push(ArrayElement::Unknown);
                };
                column = column + 1;
            }
            let mut row = start;
            while row < end {
                let mut cell: usize = 0;
                while cell < consensus.len() {
                    elements.push(consensus[cell].clone());
                    cell += 1;
                }
                row = row + 1;
            }
            start = end;
        }
    } else {
        return ArrayValue::Unknown;
    };
    make_array_value(ArrayPayload {
        null_bitmap: input.null_bitmap,
        element_type: input.element_type,
        element_kind: input.element_kind,
        dimensions: input.dimensions,
        elements: elements,
    })
}

pub fn sql__pg_catalog__array_sort__hxzh(input: ArrayValue) -> ArrayValue {
    input
}
pub fn sql__pg_catalog__array_sort__x65f(input: ArrayValue) -> ArrayValue {
    input
}
pub fn sql__pg_catalog__array_sort__f418(input: ArrayValue) -> ArrayValue {
    input
}
