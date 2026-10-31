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
