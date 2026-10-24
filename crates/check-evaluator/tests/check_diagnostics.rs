use pgsid_check_evaluator::{
    check_requirement_filter, check_requirement_for_outcome, check_requirement_merge,
    check_requirement_message, BoolValue, CheckOutcome, TextValue,
};

#[test]
fn requirement_masks_preserve_independent_causes_and_opaque_inputs() {
    assert_eq!(check_requirement_merge(1, 16), 17);
    assert_eq!(check_requirement_merge(16, 32), 48);
    assert_eq!(check_requirement_merge(16, 16), 16);
    assert_eq!(check_requirement_merge(511, 256), 511);
    for invalid in [-1, -2, i32::MIN, 512, i32::MAX] {
        assert_eq!(check_requirement_merge(invalid, 16), -1);
        assert_eq!(check_requirement_merge(16, invalid), -1);
        assert!(matches!(check_requirement_message(invalid), TextValue::Unknown));
    }
}

#[test]
fn known_results_clear_requirements_but_partial_arrays_retain_them() {
    for outcome in [CheckOutcome::True, CheckOutcome::False, CheckOutcome::Null] {
        assert_eq!(check_requirement_for_outcome(outcome, 16), 0);
    }
    assert_eq!(check_requirement_for_outcome(CheckOutcome::Unknown, 16), 16);
    assert_eq!(check_requirement_filter(BoolValue::Value(false), 16, false), 0);
    assert_eq!(check_requirement_filter(BoolValue::Value(false), 16, true), 16);
    assert_eq!(check_requirement_filter(BoolValue::Unknown, 0, false), -1);
}

#[test]
fn requirement_messages_distinguish_missing_implementation_from_execution_context() {
    for (code, expected) in [
        (1, "xpathPowerOfTenBits"),
        (2, "cyclic XML traversal"),
        (4, "not implemented"),
        (8, "xpathRecursionLimit"),
        (16, "extraFloatDigits"),
        (32, "notation ordering"),
        (64, "serverEncoding: UTF8"),
        (128, "original XML storage"),
        (256, "namespace mapping values"),
    ] {
        let TextValue::Value(message) = check_requirement_message(code) else {
            panic!("missing diagnostic for {code}");
        };
        assert!(message.contains(expected), "{code}: {message}");
    }
    let TextValue::Value(message) = check_requirement_message(17) else { panic!("missing combined diagnostic") };
    assert!(message.contains("extraFloatDigits") && message.contains("xpathPowerOfTenBits"));
    assert!(matches!(check_requirement_message(0), TextValue::Unknown));
}
