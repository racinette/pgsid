extern crate check_spike;

use check_spike::{
    evaluate_check, int4_null, int4_unknown, make_int4_value, make_sql_error, make_text_value,
    text_null, text_unknown, CheckOutcome, Int4Value, TextValue,
};

#[test]
fn generated_check_distinguishes_null_unknown_and_errors() {
    let open = make_text_value("open");
    let cases = [
        (
            make_int4_value(-1),
            make_text_value("abc"),
            make_text_value("("),
            open,
            CheckOutcome::False,
        ),
        (
            make_int4_value(1),
            make_text_value("abc"),
            make_text_value("a"),
            open,
            CheckOutcome::True,
        ),
        (
            make_int4_value(1),
            make_text_value("abc"),
            make_text_value("z"),
            open,
            CheckOutcome::False,
        ),
        (
            make_int4_value(1),
            make_text_value("abc"),
            make_text_value("("),
            open,
            CheckOutcome::Error(make_sql_error(3452591)),
        ),
        (
            int4_unknown(),
            make_text_value("abc"),
            make_text_value("z"),
            open,
            CheckOutcome::False,
        ),
        (
            int4_unknown(),
            make_text_value("abc"),
            make_text_value("a"),
            open,
            CheckOutcome::Unknown,
        ),
        (
            int4_null(),
            make_text_value("abc"),
            make_text_value("a"),
            open,
            CheckOutcome::Null,
        ),
        (
            make_int4_value(1),
            text_unknown(),
            make_text_value("a"),
            open,
            CheckOutcome::Unknown,
        ),
        (
            make_int4_value(1),
            text_null(),
            make_text_value("a"),
            open,
            CheckOutcome::Null,
        ),
        (
            make_int4_value(1),
            make_text_value("abc"),
            text_unknown(),
            open,
            CheckOutcome::Unknown,
        ),
        (
            make_int4_value(1),
            make_text_value("abc"),
            make_text_value("a"),
            make_text_value("housed"),
            CheckOutcome::False,
        ),
        (
            make_int4_value(1),
            make_text_value("abc"),
            make_text_value("a"),
            make_text_value(""),
            CheckOutcome::True,
        ),
        (
            make_int4_value(1),
            make_text_value("abc"),
            make_text_value("a"),
            text_null(),
            CheckOutcome::Null,
        ),
        (
            make_int4_value(1),
            make_text_value("abc"),
            make_text_value("a"),
            text_unknown(),
            CheckOutcome::Unknown,
        ),
    ];
    for (amount, email, pattern, status, expected) in cases {
        assert!(evaluate_check(amount, email, pattern, status) == expected);
    }
    let owned = String::from("abc");
    assert!(
        evaluate_check(
            make_int4_value(1),
            make_text_value(&owned),
            make_text_value("a"),
            open
        ) == CheckOutcome::True
    );
    let error = make_sql_error(3452591);
    assert!(
        evaluate_check(
            Int4Value::Error(error),
            make_text_value("abc"),
            make_text_value("a"),
            open
        ) == CheckOutcome::Error(error)
    );
    assert!(
        evaluate_check(
            make_int4_value(-1),
            TextValue::Error(error),
            make_text_value("a"),
            open
        ) == CheckOutcome::False
    );
    assert!(
        evaluate_check(
            make_int4_value(1),
            make_text_value("abc"),
            make_text_value("a"),
            TextValue::Error(error)
        ) == CheckOutcome::Error(error)
    );
    assert!(
        evaluate_check(
            make_int4_value(-1),
            make_text_value("abc"),
            make_text_value("("),
            TextValue::Error(error)
        ) == CheckOutcome::False
    );
}
