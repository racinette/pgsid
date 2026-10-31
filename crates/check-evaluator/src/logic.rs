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
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = left { unresolved_flavor = 1; };
    if let CheckOutcome::Unknown = right { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = left { unresolved_flavor = 2; };
    if let CheckOutcome::Unimplemented = right { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = left {
        return CheckOutcome::Error(error);
    }
    if let CheckOutcome::Error(error) = right {
        return CheckOutcome::Error(error);
    }
    if left == CheckOutcome::False || right == CheckOutcome::False {
        return CheckOutcome::False;
    }
    let mut condition_flavor_26_4: i32 = unresolved_flavor; if let CheckOutcome::Unknown = left { if condition_flavor_26_4 < 1 { condition_flavor_26_4 = 1; }; }; if let CheckOutcome::Unimplemented = left { condition_flavor_26_4 = 2; }; if let CheckOutcome::Unknown = right { if condition_flavor_26_4 < 1 { condition_flavor_26_4 = 1; }; }; if let CheckOutcome::Unimplemented = right { condition_flavor_26_4 = 2; }; if (left == CheckOutcome::Unknown || left == CheckOutcome::Unimplemented) || (right == CheckOutcome::Unknown || right == CheckOutcome::Unimplemented) {
        return check_unresolved(condition_flavor_26_4);
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
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = left { unresolved_flavor = 1; };
    if let CheckOutcome::Unknown = right { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = left { unresolved_flavor = 2; };
    if let CheckOutcome::Unimplemented = right { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = left {
        return CheckOutcome::Error(error);
    }
    if let CheckOutcome::Error(error) = right {
        return CheckOutcome::Error(error);
    }
    if left == CheckOutcome::True || right == CheckOutcome::True {
        return CheckOutcome::True;
    }
    let mut condition_flavor_60_4: i32 = unresolved_flavor; if let CheckOutcome::Unknown = left { if condition_flavor_60_4 < 1 { condition_flavor_60_4 = 1; }; }; if let CheckOutcome::Unimplemented = left { condition_flavor_60_4 = 2; }; if let CheckOutcome::Unknown = right { if condition_flavor_60_4 < 1 { condition_flavor_60_4 = 1; }; }; if let CheckOutcome::Unimplemented = right { condition_flavor_60_4 = 2; }; if (left == CheckOutcome::Unknown || left == CheckOutcome::Unimplemented) || (right == CheckOutcome::Unknown || right == CheckOutcome::Unimplemented) {
        return check_unresolved(condition_flavor_60_4);
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
    let mut unresolved_flavor: i32 = 0;
    if let BoolValue::Unknown = left_null { unresolved_flavor = 1; };
    if let BoolValue::Unknown = right_null { unresolved_flavor = 1; };
    if let BoolValue::Unimplemented = left_null { unresolved_flavor = 2; };
    if let BoolValue::Unimplemented = right_null { unresolved_flavor = 2; };
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
    check_unresolved(unresolved_flavor)
}

pub fn case_guard_stops(value: CheckOutcome) -> bool {
    if (value == CheckOutcome::Unknown || value == CheckOutcome::Unimplemented) {
        return true;
    }
    if let CheckOutcome::Error(_) = value {
        return true;
    }
    false
}

pub fn minmax_nulls_choose_right(left_null: BoolValue, right_null: BoolValue) -> CheckOutcome {
    let mut unresolved_flavor: i32 = 0;
    if let BoolValue::Unknown = left_null { unresolved_flavor = 1; };
    if let BoolValue::Unknown = right_null { unresolved_flavor = 1; };
    if let BoolValue::Unimplemented = left_null { unresolved_flavor = 2; };
    if let BoolValue::Unimplemented = right_null { unresolved_flavor = 2; };
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
    check_unresolved(unresolved_flavor)
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
    let mut unresolved_flavor: i32 = 0;
    if let Int4Value::Unknown = value { unresolved_flavor = 1; };
    if let Int4Value::Unimplemented = value { unresolved_flavor = 2; };
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
    bool_unresolved(unresolved_flavor)
}
