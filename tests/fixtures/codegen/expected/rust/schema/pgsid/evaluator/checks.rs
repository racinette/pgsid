use super::checkruntime::*;
use super::pg_catalog::*;
pub fn evaluate_check_public_domain_default_event_id_from_public_event_id_event_id_check_h7azw(input_value: Int8Value) -> CheckOutcome {
    let expression_validity_start_0 = make_bool_value(true);
    let mut expression_validity_1: CheckOutcome = check_from_bool(expression_validity_start_0);
    let array_value_nullness_2 = int8_is_null(input_value);
    let array_value_validity_3 = array_value_validity(array_value_nullness_2, true);
    expression_validity_1 = array_validity_finish(expression_validity_1, array_value_validity_3);
    let value_4 = make_int4_value(0);
    let strict_call_start_6 = make_bool_value(false);
    let mut strict_call_null_5: CheckOutcome = check_from_bool(strict_call_start_6);
    let strict_argument_null_7 = int8_is_null(input_value);
    let strict_argument_state_8 = check_from_bool(strict_argument_null_7);
    strict_call_null_5 = or_finish(strict_call_null_5, strict_argument_state_8);
    let strict_argument_null_9 = int4_is_null(value_4);
    let strict_argument_state_10 = check_from_bool(strict_argument_null_9);
    strict_call_null_5 = or_finish(strict_call_null_5, strict_argument_state_10);
    let mut strict_call_14: BoolValue = bool_null();
    if case_guard_takes(strict_call_null_5) == false {
        let value_11 = sql__pg_catalog__int84gt__p7f5(input_value, value_4);
        let array_value_nullness_12 = bool_is_null(value_11);
        let array_value_validity_13 = array_value_validity(array_value_nullness_12, true);
        expression_validity_1 = array_validity_finish(expression_validity_1, array_value_validity_13);
        strict_call_14 = value_11;
    };
    let array_value_nullness_15 = bool_is_null(strict_call_14);
    let array_value_validity_16 = array_value_validity(array_value_nullness_15, true);
    expression_validity_1 = array_validity_finish(expression_validity_1, array_value_validity_16);
    let scalar_result_17 = check_from_bool(strict_call_14);
    let mut validated_expression_18: CheckOutcome = scalar_result_17;
    if case_guard_stops(expression_validity_1) {
        validated_expression_18 = array_validity_result(expression_validity_1, validated_expression_18);
    };
    validated_expression_18
}

pub fn evaluate_check_public_domain_event_id_event_id_check_hcydw(input_value: Int8Value) -> CheckOutcome {
    let expression_validity_start_0 = make_bool_value(true);
    let mut expression_validity_1: CheckOutcome = check_from_bool(expression_validity_start_0);
    let array_value_nullness_2 = int8_is_null(input_value);
    let array_value_validity_3 = array_value_validity(array_value_nullness_2, true);
    expression_validity_1 = array_validity_finish(expression_validity_1, array_value_validity_3);
    let value_4 = make_int4_value(0);
    let strict_call_start_6 = make_bool_value(false);
    let mut strict_call_null_5: CheckOutcome = check_from_bool(strict_call_start_6);
    let strict_argument_null_7 = int8_is_null(input_value);
    let strict_argument_state_8 = check_from_bool(strict_argument_null_7);
    strict_call_null_5 = or_finish(strict_call_null_5, strict_argument_state_8);
    let strict_argument_null_9 = int4_is_null(value_4);
    let strict_argument_state_10 = check_from_bool(strict_argument_null_9);
    strict_call_null_5 = or_finish(strict_call_null_5, strict_argument_state_10);
    let mut strict_call_14: BoolValue = bool_null();
    if case_guard_takes(strict_call_null_5) == false {
        let value_11 = sql__pg_catalog__int84gt__p7f5(input_value, value_4);
        let array_value_nullness_12 = bool_is_null(value_11);
        let array_value_validity_13 = array_value_validity(array_value_nullness_12, true);
        expression_validity_1 = array_validity_finish(expression_validity_1, array_value_validity_13);
        strict_call_14 = value_11;
    };
    let array_value_nullness_15 = bool_is_null(strict_call_14);
    let array_value_validity_16 = array_value_validity(array_value_nullness_15, true);
    expression_validity_1 = array_validity_finish(expression_validity_1, array_value_validity_16);
    let scalar_result_17 = check_from_bool(strict_call_14);
    let mut validated_expression_18: CheckOutcome = scalar_result_17;
    if case_guard_stops(expression_validity_1) {
        validated_expression_18 = array_validity_result(expression_validity_1, validated_expression_18);
    };
    validated_expression_18
}

// How generated CHECK inputs reach the evaluator: each public value becomes the evaluator's value of
// its type as the server would read the parameter, and each result a public one. Pruned with the
// evaluator to what the generated code calls.

/// A value the evaluator reads: unknown and NULL as given, a value through `read`.
pub fn read<T, V>(value: &super::super::CheckValue<T>, unknown: V, null: V, read: impl FnOnce(&T) -> V) -> V {
    match value {
        super::super::CheckValue::Unknown => unknown,
        super::super::CheckValue::Null => null,
        super::super::CheckValue::Value(value) => read(value),
    }
}

/// How a given value's reading fails every check that reads it: with the error the server's input
/// raises, or undecided. An unknown value fails nothing before a check reaches it.
pub fn supplied<T>(
    value: &super::super::CheckValue<T>,
    fault: Option<Option<SqlError>>,
) -> Option<Option<SqlError>> {
    match value {
        super::super::CheckValue::Unknown => None,
        _ => fault,
    }
}

fn state_code(error: SqlError) -> String {
    let mut code = String::new();
    let mut state = error.state;
    for _ in 0..5 {
        code.insert(0, std::char::from_digit(state % 36, 36).unwrap().to_ascii_uppercase());
        state /= 36;
    }
    code
}

fn failure(error: SqlError) -> super::super::CheckResult {
    super::super::CheckResult::Error { state: state_code(error), message: sql_error_message(error).message.to_owned() }
}

const UNDECIDED: &str = "A required input is unavailable, or its value or an evaluated expression is not supported.";

fn outcome(value: CheckOutcome, reason: &str) -> super::super::CheckResult {
    match value {
        CheckOutcome::True => super::super::CheckResult::True,
        CheckOutcome::False => super::super::CheckResult::False,
        CheckOutcome::Null => super::super::CheckResult::Null,
        CheckOutcome::Error(error) => failure(error),
        CheckOutcome::Unknown | CheckOutcome::Unimplemented => {
            super::super::CheckResult::Undecided { reason: reason.to_owned() }
        }
    }
}

fn read_fault(faults: &[Option<Option<SqlError>>]) -> Option<super::super::CheckResult> {
    faults.iter().flatten().next().map(|fault| match fault {
        Some(error) => failure(*error),
        None => super::super::CheckResult::Undecided { reason: UNDECIDED.to_owned() },
    })
}

/// A check's result: the first input whose reading fails it, else its evaluation.
pub fn decide(faults: &[Option<Option<SqlError>>], evaluate: impl FnOnce() -> CheckOutcome) -> super::super::CheckResult {
    read_fault(faults).unwrap_or_else(|| outcome(evaluate(), UNDECIDED))
}

pub fn evaluation(
    owner: &'static str,
    constraint: &'static str,
    result: super::super::CheckResult,
) -> super::super::CheckEvaluation {
    super::super::CheckEvaluation { owner, constraint, result }
}

pub fn int8(value: &i64) -> Int8Value {
    make_int8_value(*value)
}
