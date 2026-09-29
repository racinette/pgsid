extern crate check_spike;

use check_spike::{
    evaluate_check, int4_null, int4_unknown, make_int4_value, make_sql_error, make_text_value,
    text_null, text_unknown, CheckOutcome, Int4Value, TextValue,
};

#[test]
fn generated_check_distinguishes_null_unknown_and_errors() {
    let cases = [
        (
            make_int4_value(-1),
            make_text_value("abc"),
            make_text_value("("),
            CheckOutcome::False,
        ),
        (
            make_int4_value(1),
            make_text_value("abc"),
            make_text_value("a"),
            CheckOutcome::True,
        ),
        (
            make_int4_value(1),
            make_text_value("abc"),
            make_text_value("z"),
            CheckOutcome::False,
        ),
        (
            make_int4_value(1),
            make_text_value("abc"),
            make_text_value("("),
            CheckOutcome::Error(make_sql_error(3452591)),
        ),
        (
            int4_unknown(),
            make_text_value("abc"),
            make_text_value("z"),
            CheckOutcome::False,
        ),
        (
            int4_unknown(),
            make_text_value("abc"),
            make_text_value("a"),
            CheckOutcome::Unknown,
        ),
        (
            int4_null(),
            make_text_value("abc"),
            make_text_value("a"),
            CheckOutcome::Null,
        ),
        (
            make_int4_value(1),
            text_unknown(),
            make_text_value("a"),
            CheckOutcome::Unknown,
        ),
        (
            make_int4_value(1),
            text_null(),
            make_text_value("a"),
            CheckOutcome::Null,
        ),
        (
            make_int4_value(1),
            make_text_value("abc"),
            text_unknown(),
            CheckOutcome::Unknown,
        ),
    ];
    for (amount, email, pattern, expected) in cases {
        assert!(evaluate_check(amount, email, pattern) == expected);
    }
    let owned = String::from("abc");
    assert!(
        evaluate_check(
            make_int4_value(1),
            make_text_value(&owned),
            make_text_value("a")
        ) == CheckOutcome::True
    );
    let error = make_sql_error(3452591);
    assert!(
        evaluate_check(
            Int4Value::Error(error),
            make_text_value("abc"),
            make_text_value("a")
        ) == CheckOutcome::Error(error)
    );
    assert!(
        evaluate_check(
            make_int4_value(-1),
            TextValue::Error(error),
            make_text_value("a")
        ) == CheckOutcome::False
    );
}
