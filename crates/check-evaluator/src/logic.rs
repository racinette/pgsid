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

pub fn case_guard_stops(value: CheckOutcome) -> bool {
    if value == CheckOutcome::Unknown {
        return true;
    }
    if let CheckOutcome::Error(_) = value {
        return true;
    }
    false
}

pub fn case_guard_takes(value: CheckOutcome) -> bool {
    value == CheckOutcome::True
}
