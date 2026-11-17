// PostgreSQL's numeric_round, numeric_trunc, numeric_ceil and numeric_floor: mode 1 rounds,
// 0 truncates, 2 takes the ceiling and 3 the floor. Scales are clamped as PostgreSQL clamps
// them, and a negative scale displays no fractional digits.
fn numeric_round_value(arg: NumericVar, requested: i32, mode: i32) -> NumericValue {
    if numeric_var_kind(&arg) != 1 {
        return NumericValue::Value(arg);
    }
    if mode == 2 {
        return numeric_var_result(numeric_var_ceil(&arg));
    }
    if mode == 3 {
        return numeric_var_result(numeric_var_floor(&arg));
    }
    let mut scale = requested;
    let mut minimum: i32 = -131072;
    if mode == 1 {
        minimum = minimum - 1;
    }
    if scale < minimum {
        scale = minimum;
    }
    if scale > 16383 {
        scale = 16383;
    }
    let mut result = numeric_var_zero(0);
    if mode == 1 {
        result = numeric_var_round(arg, scale);
    } else {
        result = numeric_var_trunc(arg, scale);
    };
    if scale < 0 {
        result = numeric_var_rescaled(result, 0);
    }
    numeric_var_result(result)
}

pub fn sql__pg_catalog__ceil__8geh(input: NumericValue) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
let mut numeric_unknown_input_1 = false; if let NumericValue::Unknown = input { numeric_unknown_input_1 = true; }; let mut numeric_unimplemented_input_2 = false; if let NumericValue::Unimplemented = input { numeric_unimplemented_input_2 = true; };
let mut condition_flavor_6_0: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_6_0 < 1 { condition_flavor_6_0 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_6_0 = 2; }; if numeric_unknown_input_1 || numeric_unimplemented_input_2 { return numeric_unresolved(condition_flavor_6_0); }
let mut numeric_null_input_3 = false; if let NumericValue::Null = input { numeric_null_input_3 = true; };
if numeric_null_input_3 { return NumericValue::Null; }
if let NumericValue::Value(work) = input {
return numeric_round_value(work, 0, 2);
}
numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__ceiling__pr5v(input: NumericValue) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
let mut numeric_unknown_input_4 = false; if let NumericValue::Unknown = input { numeric_unknown_input_4 = true; }; let mut numeric_unimplemented_input_5 = false; if let NumericValue::Unimplemented = input { numeric_unimplemented_input_5 = true; };
let mut condition_flavor_21_0: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_21_0 < 1 { condition_flavor_21_0 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_21_0 = 2; }; if numeric_unknown_input_4 || numeric_unimplemented_input_5 { return numeric_unresolved(condition_flavor_21_0); }
let mut numeric_null_input_6 = false; if let NumericValue::Null = input { numeric_null_input_6 = true; };
if numeric_null_input_6 { return NumericValue::Null; }
if let NumericValue::Value(work) = input {
return numeric_round_value(work, 0, 2);
}
numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__floor__x7mh(input: NumericValue) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
let mut numeric_unknown_input_7 = false; if let NumericValue::Unknown = input { numeric_unknown_input_7 = true; }; let mut numeric_unimplemented_input_8 = false; if let NumericValue::Unimplemented = input { numeric_unimplemented_input_8 = true; };
let mut condition_flavor_36_0: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_36_0 < 1 { condition_flavor_36_0 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_36_0 = 2; }; if numeric_unknown_input_7 || numeric_unimplemented_input_8 { return numeric_unresolved(condition_flavor_36_0); }
let mut numeric_null_input_9 = false; if let NumericValue::Null = input { numeric_null_input_9 = true; };
if numeric_null_input_9 { return NumericValue::Null; }
if let NumericValue::Value(work) = input {
return numeric_round_value(work, 0, 3);
}
numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__round__mmpo(input: NumericValue) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
let mut numeric_unknown_input_10 = false; if let NumericValue::Unknown = input { numeric_unknown_input_10 = true; }; let mut numeric_unimplemented_input_11 = false; if let NumericValue::Unimplemented = input { numeric_unimplemented_input_11 = true; };
let mut condition_flavor_51_0: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_51_0 < 1 { condition_flavor_51_0 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_51_0 = 2; }; if numeric_unknown_input_10 || numeric_unimplemented_input_11 { return numeric_unresolved(condition_flavor_51_0); }
let mut numeric_null_input_12 = false; if let NumericValue::Null = input { numeric_null_input_12 = true; };
if numeric_null_input_12 { return NumericValue::Null; }
if let NumericValue::Value(work) = input {
return numeric_round_value(work, 0, 1);
}
numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__round__otcq(input: NumericValue, scale: Int4Value) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let Int4Value::Unknown = scale { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = scale { unresolved_flavor = 2; };
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
if let Int4Value::Error(error) = scale { return NumericValue::Error(error); }
let mut numeric_unknown_input_13 = false; if let NumericValue::Unknown = input { numeric_unknown_input_13 = true; }; let mut numeric_unimplemented_input_14 = false; if let NumericValue::Unimplemented = input { numeric_unimplemented_input_14 = true; };
let mut condition_flavor_69_0: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_69_0 < 1 { condition_flavor_69_0 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_69_0 = 2; }; if let Int4Value::Unknown = scale { if condition_flavor_69_0 < 1 { condition_flavor_69_0 = 1; }; }; if let Int4Value::Unimplemented = scale { condition_flavor_69_0 = 2; }; if (numeric_unknown_input_13 || numeric_unimplemented_input_14) || (scale == Int4Value::Unknown || scale == Int4Value::Unimplemented) { return numeric_unresolved(condition_flavor_69_0); }
let mut numeric_null_input_15 = false; if let NumericValue::Null = input { numeric_null_input_15 = true; };
if numeric_null_input_15 || scale == Int4Value::Null { return NumericValue::Null; }
if let NumericValue::Value(work) = input {
if let Int4Value::Value(precision) = scale { return numeric_round_value(work, precision, 1); }
}
numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__trunc__dghz(input: NumericValue) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
let mut numeric_unknown_input_16 = false; if let NumericValue::Unknown = input { numeric_unknown_input_16 = true; }; let mut numeric_unimplemented_input_17 = false; if let NumericValue::Unimplemented = input { numeric_unimplemented_input_17 = true; };
let mut condition_flavor_84_0: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_84_0 < 1 { condition_flavor_84_0 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_84_0 = 2; }; if numeric_unknown_input_16 || numeric_unimplemented_input_17 { return numeric_unresolved(condition_flavor_84_0); }
let mut numeric_null_input_18 = false; if let NumericValue::Null = input { numeric_null_input_18 = true; };
if numeric_null_input_18 { return NumericValue::Null; }
if let NumericValue::Value(work) = input {
return numeric_round_value(work, 0, 0);
}
numeric_unresolved(unresolved_flavor)
}

