pub fn prepare_array_quantifier(
    scalar: BoolValue,
    input: ArrayValue,
    strict: bool,
) -> ArrayComparisonPayload {
    if let BoolValue::Error(error) = scalar {
        return array_comparison_state(-2, error, 0);
    };
    if let ArrayValue::Error(error) = input {
        return array_comparison_state(-2, error, 0);
    };
    if let ArrayValue::Null = input {
        return array_comparison_state(0, make_sql_error(0), 0);
    };
    if let ArrayValue::Value(value) = input {
        let limit = value.elements.len();
        if limit > 0 && strict && scalar == BoolValue::Value(true) {
            return array_comparison_state(0, make_sql_error(0), 0);
        };
        let right: Vec<ArrayElement> = Vec::new();
        return ArrayComparisonPayload {
            left: value.elements,
            right: right,
            limit: limit,
            state: 1,
            error: make_sql_error(0),
            tail: 0,
            value: 0,
        };
    };
    array_comparison_state(-1, make_sql_error(0), 0)
}

pub(crate) fn array_quantifier_initial(input: &ArrayComparisonPayload, any: bool) -> CheckOutcome {
    if input.state == -2 {
        return CheckOutcome::Error(input.error);
    };
    if input.state == -1 {
        return CheckOutcome::Unknown;
    };
    if input.state == 0 {
        return CheckOutcome::Null;
    };
    if any {
        return CheckOutcome::False;
    };
    CheckOutcome::True
}

pub(crate) fn array_quantifier_continues(
    input: &ArrayComparisonPayload,
    index: Int4Value,
    result: CheckOutcome,
    any: bool,
    safe: bool,
) -> bool {
    if let CheckOutcome::Error(_) = result {
        return false;
    };
    if result == CheckOutcome::Unknown && safe == false {
        return false;
    };
    if any && result == CheckOutcome::True {
        return false;
    };
    if any == false && result == CheckOutcome::False {
        return false;
    };
    if let Int4Value::Value(offset) = index {
        return input.state == 1 && offset >= 0 && (offset as i64) < ((input.limit as i32) as i64);
    };
    false
}

pub fn array_quantifier_cell(nullness: BoolValue, strict: bool) -> BoolValue {
    if let BoolValue::Error(error) = nullness {
        return BoolValue::Error(error);
    };
    if strict && nullness == BoolValue::Value(true) {
        return BoolValue::Null;
    };
    BoolValue::Value(true)
}

pub fn array_quantifier_needs_call(input: BoolValue) -> bool {
    input == BoolValue::Value(true)
}

pub fn array_quantifier_step(left: CheckOutcome, right: BoolValue, any: bool) -> CheckOutcome {
    let value = check_from_bool(right);
    if any {
        return or_finish(left, value);
    };
    and_finish(left, value)
}

pub fn array_quantifier_finish(input: CheckOutcome, validity: CheckOutcome) -> BoolValue {
    if let CheckOutcome::Error(error) = validity {
        return BoolValue::Error(error);
    };
    if validity == CheckOutcome::Unknown {
        return BoolValue::Unknown;
    };
    bool_from_check(input)
}
