use pgsid_check_evaluator::{make_numeric_value, NumericValue};

#[test]
fn numeric_value_outlives_the_source_string() {
    let value = {
        let source = String::from("1.2300");
        make_numeric_value(source.as_str())
    };
    assert!(value == NumericValue::Value(String::from("1.2300")));
}

#[test]
fn editing_a_cloned_payload_preserves_the_original() {
    let original = make_numeric_value("1.2300");
    if let NumericValue::Value(mut payload) = original.clone() {
        payload.push('0');
        assert_eq!(payload, "1.23000");
    } else {
        panic!("expected a numeric value");
    }
    assert!(original == NumericValue::Value(String::from("1.2300")));
}