pub fn sql__pg_catalog__trunc__hay3(input: NumericValue, scale: Int4Value) -> NumericValue {
    let mut unresolved_flavor: i32 = 0;
    if let NumericValue::Unknown = input { unresolved_flavor = 1; };
    if let Int4Value::Unknown = scale { unresolved_flavor = 1; };
    if let NumericValue::Unimplemented = input { unresolved_flavor = 2; };
    if let Int4Value::Unimplemented = scale { unresolved_flavor = 2; };
if let NumericValue::Error(error) = input { return NumericValue::Error(error); }
if let Int4Value::Error(error) = scale { return NumericValue::Error(error); }
let mut numeric_unknown_input_19 = false; if let NumericValue::Unknown = input { numeric_unknown_input_19 = true; }; let mut numeric_unimplemented_input_20 = false; if let NumericValue::Unimplemented = input { numeric_unimplemented_input_20 = true; };
let mut condition_flavor_102_0: i32 = unresolved_flavor; if let NumericValue::Unknown = input { if condition_flavor_102_0 < 1 { condition_flavor_102_0 = 1; }; }; if let NumericValue::Unimplemented = input { condition_flavor_102_0 = 2; }; if let Int4Value::Unknown = scale { if condition_flavor_102_0 < 1 { condition_flavor_102_0 = 1; }; }; if let Int4Value::Unimplemented = scale { condition_flavor_102_0 = 2; }; if (numeric_unknown_input_19 || numeric_unimplemented_input_20) || (scale == Int4Value::Unknown || scale == Int4Value::Unimplemented) { return numeric_unresolved(condition_flavor_102_0); }
let mut numeric_null_input_21 = false; if let NumericValue::Null = input { numeric_null_input_21 = true; };
if numeric_null_input_21 || scale == Int4Value::Null { return NumericValue::Null; }
if let NumericValue::Value(work) = input {
if let Int4Value::Value(precision) = scale { return numeric_round_value(work, precision, 0); }
}
numeric_unresolved(unresolved_flavor)
}
