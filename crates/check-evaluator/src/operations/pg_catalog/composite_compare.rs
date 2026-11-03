const RECORD_COMPARISON_TYPE_MISMATCH: u32 = 6822148;
const RECORD_COMPARISON_UNDEFINED: u32 = 6822435;
const RECORD_COMPARISON_COLLATION: u32 = 6844250;
const RECORD_INPUT_ANONYMOUS: u32 = 466560;

fn record_comparison_state(state: i32, error: SqlError) -> ArrayComparisonPayload {
    let left: Vec<ArrayElement> = Vec::new();
    let right: Vec<ArrayElement> = Vec::new();
    ArrayComparisonPayload {
        left: left,
        right: right,
        limit: 0,
        state: state,
        error: error,
        tail: 0,
        value: 0,
        flavor: 2,
    }
}

pub fn prepare_record_comparison(
    left: CompositeValue,
    right: CompositeValue,
    left_type: &str,
    right_type: &str,
    left_count: i32,
    right_count: i32,
) -> ArrayComparisonPayload {
    if let CompositeValue::Error(error) = left {
        return record_comparison_state(-2, error);
    };
    if let CompositeValue::Error(error) = right {
        return record_comparison_state(-2, error);
    };
    let mut deferred_flavor: i32 = 0;
    if let CompositeValue::Unknown = left { deferred_flavor = 1; };
    if let CompositeValue::Unknown = right { deferred_flavor = 1; };
    if let CompositeValue::Unimplemented = left { deferred_flavor = 2; };
    if let CompositeValue::Unimplemented = right { deferred_flavor = 2; };
    if deferred_flavor > 0 {
        return array_comparison_unresolved(deferred_flavor, 0);
    };
    if let CompositeValue::Null = left {
        return record_comparison_state(0, make_sql_error(0));
    };
    if let CompositeValue::Null = right {
        return record_comparison_state(0, make_sql_error(0));
    };
    if let CompositeValue::Value(a) = left {
        if let CompositeValue::Value(b) = right {
            if a.type_name.as_str() != left_type
                || b.type_name.as_str() != right_type
                || left_count < 0
                || right_count < 0
                || a.fields.len() > 2147483647
                || b.fields.len() > 2147483647
                || a.fields.len() as i32 != left_count
                || b.fields.len() as i32 != right_count
            {
                return record_comparison_state(-1, make_sql_error(0));
            };
            let mut limit = a.fields.len();
            let mut tail = 0;
            if b.fields.len() < limit {
                limit = b.fields.len();
            };
            if a.fields.len() != b.fields.len() {
                tail = 1;
            };
            return ArrayComparisonPayload {
                left: a.fields,
                right: b.fields,
                limit: limit,
                state: 1,
                error: make_sql_error(0),
                tail: tail,
                value: 0,
                flavor: 2,
            };
        };
    };
    record_comparison_state(-1, make_sql_error(0))
}

pub fn record_comparison_pair(
    left: ArrayElement,
    right: ArrayElement,
    same_type: bool,
    available: i32,
    equality: bool,
) -> Int4Value {
    let mut unresolved_flavor: i32 = 0;
    if let ArrayElement::Unknown = left { unresolved_flavor = 1; };
    if let ArrayElement::Unknown = right { unresolved_flavor = 1; };
    if let ArrayElement::Unimplemented = left { unresolved_flavor = 2; };
    if let ArrayElement::Unimplemented = right { unresolved_flavor = 2; };
    if same_type == false {
        return Int4Value::Error(make_sql_error(RECORD_COMPARISON_TYPE_MISMATCH));
    };
    if available == 0 {
        return Int4Value::Error(make_sql_error(RECORD_COMPARISON_UNDEFINED));
    };
    // Uncaptured or disagreeing field support is decided by the deployment's operator classes.
    if available != 1 {
        return int4_unresolved(resolution_context(unresolved_flavor));
    };
    array_comparison_pair(left, right, equality)
}

pub(crate) fn record_comparison_ready(input: &ArrayComparisonPayload) -> bool {
    input.state == 1
}

pub fn record_invalid_collation() -> Int4Value {
    Int4Value::Error(make_sql_error(RECORD_COMPARISON_COLLATION))
}

