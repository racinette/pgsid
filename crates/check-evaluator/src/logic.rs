fn and_stops(left: CheckOutcome) -> bool {
    if left == CheckOutcome::False {
        return true;
    }
    if let CheckOutcome::Error(_error) = left {
        return true;
    }
    false
}

fn and_finish(left: CheckOutcome, right: CheckOutcome) -> CheckOutcome {
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
