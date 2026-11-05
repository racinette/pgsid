pub fn constant_finish(left: CheckOutcome, right: CheckOutcome) -> CheckOutcome {
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
    let mut condition_flavor_13_4: i32 = unresolved_flavor; if let CheckOutcome::Unknown = left { if condition_flavor_13_4 < 1 { condition_flavor_13_4 = 1; }; }; if let CheckOutcome::Unimplemented = left { condition_flavor_13_4 = 2; }; if let CheckOutcome::Unknown = right { if condition_flavor_13_4 < 1 { condition_flavor_13_4 = 1; }; }; if let CheckOutcome::Unimplemented = right { condition_flavor_13_4 = 2; }; if (left == CheckOutcome::Unknown || left == CheckOutcome::Unimplemented) || (right == CheckOutcome::Unknown || right == CheckOutcome::Unimplemented) {
        return check_unresolved(condition_flavor_13_4);
    }
    CheckOutcome::True
}

const COLLATION_CONFLICT: u32 = 6844250;

// A call that needs the collation its arguments' implicit collations leave undecided raises
// 42P22 once every argument is known. An error in an argument comes first, then a NULL argument
// makes the strict call NULL; the state starts as False, meaning every argument so far is known
// and not NULL.
pub fn collation_conflict_argument(state: CheckOutcome, nullness: BoolValue) -> CheckOutcome {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = state { unresolved_flavor = 1; };
    if let BoolValue::Unknown = nullness { unresolved_flavor = 1; };
    if let CheckOutcome::Unimplemented = state { unresolved_flavor = 2; };
    if let BoolValue::Unimplemented = nullness { unresolved_flavor = 2; };
    if let CheckOutcome::Error(error) = state {
        return CheckOutcome::Error(error);
    }
    if let BoolValue::Error(error) = nullness {
        return CheckOutcome::Error(error);
    }
    if nullness == BoolValue::Value(true) || state == CheckOutcome::Null {
        return CheckOutcome::Null;
    }
    if nullness == BoolValue::Value(false) && state == CheckOutcome::False {
        return CheckOutcome::False;
    }
    check_unresolved(unresolved_flavor)
}

pub fn collation_conflict_start() -> CheckOutcome {
    CheckOutcome::False
}

pub fn collation_conflict_finish(state: CheckOutcome) -> CheckOutcome {
    if state == CheckOutcome::False {
        return CheckOutcome::Error(make_sql_error(COLLATION_CONFLICT));
    }
    state
}