pub(crate) fn finish_record_comparison(
    input: &ArrayComparisonPayload,
    result: Int4Value,
) -> Int4Value {
    if input.state == 1 && input.tail != 0 {
        if let Int4Value::Value(value) = result {
            if value == 0 {
                return Int4Value::Error(make_sql_error(RECORD_COMPARISON_TYPE_MISMATCH));
            };
        };
    };
    result
}

pub fn record_anonymous_input(input: TextValue) -> CompositeValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = input { unresolved_flavor = 1; };
    if let TextValue::NonNull = input { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TextValue::Unimplemented = input { unresolved_flavor = 2; };
    if let TextValue::Error(error) = input {
        return CompositeValue::Error(error);
    };
    if let TextValue::Null = input {
        return CompositeValue::Null;
    };
    if let TextValue::Value(_) = input {
        return CompositeValue::Error(make_sql_error(RECORD_INPUT_ANONYMOUS));
    };
    composite_row_unresolved(unresolved_flavor)
}

fn record_array_input_with_nulls(input: TextValue, nulls: i32) -> ArrayValue {
    let plan = prepare_array_text(input, false, nulls);
    let mut converted = make_array_conversion();
    let mut index = make_int4_value(0);
    while array_text_has_event(&plan, index) {
        let text = array_text_event_at(&plan, index);
        let record = record_anonymous_input(text);
        let element = array_element_from_composite(record);
        converted = append_array_conversion(converted, element, true);
        index = array_text_next_index(index);
    }
    let converted_arguments = array_conversion_arguments(converted, "pg_catalog.record", 44);
    finish_prepared_array_text(plan, converted_arguments)
}

pub fn record_array_from_text(input: TextValue, nulls: i32) -> ArrayValue {
    let mut unresolved_flavor: i32 = 0;
    if let TextValue::Unknown = input { unresolved_flavor = 1; };
    if let TextValue::NonNull = input { if unresolved_flavor < 1 { unresolved_flavor = 1; }; };
    if let TextValue::Unimplemented = input { unresolved_flavor = 2; };
    if nulls == 0 || nulls == 1 {
        return record_array_input_with_nulls(input, nulls);
    };
    let first = record_array_input_with_nulls(input.clone(), 1);
    let second = record_array_input_with_nulls(input, 0);
    // The settings disagree only where an unquoted NULL is read, so a disagreement follows the
    // session's array_nulls, unless either reading is itself unimplemented.
    let mut setting_flavor: i32 = resolution_context(unresolved_flavor);
    if let ArrayValue::Unimplemented = first { setting_flavor = 2; };
    if let ArrayValue::Unimplemented = second { setting_flavor = 2; };
    if let ArrayValue::Error(left) = first {
        if let ArrayValue::Error(right) = second {
            if left.state == right.state {
                return ArrayValue::Error(left);
            };
        };
        return array_unresolved(setting_flavor);
    };
    if let ArrayValue::Null = first {
        if let ArrayValue::Null = second {
            return ArrayValue::Null;
        };
        return array_unresolved(setting_flavor);
    };
    if let ArrayValue::Value(left) = first {
        if let ArrayValue::Value(right) = second {
            let mut null_read = false;
            let mut position: usize = 0;
            while position < left.elements.len() {
                let element = left.elements[position].clone();
                if let ArrayElement::Null = element {
                    null_read = true;
                };
                position += 1;
            }
            if null_read == false && left.elements.len() == right.elements.len() {
                return make_array_value(left);
            };
        };
    };
    array_unresolved(setting_flavor)
}

pub fn sql__pg_catalog__record_eq__rc7m(input: Int4Value) -> BoolValue {
    array_comparison_boolean(input, 3)
}
pub fn sql__pg_catalog__record_ne__dmf7(input: Int4Value) -> BoolValue {
    array_comparison_boolean(input, 6)
}
pub fn sql__pg_catalog__record_lt__393p(input: Int4Value) -> BoolValue {
    array_comparison_boolean(input, 1)
}
pub fn sql__pg_catalog__record_le__xg5r(input: Int4Value) -> BoolValue {
    array_comparison_boolean(input, 2)
}
pub fn sql__pg_catalog__record_gt__3rut(input: Int4Value) -> BoolValue {
    array_comparison_boolean(input, 5)
}
pub fn sql__pg_catalog__record_ge__69vm(input: Int4Value) -> BoolValue {
    array_comparison_boolean(input, 4)
}
pub fn sql__pg_catalog__btrecordcmp__m4or(input: Int4Value) -> Int4Value {
    input
}
