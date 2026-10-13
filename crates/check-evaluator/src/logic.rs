pub fn and_stops(left: CheckOutcome) -> bool {
    if left == CheckOutcome::False {
        return true;
    }
    if let CheckOutcome::Error(_) = left {
        return true;
    }
    false
}

pub fn and_finish(left: CheckOutcome, right: CheckOutcome) -> CheckOutcome {
    if let CheckOutcome::Error(error) = left {
        return CheckOutcome::Error(error);
    }
    if let CheckOutcome::Error(error) = right {
        return CheckOutcome::Error(error);
    }
    if left == CheckOutcome::False || right == CheckOutcome::False {
        return CheckOutcome::False;
    }
    if left == CheckOutcome::Unknown || right == CheckOutcome::Unknown {
        return CheckOutcome::Unknown;
    }
    if left == CheckOutcome::Null || right == CheckOutcome::Null {
        return CheckOutcome::Null;
    }
    CheckOutcome::True
}

pub fn or_stops(left: CheckOutcome) -> bool {
    if left == CheckOutcome::True {
        return true;
    }
    if let CheckOutcome::Error(_) = left {
        return true;
    }
    false
}

pub fn or_finish(left: CheckOutcome, right: CheckOutcome) -> CheckOutcome {
    if let CheckOutcome::Error(error) = left {
        return CheckOutcome::Error(error);
    }
    if let CheckOutcome::Error(error) = right {
        return CheckOutcome::Error(error);
    }
    if left == CheckOutcome::True || right == CheckOutcome::True {
        return CheckOutcome::True;
    }
    if left == CheckOutcome::Unknown || right == CheckOutcome::Unknown {
        return CheckOutcome::Unknown;
    }
    if left == CheckOutcome::Null || right == CheckOutcome::Null {
        return CheckOutcome::Null;
    }
    CheckOutcome::False
}

pub fn not_finish(value: CheckOutcome) -> CheckOutcome {
    if value == CheckOutcome::True {
        return CheckOutcome::False;
    }
    if value == CheckOutcome::False {
        return CheckOutcome::True;
    }
    value
}

fn boolean_test_finish(value: CheckOutcome, matched: bool) -> CheckOutcome {
    if case_guard_stops(value) {
        return value;
    }
    if matched {
        return CheckOutcome::True;
    }
    CheckOutcome::False
}

pub fn is_true_finish(value: CheckOutcome) -> CheckOutcome {
    boolean_test_finish(value, value == CheckOutcome::True)
}

pub fn is_false_finish(value: CheckOutcome) -> CheckOutcome {
    boolean_test_finish(value, value == CheckOutcome::False)
}

pub fn is_unknown_finish(value: CheckOutcome) -> CheckOutcome {
    boolean_test_finish(value, value == CheckOutcome::Null)
}

pub fn distinct_needs_comparison(left_null: BoolValue, right_null: BoolValue) -> bool {
    left_null == BoolValue::Value(false) && right_null == BoolValue::Value(false)
}

pub fn distinct_nulls_finish(left_null: BoolValue, right_null: BoolValue) -> CheckOutcome {
    if let BoolValue::Error(error) = left_null {
        return CheckOutcome::Error(error);
    }
    if let BoolValue::Error(error) = right_null {
        return CheckOutcome::Error(error);
    }
    if let BoolValue::Value(left) = left_null {
        if let BoolValue::Value(right) = right_null {
            if left && right {
                return CheckOutcome::False;
            }
            if left || right {
                return CheckOutcome::True;
            }
        }
    }
    CheckOutcome::Unknown
}

pub fn case_guard_stops(value: CheckOutcome) -> bool {
    if value == CheckOutcome::Unknown {
        return true;
    }
    if let CheckOutcome::Error(_) = value {
        return true;
    }
    false
}

pub fn minmax_nulls_choose_right(left_null: BoolValue, right_null: BoolValue) -> CheckOutcome {
    if let BoolValue::Error(error) = left_null {
        return CheckOutcome::Error(error);
    }
    if let BoolValue::Error(error) = right_null {
        return CheckOutcome::Error(error);
    }
    if let BoolValue::Value(left) = left_null {
        if let BoolValue::Value(right) = right_null {
            if left && right == false {
                return CheckOutcome::True;
            }
            return CheckOutcome::False;
        }
    }
    CheckOutcome::Unknown
}

pub fn case_guard_takes(value: CheckOutcome) -> bool {
    value == CheckOutcome::True
}

pub fn row_compare_continues(value: Int4Value) -> bool {
    if let Int4Value::Value(ordering) = value {
        return ordering == 0;
    }
    false
}

pub fn row_compare_finish(value: Int4Value, strategy: i32) -> BoolValue {
    if let Int4Value::Error(error) = value {
        return BoolValue::Error(error);
    }
    if value == Int4Value::Null {
        return BoolValue::Null;
    }
    if let Int4Value::Value(ordering) = value {
        if strategy == 1 {
            return BoolValue::Value(ordering < 0);
        }
        if strategy == 2 {
            return BoolValue::Value(ordering <= 0);
        }
        if strategy == 4 {
            return BoolValue::Value(ordering >= 0);
        }
        if strategy == 5 {
            return BoolValue::Value(ordering > 0);
        }
    }
    BoolValue::Unknown
}
