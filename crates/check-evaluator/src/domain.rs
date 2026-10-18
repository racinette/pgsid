pub fn domain_conversion_start(input: BoolValue, not_null: bool) -> CheckOutcome {
    if let BoolValue::Error(error) = input {
        return CheckOutcome::Error(error);
    };
    if input != BoolValue::Value(true) && input != BoolValue::Value(false) {
        return CheckOutcome::Unknown;
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
    if let CheckOutcome::Error(error) = result {
        return ArrayElement::Error(error);
    };
    if result == CheckOutcome::Unknown {
        return ArrayElement::Unknown;
    };
    input
}

pub fn finish_domain_array_input(input: ArrayTextPayload, converted: ArrayArguments) -> ArrayValue {
    if let ArrayArguments::Unknown = converted {
        return ArrayValue::Unknown;
    };
    finish_prepared_array_text(input, converted)
}

pub fn finish_array_domain_conversion(input: ArrayValue, result: CheckOutcome) -> ArrayValue {
    if let CheckOutcome::Error(error) = result {
        return ArrayValue::Error(error);
    };
    if result == CheckOutcome::Unknown {
        return ArrayValue::Unknown;
    };
    input
}
