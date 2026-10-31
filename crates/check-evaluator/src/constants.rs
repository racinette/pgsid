pub fn constant_finish(left: CheckOutcome, right: CheckOutcome) -> CheckOutcome {
    let mut unresolved_flavor: i32 = 0;
    if let CheckOutcome::Unknown = left { unresolved_flavor = 1; };
    if let CheckOutcome::Unknown = right { unresolved_flavor = 1; };
    if let CheckOutcome::Error(error) = left {
        return CheckOutcome::Error(error);
    }
    if let CheckOutcome::Error(error) = right {
        return CheckOutcome::Error(error);
    }
    if left == CheckOutcome::Unknown || right == CheckOutcome::Unknown {
        return check_unresolved(unresolved_flavor);
    }
    CheckOutcome::True
}
